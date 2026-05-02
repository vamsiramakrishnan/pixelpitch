/**
 * @slidify/components — token system core (Wave-2 / Crew F2).
 *
 * Defines:
 *   - The {@link TokenBundle} type — the static, serializable shape of a theme
 *     (palette + typography + spacing + radius + elevation + density + fonts).
 *   - The {@link DEFAULT_TOKENS} bundle (the `vercel-dark` preset baked in;
 *     the full preset table lives in `./presets.ts`).
 *   - {@link getTokensFromBundle} — synthesizes the runtime helper API
 *     (`tokens.palette`, `tokens.gradient`, `tokens.type`, …) from any bundle.
 *
 * The runtime helper object is what crews consume in component code. It applies
 * density multipliers lazily inside `tokens.space()` and `tokens.type()`, so
 * crews never hardcode density branching.
 *
 * See `components/CONTRACT.md` §2 for the frozen spec.
 */

import type { z } from 'zod';
import type {
  BoxShadow,
  Color,
  GradientStop,
} from '../ir/schema';
import type { LinearGradient as LinearGradientSchema } from '../ir/schema';

/**
 * Runtime-validated `LinearGradient` Fill type. The IR schema currently
 * exports the zod schema but not the inferred TypeScript type, so we
 * derive it locally here. (When F1 lands a `type LinearGradient = …`
 * export, this can switch to a direct re-import.)
 */
export type LinearGradient = z.infer<typeof LinearGradientSchema>;

// ---------------------------------------------------------------------------
// Static bundle types
// ---------------------------------------------------------------------------

/**
 * Density mode — controls the multiplier applied to `space()` and `type()`.
 * `cozy` is the identity (1.0×).
 */
export type DensityMode = 'compact' | 'cozy' | 'spacious';

/**
 * Numeric multipliers per density mode. Per CONTRACT §2.7.
 *
 * @internal Re-exported via `./index.ts` for tests/templates that want to
 * peek at the table.
 */
export const DENSITY_MULTIPLIERS: Record<DensityMode, { space: number; type: number }> = {
  compact:  { space: 0.75, type: 0.92 },
  cozy:     { space: 1.0,  type: 1.0  },
  spacious: { space: 1.25, type: 1.08 },
};

/**
 * Palette token keys. See CONTRACT §2.2 for the full table + default values.
 * Solid colors only — gradients are addressed separately via {@link GradientKey}.
 */
export type PaletteKey =
  | 'surface-1' | 'surface-2' | 'surface-3' | 'surface-4'
  | 'surface-overlay' | 'surface-scrim'
  | 'ink-1' | 'ink-2' | 'ink-3' | 'ink-4' | 'ink-inverse'
  | 'accent'
  | 'success' | 'warn' | 'danger' | 'info'
  | 'ghost' | 'ruler' | 'divider';

/**
 * Gradient token keys. Each resolves to a {@link LinearGradient} Fill via
 * `tokens.gradient(key)`.
 */
export type GradientKey = 'accent-grad';

/**
 * Type-scale token keys. See CONTRACT §2.3.
 */
export type TypeKey =
  | 'display-2xl' | 'display-xl' | 'display'
  | 'hero' | 'section' | 'slide-title' | 'sub'
  | 'eyebrow' | 'lede' | 'body' | 'caption' | 'micro'
  | 'numeral-2xl' | 'numeral-xl' | 'numeral-md'
  | 'mono';

/**
 * Spacing slot names. See CONTRACT §2.4.
 */
export type SpaceSlotKey =
  | 'gutter-tight' | 'gutter' | 'gutter-wide'
  | 'pad-card' | 'pad-slide'
  | 'rhythm-tight' | 'rhythm' | 'rhythm-loose';

/**
 * Radius token keys. See CONTRACT §2.5.
 */
export type RadiusKey = 'chip' | 'pill' | 'card' | 'bento' | 'hero';

/**
 * Elevation tier names. See CONTRACT §2.6.
 */
export type ElevationTier = 'flat' | 'raised' | 'floating' | 'overlay' | 'aurora';

/**
 * Font-family token keys.
 */
