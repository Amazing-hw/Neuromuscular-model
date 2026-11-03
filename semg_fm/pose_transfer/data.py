"""Train-only preprocessing, continuous windows and explicit source sampling."""
import hashlib
import json
import math
from pathlib import Path

import h5py
import numpy as np
import torch
from lightning import LightningDataModule
from torch.utils.data import DataLoader, Dataset, Sampler

from semg_fm.data.manifest import load_manifest
from semg_fm.data.window_dataset import _canonical_signal_datasets
from semg_fm.reproducibility import manifest_digest
from .protocol import TASKS, audit_frame, exclude_pose_counterparts, select_sessions, source_key


def continuous_segments(time, max_gap_s):
    """Split at duplicates, backward clock jumps and missing-sample gaps."""
    if not np.isfinite(time).all():
        raise ValueError('nonfinite signal timestamps')
    delta = np.diff(time)
    cuts = np.r_[0, np.flatnonzero((delta <= 0) | (delta > max_gap_s)) + 1, len(time)]
    return [[int(a), int(b)] for a, b in zip(cuts[:-1], cuts[1:]) if b > a]


def prepare(root, manifest, destination, max_gap_samples=1.5, exclude_train_counterparts=True):
    """Read metadata/clocks once; fit scales using train records only.

    The converter already stores per-channel RMS over each full recording.
    Reusing these sufficient statistics avoids rereading terabytes of EMG.
    """
    root, manifest = Path(root), Path(manifest)
    if max_gap_samples <= 1:
        raise ValueError('max_gap_samples must exceed 1 to tolerate clock jitter')
    frame = audit_frame(load_manifest(manifest, root))
    if exclude_train_counterparts:
        frame = exclude_pose_counterparts(frame)
    totals, records = {}, []
    for i, row in enumerate(frame.to_dict('records')):
        path = row['resolved_path']
        with h5py.File(path, 'r') as h5:
            signal, clock, rate = _canonical_signal_datasets(h5, row, path)
            if len(signal) != int(row['sample_count']):
                raise ValueError(f'{path}: manifest sample count mismatch')
            meta = json.loads(h5['meta/source_json'][()])
            attrs = meta.get('attributes', {})
            if row['task_id'] == 'pose' and attrs.get('split', row['official_split']) != row['official_split']:
                raise ValueError(f'{path}: pose official split differs from original source metadata')
            row['segments'] = continuous_segments(clock[:], max_gap_samples/rate)
            row['budget_session'] = str(attrs.get('session') or attrs.get('session_name') or row['session_id'])
            row['generalization'] = str(attrs.get('generalization', 'unknown'))
            row['stage'] = str(attrs.get('stage', 'unknown'))
            if row['task_id'] == 'pose':
                label = h5.get('labels/joint_angles')
                if label is None or label.ndim != 2 or label.shape[0] != len(signal):
                    raise ValueError(f'{path}: pose labels are not sample-aligned')
                row['output_dim'] = int(label.shape[1])
            if row['selected_split'] == 'train':
                rms = np.asarray(h5['meta/quality/channel_rms'], dtype=np.float64)
                if rms.shape != (16,) or not np.isfinite(rms).all() or (rms < 0).any():
                    raise ValueError(f'{path}: invalid cached RMS statistics')
                count = len(signal)*16
                square, n = totals.get(source_key(row), (0., 0))
                totals[source_key(row)] = (square + float(np.square(rms).sum())*len(signal), n+count)
        row.pop('resolved_path')
        records.append(row)
        if (i+1) % 2000 == 0:
            print(f'Prepared {i+1}/{len(frame)} records', flush=True)
    scales = {key: math.sqrt(square/n) for key, (square, n) in totals.items()}
    if not scales or any(not np.isfinite(x) or x <= 0 for x in scales.values()):
        raise ValueError('train-only source RMS must be finite and positive')
    result = dict(version=1, manifest_sha256=manifest_digest(manifest), max_gap_samples=max_gap_samples,
                  exclude_train_counterparts=exclude_train_counterparts,
                  scales=scales, records=records,
                  split_counts=frame.groupby(['task_id', 'selected_split']).size().to_dict())
    result['split_counts'] = {'/'.join(k): int(v) for k, v in result['split_counts'].items()}
    result['limitations'] = ['Cross-release subject IDs have no verified identity mapping.',
                            'RMS statistics are trusted from canonical conversion; timestamps are scanned.',
                            'No automatic electrode order, polarity or left/right canonicalization.']
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2), encoding='utf-8')
    return result


