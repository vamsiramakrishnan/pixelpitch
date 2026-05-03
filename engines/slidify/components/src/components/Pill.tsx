/**
 * <Pill> — rounded-full status badge with optional dot prefix.
 * Emits as a Group: a rounded-rect shape behind a small text node.
 *
 * Wave-2 / Crew F2: now token-aware.
 *   - Background defaults to `tokens.palette('ghost', 0.06)` (white@6%; matches
 *     the v0.1 baseline alpha exactly while letting themes flip the hex).
 *   - Border defaults to `tokens.palette('divider', 0.12)` (white@12%).
 *   - Text size/weight come from `tokens.type('caption')` (13px / 500).
 *   - Text color stays `#e4e4e7` raw — no exact palette match in the
 *     default vercel-dark bundle (closest are `ink-1: #f5f5f7` and
 *     `ink-2: #d4d4d8`).
 */

import type { Bbox, Color, GroupNodeT, ShapeNode, TextNode } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

export interface PillProps {
  children: string;
  color?: Color;          // text color
  bgColor?: Color;        // pill background
  borderColor?: Color;
  dotColor?: Color;       // optional leading status-dot
  bbox?: Bbox;
}

// Historical text color for pills; lives outside the palette table because
// no token currently matches this shade.
const PILL_TEXT_FALLBACK: Color = '#e4e4e7';

export default function Pill(props: PillProps) {
  const t = defaultTokens;
  const ty = t.type('caption');
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: t.space(8),
        padding: `${t.space(8)}px ${t.space(14)}px`,
        borderRadius: t.radius('pill'),
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        fontSize: ty.sizePx,
        fontFamily: ty.family,
        color:
          typeof PILL_TEXT_FALLBACK === 'string'
            ? PILL_TEXT_FALLBACK
            : PILL_TEXT_FALLBACK.hex,
        fontWeight: ty.weight,
      }}
    >
      {props.dotColor && (
        <span
          style={{
            width: t.space(8),
            height: t.space(8),
            borderRadius: t.radius('pill'),
            background: typeof props.dotColor === 'string' ? props.dotColor : props.dotColor.hex,
          }}
        />
      )}
      {props.children}
    </span>
  );
}

/**
 * IR emitter. `tokens` defaults to vercel-dark for backward compatibility.
 */
export function pillToIR(
  props: PillProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const bbox = props.bbox ?? { x: 0, y: 0, w: 160, h: 32 };
  const ty = tokens.type('caption');

  // Defaults via tokens; explicit alphas preserve the v0.1 baseline.
  const bgDefault = tokens.palette('ghost', 0.06);
  const borderDefault = tokens.palette('divider', 0.12);

  const bg: ShapeNode = {
    kind: 'shape',
    recipeId: 'pill.bg',
    bbox,
    zOrder: 0,
    metadata: { role: 'pill-bg' },
    shape: 'rounded-rect',
    borderRadiusPx: tokens.radius('pill'),
    fill: { kind: 'solid', color: props.bgColor ?? bgDefault },
    border: {
      width: 1,
      color: props.borderColor ?? borderDefault,
      style: 'solid',
    },
  };

  const children: GroupNodeT['children'] = [bg];
  let textX = bbox.x + 14;
  if (props.dotColor) {
    children.push({
      kind: 'shape',
      recipeId: 'pill.dot',
      bbox: { x: bbox.x + 12, y: bbox.y + bbox.h / 2 - 4, w: 8, h: 8 },
      zOrder: 1,
      metadata: { role: 'pill-dot' },
      shape: 'oval',
      borderRadiusPx: tokens.radius('pill'),
      fill: { kind: 'solid', color: props.dotColor },
    });
    textX += 18;
  }
  const text: TextNode = {
    kind: 'text',
    recipeId: 'pill.text',
    bbox: {
      x: textX,
      y: bbox.y,
      w: bbox.x + bbox.w - textX - 14,
      h: bbox.h,
    },
    zOrder: 2,
    metadata: { role: 'pill-text' },
    paragraphs: [
      {
        runs: [{
          text: props.children,
          fontSizePx: ty.sizePx,
          fontWeight: ty.weight,
          color: props.color ?? PILL_TEXT_FALLBACK,
          italic: false,
          underline: false,
        }],
        align: 'left',
      },
    ],
  };
  children.push(text);

  return {
    kind: 'group',
    recipeId: 'pill',
    bbox,
    zOrder: 0,
    metadata: { role: 'pill' },
    children,
  };
}