export type FontFamilyKey = 'sans' | 'serif' | 'mono' | 'display';

/**
 * A linear-gradient stored at the bundle level: angle is implicit (135° default
 * applied inside `tokens.gradient()`); only the stops are stored.
 */
export interface GradientStopSpec {
  color: Color;
  position: number;
}

/**
 * One entry in the type scale. `family` references the bundle-level
 * {@link FontFamilyKey} so swapping `tokens.fonts.sans` cascades automatically.
 */
export interface TypeSpec {
  /** Font size in pixels (pre-density). */
  sizePx: number;
  /** OpenType weight (100..900). */
  weight: number;
  /** Line-height as a unitless multiplier of the font size. */
  leadingEm: number;
  /** Letter-spacing in `em` units (negative = tighter). */
  trackingEm: number;
  /** Which family from `bundle.fonts` to inherit. */
  family: FontFamilyKey;
}

/**
 * A frozen, serializable theme description. Crews read from this through the
 * helper returned by {@link getTokensFromBundle}; they should NEVER index into
 * a bundle directly because density multipliers are not pre-applied.
 */
export interface TokenBundle {
  /** Stable identifier for this preset (e.g. `'vercel-dark'`). */
  name: string;
  /** Solid palette colors keyed by {@link PaletteKey}. */
  palette: Record<PaletteKey, Color>;
  /** Gradient stops keyed by {@link GradientKey}. */
  gradients: Record<GradientKey, GradientStopSpec[]>;
  /** Typography scale per CONTRACT §2.3. */
  type: Record<TypeKey, TypeSpec>;
  /** Named spacing slots per CONTRACT §2.4. */
  space: Record<SpaceSlotKey, number>;
  /** Border radii per CONTRACT §2.5. */
  radius: Record<RadiusKey, number>;
  /** Box-shadow stacks per CONTRACT §2.6. */
  elevation: Record<ElevationTier, BoxShadow[]>;
  /** Font-family CSS strings keyed by {@link FontFamilyKey}. */
  fonts: Record<FontFamilyKey, string>;
  /** Default body family used when a {@link TypeSpec} resolves `family: 'sans'`. */
  defaultBodyFamily?: FontFamilyKey;
}

// ---------------------------------------------------------------------------
// CSS variable name table (for the HTML preview path)
// ---------------------------------------------------------------------------

/**
 * Map from {@link PaletteKey} to its CSS custom-property name.
 * Per CONTRACT §2.2. Useful for `tokens.css('--sf-…')` consumers and for
 * `<TokenProvider>` to emit a `<style>` block on the slide root.
 */
export const PALETTE_CSS_VAR: Record<PaletteKey, string> = {
  'surface-1': '--sf-surface-1',
  'surface-2': '--sf-surface-2',
  'surface-3': '--sf-surface-3',
  'surface-4': '--sf-surface-4',
  'surface-overlay': '--sf-surface-overlay',
  'surface-scrim': '--sf-surface-scrim',
  'ink-1': '--sf-ink-1',
  'ink-2': '--sf-ink-2',
  'ink-3': '--sf-ink-3',
  'ink-4': '--sf-ink-4',
  'ink-inverse': '--sf-ink-inverse',
  'accent': '--sf-accent',
  'success': '--sf-success',
  'warn': '--sf-warn',
  'danger': '--sf-danger',
  'info': '--sf-info',
  'ghost': '--sf-ghost',
  'ruler': '--sf-ruler',
  'divider': '--sf-divider',
};

/** Map from {@link GradientKey} to its CSS custom-property name. */
export const GRADIENT_CSS_VAR: Record<GradientKey, string> = {
  'accent-grad': '--sf-accent-grad',
};

/** Map from {@link FontFamilyKey} to its CSS custom-property name. */
export const FONT_CSS_VAR: Record<FontFamilyKey, string> = {
  sans: '--sf-font-sans',
  serif: '--sf-font-serif',
  mono: '--sf-font-mono',
  display: '--sf-font-display',
};

// ---------------------------------------------------------------------------
// DEFAULT_TOKENS — the `vercel-dark` preset baked in.
// ---------------------------------------------------------------------------

