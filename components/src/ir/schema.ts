/**
 * Slide IR — the wire format between @slidify/components and the Python
 * compiler. JSX components emit IR via their `toIR()` methods; Python's
 * `slidify.compile_ir` consumes it and produces PPTX (or PDF, or Google
 * Slides) without ever rendering a browser.
 *
 * Every IR node carries a `recipeId` extension so the reverse path
 * (PPTX → IR → JSX) can recognize what to reconstitute.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitive value types
// ---------------------------------------------------------------------------

export const Color = z.union([
  z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'expected hex color'),
  z.object({
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    alpha: z.number().min(0).max(1).default(1),
  }),
]);
export type Color = z.infer<typeof Color>;

export const GradientStop = z.object({
  color: Color,
  position: z.number().min(0).max(1),
});
export type GradientStop = z.infer<typeof GradientStop>;

export const LinearGradient = z.object({
  kind: z.literal('linear-gradient'),
  angleDeg: z.number().default(180),
  stops: z.array(GradientStop).min(2),
});

export const RadialGradient = z.object({
  kind: z.literal('radial-gradient'),
  shape: z.enum(['circle', 'ellipse']).default('ellipse'),
  cx: z.number().min(0).max(1).default(0.5),
  cy: z.number().min(0).max(1).default(0.5),
  stops: z.array(GradientStop).min(2),
});

/**
 * Wave-2: native dot/line grid fill that compiles to `<a:pattFill>`
 * (or, for `dots`, a tiled-shape group). Bypasses raster textures.
 *
 * Coordinate space: the pattern tiles the node's bbox. `tileWidthPx`/
 * `tileHeightPx` are slide-pixel measurements; `featureSizePx` is the
 * dot radius for `dots` and the stroke width for line patterns.
 */
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
export type PatternFill = z.infer<typeof PatternFill>;

export const Fill = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: Color }),
  LinearGradient,
  RadialGradient,
  PatternFill,                                         // Wave-2 addition
  z.object({ kind: z.literal('none') }),
]);
export type Fill = z.infer<typeof Fill>;

export const BoxShadow = z.object({
  offsetX: z.number().default(0),
  offsetY: z.number().default(0),
  blur: z.number().min(0).default(0),
  spread: z.number().default(0),
  color: Color,
  inset: z.boolean().default(false),
});
export type BoxShadow = z.infer<typeof BoxShadow>;

export const Border = z.object({
  width: z.number().min(0).default(1),
  color: Color,
  style: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
});
export type Border = z.infer<typeof Border>;

export const Bbox = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Bbox = z.infer<typeof Bbox>;

export const TextRun = z.object({
  text: z.string(),
  fontFamily: z.string().optional(),
  fontSizePx: z.number().optional(),
  fontWeight: z.number().int().min(100).max(900).optional(),
  color: Color.optional(),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
});
export type TextRun = z.infer<typeof TextRun>;

export const Paragraph = z.object({
  runs: z.array(TextRun),
  align: z.enum(['left', 'center', 'right', 'justify']).default('left'),
});
export type Paragraph = z.infer<typeof Paragraph>;

// ---------------------------------------------------------------------------
// Wave-2: typed SVG path commands
// ---------------------------------------------------------------------------
//
// Defined here (above the node types) because PathShapeNode, ClipPath, and
// TextNode.onPath all reference them.

/**
 * A single command in a typed SVG path. The discriminator is `op`:
 *   - `M` — move to (x,y)
 *   - `L` — line to (x,y)
 *   - `C` — cubic Bezier (x1,y1 x2,y2 x,y)
 *   - `Q` — quadratic Bezier (x1,y1 x,y)
 *   - `A` — elliptical arc (rx, ry, xAxisRotationDeg, largeArc, sweep, x, y)
 *   - `Z` — close subpath
 *
 * All coordinates are in slide-pixel space (NOT 0–1 normalized, NOT relative
 * to a parent bbox). Matches `ShapeNode.bbox` semantics.
 */
export const PathCommand = z.discriminatedUnion('op', [
  z.object({ op: z.literal('M'), x: z.number(), y: z.number() }),
  z.object({ op: z.literal('L'), x: z.number(), y: z.number() }),
  z.object({
    op: z.literal('C'),
    x1: z.number(), y1: z.number(),
    x2: z.number(), y2: z.number(),
    x: z.number(),  y: z.number(),
  }),
  z.object({
    op: z.literal('Q'),
    x1: z.number(), y1: z.number(),
    x: z.number(),  y: z.number(),
  }),
  z.object({
    op: z.literal('A'),
    rx: z.number(), ry: z.number(),
    xAxisRotationDeg: z.number().default(0),
    largeArc: z.boolean().default(false),
    sweep: z.boolean().default(true),
    x: z.number(), y: z.number(),
  }),
  z.object({ op: z.literal('Z') }),
]);
export type PathCommand = z.infer<typeof PathCommand>;

