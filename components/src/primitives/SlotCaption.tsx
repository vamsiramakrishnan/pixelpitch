/**
 * <SlotCaption> — Tier-A primitive (`slot.caption`).
 *
 * Body / lede / footnote text slot. Picks the type-scale by `register`:
 *   - `'caption'` (default) — small dim text under big number
 *   - `'body'`              — paragraph body
 *   - `'lede'`              — large lede paragraph
 *
 * Composition (z-order bottom → top):
 *   - Single TextNode, `recipeId: 'slot.caption'`
 *
 * F1 deps: none.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type CaptionRegister = 'caption' | 'body' | 'lede';

export interface SlotCaptionProps {
  bbox: Bbox;
  text: string;
  /** Type register. Default `'caption'`. */
  register?: CaptionRegister;
  /** Text color. Default `tokens.palette('ink-3')` (caption / body) or `'ink-2'` (lede). */
  color?: Color;
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: ReactNode;
}

function defaultColor(register: CaptionRegister, tokens: TokensApi): Color {
  if (register === 'lede') return tokens.palette('ink-2');
  return tokens.palette('ink-3');
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SlotCaption(props: SlotCaptionProps): ReactNode {
  const t = defaultTokens;
  const reg = props.register ?? 'caption';
  const spec = t.type(reg);
  const color = colorToCss(props.color ?? defaultColor(reg, t));
  return (
    <div
      data-recipe-id="slot.caption"
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

export function slotCaptionToIR(
  props: SlotCaptionProps,
  tokens: TokensApi = defaultTokens,
): TextNode {
  const reg = props.register ?? 'caption';
  const spec = tokens.type(reg);
  const color = props.color ?? defaultColor(reg, tokens);
  return {
    kind: 'text',
    recipeId: 'slot.caption',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'slot.caption', axis: 'slot', register: reg },
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
