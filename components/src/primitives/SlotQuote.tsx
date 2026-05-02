/**
 * <SlotQuote> — Tier-A primitive (`slot.quote`).
 *
 * Pullquote slot — renders the quoted text in a `lede`-class type with
 * optional decorative quotation mark and an attribution line below.
 *
 * Composition (z-order bottom → top):
 *   - `slot.quote.mark`         Optional TextNode (large opening glyph)
 *   - `slot.quote.body`         TextNode rendering the quote
 *   - `slot.quote.attribution`  Optional TextNode (caption-class) for source
 *
 * Layout: mark, body, and attribution stack vertically inside the bbox.
 *
 * F1 deps: none.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface SlotQuoteProps {
  bbox: Bbox;
  /** The quote body text. Optional — defaults to ''. */
  text?: string;
  /** Synonym for `text` — atoms.yaml uses `quote` for some recipes. */
  quote?: string;
  /** Attribution line, e.g. `'— Jane Doe, CEO'`. */
  attribution?: string;
  /** Render a large opening quote glyph. Default `false`. */
  withMark?: boolean;
  /** Color of the body text. Default `tokens.palette('ink-1')`. */
  color?: Color;
  /** Color of the attribution line. Default `tokens.palette('ink-3')`. */
  attributionColor?: Color;
  /** Color of the quote mark. Default `tokens.palette('accent', 0.6)`. */
  markColor?: Color;
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: ReactNode;
}

const MARK_HEIGHT_FRAC = 0.3;
const ATTR_HEIGHT = 32;

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SlotQuote(props: SlotQuoteProps): ReactNode {
  const t = defaultTokens;
  const lede = t.type('lede');
  const cap = t.type('caption');
  const color = colorToCss(props.color ?? t.palette('ink-1'));
  const attrColor = colorToCss(props.attributionColor ?? t.palette('ink-3'));
  const markColor = colorToCss(props.markColor ?? t.palette('accent', 0.6));
  const text = props.text ?? props.quote ?? '';
  return (
    <div
      data-recipe-id="slot.quote"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        textAlign: props.align ?? 'left',
      }}
    >
      {props.withMark && (
        <div
          data-recipe-id="slot.quote.mark"
          style={{
            fontFamily: lede.family,
            fontSize: lede.sizePx * 3,
            fontWeight: 700,
            color: markColor,
            lineHeight: 0.7,
          }}
        >
          {'“'}
        </div>
      )}
      <div
        data-recipe-id="slot.quote.body"
        style={{
          fontFamily: lede.family,
          fontSize: lede.sizePx,
          fontWeight: lede.weight,
          lineHeight: lede.leadingEm,
          color,
        }}
      >
        {text}
      </div>
      {props.attribution && (
        <div
          data-recipe-id="slot.quote.attribution"
          style={{
            fontFamily: cap.family,
            fontSize: cap.sizePx,
            fontWeight: cap.weight,
            color: attrColor,
          }}
        >
          {props.attribution}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function slotQuoteToIR(
  props: SlotQuoteProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const lede = tokens.type('lede');
  const cap = tokens.type('caption');
  const color = props.color ?? tokens.palette('ink-1');
  const attrColor = props.attributionColor ?? tokens.palette('ink-3');
  const markColor = props.markColor ?? tokens.palette('accent', 0.6);
  const align = props.align ?? 'left';
  const text = props.text ?? props.quote ?? '';

  const children: IRNode[] = [];
  let cursorY = props.bbox.y;
  let z = 0;

  if (props.withMark) {
    const markH = props.bbox.h * MARK_HEIGHT_FRAC;
    const mark: TextNode = {
      kind: 'text',
      recipeId: 'slot.quote.mark',
      bbox: { x: props.bbox.x, y: cursorY, w: props.bbox.w, h: markH },
      zOrder: z,
      metadata: { role: 'quote-mark' },
      paragraphs: [
        {
          runs: [
            {
              text: '“',
              fontSizePx: lede.sizePx * 3,
              fontWeight: 700,
              fontFamily: lede.family,
              color: markColor,
              italic: false,
              underline: false,
            },
          ],
          align,
        },
      ],
    };
    children.push(mark);
    cursorY += markH;
    z += 10;
  }

  const attrH = props.attribution ? ATTR_HEIGHT : 0;
  const bodyH = Math.max(0, props.bbox.y + props.bbox.h - cursorY - attrH);
  const body: TextNode = {
    kind: 'text',
    recipeId: 'slot.quote.body',
    bbox: { x: props.bbox.x, y: cursorY, w: props.bbox.w, h: bodyH },
    zOrder: z,
    metadata: { role: 'quote-body' },
    paragraphs: [
      {
        runs: [
          {
            text,
            fontSizePx: lede.sizePx,
            fontWeight: lede.weight,
            fontFamily: lede.family,
            color,
            italic: false,
            underline: false,
          },
        ],
        align,
      },
    ],
  };
  children.push(body);
  cursorY += bodyH;
  z += 10;

  if (props.attribution) {
    const attr: TextNode = {
      kind: 'text',
      recipeId: 'slot.quote.attribution',
      bbox: { x: props.bbox.x, y: cursorY, w: props.bbox.w, h: attrH },
      zOrder: z,
      metadata: { role: 'quote-attribution' },
      paragraphs: [
        {
          runs: [
            {
              text: props.attribution,
              fontSizePx: cap.sizePx,
              fontWeight: cap.weight,
              fontFamily: cap.family,
              color: attrColor,
              italic: false,
              underline: false,
            },
          ],
          align,
        },
      ],
    };
    children.push(attr);
  }

  return {
    kind: 'group',
    recipeId: 'slot.quote',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'slot.quote', axis: 'slot', withMark: !!props.withMark, hasAttribution: !!props.attribution },
    children,
  };
}
