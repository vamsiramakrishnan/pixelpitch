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
  /** Start anchor (slide-pixel coords). Optional — defaults to bbox left mid. */
  from?: LeaderPoint;
  /** End anchor (slide-pixel coords). Optional — defaults to bbox right mid. */
  to?: LeaderPoint;
  /** Synonym for `to` — atoms.yaml uses `leaderTo` for some recipes. */
  leaderTo?: LeaderPoint;
  /** Synonym for `from` — atoms.yaml uses `anchor` for some recipes. */
  anchor?: LeaderPoint;
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

function resolveLeader(props: AnnotationLeaderLineProps): {
  from: LeaderPoint;
  to: LeaderPoint;
} {
  const midY = props.bbox.y + props.bbox.h / 2;
  const from =
    props.from ?? props.anchor ?? { x: props.bbox.x, y: midY };
  const to =
    props.to ?? props.leaderTo ?? { x: props.bbox.x + props.bbox.w, y: midY };
  return { from, to };
}

export default function AnnotationLeaderLine(
  props: AnnotationLeaderLineProps,
): ReactNode {
  const t = defaultTokens;
  const color = colorToCss(props.color ?? t.palette('ink-2'));
  const thickness = props.thicknessPx ?? 1.5;
  const { from, to } = resolveLeader(props);
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
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
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
  const { from, to } = resolveLeader(props);

  const path: PathShapeNode = {
    kind: 'path',
    recipeId: 'annotation.leader-line',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'annotation.leader-line',
      axis: 'annotation',
      from,
      to,
      dashed: !!props.dashed,
    },
    commands: [
      { op: 'M', x: from.x, y: from.y },
      { op: 'L', x: to.x, y: to.y },
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
      from,
      to,
      dashed: !!props.dashed,
      thicknessPx: thickness,
    },
    children: [path],
  };
}
