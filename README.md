# slidify

> Render-and-classify pipeline that converts HTML decks to maximally-editable PPTX.

slidify converts HTML slide decks into PPTX files where the maximum possible
fraction of content is **native, editable PPTX primitives** — text frames,
shapes, lines, native pictures — and only the irreducibly visual residue
(gradients, complex SVGs, Chart.js canvases) is rasterized.

The single metric we optimize: `native_area_ratio` — the fraction of slide
area covered by native shapes — subject to perceptual fidelity floors
(SSIM ≥ 0.95, OCR recall ≥ 0.98).

## Install

System dependencies (Ubuntu / Debian):

```bash
sudo apt-get install -y libreoffice-impress poppler-utils tesseract-ocr fonts-inter
```

Python deps + browser:

```bash
uv sync --extra dev
uv run playwright install chromium --with-deps
```

## Use

CLI:

```bash
slidify convert deck.html deck.pptx
```

Python:

```python
import asyncio
from pathlib import Path
from slidify import convert, ConversionConfig

async def main():
    html = Path("deck.html").read_text()
    cfg = ConversionConfig(run_tier3=True, run_oracle=True)
    result = await convert(html, "deck.pptx", cfg)
    print(f"native_area_ratio={result.native_area_ratio:.2f}")
    print(f"oracle: {sum(r.passed for r in result.fidelity_reports)}/{result.n_slides}")

asyncio.run(main())
```

## Pipeline

```
HTML → split → render (Playwright) → DOM walk → cluster into VisualUnits →
  tier 1 (rules) → tier 2 (heuristics) → tier 3 (LLM) → promote → emit →
  oracle (LibreOffice + SSIM + OCR) → auto-correct → ship
```

## LLM backends (tier 3)

The tier-3 adjudicator picks a vision-capable LLM for the small residue of
ambiguous units. Four backends are supported; pick one via env var or
`ConversionConfig.llm_backend`.

| Backend          | Env vars                                                   | Default model           |
| ---------------- | ---------------------------------------------------------- | ----------------------- |
| `gemini-aistudio`| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)                     | `gemini-2.5-pro`        |
| `gemini-vertex`  | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`            | `gemini-2.5-pro`        |
| `anthropic`      | `ANTHROPIC_API_KEY`                                        | `claude-opus-4-7`       |
| `claude-vertex`  | `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (e.g. `us-east5`) | `claude-opus-4-7@20260101` |

Auto-detection order: gemini-aistudio → gemini-vertex (if `SLIDIFY_PREFER_VERTEX_GEMINI` set) →
anthropic → claude-vertex.

CLI override:

```bash
slidify deck.html deck.pptx \
    --llm-backend gemini-vertex \
    --google-project my-gcp-project \
    --google-location us-central1
```

If no provider is configured (or any call fails), tier 3 safely falls back to
Raster decisions — output remains correct, just less editable.

## Hint protocol

Cooperating HTML producers can emit `data-pptx-*` attributes that bypass
classification. See spec §10. Examples:

```html
<h1 data-pptx-role="title">Maximum editability</h1>
<canvas data-pptx-rasterize="true">…</canvas>
<div data-pptx-skip="true">debug overlay</div>
<div data-pptx-text="Q1 results">Q1 sales numbers</div>
```

## Layout

```
slidify/
  api.py            # public convert(...)
  cli.py            # `slidify` entrypoint
  models.py         # Pydantic models
  geom.py, fonts.py, colors.py
  splitter.py
  renderer.py       # Playwright wrapper
  dom_walker.py     # in-page JS
  units.py          # visual unit clusterer
  classifier/
    tier1.py        # deterministic rules
    tier2.py        # heuristic scoring
    tier3.py        # LLM adjudicator
    llm.py          # multi-provider abstraction
    prompts.py
  promotion.py      # bottom-up DAG resolution
  emitter.py        # python-pptx output
  oracle.py         # SSIM + OCR + auto-correct
  cache.py          # structural memoization
tests/
  unit/             # rule + clustering tests
  integration/      # full pipeline smoke
  fixtures/         # sample decks
```

## License

MIT — see `LICENSE`.
