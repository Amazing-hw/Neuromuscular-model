"""Hydra: prepare → multi-source SSL → emg2pose finetune/evaluate.

See POSE_TRANSFER.md. Existing pretrain.py/finetune.py remain legacy controls.
"""
import hashlib
import json
import os
from pathlib import Path

import hydra
import torch
from lightning import Trainer, seed_everything
from lightning.pytorch.callbacks import ModelCheckpoint
from omegaconf import OmegaConf

from semg_fm.config import validate_devices, validate_seed
from semg_fm.pose_transfer.data import prepare, TransferDataModule
from semg_fm.pose_transfer.module import TransferModule
from semg_fm.reproducibility import write_run_metadata


def execute(cfg):
    c = OmegaConf.to_container(cfg, resolve=True)
    action, data = c['action'], c['data']
    if action not in ('prepare', 'pretrain', 'finetune', 'evaluate'):
        raise ValueError('action must be prepare/pretrain/finetune/evaluate')
    if action == 'prepare':
        return prepare(data['root'], data['manifest'], data['prepared'], data['max_gap_samples'], data['exclude_train_counterparts'])
    validate_seed(c['seed']); validate_devices(c['trainer']['devices'])
    seed_everything(c['seed'], workers=True)
    exp = c['experiment']
    if c['init_encoder'] and c['resume_from']:
        raise ValueError('init_encoder and resume_from are mutually exclusive')
    if action == 'pretrain' and not exp['requires_pretrain']:
        raise ValueError('A/E are supervised controls and do not pretrain')
    if action == 'pretrain' and c['init_encoder']:
        raise ValueError('pretraining starts from random initialization; use resume_from to resume')
    if action == 'finetune':
        if exp['requires_pretrain'] and not (c['init_encoder'] or c['resume_from']):
            raise ValueError('B/C/D finetuning requires init_encoder (SSL) or resume_from (pose)')
        if not exp['requires_pretrain'] and c['init_encoder']:
            raise ValueError('A/E must start from scratch')
    if action == 'evaluate' and not c['checkpoint']:
        raise ValueError('evaluation requires checkpoint=...')
    for name in ('window_ms', 'eval_window_ms'):
        count = data[name]*2
        if count != int(count) or count % c['model']['patch_samples']:
            raise ValueError(f'{name} must produce a whole number of patches at 2000 Hz')
    dm = TransferDataModule(data, action, exp['sources'], c['seed'], c['label_fraction'])
    dm.setup()
    # DDP re-launches this script. Resolve the timestamped output once in rank 0
    # and inherit it; children may start in a later second and resolve ${now}
    # differently. Explicit output_dir is still preferred for server runs.
    child_rank = int(os.environ.get('LOCAL_RANK', 0)) > 0
    output = Path(os.environ.get('SEMG_TRANSFER_RUN_DIR', c['output_dir']) if child_rank else c['output_dir']).resolve()
    os.environ['SEMG_TRANSFER_RUN_DIR'] = str(output)
    # Keep run files separate: accidentally reusing one run directory is not a resume.
    if (output/'run_metadata.json').exists() and not c['resume_from'] and int(os.environ.get('LOCAL_RANK', 0)) == 0:
        raise ValueError('output_dir already contains a run; choose a fresh directory')
    output.mkdir(parents=True, exist_ok=True)
    options = dict(c['trainer'])
    steps = c['pretrain_steps'] if action == 'pretrain' else exp['finetune_steps']
    contract = dict(experiment=exp, seed=c['seed'], label_fraction=c['label_fraction'],
                    steps=steps, model=c['model'], hidden_dim=c['hidden_dim'],
                    window_ms=data['window_ms'], stride_ms=data['stride_ms'],
                    eval_window_ms=data['eval_window_ms'], batch_size=data['batch_size'],
                    trainer=c['trainer'], artifact_sha256=dm.artifact_hash,
                    source_alpha=data['source_alpha'], optimizer=c['optimizer'], objective=c['objective'],
                    init_encoder=c['init_encoder'])
    options.update(max_steps=steps, max_epochs=-1, use_distributed_sampler=False,
                   default_root_dir=str(output))
    if action == 'evaluate':
        module = TransferModule.load_from_checkpoint(c['checkpoint'], map_location='cpu',
                                                    run_dir=str(output), export_predictions=c['export_predictions'])
        if module.hparams.mode != 'pose' or module.hparams.artifact_hash != dm.artifact_hash:
            raise ValueError('evaluation requires pose checkpoint with the same preprocessing artifact')
        if module.hparams.experiment != exp['name'] or module.hparams.model_config != c['model']:
            raise ValueError('evaluation experiment/model config does not match checkpoint')
    else:
        module = TransferModule(c['model'], mode='ssl' if action == 'pretrain' else 'pose',
                                output_dim=c['output_dim'], hidden_dim=c['hidden_dim'],
                                max_steps=steps, artifact_hash=dm.artifact_hash, experiment=exp['name'],
                                run_dir=str(output), export_predictions=c['export_predictions'],
                                run_contract=contract,
                                **c['optimizer'], **c['objective'])
        if action == 'finetune' and c['init_encoder']:
            source = torch.load(c['init_encoder'], map_location='cpu', weights_only=False)
            if source['hyper_parameters']['experiment'] != exp['name']:
                raise ValueError('SSL checkpoint source pool/experiment differs from requested B/C/D')
            module.load_encoder(c['init_encoder'])
            module.hparams.run_contract['pretrain_contract'] = source['hyper_parameters']['run_contract']
        if c['resume_from']:
            hp = torch.load(c['resume_from'], map_location='cpu', weights_only=False)['hyper_parameters']
            for key in ('mode', 'model_config', 'artifact_hash', 'experiment', 'max_steps'):
                if hp[key] != module.hparams[key]:
                    raise ValueError(f'resume checkpoint mismatch: {key}')
            previous = hp['run_contract']
            for key in ('seed', 'label_fraction', 'window_ms', 'stride_ms', 'batch_size'):
                if previous[key] != contract[key]:
                    raise ValueError(f'resume data contract mismatch: {key}')
            module.hparams.run_contract = previous
    if action != 'pretrain':
        widths = {r['output_dim'] for ds in dm.datasets.values() for r in ds.records}
        if widths != {module.hparams.output_dim}:
            raise ValueError(f'pose output_dim mismatch: data has {widths}')
    checkpoint = ModelCheckpoint(dirpath=str(output/'checkpoints'), save_last=True,
                                 monitor=None if action == 'pretrain' else 'val/mae_deg',
                                 save_top_k=0 if action == 'pretrain' else 1,
                                 filename='{epoch}-{step}', mode='min')
    options['callbacks'] = [checkpoint]
    trainer = Trainer(**options)
    if trainer.is_global_zero:
        OmegaConf.save(cfg, output/'resolved_config.yaml', resolve=True)
        write_run_metadata(output, manifest_path=data['manifest'], data_config=data,
                           trainer_config=c['trainer'], command=f'pose_transfer:{action}')
        protocol = dict(contract, coverage=dm.summary,
                        evaluated_checkpoint=c['checkpoint'],
                        checkpoint_sha256=hashlib.sha256(Path(c['checkpoint']).read_bytes()).hexdigest() if c['checkpoint'] else None,
                        init_encoder_sha256=hashlib.sha256(Path(c['init_encoder']).read_bytes()).hexdigest() if c['init_encoder'] else None)
        (output/'protocol.json').write_text(json.dumps(protocol, indent=2), encoding='utf-8')
    if action == 'evaluate':
        return trainer.test(module, datamodule=dm)
    trainer.fit(module, datamodule=dm, ckpt_path=c['resume_from'])
    # Always retain final weights for fixed-step SSL; selection never uses pose test data.
    trainer.save_checkpoint(str(output/'checkpoints'/'last.ckpt'))
    return module


@hydra.main(version_base='1.3', config_path='configs', config_name='pose_transfer')
def main(cfg):
    execute(cfg)


if __name__ == '__main__':
    main()
