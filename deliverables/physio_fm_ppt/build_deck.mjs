import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const require = createRequire(import.meta.url);
const { paperRecords } = require('./paper_records.js');
const OUT = fileURLToPath(new URL('../生理时序基座模型顶会论文深读_2026-09.pptx', import.meta.url));

const C = { bg:'#081521', bg2:'#0D2030', panel:'#123143', teal:'#55B7B2', teal2:'#83D7D1', orange:'#F5A24A', ink:'#F4FAFC', muted:'#AFC7D0', line:'#2A5162' };
const W = 1280, H = 720;

function box(slide, x, y, w, h, fill='none', line='none', geometry='rect') {
  return slide.shapes.add({ geometry, position:{left:x,top:y,width:w,height:h}, fill, line:{style:'solid',fill:line,width:line==='none'?0:1} });
}
function text(slide, value, x, y, w, h, size=20, color=C.ink, bold=false, align='left') {
  const s = slide.shapes.add({ geometry:'textbox', position:{left:x,top:y,width:w,height:h}, fill:'none', line:{style:'solid',fill:'none',width:0} });
  s.text = value;
  s.text.style = { fontSize:size, color, bold, alignment:align, verticalAlignment:'top', typeface:'Aptos' };
  return s;
}
function line(slide, x, y, w, fill=C.line) { return box(slide,x,y,w,2,fill,fill); }
function notes(slide, value) { slide.speakerNotes.textFrame.setText(value); slide.speakerNotes.setVisible(true); }
function chrome(slide, section, page) {
  slide.background.fill = C.bg;
  box(slide,0,0,W,10,C.teal,C.teal);
  text(slide,section.toUpperCase(),58,26,420,22,12,C.teal,true);
  text(slide,`${String(page).padStart(2,'0')} / 65`,1110,26,110,22,12,C.muted,true,'right');
  line(slide,58,676,1164,C.line);
  text(slide,'生理时序基座模型｜面向前臂与腕部 sEMG 运动交互',58,688,700,18,10,C.muted);
}
function title(slide, value, kicker) {
  if (kicker) text(slide,kicker,58,58,760,24,14,C.teal,true);
  text(slide,value,58,88,1134,62,38,C.ink,true);
}
function bullets(slide, list, x, y, w, h) {
  list.forEach((b,i)=>{
    box(slide,x,y+i*72,8,8,C.teal,C.teal,'ellipse');
    text(slide,b,x+24,y-4+i*72,w-24,58,19,C.ink,false);
  });
}
function flow(slide, labels, y=500) {
  const n = labels.length, gap=18, total=1120, nodeW=(total-gap*(n-1))/n, x0=80;
  for(let i=0;i<n-1;i++) box(slide,x0+(i+1)*nodeW+i*gap-8,y+28,gap+16,8,C.teal,C.teal,'rightArrow');
  labels.forEach((label,i)=>{
    const x=x0+i*(nodeW+gap);
    box(slide,x,y,nodeW,64,C.panel,C.teal,'roundRect');
    text(slide,label,x+10,y+18,nodeW-20,28,17,C.ink,true,'center');
  });
}
function addPaperSlide(record, kind, page) {
  const slide = deck.slides.add(); chrome(slide,record.category,page);
  const s=record.slides[kind];
  const displayName = {
    'Large-scale Training of Foundation Models for Wearable Biosignals':'Apple wearable FM',
    'Scaling Wearable Foundation Models':'Scaling wearable FM',
    'Biosignal Fingerprinting / M2AE（预印本）':'M2AE（预印本）',
    'A Generic Non-invasive Neuromotor Interface for HCI':'Nature HCI neuromotor interface'
  }[record.title] || record.title;
  title(slide,s.title.replace(record.title,displayName),record.venue);
  const tags = kind==='positioning' ? ['输入 / 场景','研究空缺','核心创新'] : kind==='method' ? ['表示 / tokenizer','模型骨干','预训练目标'] : ['实证证据','对本项目的启示','迁移边界'];
  tags.forEach((t,i)=>text(slide,t,58,184+i*72,150,28,14,i===2&&kind==='evidence'?C.orange:C.teal,true));
  bullets(slide,s.bullets,220,180,930,250);
  line(slide,58,458,1164,C.line); flow(slide,s.flow,522);
  notes(slide,record.notes[kind]);
}
function overviewSlide(page, heading, kicker, blts, source) {
  const slide=deck.slides.add(); chrome(slide,'研究全景',page); title(slide,heading,kicker); bullets(slide,blts,82,200,1050,280); flow(slide,['信号采集','表征学习','任务适配','严格泛化'],530); notes(slide,`本页用于建立阅读框架：${heading}。内容综合本报告收录的会议论文和正式出版物，强调从数据、表征、目标和评测四个层面理解生理时序基础模型。${sourceBlock(source)}`); }
