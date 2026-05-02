/**
 * <FrameLetterbox> — Tier-A primitive (`frame.letterbox`).
 *
 * Cinematic top/bottom black bands with a content gutter between them.
 * Common substrate for `surf.frame-letterbox`, hero quote slides, opening
 * frames, and "wide screen" treatments.
 *
 * Composition (z-order bottom → top):
 *   - `frame.letterbox.top-bar`     ShapeNode rect, full-bleed top band
 *   - `frame.letterbox.bottom-bar`  ShapeNode rect, full-bleed bottom band
 *   - `frame.letterbox.content`     GroupNode wrapping `childrenIR` between
 *                                   the bars (z=20+)
 *
 * Bar height defaults to ~10% of the slide height — film-style 2.39:1 feel
 * on a 16:9 frame. `barColor` defaults to `tokens.palette('surface-1')`.
 *
 * F1 deps: none.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface FrameLetterboxProps {
  bbox: Bbox;
  /** Bar height in px. Defaults to `bbox.h * 0.1`. */
  barHeightPx?: number;
  /** Bar color. Defaults to `tokens.palette('surface-1')` (near-black). */
  barColor?: Color;
  /** IR placed between the bars. */
  childrenIR?: IRNode[];
  children?: ReactNode;
}

function regions(bbox: Bbox, barH: number) {
  const top:    Bbox = { x: bbox.x, y: bbox.y,                  w: bbox.w, h: barH };
  const bottom: Bbox = { x: bbox.x, y: bbox.y + bbox.h - barH,  w: bbox.w, h: barH };
  const inner:  Bbox = {
    x: bbox.x,
    y: bbox.y + barH,
    w: bbox.w,
    h: Math.max(0, bbox.h - barH * 2),
  };
  return { top, bottom, inner };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function FrameLetterbox(props: FrameLetterboxProps): ReactNode {
  const t = defaultTokens;
  const barH = props.barHeightPx ?? props.bbox.h * 0.1;
  const barColor = colorToCss(props.barColor ?? t.palette('surface-1'));
  const r = regions(props.bbox, barH);
  return (
    <div
      data-recipe-id="frame.letterbox"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      <div
        data-recipe-id="frame.letterbox.top-bar"
        style={{ position: 'absolute', left: 0, top: 0, width: r.top.w, height: r.top.h, background: barColor }}
      />
      <div
        data-recipe-id="frame.letterbox.bottom-bar"
        style={{ position: 'absolute', left: 0, top: r.bottom.y - props.bbox.y, width: r.bottom.w, height: r.bottom.h, background: barColor }}
      />
      <div
        data-recipe-id="frame.letterbox.content"
        style={{ position: 'absolute', left: 0, top: r.inner.y - props.bbox.y, width: r.inner.w, height: r.inner.h }}
      >
        {props.children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function frameLetterboxToIR(
  props: FrameLetterboxProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const barH = props.barHeightPx ?? props.bbox.h * 0.1;
  const barColor = props.barColor ?? tokens.palette('surface-1');
  const r = regions(props.bbox, barH);

  const topBar: ShapeNode = {
    kind: 'shape',
    recipeId: 'frame.letterbox.top-bar',
    bbox: r.top,
    zOrder: 0,
    metadata: { role: 'letterbox-bar', side: 'top' },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: { kind: 'solid', color: barColor },
  };
  const bottomBar: ShapeNode = {
    kind: 'shape',
    recipeId: 'frame.letterbox.bottom-bar',
    bbox: r.bottom,
    zOrder: 10,
    metadata: { role: 'letterbox-bar', side: 'bottom' },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: { kind: 'solid', color: barColor },
  };

  const inner: GroupNodeT = {
    kind: 'group',
    recipeId: 'frame.letterbox.content',
    bbox: r.inner,
    zOrder: 20,
    metadata: { role: 'letterbox-content' },
    children: (props.childrenIR ?? []).map((child, i) => ({
      ...child,
      bbox: child.bbox ?? r.inner,
      zOrder: i * 10,
    })),
  };

  return {
    kind: 'group',
    recipeId: 'frame.letterbox',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'frame.letterbox', axis: 'frame', barHeightPx: barH },
    children: [topBar, bottomBar, inner],
  };
}
