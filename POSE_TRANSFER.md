# 多源 Meta EMG 预训练 → emg2pose 迁移：使用说明

更新：2026-11-03。当前研究主线使用 **`pose_transfer.py`**。已有 5 个 H5 转换脚本不变；旧的 `pretrain.py / finetune.py / evaluate.py` 仍保留为历史实现，不与新 checkpoint 混用。

研究动机、方法取舍与证据标准见 [研究方案](docs/research/08_meta_pose_transfer.md)。这条路径首先验证一个问题：在同一姿态模型和微调预算下，其他 Meta EMG 数据是否带来可重复的迁移收益。

## 1. 入口与文件

|文件|用途|
|---|---|
|`pose_transfer.py`|Hydra 入口：prepare / pretrain / finetune / evaluate|
|`configs/pose_transfer.yaml`|模型、数据、优化器、Lightning 配置|
|`configs/transfer_experiment/{A,B,C,D,E}.yaml`|公平对照的预训练来源与步数|
|`semg_fm/pose_transfer/model.py`|有时间位置、保留通道身份的因果 encoder；GRU decoder；固定信号目标|
|`semg_fm/pose_transfer/data.py`|train-only 标度、连续片段索引、来源采样、分布式评估补齐|
|`semg_fm/pose_transfer/protocol.py`|划分审计、训练侧配对过滤、session 标签预算、角度统计|
|`semg_fm/pose_transfer/module.py`|Lightning 训练、encoder 权重迁移、计数加权指标与预测导出|
|`compare_pose_transfer.py`|检查实验兼容性、汇总多 seed、生成配对比较 Markdown|
|`tests/test_pose_transfer.py`|模型行为、数据协议、checkpoint 与端到端回归测试|

## 2. 数据准备：转换一次，建索引一次

先完成原有 canonical H5 转换。不要重新转换、拼接大 H5 或移动原始数据。

必须提供一个包含全部五类来源的清单。没有官方划分的外部来源先用 `make_splits.py` 生成划分。emg2pose 必须使用官方划分；不能用随机划分替代，也不能把官方 val/test 当作“无标签数据”加入预训练。

本机已有清单 `D:/Fmodel/emg_data_canonical/splits.official.seed-20260916.csv` 可用于这条路径。下面是 PowerShell 命令：

```powershell
Set-Location D:\Fmodel
python -m pip install -r requirements-train.txt
python pose_transfer.py action=prepare data.root=D:/Fmodel/emg_data_canonical data.manifest=D:/Fmodel/emg_data_canonical/splits.official.seed-20260916.csv
```

`prepare` 默认写 `data.root/pose_transfer_prepared.json`，执行以下工作：

1. 校验文件路径、官方/补充分割、源 SHA256 跨划分重复、2 kHz 采样率、16 通道、根属性与清单一致性。
2. 读取各文件时间戳，在重复、倒退或相邻时间差超过 `1.5/2000` 秒处断开。后续窗口不跨间隙；不压缩时间，不隐式重采样。
3. 读取 emg2pose 原始 `session`、`stage`、`generalization`；canonical `session_id` 可能是记录文件名，不用它冒充采集 session。
4. 默认 `data.exclude_train_counterparts=true`：排除与官方 val/test 同次记录的另一腕 train 文件。2026-11-03 本地清单共有 28,609 条记录，此规则排除 540 条 pose train，保留 16,596 条 pose train、1,950 条 pose val、6,167 条 pose test。外部 train 分别为 typing 1,610、gesture 84、handwriting 618、wrist 146。这是文件数，不是人数或有效小时数。
5. 只用最终训练池拟合每个 `dataset_id/task_id` 的固定 RMS 标度。公式为 `sqrt(sum_r T_r * sum_c RMS_rc² / sum_r 16*T_r)`，从转换时保存的统计量计算。所有 A–E 使用同一份 artifact，val/test 不参与拟合。

