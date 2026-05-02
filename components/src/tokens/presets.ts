/**
 * @slidify/components — theme presets (Wave-2 / Crew F2).
 *
 * Eight named token bundles per CONTRACT §2.8. Each one is a complete
 * {@link TokenBundle}; crews must NEVER assume a preset's exact colors and
 * always read via the `tokens.palette(…)` helper.
 *
 * Diffs from `vercel-dark`:
 *
 * | Preset       | Palette flip      | Type defaults change | Elevation override |
 * | ------------ | ----------------- | -------------------- | ------------------ |
 * | linear-light | yes (light)       | no                   | no                 |
 * | stripe       | yes (white+navy)  | no                   | no                 |
 * | paper        | yes (bone+umber)  | no                   | no                 |
 * | retro        | yes (cream+maroon)| no                   | no                 |
 * | brutalist    | yes (white+black) | no                   | yes (raised = [])  |
 * | editorial    | yes (off-white)   | yes (serif body)     | no                 |
 * | glass-noir   | translucent       | no                   | yes (default=aurora)|
 */

import type {
  Color,
  BoxShadow,
} from '../ir/schema';
import {
  DEFAULT_TOKENS,
  type FontFamilyKey,
  type GradientStopSpec,
  type GradientKey,
  type PaletteKey,
  type RadiusKey,
  type SpaceSlotKey,
  type TokenBundle,
  type TypeKey,
  type TypeSpec,
  defaultElevation,
  defaultFonts,
  defaultRadii,
  defaultSpaceSlots,
  defaultTypeScale,
} from './tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rgba(hex: string, alpha: number): Color {
  return { hex, alpha };
}

function clonePalette(p: Record<PaletteKey, Color>): Record<PaletteKey, Color> {
  const out = {} as Record<PaletteKey, Color>;
  for (const k of Object.keys(p) as PaletteKey[]) out[k] = p[k];
  return out;
}

function cloneGradients(
  g: Record<GradientKey, GradientStopSpec[]>,
): Record<GradientKey, GradientStopSpec[]> {
  const out = {} as Record<GradientKey, GradientStopSpec[]>;
  for (const k of Object.keys(g) as GradientKey[]) {
    out[k] = g[k].map(s => ({ ...s }));
  }
  return out;
}

function cloneElevation(
  e: Record<string, BoxShadow[]>,
): Record<string, BoxShadow[]> {
  const out: Record<string, BoxShadow[]> = {};
  for (const k of Object.keys(e)) out[k] = e[k]!.map(s => ({ ...s }));
  return out;
}

/**
 * Build a preset by deep-cloning the `vercel-dark` base, then applying a
 * targeted patch. Keeps each preset compact and ensures additions to the
 * default bundle automatically propagate to every preset.
 */
function makePreset(
  name: string,
  patch: {
    palette?: Partial<Record<PaletteKey, Color>>;
    gradients?: Partial<Record<GradientKey, GradientStopSpec[]>>;
    type?: Partial<Record<TypeKey, Partial<TypeSpec>>>;
    space?: Partial<Record<SpaceSlotKey, number>>;
    radius?: Partial<Record<RadiusKey, number>>;
    elevation?: Partial<Record<string, BoxShadow[]>>;
    fonts?: Partial<Record<FontFamilyKey, string>>;
    defaultBodyFamily?: FontFamilyKey;
  },
): TokenBundle {
  const palette = clonePalette(DEFAULT_TOKENS.palette);
  if (patch.palette) {
    for (const k of Object.keys(patch.palette) as PaletteKey[]) {
      palette[k] = patch.palette[k]!;
    }
  }

  const gradients = cloneGradients(DEFAULT_TOKENS.gradients);
  if (patch.gradients) {
    for (const k of Object.keys(patch.gradients) as GradientKey[]) {
      gradients[k] = patch.gradients[k]!.map(s => ({ ...s }));
    }
  }

  const type = defaultTypeScale();
  if (patch.type) {
    for (const k of Object.keys(patch.type) as TypeKey[]) {
      type[k] = { ...type[k], ...patch.type[k] } as TypeSpec;
    }
  }

  const space = { ...defaultSpaceSlots(), ...(patch.space ?? {}) };
  const radius = { ...defaultRadii(), ...(patch.radius ?? {}) };
  const elevation = cloneElevation(defaultElevation()) as Record<
    'flat' | 'raised' | 'floating' | 'overlay' | 'aurora',
    BoxShadow[]
  >;
  if (patch.elevation) {
    for (const k of Object.keys(patch.elevation)) {
      (elevation as Record<string, BoxShadow[]>)[k] = patch.elevation[k]!.map(s => ({ ...s }));
    }
  }
  const fonts = { ...defaultFonts(), ...(patch.fonts ?? {}) };

  return {
    name,
    // All Wave-2 presets ship at v1.0.0. Once a deck pins on a preset
    // version, edits to that bundle are forbidden — bump to 1.1.0 / 2.0.0
    // and let the deck opt in. Per CONTRACT-v2 §B4 (semver presets).
    version: '1.0.0',
    palette,
    gradients,
    type,
    space,
    radius,
    elevation,
    fonts,
    defaultBodyFamily: patch.defaultBodyFamily ?? 'sans',
  };
}

