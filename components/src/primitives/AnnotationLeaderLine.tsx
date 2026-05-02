/**
 * <AnnotationLeaderLine> — Tier-A primitive (`annotation.leader-line`).
 *
 * A single leader line connecting two anchor points, with optional
 * arrowheads on either end. Backs the leader inside `anno.tooltip`,
 * `anno.numbered-hotspot`, and any future callout that needs a tail.
 *
 * Composition (z-order bottom → top):
 *   - `annotation.leader-line`  PathShape (M..L) with markerStart / markerEnd
 *
 * F1 deps: PathShape, Arrowhead (markerStart/markerEnd).
 */

import type { ReactNode } from 'react';
import type {
  Arrowhead,
  Bbox,
  Color,
  GroupNodeT,
  PathShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface LeaderPoint { x: number; y: number; }

export interface AnnotationLeaderLineProps {
  bbox: Bbox;
  /** Start anchor (slide-pixel coords). */
  from: LeaderPoint;
  /** End anchor (slide-pixel coords). */
  to: LeaderPoint;
  /** Arrowhead at the start. Default `{ kind: 'none' }`. */
  head?: Arrowhead;
  /** Arrowhead at the end. Default `{ kind: 'arrow', size: 'md' }`. */
  tail?: Arrowhead;
  /** Render as a dashed line. Default `false`. */
  dashed?: boolean;
  /** Stroke color. Default `tokens.palette('ink-2')`. */
  color?: Color;
  /** Stroke thickness, px. Default `1.5`. */
  thicknessPx?: number;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function AnnotationLeaderLine(
  props: AnnotationLeaderLineProps,
): ReactNode {
  const t = defaultTokens;
  const color = colorToCss(props.color ?? t.palette('ink-2'));
  const thickness = props.thicknessPx ?? 1.5;
  return (
    <div
      data-recipe-id="annotation.leader-line"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        pointerEvents: 'none',
      }}
    >
      <svg
        width={props.bbox.w}
        height={props.bbox.h}
        viewBox={`${props.bbox.x} ${props.bbox.y} ${props.bbox.w} ${props.bbox.h}`}
      >
        <line
          x1={props.from.x}
          y1={props.from.y}
          x2={props.to.x}
          y2={props.to.y}
          stroke={color}
          strokeWidth={thickness}
          strokeDasharray={props.dashed ? '4 4' : undefined}
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function annotationLeaderLineToIR(
  props: AnnotationLeaderLineProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const color = props.color ?? tokens.palette('ink-2');
  const thickness = props.thicknessPx ?? 1.5;
  const dash = props.dashed ? [thickness * 3, thickness * 2] : undefined;

  const path: PathShapeNode = {
    kind: 'path',
    recipeId: 'annotation.leader-line',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'annotation.leader-line',
      axis: 'annotation',
      from: props.from,
      to: props.to,
      dashed: !!props.dashed,
    },
    commands: [
      { op: 'M', x: props.from.x, y: props.from.y },
      { op: 'L', x: props.to.x, y: props.to.y },
    ],
    fillRule: 'nonzero',
    strokeWidthPx: thickness,
    strokeColor: color,
    strokeLinecap: 'round',
    strokeLinejoin: 'miter',
    ...(dash ? { strokeDasharray: dash } : {}),
    ...(props.head ? { markerStart: props.head } : {}),
    markerEnd: props.tail ?? { kind: 'arrow', size: 'md' },
  };

  return {
    kind: 'group',
    recipeId: 'annotation.leader-line',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'annotation.leader-line',
      axis: 'annotation',
      from: props.from,
      to: props.to,
      dashed: !!props.dashed,
      thicknessPx: thickness,
    },
    children: [path],
  };
}