class TransferWindows(Dataset):
    def __init__(self, root, records, scales, window_ms, stride_ms, supervised):
        self.root, self.records, self.scales = Path(root), records, scales
        self.supervised = supervised
        self.window = int(round(window_ms*2))
        stride = int(round(stride_ms*2))
        if min(self.window, stride) <= 0:
            raise ValueError('positive window and stride required')
        # Compact segment geometry, not one Python object per window.
        self.entries, counts = [], []
        for r, record in enumerate(records):
            for a, b in record['segments']:
                count = max(0, (b-a-self.window)//stride+1)
                if count:
                    self.entries.append((r, a, stride)); counts.append(count)
        self.offsets = np.r_[0, np.cumsum(counts, dtype=np.int64)]
        if not len(self):
            raise ValueError('no continuous full windows in selected records')

    def __len__(self):
        return int(self.offsets[-1])

    def __getitem__(self, index):
        padding = False
        if isinstance(index, tuple):
            index, padding = index
        entry = int(np.searchsorted(self.offsets, index, side='right') - 1)
        r, start, stride = self.entries[entry]
        start += (int(index)-int(self.offsets[entry]))*stride
        stop = start+self.window
        record = self.records[r]
        path = self.root / record['path']
        with h5py.File(path, 'r') as h5:
            x = np.asarray(h5['signal/emg'][start:stop], dtype=np.float32)
            if x.shape != (self.window, 16) or not np.isfinite(x).all():
                raise ValueError(f'{path}: invalid signal window')
            item = dict(emg=torch.from_numpy(x / self.scales[source_key(record)]),
                        weight=torch.tensor(0. if padding else 1.),
                        metadata=dict(path=record['path'], subject_id=record['subject_id'],
                                      session_id=record['budget_session'], generalization=record['generalization'],
                                      stage=record['stage'], start_sample=start, end_sample=stop,
                                      source=source_key(record)))
            # SSL never loads labels from any of the five tasks.
            if self.supervised:
                y = np.asarray(h5['labels/joint_angles'][start:stop], dtype=np.float32)
                valid = np.asarray(h5['labels/no_ik_failure'][start:stop], dtype=bool) if 'labels/no_ik_failure' in h5 else np.ones(self.window, bool)
                valid &= np.isfinite(y).all(-1)
                item.update(target=torch.from_numpy(np.nan_to_num(y)), target_mask=torch.from_numpy(valid))
        return item

    def coverage(self):
        covered = sum((int(self.offsets[i+1]-self.offsets[i])-1)*min(stride, self.window)+self.window
                      for i, (_, _, stride) in enumerate(self.entries))
        return dict(records=len(self.records), windows=len(self), window_samples=self.window,
                    represented_records=len({r for r, _, _ in self.entries}),
                    subjects=len({r['subject_id'] for r in self.records}),
                    sessions=len({(r['subject_id'], r['budget_session']) for r in self.records}),
                    covered_samples=covered,
                    window_sample_presentations=len(self)*self.window,
                    raw_selected_samples=sum(int(r['sample_count']) for r in self.records))


def collate(items):
    batch = {key: torch.stack([r[key] for r in items]) for key in items[0] if key != 'metadata'}
    batch['metadata'] = [r['metadata'] for r in items]
    return batch


class MixtureBatches(Sampler):
    """p(source) ∝ n_windows**alpha; replacement draws, explicitly rank-sharded.

    Stores segment ranges only. All ranks draw the same global batch and take
    different slots; repeated examples are possible by design with replacement.
    """
    def __init__(self, dataset, batch_size, batches, alpha=.5, seed=0, rank=0, world_size=1, epoch=0):
        if batch_size < 1 or batches < 1 or not 0 <= rank < world_size or not 0 <= alpha <= 1:
            raise ValueError('invalid mixture sampler configuration')
        self.batch_size, self.batches = batch_size, batches
        self.seed, self.rank, self.world_size, self.epoch = seed, rank, world_size, epoch
        sources = {}
        for i, (r, _, _) in enumerate(dataset.entries):
            sources.setdefault(source_key(dataset.records[r]), []).append((int(dataset.offsets[i]), int(dataset.offsets[i+1])))
        self.groups = {}
        for key, ranges in sorted(sources.items()):
            starts = np.array([a for a,b in ranges], dtype=np.int64)
            offsets = np.r_[0, np.cumsum([b-a for a,b in ranges])]
            self.groups[key] = (starts, offsets)
        sizes = np.array([offsets[-1] for starts, offsets in self.groups.values()], dtype=float)
        self.probabilities = sizes**alpha / np.sum(sizes**alpha)

    def set_epoch(self, epoch):
        self.epoch = epoch

    def __len__(self):
        return self.batches

    def __iter__(self):
        rng = np.random.default_rng(self.seed+self.epoch)
        groups = list(self.groups.values())
        for _ in range(self.batches):
            starts, offsets = groups[int(rng.choice(len(groups), p=self.probabilities))]
            local = rng.integers(int(offsets[-1]), size=self.batch_size*self.world_size)
            part = np.searchsorted(offsets, local, side='right')-1
            indices = starts[part]+local-offsets[part]
            yield indices[self.rank::self.world_size].tolist()


class EvaluationBatches(Sampler):
    """Every real window once globally; duplicate padding carries zero weight."""
    def __init__(self, size, batch_size, rank=0, world_size=1):
        self.size, self.batch_size, self.rank, self.world_size = size, batch_size, rank, world_size

    def __len__(self):
        return math.ceil(self.size/(self.batch_size*self.world_size))

    def __iter__(self):
        for step in range(len(self)):
            first = (step*self.world_size+self.rank)*self.batch_size
            yield [(i % self.size, i >= self.size) for i in range(first, first+self.batch_size)]


class TransferDataModule(LightningDataModule):
    def __init__(self, config, action, sources, seed, label_fraction=1.):
        super().__init__()
        self.config, self.action, self.sources = config, action, sources
        self.seed, self.label_fraction = seed, label_fraction
        self.datasets = {}

    def setup(self, stage=None):
        if self.datasets:
            return
        c = self.config
        artifact = json.loads(Path(c['prepared']).read_text(encoding='utf-8'))
        if artifact['manifest_sha256'] != manifest_digest(c['manifest']):
            raise ValueError('prepared artifact belongs to a different manifest; run prepare again')
        self.artifact_hash = hashlib.sha256(Path(c['prepared']).read_bytes()).hexdigest()
        self.artifact = artifact
        ssl = self.action == 'pretrain'
        tasks = TASKS if self.sources == 'all' else (('pose',) if self.sources == 'pose' else TASKS[1:])
        records = artifact['records']
        if self.sources not in ('all', 'pose', 'external'):
            raise ValueError('sources must be all, pose or external')
        if ssl and set(tasks) - {r['task_id'] for r in records if r['selected_split'] == 'train'}:
            raise ValueError('requested pretraining pool has missing tasks')
        splits = ('train',) if ssl else (('test',) if self.action == 'evaluate' else ('train', 'val'))
        for split in splits:
            selected = [r for r in records if r['selected_split'] == split and r['task_id'] in (tasks if ssl else ('pose',))]
            if not ssl and split == 'train':
                # Use original acquisition session, not converter record filename.
                adapted = [dict(r, session_id=r['budget_session'], canonical_session_id=r['session_id']) for r in selected]
                selected = [dict(r, session_id=r['canonical_session_id']) for r in select_sessions(adapted, self.label_fraction, self.seed)]
            duration = c['window_ms'] if split == 'train' else c['eval_window_ms']
            stride = c['stride_ms'] if split == 'train' else duration
            self.datasets[split] = TransferWindows(c['root'], selected, artifact['scales'], duration, stride, not ssl)
        self.summary = {split: ds.coverage() for split, ds in self.datasets.items()}
        if 'train' in self.datasets:
            mixture = MixtureBatches(self.datasets['train'], c['batch_size'], c['batches_per_epoch'], c['source_alpha'], self.seed)
            self.summary['sampling_probabilities'] = dict(zip(mixture.groups, mixture.probabilities.tolist()))
        self.summary['selected_sessions'] = sorted({r['budget_session'] for ds in self.datasets.values() for r in ds.records if r['selected_split'] == 'train'})

    def _loader(self, split):
        c = self.config; ds = self.datasets[split]
        trainer = self.trainer
        rank, world = (trainer.global_rank, trainer.world_size) if trainer else (0, 1)
        if split == 'train':
            sampler = MixtureBatches(ds, c['batch_size'], c['batches_per_epoch'], c['source_alpha'], self.seed, rank, world)
        else:
            sampler = EvaluationBatches(len(ds), c['batch_size'], rank, world)
        return DataLoader(ds, batch_sampler=sampler, collate_fn=collate, num_workers=c['num_workers'],
                          pin_memory=True, persistent_workers=c['num_workers'] > 0)

    def train_dataloader(self):
        return self._loader('train')

    def val_dataloader(self):
        return [] if self.action == 'pretrain' else self._loader('val')

    def test_dataloader(self):
        return self._loader('test')