// ---------------------------------------------------------------------------
// Preset 1 — vercel-dark (the baseline; identical to DEFAULT_TOKENS)
// ---------------------------------------------------------------------------

const vercelDark: TokenBundle = makePreset('vercel-dark', {});

// ---------------------------------------------------------------------------
// Preset 2 — linear-light  (light-mode counterpart)
// ---------------------------------------------------------------------------

const linearLight: TokenBundle = makePreset('linear-light', {
  palette: {
    'surface-1':       '#fafaf9',
    'surface-2':       '#f4f4f5',
    'surface-3':       '#e7e7ea',
    'surface-4':       '#d4d4d8',
    'surface-overlay': rgba('#ffffff', 0.8),
    'surface-scrim':   rgba('#0a0a14', 0.4),
    'ink-1':           '#0a0a0f',
    'ink-2':           '#27272a',
    'ink-3':           '#52525b',
    'ink-4':           '#71717a',
    'ink-inverse':     '#fafafa',
    'accent':          '#5e6ad2',
    'success':         '#10b981',
    'warn':            '#f59e0b',
    'danger':          '#ef4444',
    'info':            '#3b82f6',
    'ghost':           rgba('#0a0a14', 0.05),
    'ruler':           rgba('#0a0a14', 0.08),
    'divider':         rgba('#0a0a14', 0.06),
  },
  gradients: {
    'accent-grad': [
      { color: '#6366f1', position: 0 },
      { color: '#5e6ad2', position: 0.5 },
      { color: '#7c3aed', position: 1 },
    ],
  },
});

// ---------------------------------------------------------------------------
// Preset 3 — stripe (clean white + indigo)
// ---------------------------------------------------------------------------

const stripe: TokenBundle = makePreset('stripe', {
  palette: {
    'surface-1':       '#ffffff',
    'surface-2':       '#f7fafc',
    'surface-3':       '#edf2f7',
    'surface-4':       '#e2e8f0',
    'surface-overlay': rgba('#ffffff', 0.85),
    'surface-scrim':   rgba('#0a2540', 0.5),
    'ink-1':           '#0a2540',
    'ink-2':           '#1f3354',
    'ink-3':           '#425466',
    'ink-4':           '#697386',
    'ink-inverse':     '#ffffff',
    'accent':          '#635BFF',
    'success':         '#3ECF8E',
    'warn':            '#FFB020',
    'danger':          '#DF1B41',
    'info':            '#0073E6',
    'ghost':           rgba('#0a2540', 0.05),
    'ruler':           rgba('#0a2540', 0.08),
    'divider':         rgba('#0a2540', 0.06),
  },
  gradients: {
    'accent-grad': [
      { color: '#635BFF', position: 0 },
      { color: '#7A73FF', position: 0.5 },
      { color: '#A6A0FF', position: 1 },
    ],
  },
});

// ---------------------------------------------------------------------------
// Preset 4 — paper (editorial / print)
// ---------------------------------------------------------------------------

