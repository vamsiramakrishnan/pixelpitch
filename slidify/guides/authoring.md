# Authoring HTML for slidify

Goal: produce HTML where the maximum possible fraction of slide area lands as
**editable PPTX shapes** rather than rasters.

## Hard contract

1. Single self-contained HTML file. All CSS inline in `<style>`. No external
   stylesheets, no JS. Inline SVG is allowed.
2. Viewport is exactly **1280 × 720 px**. Pin it:
   ```html
   html, body { margin:0; padding:0; width:1280px; height:720px;
                font-family: Inter, sans-serif; }
   .slide    { width:1280px; height:720px; box-sizing:border-box;
               position:relative; overflow:hidden; }
   ```
3. Each slide is its own `<!DOCTYPE html>...</html>`. slidify splits a single
   file on doctype boundaries.
4. Mark the slide title with `data-pptx-role="title"` (exactly one element).
5. Use the **Inter** font. slidify embeds it.

## What renders natively (use these aggressively)

* Solid + linear/radial gradients (`background: linear-gradient(...)`).
* Multi-layer `box-shadow` — each layer becomes a native outer shadow.
* `border` + `border-radius` — emitted as line + rounded-rect.
* Inline `<span style="color:...">` / `<em>` / `<b>` — per-run styling.
* `-webkit-background-clip: text` gradient text.
* Inline SVG `<rect>`, `<circle>`, `<line>`, `<polygon>`, `<path d="...">`
  with cubic/quadratic curves.
* Preset shapes via `clip-path: polygon(...)` or class hints
  (`.chevron`, `.arrow-right`, `.star`, `.hex`).

## Decoration hints

Add `data-slidify-decorate="HINT"` to elements for layered native effects:

| Hint        | Effect                                  | Use on              |
|-------------|-----------------------------------------|---------------------|
| `hero`      | 4-corner mesh glow + hairline           | Hero bg, feature card |
| `spotlight` | Centered radial blob                    | CTA backgrounds     |
| `aurora`    | Three horizontal glow bands             | Quote / callout     |
| `orbit`     | Five distributed blobs                  | Dashboard bg        |
| `glass`     | Rim highlight + hairline + inset glow   | Stat cards, tiles   |
| `tactile`   | Strong rim + thin border                | Buttons, pills      |
| `recessed`  | Inset dark shadow                       | Code blocks         |

3–6 decorated containers per slide is the sweet spot.

## What forces a raster (avoid)

* CSS `filter: blur()` on visible elements
* SVG `<filter>`, masks, complex clip-paths
* `transform: rotate(N)` for N ∉ {0, 90, 180, 270}
* `<canvas>`
* `background-image: url(...)` (no fetch — use gradients or inline SVG)
* `@font-face` with custom fonts (only Inter survives)
* `<table>` (use CSS grid)

## Density target

Per slide: 15–30 distinct visual elements, 2–4 typographic levels, 3–6
decorated containers, ≥ 1 inline SVG decoration, header (kicker + title)
and footer (label + page number).

## Verification loop

```bash
slidify convert slide.html out.pptx --json | jq '.native_area_ratio'
```

* `native_area_ratio ≥ 0.85` → excellent, mostly editable
* `0.6 – 0.85` → good, some raster fallbacks
* `< 0.6` → revisit: probably background images, blurs, or unsupported SVG
