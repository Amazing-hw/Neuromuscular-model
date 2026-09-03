// Source-grounded five-slide records for speech/audio foundation-model references.
// Canonical terminology: tokenizer is the complete mapping; token is one sequence
// unit; codebook（码本） is used only for a finite discrete inventory.

const U = {
  wav2vec2:[
    'https://proceedings.neurips.cc/paper_files/paper/2020/hash/92d1e1eb1cd6f9fba3227870bb6d7f07-Abstract.html',
    'https://proceedings.neurips.cc/paper_files/paper/2020/file/92d1e1eb1cd6f9fba3227870bb6d7f07-Paper.pdf'
  ],
  data2vec:[
    'https://proceedings.mlr.press/v162/baevski22a.html',
    'https://proceedings.mlr.press/v162/baevski22a/baevski22a.pdf'
  ],
  best_rq:[
    'https://proceedings.mlr.press/v162/chiu22a.html',
    'https://proceedings.mlr.press/v162/chiu22a/chiu22a.pdf'
  ],
  beats:[
    'https://proceedings.mlr.press/v202/chen23ag.html',
    'https://proceedings.mlr.press/v202/chen23ag/chen23ag.pdf'
  ]
};

function note(body, id) {
  return body + '\n[Sources]\n- ' + U[id][0] + '\n- ' + U[id][1] + '\n[/Sources]';
}

function autoNotes(p) {
  const s = p.slides;
  return {
    positioning: note('【研究问题与定位】' + s.positioning.visibleText + ' 论文把核心瓶颈概括为：' + s.positioning.sections.join('；') + '。讲解时必须区分“输入如何形成序列单位”“自监督目标预测什么”“下游如何评测”三层，不要因为都使用 Transformer 就把方法视为同类。迁移到 1 kHz 腕部或前臂 sEMG 时，语音的发音内容、说话人和声道不能直接等同于动作、受试者和佩戴条件；可迁移的是优化机制与证据结构。应同时询问该方法是否保留瞬时幅值、频带、跨通道协同和动作阶段，以及它在 held-out subject、day、rotation、displacement、device 条件下是否仍然有效。', p.id),
    overviewFigure: note('【原图逐项解读】' + s.overviewFigure.visibleText + ' 图的数据流依次为：' + s.overviewFigure.numberedExplanations.join('；') + '。本页特别强调 tokenizer、token 与 codebook（码本）的边界：连续卷积帧也可作为 token，但只有有限原型集合及其索引才构成离散 codebook。读图时还要指出目标分支是否接收未遮蔽输入、是否更新梯度，以及正样本或伪标签如何生成。对 sEMG 的迁移不能只照搬采样率或遮蔽长度，而应把时间尺度换算为肌电爆发、动作边界和电机械延迟，并用连续运动学保真度检查压缩是否过强。', p.id),
    mechanism: note('【机制、目标与优化】' + s.mechanism.visibleText + ' 主要模块包括：' + s.mechanism.modules.join('；') + '。核心训练信号是：' + s.mechanism.lossExplanation + '。这四篇工作分别代表学习型向量量化、EMA 教师连续潜变量、冻结随机量化和迭代语义 tokenizer，不能统称为“掩码重建”。报告时应说明目标是否连续、是否离散、是否依赖负样本、codebook 是否学习，以及防止坍塌或死码的机制。迁移实验应固定数据、骨干、训练步数和下游头，单独改变目标生成方式，否则无法判断收益来自 tokenizer 还是模型规模。', p.id),
    evidence: note('【实验、消融与结论边界】' + s.evidence.visibleText + ' 数据与协议包括：' + s.evidence.datasets.join('；') + '。主要指标或结论为：' + s.evidence.metrics.join('；') + '。关键消融为：' + s.evidence.ablations.join('；') + '。限制包括：' + s.evidence.limits.join('；') + '。语音或音频结果只能证明该机制在其数据分布和任务上有效，不能直接证明对多通道 sEMG 的跨人泛化。目标域必须补充离散手势 macro-F1、连续角度或速度 MAE/相关、事件时延、误触与端侧代价，并严格隔离受试者和佩戴会话；随机切窗会把相邻重叠片段泄漏到测试集。', p.id),
    transfer: note('【对 1 kHz sEMG 的可执行迁移】' + s.transfer.visibleText + ' 论文创新可概括为：' + s.transfer.innovations.join('；') + '。建议保留：' + s.transfer.borrow.join('；') + '。需要避免：' + s.transfer.avoid.join('；') + '。优先实验为：' + s.transfer.experiments.join('；') + '。共同原则是先建立连续多尺度基线，再把离散分支视为可证伪的瓶颈。所有对比使用同一个 encoder 容量和轻量任务头，并同时报告手势与连续运动；若离散目标提高分类却损害轨迹细节，应将其保留为辅助支路，而不是替代主干连续表示。', p.id)
  };
}