const paper: TokenBundle = makePreset('paper', {
  palette: {
    'surface-1':       '#f5f1e8',
    'surface-2':       '#efe8d8',
    'surface-3':       '#e6dcc4',
    'surface-4':       '#d4c5a3',
    'surface-overlay': rgba('#f5f1e8', 0.85),
    'surface-scrim':   rgba('#1a1410', 0.5),
    'ink-1':           '#1a1410',
    'ink-2':           '#3a2e22',
    'ink-3':           '#6b5644',
    'ink-4':           '#8a7a66',
    'ink-inverse':     '#f5f1e8',
    'accent':          '#c2410c',
    'success':         '#65a30d',
    'warn':            '#ca8a04',
    'danger':          '#b91c1c',
    'info':            '#0369a1',
    'ghost':           rgba('#1a1410', 0.05),
    'ruler':           rgba('#1a1410', 0.1),
    'divider':         rgba('#1a1410', 0.08),
  },
  gradients: {
    'accent-grad': [
      { color: '#c2410c', position: 0 },
      { color: '#e85d2c', position: 0.5 },
      { color: '#f59e0b', position: 1 },
    ],
  },
});

// ---------------------------------------------------------------------------
// Preset 5 — retro (cream + tan + maroon, 70s magazine)
// ---------------------------------------------------------------------------

const retro: TokenBundle = makePreset('retro', {
  palette: {
    'surface-1':       '#f4ead5',
    'surface-2':       '#ead8b3',
    'surface-3':       '#dfc28a',
    'surface-4':       '#c9a062',
    'surface-overlay': rgba('#f4ead5', 0.85),
    'surface-scrim':   rgba('#3d0f0f', 0.5),
    'ink-1':           '#3d0f0f',
    'ink-2':           '#5a1a1a',
    'ink-3':           '#7d3a2a',
    'ink-4':           '#9a614a',
    'ink-inverse':     '#f4ead5',
    'accent':          '#d97706',
    'success':         '#15803d',
    'warn':            '#ca8a04',
    'danger':          '#991b1b',
    'info':            '#1e40af',
    'ghost':           rgba('#3d0f0f', 0.06),
    'ruler':           rgba('#3d0f0f', 0.12),
    'divider':         rgba('#3d0f0f', 0.08),
  },
  gradients: {
    'accent-grad': [
      { color: '#d97706', position: 0 },
      { color: '#ea580c', position: 0.5 },
      { color: '#991b1b', position: 1 },
    ],
  },
});

// ---------------------------------------------------------------------------
// Preset 6 — brutalist  (pure white + pure black, no shadows)
// ---------------------------------------------------------------------------

const brutalist: TokenBundle = makePreset('brutalist', {
  palette: {
    'surface-1':       '#ffffff',
    'surface-2':       '#ffffff',
    'surface-3':       '#f5f5f5',
    'surface-4':       '#e5e5e5',
    'surface-overlay': rgba('#ffffff', 0.92),
    'surface-scrim':   rgba('#000000', 0.6),
    'ink-1':           '#000000',
    'ink-2':           '#171717',
    'ink-3':           '#404040',
    'ink-4':           '#737373',
    'ink-inverse':     '#ffffff',
    'accent':          '#84cc16',
    'success':         '#16a34a',
    'warn':            '#facc15',
    'danger':          '#dc2626',
    'info':            '#2563eb',
    'ghost':           rgba('#000000', 0.04),
    'ruler':           '#000000',
    'divider':         '#000000',
  },
  gradients: {
    'accent-grad': [
      { color: '#84cc16', position: 0 },
      { color: '#65a30d', position: 0.5 },
      { color: '#facc15', position: 1 },
    ],
  },
  // Brutalist: no shadows. raised collapses to flat.
  elevation: {
    raised: [],
    floating: [],
    overlay: [],
    aurora: [],
  },
});

// ---------------------------------------------------------------------------
// Preset 7 — editorial  (Times-style, serif body)
// ---------------------------------------------------------------------------

