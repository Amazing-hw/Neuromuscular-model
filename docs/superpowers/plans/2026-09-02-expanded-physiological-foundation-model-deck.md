# Expanded Physiological Foundation Model Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current 65-slide overview deck as a 98–105-slide Chinese deep-reading deck that gives each of 17 selected papers five detailed slides, at least one sourced model figure, verified experimental evidence, and an explicit transfer design for 1 kHz forearm/wrist sEMG gesture and continuous-movement interaction.

**Architecture:** Keep literature evidence, figure provenance, paper narrative, slide generation, and QA as separate artifacts. Official PDFs and extracted raster figures feed a figure manifest; the manifest and detailed paper records feed one `@oai/artifact-tool` presentation builder. Structural, citation, text-volume, image-resolution, rendering, and overflow checks run before the revised PPTX replaces the previous deliverable.

**Tech Stack:** Official proceedings/publisher/arXiv PDFs, Poppler/PDF rendering tools, JavaScript ES modules, Node.js, `@oai/artifact-tool`, PowerPoint/PPTX, bundled presentation rendering and overflow tools.

---

## File Map

- `deliverables/physio_fm_ppt/fulltext_manifest.json`: official paper/PDF URLs and local PDF paths.
- `deliverables/physio_fm_ppt/figure_manifest.json`: selected Figure number, page, crop, caption, provenance, and local image path for all 17 works.
- `deliverables/physio_fm_ppt/assets/papers/<paper-id>/`: downloaded PDFs and extracted figure PNGs.
- `deliverables/physio_fm_ppt/paper_records_expanded.js`: five slide payloads and >=1,000 Chinese-character notes per paper.
- `deliverables/physio_fm_ppt/build_expanded_deck.mjs`: the only expanded-deck presentation builder.
- `deliverables/physio_fm_ppt/validate_expanded_deck.mjs`: deterministic corpus, text, source, image, and slide-count validation.
- `deliverables/physio_fm_ppt/expanded_qa_report.txt`: final validation and render evidence.
- `deliverables/生理时序基座模型顶会论文深读_扩展版_2026-09.pptx`: revised final deliverable.

### Task 1: Build the official full-text acquisition manifest

**Files:**
- Create: `deliverables/physio_fm_ppt/fulltext_manifest.json`
- Create: `deliverables/physio_fm_ppt/assets/papers/`
- Reference: `deliverables/physio_fm_ppt/source-notes.txt`

- [ ] **Step 1: Define all 17 full-text records**

Each JSON record must have this exact shape:

```json
{
  "id": "labram",
  "title": "LaBraM: Large Brain Model for Learning Generic Representations with Tremendous EEG Data in BCI",
  "venue": "ICLR 2024",
  "status": "peer-reviewed",
  "landingUrl": "https://proceedings.iclr.cc/paper_files/paper/2024/hash/47393e8594c82ce8fd83adc672cf9872-Abstract-Conference.html",
  "pdfUrl": "https://proceedings.iclr.cc/paper_files/paper/2024/file/47393e8594c82ce8fd83adc672cf9872-Paper-Conference.pdf",
  "localPdf": "assets/papers/labram/paper.pdf"
}
```

Use `status: "preprint"` only for M2AE; use `status: "dataset-benchmark"` for emg2pose and emg2qwerty.

- [ ] **Step 2: Download each PDF from its official source**

Use publisher/proceedings/arXiv URLs only. Save each file as `deliverables/physio_fm_ppt/assets/papers/<id>/paper.pdf`. If a publisher PDF is not openly downloadable, use the official author arXiv PDF recorded in the manifest; do not use screenshots from aggregators.

- [ ] **Step 3: Verify all PDFs are readable and non-empty**

Run:

```powershell
$manifest = Get-Content -Raw 'deliverables\physio_fm_ppt\fulltext_manifest.json' | ConvertFrom-Json
if ($manifest.Count -ne 17) { throw "Expected 17 papers" }
foreach ($paper in $manifest) {
  $path = Join-Path 'deliverables\physio_fm_ppt' $paper.localPdf
  if (-not (Test-Path $path)) { throw "Missing $path" }
  if ((Get-Item $path).Length -lt 10000) { throw "Suspicious PDF $path" }
}
```

Expected: no exception.

- [ ] **Step 4: Commit the manifest and PDFs**

```powershell
git add -- 'deliverables/physio_fm_ppt/fulltext_manifest.json' 'deliverables/physio_fm_ppt/assets/papers'
git commit -m "docs: add official paper full texts"
```

