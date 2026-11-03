"""Lightning modules for fixed-budget SSL and controlled pose transfer."""
import json
import math
from pathlib import Path

import numpy as np
import torch
import torch.distributed as dist
from lightning import LightningModule
from torch import nn

from .model import TransferEncoder, PoseDecoder, make_mask, signal_targets, masked_signal_loss
from .protocol import angular_sums, angular_metrics


def distributed():
    return dist.is_available() and dist.is_initialized()


class TransferModule(LightningModule):
    def __init__(self, model_config, mode='pose', output_dim=20, hidden_dim=256,
                 learning_rate=3e-4, weight_decay=.01, warmup_steps=1000, max_steps=20000,
                 spectral_bins=8, mask_ratio=.5, block_tokens=3, artifact_hash='',
                 experiment='A', export_predictions=False, run_dir='.', run_contract=None):
        super().__init__()
        self.save_hyperparameters()
        if mode not in ('ssl', 'pose') or max_steps < 1 or not 0 <= warmup_steps < max_steps:
            raise ValueError('invalid mode or optimizer schedule')
        self.encoder = TransferEncoder(**model_config)
        if mode == 'ssl':
            self.reconstruction = nn.Linear(model_config['d_model'], 16*(spectral_bins+1))
        else:
            self.decoder = PoseDecoder(model_config['d_model'], output_dim, hidden_dim)
            # Mask tokens are unused in supervised forward, so exclude from DDP.
            self.encoder.mask_token.requires_grad_(False)
        self.register_buffer('metric_sums', torch.zeros(3, dtype=torch.float64), persistent=False)
        self.groups = {}

    def load_encoder(self, path):
        checkpoint = torch.load(path, map_location='cpu', weights_only=False)
        hp = checkpoint['hyper_parameters']
        if hp['mode'] != 'ssl' or hp['model_config'] != self.hparams.model_config:
            raise ValueError('encoder initialization requires a compatible pose_transfer SSL checkpoint')
        if hp['artifact_hash'] != self.hparams.artifact_hash:
            raise ValueError('pretraining and finetuning preprocessing artifacts differ')
        weights = {k[len('encoder.'):]: v for k,v in checkpoint['state_dict'].items() if k.startswith('encoder.')}
        self.encoder.load_state_dict(weights, strict=True)

    def forward(self, emg):
        z = self.encoder(emg)
        return self.decoder(z, emg.shape[1], self.encoder.patch_samples)

    def on_train_epoch_start(self):
        # Lightning does not reliably discover custom batch samplers for set_epoch.
        self.trainer.train_dataloader.batch_sampler.set_epoch(self.current_epoch)

    def training_step(self, batch, batch_idx):
        x = batch['emg']
        if self.hparams.mode == 'ssl':
            target = signal_targets(x, self.encoder.patch_samples, self.hparams.spectral_bins)
            mask = make_mask(x.shape[0], target.shape[1], x.device, self.hparams.mask_ratio, self.hparams.block_tokens)
            z = self.encoder(x, mask)
            prediction = self.reconstruction(z).reshape_as(target)
            loss = masked_signal_loss(prediction, target, mask)
            self.log('train/latent_std', z.detach().float().flatten(0, 1).std(0, unbiased=False).mean(), sync_dist=True)
            self.log('train/masked_fraction', mask.float().mean(), sync_dist=True)
        else:
            prediction, available = self(x)
            valid = batch['target_mask'] & available[None] & (batch['weight'][:, None] > 0)
            sums = angular_sums(prediction, batch['target'], valid)
            count = sums[:, 2].sum().detach()
            if distributed():
                dist.all_reduce(count)
            # DDP averages gradients; undo that factor for a global element mean.
            loss = sums[:, 0].sum() * self.trainer.world_size / count.clamp_min(1)
        self.log('train/loss', loss, on_step=True, on_epoch=False, sync_dist=True, batch_size=x.shape[0])
        return loss

    def _reset_metrics(self):
        self.metric_sums.zero_(); self.groups = {}

    def on_validation_epoch_start(self):
        self._reset_metrics()

    def on_test_epoch_start(self):
        self._reset_metrics()

    def _evaluate(self, batch, batch_idx, export=False):
        prediction, available = self(batch['emg'])
        valid = batch['target_mask'] & available[None] & (batch['weight'][:, None] > 0)
        sums = angular_sums(prediction, batch['target'], valid)
        self.metric_sums += sums.sum(0)
        for meta, stats in zip(batch['metadata'], sums.detach().cpu()):
            if stats[2] <= 0:
                continue
            for field in ('subject_id', 'generalization', 'stage'):
                key = field + ':' + str(meta[field])
                self.groups[key] = self.groups.get(key, torch.zeros(3, dtype=torch.float64)) + stats
        if export and self.hparams.export_predictions:
            output = Path(self.hparams.run_dir)/'predictions'/f'rank-{self.global_rank}'
            output.mkdir(parents=True, exist_ok=True)
            keep = batch['weight'] > 0
            metadata = [m for m,k in zip(batch['metadata'], keep.tolist()) if k]
            # Stream per batch: do not retain the entire test corpus in RAM.
            np.savez_compressed(output/f'batch-{batch_idx:06d}.npz',
                                prediction_rad=prediction[keep].float().cpu().numpy(),
                                target_rad=batch['target'][keep].float().cpu().numpy(),
                                valid=valid[keep].cpu().numpy(), metadata=json.dumps(metadata))

    def validation_step(self, batch, batch_idx):
        self._evaluate(batch, batch_idx)

    def test_step(self, batch, batch_idx):
        self._evaluate(batch, batch_idx, export=True)

    def _finish_metrics(self, stage):
        total = self.metric_sums.clone()
        if distributed():
            dist.all_reduce(total)
        result = angular_metrics(total)
        for key in ('mae_deg', 'rmse_deg'):
            # Already globally reduced; do not average batch or rank RMSE values.
            self.log(f'{stage}/{key}', result[key], sync_dist=False, prog_bar=False)
        if stage == 'test':
            all_groups = [None] * self.trainer.world_size
            if distributed():
                dist.all_gather_object(all_groups, self.groups)
            else:
                all_groups = [self.groups]
            if self.trainer.is_global_zero:
                merged = {}
                for groups in all_groups:
                    for k,v in groups.items():
                        merged[k] = merged.get(k, torch.zeros(3, dtype=torch.float64)) + v
                result['groups'] = {key: angular_metrics(v) for key,v in sorted(merged.items())}
                subjects = [m['mae_deg'] for key,m in result['groups'].items() if key.startswith('subject_id:')]
                result['subject_macro_mae_deg'] = float(np.mean(subjects))
                result['protocol'] = 'causal_patch_end_zero_order_hold; no_initial_pose; independent_windows; angular_only'
                result['experiment'] = self.hparams.experiment
                result['training_contract'] = self.hparams.run_contract
                result['artifact_sha256'] = self.hparams.artifact_hash
                result['official_fk_evaluation'] = False
                result['data_coverage'] = self.trainer.datamodule.summary
                result['full_test_loader'] = isinstance(self.trainer.limit_test_batches, float) and self.trainer.limit_test_batches == 1.0
                result['evaluation_window_ms'] = self.trainer.datamodule.config['eval_window_ms']
                (Path(self.hparams.run_dir)/'evaluation.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
        return result

    def on_validation_epoch_end(self):
        self._finish_metrics('val')

    def on_test_epoch_end(self):
        self._finish_metrics('test')

    def configure_optimizers(self):
        hp = self.hparams
        optimizer = torch.optim.AdamW((p for p in self.parameters() if p.requires_grad), lr=hp.learning_rate, weight_decay=hp.weight_decay)
        def schedule(step):
            if step < hp.warmup_steps:
                return (step+1)/max(1, hp.warmup_steps)
            progress = min(1., (step-hp.warmup_steps)/max(1, hp.max_steps-hp.warmup_steps))
            return .5*(1+math.cos(math.pi*progress))
        return dict(optimizer=optimizer, lr_scheduler=dict(scheduler=torch.optim.lr_scheduler.LambdaLR(optimizer, schedule), interval='step'))
