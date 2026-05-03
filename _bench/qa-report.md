# Slidify visual-QA report — 2026-05-03 (round 2 mechanism audit)

## Aggregate

- llm-corpus: 16/22 slides clean, 7 findings
- atlas-vol-iii: 10/12 slides clean, 2 findings
- combined: 26/34 slides clean

## Per-slide findings

### llm-corpus / 16-mag-cover
- [major · FONT-SUB] Cover display type resolves to non-portable families.

  **PPTX evidence**
  - `/tmp/audit/llm-corpus/ppt/slides/slide16.xml`: multiple runs emit `<a:latin typeface="Bebas Neue"/>` and `<a:latin typeface="Playfair Display"/>`.
  - These are non-Office core fonts and rely on embed/host availability.

  **Source HTML**
  - `_bench/llm-corpus/16-mag-cover.html`: title/kicker use `font-family: 'Bebas Neue'` and serif deck text uses `Playfair Display`.

  **Slidify code path**
  - `slidify/fonts.py:129-143` returns unknown family names verbatim instead of normalizing to guaranteed installed fallback.

  **Patch sketch**
  ```python
  # slidify/fonts.py
  # BEFORE
  if all(part.isalpha() or part.isspace() or part in "-_" for part in tok):
      return " ".join(p.capitalize() for p in tok.split())
  # AFTER
  if all(part.isalpha() or part.isspace() or part in "-_" for part in tok):
      if tok in _FONT_MAP:
          return _FONT_MAP[tok]
      if generic_fallback is not None:
          return generic_fallback
      return DEFAULT_FONT
  ```

  **Regression fixture**
  - `tests/fixtures/qa/font-unknown-display-fallback.html` (30 lines, Bebas/Playfair heading + body).

  **Confidence**: high.

### llm-corpus / 17-mag-spread
- [major · LAYOUT-DRIFT] Right-column editorial stack drifts from authored geometry.

  **PPTX evidence**
  - `/tmp/audit/llm-corpus/ppt/slides/slide17.xml` right-column blocks are emitted as hard EMU xfrm values (`<a:off x="6385620" ...>` etc.).
  - Duplicate drop-cap node exists (`TextBox 9` and `TextBox 10`, both glyph "F", same `a:off`/`a:ext`), indicating unstable clustering/emit duplication.

  **Source HTML**
  - `_bench/llm-corpus/17-mag-spread.html` has one drop-cap element and one body flow anchor.

  **Slidify code path**
  - Emit site for `<a:off>/<a:ext>`: `slidify/compile_ir.py` shape/text xfrm writer.
  - Dedup/collapse risk path: `slidify/promotion.py:185` (already comments about redundant layers/z-order).

  **Next investigation step (patch-ready instrumentation)**
  ```python
  # slidify/compile_ir.py at the branch writing a:xfrm/a:off/a:ext
  log.info(
      "ir.bbox",
      id=node.id,
      kind=node.kind,
      src_bbox=anchor.bbox.dict(),
      emitted_bbox={"x": off_x/9525, "y": off_y/9525, "w": ext_cx/9525, "h": ext_cy/9525},
  )
  ```
  Run:
  `slidify convert _bench/llm-corpus/17-mag-spread.html /tmp/x.pptx` and diff top 4 drift ids.

  **Regression fixture**
  - `tests/fixtures/qa/layout-duplicate-dropcap.html` (30 lines; one drop-cap + body column + absolute sidebar).

  **Confidence**: medium.

### llm-corpus / 18-bru-manifesto
- [major · FONT-SUB] Brutalist headline stack emits Helvetica Neue and depends on host substitution.

  **PPTX evidence**
  - `/tmp/audit/llm-corpus/ppt/slides/slide18.xml` runs emit `<a:latin typeface="Helvetica Neue"/>`.

  **Source HTML**
  - `_bench/llm-corpus/18-bru-manifesto.html`: `font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900;`.

  **Slidify code path**
  - `slidify/fonts.py:129-133` returns unknown token title-cased (`Helvetica Neue`) rather than mapped fallback.

  **Patch sketch**
  ```python
  # slidify/fonts.py _FONT_MAP additions
  "helvetica neue": "Arial",
  "bebas neue": "Impact",
  "playfair display": "Cambria",
  ```

  **Regression fixture**
  - `tests/fixtures/qa/font-helvetica-neue-heavy.html`.

  **Confidence**: high.