### Task 2: Select and extract the core figures for all papers

**Files:**
- Create: `deliverables/physio_fm_ppt/figure_manifest.json`
- Create: `deliverables/physio_fm_ppt/assets/papers/<paper-id>/figure-main.png`
- Create as needed: `deliverables/physio_fm_ppt/assets/papers/<paper-id>/figure-secondary.png`

- [ ] **Step 1: Render each full PDF for visual inspection**

Render pages at 180–220 DPI into the paper directory. Use the bundled PDF/Poppler runtime; do not use Python to draw or recreate figures.

```powershell
pdftoppm -png -r 200 'deliverables\physio_fm_ppt\assets\papers\labram\paper.pdf' 'deliverables\physio_fm_ppt\assets\papers\labram\page'
```

Repeat with the same directory convention for all 17 IDs.

- [ ] **Step 2: Select one primary model figure per paper**

For each paper, choose the figure that best exposes input, representation/tokenizer, backbone, pretraining target, and downstream adaptation. For dataset/benchmark papers, select the data-collection/benchmark overview figure. For Sundial, select the flow-matching/TimeFlow method figure; for AEMG, select the Neuromuscular Contraction Tokenizer/AEMG pipeline figure; for LaBraM, select the neural tokenizer plus masked token-prediction pipeline.

- [ ] **Step 3: Create the figure manifest**

Every record must use this exact schema:

```json
{
  "paperId": "labram",
  "main": {
    "figureNumber": "Figure 1",
    "pageNumber": 2,
    "caption": "Overall LaBraM pre-training and adaptation pipeline.",
    "sourceUrl": "https://proceedings.iclr.cc/paper_files/paper/2024/file/47393e8594c82ce8fd83adc672cf9872-Paper-Conference.pdf",
    "localPath": "assets/papers/labram/figure-main.png",
    "treatment": "original"
  },
  "secondary": null
}
```

Set `treatment` to `"redrawn"` only when the original figure remains unreadable after PDF rendering; in that case the slide must visibly say `根据原论文重绘`.

- [ ] **Step 4: Extract high-resolution crops**

Use rendered PDF page images and an image crop tool. Preserve the figure content and aspect ratio; crop page margins, unrelated paragraphs, and page numbers only. Ensure the longest edge is at least 1600 px.

- [ ] **Step 5: Verify image integrity**

Run:

```powershell
$figs = Get-Content -Raw 'deliverables\physio_fm_ppt\figure_manifest.json' | ConvertFrom-Json
if ($figs.Count -ne 17) { throw "Expected 17 figure records" }
foreach ($fig in $figs) {
  $path = Join-Path 'deliverables\physio_fm_ppt' $fig.main.localPath
  if (-not (Test-Path $path)) { throw "Missing $path" }
  if ((Get-Item $path).Length -lt 20000) { throw "Low-information image $path" }
}
```

Expected: 17 records and no missing/undersized main image.

- [ ] **Step 6: Commit the figure assets and provenance**

```powershell
git add -- 'deliverables/physio_fm_ppt/figure_manifest.json' 'deliverables/physio_fm_ppt/assets/papers'
git commit -m "docs: add sourced paper method figures"
```

### Task 3: Author five-slide deep-reading records

**Files:**
- Create: `deliverables/physio_fm_ppt/paper_records_expanded.js`
- Reference: `deliverables/physio_fm_ppt/sources.md`
- Reference: `deliverables/physio_fm_ppt/fulltext_manifest.json`
- Reference: `deliverables/physio_fm_ppt/figure_manifest.json`

- [ ] **Step 1: Define the expanded record schema**

```js
{
  id: 'labram',
  title: 'LaBraM',
  fullTitle: 'LaBraM: Large Brain Model for Learning Generic Representations with Tremendous EEG Data in BCI',
  venue: 'ICLR 2024',
  status: 'peer-reviewed',
  source: 'https://proceedings.iclr.cc/...',
  slides: {
    positioning: { title: '', sections: [], visibleText: '' },
    overviewFigure: { title: '', numberedExplanations: [], visibleText: '' },
    mechanism: { title: '', modules: [], lossExplanation: '', visibleText: '' },
    evidence: { title: '', datasets: [], metrics: [], ablations: [], limits: [], visibleText: '' },
    transfer: { title: '', innovations: [], borrow: [], avoid: [], experiments: [], visibleText: '' }
  },
  notes: {
    positioning: '',
    overviewFigure: '',
    mechanism: '',
    evidence: '',
    transfer: ''
  }
}
```

