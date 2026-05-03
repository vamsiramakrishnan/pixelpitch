/**
 * <SlotEyebrow> — Tier-A primitive (`slot.eyebrow`).
 *
 * Kicker / ruled-eyebrow slot. Renders an `eyebrow`-typescale text run; if
 * `withRule: true`, a 1-px hairline is laid out either before or after the
 * text (inline-rule style — used by `text.eyebrow-ruled`).
 *
 * Composition (z-order bottom → top):
 *   - `slot.eyebrow.rule`     Optional ShapeNode line (rect of height 1)
 *   - `slot.eyebrow.text`     TextNode at `tokens.type('eyebrow')`
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

export type EyebrowRulePosition = 'before' | 'after' | 'none';

export interface SlotEyebrowProps {
  bbox: Bbox;
  /** Eyebrow text. Optional — defaults to empty string. */
  text?: string;
  /** Text color. Default `tokens.palette('ink-3')`. */
  color?: Color;
  /** Rule color. Default `tokens.palette('ruler', 0.4)`. */
  ruleColor?: Color;
  /** Whether to draw a hairline rule and where. Default `'none'`. */
  withRule?: EyebrowRulePosition;
  /** Length of the rule, in px. Default 32. */
  ruleLengthPx?: number;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SlotEyebrow(props: SlotEyebrowProps): ReactNode {
  const t = defaultTokens;
  const spec = t.type('eyebrow');
  const color = colorToCss(props.color ?? t.palette('ink-3'));
  const ruleColor = colorToCss(props.ruleColor ?? t.palette('ruler', 0.4));
  const ruleLen = props.ruleLengthPx ?? 32;
  const rule = props.withRule ?? 'none';
  const textValue = props.text ?? '';
  return (
    <div
      data-recipe-id="slot.eyebrow"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: spec.family,
        fontSize: spec.sizePx,
        fontWeight: spec.weight,
        letterSpacing: `${spec.trackingEm}em`,
        color,
        textTransform: 'uppercase',
      }}
    >
      {rule === 'before' && (
        <span style={{ display: 'inline-block', width: ruleLen, height: 1, background: ruleColor }} />
      )}
      <span>{textValue}</span>
      {rule === 'after' && (
        <span style={{ display: 'inline-block', width: ruleLen, height: 1, background: ruleColor }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function slotEyebrowToIR(
  props: SlotEyebrowProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const spec = tokens.type('eyebrow');
  const color = props.color ?? tokens.palette('ink-3');
  const ruleColor = props.ruleColor ?? tokens.palette('ruler', 0.4);
  const ruleLen = props.ruleLengthPx ?? 32;
  const rulePos = props.withRule ?? 'none';
  const ruleGap = 12;
  const textValue = props.text ?? '';

  const children: IRNode[] = [];
  let textX = props.bbox.x;
  let textW = props.bbox.w;
  const midY = props.bbox.y + props.bbox.h / 2;

  if (rulePos === 'before') {
    const rule: ShapeNode = {
      kind: 'shape',
      recipeId: 'slot.eyebrow.rule',
      bbox: { x: props.bbox.x, y: midY - 0.5, w: ruleLen, h: 1 },
      zOrder: 0,
      metadata: { role: 'eyebrow-rule', position: 'before' },
      shape: 'rect',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: ruleColor },
    };
    children.push(rule);
    textX += ruleLen + ruleGap;
    textW -= ruleLen + ruleGap;
  }

  const text: TextNode = {
    kind: 'text',
    recipeId: 'slot.eyebrow.text',
    bbox: { x: textX, y: props.bbox.y, w: Math.max(0, textW), h: props.bbox.h },
    zOrder: 10,
    metadata: { role: 'eyebrow-text' },
    paragraphs: [
      {
        runs: [
          {
            text: textValue.toUpperCase(),
            fontSizePx: spec.sizePx,
            fontWeight: spec.weight,
            fontFamily: spec.family,
            color,
            italic: false,
            underline: false,
          },
        ],
        align: 'left',
      },
    ],
  };
  children.push(text);

  if (rulePos === 'after') {
    const rule: ShapeNode = {
      kind: 'shape',
      recipeId: 'slot.eyebrow.rule',
      bbox: { x: props.bbox.x + props.bbox.w - ruleLen, y: midY - 0.5, w: ruleLen, h: 1 },
      zOrder: 20,
      metadata: { role: 'eyebrow-rule', position: 'after' },
      shape: 'rect',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: ruleColor },
    };
    children.push(rule);
  }

  return {
    kind: 'group',
    recipeId: 'slot.eyebrow',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'slot.eyebrow', axis: 'slot', withRule: rulePos },
    children,
  };
}
