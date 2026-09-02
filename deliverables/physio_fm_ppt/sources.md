# 生理信号基础模型综述：核验来源与要点

以下条目只使用论文正式出版页、会议 proceedings、arXiv 或作者/项目 GitHub 页面。数值仅在来源明确给出时记录；“未披露”表示所核页面未给出可核验规模。

## BENDR：Using Transformers and a Contrastive Self-Supervised Learning Task to Learn From Massive Amounts of EEG Data
- **会议/年份**：Frontiers in Human Neuroscience，2021（15:653659）。
- **模态/数据规模**：EEG；论文描述为大规模多数据集预训练，具体小时数/受试者数以正文数据表为准，本 manifest 不臆填。
- **表示/Tokenizer**：卷积编码器产生潜表示；对增强视图做对比学习，并用离散上下文预测任务学习表征；非语言式 tokenizer。
- **骨干**：卷积特征提取器 + Transformer 编码器。
- **预训练目标**：对比自监督学习（增强视图一致性）与 masked/上下文表示预测。
- **评估**：EEG 睡眠、事件/状态分类等下游任务，并与监督/自监督基线比较。
- **对前臂/腕部 sEMG 的结论**：可迁移的是“增强一致性 + Transformer”范式；EEG 频谱与空间拓扑不同，需用 sEMG 增强和通道布局重新校准。
- **来源**：<https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2021.653659/full>

## BIOT：Biosignal Transformer for Cross-data Learning in the Wild
- **会议/年份**：NeurIPS 2023。
- **模态/数据规模**：EEG、ECG、人类活动传感信号，多数据集联合预训练；论文摘要未给统一总小时数。
- **表示/Tokenizer**：逐通道切成固定长度片段 token，加入通道嵌入与相对位置嵌入，再重排为序列；可处理通道不匹配、变长和缺失值。
- **骨干**：线性注意力 Transformer（Biosignal Transformer）。
- **预训练目标**：无监督两视图对比学习；另有监督式预训练设置。
- **评估**：EEG 癫痫检测、ECG 与活动识别等跨数据设置；报告 CHB-MIT 上相对基线的提升，但本条不扩展未核验数字。
- **对前臂/腕部 sEMG 的结论**：统一 token 化和缺失通道鲁棒性直接适合腕带 sEMG；需重设片段长度、通道嵌入及动作标签。
- **来源**：<https://proceedings.neurips.cc/paper_files/paper/2023/hash/f6b30f3e2dd9cb53bbf2024402d02295-Abstract.html>

## LaBraM：Large Brain Model for Learning Generic Representations with Tremendous EEG Data in BCI
- **会议/年份**：ICLR 2024。
- **模态/数据规模**：EEG；约 2,500 小时、约 20 个数据集（论文摘要明确）。
- **表示/Tokenizer**：向量量化神经谱预测 tokenizer，将连续 EEG 通道 patch 编码为神经代码。
- **骨干**：时空 Transformer，Base/Large/Huge 配置。
- **预训练目标**：masked EEG channel-patch modeling，预测被遮挡 patch 的离散神经代码。
- **评估**：异常检测、事件类型、情绪识别、步态预测及其他 BCI 任务。
- **对前臂/腕部 sEMG 的结论**：VQ 代码本 + masked patch 适合学习肌肉协同的离散词表；需以肌肉解剖/电极拓扑替换 EEG 空间先验。
- **来源**：<https://proceedings.iclr.cc/paper_files/paper/2024/file/47393e8594c82ce8fd83adc672cf9872-Paper-Conference.pdf>

## EEGPT-Wang：Pretrained Transformer for Universal and Reliable Representation of EEG Signals
- **会议/年份**：NeurIPS 2024。
- **模态/数据规模**：EEG；混合多任务 EEG 数据集，规模未在摘要统一披露。
- **表示/Tokenizer**：时空层级 patch 表示；不采用离散码本 tokenizer。
- **骨干**：约千万参数的层级 Transformer，分离短期空间和长期时间建模。
- **预训练目标**：mask 重建 + 时空表示对齐（双自监督）。
- **评估**：线性探测覆盖运动想象、睡眠分期、ERP 等下游任务，并比较 BENDR/BIOT/LaBraM。
- **对前臂/腕部 sEMG 的结论**：层级时空建模可迁移到“局部肌肉—动作序列”；表示对齐需换成适合 sEMG 信噪比与动作增强的目标。
- **来源**：<https://proceedings.neurips.cc/paper_files/paper/2024/file/4540d267eeec4e5dbd9dae9448f0b739-Paper-Conference.pdf>