- [ ] **Step 2: Write paper-specific visible content**

For each paper, explain its actual mechanism rather than inserting a generic template. The five slide bodies must total at least 700 Chinese characters. The overview-figure page must map numbered explanations to visible parts of the selected Figure.

- [ ] **Step 3: Write detailed speaker notes**

Each paper's five note strings must total at least 1,000 Chinese characters after removing source blocks. Each note must end with:

```text
[Sources]
- <official paper URL>
- <official PDF URL when a figure is used>
[/Sources]
```

- [ ] **Step 4: Validate the records before slide work**

Run with the bundled Node.js runtime:

```js
const { paperRecordsExpanded } = require('./deliverables/physio_fm_ppt/paper_records_expanded.js');
const chinese = (s) => (s.match(/[\u3400-\u9fff]/g) || []).length;
if (paperRecordsExpanded.length !== 17) throw new Error('record count');
for (const p of paperRecordsExpanded) {
  if (Object.keys(p.slides).length !== 5) throw new Error(`${p.id}: slide count`);
  const visible = Object.values(p.slides).map((s) => s.visibleText).join('');
  const noteText = Object.values(p.notes).join('').replace(/\[Sources\][\s\S]*?\[\/Sources\]/g, '');
  if (chinese(visible) < 700) throw new Error(`${p.id}: visible ${chinese(visible)}`);
  if (chinese(noteText) < 1000) throw new Error(`${p.id}: notes ${chinese(noteText)}`);
}
```

Expected: no exception.

- [ ] **Step 5: Commit the expanded narrative**

```powershell
git add -- 'deliverables/physio_fm_ppt/paper_records_expanded.js'
git commit -m "docs: expand detailed paper narratives"
```

### Task 4: Create deterministic expanded-deck validation

**Files:**
- Create: `deliverables/physio_fm_ppt/validate_expanded_deck.mjs`

- [ ] **Step 1: Write failing manifest/record tests**

The validator must initially fail if the expanded records or figure manifest do not exist. It must check: 17 unique paper IDs, five slide payloads per paper, 17 main figures, all local images readable, >=700 Chinese visible characters per paper, >=1,000 Chinese note characters per paper, source blocks on all five notes, and `status: "preprint"` for M2AE only.

- [ ] **Step 2: Run the validator and confirm the intended failure**

```powershell
& $env:RUNTIME_NODE 'deliverables\physio_fm_ppt\validate_expanded_deck.mjs' --content-only
```

Expected before Tasks 2–3: non-zero exit naming the missing manifest or record file. After Tasks 2–3: `CONTENT_VALIDATION=PASS`.

- [ ] **Step 3: Add PPTX validation mode**

The same script must accept `--pptx <absolute-path>` and inspect the final PPTX for 98–105 slides, exactly 85 paper-detail slides, all 17 paper names, all 17 main-figure captions, all slide notes containing `[Sources]`, and visible M2AE preprint labels.

- [ ] **Step 4: Commit the validator**

```powershell
git add -- 'deliverables/physio_fm_ppt/validate_expanded_deck.mjs'
git commit -m "test: validate expanded literature deck"
```

### Task 5: Build the expanded 98–105-slide PPTX

**Files:**
- Create: `deliverables/physio_fm_ppt/build_expanded_deck.mjs`
- Create: `deliverables/生理时序基座模型顶会论文深读_扩展版_2026-09.pptx`

- [ ] **Step 1: Load the mandated presentation runtime**

Call `load_workspace_dependencies`. Set the returned `RUNTIME_NODE`, `RUNTIME_NODE_MODULES`, and `RUNTIME_BIN_DIR` exactly. Reuse the existing writable `node_modules` junction; do not install packages.

- [ ] **Step 2: Mark the new artifact operation once**

Immediately before the first expanded-deck authoring command, run exactly once:

```powershell
& $env:RUNTIME_NODE 'C:\Users\User\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations\container_tools\mark_artifact_operation_started.mjs' --operation-kind create --expected-output-count 1 --output-format pptx
```

- [ ] **Step 3: Implement reusable slide families**

Create `addPositioningSlide`, `addOriginalFigureSlide`, `addMechanismSlide`, `addEvidenceSlide`, and `addTransferSlide`. Use the current dark navy/teal/orange system. The original-figure layout must reserve at least 58% of the slide area for the image and place numbered explanations beside it. Use byte-backed PNG images with contain-fit, never stretch.

