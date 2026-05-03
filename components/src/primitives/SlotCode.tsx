/**
 * <SlotCode> — Tier-A primitive (`slot.code`).
 *
 * Code block slot — mono-typescale text on a tinted rounded-rect background,
 * with an optional language pill in the top-right corner.
 *
 * Composition (z-order bottom → top):
 *   - `slot.code.bg`         ShapeNode rounded-rect (tinted surface)
 *   - `slot.code.body`       TextNode in `tokens.type('mono')`
 *   - `slot.code.lang-pill`  Optional ShapeNode rounded-rect + TextNode
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
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface SlotCodeProps {
  bbox: Bbox;
  /** Code text. Newlines preserved. Optional — defaults to ''. */
  code?: string;
  /** Optional language label, e.g. `'typescript'`. */
  language?: string;
  /** Background tint. Default `tokens.palette('surface-2')`. */
  bgColor?: Color;
  /** Code text color. Default `tokens.palette('ink-2')`. */
  color?: Color;
  /** Inner padding. Default `tokens.slot('pad-card')`. */
  paddingPx?: number;
  children?: ReactNode;
}

const PILL_W = 92;
const PILL_H = 22;
const PILL_INSET = 12;

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SlotCode(props: SlotCodeProps): ReactNode {
  const t = defaultTokens;
  const mono = t.type('mono');
  const micro = t.type('micro');
  const bg = colorToCss(props.bgColor ?? t.palette('surface-2'));
  const code = colorToCss(props.color ?? t.palette('ink-2'));
  const pillBg = colorToCss(t.palette('surface-3'));
  const pillFg = colorToCss(t.palette('ink-3'));
  const pad = props.paddingPx ?? t.slot('pad-card');
  return (
    <div
      data-recipe-id="slot.code"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: bg,
        borderRadius: t.radius('card'),
        padding: pad,
        boxSizing: 'border-box',
        fontFamily: mono.family,
        fontSize: mono.sizePx,
        lineHeight: mono.leadingEm,
        color: code,
        whiteSpace: 'pre',
        overflow: 'hidden',
      }}
    >
      {props.code ?? ''}
      {props.language && (
        <div
          data-recipe-id="slot.code.lang-pill"
          style={{
            position: 'absolute',
            right: PILL_INSET,
            top: PILL_INSET,
            width: PILL_W,
            height: PILL_H,
            background: pillBg,
            borderRadius: 9999,
            color: pillFg,
            fontFamily: micro.family,
            fontSize: micro.sizePx,
            fontWeight: micro.weight,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: `${micro.trackingEm}em`,
            textTransform: 'uppercase',
          }}
        >
          {props.language}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function slotCodeToIR(
  props: SlotCodeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const mono = tokens.type('mono');
  const micro = tokens.type('micro');
  const bgColor = props.bgColor ?? tokens.palette('surface-2');
  const color = props.color ?? tokens.palette('ink-2');
  const pad = props.paddingPx ?? tokens.slot('pad-card');
  const radius = tokens.radius('card');

  const bg: ShapeNode = {
    kind: 'shape',
    recipeId: 'slot.code.bg',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'code-bg' },
    shape: 'rounded-rect',
    borderRadiusPx: radius,
    fill: { kind: 'solid', color: bgColor },
  };

  const body: TextNode = {
    kind: 'text',
    recipeId: 'slot.code.body',
    bbox: {
      x: props.bbox.x + pad,
      y: props.bbox.y + pad,
      w: Math.max(0, props.bbox.w - pad * 2),
      h: Math.max(0, props.bbox.h - pad * 2),
    },
    zOrder: 10,
    metadata: { role: 'code-body', preserveWhitespace: true },
    paragraphs: [
      {
        runs: [
          {
            text: props.code ?? '',
            fontSizePx: mono.sizePx,
            fontWeight: mono.weight,
            fontFamily: mono.family,
            color,
            italic: false,
            underline: false,
          },
        ],
        align: 'left',
      },
    ],
  };

  const children: IRNode[] = [bg, body];

  if (props.language) {
    const pillX = props.bbox.x + props.bbox.w - PILL_INSET - PILL_W;
    const pillY = props.bbox.y + PILL_INSET;
    const pillBg: ShapeNode = {
      kind: 'shape',
      recipeId: 'slot.code.lang-pill',
      bbox: { x: pillX, y: pillY, w: PILL_W, h: PILL_H },
      zOrder: 20,
      metadata: { role: 'code-lang-pill-bg' },
      shape: 'rounded-rect',
      borderRadiusPx: 9999,
      fill: { kind: 'solid', color: tokens.palette('surface-3') },
    };
    const pillText: TextNode = {
      kind: 'text',
      recipeId: 'slot.code.lang-pill',
      bbox: { x: pillX, y: pillY, w: PILL_W, h: PILL_H },
      zOrder: 30,
      metadata: { role: 'code-lang-pill-text', language: props.language },
      paragraphs: [
        {
          runs: [
            {
              text: props.language.toUpperCase(),
              fontSizePx: micro.sizePx,
              fontWeight: micro.weight,
              fontFamily: micro.family,
              color: tokens.palette('ink-3'),
              italic: false,
              underline: false,
            },
          ],
          align: 'center',
        },
      ],
    };
    children.push(pillBg, pillText);
  }

  return {
    kind: 'group',
    recipeId: 'slot.code',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'slot.code', axis: 'slot', language: props.language ?? null },
    children,
  };
}
