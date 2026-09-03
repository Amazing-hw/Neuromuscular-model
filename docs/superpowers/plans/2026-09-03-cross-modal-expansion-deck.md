# Cross-Modal Physiological Foundation Model Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a new 140-slide Chinese PPTX that preserves the existing 17-paper deck, adds eight five-slide deep readings from speech and non-EEG physiology, and rewrites the synthesis into an actionable 1 kHz wrist/forearm sEMG pretraining design.

**Architecture:** Keep the existing 100-slide artifact immutable. Store the eight new papers, official-PDF provenance, and figure crops in cross-modal-specific files, then merge old and new records in a new `@oai/artifact-tool` builder using a fixed 25-paper order. A deterministic validator checks corpus size, text and note thresholds, sources, figures, slide count, and notes before full rendering and visual QA.

**Tech Stack:** Official proceedings/publisher/arXiv PDFs, JavaScript ES modules, Node.js, `@oai/artifact-tool`, Poppler/PDF rendering, PowerPoint/PPTX, bundled rendering/montage/overflow tools.

---

## File Map

- Preserve: `deliverables/生理时序基座模型顶会论文深读_扩展版_2026-09.pptx`
- Create: `deliverables/生理时序基座模型顶会论文深读_跨模态扩充版_2026-09.pptx`
- Create: `deliverables/physio_fm_ppt/cross_modal_fulltext_manifest.json`
- Create: `deliverables/physio_fm_ppt/cross_modal_figure_manifest.json`
- Create: `deliverables/physio_fm_ppt/cross_modal_paper_records.js`
- Create: `deliverables/physio_fm_ppt/build_cross_modal_deck.mjs`
- Create: `deliverables/physio_fm_ppt/validate_cross_modal_deck.mjs`
- Create: `deliverables/physio_fm_ppt/source-notes-cross-modal.txt`
- Create: `deliverables/physio_fm_ppt/cross_modal_montage.png`
- Create: `deliverables/physio_fm_ppt/qa_report_cross_modal.md`
- Create per paper: `deliverables/physio_fm_ppt/assets/papers/<id>/paper.pdf`
- Create per paper: `deliverables/physio_fm_ppt/assets/papers/<id>/figure-main.png`
- Reference: `deliverables/physio_fm_ppt/paper_records_expanded.js`
- Reference: `deliverables/physio_fm_ppt/figure_manifest.json`
- Reference: `deliverables/physio_fm_ppt/build_expanded_deck.mjs`

### Task 1: Lock the eight-paper source manifest

**Files:**
- Create: `deliverables/physio_fm_ppt/cross_modal_fulltext_manifest.json`
- Create: `deliverables/physio_fm_ppt/source-notes-cross-modal.txt`

- [ ] **Step 1: Add the eight canonical records**

Use exactly these IDs and official sources:

```json
[
  {"id":"wav2vec2","venue":"NeurIPS 2020","status":"peer-reviewed","landingUrl":"https://proceedings.neurips.cc/paper/2020/hash/92d1e1eb1cd6f9fba3227870bb6d7f07-Abstract.html","pdfUrl":"https://proceedings.neurips.cc/paper/2020/file/92d1e1eb1cd6f9fba3227870bb6d7f07-Paper.pdf","localPdf":"assets/papers/wav2vec2/paper.pdf"},
  {"id":"data2vec","venue":"ICML 2022","status":"peer-reviewed","landingUrl":"https://proceedings.mlr.press/v162/baevski22a.html","pdfUrl":"https://proceedings.mlr.press/v162/baevski22a/baevski22a.pdf","localPdf":"assets/papers/data2vec/paper.pdf"},
  {"id":"best_rq","venue":"ICML 2022","status":"peer-reviewed","landingUrl":"https://proceedings.mlr.press/v162/chiu22a.html","pdfUrl":"https://proceedings.mlr.press/v162/chiu22a/chiu22a.pdf","localPdf":"assets/papers/best_rq/paper.pdf"},
  {"id":"beats","venue":"ICML 2023","status":"peer-reviewed","landingUrl":"https://proceedings.mlr.press/v202/chen23ag.html","pdfUrl":"https://proceedings.mlr.press/v202/chen23ag/chen23ag.pdf","localPdf":"assets/papers/beats/paper.pdf"},
  {"id":"heartlang","venue":"ICLR 2025","status":"peer-reviewed","landingUrl":"https://openreview.net/forum?id=6Hz1Ko087B","pdfUrl":"https://proceedings.iclr.cc/paper_files/paper/2025/file/17aa70697d6cd35835f201c6fb0a2fd5-Paper-Conference.pdf","localPdf":"assets/papers/heartlang/paper.pdf"},
  {"id":"ecg2tok","venue":"IJCAI 2025","status":"peer-reviewed","landingUrl":"https://www.ijcai.org/proceedings/2025/1110","pdfUrl":"https://www.ijcai.org/proceedings/2025/1110.pdf","localPdf":"assets/papers/ecg2tok/paper.pdf"},
  {"id":"sleepfm","venue":"Nature Medicine 2026","status":"peer-reviewed","landingUrl":"https://www.nature.com/articles/s41591-025-04133-4","pdfUrl":"https://www.nature.com/articles/s41591-025-04133-4.pdf","localPdf":"assets/papers/sleepfm/paper.pdf"},
  {"id":"ecg_fm","venue":"npj Digital Medicine 2025","status":"peer-reviewed","landingUrl":"https://pmc.ncbi.nlm.nih.gov/articles/PMC12530324/","pdfUrl":"https://pmc.ncbi.nlm.nih.gov/articles/PMC12530324/pdf/","localPdf":"assets/papers/ecg_fm/paper.pdf"}
]
```