- [ ] **Step 4: Build the global narrative**

Generate 5–7 opening slides, 85 paper slides, and 8–13 synthesis slides. Keep the total between 98 and 105. Preserve the fixed paper order. The final synthesis must cover tokenizer choice, pretraining objectives, data/labels, evaluation, target architecture, training recipe, ablations, and top-conference contribution framing.

- [ ] **Step 5: Attach notes and provenance**

Set each slide's speaker notes using its paper-specific note string. Every image page must include the PDF URL and original Figure number in visible caption text and in `[Sources]` notes.

- [ ] **Step 6: Export the expanded PPTX**

```powershell
& $env:RUNTIME_NODE 'deliverables\physio_fm_ppt\build_expanded_deck.mjs'
```

Expected: `deliverables\生理时序基座模型顶会论文深读_扩展版_2026-09.pptx`, non-empty, with 98–105 slides.

- [ ] **Step 7: Commit the builder and PPTX**

```powershell
git add -- 'deliverables/physio_fm_ppt/build_expanded_deck.mjs' 'deliverables/生理时序基座模型顶会论文深读_扩展版_2026-09.pptx'
git commit -m "feat: build expanded physiological model deep-read deck"
```

### Task 6: Render, inspect, correct, and report

**Files:**
- Create: `deliverables/physio_fm_ppt/expanded_rendered/`
- Create: `deliverables/physio_fm_ppt/expanded_montage.png`
- Create: `deliverables/physio_fm_ppt/expanded_qa_report.txt`

- [ ] **Step 1: Run content and PPTX validation**

```powershell
& $env:RUNTIME_NODE 'deliverables\physio_fm_ppt\validate_expanded_deck.mjs' --pptx 'C:\Users\User\Documents\F_model\.worktrees\codex-physio-fm-ppt\deliverables\生理时序基座模型顶会论文深读_扩展版_2026-09.pptx'
```

Expected: `CONTENT_VALIDATION=PASS` and `PPTX_VALIDATION=PASS`.

- [ ] **Step 2: Run overflow testing**

```powershell
& $env:RUNTIME_PYTHON 'C:\Users\User\.codex\plugins\cache\openai-primary-runtime\presentations\26.813.12317\skills\presentations\container_tools\slides_test.py' 'C:\Users\User\Documents\F_model\.worktrees\codex-physio-fm-ppt\deliverables\生理时序基座模型顶会论文深读_扩展版_2026-09.pptx'
```

Expected: `Test passed. No overflow detected.`

- [ ] **Step 3: Render all slides and create the montage**

Use `render_slides.py` and `create_montage.py` from the presentation skill. Confirm the rendered image count equals the PPTX slide count.

- [ ] **Step 4: Inspect every paper's five-slide sequence**

At full size, verify title fit, original figure readability, numbered callout correspondence, crop integrity, caption/source visibility, body density, and consistent fifth-page transfer judgments. Correct the builder and regenerate until no unreadable figure, clipping, title wrap, or unintended overlap remains.

- [ ] **Step 5: Write the QA report**

Record slide count, 17×5 coverage, content character counts, image dimensions, source-block coverage, preprint labeling, overflow output, rendered-slide count, inspected figure pages, and any allowed redrawn figures.

- [ ] **Step 6: Commit the final QA state**

```powershell
git add -- 'deliverables/physio_fm_ppt/expanded_qa_report.txt' 'deliverables/生理时序基座模型顶会论文深读_扩展版_2026-09.pptx'
git commit -m "chore: verify expanded literature deck"
```

## Self-Review

1. **Spec coverage:** Tasks 1–2 implement official full texts, primary model figures, Figure numbers, provenance, and lawful fallbacks. Task 3 implements five pages, >=700 visible Chinese characters, >=1,000 note characters, detailed mechanisms, evidence, and sEMG transfer. Tasks 4–6 implement deterministic checks, a 98–105-slide deck, dark visual treatment, source notes, preprint labeling, rendering, individual inspection, and QA.
2. **Placeholder scan:** The plan contains no deferred `TBD`, `TODO`, “similar to”, or undefined implementation step. Discovery-dependent Figure numbers and crop coordinates are produced by the explicit PDF-inspection and manifest task rather than left as placeholders.
3. **Type consistency:** The full-text manifest uses `id`, `pdfUrl`, and `localPdf`; the figure manifest uses `paperId`, `main.localPath`, and `main.sourceUrl`; the expanded records use the same `id` and five fixed slide/note keys. The builder and validator consume those exact fields.
