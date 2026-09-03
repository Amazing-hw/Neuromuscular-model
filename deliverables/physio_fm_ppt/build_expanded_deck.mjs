import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const require = createRequire(import.meta.url);
const { paperRecordsExpanded: papers } = require('./paper_records_expanded.js');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', '生理时序基座模型顶会论文深读_扩展版_2026-09.pptx');
const figureManifest = JSON.parse(await fs.readFile(path.join(HERE, 'figure_manifest.json'), 'utf8'));
const figures = Object.fromEntries(figureManifest.map((x) => [x.paperId, x.main]));

const W = 1280, H = 720;
const C = {
  canvas:'#FFFFFF', ink:'#0B1118', muted:'#52606D', faint:'#8794A1', panel:'#F1F3F5',
  line:'#C8CDD3', accent:'#1888C9', accentSoft:'#D9F1FC', cyan:'#5AC8E8',
  orange:'#E77B2E', orangeSoft:'#FBE8D9', red:'#B44747', green:'#347A5E', dark:'#111A24'
};
const FONT_CN = 'Microsoft YaHei';
const FONT_EN = 'Arial';

function shape(slide, x, y, w, h, fill='none', lineFill='none', geometry='rect', lineWidth=0) {
  return slide.shapes.add({ geometry, position:{left:x,top:y,width:w,height:h}, fill,
    line:{style:'solid',fill:lineFill,width:lineWidth} });
}
function text(slide, value, x, y, w, h, size=21, color=C.ink, bold=false, align='left', valign='top', name) {
  const s = slide.shapes.add({ geometry:'textbox', name, position:{left:x,top:y,width:w,height:h},
    fill:'none', line:{style:'solid',fill:'none',width:0} });
  s.text = value;
  s.text.style = { fontSize:size, color, bold, alignment:align, verticalAlignment:valign,
    typeface:FONT_CN, autoFit:'none', wrap:'square', lineSpacing:1.08,
    insets:{left:0,right:0,top:0,bottom:0} };
  return s;
}
function rule(slide, x, y, w, fill=C.line, height=1) { return shape(slide,x,y,w,height,fill,fill,'rect',0); }
function notes(slide, value) { slide.speakerNotes.textFrame.setText(value); slide.speakerNotes.setVisible(true); }
function sources(urls) { return `\n[Sources]\n${urls.map((u)=>`- ${u}`).join('\n')}\n[/Sources]`; }
function short(s, n=46) { const t=String(s).replace(/\s+/g,' ').trim(); return t.length>n ? `${t.slice(0,n-1)}…` : t; }
function fitPaperTitle(s, limit=22) {
  const t=String(s).replace(/\s+/g,' ').trim(); let units=0,out='';
  for(const ch of t){ const u=/[\u3400-\u9fff]/.test(ch)?1:0.55; if(units+u>limit) return `${out.trim()}…`; out+=ch; units+=u; }
  return out;
}
function host(url) { try { return new URL(url).hostname.replace(/^www\./,''); } catch { return url; } }
function sectionColor(id) {
  const idx = papers.findIndex((p)=>p.id===id);
  if (idx < 7) return '#247BA0';
  if (idx < 14) return '#3C8D72';
  return '#C96A32';
}
function addPageChrome(slide, page, label, accent=C.accent, dark=false) {
  slide.background.fill = dark ? C.dark : C.canvas;
  shape(slide,0,0,W,8,accent,accent);
  text(slide,label.toUpperCase(),54,23,760,22,13,dark?'#BBD6E5':accent,true);
  text(slide,`${String(page).padStart(3,'0')} / 100`,1120,23,104,22,13,dark?'#A9BBC6':C.faint,true,'right');
  rule(slide,54,681,1170,dark?'#314252':C.line,1);
  text(slide,'生理时序基座模型｜1 kHz 前臂与腕部 sEMG 运动交互',54,691,790,16,11,dark?'#A9BBC6':C.faint,false);
}
function addTitle(slide, titleValue, kicker, dark=false) {
  if (kicker) text(slide,kicker,54,55,1110,24,16,dark?'#7ED7F2':C.accent,true);
  text(slide,titleValue,54,83,1170,62,46,dark?'#FFFFFF':C.ink,true,'left','top','slide-title');
}
function addCompactTitle(slide, titleValue, kicker, dark=false, size=38) {
  if (kicker) text(slide,kicker,54,55,1110,24,16,dark?'#7ED7F2':C.accent,true);
  text(slide,titleValue,54,83,1170,56,size,dark?'#FFFFFF':C.ink,true,'left','top','slide-title');
}
function addTakeaway(slide, value, y=625, accent=C.accent, dark=false) {
  rule(slide,54,y,10,accent,4);
  text(slide,short(value,52),78,y-8,1118,34,20,dark?'#E6F1F6':C.ink,true,'left','middle');
}
function addSourceLabel(slide, value, y=662, dark=false) {
  text(slide,value,54,y,1110,15,11,dark?'#A9BBC6':C.faint,false);
}
function addBullets(slide, list, x, y, w, rowH=62, size=21, accent=C.accent) {
  list.forEach((b,i)=>{
    shape(slide,x,y+i*rowH+8,8,8,accent,accent,'ellipse');
    text(slide,b,x+22,y+i*rowH,w-22,rowH-4,size,C.ink,false);
  });
}
function addFlatColumn(slide, titleValue, items, x, y, w, h, accent=C.accent, size=19) {
  text(slide,titleValue,x,y,w,34,25,accent,true);
  rule(slide,x,y+42,w,C.line,1);
  const show=items.slice(0,Math.min(items.length,3));
  const row=Math.max(46,Math.floor((h-52)/show.length));
  const maxChars = h < 180 ? (w < 460 ? 31 : 44) : (w < 300 ? 45 : 64);
  show.forEach((it,i)=>{
    text(slide,String(i+1).padStart(2,'0'),x,y+57+i*row,28,24,13,C.faint,true);
    text(slide,short(it,maxChars),x+36,y+53+i*row,w-36,row-6,size,C.ink,false);
  });
}
function addPaperChrome(slide,p,page,kind) {
  const accent=sectionColor(p.id);
  addPageChrome(slide,page,`${p.venue} · ${p.title} · ${kind}`,accent,false);
  text(slide,`${p.fullTitle} · ${p.status}`,54,55,1110,24,16,C.accent,true);
  text(slide,fitPaperTitle(p.slides[kind].title),54,83,1170,56,40,C.ink,true,'left','top','slide-title');
  return accent;
}
async function addFigure(slide, p, x, y, w, h) {
  const fp=path.join(HERE,'assets','papers',p.id,'figure-main.png');
  const bytes=await fs.readFile(fp);
  shape(slide,x-8,y-8,w+16,h+16,'#FFFFFF',C.line,'rect',1);
  slide.images.add({blob:bytes,contentType:'image/png',alt:`${p.title} core model figure`,fit:'contain',position:{left:x,top:y,width:w,height:h}});
}

