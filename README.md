# slidify

> Convert HTML decks into PPTX with maximal editability and high-fidelity rendering.

slidify converts HTML slide decks into PPTX files where the maximum useful
fraction of content is **native, editable PPTX**: text frames, shapes, lines,
tables, native pictures, and SVG-derived geometry. When native PPTX cannot
faithfully express the visual result, slidify uses rasterization deliberately:
surgical crops, image-aware hybrids, and full raster layers for irreducible
effects such as complex masks, filters, blends, canvas, and cinematic imagery.

The single metric we optimize: `native_area_ratio` — the fraction of slide
area covered by native shapes — subject to perceptual fidelity floors
(SSIM ≥ 0.95, OCR recall ≥ 0.98).

The practical goal is not "never rasterize." It is:

1. Keep text, layout, core shapes, and data structures editable.
2. Preserve designer-grade pixels for effects that PowerPoint cannot model.
3. Use corpus feedback to turn repeated misses into native atoms or hybrid
   recipes.

## Feedback Loop

The project improves through a bench-driven loop:

```bash
make bench-index-all     # organize and inventory _bench
make bench-harvest       # convert corpus misses into pipeline signals
make bench-render DECK=product-pitch
```

`_bench/corpus` contains curated slide specimens. The harvester writes
`_bench/reports/harvest/bench-signals.json` and `_bench/reports/harvest/bench-report.md`,
which classify misses by source spread, visual area, fidelity risk,
editability goal, raster fidelity goal, render strategy, promotion priority,
and pipeline actions.

Those signals drive the roadmap:

- `native-atom` / `native-pattern`: promote to editable pattern coverage.
- `hybrid-recipe`: keep editable structure, rasterize only the effect layer.
- `preserve-raster`: keep the pixel layer, but improve crop, resolution,
  transparency, and source-vs-PPTX regression coverage.

## Install

Three options, ranked by friction:

```bash
# 1. Single-binary install (recommended for users) — first run auto-provisions
#    a private Python 3.11 + Playwright Chromium under ~/.local/share/slidify/.
curl -fsSL https://slidify.sh/install | sh
slidify doctor

# 2. Docker (most self-contained — bundles LibreOffice / Tesseract / fonts).
docker build -f packaging/Dockerfile -t slidify:latest .
docker run --rm -v "$PWD":/work slidify:latest convert /work/deck.html /work/deck.pptx

# 3. From source (development).
sudo apt-get install -y libreoffice-impress poppler-utils tesseract-ocr fonts-inter
make bootstrap
make doctor
```

Verify with `slidify doctor`. See [`packaging/`](packaging/) for the full
matrix (Rust bootstrap, Docker, PyInstaller bundle, pip).

If `make doctor` reports `Chromium launch` as failing, run:

```bash
make playwright-deps
make doctor
```

That check launches a real headless Chromium page, so it catches missing shared
libraries and restrictive execution environments before a new contributor hits
them during render or harvest.

Useful source checkout targets:

| Command | Purpose |
| --- | --- |
| `make bootstrap` | Install Python deps into `.venv` and Chromium into `.ms-playwright`. |
| `make playwright-deps` | Install Chromium plus Playwright OS libraries. |
| `make doctor` | Verify LibreOffice, Tesseract, poppler, Chromium launch, and Inter. |
| `make check` | Run lint and tests. |
| `make bench-index-all` | Rebuild `_bench` and `_bench/corpus` indexes. |
| `make bench-harvest` | Generate bench signal JSON and markdown report. |
| `make bench-render DECK=product-pitch` | Compose and render one named corpus mix. |
| `make bench-app` | Serve the human HTML/PPTX side-by-side viewer on port `15999`. |

## Use

CLI:

```bash
# Single HTML file with optional <!DOCTYPE> separators
slidify deck.html deck.pptx

# Directory of per-slide files (sorted lexicographically — name them 01.html, 02.html, …)
slidify slides/ deck.pptx

# Stdin pipe (no temp files)
cat deck.html | slidify convert - deck.pptx --json
```

The CLI is designed to be self-describing — every command emits structured
JSON, every error includes a `_remediation` block, every successful run
includes a `_next` array of follow-up commands:

```bash
slidify doctor              # verify environment (LibreOffice, Chromium, …)
slidify manifest --brief    # one-line index of every command
slidify manifest convert    # full spec for one command (drill-down)
slidify guide               # list of long-form guides
slidify guide authoring     # how to author HTML for high native-area ratio
slidify guide authoring --section "What forces a raster"   # section pluck
slidify guide --search "tier 0"                            # cross-guide grep
slidify field report.json native_area_ratio                # built-in jq-lite
```

