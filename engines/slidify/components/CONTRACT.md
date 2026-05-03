# @slidify/components — Wave-2 Contract Spec

**Status:** FROZEN. Eight parallel implementation crews build against this document. No coordination outside this file.

**Authority:** Conflicts between this spec and any other doc/code resolve in favor of this spec until merged. Crew leads must file an issue tagged `contract-amend` to change anything below; merge is sequential and rebases all open crew branches.

**Audience:** Crew engineers (TS + Python). Assume familiarity with `src/ir/schema.ts`, `slidify/ir.py`, `slidify/compile_ir.py`, and the existing components (`Title`, `Kicker`, `Footer`, `Pill`, `StatCardWithDepth`, `GlassPanel`, `AnnotatedCallout`).

**Wave-2 scope:** ~70 components across 5 crews + 9 templates + 1 showcase deck, gated by an IR extension (F1) and a token system (F2), with full Python compiler parity (F3).

---

## §1. IR schema extensions (Crew F1 owns)

F1 extends `components/src/ir/schema.ts`. **Additive only — no field deletes, no type narrowings.** Existing IR documents must continue to validate.

### 1.1 PathShape — typed SVG path commands

New top-level node kind so sparklines, connectors, donuts, braces, ribbons compile to native `<a:custGeom>` instead of raster.

```ts
export const PathCommand = z.discriminatedUnion('op', [
  z.object({ op: z.literal('M'), x: z.number(), y: z.number() }),
  z.object({ op: z.literal('L'), x: z.number(), y: z.number() }),
  z.object({ op: z.literal('C'),
    x1: z.number(), y1: z.number(),
    x2: z.number(), y2: z.number(),
    x: z.number(),  y: z.number() }),
  z.object({ op: z.literal('Q'),
    x1: z.number(), y1: z.number(),
    x: z.number(),  y: z.number() }),
  z.object({ op: z.literal('A'),
    rx: z.number(), ry: z.number(),
    xAxisRotationDeg: z.number().default(0),
    largeArc: z.boolean().default(false),
    sweep: z.boolean().default(true),
    x: z.number(), y: z.number() }),
  z.object({ op: z.literal('Z') }),
]);
export type PathCommand = z.infer<typeof PathCommand>;

export const ArrowheadKind = z.enum(['none', 'arrow', 'dot', 'diamond', 'bar']);
export const ArrowheadSize = z.enum(['sm', 'md', 'lg']); // sm=4px, md=8px, lg=12px tail width

export const Arrowhead = z.object({
  kind: ArrowheadKind.default('none'),
  size: ArrowheadSize.default('md'),
});
export type Arrowhead = z.infer<typeof Arrowhead>;

export const PathShapeNode = z.object({
  kind: z.literal('path'),
  ...NodeBase,
  commands: z.array(PathCommand).min(1),
  /** Path coordinates are in slide-pixel space (top-left origin), the same
   * coordinate space as ShapeNode.bbox. Bbox is the tight bounding box; if
   * omitted, the compiler must compute it. */
  fill: Fill.optional(),                  // omitted = no fill (stroke only)
  fillRule: z.enum(['nonzero', 'evenodd']).default('nonzero'),
  strokeWidthPx: z.number().min(0).default(0),
  strokeColor: Color.optional(),
  strokeDasharray: z.array(z.number()).optional(),  // [4,2] etc; omit = solid
  strokeLinecap: z.enum(['butt', 'round', 'square']).default('butt'),
  strokeLinejoin: z.enum(['miter', 'round', 'bevel']).default('miter'),
  markerStart: Arrowhead.optional(),
  markerEnd: Arrowhead.optional(),
  shadows: z.array(BoxShadow).optional(),
});
export type PathShapeNode = z.infer<typeof PathShapeNode>;
```

**Coordinate convention.** All path commands are in slide-pixel space (NOT 0-1 normalized, NOT relative to bbox). Matches how `ShapeNode.bbox` works today, avoids a second coordinate transform on the JS side.

**IR contract.** Compiler must emit native `<a:custGeom>` (see §3.1). If `commands` cannot legally be expressed as a single PPTX custGeom path (disjoint subpaths with different fills), the compiler MAY raster-fallback at z-order parity — IR itself is always lossless.

### 1.2 Multi-shadow

Replace the single `shadow` slot on `TextNode` and `ShapeNode` with a `shadows: BoxShadow[]` array, **additive and backwards-compatible**:

```ts
// Add to NodeBase shape/text:
shadows: z.array(BoxShadow).optional(),
shadow: BoxShadow.optional(),  // DEPRECATED, kept for one minor cycle
```

**Migration rule (consumers).** If both `shadow` and `shadows` are present, `shadows` wins. If only `shadow` is present, treat as `shadows: [shadow]`. F1 ships a `normalizeShadows(node)` helper; component crews use only `shadows` going forward.

**Hard cap:** `shadows.length <= 4` (two outer + two inner is the natural ceiling). Crews exceeding 4 must redesign or use sibling rects (see §3.3).

### 1.3 Pattern fill

New `Fill` variant for native dot/line grids without raster:

```ts
export const PatternFill = z.object({
  kind: z.literal('pattern'),
  pattern: z.enum([
    'dots',           // Dot grid (each dot = small filled circle)
    'lines-h',        // Horizontal hairlines
    'lines-v',        // Vertical hairlines
    'lines-grid',     // Crosshatch
    'diagonal',       // 45 deg lines
    'crosshatch',     // 45 + 135 deg
  ]),
  fgColor: Color,
  bgColor: Color.optional(),       // omit = transparent backdrop
  tileWidthPx: z.number().min(2).default(16),
  tileHeightPx: z.number().min(2).default(16),
  /** For `dots`: dot radius. For lines: stroke width. */
  featureSizePx: z.number().min(0.25).default(1),
  /** Rotation applied to the entire pattern, degrees CW. */
  angleDeg: z.number().default(0),
});

// Extend the discriminated Fill union:
export const Fill = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: Color }),
  LinearGradient,
  RadialGradient,
  PatternFill,                                // NEW
  z.object({ kind: z.literal('none') }),
]);
```

### 1.4 ClipPath

Optional clip on any node. Two kinds — rounded-rect (cheap, native) and arbitrary path (raster fallback for exotic shapes):

```ts
export const ClipPath = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('rounded-rect'),
    radiusPx: z.number().min(0).default(0),
    /** Optional inset from the node's bbox; omit = clip to bbox. */
    insetPx: z.number().default(0),
  }),
  z.object({
    kind: z.literal('path'),
    commands: z.array(PathCommand).min(1),
    fillRule: z.enum(['nonzero', 'evenodd']).default('nonzero'),
  }),
]);

// Add to NodeBase (text, shape, picture, raster, group, path):
clipPath: ClipPath.optional(),
```

### 1.5 Text-on-path

Existing `TextNode` gains an optional `onPath` slot. When present, runs render along the curve from `t=0` to `t=1`; `align` becomes `start | middle | end` along the curve.

```ts
// Extend TextNode:
onPath: z.object({
  commands: z.array(PathCommand).min(1),
  align: z.enum(['start', 'middle', 'end']).default('start'),
  /** If true, text reads upside-down on the bottom of a circle (otherwise
   * mirrored to stay readable). */
  preserveOrientation: z.boolean().default(false),
}).optional(),
```

When `onPath` is set, `paragraphs.length` MUST be 1 and `paragraphs[0].align` is ignored.