function coverSlide(deck) {
  const s=deck.slides.add(); addPageChrome(s,1,'RESEARCH LANDSCAPE · 2021—2026',C.cyan,true);
  text(s,'生理时序基座模型',58,122,900,84,68,'#FFFFFF',true);
  text(s,'17 篇顶会/高影响力论文深读',58,211,900,72,51,'#D9F1FC',true);
  text(s,'EEG → wearable biosignals → wrist / forearm sEMG',61,304,790,34,24,'#7ED7F2',true);
  rule(s,60,380,610,'#436071',2);
  text(s,'聚焦离散手势、连续手指/腕部运动与交互序列\n每篇 5 页：定位 · 原图 · 机制 · 证据 · 迁移',60,408,760,90,25,'#E6F1F6',false);
  text(s,'100',987,160,205,104,82,'#FFFFFF',true,'right');
  text(s,'页可检索研究底稿',944,273,248,28,20,'#A9BBC6',false,'right');
  text(s,'2026.09',60,618,180,28,19,'#7ED7F2',true);
  notes(s,`本报告面向计划开展腕部与前臂 sEMG 基座模型研究的研究者。核心问题不是挑选一个流行的预训练名词，而是建立从信号采集、tokenizer、预训练目标到严格跨域评测的完整证据链。17 篇工作按 EEG 方法、可穿戴/通用时序、直接 sEMG 三层组织；每篇均使用官方论文 PDF 的核心图，并给出迁移到 1 kHz sEMG 的实验建议。${sources([papers[0].source,papers[13].source,papers[16].source])}`);
}
function introClaim(deck,page,titleValue,kicker,claim,columns,noteUrls) {
  const s=deck.slides.add(); addPageChrome(s,page,'研究全景',C.accent,false); addTitle(s,titleValue,kicker);
  text(s,claim,54,171,1160,86,31,C.ink,true);
  const gap=34,w=(1168-gap*(columns.length-1))/columns.length;
  columns.forEach((c,i)=>addFlatColumn(s,c.title,c.items,54+i*(w+gap),301,w,250,i===columns.length-1?C.orange:C.accent,20));
  addTakeaway(s,columns.map(c=>c.takeaway).filter(Boolean).join(' · '),622,C.accent);
  notes(s,`${titleValue}。${claim} 本页用于建立阅读框架，后续所有论文都沿“输入表示—预训练目标—迁移协议—目标域风险”四个问题解释。${sources(noteUrls)}`);
}
function introTerminology(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'术语底座',C.accent,false); addTitle(s,'tokenizer、token 与 codebook：三者不是同义词','先把“离散化”与“切片”分开');
  const rows=[
    ['Tokenizer','把连续信号变成模型可处理序列的完整规则','切窗、卷积、STFT、投影；可连续，也可离散'],
    ['Token','序列中的一个单位或其向量表示','一个 patch embedding，或一个离散 code ID'],
    ['Codebook（码本）','有限个可学习向量组成的离散词表','只有 VQ/量化 tokenizer 才必然需要'],
    ['结论','有 tokenizer 不等于有固定 codebook','MOMENT/CBraMod 连续；LaBraM/AEMG 离散']
  ];
  rows.forEach((r,i)=>{
    const y=171+i*104; text(s,r[0],54,y,235,33,27,i===3?C.orange:C.accent,true);
    text(s,r[1],310,y,410,64,21,C.ink,false); text(s,r[2],750,y,470,64,21,C.muted,false);
    rule(s,54,y+82,1168,C.line,1);
  });
  addTakeaway(s,'本项目先以连续多尺度 tokenizer 建强基线，再把 VQ codebook 作为有假设的第二阶段消融。',620,C.orange);
  notes(s,`Tokenizer 是从原始信号到 token 序列的完整变换，token 是序列单位，codebook 仅属于离散量化路径。连续 patch tokenizer 也会产生 token，但没有有限码本。LaBraM、TFM-Tokenizer 和 AEMG 明确学习离散词表；BENDR、CBraMod、MOMENT 与 Sundial 使用连续 latent。这个区分决定预训练损失是连续重建、对比辨认还是离散 token 分类。${sources([papers[2].source,papers[6].source,papers[8].source,papers[16].source])}`);
}
function introMethods(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'方法地图',C.accent,false); addTitle(s,'主流预训练路线解决的是不同信息瓶颈','不是“对比学习 vs 掩蔽重建”的单选题');
  const methods=[
    ['连续掩蔽','恢复波形/频谱/latent','保留细节；可能重建噪声','BENDR · CBraMod · MOMENT'],
    ['离散预测','预测 codebook token','形成 motif；可能损失连续性','LaBraM · TFM · AEMG'],
    ['对比一致','定义跨视图不变量','泛化强；正对可能形成捷径','Apple · PaPaGei · M2AE'],
    ['未来生成','预测未来分布/运动结果','服务连续控制；需防生理幻觉','Sundial · sEMG→运动学']
  ];
  methods.forEach((m,i)=>{
    const y=165+i*108; text(s,m[0],54,y,205,34,28,i===3?C.orange:C.accent,true);
    text(s,m[1],278,y,292,62,21,C.ink,true); text(s,m[2],587,y,360,62,21,C.muted,false); text(s,m[3],966,y,250,62,18,C.faint,false,'right');
    rule(s,54,y+83,1168,C.line,1);
  });
  addTakeaway(s,'推荐主线：连续 masked modeling 为核心，运动学教师定方向，离散 codebook 与对比关系做受控增量。',620,C.orange);
  notes(s,`四类方法优化的不是同一对象。连续掩蔽保留高分辨率形态；离散预测压缩成可组合 motif；对比学习通过正对定义不变量；生成式未来目标直接建模连续运动的不确定性。面向 sEMG，单一目标容易产生偏置，因此后续方案采用主次分明的组合，并用相同数据、参数量和下游协议消融。${sources([papers[0].source,papers[2].source,papers[7].source,papers[11].source])}`);
}
function introTimeline(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'领域演进',C.accent,false); addTitle(s,'2021—2026：从大语料表征到模态词表与真实交互','17 篇工作按证据角色排序');
  const groups=[
    ['2021—23','连续潜表示与跨生理接口','BENDR · BIOT'],
    ['2024','EEG 预训练、规模可穿戴与真实 sEMG 数据','LaBraM · EEGPT · Apple · MOMENT · emg2pose · emg2qwerty'],
    ['2025','结构先验、形态目标、标度律与通用接口','CBraMod · NeurIPT · PaPaGei · Scaling · Sundial · Nature neuromotor'],
    ['2026','离散 motif 与跨模态新阶段','TFM-Tokenizer · M2AE（preprint）· AEMG']
  ];
  const y=190; rule(s,94,y+74,1080,C.line,2);
  groups.forEach((g,i)=>{
    const x=54+i*300; shape(s,x+30,y+66,18,18,i===3?C.orange:C.accent,i===3?C.orange:C.accent,'ellipse');
    text(s,g[0],x,y,250,38,30,i===3?C.orange:C.accent,true);
    text(s,g[1],x,y+111,255,66,22,C.ink,true); text(s,g[2],x,y+191,255,145,19,C.muted,false);
  });
  addTakeaway(s,'真正的空缺仍在：同一个 sEMG encoder 是否能同时支持离散手势和连续运动，并跨人、跨日、跨佩戴。',620,C.orange);
  notes(s,`该时间线不是按影响力排序，而是按本报告的学习路径排序。早期工作建立自监督表示与统一接口；2024 年同时出现大脑模型、可穿戴规模学习和两套大规模腕部 sEMG 资源；2025 年开始系统处理空间结构、专家异质性、模态形态和 scaling；2026 年的 TFM-Tokenizer 与 AEMG 把离散 motif 推向更直接的生理和动作词表。M2AE 为预印本，单独标注。${sources(papers.map(p=>p.source))}`);
}
function introTarget(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'目标域合同',C.orange,false); addTitle(s,'1 kHz sEMG：同时约束语义、泛化与实时性','读每篇论文时都用同一把尺');
  const axes=[
    ['任务','离散手势 macro-F1\n连续角度/速度 MAE 与相关\n交互序列 CER / event rate'],
    ['域偏移','held-out subject / day\nrotation / displacement\ndevice / channel dropout'],
    ['效率','因果上下文与端到端延迟\n参数量、吞吐、显存\n少样本个性化曲线'],
    ['可信性','身份/设备泄漏探测\n码本利用率与死码\n每动作/阶段/质量分层']
  ];
  axes.forEach((a,i)=>{const x=54+i*292; text(s,a[0],x,176,245,38,28,i<2?C.accent:C.orange,true); rule(s,x,222,250,C.line,1); text(s,a[1],x,246,248,210,22,C.ink,false);});
  text(s,'最低合格线',54,514,220,34,25,C.orange,true); text(s,'预训练收益必须在相同数据、相同 decoder、严格受试者隔离下成立，并同时覆盖离散与连续任务。',286,509,900,70,25,C.ink,true);
  addTakeaway(s,'后续 17 篇的“迁移”页都给出可直接实施的 E1–E4 实验。',622,C.orange);
  notes(s,`目标域合同把用户的研究目标转成可验收指标。离散手势和连续运动同等重要；域偏移不是附加鲁棒性，而是主测试集；实时效率决定能否用于交互；可信性用于排除身份、设备和 session 记忆。emg2pose、emg2qwerty 与 Nature neuromotor interface 提供连续、序列和闭环三种关键参照。${sources([papers[13].source,papers[14].source,papers[15].source])}`);
}