- [ ] **Step 2: Verify title, venue, year, status, DOI, and PDF accessibility from the primary source**

Record the verified full title and DOI for each paper in `source-notes-cross-modal.txt`. If the PMC PDF endpoint redirects, save the resolved official PDF URL in the manifest; do not substitute an aggregator.

- [ ] **Step 3: Validate the manifest**

```powershell
$m = Get-Content -Raw 'deliverables\physio_fm_ppt\cross_modal_fulltext_manifest.json' | ConvertFrom-Json
if ($m.Count -ne 8) { throw "Expected 8 cross-modal papers" }
if (($m.id | Sort-Object -Unique).Count -ne 8) { throw "Duplicate paper id" }
$m | ForEach-Object {
  if ($_.landingUrl -notmatch '^https://') { throw "Invalid landing URL: $($_.id)" }
  if ($_.pdfUrl -notmatch '^https://') { throw "Invalid PDF URL: $($_.id)" }
}
```

Expected: no exception.

- [ ] **Step 4: Commit the source manifest**

```powershell
git add -- 'deliverables/physio_fm_ppt/cross_modal_fulltext_manifest.json' 'deliverables/physio_fm_ppt/source-notes-cross-modal.txt'
git commit -m "docs: add cross-modal paper source manifest"
```

### Task 2: Acquire official PDFs and extract one core figure per new paper

**Files:**
- Create: `deliverables/physio_fm_ppt/assets/papers/{wav2vec2,data2vec,best_rq,beats,heartlang,ecg2tok,sleepfm,ecg_fm}/paper.pdf`
- Create: `deliverables/physio_fm_ppt/assets/papers/<id>/figure-main.png`
- Create: `deliverables/physio_fm_ppt/cross_modal_figure_manifest.json`

- [ ] **Step 1: Download all eight PDFs through institution-authorized or open official links**

Use the Nature downloader workflow when authentication or redirects are involved. Each saved file must begin with `%PDF` and exceed 10 KB.

- [ ] **Step 2: Render PDFs at 200 DPI for figure selection**

```powershell
pdftoppm -png -r 200 'deliverables\physio_fm_ppt\assets\papers\wav2vec2\paper.pdf' 'deliverables\physio_fm_ppt\assets\papers\wav2vec2\page'
```

Apply the same naming convention to all eight IDs.

- [ ] **Step 3: Select the method-defining figure**

Selection contract:

- wav2vec 2.0: feature encoder, masking/context network, quantizer and contrastive targets.
- data2vec: masked student and full-input EMA teacher latent prediction.
- BEST-RQ: random projection, fixed codebook lookup and masked label prediction.
- BEATs: tokenizer/model iterative optimization pipeline.
- HeartLang: QRS-Tokenizer plus form-level and rhythm-level ECG language modeling.
- ECG2TOK: self-distillation semantic tokenizer plus masked discrete prediction.
- SleepFM: modality encoders and leave-one-out multimodal contrastive objective.
- ECG-FM: waveform encoder with contrastive and continuous masking objectives.

- [ ] **Step 4: Crop figure images without altering scientific content**

Crop page margins and unrelated prose only. Preserve figure labels, arrows, legends, and captions when the caption is needed to interpret the diagram. Longest edge must be at least 1600 px.

- [ ] **Step 5: Write the figure manifest**

Each entry must include `paperId`, `figureNumber`, `pageNumber`, `caption`, `sourceUrl`, `localPath`, and `treatment: "original"`.

- [ ] **Step 6: Validate all assets**

