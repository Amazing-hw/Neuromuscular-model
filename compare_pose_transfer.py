"""Summarize paired A–E runs without silently mixing incompatible protocols."""
import argparse
import json
import statistics
from pathlib import Path


def global_batch(contract):
    trainer = contract['trainer']
    devices = trainer['devices']
    if devices == 'auto':
        raise ValueError('use explicit trainer.devices for auditable comparisons')
    return contract['batch_size'] * devices * trainer['accumulate_grad_batches']


def summarize(paths):
    results = [json.loads(Path(p).read_text(encoding='utf-8')) for p in paths]
    if not results:
        raise ValueError('no evaluation.json files found')
    budgets, shared = {}, None
    ssl_budgets = set()
    for result in results:
        if not result.get('full_test_loader'):
            raise ValueError('partial test runs cannot enter the research comparison')
        c = result['training_contract']
        signature = json.dumps(dict(model=c['model'], hidden_dim=c['hidden_dim'], window_ms=c['window_ms'],
                                    stride_ms=c['stride_ms'], optimizer=c['optimizer'],
                                    artifact=result['artifact_sha256'], protocol=result['protocol'],
                                    eval_window_ms=result['evaluation_window_ms'],
                                    eval_windows=result['data_coverage']['test']['windows'],
                                    batch=global_batch(c)), sort_keys=True)
        if shared is not None and signature != shared:
            raise ValueError('incompatible model, preprocessing, batch size or evaluation protocols; compare ablations separately')
        shared = signature
        if 'pretrain_contract' in c:
            pre = c['pretrain_contract']
            ssl_budgets.add((pre['steps'], global_batch(pre), pre['window_ms'], pre['source_alpha'], json.dumps(pre['objective'], sort_keys=True)))
        key = (c['label_fraction'], result['experiment'], c['seed'])
        if key in budgets:
            raise ValueError(f'duplicate run for budget/experiment/seed: {key}')
        budgets[key] = result
    if len(ssl_budgets) > 1:
        raise ValueError('B/C/D pretraining budgets/objectives differ')
    lines = ['# emg2pose 迁移实验汇总', '', '角度误差单位为度；mean ± sample SD 跨随机种子统计。配对收益 = 对照 MAE − 方法 MAE，正值表示方法更好。',
             '只有角度评测；不等同于官方完整评测。E 是延长监督训练，不自动代表 FLOPs/时间匹配。', '',
             '|标签 session 比例|实验|种子数|MAE mean ± SD|RMSE mean ± SD|', '|---|---|---:|---:|---:|']
    for fraction in sorted({k[0] for k in budgets}):
        steps = {r['training_contract']['steps'] for (f,e,s),r in budgets.items() if f == fraction and e != 'E'}
        if len(steps) > 1:
            raise ValueError('A/B/C/D finetuning steps differ')
        for experiment in 'ABCDE':
            rows = [r for (f,e,s),r in budgets.items() if f == fraction and e == experiment]
            if not rows:
                continue
            def stats(key):
                values = [r[key] for r in rows]
                sd = f'{statistics.stdev(values):.4f}' if len(values) > 1 else 'NA'
                return f'{statistics.mean(values):.4f} ± {sd}'
            lines.append(f'|{fraction:g}|{experiment}|{len(rows)}|{stats("mae_deg")}|{stats("rmse_deg")}|')
        lines += ['', f'## 标签比例 {fraction:g}：按 seed 配对', '']
        for method, baseline in [('B','A'), ('C','A'), ('D','A'), ('D','B'), ('D','C'), ('D','E')]:
            seeds = sorted({s for f,e,s in budgets if f == fraction and e == method} & {s for f,e,s in budgets if f == fraction and e == baseline})
            if seeds:
                delta = [budgets[(fraction, baseline, s)]['mae_deg'] - budgets[(fraction, method, s)]['mae_deg'] for s in seeds]
                lines.append(f'- {method} 相对 {baseline}：平均收益 {statistics.mean(delta):.4f}°；逐 seed {dict(zip(seeds, delta))}。' + (' 少于 3 个种子，仅作为初步检查。' if len(seeds) < 3 else ''))
        lines.append('')
    lines += ['请同时检查 subject_macro_mae_deg、generalization 子组及各 subject 误差；窗口不是独立受试者，不应按窗口数虚增统计显著性。',
              '本脚本给出描述统计，不进行自动显著性或“预训练有效”判定。']
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', nargs='+', help='evaluation.json files or run directories (recursive)')
    parser.add_argument('--output', default='pose_transfer_comparison.md')
    args = parser.parse_args()
    paths = sorted({p.resolve() for value in args.inputs for p in ([Path(value)] if Path(value).is_file() else Path(value).rglob('evaluation.json'))})
    Path(args.output).write_text(summarize(paths), encoding='utf-8')
    print(f'Wrote {args.output} from {len(paths)} evaluations')


if __name__ == '__main__':
    main()