### 1.6 Image masks

Add an optional alpha mask to `PictureNode` for gradient-fade edges:

```ts
// Extend PictureNode:
mask: z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('linear-gradient'),
    angleDeg: z.number().default(180),
    stops: z.array(z.object({
      alpha: z.number().min(0).max(1),
      position: z.number().min(0).max(1),
    })).min(2),
  }),
  z.object({
    kind: z.literal('radial-gradient'),
    cx: z.number().default(0.5),
    cy: z.number().default(0.5),
    stops: z.array(z.object({
      alpha: z.number().min(0).max(1),
      position: z.number().min(0).max(1),
    })).min(2),
  }),
]).optional(),
```

### 1.7 Preset shape kinds

Extend the `ShapeNode.shape` enum:

```ts
shape: z.enum([
  // Existing
  'rect', 'rounded-rect', 'oval', 'line',
  // NEW (Wave-2)
  'triangle', 'right-triangle',
  'pentagon', 'hexagon', 'octagon',
  'parallelogram', 'trapezoid',
  'chevron', 'chevron-left',
  'callout-bubble',         // Rounded-rect with attached pointer
  'brace-left', 'brace-right', 'brace-top', 'brace-bottom',
  'plus', 'star-5', 'star-6',
  'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
]).default('rounded-rect'),
```

**For `callout-bubble`,** add three optional fields driving pointer geometry:

```ts
// Extend ShapeNode (only meaningful when shape='callout-bubble'):
calloutPointerSide: z.enum(['top', 'right', 'bottom', 'left']).optional(),
calloutPointerOffset: z.number().min(0).max(1).optional(), // 0..1 along the side
calloutPointerLengthPx: z.number().min(0).optional(),
```

### 1.8 File layout (F1 deliverables)

| File | Action |
| --- | --- |
| `components/src/ir/schema.ts` | Extend (additive). |
| `components/src/ir/normalize.ts` | NEW. Export `normalizeShadows(node)`, `pathBbox(commands)`. |
| `components/src/ir/__tests__/schema.test.ts` | NEW. Round-trip parse for every new variant. |
| `components/src/index.ts` | Re-export new types: `PathShapeNode`, `PathCommand`, `Arrowhead`, `ClipPath`, `PatternFill`. |
| `slidify/ir.py` | Mirror — see §3.6. |

**Wire compatibility.** Bump `Deck.version` from `1` -> `2`. Compiler accepts both (v1 = no new kinds).

---

## §2. Token system (Crew F2 owns)

F2 designs the tokenized theme that replaces today's 4-color `Theme`. Every component crew (C1–C5) consumes tokens via the same hook.

### 2.1 Distribution mechanism — DECISION

**Pick:** **Top-level `<Slide theme="…">` prop walks down via React context; IR emitters take an explicit `tokens: TokenBundle` parameter as their second argument.**

Rationale: components must work both inside React rendering (preview) and in pure-IR pipelines (no React tree). Context-only fails the IR path; hook-only fails React preview. Hybrid: React context for HTML preview, explicit `tokens` arg on `*toIR(props, tokens)` for the IR path. The `Slide` component already emits a paired `buildSlide(props, childNodes)`; we extend to `buildSlide(props, childNodes, tokens)`. F2 updates the signature.

**Migration shape for existing components:** every existing `*toIR(props)` becomes `*toIR(props, tokens)`. Defaults captured in component constants today (e.g., `DEFAULT_BG`, `DEFAULT_RIM`) move to `tokens.palette('surface-2')`, `tokens.palette('ink-inverse', 0.2)`, etc. Component crews do not migrate existing components; **F2 ships a one-shot migration PR** as part of their landing.

### 2.2 Palette tokens

Each token has a key, a hex value (or hex+alpha), and a CSS custom-property name. CSS variables are emitted on the slide root for HTML preview and ignored on the IR side.

| Key | Default (vercel-dark) | CSS var |
| --- | --- | --- |
| `surface-1` | `#070710` | `--sf-surface-1` |
| `surface-2` | `#0e0e1a` | `--sf-surface-2` |
| `surface-3` | `#16162a` | `--sf-surface-3` |
| `surface-4` | `#1f1f3a` | `--sf-surface-4` |
| `surface-overlay` | `#0a0a14cc` | `--sf-surface-overlay` |
| `surface-scrim` | `#000000a8` | `--sf-surface-scrim` |
| `ink-1` | `#f5f5f7` | `--sf-ink-1` |
| `ink-2` | `#d4d4d8` | `--sf-ink-2` |
| `ink-3` | `#a1a1aa` | `--sf-ink-3` |
| `ink-4` | `#71717a` | `--sf-ink-4` |
| `ink-inverse` | `#0a0a0f` | `--sf-ink-inverse` |
| `accent` | `#a78bfa` | `--sf-accent` |
| `accent-grad` | `[#818cf8 0%, #c084fc 50%, #f472b6 100%]` (3 stops) | `--sf-accent-grad` |
| `success` | `#10b981` | `--sf-success` |
| `warn` | `#f59e0b` | `--sf-warn` |
| `danger` | `#ef4444` | `--sf-danger` |
| `info` | `#3b82f6` | `--sf-info` |
| `ghost` | `#ffffff14` (8% white) | `--sf-ghost` |
| `ruler` | `#ffffff1a` (10% white) | `--sf-ruler` |
| `divider` | `#ffffff14` (8% white) | `--sf-divider` |

**Token reference syntax in component code:**
- `tokens.palette('surface-2')` -> returns IR-shaped `Color`.
- `tokens.palette('surface-2', 0.4)` -> alpha-modified color.
- `tokens.gradient('accent-grad')` -> returns full `LinearGradient` Fill (default angle 135 deg).

### 2.3 Type scale

Each entry: `{ sizePx, weight, leadingEm, trackingEm, family }`. `family` defaults to `tokens.fonts.sans` unless overridden.

| Key | sizePx | weight | leading | tracking | family |
| --- | --- | --- | --- | --- | --- |
| `display-2xl` | 168 | 800 | 0.85 | -0.06 | sans |
| `display-xl` | 128 | 800 | 0.88 | -0.05 | sans |
| `display` | 104 | 800 | 0.95 | -0.045 | sans |
| `hero` | 88 | 800 | 1.0 | -0.04 | sans |
| `section` | 72 | 800 | 1.05 | -0.035 | sans |
| `slide-title` | 56 | 800 | 1.05 | -0.025 | sans |
| `sub` | 40 | 700 | 1.15 | -0.02 | sans |
| `eyebrow` | 13 | 600 | 1.0 | 0.42 | sans |
| `lede` | 22 | 500 | 1.5 | -0.005 | sans |
| `body` | 16 | 400 | 1.55 | 0 | sans |
| `caption` | 13 | 500 | 1.45 | 0.02 | sans |
| `micro` | 11 | 600 | 1.3 | 0.18 | sans |
| `numeral-2xl` | 240 | 800 | 0.85 | -0.06 | sans |
| `numeral-xl` | 168 | 800 | 0.88 | -0.05 | sans |
| `numeral-md` | 88 | 800 | 1.0 | -0.045 | sans |
| `mono` | 14 | 500 | 1.55 | 0 | mono |

**Family keys:** `tokens.fonts = { sans: 'Inter, sans-serif', serif: 'Tiempos, "Iowan Old Style", serif', mono: 'JetBrains Mono, "SF Mono", monospace', display: 'Inter, sans-serif' }`.

