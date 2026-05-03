/**
 * Internal helpers shared by Tier-A primitives.
 *
 * Lives under `primitives/` (rather than its own folder) so that the
 * codegen-emitted Tier-B recipes never need to depend on it — they only
 * import the named primitive entry-points. Keeping this file underscored
 * marks it as an implementation detail.
 */

import type { Bbox, Color, Fill } from '../ir/schema';

/**
 * Normalize an IR `Color` (string `#rrggbb[aa]` or `{hex, alpha}`) to a CSS
 * color string. Used by every primitive's React-preview path.
 */
export function colorToCss(c: Color): string {
  if (typeof c === 'string') return c;
  if (c.alpha === undefined || c.alpha >= 0.999) return c.hex;
  const r = parseInt(c.hex.slice(1, 3), 16);
  const g = parseInt(c.hex.slice(3, 5), 16);
  const b = parseInt(c.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${c.alpha})`;
}

/**
 * Render any IR `Fill` to a CSS `background:` value. Falls back to the
 * foreground color for `pattern` (the Python compiler emits the real
 * pattern; the preview only needs visibility).
 */
export function fillToCss(fill: Fill): string {
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
    return `radial-gradient(${fill.shape} at ${(fill.cx * 100).toFixed(1)}% ${(fill.cy * 100).toFixed(1)}%, ${stops})`;
  }
  return colorToCss(fill.fgColor);
}

/** Inset a bbox uniformly by `pad` px. */
export function insetBbox(bbox: Bbox, pad: number): Bbox {
  return {
    x: bbox.x + pad,
    y: bbox.y + pad,
    w: Math.max(0, bbox.w - pad * 2),
    h: Math.max(0, bbox.h - pad * 2),
  };
}