const editorial: TokenBundle = makePreset('editorial', {
  palette: {
    'surface-1':       '#fafaf7',
    'surface-2':       '#f3f1ea',
    'surface-3':       '#e8e3d3',
    'surface-4':       '#d4ccb3',
    'surface-overlay': rgba('#fafaf7', 0.85),
    'surface-scrim':   rgba('#0c1e3a', 0.5),
    'ink-1':           '#0c1e3a',
    'ink-2':           '#1e3a5f',
    'ink-3':           '#3d5575',
    'ink-4':           '#6a7c95',
    'ink-inverse':     '#fafaf7',
    'accent':          '#dc2626',
    'success':         '#0c8b51',
    'warn':            '#b45309',
    'danger':          '#991b1b',
    'info':            '#1e40af',
    'ghost':           rgba('#0c1e3a', 0.05),
    'ruler':           rgba('#0c1e3a', 0.1),
    'divider':         rgba('#0c1e3a', 0.08),
  },
  gradients: {
    'accent-grad': [
      { color: '#dc2626', position: 0 },
      { color: '#b45309', position: 0.5 },
      { color: '#0c1e3a', position: 1 },
    ],
  },
  // Editorial: body / lede / caption use serif by default.
  type: {
    body:    { family: 'serif' },
    lede:    { family: 'serif' },
    caption: { family: 'serif' },
    sub:     { family: 'serif' },
  },
  defaultBodyFamily: 'serif',
});

// ---------------------------------------------------------------------------
// Preset 8 — glass-noir  (translucent surfaces, electric blue accent, aurora elevation)
// ---------------------------------------------------------------------------

const glassNoir: TokenBundle = makePreset('glass-noir', {
  palette: {
    'surface-1':       '#050510',
    'surface-2':       rgba('#0a0a18', 0.6),
    'surface-3':       rgba('#16162a', 0.4),
    'surface-4':       rgba('#1f1f3a', 0.3),
    'surface-overlay': rgba('#050510', 0.7),
    'surface-scrim':   rgba('#000000', 0.7),
    'ink-1':           '#ffffff',
    'ink-2':           '#e4e4e7',
    'ink-3':           '#a1a1aa',
    'ink-4':           '#71717a',
    'ink-inverse':     '#050510',
    'accent':          '#00e5ff',
    'success':         '#10b981',
    'warn':            '#fbbf24',
    'danger':          '#f87171',
    'info':            '#60a5fa',
    'ghost':           rgba('#ffffff', 0.08),
    'ruler':           rgba('#00e5ff', 0.2),
    'divider':         rgba('#ffffff', 0.1),
  },
  gradients: {
    'accent-grad': [
      { color: '#00e5ff', position: 0 },
      { color: '#7c3aed', position: 0.5 },
      { color: '#ec4899', position: 1 },
    ],
  },
  // Glass-noir: emphasize aurora glow as the standard "raised" tier.
  elevation: {
    raised: [
      { offsetX: 0, offsetY: 24, blur: 80, spread: 0, color: rgba('#00e5ff', 0.32), inset: false },
      { offsetX: 0, offsetY: 8,  blur: 24, spread: 0, color: rgba('#7c3aed', 0.18), inset: false },
    ],
    floating: [
      { offsetX: 0, offsetY: 32, blur: 96, spread: 0, color: rgba('#00e5ff', 0.4),  inset: false },
      { offsetX: 0, offsetY: 12, blur: 32, spread: 0, color: rgba('#ec4899', 0.22), inset: false },
    ],
  },
});

// ---------------------------------------------------------------------------
// Preset table
// ---------------------------------------------------------------------------

/**
 * String-literal union of all preset keys. Crews use this as the type of the
 * `themePreset?: ThemePresetKey` prop on `<Slide>`/templates.
 */
export type ThemePresetKey =
  | 'vercel-dark'
  | 'linear-light'
  | 'stripe'
  | 'paper'
  | 'retro'
  | 'brutalist'
  | 'editorial'
  | 'glass-noir';

/**
 * The eight preset bundles per CONTRACT §2.8. Lookup via
 * `THEME_PRESETS[name]`. Bundles are mutable by reference but should be
 * treated as frozen — copy before patching.
 */
export const THEME_PRESETS: Record<ThemePresetKey, TokenBundle> = {
  'vercel-dark':  vercelDark,
  'linear-light': linearLight,
  'stripe':       stripe,
  'paper':        paper,
  'retro':        retro,
  'brutalist':    brutalist,
  'editorial':    editorial,
  'glass-noir':   glassNoir,
};