### 2.4 Spacing scale

Base scale: `[4, 8, 12, 16, 24, 32, 48, 64, 96]` (px). Named slots:

| Slot | Default px |
| --- | --- |
| `gutter-tight` | 12 |
| `gutter` | 24 |
| `gutter-wide` | 48 |
| `pad-card` | 24 |
| `pad-slide` | 96 |
| `rhythm-tight` | 8 |
| `rhythm` | 16 |
| `rhythm-loose` | 32 |

API: `tokens.space(8)` -> 8 (px); `tokens.slot('pad-card')` -> 24.

### 2.5 Radius

| Key | px |
| --- | --- |
| `chip` | 6 |
| `pill` | 9999 |
| `card` | 16 |
| `bento` | 24 |
| `hero` | 32 |

### 2.6 Elevation tiers

Each tier is a `BoxShadow[]` (consumed via the new §1.2 multi-shadow array).

| Tier | Recipe |
| --- | --- |
| `flat` | `[]` |
| `raised` | `[{offsetY:1, blur:2, color:{hex:'#000000',alpha:0.04}}, {offsetY:4, blur:12, color:{hex:'#000000',alpha:0.08}}]` |
| `floating` | `[{offsetY:2, blur:4, color:{hex:'#000000',alpha:0.06}}, {offsetY:12, blur:32, color:{hex:'#000000',alpha:0.18}}]` |
| `overlay` | `[{offsetY:8, blur:16, color:{hex:'#000000',alpha:0.35}}, {offsetY:24, blur:48, color:{hex:'#000000',alpha:0.55}}]` |
| `aurora` | `[{offsetY:24, blur:80, color:{hex:'#a78bfa',alpha:0.32}}, {offsetY:8, blur:24, color:{hex:'#f472b6',alpha:0.18}}]` |

API: `tokens.elevation('floating')` -> `BoxShadow[]`.

### 2.7 Density modes

`density: 'compact' | 'cozy' | 'spacious'` is a top-level token. Multipliers:

| Mode | space× | type× |
| --- | --- | --- |
| `compact` | 0.75 | 0.92 |
| `cozy` | 1.00 | 1.00 |
| `spacious` | 1.25 | 1.08 |

Multipliers applied lazily inside `tokens.space(...)` and `tokens.type(...)`. Crews use the helpers; never hardcode density branching.

### 2.8 Theme presets

Each preset is a complete `TokenBundle`. Crews must not assume any preset's colors — always read from `tokens.palette(…)`.

| Preset | Surface family | Ink family | Accent | Notes |
| --- | --- | --- | --- | --- |
| `vercel-dark` | near-black blues | white-on-black | violet -> pink grad | DEFAULT. Matches `examples/sophisticated/`. |
| `linear-light` | warm whites | near-black | indigo | Light mode counterpart. |
| `stripe` | clean white + indigo | navy | indigo `#635BFF` | High-contrast SaaS. |
| `paper` | bone `#f5f1e8` | umber `#1a1410` | terracotta `#c2410c` | Editorial/print. |
| `retro` | cream + tan | maroon | mustard `#d97706` | 70s magazine vibe. |
| `brutalist` | pure white | pure black | acid lime `#84cc16` | 1px borders, no shadows; `elevation.raised = []`. |
| `editorial` | off-white `#fafaf7` | deep blue `#0c1e3a` | crimson `#dc2626` | Times-style; `serif` is default body family. |
| `glass-noir` | translucent on photo bg | white | electric blue `#00e5ff` | Backdrop-filter heavy; aurora elevation default. |

### 2.9 CVA-style variant helper

Tiny implementation. Not a re-export of upstream `cva`.

```ts
// components/src/tokens/variant.ts
export type VariantConfig<TVariants extends Record<string, Record<string, object>>> = {
  base?: object;
  variants: TVariants;
  defaultVariants?: { [K in keyof TVariants]?: keyof TVariants[K] };
};

export function variant<T extends Record<string, Record<string, object>>>(
  cfg: VariantConfig<T>,
): (selected?: { [K in keyof T]?: keyof T[K] }) => Record<string, unknown> {
  // Returns a function that merges base + selected variants into a single
  // style/prop object. NOT a className builder (we don't ship CSS). The
  // returned object is used to override default props on toIR helpers.
  // Implementation: shallow-merge in the order base -> defaults -> selected.
}
```

### 2.10 File layout (F2 deliverables)

```
components/src/tokens/
  tokens.ts        # TokenBundle type, default token bundle, tokens helper API
  presets.ts       # All 8 theme presets as full TokenBundle objects
  variant.ts       # variant() helper (see §2.9)
  context.tsx      # React context + useTokens() hook + <TokenProvider>
  index.ts         # Public re-exports
```

`<Slide>` updates: passes `tokens` through context for React preview AND through `buildSlide(props, childNodes, tokens)` for IR. F2 owns the migration of all existing component IR emitters to take `tokens` as a second arg with backward-compat default `= DEFAULT_TOKENS`.

---

## §3. Python compiler parity (Crew F3 owns)

For each new IR primitive, F3 specifies and implements PPTX emission.

### 3.1 PathShape -> `<a:custGeom>`

`compile_ir.py` adds `_emit_path(slide, node)`. Strategy:

1. Compute path bbox (use new `slidify.geom.path_bbox(commands)` helper).
2. Add a freeform shape via python-pptx's `slide.shapes.add_freeform(x, y, scale)` API. `add_freeform` produces `MSO_SHAPE_TYPE.FREEFORM` with `<a:custGeom>`.
3. For each command, translate to OOXML path element:
   - `M` -> `<a:moveTo>`
   - `L` -> `<a:lnTo>`
   - `C` -> `<a:cubicBezTo>` (3 control pts)
   - `Q` -> `<a:quadBezTo>` (2 control pts)
   - `A` -> flatten to cubic Béziers (helper: `slidify.path.arc_to_cubic`); custGeom has no arcTo equivalent.
   - `Z` -> `<a:close>`
4. Apply `fill` via `_apply_fill` (works for solid + gradients today).
5. Stroke: `shape.line.width = Emu(px_to_emu(strokeWidthPx))`, `shape.line.color.rgb = strokeColor`. Dash via `<a:prstDash val="dash">` (map dash patterns to `prstDash` enum: `[4,2]->dash`, `[1,2]->dot`, `[6,2,1,2]->dashDot`; arbitrary patterns -> custom `<a:custDash>`).
6. Arrowheads: emit `<a:headEnd type="…" w="…" len="…"/>` and `<a:tailEnd …/>` on `<a:ln>`.
   | IR `Arrowhead.kind` | `<a:headEnd type=>` |
   | --- | --- |
   | `none` | `none` |
   | `arrow` | `triangle` |
   | `dot` | `oval` |
   | `diamond` | `diamond` |
   | `bar` | `stealth` (closest visual) |
   Width/length from `size`: `sm=sm`, `md=med`, `lg=lg`.
7. `_stamp_recipe_id(shape, node.recipeId)`.

### 3.2 Pattern fill -> `<a:pattFill>` or tiled small shapes

Per-pattern emission strategy:

