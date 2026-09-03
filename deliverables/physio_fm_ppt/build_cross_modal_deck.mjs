import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const require = createRequire(import.meta.url);
const { crossModalPaperRecords: papers } = require('./cross_modal_paper_records.js');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '生理时序基座模型顶会论文深读_跨模态扩充版_2026-09.pptx');
const INSPECT_OUT = `${OUT}.inspect.ndjson`;
const manifestPath = path.join(HERE, 'cross_modal_figure_manifest.json');
const figureManifest = JSON.parse(await fs.readFile(manifestPath, 'utf8').catch((error) => {
  if (error?.code === 'ENOENT') {
    throw new Error('cross_modal_figure_manifest.json is missing. Run merge_cross_modal_assets.mjs after both upstream figure manifests are ready.');
  }
  throw error;
}));
const figures = new Map(figureManifest.map((entry) => [entry.paperId, entry.main]));

const W = 1280;
const H = 720;
const TOTAL = 140;
const FONT_CN = 'Microsoft YaHei';
const C = {
  canvas:'#FFFFFF', ink:'#0B1118', muted:'#52606D', faint:'#8794A1', panel:'#F1F3F5',
  line:'#C8CDD3', eeg:'#247BA0', speech:'#5B67B7', speechSoft:'#E6E8F8',
  physio:'#3C8D72', wearable:'#27877B', semg:'#C96A32', orangeSoft:'#FBE8D9',
  accent:'#1888C9', accentSoft:'#D9F1FC', cyan:'#5AC8E8', green:'#347A5E', dark:'#111A24'
};

const PAPER_KINDS = ['positioning', 'overviewFigure', 'mechanism', 'evidence', 'transfer'];

function addShape(slide, x, y, width, height, fill='none', lineFill='none', geometry='rect', lineWidth=0, name) {
  return slide.shapes.add({
    geometry, name, position:{left:x, top:y, width, height}, fill,
    line:{style:'solid', fill:lineFill, width:lineWidth}
  });
}

function addText(slide, value, x, y, width, height, size=20, color=C.ink, bold=false, align='left', valign='top', name) {
  const shape = slide.shapes.add({
    geometry:'textbox', name, position:{left:x, top:y, width, height}, fill:'none',
    line:{style:'solid', fill:'none', width:0}
  });
  shape.text = String(value ?? '');
  shape.text.style = {
    fontSize:size, color, bold, alignment:align, verticalAlignment:valign,
    typeface:FONT_CN, autoFit:'none', wrap:'square', lineSpacing:1.06,
    insets:{left:0, right:0, top:0, bottom:0}
  };
  return shape;
}

function rule(slide, x, y, width, fill=C.line, height=1) {
  return addShape(slide, x, y, width, height, fill, fill, 'rect', 0);
}

function addNotes(slide, value) {
  slide.speakerNotes.textFrame.setText(String(value));
  slide.speakerNotes.setVisible(true);
}

function sourceBlock(urls) {
  const clean = [...new Set(urls.filter(Boolean))];
  return `\n[Sources]\n${clean.map((url) => `- ${url}`).join('\n')}\n[/Sources]`;
}

