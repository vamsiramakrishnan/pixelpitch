/**
 * <SurfaceRadialBlob> — Tier-A primitive (`surface.radial-blob`).
 *
 * A single radial-gradient "blob" anchored at `(cx, cy)` (0..1 normalized
 * coordinates within the bbox). Backs every spotlight / aurora-corner /
 * single-color-glow Tier-B recipe. `intensity` swaps between three
 * pre-tuned alpha ramps so callers don't pick numeric stops.
 *
 * Composition (z-order bottom → top):
 *   - `surface.radial-blob`  ShapeNode (rect or oval) with radial-gradient fill
 *
 * F1 deps: RadialGradient `Fill`.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { fillToCss } from './_shared';

export type BlobIntensity = 'low' | 'med' | 'high';
export type BlobShape = 'circle' | 'ellipse';

export interface SurfaceRadialBlobProps {
  bbox: Bbox;
  /** Center color (full alpha at the inner stop). Optional — defaults to accent. */
  color?: Color;
  /** Synonym for `color` — atoms.yaml uses `colorTL` for some recipes. */
  colorTL?: Color;
  colorTR?: Color;
  colorBL?: Color;
  colorBR?: Color;
  /** Center X (0..1 within bbox). Default `0.5`. */
  cx?: number;
  /** Center Y (0..1 within bbox). Default `0.5`. */
  cy?: number;
  /** Pre-tuned alpha curve. Default `'med'`. */
  intensity?: BlobIntensity;
  /** Gradient shape. Default `'ellipse'`. */
  shape?: BlobShape;
  children?: ReactNode;
}

/** Inner alpha for the colored stop. Outer stop is always alpha 0. */
const INTENSITY_ALPHA: Record<BlobIntensity, number> = {
  low: 0.18,
  med: 0.32,
  high: 0.55,
};

function withAlpha(color: Color, alpha: number): Color {
  if (typeof color === 'string') {
    return { hex: color.length === 7 ? color : color.slice(0, 7), alpha };
  }
  return { hex: color.hex, alpha };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

function resolveColor(props: SurfaceRadialBlobProps, tokens: TokensApi): Color {
  return (
    props.color ??
    props.colorTL ??
    props.colorTR ??
    props.colorBL ??
    props.colorBR ??
    tokens.palette('accent')
  );
}

export default function SurfaceRadialBlob(props: SurfaceRadialBlobProps): ReactNode {
  const cx = props.cx ?? 0.5;
  const cy = props.cy ?? 0.5;
  const color = resolveColor(props, defaultTokens);
  const inner = withAlpha(color, INTENSITY_ALPHA[props.intensity ?? 'med']);
  const outer = withAlpha(color, 0);
  const fillCss = fillToCss({
    kind: 'radial-gradient',
    shape: props.shape ?? 'ellipse',
    cx,
    cy,
    stops: [
      { color: inner, position: 0 },
      { color: outer, position: 1 },
    ],
  });
  return (
    <div
      data-recipe-id="surface.radial-blob"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: fillCss,
      }}
    >
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function surfaceRadialBlobToIR(
  props: SurfaceRadialBlobProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const cx = props.cx ?? 0.5;
  const cy = props.cy ?? 0.5;
  const intensity = props.intensity ?? 'med';
  const shape = props.shape ?? 'ellipse';
  const color = resolveColor(props, tokens);
  const inner = withAlpha(color, INTENSITY_ALPHA[intensity]);
  const outer = withAlpha(color, 0);

  const node: ShapeNode = {
    kind: 'shape',
    recipeId: 'surface.radial-blob',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.radial-blob',
      axis: 'surface',
      cx,
      cy,
      intensity,
      shape,
    },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: {
      kind: 'radial-gradient',
      shape,
      cx,
      cy,
      stops: [
        { color: inner, position: 0 },
        { color: outer, position: 1 },
      ],
    },
  };

  return {
    kind: 'group',
    recipeId: 'surface.radial-blob',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.radial-blob',
      axis: 'surface',
      cx,
      cy,
      intensity,
      shape,
    },
    children: [node],
  };
}
