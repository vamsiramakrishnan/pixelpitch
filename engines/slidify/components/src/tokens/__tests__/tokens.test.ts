/**
 * Token system smoke tests (Wave-2 / Crew F2).
 *
 * Coverage:
 *   - Helper API: palette / gradient / type / space / slot / radius / elevation
 *     / fonts / css.
 *   - Density mode multipliers.
 *   - All 8 presets load and return sensible values.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOKENS,
  DENSITY_MULTIPLIERS,
  THEME_PRESETS,
  getTokensFromBundle,
  tokens as defaultTokens,
} from '../index';
import type { ThemePresetKey, TokensApi } from '../index';

const PRESET_KEYS: ThemePresetKey[] = [
  'vercel-dark', 'linear-light', 'stripe', 'paper',
  'retro', 'brutalist', 'editorial', 'glass-noir',
];

// ---------------------------------------------------------------------------
// Helper API
// ---------------------------------------------------------------------------

describe('tokens.palette()', () => {
  it('returns the bundle color verbatim when no alpha is supplied', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    expect(t.palette('accent')).toBe('#a78bfa');
    expect(t.palette('surface-1')).toBe('#070710');
  });

  it('returns a `{hex, alpha}` object when alpha is supplied', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    const c = t.palette('accent', 0.4);
    expect(c).toEqual({ hex: '#a78bfa', alpha: 0.4 });
  });

  it('overrides existing alpha when alpha is supplied', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    // 'ghost' is already a {hex, alpha} object in the default bundle.
    const c = t.palette('ghost', 0.5);
    expect(c).toEqual({ hex: '#ffffff', alpha: 0.5 });
  });
});

describe('tokens.gradient()', () => {
  it('returns a LinearGradient with default 135° angle', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    const g = t.gradient('accent-grad');
    expect(g.kind).toBe('linear-gradient');
    expect(g.angleDeg).toBe(135);
    expect(g.stops.length).toBeGreaterThanOrEqual(2);
  });

  it('honors an explicit angle', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    expect(t.gradient('accent-grad', 90).angleDeg).toBe(90);
  });

  it('returns a defensive copy of the stops', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    const g1 = t.gradient('accent-grad');
    g1.stops.pop();
    const g2 = t.gradient('accent-grad');
    expect(g2.stops.length).toBeGreaterThanOrEqual(2);
  });
});

describe('tokens.type()', () => {
  it('returns sizePx, weight, leadingEm, trackingEm, family', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    const ty = t.type('slide-title');
    expect(ty.sizePx).toBe(56);
    expect(ty.weight).toBe(800);
    expect(ty.leadingEm).toBeGreaterThan(0);
    expect(ty.trackingEm).toBeLessThan(0);
    expect(ty.family).toBe('Inter, sans-serif');
  });

  it('resolves family to the bundle-level CSS string', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    expect(t.type('mono').family).toContain('Mono');
  });
});

describe('tokens.space() / tokens.slot()', () => {
  it('space(n) returns n × density.space (cozy = 1×)', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');
    expect(t.space(16)).toBe(16);
    expect(t.space(24)).toBe(24);
  });

  it('slot returns the named slot', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    expect(t.slot('pad-card')).toBe(24);
    expect(t.slot('pad-slide')).toBe(96);
    expect(t.slot('rhythm')).toBe(16);
  });
});

describe('tokens.radius() / tokens.elevation()', () => {
  it('radius returns intrinsic px (no density mod)', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS, 'spacious');
    expect(t.radius('card')).toBe(16);
    expect(t.radius('pill')).toBe(9999);
  });

  it('elevation returns a BoxShadow[] (possibly empty)', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    expect(t.elevation('flat')).toEqual([]);
    expect(t.elevation('floating').length).toBeGreaterThanOrEqual(2);
    for (const s of t.elevation('overlay')) {
      expect(typeof s.blur).toBe('number');
      expect(s.color).toBeDefined();
    }
  });

  it('elevation array is a defensive copy', () => {
    const t = getTokensFromBundle(DEFAULT_TOKENS);
    const a = t.elevation('floating');
    a.length = 0;
    expect(t.elevation('floating').length).toBeGreaterThan(0);
  });
});

describe('tokens.fonts / tokens.css()', () => {
  it('exposes sans/serif/mono/display directly', () => {
    expect(defaultTokens.fonts.sans).toContain('Inter');
    expect(defaultTokens.fonts.mono).toContain('Mono');
    expect(defaultTokens.fonts.serif).toMatch(/serif/);
    expect(defaultTokens.fonts.display).toBeDefined();
  });

  it('css() prepends `var(`', () => {
    expect(defaultTokens.css('--sf-accent')).toBe('var(--sf-accent)');
    expect(defaultTokens.css('sf-accent')).toBe('var(--sf-accent)');
  });
});

// ---------------------------------------------------------------------------
// Density modes
// ---------------------------------------------------------------------------

describe('density multipliers', () => {
  it('matches the table from CONTRACT §2.7', () => {
    expect(DENSITY_MULTIPLIERS.compact).toEqual({ space: 0.75, type: 0.92 });
    expect(DENSITY_MULTIPLIERS.cozy).toEqual({ space: 1.0, type: 1.0 });
    expect(DENSITY_MULTIPLIERS.spacious).toEqual({ space: 1.25, type: 1.08 });
  });

  it('compact density shrinks space and type', () => {
    const c = getTokensFromBundle(DEFAULT_TOKENS, 'compact');
    expect(c.space(16)).toBeCloseTo(12);
    expect(c.slot('pad-slide')).toBeCloseTo(72);
    expect(c.type('body').sizePx).toBeCloseTo(16 * 0.92);
  });

  it('spacious density grows space and type', () => {
    const s = getTokensFromBundle(DEFAULT_TOKENS, 'spacious');
    expect(s.space(16)).toBeCloseTo(20);
    expect(s.slot('pad-slide')).toBeCloseTo(120);
    expect(s.type('body').sizePx).toBeCloseTo(16 * 1.08);
  });

  it('density does NOT scale radius', () => {
    const s = getTokensFromBundle(DEFAULT_TOKENS, 'spacious');
    const c = getTokensFromBundle(DEFAULT_TOKENS, 'compact');
    expect(s.radius('card')).toBe(c.radius('card'));
  });
});

// ---------------------------------------------------------------------------
// Preset coverage
// ---------------------------------------------------------------------------

describe('THEME_PRESETS', () => {
  it('exposes all 8 named presets', () => {
    for (const k of PRESET_KEYS) {
      expect(THEME_PRESETS[k]).toBeDefined();
      expect(THEME_PRESETS[k].name).toBe(k);
    }
  });

  it.each(PRESET_KEYS)('preset %s wraps cleanly into a TokensApi', (key) => {
    const bundle = THEME_PRESETS[key];
    const t: TokensApi = getTokensFromBundle(bundle);
    // Smoke-call every method.
    expect(t.palette('ink-1')).toBeDefined();
    expect(t.palette('accent', 0.5)).toMatchObject({ alpha: 0.5 });
    expect(t.gradient('accent-grad').stops.length).toBeGreaterThanOrEqual(2);
    expect(t.type('body').sizePx).toBeGreaterThan(0);
    expect(t.space(16)).toBe(16);
    expect(t.slot('pad-card')).toBeGreaterThan(0);
    expect(t.radius('card')).toBeGreaterThan(0);
    expect(Array.isArray(t.elevation('floating'))).toBe(true);
    expect(t.fonts.sans.length).toBeGreaterThan(0);
  });

  it('brutalist preset has empty raised elevation per CONTRACT §2.8', () => {
    const t = getTokensFromBundle(THEME_PRESETS['brutalist']);
    expect(t.elevation('raised')).toEqual([]);
  });

  it('editorial preset uses serif as the body family', () => {
    const t = getTokensFromBundle(THEME_PRESETS['editorial']);
    expect(t.type('body').family).toMatch(/serif/i);
  });

  it('glass-noir preset has a non-empty aurora-style raised stack', () => {
    const t = getTokensFromBundle(THEME_PRESETS['glass-noir']);
    expect(t.elevation('raised').length).toBeGreaterThan(0);
  });

  it('every preset exposes the same set of palette keys as DEFAULT_TOKENS', () => {
    const defaultKeys = Object.keys(DEFAULT_TOKENS.palette).sort();
    for (const k of PRESET_KEYS) {
      expect(Object.keys(THEME_PRESETS[k].palette).sort()).toEqual(defaultKeys);
    }
  });
});