function sourceBlock(url){ return `\n[Sources]\n- ${url}\n[/Sources]`; }
function synthesisSlide(page, heading, kicker, left, right, source) {
  const slide=deck.slides.add(); chrome(slide,'综合与方案',page); title(slide,heading,kicker);
  box(slide,58,180,530,410,C.bg2,C.line,'roundRect'); box(slide,634,180,588,410,C.panel,C.line,'roundRect');
  text(slide,left.label,86,210,450,32,22,C.teal,true); bullets(slide,left.items,86,270,430,250);
  text(slide,right.label,664,210,500,32,22,C.orange,true); bullets(slide,right.items,664,270,480,250);
  notes(slide,`${heading}。本页将前述论文的共同设计规律转化为面向前臂与腕部 sEMG 运动交互的可执行建议；推荐并非复述任一单一论文，而是基于其方法和评测设置的综合判断。${sourceBlock(source)}`);
}

const deck = Presentation.create({ slideSize:{width:W,height:H} });

// 1–5: landscape.
{ const s=deck.slides.add(); chrome(s,'封面',1); text(s,'生理时序基座模型\n顶会论文深读',58,145,760,170,60,C.ink,true); text(s,'17 篇高参考价值工作｜EEG、可穿戴生理信号与腕部 sEMG\n目标：从领域脉络收敛到手势与连续运动交互的预训练方案',62,350,760,88,24,C.muted); box(s,900,152,246,246,C.panel,C.teal,'roundRect'); text(s,'EEG\nwearable\nsEMG',928,203,190,118,30,C.teal2,true,'center'); text(s,'2026.09',58,610,180,28,18,C.teal,true); notes(s,`本报告面向准备开展可穿戴神经肌肉基础模型研究的读者。范围从 EEG、自监督生理信号与通用时间序列模型出发，最后收敛到前臂/腕部 sEMG 的离散手势与连续运动交互。每篇工作均提供三页技术拆解和可迁移性判断。${sourceBlock(paperRecords[2].source)}`); }
overviewSlide(2,'为什么生理时序也需要“基础模型”？','从单任务分类器走向可迁移的运动表征',['数据稀缺与标签成本高：先从无标签波形获得可复用知识','跨人、跨天、跨佩戴与跨设备造成比任务差异更大的域偏移','同一主干应同时服务离散手势、连续关节轨迹与交互序列'],paperRecords[1].source);
overviewSlide(3,'17 项工作形成三条互补路线','EEG 学表示；可穿戴研究尺度；sEMG 定义真实目标域',['EEG：离散 token、掩蔽建模、时空分解与专家路由','可穿戴/通用时序：纵向对比、形态建模、scaling 与生成式预测','腕部 sEMG：跨人/跨佩戴泛化、连续姿态和序列交互评测'],paperRecords[0].source);
overviewSlide(4,'方法不是二选一：表示、目标与评测共同决定价值','阅读论文时的五个问题',['输入如何切片，token 是否保留肌肉收缩形态？','预训练是重建、对比、预测还是跨模态对齐？','空间通道关系和时间动作轨迹是否被分开建模？','下游适配是否覆盖离散与连续运动？','是否严格隔离用户、天次、佩戴位置和设备？'],paperRecords[4].source);
overviewSlide(5,'本报告使用“可迁移性”而非单一排行榜作为评价尺','面向腕部/前臂 sEMG 运动交互',['优先保留：对无标签数据有效、对佩戴扰动鲁棒、对连续运动有帮助的机制','谨慎采用：高度依赖 EEG 节律、PPG 周期性、文本语言先验或闭源规模的结论','推荐闭环：预训练表征 → 少量标签适配 → held-out user/placement/day 验证'],paperRecords[14].source);

let page=6; for (const r of paperRecords) { addPaperSlide(r,'positioning',page++); addPaperSlide(r,'method',page++); addPaperSlide(r,'evidence',page++); }