| IR `pattern` | Native PPTX strategy |
| --- | --- |
| `lines-h` | `<a:pattFill prst="ltHorz"/>` (use `dkHorz` if `featureSizePx >= 2`) |
| `lines-v` | `<a:pattFill prst="ltVert"/>` |
| `lines-grid` | `<a:pattFill prst="smGrid"/>` (lgGrid for larger tiles) |
| `diagonal` | `<a:pattFill prst="ltUpDiag"/>` |
| `crosshatch` | `<a:pattFill prst="diagCross"/>` |
| `dots` | **Tiled small ovals.** PPTX's `dotGrid`/`dotDmnd` presets are spaced too widely and uncustomizable. F3 emits an `(N×M)` grid of tiny `MSO_SHAPE.OVAL` shapes inside a group, sized to `featureSizePx`. Density is controlled by `tileWidthPx/tileHeightPx`. |

For `<a:pattFill>` cases, `fgClr` is `fgColor`, `bgClr` is `bgColor` (or `00FFFFFF` if absent). `tileWidthPx`/`tileHeightPx` are **ignored** for prst-pattern paths (PPTX presets are fixed-tile); `angleDeg` is applied via `<a:rot>` on the shape. Crews depending on exact tile size MUST use `dots`.

### 3.3 Multi-shadow -> sibling rects

PPTX shape effects support exactly **one** outer shadow + one inner shadow per shape (via `<a:effectLst>`). For `shadows.length > 2`, F3 splits:

- Of `shadows[]`, take the first outer shadow and first inner shadow: attach as native `<a:outerShdw>` and `<a:innerShdw>` on the primary shape.
- Remaining shadows: emit each as a sibling, transparent, same-bbox shape (z-order one less than the primary shape) carrying its own native shadow effect.

This is the `StatCardWithDepth` strategy generalized. Crews must NOT manually emit sibling rects — F3's `_emit_shape_with_shadows()` does it transparently.

### 3.4 ClipPath -> shape mask (rounded-rect) or raster fallback (path)

- `kind: 'rounded-rect'` on a `PictureNode`: replace with `MSO_SHAPE.ROUNDED_RECTANGLE` filled with a picture (`shape.fill.user_picture(...)`) at radius derived from `radiusPx` mapped to OOXML adjustment.
- `kind: 'rounded-rect'` on a `ShapeNode` / `TextNode`: ignored (the shape already has its own radius); log a warning if the node is not a picture.
- `kind: 'path'`: rasterize the clipped subtree. F3 ships `_raster_clipped_subtree(node)` — renders the subtree to PNG via Pillow + clips against the path. Emits as `RasterNode`.

### 3.5 Preset shapes — exact `<a:prstGeom prst=>` mapping

| IR `shape` | `<a:prstGeom prst=>` | python-pptx `MSO_SHAPE` |
| --- | --- | --- |
| `triangle` | `triangle` | `ISOCELES_TRIANGLE` |
| `right-triangle` | `rtTriangle` | `RIGHT_TRIANGLE` |
| `pentagon` | `pentagon` | `REGULAR_PENTAGON` |
| `hexagon` | `hexagon` | `HEXAGON` |
| `octagon` | `octagon` | `OCTAGON` |
| `parallelogram` | `parallelogram` | `PARALLELOGRAM` |
| `trapezoid` | `trapezoid` | `TRAPEZOID` |
| `chevron` | `chevron` | `CHEVRON` |
| `chevron-left` | `chevron` | `CHEVRON` + `<a:xfrm flipH="1">` |
| `callout-bubble` | `wedgeRectCallout` | `RECTANGULAR_CALLOUT` |
| `brace-left` | `leftBrace` | `LEFT_BRACE` |
| `brace-right` | `rightBrace` | `RIGHT_BRACE` |
| `brace-top` | `bracketPair` | `BRACKET_PAIR` (rotated 90 deg) |
| `brace-bottom` | `bracketPair` | `BRACKET_PAIR` (rotated -90 deg) |
| `plus` | `mathPlus` | `MATH_PLUS` |
| `star-5` | `star5` | `STAR_5_POINT` |
| `star-6` | `star6` | `STAR_6_POINT` |
| `arrow-right` | `rightArrow` | `RIGHT_ARROW` |
| `arrow-left` | `leftArrow` | `LEFT_ARROW` |
| `arrow-up` | `upArrow` | `UP_ARROW` |
| `arrow-down` | `downArrow` | `DOWN_ARROW` |

For `callout-bubble`, the pointer adjustment handles set position via the `<a:avLst><a:gd>` adjustment values: `adj1` and `adj2` map from `calloutPointerOffset` along the side; `adj3`/`adj4` from `calloutPointerLengthPx` normalized to bbox.

### 3.6 `slidify/ir.py` mirror

Add Pydantic models for all §1 additions, with the same field names and discriminator literals. Specifically:

```python
class IRPathCommand(BaseModel):
    op: Literal['M','L','C','Q','A','Z']
    # All other fields optional based on op (validated by op via discriminator)

class IRArrowhead(BaseModel):
    kind: Literal['none','arrow','dot','diamond','bar'] = 'none'
    size: Literal['sm','md','lg'] = 'md'

class IRPathShapeNode(_NodeBase):
    kind: Literal['path']
    commands: list[IRPathCommand]
    fill: Fill | None = None
    fillRule: Literal['nonzero','evenodd'] = 'nonzero'
    strokeWidthPx: float = 0.0
    strokeColor: Color | None = None
    strokeDasharray: list[float] | None = None
    strokeLinecap: Literal['butt','round','square'] = 'butt'
    strokeLinejoin: Literal['miter','round','bevel'] = 'miter'
    markerStart: IRArrowhead | None = None
    markerEnd: IRArrowhead | None = None
    shadows: list[IRBoxShadow] | None = None

class IRPatternFill(BaseModel):
    kind: Literal['pattern']
    pattern: Literal['dots','lines-h','lines-v','lines-grid','diagonal','crosshatch']
    fgColor: Color
    bgColor: Color | None = None
    tileWidthPx: float = 16.0
    tileHeightPx: float = 16.0
    featureSizePx: float = 1.0
    angleDeg: float = 0.0

# Update the Fill union:
Fill = FillSolid | FillLinearGradient | FillRadialGradient | IRPatternFill | FillNone
```

Add `clipPath`, `mask`, `shadows`, `onPath`, callout fields, expanded shape enum on the relevant existing models. Update `IRNode` union to include `IRPathShapeNode`. Bump `compile_ir`'s `Deck.version` accept-set to `{1, 2}`.

### 3.7 F3 file deliverables

| File | Action |
| --- | --- |
| `slidify/ir.py` | Extend (mirror §1). |
| `slidify/compile_ir.py` | Add `_emit_path`, `_emit_shape_with_shadows`, expand `kind_map`, route `clipPath`/`mask`. |
| `slidify/path.py` | NEW. `arc_to_cubic`, `path_bbox`, `path_to_ooxml(commands, bbox) -> str`. |
| `slidify/patterns.py` | NEW. `apply_pattern_fill(shape, pattern_fill)`. |
| `slidify/effects.py` | NEW. `apply_shadow_stack(shape, shadows: list)` — wraps current `apply_shadow` plus sibling-rect emission. |
| `tests/unit/test_compile_path.py` | NEW. Roundtrip every path op. |
| `tests/unit/test_compile_patterns.py` | NEW. |
| `tests/unit/test_compile_presets.py` | NEW. Every new shape preset. |

---

## §4. Component roster