```powershell
$m = Get-Content -Raw 'deliverables\physio_fm_ppt\cross_modal_figure_manifest.json' | ConvertFrom-Json
if ($m.Count -ne 8) { throw "Expected 8 figures" }
foreach ($f in $m) {
  $p = Join-Path 'deliverables\physio_fm_ppt' $f.main.localPath
  if (-not (Test-Path $p)) { throw "Missing $p" }
  if ((Get-Item $p).Length -lt 20000) { throw "Suspicious crop $p" }
  if ($f.main.treatment -ne 'original') { throw "Unexpected treatment $($f.paperId)" }
}
```

Expected: eight valid original crops.

- [ ] **Step 7: Commit the PDFs, figures, and manifest**

```powershell
git add -- 'deliverables/physio_fm_ppt/assets/papers' 'deliverables/physio_fm_ppt/cross_modal_figure_manifest.json'
git commit -m "docs: add cross-modal paper figures"
```

### Task 3: Author eight five-slide deep-reading records

**Files:**
- Create: `deliverables/physio_fm_ppt/cross_modal_paper_records.js`

- [ ] **Step 1: Reuse the existing record contract**

Export `crossModalPaperRecords` containing eight records with `positioning`, `overviewFigure`, `mechanism`, `evidence`, and `transfer` slide payloads plus matching notes.

- [ ] **Step 2: Write paper-specific content**

Each paper must explain actual input representation, tokenizer, backbone, masking or corruption rule, target construction, loss, training data, evaluation, key ablations, limitations, and an explicit 1 kHz sEMG transfer experiment. Do not use a shared generic paragraph.

- [ ] **Step 3: Enforce terminology**

Use `tokenizer` for the complete signal-to-sequence transformation, `token` for one sequence unit, and `codebook（码本）` only for finite discrete embeddings. Distinguish teacher latent regression, random quantization, learned vector quantization, clustering pseudo-labels, and contrastive negatives.

- [ ] **Step 4: Add source-grounded notes**

Every note ends with a `[Sources]` block. Across five slides per paper, visible Chinese must be at least 700 characters and note Chinese excluding sources at least 1,000 characters.

- [ ] **Step 5: Add a temporary content-contract test and run it**

The test must assert eight unique IDs, five slide kinds, five notes with source blocks, text thresholds, valid status strings, and matching figure records. Run with the bundled Node runtime and expect `CROSS_MODAL_CONTENT=PASS`.

- [ ] **Step 6: Commit the new narratives**

```powershell
git add -- 'deliverables/physio_fm_ppt/cross_modal_paper_records.js'
git commit -m "docs: add cross-modal paper deep readings"
```

### Task 4: Build the 140-slide presentation

**Files:**
- Create: `deliverables/physio_fm_ppt/build_cross_modal_deck.mjs`
- Create: `deliverables/生理时序基座模型顶会论文深读_跨模态扩充版_2026-09.pptx`

- [ ] **Step 1: Load the bundled presentation runtime**

Call `codex_app__load_workspace_dependencies` and use the returned absolute `RUNTIME_NODE`, `RUNTIME_NODE_MODULES`, and `RUNTIME_BIN_DIR`. Do not install or substitute dependencies.

- [ ] **Step 2: Mark the authoring operation once**

Immediately before the first authoring run:

```powershell
& $env:RUNTIME_NODE "$env:SKILL_DIR\container_tools\mark_artifact_operation_started.mjs" --operation-kind edit --expected-output-count 1 --output-format pptx
```

Run this marker exactly once for this new deliverable.

- [ ] **Step 3: Implement deterministic paper ordering**

Merge records in this exact order:

```text
7 EEG → 4 speech/audio → 4 new ECG/multimodal physiology →
6 existing wearable/general time-series → 4 existing wrist/forearm sEMG
```

Assert 25 unique paper IDs before adding slides.

- [ ] **Step 4: Reuse and extend the current visual system**

Preserve typography, margins, title fitting, five-slide templates, notes, and figure provenance from `build_expanded_deck.mjs`. Add purple-blue accents for speech/audio, green accents for new physiology, and retain orange for direct sEMG.

- [ ] **Step 5: Update the seven opening slides**

Change all counts and maps from 17/100 to 25/140. Add a method-family map spanning EEG, speech/audio, ECG/PPG/sleep, general time series, and sEMG.

- [ ] **Step 6: Add all 125 paper-detail slides**

For every paper, generate exactly five slides and use the selected official figure on its overview page. Page labels must use `/ 140`.

- [ ] **Step 7: Rewrite slides 133–140**

The final eight slides must cover:

1. Cross-modal decision matrix.
2. What speech contributes beyond EEG.
3. What ECG/sleep contributes beyond speech.
4. Multiscale continuous tokenizer and optional discrete branch.
5. Composite objective: teacher latent, denoising, motion alignment, optional token loss.
6. Training data and structured corruptions.
7. Five-domain evaluation contract and representation audit.
8. Submission thesis: continuous–discrete dual path, ring geometry, dual-task evidence.