Exit codes: `0` ok, `1` doctor missing deps, `2` conversion error, `3`
editability drift (shapes silently dropped). For LLM agents, the
[`html-to-slides` skill](.claude/skills/html-to-slides/SKILL.md) (mirrored
under [`.gemini/`](.gemini/skills/html-to-slides/SKILL.md)) wraps the
canonical agent loop.

Python — `convert(source, pptx_path, config)` accepts five source forms:

```python
import asyncio
from pathlib import Path
from slidify import convert, ConversionConfig

async def main():
    cfg = ConversionConfig(run_tier3=True, run_oracle=True)

    # 1) Full HTML string (multi-slide via DOCTYPE separators)
    await convert(Path("deck.html").read_text(), "out.pptx", cfg)

    # 2) Path to a single .html file
    await convert(Path("deck.html"), "out.pptx", cfg)

    # 3) Path to a directory of per-slide .html files
    await convert(Path("slides/"), "out.pptx", cfg)

    # 4) Iterable of HTML strings (one per slide)
    await convert([slide_a, slide_b, slide_c], "out.pptx", cfg)

    # 5) Async iterator — true streaming, slides pulled on demand
    async def stream():
        async for s in fetch_slides_from_db():
            yield s
    await convert(stream(), "out.pptx", cfg)

asyncio.run(main())
```

### Memory characteristics for large decks

The pipeline streams: each slide is rendered → classified → emitted, and intermediate
state is dropped before the next batch starts. Peak memory is bounded by
`render_concurrency` (default 4 slides in flight), not by deck size — *with one caveat*.

When `run_oracle=True`, the auto-correction loop needs per-slide state (units,
decisions, ground-truth PNGs) so it can re-classify failing regions after the
LibreOffice/SSIM/OCR pass. Set `keep_plans_for_oracle=False` (CLI flag:
`--low-memory`) to drop that state right after emit; you still get a single
fidelity report per slide, but failing regions are not auto-fixed.

## Pipeline

```
HTML → split → render (Playwright) → DOM walk → cluster into VisualUnits →
  tier 1 (rules) → tier 2 (heuristics) → tier 3 (LLM) → promote → emit →
  oracle (LibreOffice + SSIM + OCR) → auto-correct → ship
```

The corpus harvester sits beside the pipeline. It aggregates
`unmatched_signatures` across `_bench`, ranks the repeated misses, and labels
them as native-editability work, hybrid recipe work, or raster-fidelity work.

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
<div data-pptx-allow-overflow="true">aurora bleed by design</div>
```

## Atomic seed (landing-page-quality decks)

For decks that need to look like a designer touched every gradient,
slidify ships an **atomic seed** — ~70 named recipes across 10 axes,
matched by `data-atom="<id>"` on the cluster anchor. The matcher
short-circuits to the recipe and emits natively, with cache hits on
repeat runs.

```html
<div data-atom="bg.mesh">…</div>
<h1 data-atom="type.gfill-4" data-pptx-role="title">Future.</h1>
<svg data-atom="data.ring">…</svg>
```

| Reference                          | What it shows |
|------------------------------------|---------------|
| [`examples/landing/atoms.html`](examples/landing/atoms.html)     | Parts catalog — every atom labeled with its `data-atom` id |
| [`examples/landing/recipes.html`](examples/landing/recipes.html) | **16 award-winning compositions** (hero / chapter / manifesto / magazine / bento / anatomy / spec / process / ticker / longshadow / dashboard / testimonials / echo / marquee / team / closing CTA) |
| [`examples/landing/fonts.html`](examples/landing/fonts.html)     | Eight typographic registers, same headline |
| [`examples/landing/probe.html`](examples/landing/probe.html)     | Constraint envelope — which primitives survive native emit |

Authoring grammar — viewport math, font registers, the 10 axes, and the
pipeline-side rules (allow-overflow inheritance for echo / longshadow /
marquee, native-line editability accounting, atom-keyed authoring hints) —
lives in the [`slide-author`](.claude/skills/slide-author/SKILL.md) skill.

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
  harvester.py      # corpus miss aggregation + pipeline signals
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
_bench/
  corpus/           # curated source corpus + mixable slide index
  harvest/          # harvester JSON + human reports
  scripts/          # index, compose, and report helpers
  composed/         # generated mixes, ignored by git
  dist/             # generated PPTX outputs
tests/
  unit/             # rule + clustering tests
  integration/      # full pipeline smoke
  fixtures/         # sample decks
```

## License

MIT — see `LICENSE`.
