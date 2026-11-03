"""Behavioral checks for transfer experiments, independent of legacy models."""
import torch
import pytest
from semg_fm.pose_transfer.model import TransferEncoder, PoseDecoder, signal_targets, masked_signal_loss
from semg_fm.pose_transfer.protocol import select_sessions, audit_frame, angular_metrics

def encoder():
    torch.manual_seed(4)
    return TransferEncoder(patch_samples=8, channel_dim=4, d_model=16, depth=1, heads=2, dropout=0).eval()

def test_time_order_channel_identity_and_causality():
    model = encoder(); x = torch.randn(2, 64, 16); z = model(x)
    later = x.clone(); later[:, 32:] += 7
    torch.testing.assert_close(z[:, :4], model(later)[:, :4])
    assert not torch.allclose(z, model(x.roll(1, -1)))
    order = torch.tensor([0, 2, 1, 3, 4, 5, 6, 7])
    shuffled = x.reshape(2, 8, 8, 16)[:, order].reshape_as(x)
    assert not torch.allclose(z[:, order], model(shuffled))

def test_mask_hides_content_and_ssl_has_gradients():
    model = encoder(); x = torch.randn(2, 64, 16)
    mask = torch.zeros(2, 8, 16, dtype=torch.bool); mask[:, 2:4, :8] = True
    changed = x.reshape(2, 8, 8, 16).clone(); changed[:, 2:4, :, :8] += 100
    torch.testing.assert_close(model(x, mask), model(changed.reshape_as(x), mask))
    target = signal_targets(x, 8, 3)
    head = torch.nn.Linear(16, 16 * 4)
    loss = masked_signal_loss(head(model(x, mask)).reshape_as(target), target, mask)
    loss.backward()
    assert torch.isfinite(loss) and model.patch.weight.grad.abs().sum() > 0
    assert not target.requires_grad

def test_pose_alignment_does_not_read_a_future_patch():
    model = encoder(); decoder = PoseDecoder(16, 3, hidden_dim=8).eval()
    x = torch.randn(1, 64, 16); y, valid = decoder(model(x), 64, 8)
    changed = x.clone(); changed[:, 32:] += 20
    y2, _ = decoder(model(changed), 64, 8)
    torch.testing.assert_close(y[:, :39], y2[:, :39])
    assert not valid[:7].any() and valid[7:].all()

def test_session_budgets_are_nested_and_do_not_drop_all():
    rows = [dict(dataset_id='pose', subject_id='s', session_id=str(i), path=str(i)) for i in range(10)]
    small = select_sessions(rows, .01, 7); medium = select_sessions(rows, .3, 7)
    assert len(small) == 1 and len(medium) == 3
    assert {r['path'] for r in small} <= {r['path'] for r in medium}

def test_metric_is_count_weighted_and_in_degrees():
    metrics = angular_metrics(torch.tensor([3.0, 5.0, 2.0], dtype=torch.float64))
    assert metrics['mae_deg'] == pytest.approx(1.5 * 180 / torch.pi)
    assert metrics['rmse_deg'] == pytest.approx((2.5 ** .5) * 180 / torch.pi)
    with pytest.raises(ValueError, match='valid'):
        angular_metrics(torch.zeros(3))

def test_audit_rejects_source_leakage():
    import pandas as pd
    frame = pd.DataFrame([
        dict(resolved_path='a', dataset_id='emg2pose', task_id='pose', subject_id='s', session_id='1', official_split='train', source_sha256='a'*64, sample_rate_hz=2000),
        dict(resolved_path='b', dataset_id='emg2pose', task_id='pose', subject_id='t', session_id='2', official_split='test', source_sha256='a'*64, sample_rate_hz=2000),
    ])
    with pytest.raises(ValueError, match='source_sha256'):
        audit_frame(frame)


def test_clock_gaps_are_not_compressed():
    import numpy as np
    from semg_fm.pose_transfer.data import continuous_segments
    assert continuous_segments(np.array([0, .0005, .001, .1, .1005]), .00075) == [[0, 3], [3, 5]]


def test_evaluation_padding_counts_every_example_once():
    from semg_fm.pose_transfer.data import EvaluationBatches
    real = []
    ranks = [list(EvaluationBatches(11, 2, rank, 3)) for rank in range(3)]
    assert len({len(batches) for batches in ranks}) == 1
    for batches in ranks:
        real.extend(i for batch in batches for i, pad in batch if not pad)
    assert sorted(real) == list(range(11))


