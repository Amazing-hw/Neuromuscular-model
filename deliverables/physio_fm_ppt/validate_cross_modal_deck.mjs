import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { crossModalPaperRecords: papers } = require('./cross_modal_paper_records.js');
const { speechPaperRecords } = require('./speech_paper_records.js');
const { physioPaperRecords } = require('./physio_paper_records.js');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const NEW_DECK = path.join(ROOT, '生理时序基座模型顶会论文深读_跨模态扩充版_2026-09.pptx');
const INSPECT = `${NEW_DECK}.inspect.ndjson`;
const OLD_DECK = path.join(ROOT, '生理时序基座模型顶会论文深读_扩展版_2026-09.pptx');
const OLD_DECK_SHA256 = '722F374105A60AAEF975F49370B81822A7BFA1367482082087E04DE83EE55258';
const FIGURE_MANIFEST = path.join(HERE, 'cross_modal_figure_manifest.json');
const TOTAL_SLIDES = 140;
const PAPER_KINDS = ['positioning', 'overviewFigure', 'mechanism', 'evidence', 'transfer'];
const EEG_IDS = ['bendr', 'biot', 'labram', 'eegpt_wang', 'cbramod', 'neuript', 'tfm_tokenizer'];
const WEARABLE_IDS = ['apple_wearable', 'moment', 'papagei', 'scaling_wearable', 'sundial', 'm2ae'];
const SEMG_IDS = ['generic_neuromotor', 'emg2pose', 'emg2qwerty', 'aemg'];

const failures = [];
const warnings = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const warn = (condition, message) => { if (!condition) warnings.push(message); };
const chineseCount = (value) => (String(value ?? '').match(/[\u3400-\u9fff]/g) || []).length;
const stripSources = (value) => String(value ?? '').replace(/\n?\[Sources\][\s\S]*?\[\/Sources\]\s*$/g, '');
const hasSourceBlock = (value) => /\[Sources\][\s\S]*\[\/Sources\]\s*$/.test(String(value ?? ''));

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

function loadJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    failures.push(`${label} 无法读取或解析：${error.message}`);
    return [];
  }
}

check(papers.length === 25, `论文数应为 25，实际 ${papers.length}`);
check(new Set(papers.map((paper) => paper.id)).size === 25, '论文 id 不唯一');
check(speechPaperRecords.length === 4, `语音论文应为 4 篇，实际 ${speechPaperRecords.length}`);
check(physioPaperRecords.length === 4, `新增生理论文应为 4 篇，实际 ${physioPaperRecords.length}`);

const expectedOrder = [
  ...EEG_IDS,
  ...speechPaperRecords.map((paper) => paper.id),
  ...physioPaperRecords.map((paper) => paper.id),
  ...WEARABLE_IDS,
  ...SEMG_IDS
];
check(JSON.stringify(papers.map((paper) => paper.id)) === JSON.stringify(expectedOrder),
  `论文顺序不符合 7 EEG → 4 speech → 4 physiology → 6 wearable/general → 4 sEMG`);