首次 prepare 会扫描全部文件的时钟，需预留 I/O 时间；每 2,000 条显示进度。不要把本地 smoke 的七文件 artifact 用于正式实验。改了 manifest、时间质量阈值、过滤政策或 H5 内容，就重新 prepare，并为所有对照统一重跑。程序验证 manifest SHA256 和 artifact SHA256；它不在每次启动时重算全部 H5 的内容哈希，故应将转换产物视为不可变数据。

`exclude_train_counterparts=false` 可建立完整官方 train 版本作为独立实验，但必须另存 artifact，所有对照共同切换。不能把两种政策的结果混在同一比较中。当前过滤按记录 ID 配对，不能证明跨发布身份相互独立，也不排除官方 stage 泛化设置下同一用户/采集 session 出现在不同划分。

程序不自动翻转左腕、不循环重排电极、不校正极性；16 通道只是共同接口，不能据此断言各来源的解剖位置完全对齐。默认所有来源都使用原始通道顺序，并在研究报告中说明这一限制。

## 3. A–E 对照

|实验|SSL 来源（仅 train）|姿态训练|回答的问题|
|---|---|---|---|
|A|无|随机初始化 → pose，20k 更新|监督基线|
|B|仅 pose|SSL encoder → pose，20k 更新|同域 SSL 是否有效|
|C|其他四类|SSL encoder → pose，20k 更新|跨任务数据是否能迁移|
|D|全部五类|SSL encoder → pose，20k 更新|增加外部数据是否优于 B|
|E|无|随机初始化 → pose，60k 更新|延长监督训练是否解释收益|

B/C/D 默认各 40k 个优化器更新；所有姿态模型使用同一 encoder + GRU。E 是**总更新步数匹配**的延长监督对照，SSL 和监督步骤 FLOPs 不同，因此不能写成已完成计算量或 GPU 小时匹配。需要另行记录 GPU 小时和计算开销。

一个 SSL checkpoint 可复用于相同 seed 的 1%、10%、100% 标签微调；不必为每个标签预算重复预训练。`label_fraction` 指按原始 session 分组后、按固定 hash 顺序取 `ceil(fraction*N)` 组，至少一组；小预算是大预算的子集。不是精确的帧比例，也不是受试者比例，实际 session/subject/window 数记录在 `protocol.json`。

## 4. A100 Linux 服务器命令

在仓库根目录执行以下 Bash 示例，路径改成服务器实际路径。先用一个 seed 和完整标签跑 A/B/D，确认趋势后扩展 C/E 和低标签实验。Hydra 组选择写作 `transfer_experiment@experiment=D`。

```bash
cd /path/to/Fmodel
export CUDA_VISIBLE_DEVICES=0,1,2,3
COMMON=(data.root=/data/meta_h5 data.manifest=/data/meta_h5/splits.official.csv data.prepared=/data/meta_h5/pose_transfer_prepared.json)
GPU=(trainer.devices=4 data.batch_size=16 trainer.accumulate_grad_batches=2)

# 首次执行一次。已有合格 artifact 则跳过。
python pose_transfer.py action=prepare "${COMMON[@]}"

# A：从零监督训练
python pose_transfer.py action=finetune transfer_experiment@experiment=A seed=0 "${COMMON[@]}" "${GPU[@]}" output_dir=runs/transfer/A/seed0/full

# D：全部五类 train 做 SSL，然后仅 pose 微调
python pose_transfer.py action=pretrain transfer_experiment@experiment=D seed=0 "${COMMON[@]}" "${GPU[@]}" output_dir=runs/transfer/D/seed0/ssl
python pose_transfer.py action=finetune transfer_experiment@experiment=D seed=0 "${COMMON[@]}" "${GPU[@]}" init_encoder=runs/transfer/D/seed0/ssl/checkpoints/last.ckpt output_dir=runs/transfer/D/seed0/full

# B / C：分别将 D 改为 B / C，并使用各自的输出路径与 SSL checkpoint。
# E：与 A 一样直接 finetune，transfer_experiment@experiment=E。

# D 的低标签微调：同一个 SSL checkpoint，独立输出目录
python pose_transfer.py action=finetune transfer_experiment@experiment=D seed=0 label_fraction=0.1 "${COMMON[@]}" "${GPU[@]}" init_encoder=runs/transfer/D/seed0/ssl/checkpoints/last.ckpt output_dir=runs/transfer/D/seed0/labels10
```