/** Helper: build a `Color` object with explicit alpha. Internal-only. */
function rgba(hex: string, alpha: number): Color {
  return { hex, alpha };
}

/**
 * Default body type-scale entry — used as a sane prototype for divergent
 * presets (which then override only the keys they need to).
 *
 * Crews shouldn't import this directly — use `bundle.type` instead.
 */
const DEFAULT_TYPE_SCALE: Record<TypeKey, TypeSpec> = {
  'display-2xl': { sizePx: 168, weight: 800, leadingEm: 0.85, trackingEm: -0.06,  family: 'sans' },
  'display-xl':  { sizePx: 128, weight: 800, leadingEm: 0.88, trackingEm: -0.05,  family: 'sans' },
  'display':     { sizePx: 104, weight: 800, leadingEm: 0.95, trackingEm: -0.045, family: 'sans' },
  'hero':        { sizePx: 88,  weight: 800, leadingEm: 1.0,  trackingEm: -0.04,  family: 'sans' },
  'section':     { sizePx: 72,  weight: 800, leadingEm: 1.05, trackingEm: -0.035, family: 'sans' },
  'slide-title': { sizePx: 56,  weight: 800, leadingEm: 1.05, trackingEm: -0.025, family: 'sans' },
  'sub':         { sizePx: 40,  weight: 700, leadingEm: 1.15, trackingEm: -0.02,  family: 'sans' },
  'eyebrow':     { sizePx: 13,  weight: 600, leadingEm: 1.0,  trackingEm: 0.42,   family: 'sans' },
  'lede':        { sizePx: 22,  weight: 500, leadingEm: 1.5,  trackingEm: -0.005, family: 'sans' },
  'body':        { sizePx: 16,  weight: 400, leadingEm: 1.55, trackingEm: 0,      family: 'sans' },
  'caption':     { sizePx: 13,  weight: 500, leadingEm: 1.45, trackingEm: 0.02,   family: 'sans' },
  'micro':       { sizePx: 11,  weight: 600, leadingEm: 1.3,  trackingEm: 0.18,   family: 'sans' },
  'numeral-2xl': { sizePx: 240, weight: 800, leadingEm: 0.85, trackingEm: -0.06,  family: 'sans' },
  'numeral-xl':  { sizePx: 168, weight: 800, leadingEm: 0.88, trackingEm: -0.05,  family: 'sans' },
  'numeral-md':  { sizePx: 88,  weight: 800, leadingEm: 1.0,  trackingEm: -0.045, family: 'sans' },
  'mono':        { sizePx: 14,  weight: 500, leadingEm: 1.55, trackingEm: 0,      family: 'mono' },
};

/**
 * Re-exported helper: the canonical default type scale. Presets can clone +
 * override; never mutate.
 */
export function defaultTypeScale(): Record<TypeKey, TypeSpec> {
  // Shallow-copy each entry so callers can mutate cells without affecting
  // sibling presets.
  const out = {} as Record<TypeKey, TypeSpec>;
  for (const key of Object.keys(DEFAULT_TYPE_SCALE) as TypeKey[]) {
    out[key] = { ...DEFAULT_TYPE_SCALE[key] };
  }
  return out;
}

/**
 * Re-exported helper: the canonical default spacing slots (vercel-dark).
 */
export function defaultSpaceSlots(): Record<SpaceSlotKey, number> {
  return {
    'gutter-tight': 12,
    'gutter':       24,
    'gutter-wide':  48,
    'pad-card':     24,
    'pad-slide':    96,
    'rhythm-tight': 8,
    'rhythm':       16,
    'rhythm-loose': 32,
  };
}

/** Re-exported helper: the canonical default radii. */
export function defaultRadii(): Record<RadiusKey, number> {
  return { chip: 6, pill: 9999, card: 16, bento: 24, hero: 32 };
}

