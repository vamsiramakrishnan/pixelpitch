# @slidify/components — CONTRACT-v2 (Manifest-First)

**Status:** DRAFT v0.2 — audit returned, audit-dependent sections filled. Ready for review and crew fanout.

## Audit findings (TL;DR)

The atom catalog **already exists** at `slidify/patterns/data/atoms.yaml` — 61 hand-curated recipes across 10 axes (`comp`, `bg`, `surf`, `type`, `mask`, `dec`, `data`, `motion`, `ui`, `anno`). Naming is `axis.variant`, dotted, hyphenated (`bg.aurora-band`, `surf.glass`, `data.ring`). The matcher entry point is `slidify.patterns.matcher._h_data_atom_id` matching on `data-atom="..."` attributes. Confidence scores are hand-set 0.95–0.99. A separate Tier-0 pattern DB (`patterns.yaml`, 52 inference rules) handles unhinted content. Harvester CLI doesn't exist as a separate command but the infrastructure does: `ConversionResult.unmatched_signatures` already logs every unmatched cluster with sig hash + occurrence count. Reverse PPTX→IR is schema-ready (`recipeId` field), not implemented.

**Pivot impact:** much smaller than originally scoped. We're not building atoms.yaml — we're extending it (~9 new rows for F1 shape presets that lack atom analogs), wrapping it with codegen that emits TSX, and threading atom ids through `recipeId` so renderer + matcher share one vocabulary.

**Supersedes:** `components/CONTRACT.md` for everything in §4 (component roster) and onward. The Wave-2A foundations (§1 IR extensions, §2 token system, §3 Python parity) are unchanged and already shipped.

**Pivot rationale:** The original spec encoded a designer's guess of 60 hand-written components. That risks (a) duplicating the matcher's existing atom vocabulary, (b) calcifying 2024-25 design trends into TSX, (c) leaving the long tail to LLM-generated raw CSS the moment the catalog pinches. v2 rebuilds the component layer as a thin renderer over a single declarative manifest, with two-tier vocabulary, semver presets, harvester-driven curation, and a metered escape hatch.

---

## Foundational principles (the seven moves)

1. **Single manifest is the source of truth** (atom row → TSX, JSON Schema, priming table all derived).
2. **Component → atom contract test**, on every commit. CI guard between renderer and recognizer.
3. **Two-tier vocabulary**: ~20 structural primitives (Tier-A) + ~80 named recipes (Tier-B). Tier-A is durable; Tier-B is disposable.
4. **Versioned theme presets with semver**. ✅ Already retrofitted into F2 (`TokenBundle.version: '1.0.0'`).
5. **First-class `<EscapeHatch>` with metering**. Escape rate is a top-line metric in `report.json`.
6. **Bottom-up vocabulary curation** from a 200–500 deck corpus. Quarterly re-runs.
7. **Theme preset matrix as a CI floor.** Every component renders cleanly in all 5+ presets and passes `native_area_ratio ≥ 0.97`.

---

## §0. What changed from CONTRACT-v1

| v1 | v2 |
| --- | --- |
| 60 hand-written components in TSX | ~20 Tier-A primitives + ~80 manifest-driven Tier-B recipes |
| `recipeId` is `camelCaseComponentName` | `recipeId` is dotted atom id (e.g., `bg.aurora-band`) shared with matcher |
| TokenBundle has `name` only | `TokenBundle.name + version` (semver), bundles frozen post-publish |
| No CI guard between TSX and matcher | Contract test: every component round-trips through walk → cluster → classify and asserts atom id stability |
| Manual vocabulary expansion | Harvester runs against a curated corpus; top clusters become Tier-B candidates |
| Catch-all CSS escape silently rasterizes | `<EscapeHatch>` atom captures payload; metered as `report.escapeRate` |

---

## §A. Manifest schema (anchored on existing `atoms.yaml`)

**File:** `slidify/patterns/data/atoms.yaml` — extant, 61 entries, 606 lines. The codegen reads this directly. **No new manifest file is created.**

**Sister file:** `slidify/patterns/data/patterns.yaml` (52 Tier-0 inference patterns). Out of scope for the renderer-side pivot but referenced here because the matcher loads both.

### A.1 Existing row schema (verbatim)

