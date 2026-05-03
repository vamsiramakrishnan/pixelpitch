/**
 * <FrameSection> — Tier-A primitive (`frame.section`).
 *
 * Chapter-break frame with a full-bleed accent strip on the leading edge
 * (left, by default) and a generous safe area for the section title and
 * eyebrow. Common substrate for section dividers, "Chapter N" pages, and
 * editorial breakpoints.
 *
 * Composition (z-order bottom → top):
 *   - `frame.section.scrim`         Full-bleed scrim rect (`surface-2`)
 *   - `frame.section.accent-strip`  Thin accent rect on `side` (default left)
 *   - `frame.section.content`       GroupNode wrapping `childrenIR`, inset
 *                                   from the accent strip + safe-area pad
 *
 * Strip thickness defaults to `tokens.slot('gutter')` and color to the
 * default accent gradient (`tokens.gradient('accent-grad')`).
 *
 * F1 deps: none.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  Fill,
  GroupNodeT,
  Node as IRNode,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss, fillToCss } from './_shared';

export type SectionStripSide = 'left' | 'right' | 'top' | 'bottom';

export interface FrameSectionProps {
  bbox: Bbox;
  /** Which edge gets the accent strip. Default `'left'`. */
  side?: SectionStripSide;
  /** Strip thickness in px. Default `tokens.slot('gutter')`. */
  stripPx?: number;
  /** Background color. Default `tokens.palette('surface-2')`. */
  scrimColor?: Color;
  /** Strip fill — solid color OR a Fill (gradient). Default `accent-grad`. */
  stripFill?: Fill;
  /** IR placed inside the safe area. */
  childrenIR?: IRNode[];
  children?: ReactNode;
}

function stripBbox(bbox: Bbox, side: SectionStripSide, thickness: number): Bbox {
  switch (side) {
    case 'left':   return { x: bbox.x,                        y: bbox.y,                        w: thickness,  h: bbox.h };
    case 'right':  return { x: bbox.x + bbox.w - thickness,   y: bbox.y,                        w: thickness,  h: bbox.h };
    case 'top':    return { x: bbox.x,                        y: bbox.y,                        w: bbox.w,     h: thickness };
    case 'bottom': return { x: bbox.x,                        y: bbox.y + bbox.h - thickness,   w: bbox.w,     h: thickness };
  }
}

function contentBbox(bbox: Bbox, side: SectionStripSide, thickness: number, pad: number): Bbox {
  const offsetForStrip = (s: SectionStripSide): { dx: number; dy: number; dw: number; dh: number } => {
    if (s === 'left')   return { dx: thickness, dy: 0, dw: -thickness, dh: 0 };
    if (s === 'right')  return { dx: 0, dy: 0, dw: -thickness, dh: 0 };
    if (s === 'top')    return { dx: 0, dy: thickness, dw: 0, dh: -thickness };
    return                       { dx: 0, dy: 0, dw: 0, dh: -thickness };
  };
  const o = offsetForStrip(side);
  return {
    x: bbox.x + o.dx + pad,
    y: bbox.y + o.dy + pad,
    w: Math.max(0, bbox.w + o.dw - pad * 2),
    h: Math.max(0, bbox.h + o.dh - pad * 2),
  };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function FrameSection(props: FrameSectionProps): ReactNode {
  const t = defaultTokens;
  const side = props.side ?? 'left';
  const thickness = props.stripPx ?? t.slot('gutter');
  const scrim = colorToCss(props.scrimColor ?? t.palette('surface-2'));
  const strip = fillToCss(props.stripFill ?? t.gradient('accent-grad'));
  const sBbox = stripBbox(props.bbox, side, thickness);
  const cBbox = contentBbox(props.bbox, side, thickness, t.slot('pad-slide'));
  return (
    <div
      data-recipe-id="frame.section"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: scrim,
      }}
    >
      <div
        data-recipe-id="frame.section.accent-strip"
        style={{
          position: 'absolute',
          left: sBbox.x - props.bbox.x,
          top: sBbox.y - props.bbox.y,
          width: sBbox.w,
          height: sBbox.h,
          background: strip,
        }}
      />
      <div
        data-recipe-id="frame.section.content"
        style={{
          position: 'absolute',
          left: cBbox.x - props.bbox.x,
          top: cBbox.y - props.bbox.y,
          width: cBbox.w,
          height: cBbox.h,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function frameSectionToIR(
  props: FrameSectionProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const side = props.side ?? 'left';
  const thickness = props.stripPx ?? tokens.slot('gutter');
  const scrimColor = props.scrimColor ?? tokens.palette('surface-2');
  const stripFill: Fill = props.stripFill ?? tokens.gradient('accent-grad');
  const sBbox = stripBbox(props.bbox, side, thickness);
  const cBbox = contentBbox(props.bbox, side, thickness, tokens.slot('pad-slide'));

  const scrim: ShapeNode = {
    kind: 'shape',
    recipeId: 'frame.section.scrim',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'section-scrim' },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: { kind: 'solid', color: scrimColor },
  };
  const strip: ShapeNode = {
    kind: 'shape',
    recipeId: 'frame.section.accent-strip',
    bbox: sBbox,
    zOrder: 10,
    metadata: { role: 'section-accent-strip', side, thickness },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: stripFill,
  };
  const content: GroupNodeT = {
    kind: 'group',
    recipeId: 'frame.section.content',
    bbox: cBbox,
    zOrder: 20,
    metadata: { role: 'section-content' },
    children: (props.childrenIR ?? []).map((child, i) => ({
      ...child,
      bbox: child.bbox ?? cBbox,
      zOrder: i * 10,
    })),
  };

  return {
    kind: 'group',
    recipeId: 'frame.section',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'frame.section', axis: 'frame', side, stripPx: thickness },
    children: [scrim, strip, content],
  };
}
