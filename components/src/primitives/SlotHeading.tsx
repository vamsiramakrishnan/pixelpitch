/**
 * <SlotHeading> — Tier-A primitive (`slot.heading`).
 *
 * Slide title slot at any scale. Defers all type sizing to the active
 * `tokens.type(scale)` entry — the scale prop is the only knob a Tier-B
 * recipe touches. Recipes pick a scale (`'display'`, `'hero'`,
 * `'section'`, `'slide-title'`, etc.) and the type system resolves the rest
 * (size × density multiplier, weight, leading, tracking, family).
 *
 * Composition (z-order bottom → top):
 *   - Single TextNode, `recipeId: 'slot.heading'`
 *
 * Optional `align` mirrors `Paragraph.align`. `color` defaults to
 * `tokens.palette('ink-1')`.
 *
 * F1 deps: none.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  TextNode,
} from '../ir/schema';
import {
  tokens as defaultTokens,
  type TokensApi,
  type TypeKey,
} from '../tokens';
import { colorToCss } from './_shared';

export type HeadingScale = Extract<
  TypeKey,
  'display-2xl' | 'display-xl' | 'display' | 'hero' | 'section' | 'slide-title' | 'sub'
>;

export interface SlotHeadingProps {
  bbox: Bbox;
  text: string;
  /** Type-scale key. Default `'slide-title'`. */
  scale?: HeadingScale;
  /** Text color. Default `tokens.palette('ink-1')`. */
  color?: Color;
  /** Paragraph alignment. Default `'left'`. */
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SlotHeading(props: SlotHeadingProps): ReactNode {
  const t = defaultTokens;
  const scale = props.scale ?? 'slide-title';
  const spec = t.type(scale);
  const color = colorToCss(props.color ?? t.palette('ink-1'));
  return (
    <div
      data-recipe-id="slot.heading"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        fontFamily: spec.family,
        fontSize: spec.sizePx,
        fontWeight: spec.weight,
        lineHeight: spec.leadingEm,
        letterSpacing: `${spec.trackingEm}em`,
        color,
        textAlign: props.align ?? 'left',
      }}
    >
      {props.text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function slotHeadingToIR(
  props: SlotHeadingProps,
  tokens: TokensApi = defaultTokens,
): TextNode {
  const scale = props.scale ?? 'slide-title';
  const spec = tokens.type(scale);
  const color = props.color ?? tokens.palette('ink-1');
  return {
    kind: 'text',
    recipeId: 'slot.heading',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'slot.heading', axis: 'slot', scale },
    paragraphs: [
      {
        runs: [
          {
            text: props.text,
            fontSizePx: spec.sizePx,
            fontWeight: spec.weight,
            fontFamily: spec.family,
            color,
            italic: false,
            underline: false,
          },
        ],
        align: props.align ?? 'left',
      },
    ],
  };
}