```yaml
- id: atom-bg-mesh
  priority: 52
  match:
    anchor.data_atom_id: bg.mesh
  emit:
    kind: NativeShape
    confidence: 0.99
    metadata: { recipe: atom_bg_mesh, axis: bg, layers: 4, fill: radial-mesh }
```

### A.2 Schema extensions (additive, M1 ships these)

To make atoms.yaml consumable by the codegen, M1 adds two optional sections per row:

```yaml
- id: atom-bg-mesh
  priority: 52
  match:
    anchor.data_atom_id: bg.mesh
  emit:
    kind: NativeShape
    confidence: 0.99
    metadata: { recipe: atom_bg_mesh, axis: bg, layers: 4, fill: radial-mesh }

  # NEW (M1): renderer-side codegen targets
  renderer:
    component: BgMesh                      # PascalCase TSX export name
    tier: B                                 # A | B (Tier-A lives in primitives/)
    primitive: frame.safe-area              # Tier-A primitive this delegates to
    version: 1.0.0                          # Per-atom semver
    props:
      bbox:      { type: bbox, required: true }
      cx:        { type: number, min: 0, max: 1, default: 0.5 }
      cy:        { type: number, min: 0, max: 1, default: 0.2 }
      colorA:    { type: color, default: 'tokens.gradient.accent-grad' }
      intensity: { type: enum, values: [low, med, high], default: med }

  # NEW (M1): contract-test reference
  fixture:
    sample_html: |
      <div data-atom="bg.mesh" style="..."></div>
    expected_recipe_id: bg.mesh             # IR recipeId MUST equal the atom id
```

**Backward compatibility:** rows without the `renderer:` or `fixture:` blocks behave exactly as today (matcher reads `match` + `emit` only). Codegen ignores them. M1's job is to add `renderer:` blocks to all 61 existing atoms, not to change matcher semantics.

### A.3 The 10 axes (frozen vocabulary)

| Axis | Count | Examples |
| --- | --- | --- |
| `comp.*` | 1 | namespace |
| `bg.*` | 8 | `bg.mesh`, `bg.conic`, `bg.aurora-band`, `bg.dot-lattice`, `bg.duotone`, ... |
| `surf.*` | 8 | `surf.glass`, `surf.hero`, `surf.spotlight`, `surf.aurora`, ... |
| `type.*` | 10 | `type.gfill-2`, `type.gfill-4`, `type.stroke`, `type.echo`, `type.dropcap`, ... |
| `mask.*` | 8 | `mask.disc`, `mask.arch`, `mask.hex`, `mask.parallelogram`, `mask.triangle`, ... |
| `dec.*` | 1 | namespace (M1 expands with brace, plus, star, arrow rows from F1 presets) |
| `data.*` | 8 | `data.ring`, `data.gauge`, `data.sparkline`, `data.kpi-delta`, ... |
| `motion.*` | 6 | (out of scope for static PPTX; observe-only for now) |
| `ui.*` | 6 | `ui.browser-chrome`, `ui.tab-strip`, `ui.avatar-cluster`, ... |
| `anno.*` | 4 | `anno.leader-line`, `anno.dimension`, `anno.target-reticle`, `anno.callout-pill` |

**Total: 61 atoms today + ~9 M1-added (see §A.4) = ~70 going into codegen.**

### A.4 Vocabulary expansion (M1 adds)

The existing 61 atoms cover 10 axes but are thin in several: `comp.*` and `dec.*` are namespace-only stubs; `anno.*` is just 4 entries; `ui.*` lacks code/device/terminal chrome; `data.*` lacks tables and KPI strips; `surf.*` lacks bento cells, paper, brutalist; `bg.*` lacks the F1 pattern fills. Per the directive: **not one-trick wonders.** M1 adds ~80 new rows for comprehensive coverage. Final atoms.yaml ships at **~140 entries**.

**A.4.1 — `bg.*` additions (currently 8 → target 18)**

`bg.dot-lattice-fine`, `bg.dot-lattice-coarse`, `bg.line-grid`, `bg.crosshatch`, `bg.diagonal`, `bg.spotlight-tight`, `bg.spotlight-soft`, `bg.scrim-bottom`, `bg.scrim-top`, `bg.aurora-corners` (4-corner mesh).

**A.4.2 — `surf.*` additions (currently 8 → target 18)**

