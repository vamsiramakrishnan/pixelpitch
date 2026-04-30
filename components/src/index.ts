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