**保持有效 batch 一致**：`batch_size × GPU 数 × accumulate_grad_batches`。例如都取 128：

|可用 GPU|每卡 batch|累积步数|
|---:|---:|---:|
|8|16|1|
|4|16|2|
|2|16|4|
|1|16|8|

只暴露获分配的卡。例如 `CUDA_VISIBLE_DEVICES=2,5` 配 `trainer.devices=2`；Lightning 看到的是逻辑卡 0、1。不要用 `devices=auto` 做正式对照，设备数量变化会改变更新预算。采样器显式按 rank 分片，`use_distributed_sampler=false` 由入口固定，不能再让 Lightning 分片一次。

`data.batches_per_epoch=1000` 是每 rank 的微批次数，**不是扫完整数据一遍**。来源按 `P(d)∝N_d^alpha` 采样，默认 `alpha=.5`；`0` 为等来源，`1` 为按窗口数。批次从选定来源有放回抽样，允许重复样本；各 rank 使用同一个全局抽样序列的不同槽位。采样概率写入 `protocol.json`。固定总更新步数与全局 batch 才能匹配 SSL 样本呈现量。

`window_ms=1000`、patch=40 samples，即训练窗口有 50 个 token；评估默认 5 秒、250 token。验证耗时较长时可以先用较少批次做环境检查，但正式模型选择应固定并完整使用 pose val。B/C/D SSL 不使用 pose val 来挑选预训练 checkpoint，而取固定更新步数的 `last.ckpt`。

## 5. checkpoint、恢复与评估

- `init_encoder=...`：只从新路径的 SSL checkpoint 载入 encoder；GRU 与角度头重新初始化。程序严格检查模型、来源实验名和预处理 artifact。
- `resume_from=...`：恢复同一阶段的 Lightning 状态，包括优化器、调度器和训练进度。不能同时指定 `init_encoder`。
- A/E 不能偷偷加载 SSL；B/C/D 未提供 SSL 或恢复 checkpoint 时会报错。
- `last.ckpt` 是最后状态；微调另外保留按 **val/mae_deg** 选出的 `epoch=...-step=....ckpt`。正式评估选该 best 文件。极短 smoke 可能还未进行验证，此时只用 last 检查流程。

```bash
# 将文件名替换成该 run/checkpoints 中实际的 best checkpoint。
python pose_transfer.py action=evaluate transfer_experiment@experiment=D "${COMMON[@]}" "${GPU[@]}" 'checkpoint="runs/transfer/D/seed0/full/checkpoints/epoch=19-step=20000.ckpt"' output_dir=runs/transfer/D/seed0/full-test

# 如需逐帧预测供外部分析/FK桥接，添加 export_predictions=true。
# 同阶段恢复；原 output_dir 可继续使用，其他数据预算与模型配置保持一致。
python pose_transfer.py action=finetune transfer_experiment@experiment=D seed=0 "${COMMON[@]}" "${GPU[@]}" resume_from=runs/transfer/D/seed0/full/checkpoints/last.ckpt output_dir=runs/transfer/D/seed0/full
```

注意 Hydra 对值中的 `=` 有语法要求，所以上述 checkpoint 参数使用外层单引号、值内双引号；也可把选中的 best 文件复制为不含等号的名称。输出目录不能覆盖已有 run，恢复训练除外。尽量在 epoch 边界恢复；自定义有放回 sampler 未保存逐微批游标，中途恢复可恢复模型/优化器，但不承诺与不中断训练逐样本、逐位一致。

## 6. 指标与输出解释

`evaluation.json` 包含：

- `mae_deg` / `rmse_deg`：累计绝对/平方误差后除以全局有效角度元素数；不是各批次均值再平均。
- `valid_angle_count`：实际统计的角度元素数，排除 IK 失败、无效值、因果预测尚不可用的前缀以及 DDP 补齐样本。
- `groups`：subject、官方 generalization、stage 各自的相同统计；缺元数据标 `unknown`，不自行猜分组。
- `subject_macro_mae_deg`：各 subject MAE 的等权均值，用来区分“平均帧”和“平均用户”。
- `training_contract`、`data_coverage`、artifact 哈希：追溯训练来源、标签预算与覆盖范围。
- `full_test_loader`：限制测试批次数的 smoke 标为 false，汇总脚本会拒绝纳入正式比较。

