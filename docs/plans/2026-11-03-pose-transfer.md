# 多源 EMG → emg2pose：实施设计与检查计划

用户已授权依据上一轮研究审查实施。目标是验证迁移收益，不预设环形结构有效，不把五任务联合监督作为主线。

## 设计

- 保留旧入口作为历史对照，新增 `pose_transfer.py`，统一 prepare / pretrain / finetune / evaluate。
- 固定 16 通道、2 kHz；不同采样率拒绝隐式混用。使用 train-only、按来源拟合的固定 RMS 标度，保留通道间幅值差异。
- 共享单通道 patch 投影 + 通道身份 + 可选环形局部混合 + 显式时间位置 + 因果时间 Transformer；按有序通道拼接读取，不取环形不变均值。
- 预训练恢复固定的 log-power 频谱和 log-RMS 目标，混合时间块/通道块遮挡。损失只计算被遮挡位置，不使用其他任务标签。
- 姿态 decoder 为 GRU + 角度头；不输入真实初始姿态。以 patch 末端预测，在线式零阶保持对齐到原采样时间，不双向插值泄露未来。
- A scratch；B pose SSL；C external SSL；D all SSL；E extended scratch。共享 encoder、decoder、数据预算和评估。多源预训练按来源窗口数的温度分布显式采样。
- prepare 检查划分、重复文件/源哈希、train-only 归一化；训练保存数据与配置摘要。微调标签按完整 session 的确定性嵌套子集选取。
- 评估输出按有效角度数量加权的 MAE(deg)/RMSE(deg)、subject 和官方 generalization 子组结果；排除 IK 失败和分布式补齐样本。5 秒非重叠片段、每片段重置状态。该协议明确不是官方全套 FK 指标复现。

## 实施与验证顺序

1. 先写失败测试：因果性、时间顺序、通道身份、遮挡输入独立性、SSL 梯度、分组预算、无泄漏、全局加权指标。
2. 实现 model/objectives，再实现独立数据和协议层，最后接 Lightning/Hydra 入口与 A–E 配置。
3. CPU 合成 canonical H5 完整执行 prepare → SSL → 微调 → evaluate，并验证 checkpoint 兼容性与错误配置拒绝。
4. 跑相关回归测试、审查 DDP 分片/指标归约、补充中文方法与服务器操作文档。

## 证据边界

本地 CPU 测试只能证明软件路径与协议检查可运行。8 卡 A100、完整真实数据、官方基线及 landmark/FK 评测未运行前，不声称复现官方结果、预训练有效或达到顶会创新要求。跨发布 subject ID 无法可靠对齐时必须披露。
