/**
 * <DecorationShapePreset> — Tier-A primitive (`decoration.shape-preset`).
 *
 * A single F1-preset shape (brace, plus, star, arrow, polygon) painted
 * with a solid or gradient fill and an optional stroke. Replaces every
 * `dec.brace-*`, `dec.plus`, `dec.star-*`, `dec.arrow-*`, `mask.octagon`
 * Tier-B ghost delegation. The preset enum mirrors the F1 ShapeNode
 * `shape` enum so token-routed colors compile through unchanged.
 *
 * Composition (z-order bottom → top):
 *   - `decoration.shape-preset`  ShapeNode with the chosen preset shape
 *
 * F1 deps: ShapeNode preset shapes (`brace-*`, `plus`, `star-*`, `arrow-*`,
 * polygons), border, multi-shadow.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Border,
  Color,
  Fill,
  GroupNodeT,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss, fillToCss } from './_shared';

/** Every F1 preset shape this primitive surfaces. */
export type ShapePreset =
  | 'rect' | 'rounded-rect' | 'oval'
  | 'triangle' | 'right-triangle'
  | 'pentagon' | 'hexagon' | 'octagon'
  | 'parallelogram' | 'trapezoid'
  | 'chevron' | 'chevron-left'
  | 'brace-left' | 'brace-right' | 'brace-top' | 'brace-bottom'
  | 'plus' | 'star-5' | 'star-6'
  | 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down';

export interface DecorationShapePresetProps {
  bbox: Bbox;
  /** Which F1 preset to render. */
  preset: ShapePreset;
  /** Optional fill — solid color, gradient, or pattern. Defaults to `tokens.palette('accent')`. */
  fill?: Fill;
  /** Optional stroke. */
  stroke?: { color: Color; widthPx: number; dashArray?: number[] };
}

// ---------------------------------------------------------------------------
// React preview — falls back to a CSS approximation.
// (The Python compiler emits the true `<a:prstGeom>`.)
// ---------------------------------------------------------------------------

const PREVIEW_CLIP: Partial<Record<ShapePreset, string>> = {
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  'right-triangle': 'polygon(0% 0%, 100% 100%, 0% 100%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
  parallelogram: 'polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)',
  trapezoid: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
  chevron: 'polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%)',
  'chevron-left': 'polygon(25% 0%, 100% 0%, 75% 50%, 100% 100%, 25% 100%, 0% 50%)',
  'arrow-right': 'polygon(0% 30%, 65% 30%, 65% 0%, 100% 50%, 65% 100%, 65% 70%, 0% 70%)',
  'arrow-left': 'polygon(100% 30%, 35% 30%, 35% 0%, 0% 50%, 35% 100%, 35% 70%, 100% 70%)',
  'arrow-up': 'polygon(30% 100%, 30% 35%, 0% 35%, 50% 0%, 100% 35%, 70% 35%, 70% 100%)',
  'arrow-down': 'polygon(30% 0%, 30% 65%, 0% 65%, 50% 100%, 100% 65%, 70% 65%, 70% 0%)',
  plus: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)',
  'star-5': 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  'star-6': 'polygon(50% 0%, 65% 25%, 100% 25%, 75% 50%, 100% 75%, 65% 75%, 50% 100%, 35% 75%, 0% 75%, 25% 50%, 0% 25%, 35% 25%)',
};

export default function DecorationShapePreset(
  props: DecorationShapePresetProps,
): ReactNode {
  const fill = props.fill ?? { kind: 'solid' as const, color: defaultTokens.palette('accent') };
  const clip = PREVIEW_CLIP[props.preset];
  const isOval = props.preset === 'oval';
  const isRound = props.preset === 'rounded-rect';
  const borderCss = props.stroke
    ? `${props.stroke.widthPx}px solid ${colorToCss(props.stroke.color)}`
    : undefined;
  return (
    <div
      data-recipe-id="decoration.shape-preset"
      data-preset={props.preset}
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: fillToCss(fill),
        borderRadius: isOval ? '50%' : isRound ? 12 : 0,
        clipPath: clip,
        WebkitClipPath: clip,
        border: borderCss,
        boxSizing: 'border-box',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function decorationShapePresetToIR(
  props: DecorationShapePresetProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const fill: Fill = props.fill ?? { kind: 'solid', color: tokens.palette('accent') };
  const border: Border | undefined = props.stroke
    ? {
        width: props.stroke.widthPx,
        color: props.stroke.color,
        style: props.stroke.dashArray && props.stroke.dashArray.length > 0 ? 'dashed' : 'solid',
      }
    : undefined;

  const node: ShapeNode = {
    kind: 'shape',
    recipeId: 'decoration.shape-preset',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'decoration.shape-preset',
      axis: 'decoration',
      preset: props.preset,
    },
    shape: props.preset,
    borderRadiusPx: 0,
    fill,
    ...(border ? { border } : {}),
  };

  return {
    kind: 'group',
    recipeId: 'decoration.shape-preset',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'decoration.shape-preset',
      axis: 'decoration',
      preset: props.preset,
    },
    children: [node],
  };
}
