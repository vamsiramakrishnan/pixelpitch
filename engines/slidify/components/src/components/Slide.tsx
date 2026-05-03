/**
 * <Slide> — root container. Children compile to IR nodes; Slide bundles
 * them into a Slide IR record with optional theme override and background.
 *
 * Wave-2 / Crew F2: now token-aware. Adds `themePreset` and `density`
 * top-level props. The React render is wrapped in a `<TokenProvider>` so
 * descendants can `useTokens()`. The IR-side `buildSlide(props, childNodes,
 * tokens?)` accepts an explicit `tokens` arg, defaulting to the bundle
 * synthesized from `themePreset` + `density`.
 */

import type { ReactNode } from 'react';
import type { Bbox, Fill, Slide as SlideIR, Node } from '../ir/schema';
import {
  DEFAULT_TOKENS,
  THEME_PRESETS,
  TokenProvider,
  getTokensFromBundle,
  type DensityMode,
  type ThemePresetKey,
  type TokensApi,
} from '../tokens';

export interface SlideProps {
  index: number;
  background?: Fill;
  bbox?: Bbox;
  notes?: string;
  children?: ReactNode;
  /** Theme variant — controls default colors / fonts on a slide-by-slide basis. */
  theme?: 'light' | 'dark' | 'gradient-aurora' | 'gradient-sunset';
  /**
   * Wave-2 token preset key. Drives palette/type/elevation defaults for every
   * descendant component. Defaults to `'vercel-dark'`.
   */
  themePreset?: ThemePresetKey;
  /** Density mode applied to all token spacing & type calls. Default `'cozy'`. */
  density?: DensityMode;
}

export const SLIDE_THEMES: Record<NonNullable<SlideProps['theme']>, Fill> = {
  'light':           { kind: 'solid', color: '#ffffff' },
  'dark':            { kind: 'solid', color: '#070710' },
  'gradient-aurora': {
    kind: 'radial-gradient', shape: 'ellipse', cx: 0.8, cy: 0.12,
    stops: [
      { color: '#1e1b4b', position: 0 },
      { color: '#0a0a14', position: 0.55 },
      { color: '#050510', position: 1 },
    ],
  },
  'gradient-sunset': {
    kind: 'linear-gradient', angleDeg: 135,
    stops: [
      { color: '#4338ca', position: 0 },
      { color: '#7c3aed', position: 0.35 },
      { color: '#db2777', position: 1 },
    ],
  },
};

export default function Slide(props: SlideProps) {
  // React component is for browser preview only. The actual emit happens
  // when Deck.toIR() walks children and dispatches each component's toIR.
  const bg = props.background ?? SLIDE_THEMES[props.theme ?? 'dark'];
  const cssBg = fillToCssBackground(bg);

  const bundle = THEME_PRESETS[props.themePreset ?? 'vercel-dark'];
  const tokens = getTokensFromBundle(bundle, props.density ?? 'cozy');
  const inkColor = tokens.palette('ink-1');
  const inkCss = typeof inkColor === 'string' ? inkColor : inkColor.hex;

  return (
    <TokenProvider value={tokens}>
      <div
        data-slidify-slide={props.index}
        style={{
          position: 'relative',
          width: 1280,
          height: 720,
          background: cssBg,
          fontFamily: tokens.fonts.sans,
          color: inkCss,
          overflow: 'hidden',
        }}
      >
        {props.children}
      </div>
    </TokenProvider>
  );
}

/**
 * Build a Slide IR record from props + already-emitted child IR nodes.
 *
 * @param tokens optional token bundle for downstream consumers; defaults to
 *   the bundle implied by `props.themePreset` + `props.density`. Keeping the
 *   signature backward-compatible means existing callers that omit `tokens`
 *   still work — the synthesized default carries the same `vercel-dark`
 *   visual baseline as v0.1.
 */
export function buildSlide(
  props: SlideProps,
  childNodes: Node[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokens?: TokensApi,
): SlideIR {
  // Resolve tokens (synthesize defaults from preset+density if not supplied).
  // Currently the tokens object isn't stamped onto the SlideIR — the IR
  // schema doesn't (yet) carry a token reference. The arg exists per
  // CONTRACT §2.1 so future callers/consumers don't have to change shape.
  void (tokens ?? getTokensFromBundle(
    THEME_PRESETS[props.themePreset ?? 'vercel-dark'] ?? DEFAULT_TOKENS,
    props.density ?? 'cozy',
  ));
  return {
    index: props.index,
    bbox: props.bbox ?? { x: 0, y: 0, w: 1280, h: 720 },
    background: props.background ?? SLIDE_THEMES[props.theme ?? 'dark'],
    nodes: childNodes,
    notes: props.notes ?? '',
  };
}

// ---- Internal helpers --------------------------------------------------------

function fillToCssBackground(fill: Fill): string {
  if (fill.kind === 'none') return 'transparent';
  if (fill.kind === 'solid') return colorToCss(fill.color);
  if (fill.kind === 'linear-gradient') {
    const stops = fill.stops
      .map(s => `${colorToCss(s.color)} ${(s.position * 100).toFixed(1)}%`)
      .join(', ');
    return `linear-gradient(${fill.angleDeg}deg, ${stops})`;
  }
  if (fill.kind === 'radial-gradient') {
    const stops = fill.stops
      .map(s => `${colorToCss(s.color)} ${(s.position * 100).toFixed(1)}%`)
      .join(', ');
    return `radial-gradient(${fill.shape} at ${fill.cx * 100}% ${fill.cy * 100}%, ${stops})`;
  }
  // Wave-2: pattern fills are emitted natively by the Python compiler;
  // the HTML preview falls back to the foreground color so the slide is
  // still visible. Crews wanting a true CSS preview can swap this later.
  return colorToCss(fill.fgColor);
}

function colorToCss(c: { hex: string; alpha?: number } | string): string {
  if (typeof c === 'string') return c;
  if (c.alpha === undefined || c.alpha >= 0.999) return c.hex;
  // Convert #rrggbb + alpha → rgba()
  const r = parseInt(c.hex.slice(1, 3), 16);
  const g = parseInt(c.hex.slice(3, 5), 16);
  const b = parseInt(c.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${c.alpha})`;
}