@pytest.fixture
def transfer_root(canonical_meta_root):
    import hashlib, json, shutil
    import h5py
    import pandas as pd
    import numpy as np
    root = canonical_meta_root
    frame = pd.read_csv(root/'manifest.csv', keep_default_na=False)
    rows = frame.to_dict('records')
    pose = next(r for r in rows if r['task_id'] == 'pose')
    for split in ('val', 'test'):
        row = dict(pose, path=f'pose/{split}.h5', official_split=split, subject_id=split, session_id=split)
        shutil.copyfile(root/pose['path'], root/row['path'])
        rows.append(row)
    for i,row in enumerate(rows):
        row['source_sha256'] = hashlib.sha256(row['path'].encode()).hexdigest()
        with h5py.File(root/row['path'], 'r+') as h:
            for name in ('official_split', 'subject_id', 'session_id'):
                h.attrs[name] = row[name]
            h['signal/emg'][:] = np.random.default_rng(i).normal(size=(600,16)).astype('float32')
            h['meta/quality/channel_rms'][:] = np.sqrt(np.mean(h['signal/emg'][:]**2, axis=0))
            del h['meta/source_json']
            h.create_dataset('meta/source_json', data=json.dumps({'attributes': {'session': row['session_id'], 'split': row['official_split'], 'generalization': 'user'}}))
            if row['task_id'] != 'pose':
                del h['labels']  # SSL must not require any downstream labels.
    pd.DataFrame(rows).to_csv(root/'manifest.csv', index=False)
    return root


def tiny_config(root, output):
    from hydra import compose, initialize_config_dir
    from pathlib import Path
    with initialize_config_dir(version_base='1.3', config_dir=str(Path(__file__).resolve().parents[1]/'configs')):
        cfg = compose(config_name='pose_transfer', overrides=[
            f'data.root={root.as_posix()}', 'data.manifest=${data.root}/manifest.csv',
            f'output_dir={output.as_posix()}', 'trainer.accelerator=cpu', 'trainer.devices=1',
            'trainer.precision=32-true', '+trainer.logger=false', 'trainer.num_sanity_val_steps=0',
            'data.window_ms=100', 'data.stride_ms=100', 'data.eval_window_ms=100',
            'data.batch_size=2', 'data.num_workers=0', 'data.batches_per_epoch=2',
            'model.patch_samples=20', 'model.channel_dim=4', 'model.d_model=16', 'model.depth=1',
            'model.heads=2', 'model.dropout=0', 'hidden_dim=8', 'output_dim=3',
            'pretrain_steps=2', 'experiment.finetune_steps=2', 'optimizer.warmup_steps=0'])
    return cfg


def test_complete_ssl_pose_evaluation_pipeline(transfer_root, tmp_path):
    import json
    from pose_transfer import execute
    cfg = tiny_config(transfer_root, tmp_path/'ssl')
    cfg.action = 'prepare'; artifact = execute(cfg)
    assert all(r['selected_split'] == 'train' for r in artifact['records'] if r['task_id'] != 'pose')
    cfg.action = 'pretrain'; ssl = execute(cfg)
    cfg.action = 'finetune'; cfg.output_dir = str(tmp_path/'ft')
    cfg.init_encoder = str(tmp_path/'ssl/checkpoints/last.ckpt')
    ft = execute(cfg)
    assert (tmp_path/'ft/checkpoints/last.ckpt').is_file()
    cfg.action = 'evaluate'; cfg.output_dir = str(tmp_path/'eval'); cfg.init_encoder = None
    cfg.checkpoint = str(tmp_path/'ft/checkpoints/last.ckpt'); cfg.export_predictions = True
    execute(cfg)
    result = json.loads((tmp_path/'eval/evaluation.json').read_text())
    # 3 windows × (200 - 19 unavailable samples), one invalid IK frame is in the unavailable prefix.
    assert result['valid_angle_count'] == 3*181*3
    assert result['training_contract']['pretrain_contract']['experiment']['sources'] == 'all'
    assert len(list((tmp_path/'eval/predictions/rank-0').glob('*.npz'))) == 2


def test_checkpoint_actually_loads_encoder_and_rejects_incompatible_scale(tmp_path):
    from semg_fm.pose_transfer.module import TransferModule
    config = dict(patch_samples=8, channel_dim=4, d_model=16, depth=1, heads=2, dropout=0)
    ssl = TransferModule(config, mode='ssl', artifact_hash='a', max_steps=2, warmup_steps=0)
    ckpt = tmp_path/'ssl.ckpt'
    torch.save(dict(hyper_parameters=dict(ssl.hparams), state_dict=ssl.state_dict()), ckpt)
    ft = TransferModule(config, mode='pose', artifact_hash='a', max_steps=2, warmup_steps=0)
    ft.load_encoder(ckpt)
    for name, value in ssl.encoder.state_dict().items():
        torch.testing.assert_close(value, ft.encoder.state_dict()[name])
    ft.hparams.artifact_hash = 'b'
    with pytest.raises(ValueError, match='artifacts differ'):
        ft.load_encoder(ckpt)