function paperPositioning(deck,p,page) {
  const s=deck.slides.add(); const accent=addPaperChrome(s,p,page,'positioning'); const d=p.slides.positioning;
  text(s,d.visibleText,54,161,1165,219,20,C.ink,false);
  rule(s,54,397,1168,C.line,1);
  const gap=28,w=(1168-gap*(d.sections.length-1))/d.sections.length;
  d.sections.forEach((it,i)=>{
    const x=54+i*(w+gap); text(s,String(i+1).padStart(2,'0'),x,420,38,25,14,accent,true);
    text(s,short(it,50),x,453,w,105,19,C.ink,true);
  });
  addTakeaway(s,`定位判断：${short(d.visibleText.split('。').slice(-2,-1)[0] || d.visibleText,62)}`,611,accent);
  addSourceLabel(s,`Official paper: ${host(p.source)} · ${p.venue}`);
  notes(s,p.notes.positioning);
}
async function paperFigure(deck,p,page,index) {
  const s=deck.slides.add(); const accent=addPaperChrome(s,p,page,'overviewFigure'); const d=p.slides.overviewFigure; const f=figures[p.id];
  const imageLeft=index%2===0; const ix=imageLeft?54:500, tx=imageLeft?842:54, iw=724, tw=382;
  await addFigure(s,p,ix,166,iw,322);
  text(s,'读图顺序',tx,166,tw,32,24,accent,true);
  d.numberedExplanations.slice(0,3).forEach((it,i)=>{
    text(s,String(i+1).padStart(2,'0'),tx,211+i*78,30,22,13,accent,true);
    text(s,short(it.replace(/^[①②③④⑤⑥]\s*/,''),46),tx+38,207+i*78,tw-38,68,18,C.ink,false);
  });
  shape(s,54,497,1168,108,C.panel,C.panel); text(s,d.visibleText,70,507,1136,88,17,C.muted,false);
  addTakeaway(s,short(d.visibleText.split('。')[0],46),615,accent);
  addSourceLabel(s,`${f.figureNumber} · PDF p.${f.pageNumber} · ${host(f.sourceUrl)} · 原始论文裁图`);
  notes(s,p.notes.overviewFigure);
}
function paperMechanism(deck,p,page) {
  const s=deck.slides.add(); const accent=addPaperChrome(s,p,page,'mechanism'); const d=p.slides.mechanism;
  const n=d.modules.length,gap=16,x0=54,total=1168,w=(total-gap*(n-1))/n;
  d.modules.forEach((it,i)=>{
    const x=x0+i*(w+gap); if(i<n-1) text(s,'→',x+w+2,212,12,32,22,C.faint,true,'center');
    text(s,String(i+1).padStart(2,'0'),x,170,w,22,13,accent,true);
    rule(s,x,201,w,accent,3); text(s,short(it,43),x,218,w,112,18,C.ink,true);
  });
  rule(s,54,350,1168,C.line,1);
  text(s,'模型为何有效',54,373,190,32,25,accent,true); text(s,d.visibleText,245,371,977,133,17.5,C.ink,false);
  shape(s,54,515,1168,86,C.panel,C.line,'rect',1); text(s,'训练信号',72,533,152,30,23,C.orange,true);
  text(s,d.lossExplanation,239,529,963,60,18,C.ink,false);
  addTakeaway(s,`机制边界：${short(d.lossExplanation,48)}`,615,accent); addSourceLabel(s,`Methods summarized from ${host(p.pdfSource)} · ${p.venue}`);
  notes(s,p.notes.mechanism);
}
function paperEvidence(deck,p,page,index) {
  const s=deck.slides.add(); const accent=addPaperChrome(s,p,page,'evidence'); const d=p.slides.evidence;
  const groups=[['数据与协议',d.datasets],['指标与结论',d.metrics],['关键消融',d.ablations],['限制与风险',d.limits]];
  if(index%2===0){
    groups.forEach((g,i)=>{const x=54+(i%2)*586,y=164+Math.floor(i/2)*183; addFlatColumn(s,g[0],g[1],x,y,550,154,i===3?C.orange:accent,16.5);});
  } else {
    groups.forEach((g,i)=>{const x=54+i*292; addFlatColumn(s,g[0],g[1],x,164,252,330,i===3?C.orange:accent,16.5);});
  }
  shape(s,54,485,1168,120,C.panel,C.panel); text(s,d.visibleText,70,497,1136,98,17,C.ink,false);
  addTakeaway(s,`证据判断：${short(d.visibleText.split('。')[0],68)}`,615,accent); addSourceLabel(s,`Evidence and ablations: ${host(p.pdfSource)} · 指标按原文任务分别解读`);
  notes(s,p.notes.evidence);
}
function paperTransfer(deck,p,page,index) {
  const s=deck.slides.add(); const accent=addPaperChrome(s,p,page,'transfer'); const d=p.slides.transfer;
  const leftWide=index%2===0; const lw=leftWide?530:410, rw=1168-lw-40;
  addFlatColumn(s,'可借鉴',d.borrow.map(x=>short(x,40)),54,166,lw,145,accent,16.5);
  addFlatColumn(s,'避免照搬',d.avoid.map(x=>short(x,40)),54,326,lw,145,C.orange,16.5);
  text(s,'建议优先完成的消融',54+lw+40,166,rw,34,25,accent,true); rule(s,54+lw+40,208,rw,C.line,1);
  d.experiments.forEach((it,i)=>{
    text(s,`E${i+1}`,54+lw+40,230+i*66,40,26,16,i===3?C.orange:accent,true);
    text(s,short(it.replace(/^E\d：/,''),50),54+lw+90,225+i*62,rw-90,53,18,C.ink,false);
  });
  shape(s,54,485,1168,120,index%2===0?C.panel:C.accentSoft,'none'); text(s,d.visibleText,70,497,1136,98,17,C.ink,false);
  addTakeaway(s,`迁移结论：${short(d.visibleText.split('。')[0],66)}`,615,accent); addSourceLabel(s,`Transfer analysis based on ${p.title} · ${host(p.source)}`);
  notes(s,p.notes.transfer);
}

