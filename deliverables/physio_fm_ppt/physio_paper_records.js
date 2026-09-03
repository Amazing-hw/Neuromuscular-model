// Cross-modal physiology extension. Canonical terms: ECG（心电图）, PSG（多导睡眠监测）, token（词元）, codebook（码本）.

const urls = {
  heartlang: ['https://openreview.net/forum?id=6Hz1Ko087B', 'https://proceedings.iclr.cc/paper_files/paper/2025/file/17aa70697d6cd35835f201c6fb0a2fd5-Paper-Conference.pdf'],
  ecg2tok: ['https://www.ijcai.org/proceedings/2025/1110', 'https://www.ijcai.org/proceedings/2025/1110.pdf'],
  sleepfm: ['https://www.nature.com/articles/s41591-025-04133-4', 'https://www.nature.com/articles/s41591-025-04133-4.pdf'],
  ecg_fm: ['https://pmc.ncbi.nlm.nih.gov/articles/PMC12530324/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12530324/pdf/ooaf122.pdf']
};

function sources(body, id) {
  return `${body}\n[Sources]\n- ${urls[id][0]}\n- ${urls[id][1]}\n[/Sources]`;
}

function autoNotes(record) {
  const s = record.slides;
  return {
    positioning: sources(`【研究定位】${s.positioning.visibleText} 讲解时要把“语言”理解为一个有可验证边界的表示假设：事件驱动的分段、跨通道/跨时间的组织以及可迁移预训练是三个不同层次。它不能自动证明 token 具有人类可解释性，也不能以单一临床分类分数代替跨队列、跨设备和低标注适配能力。`, record.id),
    overviewFigure: sources(`【核心图解读】${s.overviewFigure.visibleText} 图只应承担数据流和训练信号的证据角色。应沿输入、局部表示、离散或连续目标、上下文骨干及适配头的顺序讲述，并明确哪些部分停止梯度、哪些参数由 EMA 更新。若把图迁移到腕部或前臂 sEMG，需要把“生理事件”的定义和电极几何替换成可采集、可复现实验条件。`, record.id),
    mechanism: sources(`【方法与损失】${s.mechanism.visibleText} 预训练损失回答模型被鼓励保留什么信息：token 交叉熵偏向类别化结构，对比损失偏向配对不变性，掩蔽重建偏向波形细节。它们可联合但并不等价。实际报告应把输入长度、导联/模态数、采样率、增强和掩蔽单位写清，避免把医学信号的连续幅度、相位与个体差异在“语义”名义下不加检验地丢弃。`, record.id),
    evidence: sources(`【证据与边界】${s.evidence.visibleText} 结果要按论文的任务、数据来源和评估协议分别陈述；低资源、线性探测、全量微调与跨数据集结果不能互相替换。尤其是医学信号的来源医院、采集协议和标签构造可形成捷径，因此即使数字优于基线，也应询问训练/测试是否按患者分层、目标域是否真正未见，以及数据可得性是否支持独立复现。`, record.id),
    transfer: sources(`【对腕部/前臂 sEMG 的迁移判断】${s.transfer.visibleText} 可借鉴：把生理事件、跨通道关系或跨模态配对转化为明确的自监督约束，并用少样本和域外协议检验。 不应照搬：ECG 的心搏周期、12 导联胸肢体拓扑、PSG 的同步模态或临床诊断标签不能被假定等同于肌肉收缩、腕带圆环电极和连续手部运动。建议以离散手势 macro-F1 与连续关节/光标轨迹误差并列，并留出受试者、日期、腕带旋转、沿前臂位移和设备。`, record.id)
  };
}