const baseRecords = [
  {
    id:'wav2vec2', title:'wav2vec 2.0', fullTitle:'wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations',
    venue:'NeurIPS 2020', status:'peer-reviewed', source:U.wav2vec2[0], pdfSource:U.wav2vec2[1],
    slides:{
      positioning:{
        title:'wav2vec 2.0：连续上下文与学习型离散目标协同训练',
        sections:['原始语音先经卷积形成高频局部连续潜序列','遮蔽潜位置后由 Transformer 聚合上下文','Gumbel product quantization 在线学习离散目标并用对比损失识别'],
        visibleText:'wav2vec 2.0 将原始语音的局部编码、上下文建模和离散目标学习放进一个端到端系统。七层卷积把 16 kHz 波形压到约 49 Hz，每个位置仍是连续 latent；Transformer 只接收带跨度遮蔽的序列。另一条未遮蔽分支把同一 latent 送入 Gumbel product quantizer，从多个可学习 codebook 中选取离散条目，形成对比学习正目标。它证明大量无标注波形能显著降低语音转写标注需求。对 sEMG 的价值不是复制语音词汇，而是测试“连续主干 + 可学习离散目标”能否兼顾动作原语与连续运动细节。'
      },
      overviewFigure:{
        title:'Figure 1：卷积连续 latent、遮蔽上下文与量化目标',
        numberedExplanations:['① 原始 waveform 经多层 CNN 形成连续潜表示 z，前端在约 25 ms 感受野上每 20 ms 输出一帧。','② 送入 Transformer 的 z 在时间轴按连续跨度替换为同一个可学习 mask embedding。','③ 未遮蔽 z 同时进入 product quantizer；G 个 codebook 各选一个条目并拼接为 q。','④ 上下文表示 c_t 必须从正确 q_t 与同一语句其他遮蔽位置的 K 个 distractor 中辨认目标。','⑤ codebook diversity loss 最大化平均选择熵，避免少数离散条目垄断。'],
        visibleText:'图中有三类对象：z 是连续卷积 token，c 是上下文化连续表示，q 才是由有限 codebook 组合出的量化目标。遮蔽只作用于进入上下文网络的 z，不遮挡量化目标分支，因此模型无法直接复制当前位置，却仍能从完整局部信号构造监督。正负候选来自同一句语音的其他遮蔽位置，减少跨录音环境捷径，但也可能把相邻相似状态当成负样本。映射到 sEMG 时，应把 product codebook 当作可选收缩 motif 字典，同时保留连续 c 供关节角和速度回归。'
      },
      mechanism:{
        title:'机制：学习型 product codebook + 掩蔽位置对比分类',
        modules:['输入：16 kHz 波形零均值单位方差归一化','局部 tokenizer：7 层 Conv1D，总步幅 320，输出约 49 Hz 连续 z','上下文：相对位置卷积 + Transformer，跨度 mask 起点概率 0.065、长度 10','目标：Gumbel-Softmax product quantization 从多组可学习 codebook 产生 q','损失：InfoNCE 识别正确 q，加 codebook diversity 约束；微调用 CTC'],
        lossExplanation:'总目标 L=L_m+αL_d。L_m 在每个遮蔽位置比较 c_t 与正确量化 q_t 的余弦相似度，并压低 K 个同语句 distractor；L_d 鼓励各组 codebook 条目均衡使用。它不是波形均方重建。',
        visibleText:'wav2vec 2.0 的关键是目标与上下文共同学习，而非先离线聚类再训练。product quantization 将多个较小 codebook 的选择拼接，组合容量很大；Gumbel-Softmax 让硬选择在反向传播中可训练。论文常用两组、每组 320 个条目，并通过温度退火与多样性项控制利用率。对 1 kHz sEMG，局部前端不应照抄 320 倍步幅；可先测试 20–50 ms token，再比较 256/1,024/4,096 等有效词表容量，并报告 perplexity、死码、量化误差和连续任务退化。'
      },
      evidence:{
        title:'证据：低标注 ASR 大幅受益，量化与多样性均有贡献',
        datasets:['无标注预训练：LibriSpeech 960 h 或 LibriVox 约 53.2k h','微调：Libri-light 10 min/1 h/10 h、LibriSpeech 100 h/960 h；另测 TIMIT 音素'],
        metrics:['完整 960 h 标注时 test clean/other WER 1.8/3.3','仅 10 min 标注、53k h 无标注时 WER 4.8/8.2','相同标注预算下，大规模无标注预训练持续降低 WER'],
        ablations:['量化目标优于直接使用非量化连续目标','移除 diversity loss 或改变负样本数量会影响 codebook 使用与识别','比较模型规模、无标注数据量、遮蔽概率和跨度'],
        limits:['语音音素具有离散组合性，sEMG 连续力度与速度未必适合强量化','同语句负样本可能制造伪负对；大规模模型与数据成本较高'],
        visibleText:'论文的强证据来自统一 ASR 协议下的标注效率：无标注数据扩大后，10 分钟或 1 小时标注也能得到可用 WER，并在全标注设置达到很强结果。消融显示学习型量化和 codebook 多样性不是装饰；但收益与语音的离散音素结构、CTC 和语言模型共同相关。对 sEMG 不能把 WER 数字当作可迁移性能，应复刻证据逻辑：固定人群和标注预算，比较连续目标、量化目标及联合目标，并同时观察手势、连续运动和跨佩戴泛化。'
      },
      transfer:{
        title:'迁移：把 codebook 作为动作原语辅助支路，而非唯一表示',
        innovations:['连续上下文网络与学习型离散目标端到端联合','product codebook 提供可组合离散容量','多样性损失显式监控词表利用'],
        borrow:['短卷积生成连续 sEMG token，遮蔽后预测量化 contraction motif','共享 encoder 同时接手势分类、连续运动回归和交互序列头'],
        avoid:['不要直接采用语音的 20 ms 帧率和 299 ms 平均 mask，先按运动边界消融','不要只以 codebook perplexity 判断好坏，必须检查运动学信息损失'],
        experiments:['E1：连续 latent 对比、学习型 VQ、连续+VQ 联合三种目标，同骨干同训练量','E2：codebook 256/1,024/4,096 与 product groups 1/2/4，报告死码和量化误差','E3：20/50/100 ms token 与 50/100/250 ms mask，联合优化双任务','E4：held-out subject/day/rotation/device 与掉通道测试，检查离散目标是否更稳'],
        visibleText:'推荐把 wav2vec 2.0 变成“连续主路、离散辅助路”的强基线：原始多通道 sEMG 先形成不丢幅值的连续 token，遮蔽上下文预测可学习 motif code，再让共享 latent 同时服务离散手势和连续关节轨迹。若 VQ 只改善手势而持续恶化角度、速度或相位延迟，就不应升级为唯一 tokenizer。最有发表价值的结果不是复现语音架构，而是解释 codebook 容量、腕带几何和真实域偏移如何共同决定离散化何时有效。'
      }
    }
  },
  {
    id:'data2vec', title:'data2vec', fullTitle:'data2vec: A General Framework for Self-supervised Learning in Speech, Vision and Language',
    venue:'ICML 2022', status:'peer-reviewed', source:U.data2vec[0], pdfSource:U.data2vec[1],
    slides:{
      positioning:{
        title:'data2vec：用完整输入教师的上下文化 latent 统一多模态自监督',
        sections:['同一 Transformer 同时以 student 与 EMA teacher 两种模式运行','student 看遮蔽输入，teacher 看完整输入并产生连续上下文化目标','不依赖人工词表、离线聚类或负样本，可跨语音、视觉和文本复用'],
        visibleText:'data2vec 试图把不同模态的自监督目标统一为“预测教师网络对完整输入的上下文化表示”。学生接收遮蔽视图，教师接收未遮蔽视图；教师权重是学生参数的指数移动平均。目标不是原始像素、声学帧或离散词，而是教师顶部多层经过归一化后平均得到的连续 latent，因此每个位置的监督已包含全局上下文。论文在语音、视觉与文本采用相同学习原则并获得竞争性结果。对 sEMG，这是最值得优先验证的路线：不先假设动作原语词表，让连续教师目标同时保留局部肌电与长程运动状态。'
      },
      overviewFigure:{
        title:'Figure 1：完整输入 EMA teacher 指导遮蔽 student',
        numberedExplanations:['① 图像、语音和文本先各自形成模态特定 token，后续学习流程保持相同。','② teacher-mode 接收完整输入，输出顶部 K 层的上下文化表示。','③ student-mode 接收带块状或跨度遮蔽的同一样本，只在遮蔽位置预测目标。','④ teacher 参数不反向传播，而由 student 参数的 EMA 持续更新。','⑤ 目标是多层归一化后平均的连续向量，不含有限 codebook，也不需要对比负样本。'],
        visibleText:'原图最重要的信息是同一个模型有两种参数状态和两种可见性。teacher 看完整样本，因而目标融合了被遮蔽区域与全局上下文；student 只能从剩余信息回归这些目标。语音分支仍可使用 wav2vec 2.0 式卷积前端，但量化模块被移除。EMA 让目标缓慢演化，多层平均减少只追逐最后一层任务偏好的风险。映射到 sEMG 时，可让 teacher 接收完整多通道窗口，student 接收时间 span、通道掉线和物理旋转扰动，直接检验表示是否能恢复运动语义。'
      },
      mechanism:{
        title:'机制：多层归一化教师目标 + 遮蔽位置连续回归',
        modules:['输入编码：语音用卷积局部特征，视觉用 patch，文本用词嵌入','学生：遮蔽部分 token 后通过标准 Transformer 预测','教师：完整输入前向，权重由学生 EMA 更新且 stop-gradient','目标：教师顶部 K 层表示分别归一化后求平均','损失：遮蔽位置 Smooth L1 或 L2 回归，不使用负样本与 codebook'],
        lossExplanation:'学生在遮蔽位置回归 y_t，即 teacher 顶部 K 层的归一化上下文化表示平均。教师只通过 EMA 更新；归一化、慢更新和多层目标共同抑制表示坍塌。',
        visibleText:'data2vec 的方法贡献在目标构造而非新 backbone。语音设置中，教师顶部多层先做样本内归一化再平均，学生仅在被遮蔽位置回归；EMA 系数从较低值逐步升高，使目标既跟随学习又足够稳定。与 wav2vec 2.0 相比，它没有 codebook、diversity loss 和同语句负样本，因此更适合连续状态。对 sEMG 可进一步把 teacher 设计为训练期多模态：完整 sEMG、IMU 或关节角共同形成运动 latent，student 仍只看受扰动 sEMG，实现 privileged-information distillation。'
      },
      evidence:{
        title:'证据：统一连续目标在三模态成立，低标注语音收益明显',
        datasets:['语音：LibriSpeech 960 h 预训练，10 min 至 960 h 标注微调','音频：AudioSet 自监督并在 20K 子集微调','视觉：ImageNet-1K；文本：BooksCorpus/Wikipedia'],
        metrics:['语音 Libri-light 多数标注规模优于或匹配 wav2vec 2.0、HuBERT','AudioSet 预训练后 20K 子集 mAP 34.5','视觉和 GLUE 获得当时竞争性或新的单模型结果'],
        ablations:['多层教师目标优于只预测顶层，完整输入教师优于遮蔽教师','目标归一化与 EMA 计划对稳定性关键','论文比较离散局部目标与上下文化连续目标'],
        limits:['每个样本需 teacher 与 student 两次前向，计算和显存成本增加','EMA teacher 可能保留主体或设备捷径；跨模态统一不等于输入统计相同'],
        visibleText:'论文的核心证据不是某一个排行榜，而是相同目标原则横跨语音、视觉和语言仍有效；语音低标注场景的提升尤其支持“离散单位不是必需条件”。消融显示目标必须来自未遮蔽完整输入，多层与归一化设计影响稳定性。边界同样明确：双前向增加训练成本，教师也可能把录音环境或说话人编码成捷径。对 sEMG 必须增加身份/设备线性探测、跨日与跨腕带测试，确认 student 恢复的是运动 latent 而不是受试者纹理。'
      },
      transfer:{
        title:'迁移：以 data2vec 作为 sEMG 连续预训练主方案',
        innovations:['完整输入教师构造上下文化连续目标','EMA 自蒸馏避免离散词表和负样本设计','顶部多层平均让目标兼顾局部与高层语义'],
        borrow:['teacher 看完整 sEMG，student 接受时间遮蔽、通道掉线与物理旋转','训练期可让运动学/IMU teacher 提供方向，部署保持 sEMG-only'],
        avoid:['不要让测试受试者无标签数据进入 teacher 预训练','不要只用随机噪声增强；扰动必须对应真实佩戴或传感器失效'],
        experiments:['E1：raw/envelope 重建、data2vec latent、二者联合，比较双任务与跨域','E2：teacher 顶部 K=1/4/8/12 层及 EMA 计划消融，测稳定与计算成本','E3：sEMG-only teacher 对比 sEMG+IMU/运动学 teacher，测试严格 sEMG-only','E4：subject/device probe、跨日旋转和掉通道压力测试，审计捷径'],
        visibleText:'在目标场景中，data2vec 应成为第一优先主线：连续多尺度 tokenizer 后，teacher 接收完整 1 kHz 多通道 sEMG，student 只看结构化遮蔽视图，回归多层运动 latent。第二阶段再加入同步 IMU 或关节角 teacher，但测试端完全移除辅助模态。这个方案天然兼顾连续轨迹，离散手势则通过轻量分类头验证。如果它在同等训练量下同时提高 macro-F1、轨迹 MAE/相关和跨佩戴稳定性，就建立了比“先做 codebook”更强的基座证据。'
      }
    }
  },
  {
    id:'best_rq', title:'BEST-RQ', fullTitle:'Self-supervised Learning with Random-projection Quantizer for Speech Recognition',
    venue:'ICML 2022', status:'peer-reviewed', source:U.best_rq[0], pdfSource:U.best_rq[1],
    slides:{
      positioning:{
        title:'BEST-RQ：冻结随机投影与随机码本也能提供有效离散监督',
        sections:['输入声学帧经随机矩阵投影后做最近邻 codebook 查询','投影矩阵和 codebook 从初始化起完全冻结，与 ASR encoder 解耦','遮蔽模型预测随机量化标签，简化端到端量化和教师迭代'],
        visibleText:'BEST-RQ 提出一个反直觉结论：自监督离散标签不一定要由昂贵聚类、VQ-VAE 或共同训练的量化器获得。声学输入先经固定随机矩阵投影并做 L2 归一化，再到固定随机 codebook 中找最近邻，得到离散索引；这条标签支路从不更新。ASR encoder 接收被遮蔽输入，通过交叉熵预测对应索引。论文在流式与非流式 Conformer、LibriSpeech 和多语种任务上显示这种简单目标可达到或超过更复杂方法。对 sEMG，它是检验“离散监督本身是否有用”的低成本对照，而不是默认最佳 tokenizer。'
      },
      overviewFigure:{
        title:'Figure 1：固定随机标签器与可学习遮蔽编码器完全解耦',
        numberedExplanations:['① 未遮蔽声学特征送入随机初始化且冻结的线性 projection。','② 投影向量与随机初始化且冻结的 codebook 条目均做 L2 归一化。','③ 最近邻查找输出一个离散 index，作为每个时间位置的伪标签。','④ 可学习 ASR encoder 接收按连续时间块遮蔽的声学输入。','⑤ 预测头仅在遮蔽位置分类到随机 codebook index；标签器不接收梯度。'],
        visibleText:'图中绿色 ASR encoder 才是被预训练的模型；右侧 projection 与 codebook 只是固定标签生成器。这里确实存在固定 codebook，但“固定”来自随机初始化后冻结，不代表每个 tokenizer 都有固定码本。随机标签仍保留局部相似性，因为投影与最近邻近似保持输入几何；模型不能依靠复制遮蔽帧，只能利用上下文预测。对 sEMG 可直接用时域、包络或短时频谱 patch 生成随机标签，快速测试离散分类目标是否比连续重建更稳定。'
      },
      mechanism:{
        title:'机制：random projection + frozen codebook + masked classification',
        modules:['输入：声学特征可堆叠相邻帧，标签器与模型接收同源未遮蔽/遮蔽视图','固定 tokenizer：随机 projection 后 L2 normalize','固定 codebook：随机向量 L2 normalize，最近邻产生 index','骨干：流式或非流式 Conformer encoder，mask 长度约 300–400 ms','目标：遮蔽位置对 codebook index 做交叉熵；下游接 RNN-T'],
        lossExplanation:'预训练损失是随机量化标签的交叉熵。标签器参数始终冻结，没有 commitment、codebook 更新、EMA teacher 或对比负样本；优化只发生在 encoder 与预测头。',
        visibleText:'BEST-RQ 将目标质量问题转化为覆盖度问题。只要随机投影后的邻域结构和 codebook 利用率足够，遮蔽分类就能迫使 Conformer 学到可预测上下文。论文发现 L2 归一化对均衡利用非常关键，随机种子会改变 codebook 占用；在数据较少时，训练型 VQ-VAE 标签可能更好，但随着预训练数据扩大差距缩小。对 sEMG，这提供一个廉价但严谨的消融：保持同一 encoder，只比较随机 codebook、k-means、学习型 VQ 与连续 teacher latent。'
      },
      evidence:{
        title:'证据：流式与多语种显著受益，但随机种子和利用率不可忽略',
        datasets:['LibriLight 无标注预训练，LibriSpeech 960 h 监督微调','XLS-R 风格约 429k h、51 种语言无标注数据；另有大规模多语种 YouTube','MLS 10 h/全量与 15 语言 Voice Search 评测'],
        metrics:['LibriSpeech 非流式 0.6B test/test-other WER 2.8/6.6','同架构流式设置优于 wav2vec 2.0 与 w2v-BERT，并报告相对预测时延','多语种低资源和高资源任务均获得显著相对 WER 改善'],
        ablations:['随机量化与 Transformer VQ-VAE 在不同数据量下比较','codebook size/dimension、mask 概率/长度、投影与 L2 归一化消融','codebook 每批利用率与下游质量强相关，随机种子带来方差'],
        limits:['标签语义弱且依赖输入特征；小数据时可能不如训练型 tokenizer','非流式收敛更慢，随机初始化方差要求多次运行'],
        visibleText:'论文在同一 Conformer 设置下比较多种自监督方法，说明 BEST-RQ 的优势不只是更大 backbone；尤其流式和多语种结果展示了简单目标的工程稳定性。进一步分析指出 codebook 大小并非最敏感因素，mask 策略与每批利用率更关键；不同随机种子可能改变结果。迁移到 sEMG 后，应报告至少三到五个随机 codebook seed，并把每批占用率、全局 perplexity、动作互信息和连续轨迹误差并列，否则一次漂亮结果不足以支持离散 token 结论。'
      },
      transfer:{
        title:'迁移：把 BEST-RQ 设为离散分支的最低复杂度基线',
        innovations:['标签器与主模型完全解耦，训练稳定且成本低','固定随机 codebook 将离散假设与表示学习能力分开','支持流式骨干，便于端侧因果模型测试'],
        borrow:['对多尺度 sEMG patch 做随机投影最近邻，预测被遮蔽 token ID','把 codebook seed 和利用率作为正式实验变量'],
        avoid:['不要把随机 code 解释为生理运动单位或可解释动作词','不要只调大词表；先检查归一化、mask 和批内占用'],
        experiments:['E1：BEST-RQ、k-means、learned VQ、data2vec latent 四目标同骨干对比','E2：5 个随机 seed × 256/1,024/4,096 code，报告方差与死码','E3：时域、包络、log-spectrum 三种标签输入，检查连续运动保真','E4：因果/双向编码器、掉通道和旋转测试，比较精度—时延前沿'],
        visibleText:'BEST-RQ 最适合回答一个早期问题：sEMG 是否仅靠离散 masked classification 就能获得可迁移运动表示。实现成本低，可在昂贵 learned tokenizer 前建立强基线。若随机标签已接近学习型 VQ，论文创新应转向腕带几何、跨域不变量或多任务证据；若 learned tokenizer 明显更好，则继续分析它学到的是动作原语还是身份纹理。无论哪种结果，连续角度/速度都必须进入选择标准，避免离散标签把幅值和细粒度轨迹抹平。'
      }
    }
  },
  {
    id:'beats', title:'BEATs', fullTitle:'BEATs: Audio Pre-Training with Acoustic Tokenizers',
    venue:'ICML 2023', status:'peer-reviewed', source:U.beats[0], pdfSource:U.beats[1],
    slides:{
      positioning:{
        title:'BEATs：让 tokenizer 与 SSL 模型通过迭代蒸馏共同提升',
        sections:['从随机投影 tokenizer 启动第一轮离散标签预测','用已预训练或监督微调的 audio model 反向指导语义 tokenizer','新 tokenizer 再生成更高层标签，训练下一轮 audio SSL model'],
        visibleText:'BEATs 面向通用音频，而非只做语音转写。它认为连续声学重建容易把容量浪费在背景噪声、混响和低层细节，因此让 audio SSL model 预测由 acoustic tokenizer 产生的离散标签。第一轮可用随机投影 tokenizer 启动；随后把已预训练的 BEATs 当 teacher，训练 self-distilled tokenizer，使离散单元更接近高层音频语义；再用这些标签训练下一轮模型。迭代两到三轮后，在 AudioSet、ESC-50、关键词和情感分类取得强结果。对 sEMG，它提供“先简后精”的离散支路路线，但监督 teacher 也可能把任务标签偏见写入 codebook。'
      },
      overviewFigure:{
        title:'Figure 1：tokenizer 产标签，SSL model 反向蒸馏 tokenizer',
        numberedExplanations:['① 无标注 audio 同时输入 acoustic tokenizer 与被训练的 audio SSL model。','② tokenizer 把局部声学 patch 映射成离散 label，作为 masked prediction 目标。','③ audio SSL model 学会从遮蔽上下文预测这些 label，获得高层表示。','④ 下一轮以已经预训练或监督微调的 audio model 为 teacher，蒸馏新的 tokenizer。','⑤ 更新后的 tokenizer 再标注无标注数据，继续训练下一轮模型，构成迭代闭环。'],
        visibleText:'图中的两条箭头对应不同阶段：上方“Discrete Labels”从 tokenizer 指向 SSL model，是主预训练监督；下方“Knowledge Distillation”从已经训练好的 model 返回 tokenizer，是下一轮标签改进。两者不是同时端到端互相反传，而是分阶段交替。初始随机 tokenizer 与 BEST-RQ 相似，后续 self-distilled tokenizer 使用教师隐藏表示或分类 logits，使 codebook 更偏语义、对噪声更稳。映射到 sEMG 时，可先用随机标签验证价值，再让运动学对齐 teacher 改善 motif，而不是直接用手势分类标签把连续运动压扁。'
      },
      mechanism:{
        title:'机制：迭代 acoustic tokenizer 与 masked discrete prediction',
        modules:['输入：16 kHz audio 转 128 维 Mel filterbank，25 ms 窗、10 ms 移，切 16×16 patch','初始标签：random-projection tokenizer 产生离散 code','SSL backbone：12 层、768 维、8 头 Transformer，约 90M 参数','自蒸馏 tokenizer：以预训练/微调 BEATs 为 teacher，学习语义标签','目标：mask acoustic patch 后预测 1,024 类 token；新标签进入下一轮'],
        lossExplanation:'audio SSL model 使用遮蔽离散标签交叉熵。self-distilled tokenizer 通过教师表示或分类输出学习量化器；codebook 含 1,024 个 256 维 embedding。迭代阶段分开优化，不是联合重建。',
        visibleText:'BEATs 的 tokenizer 本身包括 patch encoder、teacher 蒸馏与离散 codebook，不能只把 codebook 表当作完整 tokenizer。第一轮模型使用随机投影标签即可超过多项重建基线；第二、三轮标签逐渐富含类别语义。论文还区分自监督 teacher 与监督微调 teacher：后者在目标音频分类上更强，但已使用标签，因此不再是纯无监督知识。迁移到 sEMG 时，应把“语义”定义为跨人共享的动作与运动阶段，并用身份/设备探针确认 tokenizer 没有把个体纹理当成离散词。'
      },
      evidence:{
        title:'证据：语义 tokenizer 提升通用音频，监督 teacher 收益需单独标注',
        datasets:['预训练与 tokenizer 训练使用 AudioSet 全训练集','下游：AudioSet-2M/20K、ESC-50、Speech Commands V1/V2、IEMOCAP 情感','模型约 90M，论文比较重建式、随机标签与多轮自蒸馏标签'],
        metrics:['最终报告 AudioSet-2M mAP 50.6、ESC-50 accuracy 98.1','正文迭代模型在 AS-2M/AS-20K、关键词和情感任务整体有竞争力','语义丰富标签对小数据分类的提升尤其明显'],
        ablations:['random-projection tokenizer 已是强起点，自蒸馏继续提升','比较不同自监督 teacher 和监督微调 teacher；监督 teacher 带来更强任务语义','目标可视化显示语义 token 比连续重建特征对噪声/混响更稳'],
        limits:['监督 teacher 使用下游标签，比较时必须区分纯 SSL 与半监督设置','迭代训练成本高；离散高层语义可能丢失连续低幅变化'],
        visibleText:'BEATs 的实验覆盖六类音频与语音分类任务，并用 tokenizer 迭代消融证明标签质量会改变下游结果。随机投影第一轮已经很强，说明复杂 tokenizer 必须证明增量价值；自监督 teacher 的多轮收益趋于饱和，而监督微调 teacher 可显著注入任务语义。对 sEMG 这是双刃剑：运动学 teacher 能让 token 更贴近动作，但若使用测试任务标签或同一受试者数据，会造成不公平预训练。应明确记录每轮 teacher 所见标签、主体和设备，并用严格外部测试。'
      },
      transfer:{
        title:'迁移：分阶段迭代，但以运动学语义而非单一分类标签蒸馏',
        innovations:['tokenizer 与主模型交替迭代，而非一次性固定伪标签','随机标签启动降低冷启动成本','教师蒸馏把高层语义写入离散 token'],
        borrow:['第 0 轮 BEST-RQ；第 1 轮 data2vec 连续 teacher；第 2 轮可选运动学语义 tokenizer','每轮固定外部测试与 codebook 审计，量化真实增益'],
        avoid:['不要用目标测试集手势标签训练 teacher，再宣称自监督泛化','不要只优化分类语义而忽略幅值、力度和连续阶段'],
        experiments:['E1：random tokenizer → SSL teacher → kinematic teacher 三轮增量曲线','E2：teacher 为手势、关节速度、二者多任务，比较 token 互信息与双任务性能','E3：每轮报告 codebook 利用、稳定性、身份/设备 probe 与计算成本','E4：噪声、掉通道、旋转、位移和跨设备下检查 token 一致性'],
        visibleText:'面向前臂运动基座，可采用受控两阶段而不是无上限迭代：先用随机 codebook 证明离散 masked prediction 是否值得；再用不接触测试主体的连续运动学 teacher 训练语义 tokenizer。新 codebook 只有在同一个 encoder 上同时改善离散手势、连续关节轨迹和跨佩戴稳定性时才保留。若监督手势 teacher 只提高分类，应把它归类为任务特化，不作为通用基座贡献。这个证据结构比简单宣称“token 更有语义”更适合顶会审稿。'
      }
    }
  }
];

const speechPaperRecords = baseRecords.map((paper) => ({ ...paper, notes:autoNotes(paper) }));
module.exports = { speechPaperRecords };