function compact(value, limit=54) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, Math.max(1, limit - 1))}…` : text;
}

function firstSentence(value, limit=78) {
  const sentence = String(value ?? '').split(/[。！？]/)[0];
  return compact(sentence, limit);
}

function host(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return String(url); }
}

function sectionForIndex(index) {
  if (index < 7) return { key:'EEG', label:'EEG FOUNDATION MODELS', color:C.eeg };
  if (index < 11) return { key:'SPEECH', label:'SPEECH FOUNDATION MODELS', color:C.speech };
  if (index < 15) return { key:'PHYSIO', label:'PHYSIOLOGICAL FOUNDATION MODELS', color:C.physio };
  if (index < 21) return { key:'WEARABLE', label:'WEARABLE & GENERAL TIME SERIES', color:C.wearable };
  return { key:'sEMG', label:'WRIST / FOREARM sEMG', color:C.semg };
}

function addChrome(slide, page, label, accent=C.accent, dark=false) {
  slide.background.fill = dark ? C.dark : C.canvas;
  addShape(slide, 0, 0, W, 8, accent, accent);
  addText(slide, label.toUpperCase(), 54, 23, 850, 22, 13, dark ? '#BBD6E5' : accent, true);
  addText(slide, `${String(page).padStart(3, '0')} / ${TOTAL}`, 1114, 23, 110, 22, 13, dark ? '#A9BBC6' : C.faint, true, 'right', 'top', `page-${page}`);
  rule(slide, 54, 681, 1170, dark ? '#314252' : C.line, 1);
  addText(slide, '跨模态生理时序基座模型｜1 kHz 前臂与腕部 sEMG 运动交互', 54, 691, 860, 16, 11, dark ? '#A9BBC6' : C.faint);
}

function addTitle(slide, title, kicker='', dark=false, size=42) {
  if (kicker) addText(slide, kicker, 54, 55, 1150, 24, 16, dark ? '#9CCFE0' : C.accent, true);
  const clean = String(title ?? '').replace(/\s+/g, ' ').trim();
  const isLong = clean.length > 42;
  addText(
    slide,
    isLong ? compact(clean, 64) : clean,
    54,
    84,
    1170,
    isLong ? 74 : 58,
    isLong ? Math.min(size, 32) : size,
    dark ? '#FFFFFF' : C.ink,
    true,
    'left',
    'top',
    'slide-title'
  );
}

function addTakeaway(slide, value, accent=C.accent, dark=false, y=625) {
  rule(slide, 54, y, 10, accent, 4);
  addText(slide, compact(value, 78), 78, y - 8, 1135, 34, 19, dark ? '#E6F1F6' : C.ink, true, 'left', 'middle');
}

function addSource(slide, value, page, dark=false) {
  addText(slide, value, 54, 659, 1110, 16, 10.5, dark ? '#A9BBC6' : C.faint, false, 'left', 'top', `source-${page}`);
}

function addColumn(slide, title, items, x, y, width, height, accent=C.accent, bodySize=18) {
  addText(slide, title, x, y, width, 32, 24, accent, true);
  rule(slide, x, y + 41, width, C.line, 1);
  const list = (Array.isArray(items) ? items : [items]).filter(Boolean).slice(0, 4);
  const row = Math.max(48, Math.floor((height - 55) / Math.max(1, list.length)));
  const itemLimit = width < 300 ? 30 : (width < 540 ? (list.length >= 2 ? 24 : 34) : 54);
  const itemSize = width < 540 ? Math.min(bodySize, 14.5) : bodySize;
  list.forEach((item, index) => {
    addText(slide, String(index + 1).padStart(2, '0'), x, y + 55 + index * row, 30, 22, 13, accent, true);
    addText(slide, compact(item, itemLimit), x + 38, y + 51 + index * row, width - 38, row - 3, itemSize, C.ink);
  });
}

async function addFigure(slide, paper, x, y, width, height) {
  const entry = figures.get(paper.id);
  if (!entry) throw new Error(`Missing figure entry for ${paper.id}`);
  const imagePath = path.resolve(HERE, entry.localPath);
  const relative = path.relative(HERE, imagePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`${paper.id}: figure path escapes build directory`);
  const bytes = await fs.readFile(imagePath);
  addShape(slide, x - 8, y - 8, width + 16, height + 16, '#FFFFFF', C.line, 'rect', 1, `figure-frame-${paper.id}`);
  slide.images.add({
    blob:bytes, contentType:'image/png', alt:`${paper.title}: ${entry.figureNumber}`,
    fit:'contain', position:{left:x, top:y, width, height}, name:`figure-${paper.id}`
  });
  return entry;
}

function paperHeader(slide, paper, paperIndex, page, kind) {
  const section = sectionForIndex(paperIndex);
  addChrome(slide, page, `${section.label} · ${paper.venue} · ${paper.title}`, section.color);
  addText(slide, `${compact(paper.fullTitle, 112)} · ${paper.status}`, 54, 55, 1120, 23, 14.5, section.color, true);
  const title = String(paper.slides[kind].title ?? '').replace(/\s+/g, ' ').trim();
  const isLong = title.length > 40;
  addText(
    slide,
    isLong ? compact(title, 64) : title,
    54,
    83,
    1170,
    isLong ? 75 : 55,
    isLong ? 27 : 38,
    C.ink,
    true,
    'left',
    'top',
    'slide-title'
  );
  return section;
}

function cover(deck) {
  const slide = deck.slides.add();
  addChrome(slide, 1, 'CROSS-MODAL RESEARCH LANDSCAPE · 2021—2026', C.cyan, true);
  addText(slide, '跨模态生理时序基座模型', 58, 118, 1000, 78, 58, '#FFFFFF', true);
  addText(slide, '25 篇论文 × 5 页深读', 58, 210, 870, 64, 43, '#D9F1FC', true);
  addText(slide, 'EEG → Speech → Physiological signals → Wearables → wrist / forearm sEMG', 60, 299, 1010, 36, 21, '#8BC8DC', true);
  rule(slide, 60, 374, 720, '#436071', 2);
  addText(slide, '核心任务：离散手势与连续手指/腕部运动同等重要\n目标：从跨模态方法中筛出可验证的 sEMG 预训练机制', 60, 405, 850, 92, 24, '#E6F1F6');
  addText(slide, '140', 998, 155, 198, 92, 78, '#FFFFFF', true, 'right');
  addText(slide, '页研究底稿', 1010, 257, 185, 30, 19, '#A9BBC6', false, 'right');
  addText(slide, '2026.09', 60, 617, 180, 28, 18, '#7ED7F2', true);
  addNotes(slide, `本报告将 25 篇工作组织为 EEG、语音、其他生理模态、可穿戴/通用时序与直接 sEMG 五章。每篇固定五页：定位、原图、机制、证据和目标域迁移。语音并非被当作相同生理信号，而是提供连续波形 token 化、掩蔽预测、离散单元、教师网络和生成目标等成熟方法参照。最终综合页只回答一个问题：怎样为 1 kHz 腕部/前臂 sEMG 构建同时支持离散手势与连续运动的基础模型。${sourceBlock([papers[0]?.source, papers[7]?.source, papers[21]?.source])}`);
}

function introScope(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '研究全景', C.accent); addTitle(slide, '五个章节构成一条“方法—生理—交互”证据链', '25 篇工作的阅读顺序');
  const groups = [
    ['7 EEG', '时空结构、masked modeling、离散神经 token'],
    ['4 Speech', '波形 tokenizer、教师目标、语音离散单元与生成'],
    ['4 Physiology', 'ECG/PPG/多模态生理表征与迁移'],
    ['6 Wearable', '纵向规模、通用时序、标度与概率未来'],
    ['4 sEMG', '真实腕带、连续姿态、打字序列与动作预训练']
  ];
  groups.forEach((group, index) => {
    const x = 54 + index * 232;
    const color = [C.eeg, C.speech, C.physio, C.wearable, C.semg][index];
    addText(slide, group[0], x, 178, 205, 39, 26, color, true);
    rule(slide, x, 225, 205, color, 3);
    addText(slide, group[1], x, 245, 205, 174, 19, C.ink);
  });
  addText(slide, '不是文献清单', 54, 492, 210, 34, 23, C.semg, true);
  addText(slide, '每一章都要落到同一目标域合同：运动语义、跨佩戴泛化、少样本适配与在线可用性。', 275, 486, 915, 68, 25, C.ink, true);
  addTakeaway(slide, '跨模态参照用于提出机制假设；直接 sEMG 工作用于定义可信评测。', C.semg);
  addNotes(slide, `五章并非等价模态的简单堆叠。EEG 和语音提供成熟的自监督与 token 化设计；ECG、PPG 和多模态生理工作检验形态与主体层级的一致性；通用时序工作提供简单强基线、标度与概率生成；直接 sEMG 论文定义腕带硬件、受试者泛化、连续姿态和交互序列。阅读每篇时都区分“可迁移设计原则”和“不可照搬的模态假设”。${sourceBlock(papers.map((paper) => paper.source))}`);
}

function introQuestion(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '研究问题', C.semg); addTitle(slide, '基座是否成立，要看一个 encoder 能否覆盖两种运动粒度', '离散手势与连续运动同等重要');
  addColumn(slide, '离散交互', ['手势类别与起止检测', '连续动作流中的事件分割', '序列输出与误触控制'], 54, 170, 340, 330, C.eeg, 21);
  addColumn(slide, '共享运动表征', ['局部肌肉激活形态', '跨通道协同与动作阶段', '跨人、跨日、跨佩戴不变量'], 470, 170, 340, 330, C.physio, 21);
  addColumn(slide, '连续控制', ['手指/腕部角度与速度', '轨迹不确定性与时延', '少样本个性化与在线漂移'], 886, 170, 336, 330, C.semg, 21);
  addTakeaway(slide, '若预训练只改善分类或只改善回归，就还不是本项目定义下的通用运动基座。', C.semg);
  addNotes(slide, `本报告采用明确的目标定义：同一 sEMG encoder 经过轻量适配，应同时服务离散手势分类、事件检测或交互序列，以及连续手指和腕部运动学回归。共享表示需要保留局部肌电形态、跨通道协同和动作阶段，同时对受试者、日期、腕带旋转/位移和设备变化稳定。所有综合结论都以这两个任务族和真实域偏移为共同判据。${sourceBlock([papers[22]?.source, papers[23]?.source, papers[24]?.source])}`);
}

function introTerms(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '术语底座', C.speech); addTitle(slide, 'tokenizer、token 与 codebook 必须分开', '跨模态比较先统一语言');
  const rows = [
    ['tokenizer', '从连续输入到模型序列单位的完整变换', '切窗/卷积/STFT/量化均可参与'],
    ['token', '模型序列中的一个单位或向量', '可以连续，也可以是离散 ID'],
    ['codebook（码本）', '有限个可学习向量构成的离散词表', '仅 VQ/量化路线需要'],
    ['掩蔽建模', '隐藏部分输入并预测波形、频谱、latent 或 token', '目标类型决定学到的信息'],
    ['对比学习', '通过正对与负对定义不变量', '正对选择决定是否产生捷径']
  ];
  rows.forEach((row, index) => {
    const y = 158 + index * 86;
    addText(slide, row[0], 54, y, 245, 34, 22, index === 2 ? C.semg : C.speech, true);
    addText(slide, row[1], 320, y, 445, 56, 19, C.ink);
    addText(slide, row[2], 800, y, 418, 56, 18, C.muted);
    rule(slide, 54, y + 63, 1168, C.line, 1);
  });
  addTakeaway(slide, '有 tokenizer 不等于有固定 codebook；连续 patch tokenizer 同样会产生 token。', C.speech);
  addNotes(slide, `跨模态文献最常见的误读是把切片、embedding 和离散词表统称为 token 化。Tokenizer 是完整映射规则，token 是输出单位，codebook 只在向量量化或其他离散化中存在。掩蔽建模还要区分预测 raw waveform、spectrum、连续 teacher latent 或离散 token；对比学习则必须说明正样本、负样本与增强。后续每篇机制页均按这套术语解释。${sourceBlock([papers[2]?.source, papers[7]?.source, papers[24]?.source])}`);
}

function introTransfer(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '跨模态迁移', C.speech); addTitle(slide, '语音贡献训练机制，生理信号决定哪些机制可以成立', '相似的是波形结构，不同的是任务不变量');
  addColumn(slide, '语音可借鉴', ['局部波形前端与长上下文', 'teacher–student 连续目标', '离散单元与生成式预测'], 54, 174, 510, 300, C.speech, 21);
  addColumn(slide, 'sEMG 必须重写', ['语音内容不变量 → 运动意图与阶段', '说话人/声道 → 受试者/肌肉/佩戴', '音素边界 → 连续肌肉协同与电机械延迟'], 712, 174, 510, 300, C.semg, 21);
  addText(slide, '迁移规则', 54, 520, 160, 30, 23, C.semg, true);
  addText(slide, '保留信息约束与优化机制；替换正负关系、空间先验、增强和评测协议。', 218, 514, 962, 58, 25, C.ink, true);
  addTakeaway(slide, '跨模态不是直接预训练混合，而是用成熟机制构造可证伪的 sEMG 假设。', C.semg);
  addNotes(slide, `语音与 sEMG 都是高采样率连续波形，存在局部形态和长程语义，因此卷积前端、masked prediction、EMA teacher、离散 unit 和生成目标具有方法参考价值。但语音的内容、说话人和声道因素不能直接对应 sEMG 的动作、受试者和佩戴变化；同一增强也未必保持动作语义。跨模态迁移的正确方式是复用优化机制，并在目标域重新定义 token 尺度、正负样本、空间几何和失效测试。${sourceBlock(papers.slice(7, 11).map((paper) => paper.source))}`);
}

function introMethods(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '方法地图', C.accent); addTitle(slide, '四类预训练目标对应四种信息瓶颈', '组合目标必须先逐项证明');
  const rows = [
    ['连续掩蔽', '恢复 waveform / spectrum / latent', '保留连续运动细节', '也可能重建噪声'],
    ['离散预测', '预测 codebook token', '学习可组合原语', '量化损失与死码'],
    ['对比一致', '定义跨视图正负关系', '学习跨域不变量', '身份/设备捷径'],
    ['预测生成', '预测未来或条件分布', '连续控制与不确定性', '时延与生成幻觉']
  ];
  rows.forEach((row, index) => {
    const y = 165 + index * 103;
    addText(slide, row[0], 54, y, 195, 34, 25, index === 3 ? C.semg : C.accent, true);
    addText(slide, row[1], 270, y, 350, 58, 20, C.ink, true);
    addText(slide, row[2], 660, y, 276, 58, 19, C.green);
    addText(slide, row[3], 960, y, 260, 58, 19, C.muted);
    rule(slide, 54, y + 72, 1168, C.line, 1);
  });
  addTakeaway(slide, '推荐先以连续 masked modeling 建强基线，再增加运动学对齐、条件一致性和离散支路。', C.semg);
  addNotes(slide, `连续掩蔽、离散预测、对比一致和预测生成并不是互相替代的口号，而是约束不同信息。连续目标有利于角度和速度；离散目标有利于手势原语和序列组合；对比目标定义跨日、跨设备或跨佩戴不变量；预测生成直接约束未来运动及不确定性。实验应固定数据、骨干、训练 token 和下游头，先单项再组合，避免损失堆叠后无法解释贡献。${sourceBlock([papers[0]?.source, papers[2]?.source, papers[7]?.source, papers[19]?.source])}`);
}

function introContract(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '目标域合同', C.semg); addTitle(slide, '所有论文都用同一评测合同落地到 1 kHz sEMG', '避免随机窗口高分掩盖真实失败');
  const columns = [
    ['双任务', ['手势 macro-F1 / event F1', '角度/速度 MAE 与相关', '交互序列 CER 与时延']],
    ['五域偏移', ['held-out subject / day', 'rotation / displacement', 'device / channel dropout']],
    ['效率与可信性', ['因果延迟、吞吐、显存', '身份/设备线性探测', '码本利用率与失效分层']]
  ];
  columns.forEach((column, index) => addColumn(slide, column[0], column[1], 54 + index * 390, 174, 350, 320, index === 2 ? C.semg : C.accent, 21));
  addText(slide, '最低合格线', 54, 532, 180, 30, 23, C.semg, true);
  addText(slide, '相同数据、相同 decoder、受试者完全隔离；预训练收益必须同时覆盖离散与连续任务。', 242, 526, 948, 64, 24, C.ink, true);
  addTakeaway(slide, '方法页提出假设，证据页核验论文结论，迁移页给出可执行消融。', C.semg);
  addNotes(slide, `目标域合同包括双任务、五种域偏移、效率和表示审计。离散手势使用 macro-F1、event F1、误触和检测时延；连续运动使用 MAE、相关、漂移与相位延迟；交互序列按 CER 或事件序列错误衡量。held-out subject、day、rotation、displacement 和 device 必须独立报告。身份与设备线性探测、码本 perplexity 和死码用于排除捷径。${sourceBlock(papers.slice(21).map((paper) => paper.source))}`);
}

function paperPositioning(deck, paper, paperIndex, page) {
  const slide = deck.slides.add(); const section = paperHeader(slide, paper, paperIndex, page, 'positioning');
  const data = paper.slides.positioning;
  addText(slide, compact(data.visibleText, 310), 54, 160, 1165, 214, 19, C.ink);
  rule(slide, 54, 393, 1168, C.line, 1);
  const items = (data.sections || []).slice(0, 3);
  const gap = 30; const width = (1168 - gap * 2) / 3;
  items.forEach((item, index) => {
    const x = 54 + index * (width + gap);
    addText(slide, String(index + 1).padStart(2, '0'), x, 418, 35, 24, 13, section.color, true);
    addText(slide, compact(item, 62), x, 452, width, 112, 18, C.ink, true);
  });
  addTakeaway(slide, firstSentence(data.visibleText), section.color);
  addSource(slide, `Official paper · ${host(paper.source)} · ${paper.venue}`, page);
  addNotes(slide, paper.notes.positioning);
}

async function paperOverview(deck, paper, paperIndex, page) {
  const slide = deck.slides.add(); const section = paperHeader(slide, paper, paperIndex, page, 'overviewFigure');
  const data = paper.slides.overviewFigure;
  const figureMeta = figures.get(paper.id);
  if (figureMeta?.orientation === 'portrait') {
    const figure = await addFigure(slide, paper, 54, 158, 430, 440);
    addText(slide, '读图顺序', 522, 160, 700, 30, 23, section.color, true);
    (data.numberedExplanations || []).slice(0, 5).forEach((item, index) => {
      const y = 204 + index * 57;
      addText(slide, String(index + 1).padStart(2, '0'), 522, y, 28, 22, 13, section.color, true);
      addText(slide, compact(String(item).replace(/^[①②③④⑤⑥⑦⑧]\s*/, ''), 74), 560, y - 4, 650, 51, 16.5, C.ink);
    });
    addShape(slide, 522, 500, 700, 99, section.key === 'SPEECH' ? C.speechSoft : C.panel, 'none');
    addText(slide, compact(data.visibleText, 132), 538, 511, 668, 77, 16, C.muted);
    addTakeaway(slide, firstSentence(data.visibleText), section.color, false, 615);
    addSource(slide, `${figure.figureNumber} · PDF p.${figure.pageNumber} · ${host(figure.sourceUrl)} · 原始论文图`, page);
    addNotes(slide, paper.notes.overviewFigure);
    return;
  }
  const imageLeft = paperIndex % 2 === 0;
  const imageX = imageLeft ? 54 : 488;
  const textX = imageLeft ? 842 : 54;
  const figure = await addFigure(slide, paper, imageX, 166, 730, 344);
  addText(slide, '读图顺序', textX, 166, 384, 30, 23, section.color, true);
  (data.numberedExplanations || []).slice(0, 4).forEach((item, index) => {
    const y = 207 + index * 70;
    addText(slide, String(index + 1).padStart(2, '0'), textX, y, 28, 22, 13, section.color, true);
    addText(slide, compact(String(item).replace(/^[①②③④⑤⑥⑦⑧]\s*/, ''), 48), textX + 38, y - 4, 344, 62, 17, C.ink);
  });
  addShape(slide, 54, 524, 1168, 77, section.key === 'SPEECH' ? C.speechSoft : C.panel, 'none');
  addText(slide, compact(data.visibleText, 180), 70, 535, 1135, 56, 16.5, C.muted);
  addTakeaway(slide, firstSentence(data.visibleText), section.color, false, 615);
  addSource(slide, `${figure.figureNumber} · PDF p.${figure.pageNumber} · ${host(figure.sourceUrl)} · 原始论文裁图`, page);
  addNotes(slide, paper.notes.overviewFigure);
}

function paperMechanism(deck, paper, paperIndex, page) {
  const slide = deck.slides.add(); const section = paperHeader(slide, paper, paperIndex, page, 'mechanism');
  const data = paper.slides.mechanism;
  const modules = (data.modules || []).slice(0, 5);
  const gap = 16; const width = (1168 - gap * (modules.length - 1)) / Math.max(1, modules.length);
  modules.forEach((item, index) => {
    const x = 54 + index * (width + gap);
    addText(slide, String(index + 1).padStart(2, '0'), x, 167, width, 22, 13, section.color, true);
    rule(slide, x, 199, width, section.color, 3);
    addText(slide, compact(item, 47), x, 216, width, 116, 17, C.ink, true);
    if (index < modules.length - 1) addText(slide, '→', x + width + 2, 241, 12, 28, 20, C.faint, true, 'center');
  });
  rule(slide, 54, 350, 1168, C.line, 1);
  addText(slide, '机制解释', 54, 374, 165, 31, 24, section.color, true);
  addText(slide, compact(data.visibleText, 240), 232, 370, 990, 126, 17, C.ink);
  addShape(slide, 54, 511, 1168, 91, C.panel, C.line, 'rect', 1);
  addText(slide, '训练信号', 72, 530, 145, 30, 22, C.semg, true);
  addText(slide, compact(data.lossExplanation, 150), 225, 526, 975, 64, 17, C.ink);
  addTakeaway(slide, `机制边界：${firstSentence(data.lossExplanation, 68)}`, section.color, false, 615);
  addSource(slide, `Methods · ${host(paper.pdfSource)} · terms preserved from the paper`, page);
  addNotes(slide, paper.notes.mechanism);
}

function paperEvidence(deck, paper, paperIndex, page) {
  const slide = deck.slides.add(); const section = paperHeader(slide, paper, paperIndex, page, 'evidence');
  const data = paper.slides.evidence;
  const groups = [
    ['数据与协议', data.datasets], ['指标与结论', data.metrics],
    ['消融与稳健性', data.ablations], ['限制与外推边界', data.limits]
  ];
  const fourColumns = paperIndex % 2 === 1;
  groups.forEach((group, index) => {
    if (fourColumns) {
      addColumn(slide, group[0], group[1], 54 + index * 292, 162, 252, 302, index === 3 ? C.semg : section.color, 16.5);
    } else {
      const x = 54 + (index % 2) * 586;
      const y = 160 + Math.floor(index / 2) * 170;
      addColumn(slide, group[0], group[1], x, y, 550, 145, index === 3 ? C.semg : section.color, 16.5);
    }
  });
  addShape(slide, 54, 495, 1168, 105, C.panel, 'none');
  addText(slide, compact(data.visibleText, 220), 70, 506, 1135, 84, 16.5, C.ink);
  addTakeaway(slide, `证据判断：${firstSentence(data.visibleText, 72)}`, section.color, false, 615);
  addSource(slide, `Evidence and ablations · ${host(paper.pdfSource)} · metrics interpreted per task`, page);
  addNotes(slide, paper.notes.evidence);
}

function paperTransfer(deck, paper, paperIndex, page) {
  const slide = deck.slides.add(); const section = paperHeader(slide, paper, paperIndex, page, 'transfer');
  const data = paper.slides.transfer;
  const leftWidth = paperIndex % 2 === 0 ? 520 : 420;
  const rightX = 54 + leftWidth + 40;
  const rightWidth = 1168 - leftWidth - 40;
  addColumn(slide, '可借鉴', data.borrow, 54, 164, leftWidth, 143, section.color, 16.5);
  addColumn(slide, '避免照搬', data.avoid, 54, 318, leftWidth, 143, C.semg, 16.5);
  addText(slide, '建议优先完成的实验', rightX, 164, rightWidth, 32, 24, section.color, true);
  rule(slide, rightX, 207, rightWidth, C.line, 1);
  (data.experiments || []).slice(0, 4).forEach((item, index) => {
    const y = 224 + index * 62;
    addText(slide, `E${index + 1}`, rightX, y, 42, 25, 15, index === 3 ? C.semg : section.color, true);
    addText(slide, compact(String(item).replace(/^E\d+[：:]\s*/, ''), 60), rightX + 50, y - 4, rightWidth - 50, 54, 17, C.ink);
  });
  addShape(slide, 54, 485, 1168, 115, section.key === 'SPEECH' ? C.speechSoft : C.panel, 'none');
  addText(slide, compact(data.visibleText, 235), 70, 497, 1135, 92, 16.5, C.ink);
  addTakeaway(slide, `迁移结论：${firstSentence(data.visibleText, 70)}`, section.color, false, 615);
  addSource(slide, `Transfer analysis based on ${paper.title} · ${host(paper.source)}`, page);
  addNotes(slide, paper.notes.transfer);
}

function synthPrinciples(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '跨模态综合', C.speech); addTitle(slide, '25 篇工作收敛到五条可迁移设计原则', '从方法库存到目标域决策');
  const rows = [
    ['表示', '连续 token 是保真基线；离散 codebook 是需验证的信息瓶颈'],
    ['结构', '局部波形、空间协同与长程动作上下文分层建模'],
    ['目标', '重建保细节，teacher/运动学定方向，对比定义跨域不变量'],
    ['数据', '独立主体、日期、设备与动作覆盖比重叠窗口数更重要'],
    ['证据', '双任务与真实域偏移必须在同一 encoder 上同时成立']
  ];
  rows.forEach((row, index) => {
    const y = 158 + index * 85;
    addText(slide, String(index + 1).padStart(2, '0'), 54, y, 52, 28, 15, index === 4 ? C.semg : C.speech, true);
    addText(slide, row[0], 122, y, 155, 34, 24, C.ink, true);
    addText(slide, row[1], 290, y, 920, 56, 21, C.muted);
    rule(slide, 54, y + 61, 1168, C.line, 1);
  });
  addTakeaway(slide, '方法创新只有通过目标域证据链，才会变成前臂运动基座模型贡献。', C.semg);
  addNotes(slide, `跨模态综合不寻找唯一网络，而是提炼五条原则。连续表示先保证保真；离散码本作为可控瓶颈；结构分离局部、空间和上下文；目标函数分别承担细节、方向和不变量；数据扩展按独立多样性而非窗口数；最终证据必须在离散手势和连续运动、跨人跨日跨佩戴条件下同时成立。${sourceBlock(papers.map((paper) => paper.source))}`);
}

function synthTargetMap(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '跨模态综合', C.speech); addTitle(slide, '同样叫“掩蔽”，预测目标决定模型学到什么', '跨模态预训练目标对照');
  const rows = [
    ['waveform', '局部数值与相位', '连续控制', '噪声/平滑插值', '连续保真主目标'],
    ['spectrum / envelope', '形态与频带能量', '跨设备稳定', '相位与快速边界丢失', '中尺度辅助目标'],
    ['teacher latent', '上下文抽象表征', '低标签迁移', '教师捷径与坍塌', '连续语义主目标'],
    ['discrete token', '可组合 motif', '手势/序列', '量化误差与死码', '受控离散消融'],
    ['future distribution', '运动动态与不确定性', '连续预测', '时延与生成偏差', '运动学方向目标']
  ];
  const x = [54, 260, 552, 824, 1055]; const w = [180, 260, 240, 205, 165];
  ['目标', '主要保留', '最适合', '风险', 'sEMG 角色'].forEach((header, index) => addText(slide, header, x[index], 160, w[index], 28, 18, index === 4 ? C.semg : C.speech, true));
  rule(slide, 54, 198, 1168, C.ink, 2);
  rows.forEach((row, r) => {
    const y = 214 + r * 71;
    row.forEach((value, index) => addText(slide, value, x[index], y, w[index], 54, index === 0 ? 19 : 16.5, index === 4 ? C.semg : (index === 0 ? C.ink : C.muted), index === 0 || index === 4));
    rule(slide, 54, y + 57, 1168, C.line, 1);
  });
  addTakeaway(slide, '目标方案以 waveform/teacher latent 为核心，spectrum、discrete token 与 future distribution 为增量。', C.semg);
  addNotes(slide, `不同论文中的 mask 不能视为同一方法。原波形恢复强调局部保真，频谱和包络强调形态，teacher latent 预测强调上下文语义，离散 token 预测强调可组合原语，未来分布预测强调运动不确定性。面向 sEMG，连续双目标应先建立，随后通过受控消融加入频谱、码本和未来分布，避免多损失一次堆叠。${sourceBlock([papers[0]?.source, papers[2]?.source, papers[3]?.source, papers[7]?.source, papers[19]?.source])}`);
}

function synthTokenizer(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '目标方案', C.semg); addTitle(slide, '1 kHz sEMG tokenizer 采用三时间尺度与显式物理坐标', '先连续，后验证 VQ');
  const scales = [
    ['20–50 ms', '运动单位叠加与快速边界', '时域卷积连续 token'],
    ['100–250 ms', '收缩包络、频谱与跨通道协同', '时域 + log-spectrum 双路'],
    ['0.5–2 s', '手势和连续轨迹上下文', '环形空间 × 时间 Transformer']
  ];
  scales.forEach((row, index) => {
    const y = 170 + index * 112;
    addText(slide, row[0], 54, y, 195, 38, 28, index === 2 ? C.semg : C.accent, true);
    addText(slide, row[1], 270, y, 410, 54, 21, C.ink, true);
    addText(slide, row[2], 708, y, 335, 54, 19, C.muted);
    rule(slide, 54, y + 72, 980, C.line, 1);
  });
  addShape(slide, 1064, 170, 158, 300, C.orangeSoft, C.semg, 'rect', 1);
  addText(slide, 'VQ 消融', 1078, 193, 130, 30, 21, C.semg, true, 'center');
  addText(slide, '256\n1,024\n4,096\n8,192', 1093, 245, 100, 150, 26, C.ink, true, 'center');
  addText(slide, 'perplexity\n死码率\n跨域稳定', 1078, 402, 130, 58, 15.5, C.muted, false, 'center');
  addText(slide, '空间元数据：腕带圆周角、沿前臂位置、左右手、极性与设备；增强采用循环移位、通道掉线和物理镜像。', 54, 525, 1150, 72, 22, C.ink, true);
  addTakeaway(slide, 'codebook 大小不是容量竞赛，要用连续运动误差和跨日稳定性共同选择。', C.semg);
  addNotes(slide, `推荐三尺度 tokenizer。20–50 ms 保留局部放电叠加与快速手势边界；100–250 ms 联合时域、包络和局部频谱；0.5–2 s 由环形空间与时间注意力建模动作上下文。空间 token 使用真实几何而非固定通道编号。VQ 分支仅作 256、1024、4096、8192 等容量消融，并报告 perplexity、死码、量化误差、动作互信息和连续运动精度。${sourceBlock([papers[2]?.source, papers[6]?.source, papers[24]?.source])}`);
}

function synthObjectives(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '目标方案', C.semg); addTitle(slide, '一个核心、两个方向、一个可选分支', '每项损失对应一个可证伪问题');
  const rows = [
    ['核心', 'masked modeling', 'raw + envelope + log-spectrum / teacher latent', '保留形态与连续细节'],
    ['方向一', '运动学对齐', '同步 IMU / 关节角 latent 与未来预测', '让表示指向运动结果'],
    ['方向二', '条件一致性', '同动作跨日/旋转/设备正对', '学习真实目标域不变量'],
    ['可选', 'VQ token prediction', '预测 contraction motif ID', '检验离散组合性']
  ];
  rows.forEach((row, index) => {
    const y = 164 + index * 101;
    addText(slide, row[0], 54, y, 116, 32, 20, index === 3 ? C.semg : C.accent, true);
    addText(slide, row[1], 184, y, 250, 40, 23, C.ink, true);
    addText(slide, row[2], 465, y, 445, 58, 19, C.muted);
    addText(slide, row[3], 940, y, 280, 58, 19, C.ink, true);
    rule(slide, 54, y + 73, 1168, C.line, 1);
  });
  addText(slide, '强化学习不进入预训练主干：只有未来闭环策略需要在线奖励优化时再引入。', 54, 574, 1150, 34, 21, C.semg, true);
  addTakeaway(slide, '固定数据、骨干与训练 token，先单目标后组合，才能解释创新来自哪里。', C.semg);
  addNotes(slide, `预训练主干采用多尺度 masked modeling，连续 teacher latent 与波形/包络/频谱共同定义保真；同步 IMU 或关节角提供运动方向；条件对比只在动作语义明确的跨日、跨旋转或跨设备样本上使用；VQ token prediction 为可选。强化学习不是编码器预训练的必要组成，只有闭环策略优化存在可观测奖励与在线交互时才进入后续控制层。${sourceBlock([papers[3]?.source, papers[7]?.source, papers[19]?.source, papers[24]?.source])}`);
}

function synthData(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '目标方案', C.semg); addTitle(slide, '数据规模按“独立多样性”计量，而不是按重叠窗口计量', '1 kHz 产生更多点，不自动产生更多信息');
  addColumn(slide, '主体与佩戴', ['优先增加独立受试者', '多天穿脱、旋转和位移', '腕围、皮肤与接触质量元数据'], 54, 172, 350, 318, C.eeg, 21);
  addColumn(slide, '动作与标签', ['静息、离散手势、连续轨迹', '速度、力度、过渡与共收缩', '同步 IMU、关节角和触碰事件'], 444, 172, 350, 318, C.physio, 21);
  addColumn(slide, '治理与泄漏', ['按 subject/day/device 建语料账本', '坏段、饱和、掉通道和延迟标记', '测试域不得进入无标签预训练'], 834, 172, 388, 318, C.semg, 21);
  addText(slide, '三条 scaling 曲线', 54, 526, 220, 30, 23, C.semg, true);
  addText(slide, '固定总小时改变受试者数；固定 token 数改变日期/动作/设备多样性；固定数据改变 5M / 20M / 80M 参数。', 280, 520, 918, 70, 21, C.ink, true);
  addTakeaway(slide, '有效语料量 = 独立主体 × 佩戴变化 × 运动覆盖，而不是采样点总数。', C.semg);
  addNotes(slide, `1 kHz sEMG 很容易通过重叠滑窗制造巨量 token，但相邻窗口高度相关，不能视为独立数据。语料账本应按受试者、日期、设备、腕带姿态、动作事件和质量层级统计。三条 scaling 曲线分别估计主体数量、数据多样性和模型容量的收益。测试受试者、日期和设备不能以无标签形式进入预训练，否则会夸大跨域表现。${sourceBlock([papers[15]?.source, papers[18]?.source, papers[21]?.source, papers[22]?.source])}`);
}

function synthArchitecture(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '目标方案', C.semg); addTitle(slide, '连续—离散双路 encoder，用运动学锚定共享 latent', '部署时只保留 sEMG 主干');
  const nodes = [
    ['1 kHz 多通道\nsEMG', 54, 170], ['三尺度连续\ntokenizer', 268, 170],
    ['环形空间 × 时间\nTransformer', 500, 170], ['共享运动\nlatent', 760, 170],
    ['手势 / 连续 / 序列\n任务头', 1000, 170]
  ];
  const nodeWidths = [190, 190, 220, 190, 190];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    addText(slide, '→', nodes[index][1] + nodeWidths[index] + 6, 207, 32, 34, 26, C.faint, true, 'center');
  }
  nodes.forEach((node, index) => {
    addShape(slide, node[1], node[2], nodeWidths[index], 112, index === 3 ? C.accentSoft : C.panel, index === 3 ? C.accent : C.line, 'rect', index === 3 ? 2 : 1);
    addText(slide, node[0], node[1] + 12, node[2] + 23, nodeWidths[index] - 24, 70, 21, index === 3 ? C.accent : C.ink, true, 'center', 'middle');
  });
  rule(slide, 370, 329, 500, C.semg, 2);
  addText(slide, '训练期辅助', 54, 370, 155, 28, 21, C.semg, true);
  addShape(slide, 268, 366, 220, 83, C.orangeSoft, C.semg, 'rect', 1);
  addText(slide, 'VQ codebook\nmasked token', 282, 381, 192, 54, 19, C.semg, true, 'center');
  addShape(slide, 535, 366, 220, 83, C.panel, C.green, 'rect', 1);
  addText(slide, '运动学 teacher\nfuture distribution', 549, 381, 192, 54, 19, C.green, true, 'center');
  addShape(slide, 802, 366, 220, 83, C.speechSoft, C.speech, 'rect', 1);
  addText(slide, '跨域条件一致性\nsubject leakage audit', 816, 381, 192, 54, 18, C.speech, true, 'center');
  addText(slide, '因果版本用于在线；双向版本用于离线预训练。二者共享 tokenizer 与权重初始化，但严格分开报告延迟。', 54, 511, 1150, 72, 22, C.ink, true);
  addTakeaway(slide, '共享 latent 必须同时保留动作类别和连续运动状态，不能被任何单一头主导。', C.semg);
  addNotes(slide, `主架构从 1 kHz 多通道 sEMG 经三尺度连续 tokenizer 和环形空间×时间 Transformer 得到共享运动 latent，再连接手势分类、连续角度/速度和交互序列头。训练期增加 VQ 码本、运动学 teacher/未来分布和跨域条件一致性，部署时均可移除。因果版本用于在线，双向版本用于离线预训练；必须分别报告延迟，不能以非因果性能替代实时能力。${sourceBlock([papers[3]?.source, papers[4]?.source, papers[19]?.source, papers[24]?.source])}`);
}

function synthEvaluation(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '投稿证据', C.semg); addTitle(slide, '双任务 × 五域偏移 × 四类审计构成主实验矩阵', '顶会主张必须排除 decoder、语言与身份捷径');
  const rows = [
    ['主任务', 'gesture macro-F1 / event F1', 'angle/velocity MAE · corr.', 'sequence CER · latency'],
    ['域偏移', 'held-out subject / day', 'rotation / displacement', 'cross-device / dropout'],
    ['强基线', 'from scratch / supervised', 'continuous masked models', 'discrete AEMG-style'],
    ['表示审计', 'identity/device probe', 'codebook perplexity/dead codes', 'kinematic neighborhood'],
    ['在线压力', 'causal context / delay', 'low SNR / missing channels', 'false activation / drift']
  ];
  rows.forEach((row, r) => {
    const y = 157 + r * 86;
    addText(slide, row[0], 54, y, 165, 31, 20, r === 4 ? C.semg : C.accent, true);
    addText(slide, row[1], 230, y, 310, 58, 17.5, C.ink, true);
    addText(slide, row[2], 556, y, 310, 58, 17.5, C.muted);
    addText(slide, row[3], 884, y, 336, 58, 17.5, C.muted);
    rule(slide, 54, y + 63, 1168, C.line, 1);
  });
  addTakeaway(slide, '随机窗口或单一分类任务领先，不足以支持“前臂运动基座模型”主张。', C.semg);
  addNotes(slide, `主实验矩阵固定同一 encoder 和尽量相同的轻量 decoder，避免更强任务头掩盖预训练贡献。离散、连续与序列任务各有指标；五域偏移独立报告；强基线包含从头、监督人口模型、连续掩蔽模型和 AEMG 式离散模型；表示审计排除身份、设备和码本坍塌；在线压力测试因果时延、低信噪、掉通道、误触与漂移。${sourceBlock(papers.slice(21).map((paper) => paper.source))}`);
}

function synthRoadmap(deck, page) {
  const slide = deck.slides.add(); addChrome(slide, page, '研究路线', C.cyan, true); addTitle(slide, '投稿主线：用受控消融证明运动语义可复用', '从简单强基线到真实交互', true, 40);
  const steps = [
    ['01', '基线', '连续多尺度 masked encoder'],
    ['02', '方向', '运动学 teacher + 跨域条件一致性'],
    ['03', '创新', '连续—离散双路 + 环形几何'],
    ['04', '证据', '双任务 × 五域偏移 × 少样本'],
    ['05', '落地', '因果在线解码、漂移与个性化']
  ];
  steps.forEach((step, index) => {
    const y = 157 + index * 88;
    addText(slide, step[0], 58, y, 55, 27, 15, '#7ED7F2', true);
    addText(slide, step[1], 132, y, 122, 31, 22, '#FFFFFF', true);
    addText(slide, step[2], 278, y, 760, 46, 22, '#DDEBF2');
    rule(slide, 58, y + 58, 1000, '#314252', 1);
  });
  addText(slide, '核心判据', 1081, 174, 130, 28, 18, '#7ED7F2', true, 'right');
  addText(slide, '同一个\nencoder\n同时改善\n手势与\n连续运动', 1073, 226, 140, 236, 28, '#FFFFFF', true, 'right');
  addTakeaway(slide, '先确定数据与连续基线价值，再逐项证明结构、目标和离散分支，最后完成在线证据。', C.cyan, true);
  addNotes(slide, `路线按可证伪性排序。第一阶段建立连续多尺度 masked encoder 和严格数据账本；第二阶段用运动学 teacher 与条件一致性确定运动方向；第三阶段增加环形几何与离散支路；第四阶段完成双任务、五域偏移、少样本和表示审计；第五阶段验证因果在线时延、误触、漂移与个性化。最终主张是同一 encoder 的运动语义跨人、跨日、跨佩戴和跨设备复用，而不是某个单一 benchmark 的最高分。${sourceBlock([papers[0]?.source, papers[7]?.source, papers[21]?.source, papers[24]?.source])}`);
}

async function main() {
  if (papers.length !== 25) throw new Error(`Expected 25 papers, got ${papers.length}`);
  if (figureManifest.length !== 25 || figures.size !== 25) throw new Error(`Expected 25 unique figures, got ${figureManifest.length}/${figures.size}`);
  const deck = Presentation.create({ slideSize:{width:W, height:H} });
  cover(deck);
  introScope(deck, 2);
  introQuestion(deck, 3);
  introTerms(deck, 4);
  introTransfer(deck, 5);
  introMethods(deck, 6);
  introContract(deck, 7);

  let page = 8;
  for (let index = 0; index < papers.length; index += 1) {
    const paper = papers[index];
    for (const kind of PAPER_KINDS) {
      if (!paper.slides?.[kind] || !paper.notes?.[kind]) throw new Error(`${paper.id}: missing ${kind} content`);
    }
    paperPositioning(deck, paper, index, page++);
    await paperOverview(deck, paper, index, page++);
    paperMechanism(deck, paper, index, page++);
    paperEvidence(deck, paper, index, page++);
    paperTransfer(deck, paper, index, page++);
  }

  synthPrinciples(deck, 133);
  synthTargetMap(deck, 134);
  synthTokenizer(deck, 135);
  synthObjectives(deck, 136);
  synthData(deck, 137);
  synthArchitecture(deck, 138);
  synthEvaluation(deck, 139);
  synthRoadmap(deck, 140);

  if (page !== 133) throw new Error(`Paper section ended at page ${page - 1}; expected 132`);
  if (deck.slides.items.length !== TOTAL) throw new Error(`Expected ${TOTAL} slides, got ${deck.slides.items.length}`);
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(OUT);
  const inspect = await deck.inspect({ kind:'slide,textbox,notes,image', maxChars:10_000_000 });
  await fs.writeFile(INSPECT_OUT, inspect.ndjson, 'utf8');
  console.log(`Wrote ${OUT} with ${deck.slides.items.length} slides`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
