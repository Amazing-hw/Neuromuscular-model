import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { paperRecordsExpanded: papers } = require('./paper_records_expanded.js');
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (m) => m.slice(1)));
const root = path.resolve(here, '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'figure_manifest.json'), 'utf8'));
const deckPath = path.join(root, 'deliverables', '生理时序基座模型顶会论文深读_扩展版_2026-09.pptx');
const inspectPath = `${deckPath}.inspect.ndjson`;
const renderDir = deckPath.replace(/\.pptx$/, '');
const kinds = ['positioning', 'overviewFigure', 'mechanism', 'evidence', 'transfer'];
const requireRender = process.argv.includes('--require-render');

const chineseCount = (value) => (String(value).match(/[\u3400-\u9fff]/g) || []).length;
const stripSources = (value) => String(value).replace(/\n?\[Sources\][\s\S]*?\[\/Sources\]\s*$/g, '');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(papers.length === 17, `论文数应为 17，实际 ${papers.length}`);
check(new Set(papers.map((p) => p.id)).size === 17, '论文 id 不唯一');

const perPaper = papers.map((paper) => {
  check(kinds.every((kind) => paper.slides[kind]), `${paper.id}: 缺少五页结构`);
  check(kinds.every((kind) => paper.notes[kind]), `${paper.id}: 缺少五页备注`);
  const visibleChinese = kinds.reduce((sum, kind) => sum + chineseCount(paper.slides[kind]?.visibleText || ''), 0);
  const notesChinese = kinds.reduce((sum, kind) => sum + chineseCount(stripSources(paper.notes[kind] || '')), 0);
  const sourceBlocks = kinds.filter((kind) => /\[Sources\][\s\S]*\[\/Sources\]\s*$/.test(paper.notes[kind] || '')).length;
  check(visibleChinese >= 700, `${paper.id}: 页面正文中文仅 ${visibleChinese}`);
  check(notesChinese >= 1000, `${paper.id}: 备注中文仅 ${notesChinese}`);
  check(sourceBlocks === 5, `${paper.id}: Sources 块数量 ${sourceBlocks}`);
  return { id: paper.id, visibleChinese, notesChinese, sourceBlocks };
});

check(manifest.length === 17, `原图清单应为 17，实际 ${manifest.length}`);
for (const paper of papers) {
  const entry = manifest.find((item) => item.paperId === paper.id);
  check(Boolean(entry?.main?.figureNumber), `${paper.id}: 缺少 figureNumber`);
  check(Number.isInteger(entry?.main?.pageNumber), `${paper.id}: 缺少 PDF pageNumber`);
  check(/^https?:\/\//.test(entry?.main?.sourceUrl || ''), `${paper.id}: 缺少原图 sourceUrl`);
  check(entry?.main?.treatment === 'original', `${paper.id}: 原图 treatment 不是 original`);
  check(fs.existsSync(path.join(here, entry?.main?.localPath || '__missing__')), `${paper.id}: 原图文件不存在`);
}

check(fs.existsSync(deckPath), 'PPTX 不存在');
const lines = fs.readFileSync(inspectPath, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
const slides = lines.filter((item) => item.kind === 'slide');
const notes = lines.filter((item) => item.kind === 'notes');
check(slides.length === 100, `PPTX slide 数应为 100，实际 ${slides.length}`);
check(notes.length === 100, `PPTX notes 数应为 100，实际 ${notes.length}`);
check(notes.every((item) => /\[Sources\][\s\S]*\[\/Sources\]/.test(item.text || '')), '至少一页备注缺少 Sources 块');

const rendered = fs.existsSync(renderDir)
  ? fs.readdirSync(renderDir).filter((name) => /^slide-\d+\.png$/i.test(name))
  : [];
if (requireRender) check(rendered.length === 100, `渲染图应为 100，实际 ${rendered.length}`);

const content = [
  fs.readFileSync(path.join(here, 'paper_records_expanded.js'), 'utf8'),
  fs.readFileSync(path.join(here, 'build_expanded_deck.mjs'), 'utf8'),
].join('\n');
check(!/\b(?:TODO|FIXME|Lorem ipsum|TBD)\b/i.test(content), '发现占位文本 TODO/FIXME/Lorem/TBD');

const summary = {
  deckBytes: fs.statSync(deckPath).size,
  slides: slides.length,
  notes: notes.length,
  papers: papers.length,
  figures: manifest.length,
  renderedPngs: rendered.length,
  minVisibleChinese: Math.min(...perPaper.map((p) => p.visibleChinese)),
  minNotesChinese: Math.min(...perPaper.map((p) => p.notesChinese)),
  maxVisibleChinese: Math.max(...perPaper.map((p) => p.visibleChinese)),
  maxNotesChinese: Math.max(...perPaper.map((p) => p.notesChinese)),
};

console.log(JSON.stringify({ summary, perPaper, failures }, null, 2));
if (failures.length) process.exitCode = 1;
