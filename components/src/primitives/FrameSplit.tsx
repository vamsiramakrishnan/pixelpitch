/**
 * <FrameSplit> — Tier-A primitive (`frame.split`).
 *
 * Two-column hero/feature layout. Splits its parent bbox horizontally at a
 * declared `ratio` (e.g. `0.6` = left col 60% / right col 40%, the classic
 * hero shape). Calls into `tokens.slot('gutter-wide')` for the column gap.
 *
 * Composition (z-order bottom → top):
 *   - `frame.split`              Outer GroupNode (no chrome)
 *     - `frame.split.left`       Wrapper around `leftIR`, bbox = left column
 *     - `frame.split.right`      Wrapper around `rightIR`, bbox = right column
 *
 * Props:
 *   - `ratio` ∈ (0, 1) — left column width fraction. Defaults to `0.6`.
 *     Common values: `0.6` (60/40 hero), `0.7` (70/30 with content rail).
 *
 * F1 deps: none.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  GroupNodeT,
  Node as IRNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

export interface FrameSplitProps {
  bbox: Bbox;
  /** Left column width as fraction of total. Default `0.6`. */
  ratio?: number;
  /** Gap between columns. Defaults to `tokens.slot('gutter-wide')`. */
  gap?: number;
  /** IR for the left column. */
  leftIR?: IRNode;
  /** IR for the right column. */
  rightIR?: IRNode;
  children?: ReactNode;
}

function columnBboxes(bbox: Bbox, ratio: number, gap: number): { left: Bbox; right: Bbox } {
  const r = Math.min(0.95, Math.max(0.05, ratio));
  const totalGapless = bbox.w - gap;
  const leftW = Math.max(0, totalGapless * r);
  const rightW = Math.max(0, totalGapless * (1 - r));
  return {
    left:  { x: bbox.x,                y: bbox.y, w: leftW,  h: bbox.h },
    right: { x: bbox.x + leftW + gap,  y: bbox.y, w: rightW, h: bbox.h },
  };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function FrameSplit(props: FrameSplitProps): ReactNode {
  const t = defaultTokens;
  const ratio = props.ratio ?? 0.6;
  const gap = props.gap ?? t.slot('gutter-wide');
  const cols = columnBboxes(props.bbox, ratio, gap);
  return (
    <div
      data-recipe-id="frame.split"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      <div
        data-recipe-id="frame.split.left"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: cols.left.w,
          height: cols.left.h,
        }}
      />
      <div
        data-recipe-id="frame.split.right"
        style={{
          position: 'absolute',
          left: cols.right.x - props.bbox.x,
          top: 0,
          width: cols.right.w,
          height: cols.right.h,
        }}
      />
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function frameSplitToIR(
  props: FrameSplitProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const ratio = props.ratio ?? 0.6;
  const gap = props.gap ?? tokens.slot('gutter-wide');
  const cols = columnBboxes(props.bbox, ratio, gap);

  const leftWrapper: GroupNodeT = {
    kind: 'group',
    recipeId: 'frame.split.left',
    bbox: cols.left,
    zOrder: 0,
    metadata: { role: 'split-column', side: 'left', ratio },
    children: props.leftIR
      ? [{ ...props.leftIR, bbox: props.leftIR.bbox ?? cols.left }]
      : [],
  };
  const rightWrapper: GroupNodeT = {
    kind: 'group',
    recipeId: 'frame.split.right',
    bbox: cols.right,
    zOrder: 10,
    metadata: { role: 'split-column', side: 'right', ratio: 1 - ratio },
    children: props.rightIR
      ? [{ ...props.rightIR, bbox: props.rightIR.bbox ?? cols.right }]
      : [],
  };

  return {
    kind: 'group',
    recipeId: 'frame.split',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'frame.split', axis: 'frame', ratio, gap },
    children: [leftWrapper, rightWrapper],
  };
}