`surf.card-flat`, `surf.card-raised`, `surf.card-floating`, `surf.card-depth` (StatCardWithDepth's signature stack), `surf.card-bordered` (brutalist), `surf.card-paper` (editorial), `surf.bento-cell`, `surf.section-band`, `surf.frame-letterbox`, `surf.tape-band` (skewed parallelogram).

**A.4.3 — `type.*` additions (currently 10 → target 18)**

`type.big-number` (numeral-md), `type.big-number-xl` (numeral-xl), `type.big-number-gradient` (gradient-clipped), `type.eyebrow-ruled` (kicker + hairline), `type.eyebrow-tape` (kicker + tape band), `type.pullquote-serif`, `type.pullquote-brutalist`, `type.numerals-tabular`.

**A.4.4 — `mask.*` additions (currently 8 → target 12)**

`mask.octagon`, `mask.callout`, `mask.gradient-fade-edge` (alpha mask on PictureNode), `mask.rounded-rect-clip`.

**A.4.5 — `dec.*` additions (currently 1 namespace-only → target 18)**

`dec.brace-left`, `dec.brace-right`, `dec.brace-top`, `dec.brace-bottom`, `dec.plus`, `dec.star-5`, `dec.star-6`, `dec.arrow-right`, `dec.arrow-left`, `dec.arrow-up`, `dec.arrow-down`, `dec.hairline-rule`, `dec.dotted-rule`, `dec.corner-crop`, `dec.section-divider`, `dec.numeral-chapter`, `dec.bullet-dot`.

**A.4.6 — `data.*` additions (currently 8 → target 18)**

`data.connector` (path + arrowhead), `data.bar-set-h`, `data.bar-set-v`, `data.donut`, `data.donut-multi-segment`, `data.kpi-row`, `data.data-table`, `data.mini-heatmap`, `data.bullet-bar`, `data.delta-badge`.

**A.4.7 — `anno.*` additions (currently 4 → target 14)**

`anno.callout-bubble`, `anno.numbered-hotspot` (numbered dot + leader), `anno.tooltip` (callout with leader), `anno.stamp-draft`, `anno.stamp-new`, `anno.stamp-internal`, `anno.highlighter-mark` (yellow underlay), `anno.redaction-bar`, `anno.brace-labeled` (brace + caption), `anno.sticker`.

**A.4.8 — `ui.*` additions (currently 6 → target 18)**

`ui.code-block`, `ui.code-block-syntax` (token-colored spans), `ui.terminal-window`, `ui.device-phone`, `ui.device-laptop`, `ui.browser-mac`, `ui.browser-win`, `ui.browser-minimal`, `ui.status-dot`, `ui.stepper`, `ui.progress-bar`, `ui.checklist`.

**A.4.9 — `comp.*` composite atoms (currently 1 namespace-only → target 14)**

These replace the v1 "templates" crew (B1) with manifest-driven composites, per §A.6:

`comp.hero-investor`, `comp.hero-product`, `comp.agenda-2col`, `comp.agenda-toc`, `comp.big-stat-hero`, `comp.three-up-stats`, `comp.quote-editorial`, `comp.section-divider-mesh`, `comp.roadmap-quarterly`, `comp.team-grid`, `comp.closing-cta`, `comp.bento-mixed`, `comp.annotated-screenshot`, `comp.data-overview`.

**A.4.10 — `motion.*`, `mask.*` (selected only)**

`motion.*` is **observe-only** for now (PPTX is static). M1 adds no rows; existing 6 stay as observed-but-not-emitted.

### A.4-summary

| Axis | Today | Adds | Target |
| --- | ---: | ---: | ---: |
| `comp` | 1 | 14 | 15 |
| `bg` | 8 | 10 | 18 |
| `surf` | 8 | 10 | 18 |
| `type` | 10 | 8 | 18 |
| `mask` | 8 | 4 | 12 |
| `dec` | 1 | 17 | 18 |
| `data` | 8 | 10 | 18 |
| `anno` | 4 | 10 | 14 |
| `ui` | 6 | 12 | 18 |
| `motion` | 6 | 0 | 6 |
| **Total** | **60** | **95** | **155** |

(comp axis was 1 namespace-only stub; counted as 1 today.)

**Total adds: ~95. Final atoms.yaml ships at ~155 entries.** Comprehensive coverage across structural roles, visual treatments, and authored compositions. LLMs reach for atoms by default; raw CSS only when a genuinely novel composition is needed.

### A.5 The two namespace problem (recipeId vs atom id)

Today: TSX components stamp `recipeId` like `statCardWithDepth.shadow`, `glassPanel.rim`. Atoms use `axis.variant` like `bg.mesh`. **Two namespaces for the same set of slots.**

**M2 fix:** every codegen-emitted Tier-B TSX component stamps `recipeId: '<atom-id>'` (and `recipeId: '<atom-id>.<layer>'` for sub-recipes). The 7 existing hand-written components keep their current recipeIds for now; M2's optional follow-up migrates them.

### A.6 Composability — composite atoms

Some atoms decompose into others (e.g., a hero slide = `bg.aurora-band` + `surf.hero` + `type.gfill-4`). M1 adds an optional `composes:` block:

```yaml
- id: comp.hero-investor
  priority: 80
  match:
    anchor.data_atom_id: comp.hero-investor
  emit:
    kind: Composite
    confidence: 0.99
  renderer:
    tier: B
    composes:
      - { atom: bg.aurora-band, props: { cy: 0.2 } }
      - { atom: bg.aurora-band, props: { cy: 0.8, colorA: 'tokens.gradient.alt-grad' } }
      - { atom: surf.hero }
      - { atom: type.gfill-4 }
```

This replaces the v1 "templates" crew (B1) with a manifest-driven mechanism. Templates become composite atoms.

---

## §B. Two-tier vocabulary

### B.1 Tier-A — structural primitives (~20, hand-written)

These encode roles, not aesthetics. They survive trend rotation. Each registers itself as an atom in the manifest.

**Provisional list** (subject to audit cross-reference):

| Atom id (provisional) | Role | Notes |
| --- | --- | --- |
| `frame.bento` | N×M grid layout with span tokens | Real layout math; can't be data-only |
| `frame.split` | 60/40 or 70/30 hero | |
| `frame.three-up` | Three equal columns | |
| `frame.letterbox` | Cinematic top/bottom bands | |
| `frame.section` | Chapter break | |
| `frame.safe-area` | Inner bbox after pad-slide | |
| `slot.heading` | Slide title slot (any scale) | Defers scale to token bundle |
| `slot.eyebrow` | Kicker / ruled eyebrow slot | |
| `slot.caption` | Body / lede / footnote slot | |
| `slot.numeral` | BigNumber-class display digit slot | |
| `slot.quote` | Pullquote with attribution | |
| `slot.list` | Ordered or unordered list slot | |
| `slot.code` | Code block slot (mono + tinted bg) | |
| `data.sparkline` | PathShape + last-marker | Real path math |
| `data.bar` | BarSet horizontal/vertical | Layout math |
| `data.donut` | Arc segments (Tier-A because of arc geometry) | |
| `data.kpi-row` | N tabular metrics | |
| `data.table` | Headers + rows + zebra | Layout + measurement |
| `diagram.connector` | Path + arrowhead | Path geometry |
| `diagram.timeline` | Rail + ticks + labels | |
| `chrome.escape-hatch` | The metered escape valve | First-class |

**Total: 21.** May contract or expand by ±5 after audit.

### B.2 Tier-B — manifest-driven recipes (~80, derived)

Each Tier-B atom is a YAML/JSON row. The build emits a thin TSX wrapper (`<AuroraBand bbox={...} />`) that delegates to a Tier-A primitive with a token-bound prop bundle.

**Categories** (counts seeded; final list comes from harvester run):

- **Backdrops (~10):** `bg.aurora-band`, `bg.aurora-corners`, `bg.mesh-4corner`, `bg.mesh-vertical`, `bg.dot-grid`, `bg.line-grid`, `bg.crosshatch`, `bg.spotlight-tight`, `bg.spotlight-soft`, `bg.scrim-bottom`.
- **Surfaces (~12):** `surf.glass`, `surf.glass-noir`, `surf.card-raised`, `surf.card-floating`, `surf.card-aurora`, `surf.tape-band`, `surf.brutalist-bordered`, `surf.editorial-paper`, ...
- **Heading recipes (~8):** `text.display-gradient`, `text.display-mono`, `text.eyebrow-ruled`, `text.eyebrow-tape`, `text.pullquote-serif`, `text.pullquote-brutalist`, `text.kinetic-cascade`, `text.drop-cap`.
- **Stat / KPI recipes (~10):** `stat.depth-card`, `stat.flat-card`, `stat.delta-pill`, `stat.bullet-bar`, `stat.kpi-strip`, `stat.metric-tile`, `stat.kpi-row-tabular`, ...
- **Brand / chrome recipes (~10):** `brand.mark-gradient`, `brand.lockup-horizontal`, `brand.logo-wall-fade`, `brand.avatar-stack-ringed`, `chrome.browser-mac`, `chrome.terminal-dark`, `chrome.code-block-syntax`, ...
- **Annotation recipes (~8):** `annot.numbered-hotspot`, `annot.tooltip-callout`, `annot.highlighter-yellow`, `annot.stamp-rotated`, `annot.brace-labeled`, `annot.redaction-bar`, ...
- **Diagram recipes (~12):** `diagram.flow-pill`, `diagram.flow-chevron`, `diagram.swimlane`, `diagram.quadrant-2x2`, `diagram.venn-pair`, `diagram.org-tree`, `diagram.stack-layers`, `diagram.funnel`, ...
- **Decoration recipes (~10):** `dec.hairline-rule`, `dec.dotted-rule`, `dec.tape-skew`, `dec.corner-crop`, `dec.section-divider`, `dec.numeral-chapter`, ...

Final composition + names from harvester (M4).

### B.3 Adding a new recipe

```yaml
# components/atoms/atoms.yaml (provisional path)
- id: bg.aurora-band
  tier: B
  structural: false
  description: "Single horizontal aurora wash, violet→pink gradient."
  props:
    bbox: { type: bbox, required: true }
    color: { type: color, default: tokens.gradient.accent-grad }
    intensity: { type: enum, values: [low, med, high], default: med }
    cy: { type: number, min: 0, max: 1, default: 0.2 }
  emits:
    primitive: frame.safe-area  # or whatever Tier-A backs it
    composition:
      - shape: oval
        bbox: { ... derived ... }
        fill:
          kind: radial-gradient
          stops: { ... derived from props.color ... }
  sample_html: |
    <div data-atom="bg.aurora-band" class="..." style="..."></div>
  matcher_signature:
    cluster: oval-radial-gradient-large
    css_features: [position:absolute, border-radius:50%, background:radial-gradient]
  version: 1.0.0
```

The build derives:
- `components/src/recipes/BgAuroraBand.tsx` (thin TSX, delegates to `frame.safe-area` Tier-A)
- An entry in the LLM-side JSON Schema (`AtomCatalog.schema.json`)
- A row in the matcher's priming table

**One write** (the YAML). **Three derivations.** Vocabulary stays in lockstep.

---

## §C. Codegen pipeline

```
slidify/patterns/data/atoms.yaml             ← single source of truth (existing file, M1 extends)
                │
                ▼
components/scripts/codegen-atoms.ts          ← runs at build time (M2 ships)
        ┌───────┼───────┐
        ▼       ▼       ▼
   src/recipes/  catalog.schema.json   atoms.lock.json
   *.tsx         (LLM-side)            (drift guard)
   (~74 files)
```

**Note:** the existing matcher already reads atoms.yaml at runtime — no separate "priming table" output needed. Codegen only emits the *renderer-side* artifacts.

### C.1 Codegen rules

- **One TSX per atom** with a `renderer:` block. ~155 generated files (composite atoms generate too). Each ≤40 LOC, mostly prop-passing + delegation to a Tier-A primitive (or to other atoms via `composes:`).
- **Output directory:** `components/src/recipes/` for codegen output. Distinct from `components/src/components/` (the existing 7 hand-written components, which migrate to atom-mapped `recipeId`s in M2's optional follow-up) and `components/src/primitives/` (Tier-A hand-written primitives, M3).
- **JSON Schema enumerates every atom id** + props. LLMs validate output before submitting; matcher uses it for prop-typed metadata.
- **`atoms.lock.json`** is committed alongside; CI compares against `npm run codegen` output and fails if drifted (`atoms.yaml` was edited without re-running codegen).
- **Tier-A primitive files are NOT generated** — they live in `components/src/primitives/` and are hand-written. Codegen verifies that every atom row referencing a primitive has a matching primitive file (and vice versa).
- **Generated TSX is excluded from manual edits.** Header comment: `// Generated by codegen-atoms.ts. DO NOT EDIT — edit atoms.yaml instead.` ESLint rule + CI gate enforce.

### C.2 Generated TSX shape (one example)

For atom row `bg.aurora-band`:

```tsx
// components/src/recipes/BgAuroraBand.tsx
// AUTO-GENERATED from slidify/patterns/data/atoms.yaml. DO NOT EDIT.
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { useTokens, type TokensApi } from '../tokens';
import SafeArea from '../primitives/SafeArea';

export interface BgAuroraBandProps {
  bbox: Bbox;
  cx?: number;
  cy?: number;
  colorA?: Color;
  intensity?: 'low' | 'med' | 'high';
}

export default function BgAuroraBand(props: BgAuroraBandProps) {
  const tokens = useTokens();
  return <SafeArea {...bgAuroraBandToBbox(props, tokens)} />;
}

export function bgAuroraBandToIR(
  props: BgAuroraBandProps,
  tokens: TokensApi = /* default */ undefined!,
): GroupNodeT {
  // Composition derived from atoms.yaml row.
  return {
    kind: 'group',
    recipeId: 'bg.aurora-band',                     // ← matches atom id exactly
    bbox: props.bbox,
    zOrder: 0,
    metadata: { role: 'bg.aurora-band', axis: 'bg' },
    children: [
      // Shape composition from manifest, with token-bound defaults
      // ...
    ],
  };
}
```

### C.3 Codegen invocation

- `npm run codegen` — regenerates everything from atoms.yaml.
- Pre-commit hook (added by M2): runs codegen + checks `atoms.lock.json` is up to date.
- CI gate: `npm run codegen --check` — fails if drift.

---

## §D. Contract test (component → atom)

Per principle #2. CI gate: **every component renders to HTML, the matcher walks + clusters + classifies, and the result must equal the canonical atom id.** Two-direction guard:

1. **Recognition stability** — `match(render(atom)) === atom.id`. Detects renderer drift.
2. **Emit stability** — `IR(render(atom))` byte-stable vs snapshot. Detects token / fill / bbox drift.

File layout:
```
components/src/__tests__/contract/
  atom-recognition.test.ts    # Iterates manifest, asserts (1)
  atom-emit.test.ts           # Iterates manifest, asserts (2)
  __snapshots__/              # Per-atom IR snapshots, committed
```

CI failure mode: prints diff, names the atom, points at both the TSX and the manifest row so the bug is obvious.

---

## §E. Theme preset matrix gate

Per principle #7. Every Tier-B atom renders in **all 5 baseline presets** (`vercel-dark`, `linear-light`, `stripe`, `paper`, `editorial`) and in **2 stress presets** (`brutalist`, `glass-noir`). Each render passes:

- `native_area_ratio ≥ 0.97` (or marked-raster atoms excluded per CONTRACT-v1 §9.5)
- Matches a versioned visual baseline (per-preset snapshot)
- Recognition test (see §D)

The matrix is a single CI job. If `surf.glass` only works in dark presets, the matrix exposes it at PR time.

File layout:
```
components/src/__tests__/preset-matrix/
  matrix.test.ts              # Cartesian over atoms × presets
  __snapshots__/
    <atom-id>/<preset>@<version>/render.png
    <atom-id>/<preset>@<version>/ir.json
```

---

## §F. EscapeHatch — first-class metered escape valve

Per principle #5.

### F.1 Component

```tsx
<EscapeHatch
  bbox={{ x: 100, y: 100, w: 800, h: 200 }}
  cssPayload={`background: ...; clip-path: polygon(...);`}
  intent="non-rect-clip"        // free text — clustered later
  attempted="surf.glass"        // optional: which atom they tried first
/>
```

### F.2 Manifest entry

```yaml
- id: chrome.escape-hatch
  tier: A  # structural primitive
  structural: true
  description: "Catch-all atom for raw CSS that doesn't fit any recipe."
  emits:
    primitive: raster  # rasterizes the payload via Chromium screenshot
  metering:
    enabled: true
    capture_payload: true     # full CSS string preserved in metadata
    classify_intent: true     # LLM-cluster intents quarterly
```

### F.3 IR shape

```json
{
  "kind": "raster",
  "recipeId": "chrome.escape-hatch",
  "metadata": {
    "role": "escape-hatch",
    "cssPayload": "...",
    "intent": "non-rect-clip",
    "attempted": "surf.glass"
  },
  "pngBase64": "..."
}
```

### F.4 Metering — `report.json` additions

Every `slidify convert` writes:
```json
{
  "escapeRate": {
    "value": 0.084,             // 8.4% of slide area was escape-hatched
    "byIntent": {
      "non-rect-clip": 0.041,
      "complex-text-warp": 0.022,
      "ad-hoc-grid": 0.021
    },
    "atomCandidates": [
      { "intent": "non-rect-clip", "count": 23, "wouldPromote": true }
    ]
  }
}
```

### F.5 Promotion loop

When an intent cluster crosses a threshold (default: ≥15 instances across the corpus, ≥0.05 mean area share), the harvester auto-files a GitHub issue tagged `atom-proposal` with the cluster signature, sample CSS payloads, and a draft manifest row. Designer reviews → manifest PR.

---

## §G. Harvester run (M4)

Per principle #6. ONE-time bootstrap before Tier-B vocabulary is finalized.

### G.1 Corpus

Curated 200–500 slide HTMLs from:
- Linear `linear.app` landing + product pages
- Vercel `vercel.com` + ship/product pages
- Stripe `stripe.com` + `press.stripe.com`
- Apple keynote stills (manually screenshot → traced HTML or use existing slides)
- Pentagram case study HTML (where available)
- NYT graphics dept (interactive features, screenshot → HTML)
- Internal: `examples/sophisticated/`, `examples/landing/`, plus ~50 slides from real customers if available

Stored under `_bench/corpus/` as plain HTML. Source attribution in `_bench/corpus/MANIFEST.md`.

### G.2 Run

```bash
slidify harvest _bench/corpus/ --output _bench/harvest/clusters.json
```

🔍 AUDIT-DEPENDENT — verify the harvester CLI exists; if not, the M4 crew builds it.

### G.3 Output

`clusters.json` shape:
```json
{
  "clusters": [
    {
      "id": "auto-cluster-001",
      "signature": "oval-radial-gradient-violet-pink",
      "instances": 47,
      "exemplars": ["corpus/linear-001.html#aurora-1", ...],
      "css_features": [...],
      "candidate_atom_id": "bg.aurora-band",   // suggested by harvester
      "candidate_props": {...}
    },
    ...
  ]
}
```

### G.4 Vocabulary derivation

Top ~50–60 clusters by `instances` become Tier-B atom candidates. A designer reviews each, names it (or accepts the candidate id), and adds the manifest row.

**Quarterly re-runs.** Vocabulary breathes.

---

## §H. Crew roster (Wave-2B v2)

Replaces the old C1–C5. **Smaller and meaner.**

| Crew | Scope | Files | Estimated LOC |
| --- | --- | --- | --- |
| **M1** Manifest schema + bootstrap | Define manifest YAML schema; migrate existing matcher atoms into v1 | `components/atoms/atoms.yaml`, `components/atoms/SCHEMA.md`, `components/atoms/__tests__/schema-validity.test.ts` | ~300 |
| **M2** Codegen | Build script generates Tier-B TSX, JSON Schema, priming table from manifest | `components/scripts/codegen.ts`, `components/atoms/atoms.lock.json`, regen CI hook | ~600 |
| **M3** Tier-A primitives | ~20 hand-written primitives (frame.*, slot.*, data.*, diagram.*) | `components/src/primitives/*.tsx` (~20 files), each ≤200 LOC | ~3000 |
| **M4** Harvester run + Tier-B seed | Build/run harvester, derive top ~50 clusters, seed manifest | `_bench/corpus/`, `_bench/harvest/clusters.json`, manifest rows | ~500 (vocab data) |
| **M5** Contract tests + preset matrix gate | CI guards per §D + §E | `components/src/__tests__/contract/`, `components/src/__tests__/preset-matrix/`, CI workflow | ~800 |
| **M6** EscapeHatch + metering | Component + report.json fields + promotion loop scaffold | `components/src/primitives/EscapeHatch.tsx`, `slidify/metering/`, `slidify/cli.py` (report fields) | ~600 |
| **M7** Atelier-v2 deck | Showcase using Tier-A + Tier-B + EscapeHatch demo + metering visible | `examples/atelier/` | ~800 |

Total: ~6,600 LOC. Compared to v1's ~8,000-LOC component plan, smaller AND more durable.

### Dependency graph

```
M1 (manifest schema) ────┬─→ M2 (codegen) ─────────┬─→ M3 (Tier-A primitives) ─┐
                         │                         │                            │
                         └─→ M4 (harvester+seed) ──┘                            │
                                                                                ▼
                                                                          M7 (atelier)
                                                                                ▲
                              M5 (contract tests + preset matrix) ──────────────┤
                              M6 (EscapeHatch + metering) ─────────────────────┘
```

Wave-2B v2 launch order:
1. M1 first, alone (defines the schema everyone consumes).
2. M2, M3, M6 in parallel after M1 lands.
3. M4 in parallel with M2/M3 (the harvest can run on the corpus before Tier-B TSX exists).
4. M5 after M2 + M3 land (needs both atoms and primitives to test).
5. M7 last (composes everything).

---

## §I. Migration / compat with v1

- The 7 existing TS components (`Title`, `Kicker`, `Footer`, `Pill`, `StatCardWithDepth`, `GlassPanel`, `AnnotatedCallout`) become Tier-B recipes. They keep their existing TSX file as the v1 implementation; M2 codegen later replaces them with manifest-derived versions, but only after their atom rows + recognition tests pass.
- F1's IR primitives (PathShape, multi-shadow, PatternFill, ClipPath, masks, presets) — unchanged; Tier-A primitives consume them.
- F2's tokens — unchanged; manifest atom rows reference token paths (`tokens.gradient.accent-grad`).
- F3's Python compiler — unchanged; manifest doesn't change PPTX emission.
- The CONTRACT-v1 file stays as historical reference. v2 takes precedence going forward; conflicts resolve to v2.

---

## §J. Audit answers (resolved)

1. **Atom catalog file:** `slidify/patterns/data/atoms.yaml` — exists, 61 entries, 606 lines.
2. **Naming convention:** `axis.variant`, dotted, hyphenated for compound variants. 10 axes (`comp`, `bg`, `surf`, `type`, `mask`, `dec`, `data`, `motion`, `ui`, `anno`).
3. **Matcher vocabulary:** lives in `atoms.yaml` (61 author-declared) + `patterns.yaml` (52 inference rules). Single matcher engine reads both.
4. **Priming table:** does NOT exist as a single 132-entry file. Implicit via cache + `ConversionResult.unmatched_signatures` telemetry. The "132" was a corpus-of-runs artifact, not a committed inventory.
5. **Harvester CLI:** doesn't exist as separate command. Infrastructure exists: `unmatched_signatures` field on conversion result with sig-hash + occurrence count. M4 builds a thin aggregation layer on top.
6. **`recipeId` mapping:** TODAY divergent (`statCardWithDepth.shadow` vs `bg.mesh`). M2's codegen makes them identical for newly generated atoms. Existing 7 hand-written components migrate optionally.
7. **Reverse path:** schema-ready (`recipeId` extension entries planned). Not implemented. Out of scope for Wave-2; M1's manifest design adds a `reverse_fingerprint:` block per atom for future use.

---

## §K. Launch order (resequenced after audit)

The audit shrinks the work substantially. New launch:

```
WAVE 2B-v2 — manifest pivot
─────────────────────────────────────────────────────────────────
  M1   manifest schema extensions + 13 gap-fill atom rows         ┐
       (extends atoms.yaml additively; backward-compat)            │  serial,
                                                                   │  ~2 hours
  M2   codegen (atoms.yaml → TSX + JSON Schema + lock)             │
       (depends on M1 schema being shipped)                        ┘
                                                                ┌──┴──────────────┐
  M3   Tier-A primitives (~20)                                  │                 │
       (frame.*, slot.*, data.*, diagram.*, chrome.escape-hatch)│  parallel       │
                                                                │  after M1+M2    │
  M4   harvester aggregator + corpus mining run                 │                 │
       (CLI on top of unmatched_signatures, 200-deck corpus)    │                 │
                                                                ┌──┴──────────────┘
  M5   contract tests + preset matrix CI gate                   │
       (after M2+M3 land — needs both atoms and primitives)     │
                                                                │
  M6   EscapeHatch atom + report.json metering fields           │
       (parallel with M5; touches slidify/cli.py + report.py)   │
                                                                ┘
  M7   atelier-v2 deck (composes Tier-A + Tier-B + EscapeHatch demo)
       (last; needs everything else green)
```

Estimated parallel wall-clock: **~3-4 hours** for Wave-2B-v2 if all crews fan out. Half the original v1 budget because we're not writing 60 components by hand.

---

*End of CONTRACT-v2. Ready for crew fanout.*
