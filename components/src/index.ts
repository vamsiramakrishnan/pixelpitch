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

// ---- Wave-2 / Crew F2 (tokens) ---------------------------------------------
export {
  DEFAULT_TOKENS,
  DENSITY_MULTIPLIERS,
  FONT_CSS_VAR,
  GRADIENT_CSS_VAR,
  PALETTE_CSS_VAR,
  THEME_PRESETS,
  TokenProvider,
  defaultElevation,
  defaultFonts,
  defaultRadii,
  defaultSpaceSlots,
  defaultTypeScale,
  getTokensFromBundle,
  tokens,
  useTokens,
  variant,
} from './tokens';

export type {
  DensityMode,
  ElevationTier,
  FontFamilyKey,
  GradientKey,
  GradientStopSpec,
  PaletteKey,
  RadiusKey,
  SpaceSlotKey,
  ThemePresetKey,
  TokenBundle,
  TokenProviderProps,
  TokensApi,
  TypeKey,
  TypeSpec,
  VariantConfig,
  VariantSelection,
} from './tokens';
