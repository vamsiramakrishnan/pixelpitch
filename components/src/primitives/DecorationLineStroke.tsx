/**
 * <DecorationLineStroke> — Tier-A primitive (`decoration.line-stroke`).
 *
 * A horizontal or vertical hairline / dotted / dashed rule. Backs
 * `dec.hairline-rule`, `dec.dotted-rule`, `dec.section-divider`.
 * Implementation is a single PathShape so the dash array survives the
 * IR → PPTX trip natively (`<a:prstDash>`).
 *
 * Composition (z-order bottom → top):
 *   - `decoration.line-stroke`  PathShape (M..L) with optional dash array
 *
 * F1 deps: PathShape, strokeDasharray.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  PathShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type LineOrientation = 'h' | 'v';
export type LineDash = 'solid' | 'dotted' | 'dashed';

export interface DecorationLineStrokeProps {
  bbox: Bbox;
  /** Direction of the stroke. */
  orientation: LineOrientation;
  /** Stroke color. */
  color: Color;
  /** Solid / dotted / dashed. Default `'solid'`. */
  dash?: LineDash;
  /** Stroke thickness, px. Default `1`. */
  thicknessPx?: number;
}

function dashArrayFor(dash: LineDash, thickness: number): number[] | undefined {
  if (dash === 'dotted') return [thickness, thickness * 2];
  if (dash === 'dashed') return [thickness * 4, thickness * 2];
  return undefined;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DecorationLineStroke(
  props: DecorationLineStrokeProps,
): ReactNode {
  const thickness = props.thicknessPx ?? 1;
  const dash = props.dash ?? 'solid';
  const isHorizontal = props.orientation === 'h';
  const css = colorToCss(props.color);
  const styleSuffix = dash === 'solid' ? css : `${css} ${dash === 'dotted' ? 'dotted' : 'dashed'}`;
  return (
    <div
      data-recipe-id="decoration.line-stroke"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        borderTop: isHorizontal ? `${thickness}px ${dash === 'solid' ? 'solid' : dash} ${css}` : undefined,
        borderLeft: !isHorizontal ? `${thickness}px ${dash === 'solid' ? 'solid' : dash} ${css}` : undefined,
        // styleSuffix unused but keeps TS happy when caller swaps borders.
        outlineColor: styleSuffix,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function decorationLineStrokeToIR(
  props: DecorationLineStrokeProps,
  _tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const thickness = props.thicknessPx ?? 1;
  const dash = props.dash ?? 'solid';
  const isHorizontal = props.orientation === 'h';
  const midY = props.bbox.y + props.bbox.h / 2;
  const midX = props.bbox.x + props.bbox.w / 2;

  const dashArray = dashArrayFor(dash, thickness);

  const node: PathShapeNode = {
    kind: 'path',
    recipeId: 'decoration.line-stroke',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'decoration.line-stroke',
      axis: 'decoration',
      orientation: props.orientation,
      dash,
      thicknessPx: thickness,
    },
    commands: isHorizontal
      ? [
          { op: 'M', x: props.bbox.x, y: midY },
          { op: 'L', x: props.bbox.x + props.bbox.w, y: midY },
        ]
      : [
          { op: 'M', x: midX, y: props.bbox.y },
          { op: 'L', x: midX, y: props.bbox.y + props.bbox.h },
        ],
    fillRule: 'nonzero',
    strokeWidthPx: thickness,
    strokeColor: props.color,
    strokeLinecap: dash === 'dotted' ? 'round' : 'butt',
    strokeLinejoin: 'miter',
    ...(dashArray ? { strokeDasharray: dashArray } : {}),
  };

  return {
    kind: 'group',
    recipeId: 'decoration.line-stroke',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'decoration.line-stroke',
      axis: 'decoration',
      orientation: props.orientation,
      dash,
      thicknessPx: thickness,
    },
    children: [node],
  };
}