- [ ] **Step 8: Export the new file without overwriting the 100-slide version**

Run the builder and require output `Wrote ... with 140 slides`.

- [ ] **Step 9: Commit the builder and generated PPTX**

```powershell
git add -- 'deliverables/physio_fm_ppt/build_cross_modal_deck.mjs' 'deliverables/生理时序基座模型顶会论文深读_跨模态扩充版_2026-09.pptx'
git commit -m "feat: build cross-modal physiological foundation model deck"
```

### Task 5: Add deterministic validation for the cross-modal deck

**Files:**
- Create: `deliverables/physio_fm_ppt/validate_cross_modal_deck.mjs`

- [ ] **Step 1: Encode all structural contracts**

Check 25 papers, 125 paper slides, 140 total slides, 140 notes, 25 main figures, five source blocks per paper, each paper's visible and note thresholds, unique IDs, valid figure/page/source metadata, and absence of common draft placeholder markers.

- [ ] **Step 2: Verify preservation of the source deck**

Record the SHA-256 hash of the original 100-slide PPTX before and after building; the values must be identical.

- [ ] **Step 3: Run content and PPTX validation**

```powershell
& $env:RUNTIME_NODE 'deliverables\physio_fm_ppt\validate_cross_modal_deck.mjs'
```

Expected: JSON summary with `slides: 140`, `notes: 140`, `papers: 25`, `figures: 25`, threshold minima above contract, and `failures: []`.

- [ ] **Step 4: Commit the validator**

```powershell
git add -- 'deliverables/physio_fm_ppt/validate_cross_modal_deck.mjs'
git commit -m "test: validate cross-modal deck contracts"
```

### Task 6: Render, inspect, correct, and document QA

**Files:**
- Create temporarily: `deliverables/生理时序基座模型顶会论文深读_跨模态扩充版_2026-09/slide-*.png`
- Create: `deliverables/physio_fm_ppt/cross_modal_montage.png`
- Create: `deliverables/physio_fm_ppt/qa_report_cross_modal.md`

- [ ] **Step 1: Render all 140 slides**

Run the bundled `render_slides.py` with the three runtime variables. Require 140 PNG files.

- [ ] **Step 2: Create and inspect a montage**

Use `create_montage.py` with five columns and filename labels. Inspect deck-level rhythm, section colors, page continuity, figure placement, and footer consistency.

- [ ] **Step 3: Inspect every new or materially changed slide at full size**

Inspect slides 1–7, 43–82, and 133–140 individually. For the retained paper templates, inspect at least one representative positioning, figure, mechanism, evidence, and transfer slide per section after final pagination.

- [ ] **Step 4: Correct every visual defect and rerender**

Fix title wrapping, text clipping, collisions, blurry crops, excessive whitespace, inaccurate figure labels, and hidden source footers. Repeat rendering after each builder change.

- [ ] **Step 5: Run overflow and final validators**

```powershell
& 'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' "$env:SKILL_DIR\container_tools\slides_test.py" 'deliverables\生理时序基座模型顶会论文深读_跨模态扩充版_2026-09.pptx'
& $env:RUNTIME_NODE 'deliverables\physio_fm_ppt\validate_cross_modal_deck.mjs' --require-render
```

Expected: `Test passed. No overflow detected.` and `failures: []`.

- [ ] **Step 6: Write the QA report**

Record slide count, note count, paper count, figure count, text minima, render count, overflow result, visual pages inspected, source-deck hash comparison, and any resolved layout defects.

- [ ] **Step 7: Remove only temporary per-slide render PNGs**

Resolve and verify that the render directory is inside the current worktree, assert that it contains exactly 140 `slide-*.png` files, then remove that directory. Keep the montage and QA report.

- [ ] **Step 8: Commit QA artifacts**

```powershell
git add -- 'deliverables/physio_fm_ppt/cross_modal_montage.png' 'deliverables/physio_fm_ppt/qa_report_cross_modal.md'
git commit -m "docs: record cross-modal deck QA"
```

### Task 7: Final verification and remote delivery

**Files:**
- Verify: all files above

- [ ] **Step 1: Run fresh verification**

Run the content/PPTX validator, `slides_test.py`, `git diff --check`, and `git status --short`. Do not rely on prior outputs.

- [ ] **Step 2: Confirm the old and new decks both exist**

The original must remain 100 slides and the new artifact must contain 140 slides.

- [ ] **Step 3: Push the current branch**

```powershell
git push origin codex/physio-fm-ppt
```

Expected: remote branch advances without rewriting history.

- [ ] **Step 4: Report the deliverable**

Return the absolute local path, remote branch, final commit, slide count, paper count, text/notes minima, figure count, and verification outcomes. State explicitly that the original 100-slide PPTX was preserved.