/** Arrowhead glyph kind for path markers (start/end). */
export const ArrowheadKind = z.enum(['none', 'arrow', 'dot', 'diamond', 'bar']);
export type ArrowheadKind = z.infer<typeof ArrowheadKind>;

/** Arrowhead size: sm = 4px, md = 8px, lg = 12px tail width. */
export const ArrowheadSize = z.enum(['sm', 'md', 'lg']);
export type ArrowheadSize = z.infer<typeof ArrowheadSize>;

/** A path marker (start or end). Compiles to `<a:headEnd>` / `<a:tailEnd>`. */
export const Arrowhead = z.object({
  kind: ArrowheadKind.default('none'),
  size: ArrowheadSize.default('md'),
});
export type Arrowhead = z.infer<typeof Arrowhead>;

/**
 * Wave-2: optional clip on any node.
 *   - `rounded-rect` — cheap, native (PPTX rounded-rect picture fill).
 *   - `path` — arbitrary path (raster fallback for exotic shapes).
 */
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
export type ClipPath = z.infer<typeof ClipPath>;

// ---------------------------------------------------------------------------
// Node types — the closed set the IR can express. Every component compiles
// to one of these.
// ---------------------------------------------------------------------------

const NodeBase = {
  recipeId: z.string(),       // e.g. "kicker", "title", "stat-card"
  bbox: Bbox.optional(),       // optional: layout pass fills it in
  zOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
  /** Wave-2: optional clip applied to this node (and its subtree, if a group). */
  clipPath: ClipPath.optional(),
};

export const TextNode = z.object({
  kind: z.literal('text'),
  ...NodeBase,
  paragraphs: z.array(Paragraph),
  fill: Fill.optional(),       // optional bg fill on the text frame
  /** @deprecated Use `shadows` (Wave-2). Kept for backward-compat for one minor cycle. */
  shadow: BoxShadow.optional(),
  /** Wave-2: multi-shadow stack (max 4). Wins over `shadow` if both set. */
  shadows: z.array(BoxShadow).max(4).optional(),
  /**
   * Wave-2: render the text along this curve from t=0 to t=1.
   * When set, `paragraphs.length` MUST be 1 and `paragraphs[0].align` is
   * ignored — `onPath.align` controls placement along the curve instead.
   */
  onPath: z.object({
    commands: z.array(PathCommand).min(1),
    align: z.enum(['start', 'middle', 'end']).default('start'),
    /**
     * If true, text reads upside-down on the bottom of a circle (otherwise
     * mirrored to stay readable).
     */
    preserveOrientation: z.boolean().default(false),
  }).optional(),
});
export type TextNode = z.infer<typeof TextNode>;

export const ShapeNode = z.object({
  kind: z.literal('shape'),
  ...NodeBase,
  shape: z.enum([
    // Existing
    'rect', 'rounded-rect', 'oval', 'line',
    // Wave-2 additions
    'triangle', 'right-triangle',
    'pentagon', 'hexagon', 'octagon',
    'parallelogram', 'trapezoid',
    'chevron', 'chevron-left',
    'callout-bubble',         // Rounded-rect with attached pointer
    'brace-left', 'brace-right', 'brace-top', 'brace-bottom',
    'plus', 'star-5', 'star-6',
    'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
  ]).default('rounded-rect'),
  borderRadiusPx: z.number().min(0).default(0),
  fill: Fill,
  border: Border.optional(),
  /** @deprecated Use `shadows` (Wave-2). Kept for backward-compat for one minor cycle. */
  shadow: BoxShadow.optional(),
  /** Wave-2: multi-shadow stack (max 4). Wins over `shadow` if both set. */
  shadows: z.array(BoxShadow).max(4).optional(),
  /** Wave-2: which side the callout pointer attaches to. Only meaningful when `shape='callout-bubble'`. */
  calloutPointerSide: z.enum(['top', 'right', 'bottom', 'left']).optional(),
  /** Wave-2: 0..1 position of the pointer along its side. Only meaningful when `shape='callout-bubble'`. */
  calloutPointerOffset: z.number().min(0).max(1).optional(),
  /** Wave-2: pointer length in slide pixels. Only meaningful when `shape='callout-bubble'`. */
  calloutPointerLengthPx: z.number().min(0).optional(),
});
export type ShapeNode = z.infer<typeof ShapeNode>;

export const PictureNode = z.object({
  kind: z.literal('picture'),
  ...NodeBase,
  src: z.string(),             // url or data: uri
  alt: z.string().default(''),
  /**
   * Wave-2: optional alpha mask for gradient-fade edges (e.g., logo walls,
   * hero photos). Linear/radial only; arbitrary path masks use `clipPath`.
   */
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
});
export type PictureNode = z.infer<typeof PictureNode>;

