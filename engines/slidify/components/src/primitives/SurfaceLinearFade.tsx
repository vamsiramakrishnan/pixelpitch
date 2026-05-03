/**
 * <SurfaceLinearFade> — Tier-A primitive (`surface.linear-fade`).
 *
 * A directional linear gradient that fades from full color → transparent
 * (or vice versa). Backs `bg.scrim-bottom`, `bg.scrim-top`, and
 * `mask.gradient-fade-edge`. The `direction` enum compiles to a degree
 * value; `fadePct` controls where the color ramp finishes.
 *
 * Composition (z-order bottom → top):
 *   - `surface.linear-fade`  ShapeNode (rect) with linear-gradient fill
 *
 * F1 deps: LinearGradient `Fill`.
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

export type FadeDirection =
  | 'top' | 'bottom' | 'left' | 'right' | 'tl-br' | 'bl-tr';

export interface SurfaceLinearFadeProps {
  bbox: Bbox;
  /** The fade-in color. Optional — defaults to surface-1. */
  color?: Color;
  /** Synonym for `color` — atoms.yaml uses `bgColor` for some recipes. */
  bgColor?: Color;
  /** Direction the color "comes from" (e.g. `'bottom'` = scrim at bottom). Optional — defaults to 'bottom'. */
  direction?: FadeDirection;
  /** Peak alpha at the colored stop. Default `1`. */
  opacity?: number;
  /** Where the colored ramp ends, in 0..1. Default `1`. */
  fadePct?: number;
  children?: ReactNode;
}

const DIR_TO_DEG: Record<FadeDirection, number> = {
  top:    0,
  right:  90,
  bottom: 180,
  left:   270,
  'tl-br': 135,
  'bl-tr': 45,
};

function withAlpha(color: Color, alpha: number): Color {
  if (typeof color === 'string') return { hex: color.slice(0, 7), alpha };
  return { hex: color.hex, alpha };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SurfaceLinearFade(props: SurfaceLinearFadeProps): ReactNode {
  const direction = props.direction ?? 'bottom';
  const angle = DIR_TO_DEG[direction];
  const opacity = props.opacity ?? 1;
  const end = Math.max(0, Math.min(1, props.fadePct ?? 1));
  const color = props.color ?? props.bgColor ?? defaultTokens.palette('surface-1');
  const fillCss = fillToCss({
    kind: 'linear-gradient',
    angleDeg: angle,
    stops: [
      { color: withAlpha(color, opacity), position: 0 },
      { color: withAlpha(color, 0), position: end },
    ],
  });
  return (
    <div
      data-recipe-id="surface.linear-fade"
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

export function surfaceLinearFadeToIR(
  props: SurfaceLinearFadeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const direction = props.direction ?? 'bottom';
  const angle = DIR_TO_DEG[direction];
  const opacity = props.opacity ?? 1;
  const end = Math.max(0, Math.min(1, props.fadePct ?? 1));
  const color = props.color ?? props.bgColor ?? tokens.palette('surface-1');

  const node: ShapeNode = {
    kind: 'shape',
    recipeId: 'surface.linear-fade',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.linear-fade',
      axis: 'surface',
      direction,
      opacity,
      fadePct: end,
    },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: {
      kind: 'linear-gradient',
      angleDeg: angle,
      stops: [
        { color: withAlpha(color, opacity), position: 0 },
        { color: withAlpha(color, 0), position: end },
      ],
    },
  };

  return {
    kind: 'group',
    recipeId: 'surface.linear-fade',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.linear-fade',
      axis: 'surface',
      direction,
      angleDeg: angle,
      opacity,
      fadePct: end,
    },
    children: [node],
  };
}