模型不接收真实初始姿态，属于 **regression**。每个独立 5 秒窗口重置 Transformer 上下文及 GRU 状态。patch 末端才产出预测，在随后原始采样时刻零阶保持；默认最初 39 个样本无预测而排除。末尾不足 5 秒或间隙切分后太短的片段不参与，覆盖量必须报告。

这些角度指标能够支持 A–E 的内部迁移比较，**不是官方完整 benchmark 复现**：官方还包含手部 FK/landmark 距离等指标，且其窗口/上下文/掩码政策应由官方代码确定。本项目未伪造该结果。若声称优于官方模型，需要在同一协议重跑官方基线，或者将新 encoder 接到官方训练/评估框架；不能拿这里的 MAE 直接对比论文表格。

`export_predictions=true` 时，每 rank 分批写 `predictions/rank-N/batch-*.npz`，包括 `prediction_rad / target_rad / valid` 和 JSON metadata（源文件、start/end sample、subject、stage）。这是可追溯的逐帧导出接口；**不是已经验证的官方 FK adapter**，使用前应按官方关节顺序、手模型和 mask 要求接入并验证。完整测试导出可能很大，默认关闭。

每次运行还保存 `resolved_config.yaml`、`run_metadata.json`、`protocol.json`、Lightning 日志和 checkpoint。原始数据不写入结果目录。

## 7. 多 seed 汇总与可否下结论

至少使用 seed 0/1/2；每个种子重复 SSL 与相应微调，不只重复一个固定 SSL checkpoint 的微调。建议先完成 A/B/D 的 100% 标签，再运行 C/E、10%/1% 及 ring ablation。

```bash
python compare_pose_transfer.py runs/transfer --output runs/transfer/comparison.md
```

汇总脚本检查：完整测试、同模型和固定预处理、同姿态 batch/训练窗口/优化器、B/C/D 相同 SSL 步数和呈现预算、A/B/C/D 相同微调步数，并防止重复 seed 伪增样本数。它输出均值、样本标准差、同 seed 的配对收益，不自动给出统计显著性。不同 ring 设置或不同数据政策应分开汇总，再做显式消融比较。

最低证据链：B>A 说明同域 SSL 有帮助；D>A 说明混合预训练有帮助；**D>B 才支持额外来源的增益**；D>E 用于排除简单延长监督训练的解释。所有结论需同时看 held-out-user、subject macro 和低标签情形。结果无提升时，保留负结果并检查来源组成、目标难度和解码能力，不通过改变 test 划分追求提升。

## 8. CPU 检查与已验证边界

```powershell
python -B -m pytest tests/test_pose_transfer.py -q
python pose_transfer.py --cfg job data.root=D:/Fmodel/emg_data_canonical
```

小规模 CPU 冒烟可覆盖 `trainer.accelerator=cpu trainer.devices=1 trainer.precision=32-true data.num_workers=0 pretrain_steps=2 experiment.finetune_steps=2 optimizer.warmup_steps=0 data.batches_per_epoch=2`，并使用独立小清单、小模型和输出目录。训练少于 warmup 步数时必须同步降低 warmup；否则程序拒绝无意义的调度配置。

本轮全仓库测试为 **295 passed / 1 skipped**；执行了合成 H5 全链路、七条真实记录的 CPU 两步全链路，以及双进程 CPU DDP 预训练/微调/评估。单/双进程对同一 checkpoint 的有效角度计数一致，MAE 差值约 `1e-14` 度。还审计了全部 28,609 条真实清单的划分规则。详细证据见 [验证记录](docs/plans/2026-11-03-pose-transfer-verification.md)。

尚未进行完整真实语料训练、8 卡 A100 性能测试或官方 FK 评测。因此代码可用于开展实验，当前没有“已证明预训练有效”的研究结论。
