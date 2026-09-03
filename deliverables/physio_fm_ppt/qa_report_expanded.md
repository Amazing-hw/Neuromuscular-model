# 扩展版 PPT 最终 QA

- 交付文件：`deliverables/生理时序基座模型顶会论文深读_扩展版_2026-09.pptx`
- 幻灯片：100 页（导论 7 页，17 篇论文 × 5 页，综合与目标方案 8 页）
- 演讲者备注：100/100 页存在，且每页包含 `[Sources]` 来源块
- 论文正文中文量：单篇 703–826 字（约定下限 700 字）
- 论文备注中文量：单篇 1,956–2,265 字，不含来源块（约定下限 1,000 字）
- 论文原图：17/17 篇均使用官方 PDF 裁图，清单记录 figure number、PDF 页码、来源 URL 与 original 标记
- 渲染检查：100/100 页成功渲染为 PNG；全页缩略图复核，并对证据、迁移、论文图和综合页高风险模板逐页抽样复核
- 兼容性检查：`slides_test.py` 返回 `Test passed. No overflow detected.`
- 内容检查：未发现 TODO、FIXME、Lorem ipsum 或 TBD 占位文本

自动检查命令：

```powershell
node deliverables/physio_fm_ppt/validate_expanded_deck.mjs
# 若已用 render_slides.py 生成逐页 PNG，可追加 --require-render 强制检查 100 张渲染图
```

检查结果摘要：100 slides、100 notes、17 papers、17 figures、100 rendered PNGs、0 failures。
