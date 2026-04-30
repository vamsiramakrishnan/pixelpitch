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

export const Fill = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: Color }),
  LinearGradient,
  RadialGradient,
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
// Node types — the closed set the IR can express. Every component compiles
// to one of these.
// ---------------------------------------------------------------------------

const NodeBase = {
  recipeId: z.string(),       // e.g. "kicker", "title", "stat-card"
  bbox: Bbox.optional(),       // optional: layout pass fills it in
  zOrder: z.number().int().default(0),
  metadata: z.record(z.string(), z.unknown()).default({}),
};

export const TextNode = z.object({
  kind: z.literal('text'),
  ...NodeBase,
  paragraphs: z.array(Paragraph),
  fill: Fill.optional(),       // optional bg fill on the text frame
  shadow: BoxShadow.optional(),
});
export type TextNode = z.infer<typeof TextNode>;

export const ShapeNode = z.object({
  kind: z.literal('shape'),
  ...NodeBase,
  shape: z.enum(['rect', 'rounded-rect', 'oval', 'line']).default('rounded-rect'),
  borderRadiusPx: z.number().min(0).default(0),
  fill: Fill,
  border: Border.optional(),
  shadow: BoxShadow.optional(),
});
export type ShapeNode = z.infer<typeof ShapeNode>;

export const PictureNode = z.object({
  kind: z.literal('picture'),
  ...NodeBase,
  src: z.string(),             // url or data: uri
  alt: z.string().default(''),
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
  children: Node[];
};

export type Node = TextNode | ShapeNode | PictureNode | RasterNode | GroupNodeT;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GroupNode: z.ZodType<GroupNodeT> = z.lazy((): any =>
  z.object({
    kind: z.literal('group'),
    recipeId: z.string(),
    bbox: Bbox.optional(),
    zOrder: z.number().int().default(0),
    metadata: z.record(z.string(), z.unknown()).default({}),
    children: z.array(Node),
  }),
);

const PER_KIND_VALIDATORS = {
  text: TextNode,
  shape: ShapeNode,
  picture: PictureNode,
  raster: RasterNode,
  group: GroupNode,
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Node: z.ZodType<Node> = z.lazy((): any =>
  z
    .object({ kind: z.enum(['text', 'shape', 'picture', 'raster', 'group']) })
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
  version: z.literal(1).default(1),
  theme: Theme.default({}),
  slides: z.array(Slide),
});
export type Deck = z.infer<typeof Deck>;
