# 跨模态扩充版 PPT QA 报告

- 交付文件：`deliverables/生理时序基座模型顶会论文深读_跨模态扩充版_2026-09.pptx`
- 总页数：140 页；逐页编号 `1 / 140` 至 `140 / 140` 完整。
- 论文覆盖：25 篇，每篇 5 页，共 125 页论文深读；另含 7 页导读与 8 页综合方案。
- 模态分布：EEG 7 篇、语音 4 篇、ECG/睡眠等生理信号 4 篇、可穿戴/通用时序 6 篇、腕部/前臂 sEMG 4 篇。
- 原论文主图：25 张，全部来自对应论文 PDF，并记录 figure number、PDF page、caption、source URL 和本地来源。
- 演讲者备注：140 页均存在，且每页以 `[Sources]` 块结尾。
- 内容阈值：每篇可见中文不少于 700 字，实测最小值 703；每篇备注中文不少于 1000 字，实测最小值 1342。
- 文件大小：16,797,629 bytes；原图对象 25 个；页码标记 140 个。
- 旧版保持：原 100 页文件仍保留，SHA-256 为 `722F374105A60AAEF975F49370B81822A7BFA1367482082087E04DE83EE55258`，与构建前一致。

## 来源与正式版本修订

- SleepFM 已替换为 2026 年 Nature Medicine 正式论文版本，并使用官方 Figure 1。
- ECG-FM 已采用 2025 年 JAMIA Open 正式论文版本，Figure 2 的 PDF 页码校正为第 3 页。
- 新增语音方法包括 wav2vec 2.0、data2vec、BEST-RQ、BEATs；新增生理方法包括 HeartLang、ECG2TOK、SleepFM、ECG-FM。

## 自动化与视觉验收

- `validate_cross_modal_deck.mjs`：通过；25 papers、25 figures、140 slides、140 notes、25 images、140 page markers，`failures: []`。
- `slides_test.py`：通过，输出 `Test passed. No overflow detected.`。
- 最终渲染：`rendered_final_v6` 共 140 张 PNG；最终 montage 为 `cross_modal_montage.png`。
- 已逐页检查最终渲染的 140 页，重点核对标题换行、正文裁切、图注清晰度、原图比例、页脚来源、结论条与页码连续性。
- 已修复的主要问题：第 17 页和第 97 页窄栏项目换行碰撞；第 77 页标题换行；第 134 页目标矩阵缺失的 sEMG 角色列；长英文论文标题过度截断；SleepFM/ECG-FM 正式版本与页码元数据。

## 研究方案结论

最终建议采用三尺度连续 tokenizer 与 data2vec 风格 teacher latent 作为主干，使用 WavLM 风格结构化扰动和 SleepFM 风格 leave-one-modality-out 训练；离散 BEST-RQ/VQ 分支仅作为受控消融。投稿证据要求同一 encoder 同时改善离散手势与连续运动，并在 subject/day/device/rotation/displacement 等真实域偏移下成立。