export const RasterNode = z.object({
  kind: z.literal('raster'),
  ...NodeBase,
  // For deliberately rastered regions the JS side pre-renders a PNG and
  // ships it as base64. The Python compiler embeds it directly.
  pngBase64: z.string(),
});
export type RasterNode = z.infer<typeof RasterNode>;

/**
 * Wave-2: native vector path. Compiles to `<a:custGeom>` so sparklines,
 * connectors, donuts, braces, ribbons stay native instead of raster.
 *
 * Coordinate convention: all `commands` are in slide-pixel space (the same
 * coordinate space as `ShapeNode.bbox`). `bbox` (inherited from NodeBase)
 * is the tight bounding box; if omitted, the compiler must compute it
 * (see `pathBbox` in `./normalize`).
 */
export const PathShapeNode = z.object({
  kind: z.literal('path'),
  ...NodeBase,
  commands: z.array(PathCommand).min(1),
  /** Omit for stroke-only paths. */
  fill: Fill.optional(),
  fillRule: z.enum(['nonzero', 'evenodd']).default('nonzero'),
  strokeWidthPx: z.number().min(0).default(0),
  strokeColor: Color.optional(),
  /** Dash pattern, e.g. [4,2]. Omit for solid. */
  strokeDasharray: z.array(z.number()).optional(),
  strokeLinecap: z.enum(['butt', 'round', 'square']).default('butt'),
  strokeLinejoin: z.enum(['miter', 'round', 'bevel']).default('miter'),
  markerStart: Arrowhead.optional(),
  markerEnd: Arrowhead.optional(),
  /** Wave-2 multi-shadow stack (max 4). */
  shadows: z.array(BoxShadow).max(4).optional(),
});
export type PathShapeNode = z.infer<typeof PathShapeNode>;

// ---- Recursive discriminated union ------------------------------------------
//
// zod's discriminatedUnion can't easily include a z.lazy() recursive option, so
// we hand-roll the GroupNode/Node types. Validation still works via the
// per-kind validators below; the runtime parse picks the right validator from
// the `kind` discriminator.

export type GroupNodeT = {
  kind: 'group';
  recipeId: string;
  bbox?: Bbox;
  zOrder: number;
  metadata: Record<string, unknown>;
  clipPath?: ClipPath;
  children: Node[];
};

export type Node =
  | TextNode
  | ShapeNode
  | PictureNode
  | RasterNode
  | PathShapeNode
  | GroupNodeT;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GroupNode: z.ZodType<GroupNodeT> = z.lazy((): any =>
  z.object({
    kind: z.literal('group'),
    recipeId: z.string(),
    bbox: Bbox.optional(),
    zOrder: z.number().int().default(0),
    metadata: z.record(z.string(), z.unknown()).default({}),
    clipPath: ClipPath.optional(),
    children: z.array(Node),
  }),
);

const PER_KIND_VALIDATORS = {
  text: TextNode,
  shape: ShapeNode,
  picture: PictureNode,
  raster: RasterNode,
  path: PathShapeNode,
  group: GroupNode,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Node: z.ZodType<Node> = z.lazy((): any =>
  z
    .object({ kind: z.enum(['text', 'shape', 'picture', 'raster', 'path', 'group']) })
    .passthrough()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .transform((v: any, ctx) => {
      const validator = PER_KIND_VALIDATORS[v.kind as keyof typeof PER_KIND_VALIDATORS];
      const r = validator.safeParse(v);
      if (!r.success) {
        for (const issue of r.error.issues) ctx.addIssue(issue);
        return z.NEVER;
      }
      return r.data as Node;
    }),
);

// ---------------------------------------------------------------------------
// Slide / Deck top level
// ---------------------------------------------------------------------------

export const Theme = z.object({
  name: z.string().default('default'),
  bgColor: Color.default('#ffffff'),
  fgColor: Color.default('#000000'),
  accent: Color.default('#6366f1'),
  fontFamily: z.string().default('Inter, sans-serif'),
});
export type Theme = z.infer<typeof Theme>;

export const Slide = z.object({
  index: z.number().int(),
  bbox: Bbox.default({ x: 0, y: 0, w: 1280, h: 720 }),
  background: Fill.default({ kind: 'solid', color: '#ffffff' }),
  nodes: z.array(Node),
  notes: z.string().default(''),
});
export type Slide = z.infer<typeof Slide>;

export const Deck = z.object({
  /**
   * Wire version. Wave-2 bumps the default to `2`; the compiler accepts
   * both `1` (pre-Wave-2 schema) and `2` (full §1 schema).
   */
  version: z.union([z.literal(1), z.literal(2)]).default(2),
  theme: Theme.default({}),
  slides: z.array(Slide),
});
export type Deck = z.infer<typeof Deck>;
