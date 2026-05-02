/**
 * <SlotNumeral> — Tier-A primitive (`slot.numeral`).
 *
 * BigNumber-class display digit slot. Uses one of the `numeral-*` type
 * scales (`numeral-md` → 88px, `numeral-xl` → 168px, `numeral-2xl` →
 * 240px). When `gradient: true`, paints the digit fill via the active
 * `tokens.gradient(key)` stops on the underlying TextRun (text-on-gradient
 * is expressed as multiple TextRuns whose `color` carries the same hex —
 * the Python compiler maps this onto a `<a:gradFill>` per-run paint).
 *
 * Composition (z-order bottom → top):
 *   - Single TextNode, `recipeId: 'slot.numeral'`
 *
 * F1 deps: none. (Gradient text is a text-style mapping, not a path op.)
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  TextNode,
  TextRun,
} from '../ir/schema';
import {
  tokens as defaultTokens,
  type GradientKey,
  type TokensApi,
} from '../tokens';
import { colorToCss } from './_shared';

export type NumeralScale = 'numeral-md' | 'numeral-xl' | 'numeral-2xl';

export interface SlotNumeralProps {
  bbox: Bbox;
  /** The number / digit string. Treated as a single glyph run. Optional — defaults to ''. */
  value?: string;
  /** Synonym for `value` — atoms.yaml uses `digits`. Either resolves the same. */
  digits?: string;
  /** Numeric scale. Default `'numeral-md'`. */
  scale?: NumeralScale;
  /** Solid color when `gradient` is unset. Default `tokens.palette('ink-1')`. */
  color?: Color;
  /** When set, paint the digit with this gradient key. Mutually exclusive with `color`. */
  gradient?: GradientKey;
  align?: 'left' | 'center' | 'right' | 'justify';
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SlotNumeral(props: SlotNumeralProps): ReactNode {
  const t = defaultTokens;
  const scale = props.scale ?? 'numeral-md';
  const spec = t.type(scale);
  const value = props.value ?? props.digits ?? '';
  if (props.gradient) {
    const grad = t.gradient(props.gradient);
    const stops = grad.stops
      .map(s => `${colorToCss(s.color)} ${(s.position * 100).toFixed(1)}%`)
      .join(', ');
    return (
      <div
        data-recipe-id="slot.numeral"
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
          textAlign: props.align ?? 'left',
          background: `linear-gradient(${grad.angleDeg}deg, ${stops})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {value}
      </div>
    );
  }
  const color = colorToCss(props.color ?? t.palette('ink-1'));
  return (
    <div
      data-recipe-id="slot.numeral"
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
        textAlign: props.align ?? 'left',
        color,
      }}
    >
      {props.value}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function slotNumeralToIR(
  props: SlotNumeralProps,
  tokens: TokensApi = defaultTokens,
): TextNode {
  const scale = props.scale ?? 'numeral-md';
  const spec = tokens.type(scale);
  const value = props.value ?? props.digits ?? '';

  // gradient prop may be either:
  //   - a `GradientKey` string ('accent-grad'), the legitimate use, or
  //   - a `LinearGradient` object (token-resolved upstream, or supplied by
  //     atoms.yaml `gradient: tokens.gradient.accent-grad` — the matcher
  //     resolves the string to an object before calling).
  // We only call `tokens.gradient(...)` when it's a string key.
  const gradientKey = typeof props.gradient === 'string' ? props.gradient : undefined;
  const gradientFill = gradientKey ? tokens.gradient(gradientKey) : undefined;

  // Single run, fill metadata routes the gradient through Python compiler.
  const baseRun: TextRun = {
    text: value,
    fontSizePx: spec.sizePx,
    fontWeight: spec.weight,
    fontFamily: spec.family,
    color: gradientFill
      ? gradientFill.stops[0]?.color ?? tokens.palette('ink-1')
      : (props.color ?? tokens.palette('ink-1')),
    italic: false,
    underline: false,
  };

  const metadata: Record<string, unknown> = {
    role: 'slot.numeral',
    axis: 'slot',
    scale,
  };
  if (gradientKey) {
    metadata.gradientKey = gradientKey;
    metadata.gradientFill = gradientFill;
  }

  return {
    kind: 'text',
    recipeId: 'slot.numeral',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata,
    paragraphs: [{ runs: [baseRun], align: props.align ?? 'left' }],
  };
}
