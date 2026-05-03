/**
 * <FrameSafeArea> — Tier-A primitive (`frame.safe-area`).
 *
 * Layout-only frame that insets its parent bbox by `tokens.slot('pad-slide')`
 * and re-bboxes its `childIR` to the inner safe area. No visual chrome — this
 * primitive exists so that Tier-B recipes (e.g. `bg.aurora-band`,
 * `surf.hero`) and composite atoms can declare "lay this out inside the
 * conventional inner margin" without computing the inset themselves.
 *
 * Composition (z-order bottom → top):
 *   - Single GroupNodeT, `recipeId: 'frame.safe-area'`
 *   - Children: caller's `childIR` emitted at z=0..N, *unchanged in shape*
 *     except their (optional) bbox is replaced with the safe-area bbox if
 *     they carried no bbox of their own. Children that already declare a
 *     bbox are left as-is — this primitive does not re-position arbitrary
 *     subtrees; it only provides the inner-frame coordinate.
 *
 * Padding levels:
 *   - `'tight'`     -> `tokens.slot('gutter-wide')` (≈ 48 px)
 *   - `'cozy'`      -> `tokens.slot('pad-slide')`  (≈ 96 px) — default
 *   - `'spacious'`  -> `tokens.slot('pad-slide') × 1.25`
 *
 * F1 deps: none. Pure layout.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  GroupNodeT,
  Node as IRNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

export type SafeAreaPadding = 'tight' | 'cozy' | 'spacious';

export interface FrameSafeAreaProps {
  bbox: Bbox;
  /** Optional IR children to receive the inner safe-area bbox. */
  childrenIR?: IRNode[];
  /** Padding tier; defaults to `'cozy'` (= `tokens.slot('pad-slide')`). */
  padding?: SafeAreaPadding;
  /** React children for HTML preview only. */
  children?: ReactNode;
}

function resolveInset(padding: SafeAreaPadding | undefined, tokens: TokensApi): number {
  switch (padding ?? 'cozy') {
    case 'tight':    return tokens.slot('gutter-wide');
    case 'spacious': return tokens.slot('pad-slide') * 1.25;
    case 'cozy':
    default:         return tokens.slot('pad-slide');
  }
}

function safeBbox(bbox: Bbox, inset: number): Bbox {
  return {
    x: bbox.x + inset,
    y: bbox.y + inset,
    w: Math.max(0, bbox.w - inset * 2),
    h: Math.max(0, bbox.h - inset * 2),
  };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function FrameSafeArea(props: FrameSafeAreaProps): ReactNode {
  const inset = resolveInset(props.padding, defaultTokens);
  const inner = safeBbox(props.bbox, inset);
  return (
    <div
      data-recipe-id="frame.safe-area"
      style={{
        position: 'absolute',
        left: inner.x,
        top: inner.y,
        width: inner.w,
        height: inner.h,
      }}
    >
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function frameSafeAreaToIR(
  props: FrameSafeAreaProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const inset = resolveInset(props.padding, tokens);
  const inner = safeBbox(props.bbox, inset);
  const children: IRNode[] = (props.childrenIR ?? []).map((child, i) => ({
    ...child,
    bbox: child.bbox ?? inner,
    zOrder: i * 10,
  }));
  return {
    kind: 'group',
    recipeId: 'frame.safe-area',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'frame.safe-area',
      axis: 'frame',
      padding: props.padding ?? 'cozy',
      insetPx: inset,
      innerBbox: inner,
    },
    children,
  };
}