### llm-corpus / 19-bru-stat-wall
- [major · FONT-SUB] Numeric wall uses unresolved Helvetica Neue at multiple weights.

  **PPTX evidence**
  - `/tmp/audit/llm-corpus/ppt/slides/slide19.xml` runs include `<a:latin typeface="Helvetica Neue"/>` for large numerals and captions.

  **Source HTML**
  - `_bench/llm-corpus/19-bru-stat-wall.html` uses same Helvetica Neue stack for stats.

  **Slidify code path**
  - `slidify/fonts.py:41-59` generic fallback map exists, but `129-133` exits early with unresolved family string.

  **Patch sketch**
  ```python
  # slidify/fonts.py resolve()
  # BEFORE: unknown token can return directly
  # AFTER: prefer _GENERIC_FAMILY_FALLBACK when stack includes sans/serif/mono token
  if all(part.isalpha() or part.isspace() or part in "-_" for part in tok):
      if generic_fallback is not None:
          return generic_fallback
      return DEFAULT_FONT
  ```

  **Regression fixture**
  - `tests/fixtures/qa/font-stat-wall-fallback.html`.

  **Confidence**: high.

### llm-corpus / 22-duo-photo
- [major · COLOR-SHIFT] Duotone treatment is emitted as flat shape stack (no gradient stops).

  **PPTX evidence**
  - `/tmp/audit/llm-corpus/ppt/slides/slide22.xml`: dominant fills are `<a:solidFill>` with `0D1F3C`, `FF9A6C`, `1A2440`; no equivalent continuous `<a:gradFill>` stop set for hero treatment.

  **Source HTML**
  - `_bench/llm-corpus/22-duo-photo.html` uses layered translucent overlays/duotone effect.

  **Slidify code path**
  - `slidify/classifier/tier1.py:466` explicitly routes blend-heavy content to approximation due PPT blend limits.

  **Patch sketch**
  ```python
  # slidify/classifier/tier1.py (blend fallback branch)
  # AFTER: emit fixed two-stop gradFill + alpha overlay recipe for duotone class
  if is_duotone_overlay(node):
      return make_duotone_recipe(stops=[("0D1F3C",0), ("FF9A6C",100000)], alpha=[76000,28000])
  ```

  **Regression fixture**
  - `tests/fixtures/qa/duotone-overlay-approx.html`.

  **Confidence**: high.

### atlas-vol-iii / 04-duotone-plate
- [major · COLOR-SHIFT] Plate duotone reduced to simplified shape-color approximation.

  **PPTX evidence**
  - `/tmp/audit/atlas-vol-iii/ppt/slides/slide4.xml`: no author-equivalent CSS blend operator survives; emitted colors are discrete shape fills.

  **Source HTML**
  - `_bench/atlas-vol-iii/04-duotone-plate.html` uses layered duotone treatment with opacity blending.

  **Slidify code path**
  - `slidify/classifier/tier1.py:466` limitation note + approximation path.

  **Patch sketch**
  ```python
  # shared with llm 22
  # add a deterministic duotone emit helper and call it from blend fallback branch
  ```

  **Regression fixture**
  - `tests/fixtures/qa/atlas-duotone-plate.html`.

  **Confidence**: high.

### atlas-vol-iii / 08-cinemagraph
- [major · COLOR-SHIFT] Caption overlay alpha appears flattened.

  **PPTX evidence**
  - `/tmp/audit/atlas-vol-iii/ppt/slides/slide8.xml` caption block present as solid fill stack; per-stop/per-fill alpha granularity is reduced relative to HTML overlay.

  **Source HTML**
  - `_bench/atlas-vol-iii/08-cinemagraph.html` caption uses rgba backdrop over animated plate.

  **Slidify code path**
  - Alpha emit path in compile/emitter for shape fill serialization.

  **Next investigation step (patch-ready instrumentation)**
  ```python
  # at solid/gradient fill emit site (compile_ir/emitter)
  log.info("fill.alpha", node_id=node.id, css=node.css.get("background"), ooxml_alpha=alpha_val)
  ```
  Then run a single-slide convert and diff logged alpha vs computed CSS rgba alpha for caption nodes.

  **Regression fixture**
  - `tests/fixtures/qa/caption-rgba-overlay.html`.

  **Confidence**: medium.

## Leverage table

| Rank | Finding | Slides affected | Confidence | LOC est. |
|---|---|---:|---|---:|
| 1 | font-unknown-family-fallback | 4 | high | ~25 |
| 2 | duotone-blend-approx | 3 | high | ~50 |
| 3 | mag-spread-layout-drift-instrument | 2 | medium | ~20 instrumentation |
| 4 | caption-alpha-emit-instrument | 1 | medium | ~20 instrumentation |