/** Re-exported helper: the canonical default elevation stacks. */
export function defaultElevation(): Record<ElevationTier, BoxShadow[]> {
  return {
    flat: [],
    raised: [
      { offsetX: 0, offsetY: 1,  blur: 2,  spread: 0, color: rgba('#000000', 0.04), inset: false },
      { offsetX: 0, offsetY: 4,  blur: 12, spread: 0, color: rgba('#000000', 0.08), inset: false },
    ],
    floating: [
      { offsetX: 0, offsetY: 2,  blur: 4,  spread: 0, color: rgba('#000000', 0.06), inset: false },
      { offsetX: 0, offsetY: 12, blur: 32, spread: 0, color: rgba('#000000', 0.18), inset: false },
    ],
    overlay: [
      { offsetX: 0, offsetY: 8,  blur: 16, spread: 0, color: rgba('#000000', 0.35), inset: false },
      { offsetX: 0, offsetY: 24, blur: 48, spread: 0, color: rgba('#000000', 0.55), inset: false },
    ],
    aurora: [
      { offsetX: 0, offsetY: 24, blur: 80, spread: 0, color: rgba('#a78bfa', 0.32), inset: false },
      { offsetX: 0, offsetY: 8,  blur: 24, spread: 0, color: rgba('#f472b6', 0.18), inset: false },
    ],
  };
}

/** Re-exported helper: the canonical default font families. */
export function defaultFonts(): Record<FontFamilyKey, string> {
  return {
    sans: 'Inter, sans-serif',
    serif: 'Tiempos, "Iowan Old Style", serif',
    mono: 'JetBrains Mono, "SF Mono", monospace',
    display: 'Inter, sans-serif',
  };
}

/**
 * The default `vercel-dark` token bundle. All other presets are derived from
 * this via shallow-cloning + targeted overrides (see `./presets.ts`).
 */
export const DEFAULT_TOKENS: TokenBundle = {
  name: 'vercel-dark',
  palette: {
    'surface-1':       '#070710',
    'surface-2':       '#0e0e1a',
    'surface-3':       '#16162a',
    'surface-4':       '#1f1f3a',
    'surface-overlay': rgba('#0a0a14', 0.8),    // 0xCC ≈ 0.8
    'surface-scrim':   rgba('#000000', 0.659),  // 0xA8 ≈ 0.659
    'ink-1':           '#f5f5f7',
    'ink-2':           '#d4d4d8',
    'ink-3':           '#a1a1aa',
    'ink-4':           '#71717a',
    'ink-inverse':     '#0a0a0f',
    'accent':          '#a78bfa',
    'success':         '#10b981',
    'warn':            '#f59e0b',
    'danger':          '#ef4444',
    'info':            '#3b82f6',
    'ghost':           rgba('#ffffff', 0.078),  // 0x14 ≈ 0.078
    'ruler':           rgba('#ffffff', 0.102),  // 0x1A ≈ 0.102
    'divider':         rgba('#ffffff', 0.078),
  },
  gradients: {
    'accent-grad': [
      { color: '#818cf8', position: 0 },
      { color: '#c084fc', position: 0.5 },
      { color: '#f472b6', position: 1 },
    ],
  },
  type: defaultTypeScale(),
  space: defaultSpaceSlots(),
  radius: defaultRadii(),
  elevation: defaultElevation(),
  fonts: defaultFonts(),
  defaultBodyFamily: 'sans',
};

// ---------------------------------------------------------------------------
// Helper API surface (the runtime object crews actually use)
// ---------------------------------------------------------------------------

/**
 * Shape returned by {@link getTokensFromBundle}. Every method applies density
 * multipliers where appropriate; raw bundle values are NOT exposed.
 */
export interface TokensApi {
  /** Underlying bundle (read-only — do not mutate). */
  readonly bundle: TokenBundle;
  /** Active density mode (defaults to `'cozy'`). */
  readonly density: DensityMode;

  /**
   * Returns an IR-shaped `Color` for the given palette key.
   *
   * - `tokens.palette('accent')` -> `'#a78bfa'`
   * - `tokens.palette('accent', 0.4)` -> `{ hex: '#a78bfa', alpha: 0.4 }`
   *
   * If the palette entry is already a `{hex, alpha}` object, supplying an
   * explicit alpha overrides it.
   */
  palette(key: PaletteKey, alpha?: number): Color;

