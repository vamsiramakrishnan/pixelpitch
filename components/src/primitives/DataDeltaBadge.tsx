/**
 * <DataDeltaBadge> — Tier-A primitive (`data.delta-badge`).
 *
 * A small inline pill showing a tone-coded delta value (▲ +29.4%,
 * ▼ -3.2%, ⏵ flat). Tone defaults route through the success/danger/neutral
 * palette tokens. Backs `data.delta-badge`.
 *
 * Composition (z-order bottom → top):
 *   - `data.delta-badge.bg`     ShapeNode (rounded-rect / pill) tinted by tone
 *   - `data.delta-badge.label`  TextNode with arrow glyph + value
 *
 * F1 deps: none (rect + text).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  ShapeNode,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type DeltaDirection = 'up' | 'down' | 'flat';
export type DeltaSize = 'sm' | 'md';
export type DeltaTone = 'success' | 'danger' | 'neutral';

export interface DataDeltaBadgeProps {
  bbox: Bbox;
  /** Display value, e.g. '+29.4%'. */
  value: string;
  /** Direction glyph. Default `'up'`. */
  direction?: DeltaDirection;
  /** Size tier. Default `'md'`. */
  size?: DeltaSize;
  /** Override the auto-mapped tone (up=success, down=danger, flat=neutral). */
  tone?: DeltaTone;
}

const ARROW: Record<DeltaDirection, string> = {
  up: '▲',
  down: '▼',
  flat: '◆',
};

const SIZE_PX: Record<DeltaSize, { fontSize: number; padX: number; padY: number; radius: number }> = {
  sm: { fontSize: 11, padX: 8,  padY: 3, radius: 9999 },
  md: { fontSize: 13, padX: 10, padY: 4, radius: 9999 },
};

function defaultTone(direction: DeltaDirection): DeltaTone {
  if (direction === 'up') return 'success';
  if (direction === 'down') return 'danger';
  return 'neutral';
}

function tonePalette(tokens: TokensApi, tone: DeltaTone): { bg: Color; fg: Color } {
  if (tone === 'success') {
    return { bg: tokens.palette('success', 0.18), fg: tokens.palette('success') };
  }
  if (tone === 'danger') {
    return { bg: tokens.palette('danger', 0.18), fg: tokens.palette('danger') };
  }
  return { bg: tokens.palette('ink-3', 0.16), fg: tokens.palette('ink-2') };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DataDeltaBadge(props: DataDeltaBadgeProps): ReactNode {
  const t = defaultTokens;
  const direction = props.direction ?? 'up';
  const size = props.size ?? 'md';
  const tone = props.tone ?? defaultTone(direction);
  const palette = tonePalette(t, tone);
  const sz = SIZE_PX[size];
  return (
    <div
      data-recipe-id="data.delta-badge"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: `${sz.padY}px ${sz.padX}px`,
        background: colorToCss(palette.bg),
        color: colorToCss(palette.fg),
        borderRadius: sz.radius,
        fontSize: sz.fontSize,
        fontWeight: 600,
        boxSizing: 'border-box',
      }}
    >
      <span aria-hidden="true">{ARROW[direction]}</span>
      <span>{props.value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataDeltaBadgeToIR(
  props: DataDeltaBadgeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const direction = props.direction ?? 'up';
  const size = props.size ?? 'md';
  const tone = props.tone ?? defaultTone(direction);
  const palette = tonePalette(tokens, tone);
  const sz = SIZE_PX[size];
  const text = `${ARROW[direction]} ${props.value}`;

  const bg: ShapeNode = {
    kind: 'shape',
    recipeId: 'data.delta-badge.bg',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'delta-badge-bg', tone },
    shape: 'rounded-rect',
    borderRadiusPx: sz.radius,
    fill: { kind: 'solid', color: palette.bg },
  };

  const label: TextNode = {
    kind: 'text',
    recipeId: 'data.delta-badge.label',
    bbox: { ...props.bbox },
    zOrder: 10,
    metadata: { role: 'delta-badge-label', direction, value: props.value },
    paragraphs: [
      {
        runs: [
          {
            text,
            fontSizePx: sz.fontSize,
            fontWeight: 600,
            fontFamily: tokens.fonts.sans,
            color: palette.fg,
            italic: false,
            underline: false,
          },
        ],
        align: 'center',
      },
    ],
  };

  return {
    kind: 'group',
    recipeId: 'data.delta-badge',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.delta-badge',
      axis: 'data',
      direction,
      size,
      tone,
      value: props.value,
    },
    children: [bg, label],
  };
}
