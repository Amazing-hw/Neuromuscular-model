"""Causal, channel-aware encoder and fixed-target masked signal modelling.

No channel rotation invariance is imposed: electrode identity is useful for pose.
One output token becomes available at the END of its non-overlapping patch.
"""
import math
import torch
from torch import nn
from torch.nn import functional as F


def patches(x, patch_samples):
    if x.ndim != 3 or x.shape[-1] != 16 or x.shape[1] % patch_samples:
        raise ValueError('EMG must be [B,T,16], with T divisible by patch_samples')
    return x.reshape(x.shape[0], -1, patch_samples, 16).permute(0, 1, 3, 2)


class TransferEncoder(nn.Module):
    def __init__(self, patch_samples=40, channel_dim=16, d_model=256,
                 depth=4, heads=8, dropout=0.1, ring_mixing=False):
        super().__init__()
        if patch_samples < 2 or d_model % 2 or d_model % heads:
            raise ValueError('invalid patch size or attention dimensions')
        self.patch_samples = patch_samples
        self.patch = nn.Linear(patch_samples, channel_dim)
        self.channel_id = nn.Parameter(torch.randn(16, channel_dim) * .02)
        self.mask_token = nn.Parameter(torch.zeros(channel_dim))
        self.ring = nn.Conv1d(channel_dim, channel_dim, 3, groups=channel_dim) if ring_mixing else None
        # Flatten in physical electrode order; averaging would erase identity.
        self.readout = nn.Linear(16 * channel_dim, d_model)
        layer = nn.TransformerEncoderLayer(d_model, heads, 4*d_model, dropout,
                                           batch_first=True, norm_first=True, activation='gelu')
        self.temporal = nn.TransformerEncoder(layer, depth, enable_nested_tensor=False)
        self.norm = nn.LayerNorm(d_model)

    def forward(self, emg, mask=None):
        x = patches(emg, self.patch_samples)
        x = torch.sign(x) * torch.log1p(x.abs())
        h = self.patch(x)
        if mask is not None:
            if mask.shape != h.shape[:-1] or mask.dtype != torch.bool:
                raise ValueError('mask must be bool [B,N,16]')
            h = torch.where(mask[..., None], self.mask_token, h)
        h = h + self.channel_id
        if self.ring is not None:
            b, n, c, d = h.shape
            local = h.reshape(b*n, c, d).transpose(1, 2)
            h = h + F.gelu(self.ring(F.pad(local, (1, 1), mode='circular'))).transpose(1, 2).reshape(b, n, c, d)
        h = self.readout(h.flatten(-2))
        # Explicit time position breaks the old patch-permutation symmetry.
        n, d = h.shape[1:]
        position = torch.arange(n, device=h.device, dtype=torch.float32)[:, None]
        frequency = torch.exp(torch.arange(0, d, 2, device=h.device) * (-math.log(10000.0) / d))
        pe = torch.stack(((position*frequency).sin(), (position*frequency).cos()), -1).flatten(-2)
        causal = torch.ones(n, n, device=h.device, dtype=torch.bool).triu(1)
        return self.norm(self.temporal(h + pe.to(h.dtype), mask=causal))


class PoseDecoder(nn.Module):
    """Window-local recurrent regression; never consumes true initial pose."""
    def __init__(self, d_model, output_dim=20, hidden_dim=256):
        super().__init__()
        self.gru = nn.GRU(d_model, hidden_dim, batch_first=True)
        self.angle = nn.Linear(hidden_dim, output_dim)

    def forward(self, z, sample_count, patch_samples):
        h, _ = self.gru(z)  # State resets at each independent window.
        tokens = self.angle(h)
        clock = torch.arange(sample_count, device=z.device)
        index = torch.div(clock + 1, patch_samples, rounding_mode='floor') - 1
        valid = index >= 0
        # Last available prediction, not interpolation toward a future token.
        return tokens[:, index.clamp(0, tokens.shape[1]-1)], valid


@torch.no_grad()
def signal_targets(emg, patch_samples, spectral_bins=8):
    """Fixed log band-power + log RMS targets; no learnable teacher to collapse."""
    x = patches(emg.float(), patch_samples)
    spectrum = torch.fft.rfft(x, dim=-1).abs().square() / patch_samples
    bands = F.adaptive_avg_pool1d(spectrum.flatten(0, 2).unsqueeze(1), spectral_bins)
    bands = bands.reshape(*x.shape[:-1], spectral_bins)
    rms = x.square().mean(-1, keepdim=True).sqrt()
    return torch.cat((torch.log1p(bands), torch.log1p(rms)), -1)


def make_mask(batch, tokens, device, ratio=.5, block_tokens=3, generator=None):
    if not 0 < ratio < 1 or tokens < 2 or block_tokens < 1:
        raise ValueError('mask needs 0 < ratio < 1, at least two tokens and positive block_tokens')
    # Temporal spans plus contiguous arcs: an arc is not a cyclic augmentation.
    coarse = torch.rand(batch, math.ceil(tokens/block_tokens), 16, device=device, generator=generator)
    mask = coarse.repeat_interleave(block_tokens, 1)[:, :tokens] < ratio
    starts = torch.randint(16, (batch,), device=device, generator=generator)
    arc = ((torch.arange(16, device=device)[None] - starts[:, None]) % 16) < 3
    mask |= arc[:, None]
    mask[:, 0] = False  # Always provide a prefix for causal reconstruction.
    mask[:, 1, 0] = True
    return mask


def masked_signal_loss(prediction, target, mask):
    if prediction.shape != target.shape or mask.shape != target.shape[:-1] or not mask.any():
        raise ValueError('masked loss requires matching shapes and a nonempty mask')
    return F.smooth_l1_loss(prediction.float()[mask], target.float()[mask])
