# Atelier-v2 — recipes + primitives + EscapeHatch showcase

A 14-slide deck that exercises the full Tier-A primitive layer and the
codegen-emitted Tier-B recipe layer, plus the metered `EscapeHatch`
primitive on the closing slide. Built per CONTRACT-v2 §5 (showcase deck
contract) and the M7 brief.

## What it demonstrates

- **Composition over hand-coding**: 12 of 14 slides delegate entirely to
  a single `comp.*` recipe via `singleAtomSlide(index, recipeIR)`; only
  slide 6 (data viz) and slide 13 (surfaces) hand-compose primitives.
- **EscapeHatch metering** (slide 14): a conic-gradient corner decoration
  emits a `RasterNode` with `metadata.role === 'escape-hatch'` and the
  raw CSS payload preserved verbatim. The harvester picks this up later
  to surface atom-promotion candidates.
- **Graceful degradation**: many `comp.*` recipes are still in the
  `EMIT_THROWS_OVERRIDES` list (M3.5 follow-up). `safeRecipe()` swallows
  the throw and substitutes a recipe-id-stamped placeholder GroupNode so
  the deck builds end-to-end, while `report.json` surfaces the fallback
  count for the M5.x burn-down.

## Build

From the repo root:

```bash
cd components
npm install            # one-time
npm run atelier-build  # writes deck.json + report.json into examples/atelier/
```

Or directly:

```bash
components/node_modules/.bin/tsx examples/atelier/build.ts
```

Outputs (gitignored):
- `examples/atelier/deck.json` — the IR `Deck` for the Python compiler.
- `examples/atelier/report.json` — per-slide `nativeAreaRatio`,
  deck-level `escapeRate`, and the `byIntent` ledger.

## Test

```bash
cd components
./node_modules/.bin/vitest run --root .. examples/atelier
```

The smoke suite asserts (a) 14 slides, (b) deck-level structural
validation, (c) slide 14 carries a non-empty EscapeHatch, (d) every
slide composes ≥1 node.

## Slide table

| #  | Recipe / construction         | Notes                                            |
|----|-------------------------------|--------------------------------------------------|
| 1  | `comp.hero-investor`          | eyebrow + headline + lede                        |
| 2  | `comp.agenda-toc`             | 6 toc rows                                       |
| 3  | `comp.section-divider-mesh`   | chapter `01`, title `Foundations`                |
| 4  | `comp.big-stat-hero`          | 87% native-area-ratio, +29% delta                |
| 5  | `comp.three-up-stats`         | atoms / recipes / escape-rate                    |
| 6  | **custom data-viz**           | `data.donut` + `data.bar` + `data.sparkline` + `data.kpi-row` |
| 7  | `comp.roadmap-quarterly`      | 2026 plan of record                              |
| 8  | `comp.bento-mixed`            | 6 cells, mixed kinds                             |
| 9  | `comp.annotated-screenshot`   | 3 hotspots                                       |
| 10 | `comp.quote-editorial`        | editorial pull quote                             |
| 11 | `comp.roadmap-quarterly` (v2) | platform milestones                              |
| 12 | `comp.team-grid`              | 6 members                                        |
| 13 | **custom surfaces**           | `bg.aurora-corners` + `bg.dot-lattice-fine` + `bg.line-grid` + `bg.spotlight-tight` + `dec.section-divider` |
| 14 | `comp.closing-cta` + `EscapeHatch` | conic-gradient corner intent                |

Source of truth: `examples/atelier/deck.tsx`. Recipes live in
`components/src/recipes/`; primitives in `components/src/primitives/`.

## Out of scope (intentional skips)

- **PPTX compilation.** The deck stops at IR JSON; running
  `slidify compile-ir` on the output is left for the next milestone.
- **Per-slide visual polish.** The whole deck stays in the `vercel-dark`
  preset; the preset matrix is exercised by
  `components/src/__tests__/preset-matrix/matrix.test.ts`, not here.
- **Per-slide layout tuning.** `singleAtomSlide()` plants each recipe at
  the full `1280x720` slide bbox; bento/multi-region tuning is the
  recipe's job.
