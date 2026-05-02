/**
 * @slidify/components — public token system surface (Wave-2 / Crew F2).
 *
 * Re-exports:
 *   - The static types (`TokenBundle`, key unions, density modes).
 *   - The runtime helper API (`tokens`, `getTokensFromBundle`, `useTokens`,
 *     `TokenProvider`).
 *   - The preset table (`THEME_PRESETS`, `ThemePresetKey`).
 *   - The CVA-style `variant` helper.
 *
 * Crews import everything from `'../tokens'` (folder index), never from
 * deeper paths.
 */

export {
  DEFAULT_TOKENS,
  DENSITY_MULTIPLIERS,
  FONT_CSS_VAR,
  GRADIENT_CSS_VAR,
  PALETTE_CSS_VAR,
  defaultElevation,
  defaultFonts,
  defaultRadii,
  defaultSpaceSlots,
  defaultTypeScale,
  getTokensFromBundle,
  tokens,
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
  TokenBundle,
  TokensApi,
  TypeKey,
  TypeSpec,
} from './tokens';

export { THEME_PRESETS } from './presets';
export type { ThemePresetKey } from './presets';

export { variant } from './variant';
export type { VariantConfig, VariantSelection } from './variant';

export { TokenProvider, useTokens } from './context';
export type { TokenProviderProps } from './context';