const perPaper = papers.map((paper) => {
  check(typeof paper.id === 'string' && paper.id.length > 0, '存在无 id 论文');
  check(typeof paper.title === 'string' && paper.title.length > 0, `${paper.id}: 缺少 title`);
  check(typeof paper.fullTitle === 'string' && paper.fullTitle.length > 0, `${paper.id}: 缺少 fullTitle`);
  check(/^https?:\/\//.test(paper.source || ''), `${paper.id}: source 不是官方 HTTP(S) URL`);
  check(/^https?:\/\//.test(paper.pdfSource || ''), `${paper.id}: pdfSource 不是 HTTP(S) URL`);
  check(PAPER_KINDS.every((kind) => paper.slides?.[kind]), `${paper.id}: 缺少五页 slides 结构`);
  check(PAPER_KINDS.every((kind) => paper.notes?.[kind]), `${paper.id}: 缺少五页 notes 结构`);
  const visibleChinese = PAPER_KINDS.reduce((sum, kind) => sum + chineseCount(paper.slides?.[kind]?.visibleText), 0);
  const notesChinese = PAPER_KINDS.reduce((sum, kind) => sum + chineseCount(stripSources(paper.notes?.[kind])), 0);
  const sourceBlocks = PAPER_KINDS.filter((kind) => hasSourceBlock(paper.notes?.[kind])).length;
  check(visibleChinese >= 700, `${paper.id}: visibleText 中文仅 ${visibleChinese}，低于 700`);
  check(notesChinese >= 1000, `${paper.id}: notes 中文仅 ${notesChinese}，低于 1000`);
  warn(visibleChinese >= 740, `${paper.id}: visibleText 中文 ${visibleChinese}，建议保留到 740+ 以抵御修订缩水`);
  warn(notesChinese >= 1100, `${paper.id}: notes 中文 ${notesChinese}，建议保留到 1100+ 以抵御修订缩水`);
  check(sourceBlocks === 5, `${paper.id}: 仅 ${sourceBlocks}/5 个 notes 含结尾 Sources 块`);
  for (const kind of PAPER_KINDS) {
    const note = String(paper.notes?.[kind] ?? '');
    check(note.includes(paper.source), `${paper.id}/${kind}: Sources 未包含 official landing URL`);
  }
  check(String(paper.notes?.overviewFigure ?? '').includes(paper.pdfSource), `${paper.id}/overviewFigure: Sources 未包含 official PDF URL`);
  const explanations = paper.slides?.overviewFigure?.numberedExplanations;
  check(Array.isArray(explanations) && explanations.length >= 4, `${paper.id}: overviewFigure 读图解释少于 4 项`);
  check(Array.isArray(paper.slides?.mechanism?.modules) && paper.slides.mechanism.modules.length >= 3, `${paper.id}: mechanism modules 少于 3 项`);
  check(Array.isArray(paper.slides?.transfer?.experiments) && paper.slides.transfer.experiments.length >= 3, `${paper.id}: transfer experiments 少于 3 项`);
  return { id:paper.id, visibleChinese, notesChinese, sourceBlocks };
});

const manifest = loadJson(FIGURE_MANIFEST, 'cross_modal_figure_manifest.json');
check(Array.isArray(manifest), 'cross_modal_figure_manifest.json 必须是数组');
check(manifest.length === 25, `原图清单应为 25，实际 ${manifest.length}`);
check(new Set(manifest.map((entry) => entry.paperId)).size === 25, '原图 paperId 不唯一');
check(JSON.stringify(manifest.map((entry) => entry.paperId)) === JSON.stringify(papers.map((paper) => paper.id)), '原图清单顺序必须与 25 篇论文一致');

for (const paper of papers) {
  const entry = manifest.find((item) => item.paperId === paper.id);
  check(Boolean(entry), `${paper.id}: 缺少原图记录`);
  if (!entry) continue;
  const main = entry.main;
  check(Boolean(main?.figureNumber), `${paper.id}: 缺少 main.figureNumber`);
  check(Number.isInteger(main?.pageNumber) && main.pageNumber >= 1, `${paper.id}: main.pageNumber 无效`);
  check(typeof main?.caption === 'string' && main.caption.trim().length > 0, `${paper.id}: 缺少 figure caption`);
  check(main?.sourceUrl === paper.pdfSource, `${paper.id}: figure sourceUrl 与 pdfSource 不一致`);
  check(main?.treatment === 'original', `${paper.id}: figure treatment 不是 original`);
  const imagePath = path.resolve(HERE, main?.localPath || '__missing__');
  const relative = path.relative(HERE, imagePath);
  check(!relative.startsWith('..') && !path.isAbsolute(relative), `${paper.id}: figure localPath 越出构建目录`);
  check(fs.existsSync(imagePath), `${paper.id}: 原图文件不存在 ${main?.localPath}`);
  if (fs.existsSync(imagePath)) {
    check(fs.statSync(imagePath).size > 20_000, `${paper.id}: 原图小于 20KB，可能不可读`);
    const signature = fs.readFileSync(imagePath).subarray(0, 8).toString('hex');
    check(signature === '89504e470d0a1a0a', `${paper.id}: figure-main 不是 PNG`);
  }
}

check(fs.existsSync(OLD_DECK), '旧 100 页 PPTX 不存在，无法验证哈希保持');
if (fs.existsSync(OLD_DECK)) {
  const oldHash = sha256(OLD_DECK);
  check(oldHash === OLD_DECK_SHA256, `旧 100 页 PPTX 哈希变化：${oldHash}`);
}

check(fs.existsSync(NEW_DECK), '跨模态 PPTX 不存在');
check(fs.existsSync(INSPECT), '跨模态 PPTX inspect.ndjson 不存在');

let lines = [];
let inspectRaw = '';
if (fs.existsSync(INSPECT)) {
  inspectRaw = fs.readFileSync(INSPECT, 'utf8').trim();
  try {
    lines = inspectRaw ? inspectRaw.split(/\r?\n/).map((line) => JSON.parse(line)) : [];
  } catch (error) {
    failures.push(`inspect.ndjson 解析失败：${error.message}`);
  }
}
const slides = lines.filter((item) => item.kind === 'slide');
const notes = lines.filter((item) => item.kind === 'notes');
const images = lines.filter((item) => item.kind === 'image');
const textboxes = lines.filter((item) => item.kind === 'textbox');
check(slides.length === TOTAL_SLIDES, `PPTX slide 数应为 ${TOTAL_SLIDES}，实际 ${slides.length}`);
check(notes.length === TOTAL_SLIDES, `PPTX notes 数应为 ${TOTAL_SLIDES}，实际 ${notes.length}`);
check(notes.every((item) => hasSourceBlock(item.text)), '至少一页 PPTX speaker notes 缺少结尾 Sources 块');
check(images.length === 25, `PPTX 应含 25 个论文原图对象，inspect 实际 ${images.length}`);
const pageMarkerCount = textboxes.filter((item) => /\/ 140/.test(String(item.text ?? ''))).length;
check(pageMarkerCount === TOTAL_SLIDES, `页码“/ 140”应出现 ${TOTAL_SLIDES} 次，实际 ${pageMarkerCount}`);

if (fs.existsSync(NEW_DECK)) {
  check(fs.statSync(NEW_DECK).size > 1_000_000, '跨模态 PPTX 小于 1MB，可能未嵌入图片或导出失败');
}

const sourceFiles = [
  'cross_modal_paper_records.js', 'speech_paper_records.js', 'physio_paper_records.js',
  'paper_records_expanded.js', 'build_cross_modal_deck.mjs'
].map((name) => path.join(HERE, name)).filter(fs.existsSync);
const sourceText = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
check(!/\b(?:TODO|FIXME|TBD|Lorem ipsum|xxxx)\b/i.test(sourceText), '源码或论文记录中发现占位文本');

const summary = {
  papers: papers.length,
  chapterCounts: { eeg:7, speech:speechPaperRecords.length, physiology:physioPaperRecords.length, wearableGeneral:6, semg:4 },
  figures: manifest.length,
  slides: slides.length,
  notes: notes.length,
  images: images.length,
  pageMarkers: pageMarkerCount,
  oldDeckSha256: fs.existsSync(OLD_DECK) ? sha256(OLD_DECK) : null,
  newDeckBytes: fs.existsSync(NEW_DECK) ? fs.statSync(NEW_DECK).size : 0,
  minVisibleChinese: perPaper.length ? Math.min(...perPaper.map((paper) => paper.visibleChinese)) : 0,
  minNotesChinese: perPaper.length ? Math.min(...perPaper.map((paper) => paper.notesChinese)) : 0
};

console.log(JSON.stringify({ summary, perPaper, warnings, failures }, null, 2));
if (failures.length) process.exitCode = 1;