  /**
   * Returns a {@link LinearGradient} fill for the named gradient.
   * Default angle 135°.
   */
  gradient(key: GradientKey, angleDeg?: number): LinearGradient;

  /**
   * Returns the type-scale entry for `key`, with the density `type×`
   * multiplier applied to `sizePx` and the `family` slot resolved to the
   * bundle's font CSS string.
   */
  type(key: TypeKey): {
    sizePx: number;
    weight: number;
    leadingEm: number;
    trackingEm: number;
    family: string;
  };

  /**
   * Returns `n × densityMul` (px). Crews pass either the raw number on the
   * 4/8/12/… scale or any number — both are multiplied by the active density.
   */
  space(n: number): number;

  /**
   * Returns the named slot value with the density `space×` multiplier applied.
   */
  slot(name: SpaceSlotKey): number;

  /** Returns the named radius (px). NOT density-modified — radii are intrinsic. */
  radius(key: RadiusKey): number;

  /** Returns the elevation stack (a `BoxShadow[]`). Caller may pass `[]`. */
  elevation(tier: ElevationTier): BoxShadow[];

  /**
   * Direct access to the bundle's font-family CSS strings. Use these where you
   * would otherwise hardcode `'Inter, sans-serif'`.
   */
  readonly fonts: Record<FontFamilyKey, string>;

  /**
   * Returns a CSS `var(...)` reference for the named custom property.
   * Useful in HTML preview style attributes.
   *
   * Accepts either the bare variable name (`'--sf-accent'`) or a
   * fully-namespaced key — they're treated identically.
   */
  css(varName: string): string;
}

/**
 * Build a runtime helper API from a static {@link TokenBundle} + density mode.
 * Pure factory — safe to call anywhere (React tree or plain Node).
 *
 * @param bundle  the token bundle to wrap.
 * @param density density mode; defaults to `'cozy'` (1× multipliers).
 */
export function getTokensFromBundle(
  bundle: TokenBundle,
  density: DensityMode = 'cozy',
): TokensApi {
  const mul = DENSITY_MULTIPLIERS[density];

  return {
    bundle,
    density,
    palette(key, alpha) {
      const raw = bundle.palette[key];
      if (alpha === undefined) return raw;
      // alpha override: normalize to a {hex, alpha} object.
      const hex = typeof raw === 'string'
        ? (raw.length === 9 ? raw.slice(0, 7) : raw)
        : raw.hex;
      return { hex, alpha };
    },
    gradient(key, angleDeg = 135) {
      const stops = bundle.gradients[key];
      // Defensive copy so consumers can mutate the array freely.
      const cloned: GradientStop[] = stops.map(s => ({ color: s.color, position: s.position }));
      return { kind: 'linear-gradient', angleDeg, stops: cloned };
    },
    type(key) {
      const spec = bundle.type[key];
      const family = bundle.fonts[spec.family];
      return {
        sizePx: spec.sizePx * mul.type,
        weight: spec.weight,
        leadingEm: spec.leadingEm,
        trackingEm: spec.trackingEm,
        family,
      };
    },
    space(n) {
      return n * mul.space;
    },
    slot(name) {
      return bundle.space[name] * mul.space;
    },
    radius(key) {
      return bundle.radius[key];
    },
    elevation(tier) {
      // Defensive copy — shadow arrays are short, the cost is negligible.
      return bundle.elevation[tier].map(s => ({ ...s }));
    },
    fonts: bundle.fonts,
    css(varName) {
      const trimmed = varName.startsWith('--') ? varName : `--${varName}`;
      return `var(${trimmed})`;
    },
  };
}

/**
 * Singleton helper bound to {@link DEFAULT_TOKENS} at `cozy` density.
 *
 * **Crews use this as the import:** `import { tokens } from '../tokens'`.
 * For preset switching or non-cozy density, callers obtain a fresh helper via
 * `getTokensFromBundle(bundle, density)` instead of importing this singleton.
 */
export const tokens: TokensApi = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');