## CBraMod：A Criss-Cross Brain Foundation Model for EEG Decoding
- **会议/年份**：ICLR 2025。
- **模态/数据规模**：EEG；跨数据集预训练，论文正文给出数据构成，摘要页未统一总规模。
- **表示/Tokenizer**：时域 patch 嵌入，采用 criss-cross（时间/通道交叉）建模；无独立离散 tokenizer。
- **骨干**：Criss-Cross Transformer/脑基础模型。
- **预训练目标**：masked EEG 建模/重建。
- **评估**：多类 EEG 解码下游任务（分类、跨被试泛化等）。
- **对前臂/腕部 sEMG 的结论**：交叉通道—时间注意力适合肌肉协同；要避免把 EEG 脑区先验直接搬用，优先做电极位置与手势拓扑适配。
- **来源**：<https://proceedings.iclr.cc/paper_files/paper/2025/file/bbbd6d915cb90be21c1254a82d45cedd-Paper-Conference.pdf>

## NeurIPT：Foundation Model for Neural Interfaces
- **会议/年份**：NeurIPS 2025。
- **模态/数据规模**：EEG；覆盖 8–9 个下游 BCI 数据集（版本摘要存在差异，采用正式 proceedings 的“九个”描述需以最终 PDF 为准）。
- **表示/Tokenizer**：时域 patch 表示与基于 3D 电极坐标的空间嵌入；无离散 tokenizer。
- **骨干**：Transformer + Progressive Mixture-of-Experts（PMoE）；微调时使用 Intra-Inter Lobe Pooling。
- **预训练目标**：Amplitude-Aware Masked Pretraining（按幅值选择遮挡）。
- **评估**：多个 BCI 数据集上的微调和从头训练比较，报告 SOTA/泛化。
- **对前臂/腕部 sEMG 的结论**：按幅值的遮挡可用于突出肌肉收缩事件；3D 电极坐标思路可替换为腕带电极几何，PMoE 有助于跨人/跨动作域适配。
- **来源**：<https://papers.nips.cc/paper_files/paper/2025/hash/dd9c5ce8803e1898d438e636fbae0236-Abstract-Conference.html>

## TFM-Tokenizer：Tokenizing Single-Channel Time Series via Time-Frequency Modeling
- **会议/年份**：ICLR 2026。
- **模态/数据规模**：单通道时间序列（含 EEG 等）；论文为预印本/会议页面，未统一披露总小时数。
- **表示/Tokenizer**：时间—频率建模的 VQ-VAE/离散 tokenizer，将单通道片段转为 token。
- **骨干**：Transformer 序列模型与时间频率编码器。
- **预训练目标**：tokenizer 重建/量化学习，配合 masked token 预测。
- **评估**：多时间序列分类/预测基准与 tokenizer 消融；不外推未核验指标。
- **对前臂/腕部 sEMG 的结论**：频带与收缩节律对 sEMG 有解释力；单通道限制意味着多电极腕带需增加跨通道融合层。
- **来源**：<https://arxiv.org/abs/2502.16060>

## Large-scale Training of Foundation Models for Wearable Biosignals（Apple）
- **会议/年份**：ICLR 2024。
- **模态/数据规模**：Apple Watch PPG 与单导联 ECG；AHMS 约 141,000 名参与者、跨度约 3 年。
- **表示/Tokenizer**：连续波形增强后的编码表示；无离散 tokenizer。
- **骨干**：PPG/ECG 专用深度编码器（论文未将其定义为通用 Transformer）。
- **预训练目标**：参与者级正样本选择、随机增强、带正则的对比损失与动量训练。
- **评估**：人口统计与健康状态表征、跨任务泛化；PPG/ECG 两模态均验证。
- **对前臂/腕部 sEMG 的结论**：大规模无标签穿戴数据与参与者级正对策略可直接借鉴；需加入动作/电极位移增强及跨设备评估。
- **来源**：<https://machinelearning.apple.com/research/large-scale-training>

