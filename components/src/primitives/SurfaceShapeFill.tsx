/**
 * <SurfaceShapeFill> — Tier-A primitive (`surface.shape-fill`).
 *
 * A single filled surface (rect, rounded-rect, or oval) with optional
 * border + multi-shadow stack. Backs every "card / band / scrim" Tier-B
 * recipe whose composition is one filled shape. Fill accepts the full IR
 * `Fill` discriminated union (solid, linear-gradient, radial-gradient,
 * pattern), so this single primitive replaces ~20 ghost-delegations.
 *
 * Composition (z-order bottom → top):
 *   - `surface.shape-fill`  ShapeNode at the bbox with `shape` + `fill`
 *
 * F1 deps: `Fill` discriminated union (solid / gradient / pattern),
 * multi-shadow stack.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Border,
  BoxShadow,
  Fill,
  GroupNodeT,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { fillToCss, colorToCss } from './_shared';

/** Shape of the fill region. `oval` ignores `radiusPx`. */
export type SurfaceShape = 'rect' | 'rounded-rect' | 'oval';

export interface SurfaceShapeFillProps {
  bbox: Bbox;
  /** Fill discriminated union — solid, gradient, pattern, or none. Optional — defaults to a solid surface-2. */
  fill?: Fill;
  /** Synonym for `fill.color` when atoms.yaml uses `bgColor`. */
  bgColor?: import('../ir/schema').Color;
  /** Synonym for `radiusPx` — atoms.yaml uses `radius` for some recipes. */
  radius?: number;
  /** Shape geometry. Default `'rounded-rect'`. */
  shape?: SurfaceShape;
  /** Corner radius (px). Honored only for `'rounded-rect'`. Default `0`. */
  radiusPx?: number;
  /** Optional border. */
  border?: Border;
  /** Optional multi-shadow stack (max 4). */
  shadows?: BoxShadow[];
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

function resolveFill(props: SurfaceShapeFillProps, tokens: TokensApi): Fill {
  if (props.fill) return props.fill;
  if (props.bgColor) return { kind: 'solid', color: props.bgColor };
  return { kind: 'solid', color: tokens.palette('surface-2') };
}

export default function SurfaceShapeFill(props: SurfaceShapeFillProps): ReactNode {
  const shape = props.shape ?? 'rounded-rect';
  const radius = shape === 'oval' ? 9999 : (props.radiusPx ?? props.radius ?? 0);
  const fill = resolveFill(props, defaultTokens);
  const borderCss = props.border
    ? `${props.border.width}px ${props.border.style} ${colorToCss(props.border.color)}`
    : undefined;
  const shadowCss = (props.shadows ?? [])
    .map(s => `${s.inset ? 'inset ' : ''}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${colorToCss(s.color)}`)
    .join(', ') || undefined;
  return (
    <div
      data-recipe-id="surface.shape-fill"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: fillToCss(fill),
        borderRadius: radius,
        border: borderCss,
        boxShadow: shadowCss,
        boxSizing: 'border-box',
      }}
    >
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function surfaceShapeFillToIR(
  props: SurfaceShapeFillProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const shape: SurfaceShape = props.shape ?? 'rounded-rect';
  const radius = shape === 'oval' ? 0 : (props.radiusPx ?? props.radius ?? 0);
  const fill = resolveFill(props, tokens);

  const node: ShapeNode = {
    kind: 'shape',
    recipeId: 'surface.shape-fill',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.shape-fill',
      axis: 'surface',
      shape,
    },
    shape,
    borderRadiusPx: radius,
    fill,
    ...(props.border ? { border: props.border } : {}),
    ...(props.shadows && props.shadows.length > 0 ? { shadows: props.shadows.slice(0, 4) } : {}),
  };

  return {
    kind: 'group',
    recipeId: 'surface.shape-fill',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.shape-fill',
      axis: 'surface',
      shape,
      radiusPx: radius,
    },
    children: [node],
  };
}