function synthMatrix(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'横向综合',C.orange,false); addCompactTitle(s,'横向比较：没有单一最优预训练，只有目标域匹配组合','17 篇工作压缩成决策矩阵');
  const rows=[
    ['连续 masked','BENDR / CBraMod / MOMENT','保留波形与连续运动','可能重建噪声','主干基线'],
    ['离散 codebook','LaBraM / TFM / AEMG','motif 与少样本分类','量化损失与死码','第二阶段'],
    ['对比一致性','Apple / PaPaGei / M2AE','跨日/跨模态不变性','身份与设备捷径','条件辅助'],
    ['概率未来','Sundial','连续运动不确定性','生成幻觉与延迟','回归辅助'],
    ['规模/系统','Scaling / Nature / emg2pose / qwerty','真实泛化与闭环','复现成本','评测合同']
  ];
  const x=[54,244,543,820,1060], widths=[170,280,258,220,162];
  ['路线','代表工作','最强价值','主要风险','建议角色'].forEach((h,i)=>text(s,h,x[i],162,widths[i],28,19,i===4?C.orange:C.accent,true));
  rule(s,54,201,1168,C.ink,2);
  rows.forEach((r,ri)=>{const y=220+ri*72; r.forEach((v,i)=>text(s,v,x[i],y,widths[i],56,i===0?20:17,i===4?C.orange:(i===0?C.ink:C.muted),i===0||i===4)); rule(s,54,y+59,1168,C.line,1);});
  addTakeaway(s,'主模型应以连续表征承载运动细节，再选择性增加 codebook、对比和概率未来头。',620,C.orange);
  notes(s,`矩阵按信息瓶颈而非年份比较 17 篇工作。对本项目，连续 masked modeling 是最稳健起点；AEMG 式离散化是必须击败的直接基线；条件对比用于跨日与跨佩戴；TimeFlow 只服务连续未来分布；规模与资源论文定义数据和评测。${sources([papers[0].source,papers[2].source,papers[7].source,papers[11].source,papers[16].source])}`);
}
function synthTransfer(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'横向综合',C.orange,false); addTitle(s,'可迁移的是设计原则；不可迁移的是模态假设','从 EEG / PPG / 通用时序到 sEMG');
  addFlatColumn(s,'直接保留',['多尺度 patch 与长程上下文','掩蔽策略、teacher latent 与严格消融','按人/天/设备隔离和低标签迁移'],54,171,500,330,C.green,22);
  addFlatColumn(s,'必须重写',['EEG 脑区和频段 → 腕带圆环几何与肌电频谱','PPG 周期形态 → 爆发、协同与电机械延迟','同人正对 → 动作/运动学条件正对'],682,171,540,330,C.orange,22);
  text(s,'关键判断',54,537,180,28,22,C.orange,true); text(s,'任何方法若不能在 held-out subject/day/rotation/device 同时改善手势与连续轨迹，就不应称为目标域基座能力。',238,532,955,66,24,C.ink,true);
  addTakeaway(s,'迁移不是复制网络，而是保留信息约束、替换生理先验。',620,C.orange);
  notes(s,`EEG 贡献时空建模和离散神经 token 的方法学；PPG/ECG 贡献纵向正对、形态辅助和跨模态配对；通用时序贡献简单强基线与 scaling；直接 sEMG 工作定义硬件、动作和闭环。不能迁移的部分包括脑叶、EEG 频段、PPG 周期性以及 participant positive 的身份偏置。${sources([papers[4].source,papers[7].source,papers[9].source,papers[13].source])}`);
}
function synthArchitecture(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'目标方案',C.orange,false); addTitle(s,'推荐主架构：连续—离散双路 sEMG encoder，运动学作为方向锚点','一个骨干服务手势与连续运动');
  const labels=['1 kHz 多通道\nsEMG','多尺度连续\ntokenizer','环形时空\nTransformer','共享运动\nlatent','任务头'];
  const xs=[54,260,500,750,1000], ws=[160,190,190,190,220];
  for(let i=0;i<labels.length-1;i++) text(s,'→',xs[i]+ws[i]+10,246,28,34,26,C.faint,true,'center');
  labels.forEach((l,i)=>{shape(s,xs[i],208,ws[i],112,i===3?C.accentSoft:C.panel,i===3?C.accent:C.line,'rect',i===3?2:1); text(s,l,xs[i]+12,227,ws[i]-24,70,23,i===3?C.accent:C.ink,true,'center','middle');});
  text(s,'辅助离散路',260,360,190,27,20,C.orange,true,'center'); rule(s,326,347,485,C.orange,2);
  shape(s,500,400,190,76,C.orangeSoft,C.orange,'rect',1); text(s,'VQ codebook\nmasked token',512,414,166,50,20,C.orange,true,'center');
  shape(s,750,400,190,76,C.panel,C.line,'rect',1); text(s,'运动学 teacher\n未来分布',762,414,166,50,20,C.green,true,'center');
  const heads=['手势分类','连续角度/速度','交互序列']; heads.forEach((h,i)=>text(s,h,1000,356+i*58,210,44,20,i===1?C.orange:C.ink,true));
  addTakeaway(s,'部署时仅保留 sEMG encoder；IMU / 姿态只在训练期提供特权监督。',615,C.orange);
  notes(s,`推荐架构先以多尺度连续 tokenizer 保留 1 kHz 局部形态，再用环形空间与时间注意力建模协同，输出共享运动 latent。离散 VQ 分支提供可组合 motif，连续分支避免量化破坏角度与速度；运动学 teacher 和未来概率头仅在训练期使用。下游连接手势、连续回归和序列三类轻量头。${sources([papers[3].source,papers[4].source,papers[12].source,papers[16].source])}`);
}
function synthTokenizer(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'目标方案',C.orange,false); addCompactTitle(s,'Tokenizer：先连续多尺度与物理坐标，再验证离散码本','1 kHz sEMG 的时间尺度决定信息是否被保留');
  const scales=[['20–50 ms','局部放电与快速边界','连续卷积 token'],['100–250 ms','收缩形态与跨通道协同','时域 + 局部谱'],['0.5–2 s','完整手势与连续轨迹上下文','Transformer context']];
  scales.forEach((a,i)=>{const y=172+i*116; text(s,a[0],54,y,190,40,29,i===2?C.orange:C.accent,true); text(s,a[1],272,y,375,50,22,C.ink,true); text(s,a[2],682,y,330,50,21,C.muted,false); rule(s,54,y+76,968,C.line,1);});
  shape(s,1045,170,177,310,C.panel,C.line,'rect',1); text(s,'VQ 仅作消融',1062,194,145,33,23,C.orange,true,'center'); text(s,'256\n1,024\n4,096\n8,192',1080,250,110,150,27,C.ink,true,'center'); text(s,'perplexity\n死码率\n跨日一致性',1062,409,145,60,17,C.muted,false,'center');
  text(s,'空间 token 不是固定通道编号：输入腕带圆周角、沿前臂位置、左右手与极性方向；增强使用循环移位和物理镜像。',54,532,965,69,23,C.ink,true);
  addTakeaway(s,'码本是否存在由量化策略决定；有 tokenizer 并不意味着必须有固定 codebook。',620,C.orange);
  notes(s,`推荐三时间尺度。短窗保留快速肌电边界，中窗结合时域与局部频谱，长窗只用于上下文而不重新切碎波形。空间位置应使用腕带角度和沿前臂坐标。VQ 在 256 至 8192 范围做系统消融，必须同时报告量化误差、perplexity、死码、域互信息以及 emg2pose 连续误差。${sources([papers[2].source,papers[6].source,papers[14].source,papers[16].source])}`);
}
function synthObjectives(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'目标方案',C.orange,false); addTitle(s,'预训练目标采用“一个核心、两个方向、一个可选”','让每项损失都能回答一个研究问题');
  const rows=[
    ['核心','Masked modeling','波形 + 包络 + 局部谱 / teacher latent','保留多尺度肌电形态'],
    ['方向 1','运动学对齐','同步 IMU / 关节角的 latent 或未来预测','让表示指向运动结果'],
    ['方向 2','条件一致性','同动作跨日/旋转/设备正对','学习目标域不变量'],
    ['可选','VQ token prediction','预测 contraction motif ID','检验离散组合性']
  ];
  rows.forEach((r,i)=>{const y=170+i*101; text(s,r[0],54,y,110,30,20,i===3?C.orange:C.accent,true); text(s,r[1],178,y,255,32,25,C.ink,true); text(s,r[2],458,y,420,61,20,C.muted,false); text(s,r[3],914,y,300,61,20,C.ink,true); rule(s,54,y+75,1168,C.line,1);});
  text(s,'不建议把强化学习放进预训练主干。',54,574,405,30,22,C.orange,true); text(s,'RL 只在未来闭环控制、策略适应或奖励优化中出现；编码器预训练优先使用可验证的自监督/监督目标。',463,570,755,48,19,C.ink,false);
  addTakeaway(s,'先证明每项损失单独有效，再报告组合；避免“损失堆叠”掩盖真正贡献。',646,C.orange);
  notes(s,`一个核心是多尺度 masked modeling；两个方向是运动学结果对齐与域条件一致性；离散 token prediction 为可选。强化学习不是当前编码器预训练的必要组成，只有闭环控制器需要在线试错或奖励优化时才考虑。实验应从单目标开始，逐项增加并固定训练 token、参数与 decoder。${sources([papers[0].source,papers[7].source,papers[11].source,papers[16].source])}`);
}
function synthData(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'目标方案',C.orange,false); addTitle(s,'数据设计优先扩大“独立多样性”，而不是重复窗口数量','1 kHz 会制造 token，不会自动制造泛化');
  const cols=[
    ['主体与佩戴',['独立受试者优先于同人时长','多天重复穿脱、旋转与位移','左右腕、腕围、接触质量元数据']],
    ['运动覆盖',['静息、孤立手势、连续轨迹','速度、力度、共收缩与过渡','同步 IMU / 关节角 / 触碰事件']],
    ['数据治理',['按 subject/day/device 建语料账本','坏段、饱和、掉通道和延迟标记','测试域不得通过无标签预训练泄漏']]
  ];
  cols.forEach((c,i)=>addFlatColumn(s,c[0],c[1],54+i*390,173,350,335,i===2?C.orange:C.accent,21));
  text(s,'标度实验',54,546,140,30,23,C.orange,true); text(s,'固定总小时改变受试者数；固定 token 数改变动作/日期/佩戴多样性；固定数据改变 5M / 20M / 80M 模型。',205,542,995,65,22,C.ink,true);
  addTakeaway(s,'有效数据量 = 独立主体 × 佩戴变化 × 运动覆盖，而非采样点总数。',623,C.orange);
  notes(s,`Scaling Wearable 说明更大模型只有配合更多有效数据才可靠，Nature neuromotor interface 说明参与者规模对跨人解码关键。1 kHz sEMG 容易通过重叠窗口制造虚假的大数据，因此语料账本要按主体、天次、设备和动作事件统计。同步运动学是少量但高价值的锚点。${sources([papers[10].source,papers[13].source,papers[14].source,papers[15].source])}`);
}
function synthEval(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'目标方案',C.orange,false); addCompactTitle(s,'评测与消融：同一 encoder 经受双任务、五域偏移与压力测试','顶会证据必须排除数据、decoder 与语言先验捷径');
  const rows=[
    ['主下游','手势 macro-F1 / calibration','角度与速度 MAE、相关、漂移','序列 CER / event latency'],
    ['域划分','held-out subject','held-out day','rotation · displacement · device'],
    ['关键对照','从头 / 监督人口模型','MOMENT/CBraMod 连续 MAE','AEMG 离散 + 本文双路'],
    ['表示审计','身份/设备线性探测','码本 perplexity / 死码','运动学邻域与跨日 token 稳定'],
    ['在线约束','因果窗口与端到端延迟','掉通道与低信号质量','闭环目标获取 / 误触率']
  ];
  rows.forEach((r,ri)=>{const y=166+ri*83; text(s,r[0],54,y,150,28,20,ri===4?C.orange:C.accent,true); for(let i=1;i<4;i++) text(s,r[i],216+(i-1)*334,y,315,57,19,i===3?C.muted:C.ink,i===1); rule(s,54,y+62,1168,C.line,1);});
  addTakeaway(s,'只在随机窗口或单一分类任务领先，不足以支持“前臂运动基座模型”的主张。',620,C.orange);
  notes(s,`评测采用统一 encoder 和尽量相同的下游头，离散与连续任务同等重要。五个域偏移是 subject、day、rotation、displacement、device。对照至少包括从头、强监督人口模型、连续 masked 基线与 AEMG 离散基线。表示审计用于排除身份和设备泄漏，在线约束保证离线收益可转成交互收益。${sources([papers[8].source,papers[13].source,papers[14].source,papers[15].source,papers[16].source])}`);
}
function synthClose(deck,page) {
  const s=deck.slides.add(); addPageChrome(s,page,'研究路线',C.cyan,true); addCompactTitle(s,'投稿主线：证明“运动语义”可跨人、跨日、跨佩戴复用','结论与下一步',true,38);
  const steps=[
    ['01','基线','连续多尺度 masked encoder'],
    ['02','方向','运动学 teacher + 条件一致性'],
    ['03','创新','连续—离散双路 + 环形几何'],
    ['04','证据','双任务 × 五域偏移 × 少样本'],
    ['05','落地','因果在线解码与个性化']
  ];
  steps.forEach((a,i)=>{const y=160+i*86; text(s,a[0],58,y,54,27,16,'#7ED7F2',true); text(s,a[1],132,y,118,30,23,'#FFFFFF',true); text(s,a[2],278,y,780,45,23,'#DDEBF2',false); rule(s,58,y+57,1000,'#314252',1);});
  text(s,'核心判据',1090,178,120,28,18,'#7ED7F2',true,'right'); text(s,'同一个\nencoder\n同时改善\n手势与\n连续运动',1082,229,130,230,28,'#FFFFFF',true,'right');
  addTakeaway(s,'先用简单强基线确定数据价值，再用受控消融证明结构与目标，最后用真实域偏移完成顶会叙事。',622,C.cyan,true);
  notes(s,`最终研究主张应非常具体：同一 sEMG encoder 在严格跨人、跨日、跨佩戴和跨设备条件下，同时提高离散手势与连续运动，并降低标注和个性化成本。路线从连续 masked 基线开始，随后加入运动学方向、离散分支和环形几何，最后完成在线与少样本证据。${sources([papers[4].source,papers[13].source,papers[14].source,papers[16].source])}`);
}

