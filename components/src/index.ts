/**
 * @slidify/components — multi-target slide component library.
 *
 * Components render to HTML (browser preview) AND emit a typed IR via
 * their `*toIR` named exports. The IR is consumed by slidify's Python
 * compiler to produce native PPTX (and, eventually, PDF / Google Slides /
 * Keynote / Figma) output.
 */

// Components (default exports = React component, named export = IR emitter)
export { default as Slide, buildSlide, SLIDE_THEMES } from './components/Slide';
export type { SlideProps } from './components/Slide';

export { default as Title, titleToIR } from './components/Title';
export type { TitleProps, TitleSize, RunSpec } from './components/Title';

export { default as Kicker, kickerToIR } from './components/Kicker';
export type { KickerProps } from './components/Kicker';

export { default as Footer, footerToIR } from './components/Footer';
export type { FooterProps } from './components/Footer';

export { default as Pill, pillToIR } from './components/Pill';
export type { PillProps } from './components/Pill';

export { default as StatCardWithDepth, statCardWithDepthToIR } from './components/StatCardWithDepth';
export type { StatCardWithDepthProps, DeltaColor } from './components/StatCardWithDepth';

export { default as GlassPanel, glassPanelToIR } from './components/GlassPanel';
export type { GlassPanelProps } from './components/GlassPanel';

export { default as AnnotatedCallout, annotatedCalloutToIR } from './components/AnnotatedCallout';
export type { AnnotatedCalloutProps, PointerSide } from './components/AnnotatedCallout';

// Tier-A primitives (hand-written, structural, survive trend rotation).
// M3 owns the rest of Tier-A; M6 owns EscapeHatch specifically per CONTRACT-v2 §B.1.
export { default as EscapeHatch, escapeHatchToIR } from './primitives/EscapeHatch';
export type { EscapeHatchProps } from './primitives/EscapeHatch';

// IR types (re-exported under './ir' subpath too)
export type {
  Color,
  Fill,
  GradientStop,
  BoxShadow,
  Border,
  Bbox,
  TextRun,
  Paragraph,
  Theme,
  Slide as SlideIR,
  Deck,
  Node as IRNode,
  TextNode,
  ShapeNode,
  PictureNode,
  RasterNode,
  GroupNodeT,
} from './ir/schema';
