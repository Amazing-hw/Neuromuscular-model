# Pose transfer 实施验证记录

日期：2026-11-03。项目：`D:/Fmodel`。本次新增独立迁移实验路径，保留五个 canonical H5 转换器与旧训练路径。研究方案见 [研究说明](../research/08_meta_pose_transfer.md)，操作说明见 [POSE_TRANSFER.md](../../POSE_TRANSFER.md)。

## 已执行的检查

|检查|结果与范围|
|---|---|
|全仓库 pytest|295 passed，1 skipped，38 warnings；包含新路径 16 项测试，跳过项需要 CUDA|
|时间因果、时间顺序、电极身份|改变未来不影响此前输出；时间/通道重排不会被错误视为等价输入|
|遮挡内容隔离、SSL 梯度|被遮挡内容改变不影响 masked encoder 输出；有效梯度到达 encoder|
|checkpoint encoder 迁移|逐参数一致；不兼容的归一化 artifact 拒绝加载|
|标签预算与采样|session 子集嵌套；来源温度概率、rank 槽位及评估补齐计数通过测试|
|归一化泄漏|修改 test RMS 不改变 train-only 标度|
|合成 H5 全链路|prepare → SSL → pose 微调 → 完整小测试集评估 → 预测导出|
|真实 H5 小样本全链路|五来源各一条 train，加一条 pose val 和一条 pose test；各阶段两步 CPU 训练|
|真实清单协议审计|28,609 条记录；识别并默认排除 540 条 pose train 的跨划分另一腕记录|
|双进程 CPU DDP|Gloo 后端完成 SSL、微调、验证、测试及 checkpoint 保存|
|分布式指标核对|同一 checkpoint 的单/双进程有效角度数一致，MAE 差约 1e-14 度|
|结果汇总 CLI|实际生成的合成 evaluation.json 可汇总为 Markdown；部分测试结果会被拒绝|
|Hydra A 组入口与差异检查|配置组合有效；git diff --check 通过|

全仓库测试命令：

```powershell
Set-Location D:\Fmodel
python -B -m pytest -q -p no:cacheprovider -o "addopts=--basetemp=C:/Users/User/Documents/F_model/.pytest_tmp_transfer_all_final"
```

单独运行新路径：`python -B -m pytest tests/test_pose_transfer.py -q`。需要可写的 pytest 临时目录。

## 分布式指标核对

对同一个两步微调 checkpoint、同一条真实 pose test 记录的全部可用 1 秒窗口，分别运行单进程与双进程评估：

- 有效角度元素数均为 **1,764,900**。
- MAE 差值 `1.0658141036401503e-14` 度，RMSE 差值 `0.0`。
- 三个 subject/generalization/stage 分组的计数一致，误差差值均小于 `1e-5` 度。

这只验证本次样例的分布式归约及补齐权重，不代表正式模型精度。本机验证产物位于 `C:/Users/User/Documents/F_model/validation/pose_transfer_20261103/`，其中 `single_vs_ddp.json` 保存核对结果。七文件 artifact 仅用于 smoke，不能用于正式全量实验。

## 警告与证据边界

- pytest 警告包括第三方 pytree 弃用、CPU pin_memory、worker 数量和旧路径的恢复/日志提示。新路径在 epoch 末显式归约指标统计量，因此 Lightning 对 sync_dist 的通用提示不表示未聚合。
- CPU DDP 启动出现本机 socket 地址警告，随后两个 rank 正常注册，最终训练和评估均以退出码 0 结束。
- 未扫描完整语料的全部时间戳或运行全量预训练。正式实验先执行完整 `action=prepare`。
- 未验证 A100/NCCL/BF16 的显存、吞吐和数值表现；CPU DDP 检查不能替代服务器实测。
- 未运行正式 A–E 多种子实验，不能据此宣称正迁移、性能提升或顶会创新性。
- 未完成官方 FK/landmark 指标或官方强基线同协议复现。逐帧导出是后续接入接口。
- sampler 未持久化逐微批游标。中途恢复支持模型和优化器状态，不承诺与不中断运行逐位一致；建议在 epoch 边界恢复，并记录恢复历史。

研究有效性仍需通过真实规模的公平实验判断。