const baseRecords = [
  {
    id: 'heartlang',
    title: 'HeartLang',
    fullTitle: 'Reading Your Heart: Learning ECG Words and Sentences via Pre-training ECG Language Model',
    venue: 'ICLR 2025',
    status: 'peer-reviewed',
    doi: null,
    source: urls.heartlang[0],
    pdfSource: urls.heartlang[1],
    figure: { figureNumber: 'Figure 2', pageNumber: 4, localPath: 'assets/papers/heartlang/figure-main.png', caption: 'HeartLang 将多导联 ECG 从 QRS 分段、词汇量化到掩蔽 ECG sentence 预测的完整流程。' },
    slides: {
      positioning: { title: 'HeartLang：把心搏当作词、把节律当作句子', bullets: ['固定窗口难以显式对齐心搏形态与节律结构', 'QRS-Tokenizer 用事件边界建立可变长度心搏单元', '预训练同时面向局部形态与全局节律表示'], flow: ['原始 ECG', 'QRS 事件', 'ECG words', 'ECG sentence', '下游适配'], visibleText: 'HeartLang 的研究问题是：常规固定步长 ECG patch 是否遗漏了心搏形态和跨搏节律的结构。论文将心搏视为“词”、将跨导联且按时间组织的心搏序列视为“句子”，先由 QRS-Tokenizer 检出 QRS index 与中点，再切出 individual ECG words。这个定位的价值不在于借用语言比喻，而在于让分段边界由生理事件而非任意窗口决定。随后模型可同时学习形态层面的词和节律层面的句。预训练数据为 MIMIC-IV-ECG 的 12 导联、10 秒、500 Hz 记录；下游在六个公开 ECG 数据集上评测。它是单模态 ECG 的事件驱动 tokenizer 路线，而非多模态报告对齐模型。' },
      overviewFigure: { title: 'Figure 2：QRS 词汇—句子 Transformer—掩蔽词预测', bullets: ['10 秒多导联信号先经 QRS-Tokenizer 切出 individual words', 'VQ-HBR 将个体词映射为 collective ECG word index', 'ST-ECGFormer 接收随机遮蔽的 ECG sentence 并预测词汇索引', '空间与时间 embedding 保留导联来源及跨心搏顺序'], flow: ['多导联片段', 'QRS-Tokenizer', 'VQ-HBR 码本', 'ST-ECGFormer', '预测索引'], visibleText: 'Figure 2 把两阶段流程连在一起：原始 10 秒多导联 ECG 先按 QRS 复合波定位形成 individual ECG words；VQ-HBR 通过向量量化把这些个体片段归到 collective ECG words，得到有限 ECG vocabulary。随后按时间和空间位置嵌入排列 ECG sentence，随机遮蔽部分 word，由 ST-ECGFormer 用可见上下文预测被遮蔽 word 的词汇索引。图中要强调：token 的离散化发生在 VQ-HBR 码本，Transformer 的输入仍包含连续 embedding、时间位置和导联位置；不能把每个 patch embedding 都称为离散 token。' },
      mechanism: { title: '机制：事件切分后再做 VQ 码本与 masked sentence 建模', bullets: ['QRS index 和邻近中点界定心搏片段', 'VQ-HBR 重建心搏并将编码向量量化为词汇项', 'ST-ECGFormer 融合 token、空间和时间嵌入', 'masked word 的交叉熵训练节律上下文'], flow: ['QRS 检测', '个体词编码', '量化/重建', '遮蔽句子', '词分类损失'], visibleText: '方法分为 tokenizer 训练与语言式预训练。QRS-Tokenizer 用检测到的 QRS 复合波及相邻中点把不同心率的记录切成事件对齐片段；VQ-HBR 以编码器、码本和解码器学习从 individual word 到 collective word 的量化与重建。ST-ECGFormer 再给每个 word 加 token embedding、空间导联 embedding 与时间 embedding，利用 Transformer 处理 sentence。预训练随机遮蔽 individual words，目标不是重建原始波形，而是预测对应 collective word index 的交叉熵。这将局部波形细节压缩为词汇级目标，但码本大小、死码和量化误差仍应在复现中审计。' },
      evidence: { title: '证据：六个公开 ECG 数据集上的迁移，而非临床部署证明', bullets: ['使用 MIMIC-IV-ECG 训练心搏词汇与预训练模型', '在六个公开 ECG 下游分类设置比较 eSSL 基线', '论文报告整体竞争力，结果需随具体任务和折分解读', '没有把跨医院前瞻部署作为主要证据'], flow: ['预训练语料', '公开下游集', '线性/微调', '基线比较', '边界审计'], visibleText: '论文在六个公开 ECG 下游任务上比较 HeartLang 与既有自监督方法，主张其心搏词—节律句的表征具有稳健竞争力。可信的证据链是“由 MIMIC-IV-ECG 的无标签记录学到事件驱动表示，再迁移至多个不同公开集合”，而不是某一个分类榜单。论文也明确与带临床文本监督的 MERL 不直接作结果比较，因为监督模态并不相同。限制包括：QRS 检测与分割质量会向后传播；词汇语义主要由量化和下游可视化支持；公开任务的标签空间不能证明对未见病种、未见设备或连续生理动态的开放泛化。' },
      transfer: { title: '迁移启示：用收缩事件定义 sEMG word，但保留连续支路', bullets: ['以肌肉收缩起止或变化点替代 QRS 事件', '腕带通道位置可取代 ECG 导联空间 embedding', '离散 token 应与连续 latent 并行而非单独使用', '以手势和连续运动并列验证 event tokenizer'], flow: ['sEMG 变化点', '收缩片段', '离散码本', '连续分支', '动作交互评测'], visibleText: 'HeartLang 对 sEMG 最直接的启发是“先定义可重复的生理事件，再学习可组合的词汇”，例如以多通道包络上升、收缩变化点或运动学对齐片段替代心搏 QRS 边界。可把腕带圆周电极坐标作为空间 embedding，把收缩发生时间作为时间 embedding，并用掩蔽 token 预测学习动作上下文。可借鉴：事件驱动切分、VQ 词汇与掩蔽句子预测。 不应照搬：心搏天然周期和 QRS 的高可检测性不等于肌肉收缩；低幅精细手指动作不应因阈值切分而消失。应同时保留连续 latent，用 emg2pose 式轨迹和手势任务检验离散化损失。' }
    }
  },
  {
    id: 'ecg2tok',
    title: 'ECG2TOK',
    fullTitle: 'ECG Pre-Training with Self-Distillation Semantic Tokenizers',
    venue: 'IJCAI 2025, AI and Social Good, pp. 9990-9998',
    status: 'peer-reviewed',
    doi: '10.24963/ijcai.2025/1110',
    source: urls.ecg2tok[0],
    pdfSource: urls.ecg2tok[1],
    figure: { figureNumber: 'Figure 2', pageNumber: 3, localPath: 'assets/papers/ecg2tok/figure-main.png', caption: 'ECG2TOK 以 EMA target encoder、在线聚类和 masked 离散标签预测构成自蒸馏 semantic tokenizer。' },
    slides: {
      positioning: { title: 'ECG2TOK：从连续高冗余波形抽取可预测的语义标签', bullets: ['重建目标可能过度拟合重复波形和个体形态', '难点在连续 ECG 没有天然离散语义单位', '自蒸馏特征加在线聚类生成伪标签并反哺 SSL'], flow: ['连续 ECG', '语义特征', '在线聚类', '离散标签', 'masked SSL'], visibleText: 'ECG2TOK 针对 ECG 自监督的一个具体判断：若只重建时频细节，模型可能保留重复波形和个体形态，却未必抽象出更高层临床相关结构；但连续 ECG 又没有天然词表，直接预测离散标签并不成立。论文因此提出 self-distillation semantic tokenizer：由 target encoder 输出语义特征、在线聚类生成 codebook centroid 与离散伪标签，再训练 masked ECG SSL 模型预测标签。其定位是用迭代式 tokenizer 把“离散预测”引入 ECG，而不是声称离散标签就是病理真值。论文在六个 ECG 下游分类任务和低资源设置中报告比较结果。' },
      overviewFigure: { title: 'Figure 2：EMA 教师、在线聚类与 masked label predictor 的闭环', bullets: ['context encoder 处理含遮蔽 patch 的输入并输出预测标签', 'target encoder 处理未遮蔽输入，参数由 EMA 更新', 'target 特征经无梯度在线聚类产生 centroid codebook', 'SSL 预测每个 patch 的 cluster index'], flow: ['12 导联 ECG', 'context encoder', 'EMA target', '在线聚类', '离散标签预测'], visibleText: 'Figure 2 的上半部分是 masked ECG SSL：10 秒多导联 ECG 被切为不重叠 patch，加入时间与空间嵌入，context encoder 仅利用未遮蔽 patch，Transformer predictor 输出每个位置的离散 label。下半部分是 semantic tokenizer：未遮蔽信号送入 target encoder，target 参数由 context encoder 的 EMA 更新；其高维特征进入在线聚类，centroid 构成 codebook，cluster index 作为上半部分目标。阴影模块不回传梯度，形成“学生提升表征—教师聚类更新标签”的迭代闭环。该图的核心是语义标签来源于 teacher feature clustering，而不是手工诊断或普通 VQ 重建。' },
      mechanism: { title: '机制：patch embedding + EMA teacher clustering + 离散 label loss', bullets: ['12 导联序列分为长度 p 的不重叠 patch', '线性投影叠加 temporal 与 spatial embedding', '75% 随机掩蔽，predictor 输出 patch label 分布', '教师特征在线聚类，cluster index 提供伪监督'], flow: ['patch 化', '空间/时间嵌入', '75% 遮蔽', 'Transformer predictor', 'cluster 交叉熵'], visibleText: 'ECG2TOK 将原始 I∈R^(L×12) 切成 T=L/p 个非重叠 patch，每个 patch 线性投影后加时间和空间位置嵌入。训练时论文遮蔽 75% patch，context encoder 在未遮蔽 patch 上产生表示，再由 Transformer label predictor 预测完整序列的离散标签。target encoder 维护为 context encoder 的指数滑动平均，读取未遮蔽 ECG 后输出的高维特征经 online clustering 量化为 cluster index；target 与 clustering 均不参与梯度回传。损失的关键是预测 pseudo-label 的分类目标，论文以此替换波形或时频重建；token 数、聚类稳定性、码本利用率和病人/设备可辨识性是必须补充的消融。' },
      evidence: { title: '证据：六任务与低资源增益，但须防止伪标签自强化', bullets: ['六个 ECG 下游分类任务评估表示迁移', '官方摘要报告低资源场景最高 30.73% AUC 增益', '离散标签可视化与临床特征关联提供定性证据', '结果不等于 codebook 已跨医院或跨设备验证'], flow: ['六项任务', '全量/低资源', 'AUC 比较', '标签可视化', '泛化边界'], visibleText: 'IJCAI 官方页面说明 ECG2TOK 在六个下游 ECG 分类任务上评估，并报告低资源场景最高 30.73% 的 AUC 提升；离散 label 的可视化显示其与临床特征存在一致语义关联。可以把这看作“自蒸馏聚类目标能在有限标签下提升分类适配”的证据，但不要把最高增益外推为所有任务的平均改善，也不要将可视化当作因果解释。方法的内在风险是 teacher、cluster 与 student 互相强化：若初始特征携带受试者、设备或采集协议捷径，稳定的伪标签也可能稳定地编码这些捷径。需要明确患者级切分、跨来源测试和 codebook 使用统计。' },
      transfer: { title: '迁移启示：让 sEMG tokenizer 受运动语义监督而非仅受能量驱动', bullets: ['EMA 教师与在线聚类可构建可更新的收缩码本', '空间 embedding 应编码腕带电极圆环与缺失通道', '聚类标签须对跨日、旋转和设备变化保持稳定', '联合连续轨迹辅助损失检验离散语义'], flow: ['多通道 sEMG', 'EMA encoder', '收缩聚类', 'masked token', '动作/轨迹适配'], visibleText: 'ECG2TOK 提供的可借鉴部分是“teacher feature—在线聚类—masked 离散预测”的自更新 tokenizer，可用于把多通道 sEMG 的收缩片段聚成可学习 codebook。腕带任务可在 patch embedding 外加入圆环电极几何、通道缺失标记和佩戴状态增强，并按跨日/旋转一致性约束 cluster。 不应照搬：ECG 的 12 导联空间布局、固定 10 秒片段与 75% 掩蔽率并非 sEMG 的默认设置；仅以高能量收缩聚类会遗漏低幅精细指动。建议把 cluster prediction 与连续关节角/速度预测、跨设备对比目标联合，并检查 token 对动作标签的互信息是否高于其对受试者和设备 ID 的互信息。' }
    }
  },
  {
    id: 'sleepfm',
    title: 'SleepFM',
    fullTitle: 'A multimodal sleep foundation model for disease prediction',
    venue: 'Nature Medicine 2026, 32:752–762',
    status: 'peer-reviewed',
    doi: '10.1038/s41591-025-04133-4',
    source: urls.sleepfm[0],
    pdfSource: urls.sleepfm[1],
    figure: { figureNumber: 'Figure 1', pageNumber: 4, localPath: 'assets/papers/sleepfm/figure-main.png', caption: '正式版 SleepFM：多中心 PSG、channel-agnostic pooling、5 分钟 temporal Transformer、LOO-CL 与多任务适配。' },
    slides: {
      positioning: { title: 'SleepFM：以多中心多模态 PSG 学习可迁移疾病风险表征', bullets: ['65,000+ 参与者、585,000+ 小时覆盖四个主要 cohort', '统一整合 BAS、ECG、EMG 与呼吸信号并适应不同通道配置', '从睡眠分期扩展到 1,041 个疾病 phenotype 与外部队列迁移'], flow: ['多中心 PSG', '通道无关编码', 'LOO-CL', '整夜表示', '疾病风险'], visibleText: 'Nature Medicine 正式版 SleepFM 面向真实多中心 PSG 的通道数、通道类型和采集环境差异。预训练整合 Stanford Sleep Clinic、BioSerenity、MESA 与 MrOS，覆盖 65,000 余名参与者和 585,000 余小时记录；独立 SHHS 的 6,441 名参与者完全排除在预训练之外，用于迁移验证。模型同时处理 BAS（EEG/EOG）、ECG、EMG 与呼吸，强调 channel-agnostic architecture 和 leave-one-out contrastive learning，而不是把通道强制映射到固定矩阵。贡献从常规睡眠分期进一步扩展到疾病风险预测，证明生理基座可以跨任务和跨中心复用。' },
      overviewFigure: { title: 'Figure 1：通道池化、5 分钟上下文、LOO-CL 与整夜适配', bullets: ['128 Hz 信号切成 5 秒基础 token，1D CNN 提取各通道特征', 'channel pooling transformer 在模态内聚合任意数量和顺序的通道', 'temporal transformer 建模 5 分钟上下文并产生模态 embedding', 'LOO-CL 令某一模态与其余模态组合表示对齐', '整夜 embedding 经 LSTM 与任务头完成分期、呼吸暂停和疾病预测'], flow: ['5 秒 token', '通道池化', '5 分钟 Transformer', 'LOO-CL', '整夜下游'], visibleText: '正式版 Figure 1 同时展示数据规模、预训练和微调。每个通道先由共享 1D CNN 形成 5 秒 token；channel pooling transformer 将同一模态中数量不定、顺序不定的通道聚合，从结构上适应不同 PSG 配置。随后 temporal transformer 在 5 分钟上下文中建模时间依赖，再经 pooling 得到 BAS、ECG、呼吸和 EMG 的模态 embedding。LOO-CL 不是简单两两对比，而是轮流把一个模态作为目标，与其余可用模态的组合表示对齐。下游使用冻结 embedding、两层 LSTM 和任务头汇聚整夜信息。图中 token 是连续 5 秒表示，没有离散 codebook。' },
      mechanism: { title: '机制：5 秒连续 token、通道无关池化与 leave-one-out CL', bullets: ['低通滤波后全部重采样到 128 Hz，并按 5 秒切片', '共享 1D CNN 编码单通道，通道池化注意力消除通道顺序依赖', 'temporal transformer 使用 5 分钟上下文形成模态级连续表示', 'LOO-CL 把每一模态与其余模态组合表示配成正对', '下游用冻结 embedding + 两层 LSTM，患者级任务再做时间池化'], flow: ['128 Hz/5 秒', '1D CNN', 'channel pooling', 'temporal context', 'LOO-CL'], visibleText: 'SleepFM 的 tokenizer 是确定性的 5 秒分段与连续 CNN embedding，不含 VQ 码本。通道无关池化是正式版相对早期工作的关键增强：同一模型可接受缺失通道、不同通道数量与顺序。LOO-CL 只要求知道信号属于哪种模态，不需要疾病标签；对于每个时刻，把一个模态表示与其它模态汇总后的表示拉近，并以非匹配样本构成负对，迫使 encoder 保留跨系统共享的睡眠状态。其风险是共同因素可能包含年龄、站点或记录质量，因此论文用时间切分和外部 SHHS 迁移缓解，但仍需在目标域做身份与设备审计。' },
      evidence: { title: '证据：正式版从睡眠任务扩展到疾病风险与外部迁移', bullets: ['预训练：65,000+ 参与者、585,000+ 小时、四个主要 cohort', '1,041 个疾病 phenotype 中，130 项 C-Index≥0.75 且 Bonferroni 显著', '死亡/痴呆/心梗/心衰 C-Index 分别约 0.84/0.85/0.81/0.80', 'SHHS 完全未参与预训练；分期 mean F1 0.70–0.78，呼吸暂停 accuracy 0.69/0.87'], flow: ['多中心预训练', '常规睡眠任务', 'PheWAS', '时间切分', 'SHHS 外部迁移'], visibleText: '正式论文的证据链远强于 2024 初稿：模型在 1,041 个疾病 phenotype 上评估，一晚 PSG 可对 130 个结局达到至少 0.75 的 C-Index并通过 Bonferroni 校正；示例包括全因死亡 0.84、痴呆 0.85、心肌梗死 0.81 与心衰 0.80。睡眠分期在多队列 mean F1 约 0.70–0.78，呼吸暂停严重度和是否存在的 accuracy 约 0.69 与 0.87。SHHS 未用于预训练仍保持迁移能力，另有时间外测试。但疾病关联并不等于因果，EHR 标签和人口学特征仍可能贡献捷径，模型也依赖整夜多模态记录。' },
      transfer: { title: '迁移启示：训练多模态、部署 sEMG-only、测试整模态缺失', bullets: ['sEMG、IMU、关节轨迹和视觉姿态可作为共享运动状态的多种观测', '通道池化适配电极掉线、不同通道数与腕带配置', 'LOO-CL 训练时轮流丢弃一种模态，验证单模态部署', '5 秒/5 分钟尺度不能照搬，高速交互需 20 ms–2 s 多尺度'], flow: ['sEMG/IMU/姿态', '几何通道池化', 'leave-one-modality-out', 'sEMG-only', '双任务评测'], visibleText: '对腕部/前臂 sEMG，SleepFM 最关键的借鉴是“训练期有特权模态，部署期可缺失”。可让 sEMG、IMU、关节角或视频姿态分别编码，再用 leave-one-modality-out 目标把 sEMG 对齐到其余运动学信息；训练中随机整模态 dropout，测试严格只输入 sEMG。channel-agnostic pooling 还可扩展为带圆周角和沿前臂位置的几何池化，适应掉通道或硬件变化。不能照搬 128 Hz、5 秒 token 和 5 分钟上下文；1 kHz 运动交互应在 20–50 ms、100–250 ms 与 0.5–2 s 三尺度上消融，并同时报告手势、连续轨迹与端到端时延。' }
    }
  },
  {
    id: 'ecg_fm',
    title: 'ECG-FM',
    fullTitle: 'ECG-FM: an open electrocardiogram foundation model',
    venue: 'JAMIA Open 2025, 8(5):ooaf122',
    status: 'peer-reviewed',
    doi: '10.1093/jamiaopen/ooaf122',
    source: urls.ecg_fm[0],
    pdfSource: urls.ecg_fm[1],
    figure: { figureNumber: 'Figure 2', pageNumber: 3, localPath: 'assets/papers/ecg_fm/figure-main.png', caption: 'ECG-FM 的共享 CNN—Transformer 架构，结合随机导联/潜表示遮蔽、局部量化对比和全局跨样本对比。' },
    slides: {
      positioning: { title: 'ECG-FM：开放权重的混合自监督 12 导联 ECG 基座', bullets: ['目标是降低任务特异 ECG 模型对昂贵标签的依赖', '以可变导联子集适配为设计目标之一', '开放模型、公开 benchmark 与透明评估构成定位的一部分'], flow: ['多来源 ECG', '混合 SSL', 'Transformer 表征', '多任务适配', '开放评测'], visibleText: 'ECG-FM 的研究定位是开放权重 ECG foundation model：用大量来自公开与机构来源的 12 导联记录做混合自监督预训练，再适配 ECG interpretation、低左室射血分数（LVEF）和异常肌钙蛋白等任务。正式论文发表于 JAMIA Open 2025，8(5):ooaf122，DOI 为 10.1093/jamiaopen/ooaf122，并由 PMC 提供正式开放全文与 PDF。论文的关键主张不仅是模型规模，而是把 ECG 特异增强、对比学习、连续信号掩蔽、可变导联适配、公开代码/权重和 benchmark 放进同一证据链。模型接受 5 秒 ECG 输入，并宣称可在标准 12 导联的任意子集上微调。' },
      overviewFigure: { title: 'Figure 2：共享 CNN—Transformer 与局部/全局两级对比预训练', bullets: ['随机导联遮蔽后的 raw waveform 进入共享 CNN 前端', 'latent span 进一步遮蔽并量化为 q，供局部对比目标', 'Transformer 产生 local representation，平均池化为 global representation', '时间相邻片段与 batch 内样本构成全局吸引/排斥关系'], flow: ['导联遮蔽', 'CNN latent', 'span masking/q', 'Transformer', '局部+全局对比'], visibleText: 'Figure 2 展示 ECG-FM 的数据流：多导联 raw waveform 先经随机 lead masking（RLM），共享 CNN 提取 latent representation；部分连续 latent span 以 m 遮蔽，并量化为 q。共享 Transformer 生成 local representation，平均池化为 global representation。局部损失让 q 与同位置 local representation 对齐，并以其它 q 作干扰项；全局 CMC 对比损失把时间相邻 ECG segment 作为正对、batch 内其它样本作为负对。图的贡献是把局部连续信号上下文与全局样本级时序一致性并置，而不是依赖一个单独的波形重建 decoder。' },
      mechanism: { title: '机制：ECG 特异增强 + local contrastive + global CMC + masked signal', bullets: ['5 秒 ECG 可随机遮蔽单个导联以模拟缺失输入', 'CNN 前端与 Transformer 共享跨导联、跨时间特征', 'quantized latent q 对齐对应 local context 表示', '时间邻近片段的全局表示形成正对，批内样本提供负对'], flow: ['5 秒 ECG', 'RLM', 'CNN', 'Transformer/池化', '双层对比'], visibleText: 'ECG-FM 使用 transformer-based 编码器，并以 ECG 特异的增强与连续信号 masking 进行混合自监督。正式论文的方法描述将随机导联遮蔽作为输入层扰动：CNN 产生 latent，latent span 被遮蔽并量化为 q；Transformer 根据上下文形成 local representation，通过局部 contrastive objective 识别对应 q。与此同时，对时间相邻 segment 的 pooled global representation 施加 CMC 全局对比。该组合鼓励模型同时保留局部波形上下文和更长范围的样本状态。必须区分这里的 q 是损失所用量化 latent，论文不是把原始 ECG 预先转写为固定语言 token 序列；不同导联、采样与输入时长的实际适配仍需实验验证。' },
      evidence: { title: '证据：小—中等标签规模、跨数据集与可解释性分析', bullets: ['正式论文：约 1.5 million 12 导联 ECG 用于预训练', '下游包含 interpretation、LVEF 与异常 cTn', '正式摘要报告房颤 AUROC 0.996、LVEF≤40% AUROC 0.929', '作者指出大任务特异数据集下增益可能趋于平台'], flow: ['1.5M 预训练', '线性/全量微调', '多类临床任务', '跨数据集', '规模边界'], visibleText: 'JAMIA Open 正式摘要写明该工作在约 1.5 million 12 导联 ECG 上预训练，并评估多标签 ECG interpretation、LVEF 与异常 cardiac troponin；其报告的示例高 AUROC 包括 atrial fibrillation 0.996 与 LVEF≤40% 0.929。文章还做数据规模、latent space 和 attention-based saliency 分析，并强调在小到中等标签规模时优于强任务特异 baseline；但在约 100,000 训练样本、某些 interpretation 任务上，Full 模型和 baseline 可趋向相近平台。这是重要边界：预训练价值依赖目标数据规模与域差，而非任何规模下必然获胜。UHN 私有数据不可公开也限制了完全独立复现。' },
      transfer: { title: '迁移启示：将 sEMG 的跨佩戴鲁棒性纳入混合 SSL，而非只模拟缺道', bullets: ['随机通道遮蔽可模拟部分电极掉线', '局部 masked contrastive 与全局相邻窗口对比可并行', 'sEMG 需额外建模旋转、位移、阻抗和动作阶段', '评估要比较冻结、少样本和全量微调而非只报最佳分数'], flow: ['多通道 sEMG', '电极扰动增强', '局部连续目标', '全局动作上下文', '域外适配'], visibleText: 'ECG-FM 对腕部/前臂 sEMG 的可迁移价值是双层预训练思路：用局部掩蔽对比恢复短时肌肉形态，同时用相邻动作窗口的全局对比学习较慢的动作状态；随机通道遮蔽还可作为电极掉线基线。可借鉴：共享局部前端与上下文骨干、局部/全局目标并行、冻结线性探测到全量微调的系统评估。 不应照搬：ECG 的 12 导联缺失不等于腕带旋转、沿前臂位移或皮肤阻抗变化，时间相邻也不总代表相同手势阶段。应加入物理佩戴增强、动作边界采样和连续轨迹辅助头，并分别报告跨人、跨日、跨设备、旋转与位移条件。' }
    }
  }
];

