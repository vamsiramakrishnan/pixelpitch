# Slidify harvester corpus — bootstrap manifest

This directory is the seed corpus for the Wave-2B-v2 manifest pivot's
**Tier-B vocabulary mining run** (see `slidify harvest`).

The user-facing target is a curated 200-deck corpus. The bootstrap MVP is
"what we already have" — every HTML file ships with the slidify repository
under MIT license. Future expansion (additional shipped/permissively-licensed
public decks) is M4-followup work.

## Source attribution

| File | Source | License | Capture date |
|------|--------|---------|--------------|
| `landing-atoms.html`     | `examples/landing/atoms.html`     | MIT (slidify) | 2026-05-02 |
| `landing-fonts.html`     | `examples/landing/fonts.html`     | MIT (slidify) | 2026-05-02 |
| `landing-probe.html`     | `examples/landing/probe.html`     | MIT (slidify) | 2026-05-02 |
| `landing-recipes.html`   | `examples/landing/recipes.html`   | MIT (slidify) | 2026-05-02 |
| `sophisticated.html`     | `examples/sophisticated/deck.html`| MIT (slidify) | 2026-05-02 |
| `slide-01..49-*.html`    | `_bench/corpus/` (pre-existing, renumbered sequentially) | MIT (slidify) | shipped with `_bench/` |
| `index.json` / `index.html` | `_bench/scripts/build_corpus_index.py` | MIT (slidify) | generated locally |
| `animated/`              | `_bench/corpus/animated/` (pre-existing) | MIT (slidify) | shipped with `_bench/` |

Pre-existing `slide-NN-*.html` files were committed by the `_bench/` author
prior to M4 and are reused as additional corpus signal — they're MIT under the
slidify repository root LICENSE.

The original corpus used decade-spaced filename groups (`01..07`, `11..17`,
and so on through `67`). The current corpus keeps the same files but renumbers
them sequentially as `slide-01..49-*` for stable sorting and composition.

## Composing presentation mixes

```bash
uv run python _bench/scripts/build_corpus_index.py
uv run python _bench/scripts/compose_corpus.py --deck image-led-magazine
uv run slidify convert _bench/generated/composed/image-led-magazine \
    _bench/generated/dist/image-led-magazine.pptx
```

The index deliberately labels raster-rich specimens rather than avoiding them;
the magazine/image slides are intended to preserve designer-grade visual effects
where rasterization is the correct tradeoff.

## Reproducing the mining run

```bash
uv run python -m slidify harvest _bench/corpus/ \
    --output _bench/reports/harvest/clusters.json \
    --top-n 50 \
    --min-occurrences 1
```

The output (`_bench/reports/harvest/clusters.json`) is committed to the repo so that
designer review of the candidate atom proposals is auditable across PRs.

## Scope intentionally NOT covered

* No web-scraped decks. The harvester is an aggregation layer — it does not
  fetch external HTML.
* No hand-authored synthetic slides. Every cluster in `clusters.json` traces
  back to a file in this directory.
* No proprietary corporate templates. The bootstrap is a license-clean MVP.

When the corpus grows beyond MIT-shipped files, *each new entry* must
declare its source + license + capture date in the table above. Anything
without a row gets pruned in CI (validator: M4-followup).