Six crews: C1 (typography), C2 (surfaces), C3 (data-ink), C4 (diagrams), C5 (layout/annotation/brand/chrome), B1 (templates). Each crew owns its files exclusively; merge conflicts on shared files (e.g., `index.ts`) are resolved at the §7 merge step.

**Conventions referenced below:**
- Every component default-exports the React renderer.
- Every component named-exports `<name>ToIR(props, tokens) -> IRNode` (camelCase recipeId).
- Co-located types in the same file (`export interface FooProps`, `export type FooSize`).
- Files live at `components/src/components/<Name>.tsx`.

### Crew C1 — Typography (10 components)

| Name | Props (sketch) | IR emit | Tier | §1 deps |
| --- | --- | --- | --- | --- |
| `BigNumber` | `{ bbox, value: string, unit?: string, scale?: 'numeral-md'\|'numeral-xl'\|'numeral-2xl', gradient?: boolean }` | `text` (or `group` of two text runs when `unit`) using `tokens.type('numeral-*')`. Gradient uses linear-grad fill on text. | M | — |
| `RuledEyebrow` | `{ bbox, label: string, ruleSide?: 'right'\|'left'\|'both', color?: Color }` | `group(text + shape:line at midline)` — emits `tokens.type('eyebrow')`. | S | — |
| `DisplayHeadline` | `{ bbox, children: string\|RunSpec[], scale?: 'display-2xl'\|'display-xl'\|'display'\|'hero'\|'section', accent?: 'gradient'\|'solid' }` | `text` with multi-run paragraphs; accent runs use grad fill. | M | — |
| `Accent` | `{ children: string, gradient?: 'accent-grad'\|GradientStop[] }` | Returns a `RunSpec` (NOT a node) — consumed by parent text components only. | S | — |
| `Pullquote` | `{ bbox, quote: string, attribution?: string, size?: 'sm'\|'lg', mark?: 'guillemet'\|'curly'\|'none' }` | `group(text(quote, serif default) + text(attribution, ink-3))`. | S | — |
| `DropCap` | `{ bbox, body: string, capChar?: string, capScale?: number }` | `group(text(cap, oversize) + text(body wrapping around cap-bbox-shifted))`. | M | — |
| `MaskedHeading` | `{ bbox, text: string, maskKind: 'image'\|'gradient', src?: string, gradient?: GradientStop[] }` | For `image`: `picture` clipped by `clipPath: { kind: 'path', commands: textToPath(...) }`. For `gradient`: `text` with linear-grad fill. | L | clipPath, PathShape |
| `KineticType` | `{ bbox, words: string[], rotateDeg?: number, stagger?: 'cascade'\|'fan' }` | `group` of N rotated text nodes — uses `metadata.rotateDeg` (compiler reads). | M | (rotation metadata) |
| `Numerals` | `{ bbox, digits: string, monospace?: boolean, tabular?: boolean }` | `text` using `tokens.type('mono')` if monospace; sets `metadata.tabular: true`. | S | — |
| `Caption` | `{ bbox, children: string, align?: 'left'\|'center'\|'right' }` | `text` using `tokens.type('caption')`, color `ink-3`. | S | — |

**Files (under `components/src/components/`):** `BigNumber.tsx`, `RuledEyebrow.tsx`, `DisplayHeadline.tsx`, `Accent.tsx`, `Pullquote.tsx`, `DropCap.tsx`, `MaskedHeading.tsx`, `KineticType.tsx`, `Numerals.tsx`, `Caption.tsx`. Smoke tests in `components/src/components/__tests__/`.

### Crew C2 — Surfaces (10 components)

| Name | Props | IR emit | Tier | §1 deps |
| --- | --- | --- | --- | --- |
| `AuroraBlob` | `{ bbox, color?: Color, intensity?: 'low'\|'med'\|'high', shape?: 'circle'\|'ellipse', cx?, cy? }` | `shape(oval)` with radial-grad fill (color -> transparent). Intensity sets alpha cap. | S | — |
| `MeshGradient` | `{ bbox, stops4: [Color,Color,Color,Color] }` | `group` of 4 `AuroraBlob`s positioned at corners + base solid. | M | — |
| `DotGrid` | `{ bbox, density?: 'sparse'\|'med'\|'dense', color?: Color }` | `shape` with `fill: PatternFill { pattern: 'dots' }`. | S | PatternFill |
| `LineGrid` | `{ bbox, orientation?: 'h'\|'v'\|'both', color?: Color, spacingPx?: number }` | `shape` with `PatternFill { pattern: 'lines-h'\|'lines-v'\|'lines-grid' }`. | S | PatternFill |
| `Spotlight` | `{ bbox, cx?: number, cy?: number, color?: Color, falloff?: 'tight'\|'soft' }` | `shape(rect)` with radial-grad (color@0.4 -> transparent). | S | — |
| `Scrim` | `{ bbox, opacity?: number, color?: Color, direction?: 'top'\|'bottom'\|'radial' }` | `shape(rect)` with linear-grad alpha ramp. | S | — |
| `HairlineRule` | `{ bbox, orientation?: 'h'\|'v', color?: Color, thickness?: number }` | `shape(line)` width 1, color `ruler`. | S | — |
| `TapeBand` | `{ bbox, label?: string, fill?: Fill, skewDeg?: number }` | `group(shape(parallelogram if skew else rect) + text)`. | M | shape: parallelogram |
| `NoiseTexture` | `{ bbox, intensity?: number }` | RASTER (genuine perceptual noise). Emit `RasterNode` with pre-rendered PNG. | M | — |
| `CornerCrop` | `{ bbox, corners: ('tl'\|'tr'\|'bl'\|'br')[], cornerSizePx?: number, color?: Color }` | `group` of N `shape(triangle)` rotated to mask corners. | M | shape: triangle |

**Files:** `AuroraBlob.tsx`, `MeshGradient.tsx`, `DotGrid.tsx`, `LineGrid.tsx`, `Spotlight.tsx`, `Scrim.tsx`, `HairlineRule.tsx`, `TapeBand.tsx`, `NoiseTexture.tsx`, `CornerCrop.tsx`.

### Crew C3 — Data-ink (11 components)

| Name | Props | IR emit | Tier | §1 deps |
| --- | --- | --- | --- | --- |
| `Sparkline` | `{ bbox, values: number[], stroke?: Color, fillUnder?: boolean, markers?: 'last'\|'all'\|'none' }` | `path` (M/L commands) + optional fill-under as second `path` with `Z`. Markers as small `oval` shapes. | M | PathShape |
| `BulletBar` | `{ bbox, value: number, target: number, max: number, ranges?: [number,number,number] }` | `group(rect bg + rect fill + line marker for target)`. | S | — |
| `DeltaBadge` | `{ value: string, direction: 'up'\|'down'\|'flat', size?: 'sm'\|'md', bbox? }` | `group(rounded-rect + chevron path + text)`. | S | PathShape (arrow) |
| `Donut` | `{ bbox, segments: {value:number,color:Color,label?:string}[], thickness?: number, startDeg?: number }` | `group` of `path(A arc command)` per segment. | L | PathShape (A) |
| `RadialProgress` | `{ bbox, value: number, max?: number, color?: Color, trackColor?: Color }` | `group(path(A track) + path(A progress))`. | M | PathShape (A) |
| `BarSet` | `{ bbox, bars: {label:string,value:number,color?:Color}[], orientation?: 'h'\|'v', max?: number }` | `group` of N `rect` + N `text` labels. | M | — |
| `Waterfall` | `{ bbox, steps: {label:string,delta:number}[], baselineColor?: Color }` | `group` of N `rect` (positioned by running sum) + connectors as `path(L)`. | L | PathShape |
| `Funnel` | `{ bbox, stages: {label:string,value:number}[] }` | `group` of N `path` (trapezoid w/ proportional widths). | L | PathShape |
| `KPIRow` | `{ bbox, kpis: {label:string,value:string,delta?:string,deltaDir?:'up'\|'down'}[] }` | `group` of N composite stat blocks (uses `BigNumber` + `DeltaBadge`). | M | — |
| `DataTable` | `{ bbox, headers: string[], rows: string[][], align?: ('l'\|'c'\|'r')[], zebra?: boolean }` | `group(N row rects + N×M text + dividing lines)`. | L | — |
| `MiniHeatmap` | `{ bbox, cells: number[][], colorScale?: [Color,Color] }` | `group` of N×M `rect` with interpolated fills. | M | — |