const ref=paperRecords[16].source;
synthesisSlide(57,'比较矩阵：真正可迁移的是设计原则，不是某一个模态的配方','17 篇工作横向结论',{label:'跨工作共识',items:['连续波形需要多尺度表征，而非仅单点特征','预训练目标要与下游可观测结果建立约束','跨域评测必须被当作主任务，而非附录']},{label:'目标域的特有要求',items:['1 kHz sEMG 要同时覆盖短收缩与长动作上下文','环形腕带的旋转、压力和汗液会改变通道语义','离散手势与连续运动须共享表征但分任务适配']},ref);
synthesisSlide(58,'Tokenizer 决策：第一阶段保持连续，第二阶段再检验离散原语','连续 tokenizer + VQ 消融',{label:'默认方案',items:['多尺度连续 patch：40–80 ms / 160–320 ms / 0.8–1.6 s','通道与佩戴条件作为显式输入，而非静态索引','以重建质量、运动学预测与跨域性能共同选择尺寸']},{label:'第二阶段消融',items:['借鉴 LaBraM/AEMG：学习可解释的收缩或时频原语','比较 VQ 是否提升少样本、跨设备和离散手势','若连续轨迹变差，保留连续侧路并将 codebook 只作辅助']},paperRecords[2].source);
synthesisSlide(59,'目标函数决策：以掩蔽重建为核心，以运动结果预测提供方向','不是“重建 vs 对比”的二选一',{label:'主损失',items:['masked reconstruction：恢复局部形态、频谱与跨通道结构','EMG→未来运动学 / IMU：让表征包含动作后果','可选频域一致性：防止重建只拟合时域平均形态']},{label:'选择性辅助',items:['对比学习仅用于明确正对：跨天、同步多传感器或受控佩戴扰动','跨通道一致性用于稳定阵列关系','不要让身份或文本上下文成为捷径']},paperRecords[11].source);
synthesisSlide(60,'数据与标签：无标签 sEMG 是主体，运动结果标签是高价值锚点','采集设计决定论文上限',{label:'无标签语料',items:['多用户、多天、不同压力/旋转/设备；自然动作与静息并存','记录采样率、通道标定、佩戴位置和环境元数据','保留未裁切连续流，避免只采集动作峰值片段']},{label:'少量高价值标签',items:['同步 IMU、手部关节角、键击或触碰事件','离散：手指/腕部手势；连续：角度、速度、轨迹','标签与信号时间同步、延迟校准、质量控制必须显式报告']},paperRecords[14].source);
synthesisSlide(61,'评测协议：把“泛化”拆成可诊断的四种失效模式','基础模型应在严格划分中证明自己',{label:'任务轴',items:['离散手势：macro-F1、accuracy、校准与低标签曲线','连续运动：角度/位置误差、相关性、时延与平滑性','交互序列：事件率、编辑成本与在线稳定性']},{label:'域轴',items:['held-out subject：新用户','held-out day：跨天稳定性','held-out placement/device：佩戴与硬件鲁棒性','联合域偏移：最接近日常真实使用']},paperRecords[14].source);
synthesisSlide(62,'目标模型：多尺度连续编码器 + 条件时空融合 + 多头适配','建议的研究主线',{label:'编码器',items:['每通道多尺度卷积/patch stem','时间 Transformer + 通道关系模块并行或交替','佩戴位姿、设备、采样配置用条件嵌入处理']},{label:'任务头',items:['重建头：波形 / 时频 / 跨通道','预测头：未来 IMU / 关节角分布','下游头：手势分类、连续回归、序列解码','VQ 头：作为收缩原语的对照实验']},paperRecords[4].source);
synthesisSlide(63,'训练配方：先稳定表征，再逐步增加跨域与离散约束','从可复现基线到贡献性设计',{label:'阶段 1：连续自监督',items:['多尺度 masked reconstruction','随机裁窗、幅度缩放、轻度通道丢失等生理合理增强','监控重建、频谱保持和跨日线性探测']},{label:'阶段 2：结果对齐与消融',items:['加入未来运动学/IMU 预测','加入明确正对的轻量对比一致性','比较无 VQ / VQ / 条件专家；保持相同数据和划分']},paperRecords[16].source);
synthesisSlide(64,'顶会论文的可辩护贡献：不是“更大模型”，而是更可信的运动表征','可投稿的三层证据',{label:'方法贡献',items:['面向高采样率 sEMG 的多尺度连续 tokenizer','同时面向离散与连续运动的预训练目标组合','佩戴条件感知的通道—时间建模']},{label:'证据贡献',items:['跨人、跨天、跨佩戴、跨设备的统一基准','预训练数据与下游标签的清晰分工','与 EEG/通用时序/AEMG 路线的受控消融和失效分析']},paperRecords[16].source);
synthesisSlide(65,'结论：用“运动后果”组织前臂 sEMG 的基础表征','下一步即可启动的最小研究闭环',{label:'现在就做',items:['确定 1 kHz 多通道原始流与同步 IMU/运动学记录','建立 masked reconstruction + future motion prediction 基线','实现 user/day/placement/device 四轴数据划分']},{label:'随后验证',items:['离散手势与连续轨迹同时报告','VQ/codebook 只作为第二阶段对照，不预设成功','把失败案例按佩戴、强度、动作阶段拆解，形成顶会叙事']},paperRecords[16].source);

if (deck.slides.items.length !== 65) throw new Error(`Expected 65 slides, got ${deck.slides.items.length}`);
const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);
console.log(`Wrote ${OUT} with ${deck.slides.items.length} slides`);
