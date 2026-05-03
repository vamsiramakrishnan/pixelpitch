/**
 * <FrameThreeUp> — Tier-A primitive (`frame.three-up`).
 *
 * Three equal columns separated by `tokens.slot('gutter')`. Pure layout —
 * common substrate for trio recipes (`comp.three-up-stats`, feature triplets,
 * pricing tier rows).
 *
 * Composition (z-order bottom → top):
 *   - `frame.three-up`             Outer GroupNode (no chrome)
 *     - `frame.three-up.col-1`     Wrapper bbox = col 1
 *     - `frame.three-up.col-2`     Wrapper bbox = col 2
 *     - `frame.three-up.col-3`     Wrapper bbox = col 3
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

export interface FrameThreeUpProps {
  bbox: Bbox;
  /** Gap between columns. Defaults to `tokens.slot('gutter')`. */
  gap?: number;
  /** IR for each column slot (length 1..3 — missing slots render empty). */
  columnsIR?: (IRNode | undefined)[];
  children?: ReactNode;
}

function colBboxes(bbox: Bbox, gap: number): Bbox[] {
  const cols = 3;
  const w = (bbox.w - gap * (cols - 1)) / cols;
  return Array.from({ length: cols }, (_, i) => ({
    x: bbox.x + i * (w + gap),
    y: bbox.y,
    w,
    h: bbox.h,
  }));
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function FrameThreeUp(props: FrameThreeUpProps): ReactNode {
  const t = defaultTokens;
  const gap = props.gap ?? t.slot('gutter');
  const boxes = colBboxes(props.bbox, gap);
  return (
    <div
      data-recipe-id="frame.three-up"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      {boxes.map((b, i) => (
        <div
          key={i}
          data-recipe-id={`frame.three-up.col-${i + 1}`}
          style={{
            position: 'absolute',
            left: b.x - props.bbox.x,
            top: 0,
            width: b.w,
            height: b.h,
          }}
        />
      ))}
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function frameThreeUpToIR(
  props: FrameThreeUpProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const gap = props.gap ?? tokens.slot('gutter');
  const boxes = colBboxes(props.bbox, gap);
  const wrappers: GroupNodeT[] = boxes.map((b, i) => {
    const child = props.columnsIR?.[i];
    return {
      kind: 'group',
      recipeId: `frame.three-up.col-${i + 1}`,
      bbox: b,
      zOrder: i * 10,
      metadata: { role: 'three-up-col', index: i + 1 },
      children: child ? [{ ...child, bbox: child.bbox ?? b }] : [],
    };
  });

  return {
    kind: 'group',
    recipeId: 'frame.three-up',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'frame.three-up', axis: 'frame', gap, columns: 3 },
    children: wrappers,
  };
}