**Files:** `Sparkline.tsx`, `BulletBar.tsx`, `DeltaBadge.tsx`, `Donut.tsx`, `RadialProgress.tsx`, `BarSet.tsx`, `Waterfall.tsx`, `Funnel.tsx`, `KPIRow.tsx`, `DataTable.tsx`, `MiniHeatmap.tsx`.

### Crew C4 — Diagrams (10 components)

| Name | Props | IR emit | Tier | §1 deps |
| --- | --- | --- | --- | --- |
| `Connector` | `{ from: {x,y}, to: {x,y}, kind?: 'straight'\|'orthogonal'\|'curved', stroke?: Color, dashed?: boolean, head?: Arrowhead, tail?: Arrowhead }` | `path` with markerEnd/Start. | S | PathShape, Arrowhead |
| `FlowStep` | `{ bbox, n: number, label: string, accent?: Color }` | `group(shape(circle/oval) + text(n) + text(label))`. | S | — |
| `Pipeline` | `{ bbox, steps: {label:string,sub?:string}[], variant?: 'chevron'\|'pill' }` | `group` of N `shape(chevron)` or pills with connectors. | M | shape: chevron |
| `StackDiagram` | `{ bbox, layers: {label:string,fill?:Fill}[], orientation?: 'v'\|'h' }` | `group` of N stacked `rect`. | S | — |
| `SwimLane` | `{ bbox, lanes: {label:string,items:string[]}[] }` | `group(N lane backgrounds + N lane labels + M item rects per lane)`. | L | — |
| `Quadrant2x2` | `{ bbox, axes: {x:[string,string],y:[string,string]}, items: {label:string,x:number,y:number}[] }` | `group(2 cross lines + 4 quadrant labels + N item dots/labels)`. | M | PathShape |
| `VennPair` | `{ bbox, leftLabel: string, rightLabel: string, overlap?: string, leftFill?: Fill, rightFill?: Fill }` | `group(2 oval + 3 text)`. | S | — |
| `TimelineRail` | `{ bbox, events: {date:string,label:string}[], orientation?: 'h'\|'v' }` | `group(rail line + N tick lines + N date+label pairs)`. | M | PathShape |
| `OrgNode` | `{ bbox, name: string, role: string, avatar?: string }` | `group(rounded-rect + optional picture w/ rounded-rect clip + 2 text)`. | S | clipPath |
| `Brace` | `{ bbox, side: 'left'\|'right'\|'top'\|'bottom', label?: string }` | `shape(brace-*)` + optional `text`. | S | shape: brace-* |

**Files:** `Connector.tsx`, `FlowStep.tsx`, `Pipeline.tsx`, `StackDiagram.tsx`, `SwimLane.tsx`, `Quadrant2x2.tsx`, `VennPair.tsx`, `TimelineRail.tsx`, `OrgNode.tsx`, `Brace.tsx`.

### Crew C5 — Layout / Annotation / Brand / Chrome (23 components)

**Layout (7):** `Bento`, `TwoUp`, `ThreeUp`, `SplitFrame`, `Letterbox`, `SectionDivider`, `SafeArea`.

**Annotation (4):** `HighlighterMark`, `NumberedHotspot`, `Tooltip`, `Stamp`.

**Brand (4):** `BrandMark`, `LogoLockup`, `AvatarStack`, `LogoWall`.

**Chrome (8):** `QRCode`, `StatusDot`, `Stepper`, `Progress`, `Checklist`, `CodeBlock`, `BrowserFrame`, `DeviceMockup`.

**Selected props sketches:**

```ts
interface BentoProps { bbox: Bbox; columns: number; rows: number; gap?: number; cells: BentoCell[]; }
interface BentoCell { row: number; col: number; rowSpan?: number; colSpan?: number; childIR: IRNode; }

interface AvatarStackProps { bbox: Bbox; avatars: { src: string; alt?: string }[]; size?: number; ringColor?: Color; overlap?: number; }

interface CodeBlockProps { bbox: Bbox; code: string; language?: string; showLineNumbers?: boolean; theme?: 'dark'|'light'; }

interface BrowserFrameProps { bbox: Bbox; url?: string; childrenIR?: IRNode[]; chrome?: 'mac'|'win'|'minimal'; }
```

**§1 deps (notable):** `Bento` (clipPath optional for cell crop), `HighlighterMark` (no IR change — uses `metadata.blendMode: 'multiply'`), `Checklist`/`StatusDot`/`Stepper` (PathShape for checks), `BrowserFrame`/`DeviceMockup` (clipPath for content area), `LogoWall` (image masks optional for fade edges), `AvatarStack` (clipPath rounded-rect).

**Files:** one `.tsx` per component in `components/src/components/`. Total 23 files.

### Crew B1 — Templates (9 templates)

Templates compose Wave-2 components into authored slide layouts. Each is a higher-order React component that takes content props and returns a fully composed slide IR via `buildSlide(props, childIR, tokens)`.

| Template | Composition (key components) |
| --- | --- |
| `HeroSlide` | `AuroraBlob` ×2, `BrandMark`+`LogoLockup`, `Pill`, `RuledEyebrow`, `DisplayHeadline` (with `Accent`), lede `Caption`, `Footer` |
| `AgendaSlide` | `RuledEyebrow`, `DisplayHeadline`, 2-column grid of `HairlineRule`+number+label rows, `Footer` |
| `BigStatSlide` | `RuledEyebrow`, `BigNumber` + `MaskedHeading`, side `StatCardWithDepth`, `Footer` |
| `ThreeUpStatsSlide` | `RuledEyebrow`, `DisplayHeadline`, `ThreeUp` of `StatCardWithDepth` (or `KPIRow`), `Footer` |
| `QuoteSlide` | `Pullquote` (large), small `AvatarStack` w/ author `Caption`, `Footer` |
| `SectionDividerSlide` | Full-bleed `MeshGradient`, large `Numerals` (chapter no.), `DisplayHeadline`, `RuledEyebrow` |
| `RoadmapSlide` | `RuledEyebrow`, `DisplayHeadline`, horizontal `TimelineRail` w/ `FlowStep` markers, `Pill` quarter labels, `Footer` |
| `TeamSlide` | `RuledEyebrow`, `DisplayHeadline`, grid of `OrgNode` (with `AvatarStack` per node optional), `Footer` |
| `ClosingSlide` | `AuroraBlob` ×2, `DisplayHeadline` (with `Accent`), CTA `Pill` row, `LogoLockup`, `Footer` |