const enrichments = {
  heartlang: {
    loss:'VQ-HBR 先以多导联心搏重建学习集合式 ECG 词汇；ST-ECGFormer 再对随机遮蔽的心搏位置做 codebook index 交叉熵预测，同时保留时空嵌入。',
    datasets:['MIMIC-IV-ECG 12 导联、10 秒、500 Hz 记录用于预训练','六个跨数据集下游涵盖诊断、年龄/性别与临床属性'],
    metrics:['低资源线性探测和微调报告 AUROC/AUPRC 等任务指标','与监督、重建和其它 ECG 预训练基线比较'],
    ablations:['比较 QRS 对齐词、固定切片及词汇量/掩蔽比例','检查 form-level 重建与 rhythm-level masked modeling 的互补'],
    limits:['依赖可靠 QRS 检测；异常心律会改变分词质量','心搏词不等同于肌肉收缩原语，跨设备仍需验证'],
    innovations:['QRS 事件驱动 tokenizer 代替固定时间切片','form-level VQ-HBR 与 rhythm-level masked modeling 分层'],
    borrow:['以爆发起点/包络峰值辅助 sEMG 事件切分','局部形态码本与长程动作上下文分层预训练'],
    avoid:['不要假设每个动作都有 ECG 式稳定周期','不要把 token 可视化直接解释为单一肌肉生理单位'],
    experiments:['E1：固定 20–50 ms patch 对比爆发事件对齐 tokenizer','E2：连续重建、VQ 重建、masked token 与联合目标消融','E3：codebook 大小与事件检测误差对双任务的影响','E4：跨人/跨日/旋转条件下 token 稳定和身份泄漏审计']
  },
  ecg2tok: {
    loss:'EMA target encoder 在完整 ECG 上产生连续特征，在线 clustering 更新 centroid codebook；context encoder 接收遮蔽 patch，并以交叉熵预测 cluster index。',
    datasets:['多来源 12 导联 ECG 预训练，10 秒记录切为时空 patch','六项下游任务覆盖疾病与个体属性'],
    metrics:['正式摘要报告低资源设置 AUC 最高提升 30.73%','比较线性探测、低比例标签与全量适配'],
    ablations:['EMA teacher、在线 clustering、空间嵌入和 mask ratio 的作用','检查不同 cluster 数量与低资源标签比例'],
    limits:['在线 cluster 可能跟随设备、站点或主体捷径','75% mask 与固定 12 导联几何不可直接搬到 sEMG'],
    innovations:['自蒸馏连续 teacher 与在线语义 codebook 联动','同时建模 ECG patch 的空间导联与时间位置'],
    borrow:['EMA teacher 生成收缩特征，在线聚类形成可更新 motif','在 token 中加入腕带圆周角和缺失通道标记'],
    avoid:['不要让聚类仅按幅度或受试者分组','不要把 ECG 固定导联拓扑视为腕带通道顺序'],
    experiments:['E1：离线 k-means、在线 clustering、learned VQ 三类 tokenizer','E2：mask 25/50/75% 与 token 尺度联合消融','E3：动作互信息对比身份/设备互信息的表示审计','E4：cluster prediction 联合关节角/速度连续目标']
  },
  sleepfm: {
    loss:'LOO-CL 轮流把一个模态表示作为目标，与其它可用模态汇总后的表示构成正对，并以非匹配时间/个体样本作负对；没有离散 codebook。',
    datasets:['SSC、BioSerenity、MESA、MrOS：65,000+ 人、585,000+ 小时 PSG','SHHS 6,441 人完全排除在预训练之外，用于独立迁移'],
    metrics:['1,041 个 phenotype 中 130 项 C-Index≥0.75 且 Bonferroni 显著','睡眠分期 mean F1 0.70–0.78；呼吸暂停准确率 0.69/0.87'],
    ablations:['比较 LOO-CL 与普通 pairwise 跨模态对比','多源预训练和不同数据比例显示稳定 scaling 与迁移收益'],
    limits:['疾病预测是风险关联而非因果机制','整夜临床 PSG 和 EHR 资源与腕带运动交互差异巨大'],
    innovations:['channel-agnostic pooling 接受不同通道数与顺序','leave-one-modality-out 让共享表示适应模态缺失'],
    borrow:['sEMG/IMU/关节角/视频姿态多模态预训练','训练时整模态 dropout，部署时严格 sEMG-only'],
    avoid:['不要照搬 128 Hz、5 秒 token 或 5 分钟上下文','不要把同步配对等同于无时延的同义信号'],
    experiments:['E1：pairwise、LOO-CL、teacher distillation 三种多模态目标','E2：训练辅助模态 dropout 0/25/50/100%，测试 sEMG-only','E3：0/30/60/100 ms 对齐偏移，估计电机械延迟','E4：手势与连续轨迹在跨人/跨日/旋转/设备下联合评测']
  },
  ecg_fm: {
    loss:'WCR 混合目标同时包含 wav2vec 2.0 式局部量化 latent 对比、时间相邻片段的 CMSC 全局对比，以及随机导联遮蔽增强。',
    datasets:['PhysioNet 2021 与 MIMIC-IV-ECG 公开数据用于约 1.4M segment 预训练','UHN-ECG 作为未参与预训练的机构队列评估泛化'],
    metrics:['房颤 AUROC 0.996、LVEF≤40% AUROC 0.929','线性探测与小—中等标签规模显示较强数据效率'],
    ablations:['正式工作报告 1%/10%/50%/100% 下游数据 scaling','原 WCR 组件消融来自所继承方法，本文未重新完整消融'],
    limits:['足够大任务标注时，预训练与强专用 baseline 可趋近','UHN 私有数据限制完全独立复现，邻近窗口也可能标签错配'],
    innovations:['局部 masked contrastive 与全局相邻片段对比组合','随机导联遮蔽提升不同输入导联子集的适配性'],
    borrow:['局部肌电形态目标与较慢动作状态全局目标并行','通道掉线增强作为腕带鲁棒性基线'],
    avoid:['不要把时间相邻 sEMG 窗口一律当作同动作正对','不要用缺通道模拟替代真实旋转、位移与阻抗变化'],
    experiments:['E1：局部目标、全局目标、二者联合与随机导联遮蔽消融','E2：动作边界感知正对对比纯时间相邻正对','E3：线性探测、1/5/20 分钟少样本与全量微调曲线','E4：跨设备/跨日/旋转/位移与低 SNR 压力测试']
  }
};

const physioPaperRecords = baseRecords.map((record) => {
  const e = enrichments[record.id];
  record.slides.positioning.sections = record.slides.positioning.bullets;
  record.slides.overviewFigure.numberedExplanations = record.slides.overviewFigure.bullets;
  record.slides.mechanism.modules = record.slides.mechanism.flow;
  record.slides.mechanism.lossExplanation = e.loss;
  Object.assign(record.slides.evidence, {
    datasets:e.datasets, metrics:e.metrics, ablations:e.ablations, limits:e.limits
  });
  Object.assign(record.slides.transfer, {
    innovations:e.innovations, borrow:e.borrow, avoid:e.avoid, experiments:e.experiments
  });
  return { ...record, notes:autoNotes(record) };
});

module.exports = { physioPaperRecords };
