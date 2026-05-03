# Bench Workflow

`_bench` is the presentation-rendering corpus for slidify. It intentionally
contains native-friendly decks, image-led decks, animated fixtures, generated
archives, and raster-rich stress cases. The pipeline goal is native-first
editability plus brilliant rasterization where native PPTX would damage visual
fidelity. Do not remove rasterized slides: they are fidelity fixtures for masks,
blends, filters, remote images, and complex visual effects.

## Setup

```bash
make bootstrap
make doctor
```

`make bootstrap` installs Python dependencies into the repo-local `.venv` and
downloads Playwright Chromium into `.ms-playwright`. System packages are checked
by `make doctor`; install LibreOffice, Tesseract, poppler, and Inter when it
reports them missing.

## Folder Contract

`_bench` is split into source fixtures, generated working sets, and tooling:

| Path | Role |
| --- | --- |
| `_bench/corpus/` | Curated, numbered corpus for harvesting and mixable presentation sets. |
| `_bench/decks/` | Full deck families, including `llm-corpus`, `atlas-vol-iii`, `agora-protocol`, `crt-archive`, `field-notes-quarterly`, `seasons-of-pacific`, and `studio-noir-vol-i`. |
| `_bench/prompts/` | Source prompts used to produce or expand corpus material. |
| `_bench/scripts/` | Bench-only index, compose, harvest-report, and QA helpers. |
| `_bench/generated/app-cache/` | Generated PNG previews for the local viewer; ignored by git. |
| `_bench/generated/composed/` | Generated mix-and-match HTML decks; ignored by git. |
| `_bench/generated/dist/` | Generated PPTX outputs. |
| `_bench/reports/` | Generated harvester JSON, markdown reports, QA notes, and promotion queues. |

Top-level generated indexes (`_bench/index.{json,html}` and
`_bench/corpus/index.{json,html}`) are intentionally checked in so humans and
agents can inspect the corpus without re-running scripts.

## Indexes

```bash
make bench-index-all
```

This writes:

- `_bench/index.json` and `_bench/index.html`: every deck-like folder under
  `_bench/corpus` and `_bench/decks`, with numbering status and generator detection.
- `_bench/corpus/index.json` and `_bench/corpus/index.html`: the curated corpus
  with sequential slide ids, old ids, render mode, tags, catalogs, and named
  presentation mixes.

## Compose And Render

```bash
make bench-compose DECK=product-pitch
make bench-compose-tag TAG=raster-rich
make bench-render DECK=product-pitch
make bench-render-all
```

Composed decks are written under `_bench/generated/composed/` and are ignored
by git. Rendered PPTX outputs land in `_bench/generated/dist/`. Use
`make bench-render-all` to render the curated corpus plus every full deck
family in `_bench/decks/`.

## Human Viewer

```bash
make bench-app
```

Open `http://127.0.0.1:15999`. The app shows rendered source HTML on the left
and the matching PPTX preview on the right. PPTX previews are read from
`_bench/generated/dist/<deck>.pptx`, converted lazily to PNG, and cached in
`_bench/generated/app-cache/`.

If the right pane is empty, render that deck first:

```bash
make bench-render DECK=product-pitch
```

## Harvest Signals

```bash
make bench-harvest
```

This writes `_bench/reports/harvest/bench-signals.json` and
`_bench/reports/harvest/bench-report.md`. Each cluster now includes pipeline signals:
source spread, average visual area, aspect and size buckets, visual features,
editability goal, raster fidelity goal, fidelity risk, render strategy,
promotion priority, and concrete pipeline actions such as
`promote-to-native-pattern`, `add-hybrid-recipe`, `preserve-raster-layer`,
`optimize-raster-crop-and-resolution`, or `add-fidelity-regression-case`.

By default `bench-harvest` mines `_bench/corpus`, the curated source of truth.
Override `HARVEST_INPUT` when you want to mine another source folder:

```bash
make bench-harvest HARVEST_INPUT=_bench/decks/llm-corpus
make bench-harvest HARVEST_INPUT=_bench/decks/atlas-vol-iii
```

Use these signals to decide where the renderer should improve next:

- High-priority `native-atom` and `native-pattern` clusters feed the pattern DB
  so more of the deck remains editable.
- `hybrid-recipe` and `effect-aware-hybrid` clusters become mixed native/raster
  renderer recipes with editable structure and surgical raster effects.
- `preserve-raster` clusters keep the irreducible visual layer rasterized, but
  still need excellent crop, resolution, transparency, and source-vs-PPTX pixel
  regression coverage.

## Gates

```bash
make bench-run
make bench-run-strict
```

`bench-run` is an audit pass and exits successfully even when designer-grade
slides use risky CSS or remote images by design. `bench-run-strict` is the
native-only gate for fixtures that must remain self-contained and conservative.