**Files:** `components/src/templates/<Name>.tsx`. Templates live in their own folder, NOT in `/components/`.

Props pattern (sketched once):

```ts
interface HeroSlideProps {
  index: number;
  brand: { name: string; subtitle?: string };
  eyebrow: string;
  headline: string | RunSpec[];
  lede?: string;
  pill?: { label: string; dotColor?: Color };
  notes?: string;
  themePreset?: ThemePresetKey;
}
```

---

## §5. Showcase deck spec — `examples/atelier/` (Crew V1 owns)

V1 produces a 14-slide deck demonstrating every Wave-2 component in context. The deck is the visible proof and the verification target: each slide must achieve `native_area_ratio >= 0.97` (RasterNodes — `NoiseTexture`, `QRCode`, masked-image headings — are the only allowed exceptions; see §9.5).

Files: `examples/atelier/deck.tsx`, `examples/atelier/build.ts` (compiles to `deck.json`), `examples/atelier/README.md`.

| # | Slide | Template | Featured components (extra) | Design intent |
| --- | --- | --- | --- | --- |
| 01 | Cover hero | `HeroSlide` | `AuroraBlob`, `BrandMark`, `Accent`, `Pill` | Set the tone — gradient-clipped headline, two soft auroras. |
| 02 | Agenda | `AgendaSlide` | `RuledEyebrow`, `HairlineRule`, `Numerals` | Editorial TOC with hairline divisions and tabular numerals. |
| 03 | Section divider — Part I | `SectionDividerSlide` | `MeshGradient`, large `Numerals`, `RuledEyebrow` | Chapter break with a 4-corner mesh and oversized "01". |
| 04 | Big single stat | `BigStatSlide` | `BigNumber` (gradient), `DeltaBadge`, `StatCardWithDepth`, `Sparkline` | The hero number with a side card carrying a sparkline. |
| 05 | Three-up stats grid | `ThreeUpStatsSlide` | `StatCardWithDepth` ×3, `BulletBar`, `DeltaBadge` | Stat cards with bullet bars instead of just numbers. |
| 06 | Data viz | (custom) | `Donut`, `BarSet`, `Sparkline`, `KPIRow`, `MiniHeatmap`, `RuledEyebrow`, `DisplayHeadline` | Show every native data primitive on one slide. |
| 07 | Diagram | (custom) | `Pipeline`, `Connector`, `Brace`, `FlowStep`, `Quadrant2x2` | Architecture diagram with native braces and arrows. |
| 08 | Bento layout | (custom) | `Bento`, `GlassPanel`, `LogoWall`, `AvatarStack`, `Pullquote`, `CodeBlock` | Mixed-content bento with a glass panel and code sample. |
| 09 | Annotated screenshot | (custom) | `BrowserFrame`, `AnnotatedCallout`, `NumberedHotspot`, `HighlighterMark`, `Tooltip` | Product screenshot with annotation overlays. |
| 10 | Pull quote | `QuoteSlide` | `Pullquote`, `AvatarStack`, `Stamp` | Editorial quote with author attribution. |
| 11 | Roadmap | `RoadmapSlide` | `TimelineRail`, `FlowStep`, `Pill`, `Stepper` | Quarterly roadmap with milestone markers. |
| 12 | Team | `TeamSlide` | `OrgNode` ×6, `LogoLockup` | Org chart with rounded-rect avatars. |
| 13 | Surfaces showcase | (custom) | `AuroraBlob`, `MeshGradient`, `DotGrid`, `LineGrid`, `Spotlight`, `Scrim`, `TapeBand`, `NoiseTexture`, `CornerCrop` | Decoration parts catalog — every surface labeled. |
| 14 | Closing CTA | `ClosingSlide` | `MaskedHeading`, `KineticType`, `BrandMark`, `QRCode` | Closing slide with QR code and animated word stack. |

**Build target:** `npm run atelier` compiles `examples/atelier/deck.tsx` -> `examples/atelier/deck.json` -> `slidify compile-ir examples/atelier/deck.json examples/atelier/deck.pptx`.

**Verification target:** `slidify verify examples/atelier/deck.pptx --min-native-ratio 0.97 --ssim-floor 0.95 --ocr-recall-floor 0.98 --exclude-raster-nodes`.

---

## §6. House style for crews

**Non-negotiable. CI enforces every one of them.**

1. **File structure.** One component per file. File path: `components/src/components/<PascalCaseName>.tsx`. Default export is the React component. Named export is `<camelCaseName>ToIR`. Co-located types (`<Name>Props`, related enums) named-exported from the same file. Templates live under `components/src/templates/`.

2. **Imports.** All cross-package imports use the package-relative paths:
   - `from '../tokens'` for tokens.
   - `from '../ir/schema'` for IR types.
   - `from '../ir/normalize'` for normalize helpers.
   - **Never** import from sibling component files (`from './GlassPanel'`). If composition is needed, take `childrenIR?: IRNode[]` like `GlassPanel` already does. This keeps crews from blocking each other.

3. **Naming conventions.**
   - `recipeId` is camelCase of the component name. Sub-recipes use dot-namespacing (`statCardWithDepth.label`).
   - Props interfaces: `<ComponentName>Props`.
   - Variant enums: short PascalCase (e.g., `DeltaColor`, `PointerSide`).
   - IR emitter function: `<componentName>ToIR`, exact lowercased first letter.

4. **Test convention.** Each component ships `components/src/components/__tests__/<Name>.smoke.html` — a single-slide HTML file that, when opened in a browser, renders the component with representative props. Plus `components/src/components/__tests__/<Name>.ir.test.ts` — a vitest unit test calling `<name>ToIR(props, DEFAULT_TOKENS)` and snapshotting the JSON. Templates ship `templates/__tests__/<Name>.smoke.tsx` and `<Name>.ir.test.ts`.

5. **Color usage.** **NEVER** raw hex literals in component code. Always token references: `tokens.palette('surface-2')`, `tokens.palette('ink-1', 0.6)`, `tokens.gradient('accent-grad')`. Only exception: internal helpers that take a `Color` arg from caller — those pass through unchanged. Lint rule `no-hex-color` will fail PRs.

6. **Bbox handling.** Every component takes a top-level `bbox: Bbox` prop and lays out children inside it. **No component computes its own slide-relative position** (the parent template/slide is responsible). `bbox` is required for visual components; the only exception is `Accent` (a text-run helper, not a node).

7. **Z-order.** Explicit integers, multiples of 10 (`0, 10, 20, …`) to allow inter-leaving by inserted children. Within a group, z-order resets — group's z-order is what matters at the slide level. No fractional ordering. If you need finer control, restructure the group.

8. **Default tokens fallback.** Every `*ToIR(props, tokens?)` MUST default to `tokens ?? DEFAULT_TOKENS` (imported from `../tokens`). Never throw on missing tokens.

9. **Metadata convention.** Every emitted node sets `metadata.role: '<componentName>-<part>'` so the Python reverse path can recognize sub-recipes. Reserved metadata keys: `role`, `tokens`, `density`, `themePreset`, `recipeVersion`. Do not write to other reserved keys.

10. **Doc comment.** Every `<Name>.tsx` opens with a TSDoc block explaining the composition, z-order layering, and any §1 dependencies (matching the style of `StatCardWithDepth.tsx`).