def test_mixture_probabilities_and_rank_shards():
    import numpy as np
    from types import SimpleNamespace
    from semg_fm.pose_transfer.data import MixtureBatches
    ds = SimpleNamespace(records=[dict(dataset_id='a', task_id='pose'), dict(dataset_id='b', task_id='typing')],
                         entries=[(0,0,1),(1,0,1)], offsets=np.array([0,100,500]))
    rank0 = MixtureBatches(ds, 4, 30, alpha=.5, seed=10, rank=0, world_size=2)
    rank1 = MixtureBatches(ds, 4, 30, alpha=.5, seed=10, rank=1, world_size=2)
    global_ = MixtureBatches(ds, 8, 30, alpha=.5, seed=10)
    np.testing.assert_allclose(rank0.probabilities, [1/3, 2/3])
    for a,b,full in zip(rank0, rank1, global_):
        assert a == full[::2] and b == full[1::2]
    initial = list(rank0); rank0.set_epoch(1)
    assert initial != list(rank0)


def test_preparation_scales_ignore_heldout_rms(transfer_root, tmp_path):
    import h5py
    from semg_fm.pose_transfer.data import prepare
    first = prepare(transfer_root, transfer_root/'manifest.csv', tmp_path/'first.json')
    with h5py.File(transfer_root/'pose/test.h5', 'r+') as h:
        h['meta/quality/channel_rms'][:] = 100000
    second = prepare(transfer_root, transfer_root/'manifest.csv', tmp_path/'second.json')
    assert first['scales'] == second['scales']


def test_official_opposite_wrist_split_is_audited_then_training_counterpart_excluded():
    import pandas as pd
    from semg_fm.pose_transfer.protocol import exclude_pose_counterparts
    base = dict(dataset_id='emg2pose', task_id='pose', subject_id='s', session_id='capture', sample_rate_hz=2000)
    frame = pd.DataFrame([dict(base, resolved_path='a', side='left', official_split='train', source_sha256='a'*64),
                          dict(base, resolved_path='b', side='right', official_split='test', source_sha256='b'*64)])
    checked = audit_frame(frame)
    strict = exclude_pose_counterparts(checked)
    assert strict.selected_split.tolist() == ['excluded_train_counterpart', 'test']
    assert strict.official_split.tolist() == ['train', 'test']


def test_comparison_reports_paired_delta_and_rejects_partial_runs(tmp_path):
    import json
    from compare_pose_transfer import summarize
    common = dict(model={'d_model':16}, hidden_dim=8, window_ms=1000, stride_ms=500,
                  optimizer={}, batch_size=4, trainer={'devices':2, 'accumulate_grad_batches':1},
                  label_fraction=1., seed=0, steps=20)
    paths = []
    for exp, mae in [('A',10.), ('D',8.)]:
        path = tmp_path/f'{exp}.json'; paths.append(path)
        value = dict(experiment=exp, training_contract=dict(common, experiment={'name':exp}),
                     full_test_loader=True, artifact_sha256='fixed', protocol='same',
                     evaluation_window_ms=5000, data_coverage={'test':{'windows':10}},
                     mae_deg=mae, rmse_deg=mae+1)
        path.write_text(json.dumps(value))
    assert '平均收益 2.0000' in summarize(paths)
    value['full_test_loader'] = False; paths[-1].write_text(json.dumps(value))
    with pytest.raises(ValueError, match='partial'):
        summarize(paths)


@pytest.mark.parametrize('ring', [False, True])
def test_all_trainable_parameters_used_for_ddp(ring):
    from semg_fm.pose_transfer.module import TransferModule
    cfg = dict(patch_samples=8, channel_dim=4, d_model=16, depth=1, heads=2, dropout=0, ring_mixing=ring)
    model = TransferModule(cfg, mode='pose', output_dim=3, hidden_dim=8, max_steps=2, warmup_steps=0)
    pred, _ = model(torch.randn(2, 64, 16)); pred.sum().backward()
    assert all(p.grad is not None for p in model.parameters() if p.requires_grad)
