"""Split audit, nested session budgets and count-weighted angular metrics."""
import hashlib
import math
import numpy as np
import torch

TASKS = ('pose', 'typing', 'discrete_gesture', 'handwriting', 'wrist_angle')


def source_key(row):
    return str(row['dataset_id']) + '/' + str(row['task_id'])


def audit_frame(frame):
    frame = frame.copy()
    official = frame.official_split.astype(str).str.strip()
    fallback = frame['split'].astype(str).str.strip() if 'split' in frame else official
    frame['selected_split'] = official.where(official.isin(['train', 'val', 'test']), fallback)
    if not frame.selected_split.isin(['train', 'val', 'test']).all():
        raise ValueError('unassigned split: run make_splits for external sources first')
    if not official[frame.task_id == 'pose'].isin(['train', 'val', 'test']).all():
        raise ValueError('pose requires official train/val/test assignments; do not invent a new split')
    if not np.isclose(frame.sample_rate_hz.astype(float), 2000).all():
        raise ValueError('pose_transfer requires 2000 Hz; explicit resampling is needed for other rates')
    if not frame.task_id.isin(TASKS).all():
        raise ValueError('unknown task_id in transfer manifest')
    if frame.resolved_path.astype(str).duplicated().any():
        raise ValueError('duplicate canonical paths in manifest')
    # Bilateral records may share a raw file hash within one split, never across splits.
    for field in ('source_sha256',):
        values = frame[field].astype(str)
        if not values.str.fullmatch('[a-fA-F0-9]{64}').all():
            raise ValueError(f'{field} must contain real SHA256 hashes')
        if (frame.groupby(field).selected_split.nunique() > 1).any():
            raise ValueError(f'{field} overlaps train/val/test: possible data leakage')
    groups = ['dataset_id', 'subject_id', 'session_id']
    external = frame[frame.task_id != 'pose']
    if (external.groupby(groups).selected_split.nunique() > 1).any():
        raise ValueError('external session crosses splits')
    pose = frame[frame.task_id == 'pose']
    if 'side' in frame and (pose.groupby(groups+['side']).selected_split.nunique() > 1).any():
        raise ValueError('same-side pose session crosses splits')
    return frame


def exclude_pose_counterparts(frame):
    """Remove train wrists whose recording ID also occurs in val/test.

    Official emg2pose can place opposite wrists of a simultaneous recording in
    different splits. Preserve official labels, but exclude correlated train
    counterparts from this conservative transfer protocol.
    """
    frame = frame.copy()
    keys = ['dataset_id', 'subject_id', 'session_id']
    held = frame[(frame.task_id == 'pose') & frame.selected_split.isin(['val', 'test'])]
    held_keys = set(held[keys].itertuples(index=False, name=None))
    paired = np.array([key in held_keys for key in frame[keys].itertuples(index=False, name=None)])
    frame.loc[(frame.task_id == 'pose') & (frame.selected_split == 'train') & paired, 'selected_split'] = 'excluded_train_counterpart'
    return frame


def select_sessions(records, fraction, seed):
    """Exact fraction of session groups (ceil), nested across budgets per seed."""
    if not 0 < fraction <= 1:
        raise ValueError('label_fraction must be in (0,1]')
    def key(row):
        return (str(row['dataset_id']), str(row['subject_id']), str(row['session_id']))
    groups = sorted({key(r) for r in records}, key=lambda k: hashlib.sha256(f'{seed}:{k}'.encode()).hexdigest())
    keep = set(groups[:max(1, math.ceil(len(groups)*fraction))])
    return [r for r in records if key(r) in keep]


def angular_sums(prediction, target, mask):
    """Sufficient statistics, one [abs sum, square sum, element count] per example."""
    if prediction.shape != target.shape or mask.shape != target.shape[:2]:
        raise ValueError('angle predictions, targets or masks have incompatible shapes')
    delta = torch.where(mask[..., None], prediction.double()-target.double(), 0)
    return torch.stack((delta.abs().sum((1, 2)), delta.square().sum((1, 2)),
                        mask.sum(1).double()*target.shape[-1]), -1)


def angular_metrics(sums):
    absolute, squared, count = [float(v) for v in sums]
    if count <= 0:
        raise ValueError('no valid pose angle elements for evaluation')
    return dict(mae_deg=absolute/count*180/math.pi,
                rmse_deg=math.sqrt(squared/count)*180/math.pi, valid_angle_count=int(count))