11. **No new dependencies.** Crews may not add npm packages without a `contract-amend` issue. The component layer ships zero runtime dependencies beyond `react` and `zod` (already declared).

12. **Prop validation.** Crews do NOT add Zod schemas for component props (overkill for internal types). The IR is validated at deck assembly time; props are TypeScript-validated at compile time only.

---

## §7. Merge plan

PRs land in the following order. Each merge rebases the next crew's branch onto `main`.

### Wave-2A — Foundations (sequential)

| Order | Crew | PR | Merges to |
| --- | --- | --- | --- |
| 1 | F1 | `wave2/ir-extensions` | main |
| 2 | F2 | `wave2/tokens` (depends on F1 for new types) | main |
| 3 | F3 | `wave2/python-parity` (depends on F1) | main |

After Wave-2A, the floor is set. The IR knows about paths, multi-shadow, patterns, clip, masks, presets. Tokens are available. Python compiles all of it.

### Wave-2B — Components (parallel)

Once Wave-2A is fully merged, all five component crews unblock and run in parallel:

| Order | Crew | PR | Merges to |
| --- | --- | --- | --- |
| 4a | C1 | `wave2/typography` | main |
| 4b | C2 | `wave2/surfaces` | main |
| 4c | C3 | `wave2/data-ink` | main |
| 4d | C4 | `wave2/diagrams` | main |
| 4e | C5 | `wave2/layout-annotation-brand-chrome` | main |

Merge order within Wave-2B is alphabetical (C1, C2, C3, C4, C5). Each crew's PR adds its exports to `components/src/index.ts` in a dedicated section block:

```ts
// ---- Wave-2 / Crew C1 (typography) ------------------------------------------
export { default as BigNumber, bigNumberToIR } from './components/BigNumber';
export type { BigNumberProps } from './components/BigNumber';
// ... etc.

// ---- Wave-2 / Crew C2 (surfaces) --------------------------------------------
// ...
```

Conflicts on `index.ts` are mechanical (each crew adds its own block). Resolution rule: **preserve crew section order C1 -> C2 -> … -> C5**, alphabetical within a section.

### Wave-2C — Templates + Showcase (sequential)

| Order | Crew | PR | Merges to |
| --- | --- | --- | --- |
| 5 | B1 | `wave2/templates` (depends on all of Wave-2B) | main |
| 6 | V1 | `wave2/atelier-deck` (depends on B1) | main |

After V1 lands, the showcase deck builds with `npm run atelier`, the verification gate is run in CI, and Wave-2 is shipped.

### Final index sort

After all Wave-2 PRs merge, a follow-up housekeeping PR sorts the entire `index.ts` alphabetically (preserving the crew-section comments as anchors only). The crew-section blocks remain as visual organization; the entries within each are sorted alphabetically by export name. The existing v0.1 exports keep their position at the top.

### Failure handling

If a Wave-2B crew misses the milestone, the others ship without it. `index.ts` simply omits the missing crew's section and the affected templates fall back to placeholder `<Slide>` content. The atelier deck (§5) drops the affected slides with a `// TODO: pending crew CN` comment and the verification gate is relaxed to the slides that landed.

---

## §8. Open questions

- **PathShape coordinate space:** spec says slide-pixel space (§1.1). If F3 finds OOXML custGeom requires path-local 0-100000 units, we keep the IR in slide-pixels and F3 handles the transform.
- **Pattern fill / dot grid:** OOXML's prst patterns have fixed tiles. The "dots" pattern emits as a tiled-shape group (§3.2). Native ratio of a dot-grid surface remains 1.0, but shape count grows linearly with area. Crews using `DotGrid` over large bboxes spread sparingly.
- **Text-on-path support in PowerPoint:** PPTX text-on-path is only via `<a:prstTxWarp>` warp presets, NOT arbitrary paths. F3 falls back to path-flattening + per-glyph rotation for arbitrary `onPath`.

---

## §9. Resolutions (lead-architect decisions on §8 + extensions)

The following were punted by the spec drafter; resolved here as binding for all crews. **No further deliberation.**

### 9.1 Text-on-path: STRETCH GOAL

F3 implements `<a:prstTxWarp>` preset paths only (textArchUp, textCircle, textWave1, textWave2, etc.). Arbitrary `onPath` falls back to `RasterNode` in the compiler — F3 ships `_raster_text_on_path(text_node)` that renders the glyph chain via Pillow + Inter font and emits as `RasterNode` inline. C1 components (`MaskedHeading.maskKind='image'`, `KineticType`) document the raster fallback in their TSDoc. **`KineticType` MAY emit per-letter rotated text nodes (no `onPath` needed) and stays 100% native** — this is the recommended path.

### 9.2 Density modes propagation

Templates use `tokens.space()` and `tokens.slot()` directly. **No separate density-aware template helper.** If a template hardcodes a number (e.g., `padding: 96`), it's a bug; lint rule `no-literal-spacing` flags it. Templates that compute child bboxes use `tokens.slot('gutter')` for inter-component gaps; `tokens.slot('pad-slide')` for outer slide insets.

### 9.3 Font families in F2 migration

F2's migration touches both colors AND font families in existing components. All raw `'Inter, sans-serif'` literals become `tokens.fonts.sans`. All raw `font-family: …` CSS strings in component-rendered HTML preview also pass through tokens (use `tokens.css('--sf-font-sans')` in style attributes). Lint rule `no-literal-font-family` enforces.

### 9.4 Bento gap

Per-`Bento` `gap?: number` prop, default `tokens.slot('gutter')` (24px). `BentoCell` does not have its own gap — it inherits the parent.

### 9.5 QRCode raster + verification math

`QRCode` is permanently `RasterNode`. The atelier-deck verification gate uses a modified ratio:

```
native_area_ratio_excluding_raster_components =
  native_area / (slide_area - sum(bbox_area of explicit RasterNodes))
```

V1 implements this calculation. The Python verifier accepts a new `--exclude-raster-nodes` flag that activates this denominator subtraction. `RasterNode`s tagged with `metadata.role: '<componentName>-raster'` are excluded; ad-hoc rasters (Tier-3 fallbacks) are NOT excluded — they still pull the ratio down, which is the intended pressure.

### 9.6 Deck.version: lockstep upgrade

Compiler accepts `version: 1` (no new kinds, validates against pre-§1 schema) and `version: 2` (full §1 schema). **No version negotiation API.** Old IR documents continue to validate; new ones use v2. F1 and F3 both bump to v2 in lockstep on landing.

### 9.7 Deferred decisions (allowed; document in PR descriptions)

These are not decisions — they're crew latitude. If a crew makes a different choice than implied here, it must call it out in the PR body so reviewers see it:

- Whether `MaskedHeading.maskKind='image'` ships in Wave-2 or slips to Wave-3 (depends on F3 §9.1 stretch goal).
- Whether `Donut` segments support non-uniform start angles per segment (recommended: yes, via optional `startDeg` per segment overriding the prop default).
- Whether `DataTable` supports cell-level color overrides in Wave-2 (recommended: no — ship plain rows + zebra; cell tinting is Wave-3).
- Whether `BrowserFrame` and `DeviceMockup` ship with multiple chrome variants in Wave-2 or only one each (recommended: ship `mac` + `minimal` for browser, `phone` only for device — laptop/win is Wave-3).

---

*End of contract. Crews: confirm receipt by opening a draft PR titled `wave2/<crew>` against an empty branch off main.*