async function main(){
  const deck=Presentation.create({slideSize:{width:W,height:H}});
  coverSlide(deck);
  introClaim(deck,2,'17 篇工作回答同一问题：如何学到可复用的生理状态','报告范围与最终答案','基础模型的价值不在模型名称，而在“无标签规模、迁移边界与严格跨域证据”同时成立。',[
    {title:'EEG 方法库',items:['连续/离散 tokenizer','掩蔽、对比、教师与 MoE','时空结构先验'],takeaway:'借方法'},
    {title:'可穿戴与通用时序',items:['纵向正对与形态目标','跨模态和概率未来','数据/模型/算力 scaling'],takeaway:'借规模'},
    {title:'直接 sEMG 证据',items:['连续姿态与打字序列','人口模型与闭环','AEMG 离散动作词表'],takeaway:'定评测'}
  ],[papers[1].source,papers[10].source,papers[13].source,papers[16].source]);
  introClaim(deck,3,'什么才算“前臂运动基座模型”？','工作定义','一个预训练 encoder 应以少量适配同时支持多类运动任务，并对真实佩戴变化保持稳定。',[
    {title:'输入层',items:['1 kHz 多通道原始 sEMG','腕带几何与采集元数据','可选 IMU / 姿态教师']},
    {title:'表示层',items:['连续多尺度 token 为主','离散 codebook 为可检验假设','因果/双向接口明确分离']},
    {title:'证据层',items:['离散手势 + 连续运动','held-out subject/day/placement','少样本、在线和失效分析']}
  ],[papers[8].source,papers[13].source,papers[14].source]);
  introTerminology(deck,4); introMethods(deck,5); introTimeline(deck,6); introTarget(deck,7);
  let page=8;
  for(let i=0;i<papers.length;i++){
    const p=papers[i]; paperPositioning(deck,p,page++); await paperFigure(deck,p,page++,i); paperMechanism(deck,p,page++); paperEvidence(deck,p,page++,i); paperTransfer(deck,p,page++,i);
  }
  synthMatrix(deck,93); synthTransfer(deck,94); synthArchitecture(deck,95); synthTokenizer(deck,96);
  synthObjectives(deck,97); synthData(deck,98); synthEval(deck,99); synthClose(deck,100);
  if(deck.slides.items.length!==100) throw new Error(`Expected 100 slides, got ${deck.slides.items.length}`);
  const out=await PresentationFile.exportPptx(deck); await out.save(OUT);
  console.log(`Wrote ${OUT} with ${deck.slides.items.length} slides`);
}
main().catch((e)=>{console.error(e);process.exitCode=1;});