## MOMENT：A Family of Open Time-series Foundation Models
- **会议/年份**：ICML 2024。
- **模态/数据规模**：通用时间序列 Time-series Pile（公开多源集合）；论文摘要未给单一总小时数。
- **表示/Tokenizer**：固定长度 patch embedding 与可学习 mask embedding；非离散 tokenizer。
- **骨干**：Encoder-only Transformer 家族（small/base 等）。
- **预训练目标**：随机遮挡 patch 并重建原始时间序列。
- **评估**：插补、异常检测、分类、短/长时预测，在有限监督/线性探测与微调设置评估。
- **对前臂/腕部 sEMG 的结论**：通用 patch 重建是强基线；sEMG 需考虑高采样率、短暂爆发和多通道同步，不能直接假定跨域零样本。
- **来源**：<https://arxiv.org/abs/2402.03885>

## PaPaGei：Open Foundation Models for Optical Physiological Signals
- **会议/年份**：ICLR 2025。
- **模态/数据规模**：PPG；20M 无标签片段、超过 57,000 小时、公开数据集。
- **表示/Tokenizer**：利用 PPG 形态学知识的表示学习；无离散 tokenizer。
- **骨干**：开放 PPG foundation encoder。
- **预训练目标**：基于信号形态的自监督表示目标（超越传统对比学习）。
- **评估**：10 个数据集、20 个任务，覆盖心血管、睡眠、孕期和福祉；含肤色鲁棒性分析。
- **对前臂/腕部 sEMG 的结论**：以生理形态为先验的 SSL 值得移植到肌电爆发/包络形态；PPG 光学噪声与 sEMG 电极噪声不同，需重写先验。
- **来源**：<https://proceedings.iclr.cc/paper_files/paper/2025/file/7871f51d332c8661cc729539d7987b21-Paper-Conference.pdf>

## Scaling Wearable Foundation Models
- **会议/年份**：ICLR 2025。
- **模态/数据规模**：多模态可穿戴传感器（含加速度等）；论文研究数据/算力/参数规模的 scaling，具体总量以 proceedings 为准。
- **表示/Tokenizer**：连续传感器 patch/token 表示；无语言式离散 tokenizer。
- **骨干**：Large Sensor Model（LSM）Transformer。
- **预训练目标**：可穿戴多传感器自监督预测/表示学习，并系统考察 scaling laws。
- **评估**：跨任务、跨数据规模/参数/计算量的下游比较。
- **对前臂/腕部 sEMG 的结论**：提供数据—模型—算力扩展的实验框架；sEMG 应单独建立动作覆盖与跨设备 scaling 曲线。
- **来源**：<https://proceedings.iclr.cc/paper_files/paper/2025/file/94b25992757a549470c8f8dfe73d8df6-Paper-Conference.pdf>

## Sundial：A Family of Highly Capable Time Series Foundation Models
- **会议/年份**：ICML 2025。
- **模态/数据规模**：通用时间序列 TimeBench；约 1 万亿时间点（论文摘要明确）。
- **表示/Tokenizer**：原生连续值 tokenization，不依赖离散 tokenizer。
- **骨干**：原生时间序列 Transformer（Sundial 家族）。
- **预训练目标**：TimeFlow Loss，基于 flow matching 预测下一 patch 的分布。
- **评估**：零样本/概率预测、多域时间序列基准与 TimeBench。
- **对前臂/腕部 sEMG 的结论**：连续分布预测可表达动作轨迹不确定性，适合连续运动；需设计面向 sEMG 的窗口和动作条件变量。
- **来源**：<https://arxiv.org/abs/2502.00816>

## Biosignal Fingerprinting / M2AE
- **会议/年份**：arXiv 预印本，2026。
- **模态/数据规模**：配对 ECG–PPG；超过 340 万对信号。
- **表示/Tokenizer**：多模态 Masked Autoencoder（M2AE）共享瓶颈产生跨模态 fingerprint；无离散 tokenizer。
- **骨干**：模态专用编码器 + 共享 latent bottleneck + 双解码器。
- **预训练目标**：重建损失 + 跨模态对比目标。
- **评估**：7 个下游任务，包括跨模态重建、疾病/高血压分类、死亡率预测和人口统计推断；预印本结果不视为定稿指标。
- **对前臂/腕部 sEMG 的结论**：共享瓶颈可启发 sEMG 与动作/惯性信号融合；医疗 fingerprint 的隐私与身份风险需在手势场景重新评估。
- **来源**：<https://arxiv.org/abs/2605.09579>

## A generic non-invasive neuromotor interface for human–computer interaction
- **会议/年份**：Nature，2025（645:702–711）。
- **模态/数据规模**：腕部 sEMG；大规模多参与者平台与在线手写/输入评估，具体样本规模以正文方法为准。
- **表示/Tokenizer**：连续 sEMG 解码表示；论文未提出离散 tokenizer。
- **骨干**：通用神经肌肉接口解码器（实时序列模型）。
- **预训练目标**：跨人通用训练与少量个体适配（非典型 foundation-model 预训练目标）。
- **评估**：手势/手写等 HCI 输入、跨参与者迁移与实时解码。
- **对前臂/腕部 sEMG 的结论**：这是最直接的目标域证据：腕部硬件、跨人泛化和在线 HCI 已验证；连续运动建模仍需更细粒度轨迹标签。
- **来源**：<https://www.nature.com/articles/s41586-025-09255-w>

## emg2pose：A Large and Diverse Benchmark for Surface Electromyographic Hand Pose Estimation
- **会议/年份**：NeurIPS 2024 Datasets and Benchmarks Track。
- **模态/数据规模**：2 kHz、16 通道腕部 sEMG + 动捕关节角；193 人、370 小时、29 stages、25,253 HDF5 文件。
- **表示/Tokenizer**：基线使用时序 sEMG 编码；无预训练 tokenizer。
- **骨干**：提供 vemg2pose、neuropose 等模型基线（数据集/benchmark 论文）。
- **预训练目标**：无 foundation-model 预训练；监督式手部姿态回归/追踪。
- **评估**：手部关节角姿态估计与 tracking/regression benchmark，含跨用户验证。
- **对前臂/腕部 sEMG 的结论**：为连续运动提供高质量同步标签和规模基准；适合用作 tokenizer/连续解码器的目标域预训练与评测。
- **来源**：<https://proceedings.neurips.cc/paper_files/paper/2024/file/64f8884f6ba3d9ace5bb647c4f917896-Paper-Datasets_and_Benchmarks_Track.pdf>

## emg2qwerty：A Large Dataset with Baselines for Touch Typing using Surface Electromyography
- **会议/年份**：NeurIPS 2024 Datasets and Benchmarks Track。
- **模态/数据规模**：双腕高分辨率 sEMG + QWERTY 键击真值；公开数据集，论文页面给出数据与基线，未在摘要统一总小时数。
- **表示/Tokenizer**：连续 sEMG 序列输入；以字符/按键序列为离散输出，不是通用 tokenizer。
- **骨干**：序列解码基线（论文/代码提供）。
- **预训练目标**：监督式键击/文本序列解码，无通用 SSL 预训练。
- **评估**：触键/连续打字识别，跨用户与基线比较。
- **对前臂/腕部 sEMG 的结论**：离散动作序列与双腕同步使其适合评估 gesture tokenizer；需补充非键击手势和连续关节轨迹任务。
- **来源**：<https://papers.neurips.cc/paper_files/paper/2024/file/a64d53074d011e49af1dfc72c332fe4b-Abstract-Datasets_and_Benchmarks_Track.html>

## Reading Your Actions: Learning Generalizable Action Representations via Pre-training AEMG
- **会议/年份**：CVPR 2026。
- **模态/数据规模**：跨设备 sEMG/EMG；论文称汇集大规模跨设备信号词汇，具体总量以正式 PDF/补充材料为准。
- **表示/Tokenizer**：Neuromuscular Contraction Tokenizer（NCT）：收缩片段为“词”、多通道时序为“句子”。
- **骨干**：自监督 EMG 表征模型/Transformer（AEMG）。
- **预训练目标**：基于 token 化 EMG 的自监督表示预训练。
- **评估**：跨主体、设备、任务的 zero-shot LOSO 与 few-shot 适配；官方摘要报告相对六个基线提升，但此处不新增未核验数字。
- **对前臂/腕部 sEMG 的结论**：与目标任务最贴合，直接验证跨设备通用表示；应重点复用 NCT，同时用 emg2pose 的连续轨迹标签检验连续运动迁移。
- **来源**：<https://openaccess.thecvf.com/content/CVPR2026/html/Huang_Reading_Your_Actions_Learning_Generalizable_Action_Representations_via_Pre-training_AEMG_CVPR_2026_paper.html>
