/**
 * <StatCardWithDepth> — a statistic card with layered visual depth.
 *
 * Composition (z-order bottom → top):
 *   1. Drop-shadow rect      (transparent fill carrying a soft outer shadow)
 *   2. Drop-shadow rect      (a second, tighter shadow layer for depth)
 *   3. Base card             (rounded-rect, solid bg, 1px white@10% border)
 *   4. Rim highlight         (top half, linear-gradient white@20% → transparent)
 *   5. Hairline              (1px outline-only rounded-rect, white@8%)
 *   6. Label text            (12px, white@65%, top-left)
 *   7. Value text            (56px bold, white)
 *   8. Optional delta pill   (rounded-rect tinted by `deltaColor`)
 *   9. Optional description  (14px, white@65%)
 *
 * NOTE on the IR:
 *   ShapeNode currently exposes only a single `shadow` slot (not an array of
 *   `boxShadow` layers). Multi-layer shadow stacks are therefore expressed as
 *   sibling ShapeNodes — one transparent rect per shadow layer. If/when the
 *   schema grows a `boxShadow: BoxShadow[]` field, the two `.shadow` siblings
 *   here can collapse into a single attached array on `.base`.
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeltaColor = 'up' | 'down' | 'neutral';

export interface StatCardWithDepthProps {
  bbox: Bbox;
  label: string;
  value: string;
  delta?: string;
  deltaColor?: DeltaColor;
  description?: string;
  bgColor?: Color;
  accentColor?: Color;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_BG: Color = '#1a1a2e';
const DEFAULT_ACCENT: Color = { hex: '#a78bfa', alpha: 0.45 };
const BORDER: Color = { hex: '#ffffff', alpha: 0.1 };
const HAIRLINE: Color = { hex: '#ffffff', alpha: 0.08 };
const RIM_TOP: Color = { hex: '#ffffff', alpha: 0.2 };
const RIM_BOTTOM: Color = { hex: '#ffffff', alpha: 0 };
const TEXT_DIM: Color = { hex: '#ffffff', alpha: 0.65 };
const TEXT_BRIGHT: Color = '#ffffff';
const SHADOW_OUTER: Color = { hex: '#000000', alpha: 0.55 };
const SHADOW_INNER: Color = { hex: '#000000', alpha: 0.35 };

const DELTA_TINT: Record<DeltaColor, { fg: Color; bg: Color }> = {
  up:      { fg: '#a7f3d0', bg: { hex: '#10b981', alpha: 0.18 } },
  down:    { fg: '#fecaca', bg: { hex: '#ef4444', alpha: 0.2 } },
  neutral: { fg: '#e4e4e7', bg: { hex: '#ffffff', alpha: 0.1 } },
};

const RADIUS = 18;
const PADDING = 24;

// ---------------------------------------------------------------------------
// React component (HTML preview)
// ---------------------------------------------------------------------------

export default function StatCardWithDepth(props: StatCardWithDepthProps): ReactNode {
  const bg = colorToCss(props.bgColor ?? DEFAULT_BG);
  const accent = colorToCss(props.accentColor ?? DEFAULT_ACCENT);
  const tint = props.deltaColor ?? 'up';
  const dt = DELTA_TINT[tint];
  return (
    <div
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        borderRadius: RADIUS,
        background: bg,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow:
          '0 24px 48px rgba(0,0,0,0.55), 0 8px 16px rgba(0,0,0,0.35), ' +
          `inset 0 1px 0 ${accent}`,
        padding: PADDING,
        boxSizing: 'border-box',
        color: '#ffffff',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0))',
          pointerEvents: 'none',
        }}
      />
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>
        {props.label}
      </div>
      <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.0 }}>{props.value}</div>
      {props.delta && (
        <div
          style={{
            display: 'inline-flex',
            marginTop: 12,
            padding: '4px 10px',
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 600,
            color: colorToCss(dt.fg),
            background: colorToCss(dt.bg),
          }}
        >
          {props.delta}
        </div>
      )}
      {props.description && (
        <div style={{ marginTop: 12, fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
          {props.description}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function statCardWithDepthToIR(props: StatCardWithDepthProps): GroupNodeT {
  const { bbox } = props;
  const tint = props.deltaColor ?? 'up';
  const dt = DELTA_TINT[tint];

  const children: IRNode[] = [];

  // 1. Outer drop shadow — a transparent rect carrying a soft 24/48 shadow.
  const shadowOuter: ShapeNode = {
    kind: 'shape',
    recipeId: 'statCardWithDepth.shadow',
    bbox: { ...bbox },
    zOrder: 0,
    metadata: { role: 'stat-card-shadow', layer: 'outer' },
    shape: 'rounded-rect',
    borderRadiusPx: RADIUS,
    fill: { kind: 'none' },
    shadow: {
      offsetX: 0,
      offsetY: 24,
      blur: 48,
      spread: 0,
      color: SHADOW_OUTER,
      inset: false,
    },
  };
  children.push(shadowOuter);

  // 1b. Tighter inner-depth drop shadow — second sibling for stacked feel.
  const shadowInner: ShapeNode = {
    kind: 'shape',
    recipeId: 'statCardWithDepth.shadow',
    bbox: { ...bbox },
    zOrder: 1,
    metadata: { role: 'stat-card-shadow', layer: 'tight' },
    shape: 'rounded-rect',
    borderRadiusPx: RADIUS,
    fill: { kind: 'none' },
    shadow: {
      offsetX: 0,
      offsetY: 8,
      blur: 16,
      spread: 0,
      color: SHADOW_INNER,
      inset: false,
    },
  };
  children.push(shadowInner);

  // 2. Base card — solid fill + 1px white@10% border.
  const base: ShapeNode = {
    kind: 'shape',
    recipeId: 'statCardWithDepth.base',
    bbox: { ...bbox },
    zOrder: 2,
    metadata: { role: 'stat-card-base' },
    shape: 'rounded-rect',
    borderRadiusPx: RADIUS,
    fill: { kind: 'solid', color: props.bgColor ?? DEFAULT_BG },
    border: { width: 1, color: BORDER, style: 'solid' },
  };
  children.push(base);

  // 3. Rim highlight — top half, linear-gradient white@20% → transparent.
  const accent = props.accentColor ?? DEFAULT_ACCENT;
  const rim: ShapeNode = {
    kind: 'shape',
    recipeId: 'statCardWithDepth.rim',
    bbox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h / 2 },
    zOrder: 3,
    metadata: { role: 'stat-card-rim', accent },
    shape: 'rounded-rect',
    borderRadiusPx: RADIUS,
    fill: {
      kind: 'linear-gradient',
      angleDeg: 180,
      stops: [
        { color: RIM_TOP, position: 0 },
        { color: accent, position: 0.6 },
        { color: RIM_BOTTOM, position: 1 },
      ],
    },
  };
  children.push(rim);

  // 4. Hairline — 1px outline-only rounded-rect at white@8%.
  const hairline: ShapeNode = {
    kind: 'shape',
    recipeId: 'statCardWithDepth.hairline',
    bbox: { ...bbox },
    zOrder: 4,
    metadata: { role: 'stat-card-hairline' },
    shape: 'rounded-rect',
    borderRadiusPx: RADIUS,
    fill: { kind: 'none' },
    border: { width: 1, color: HAIRLINE, style: 'solid' },
  };
  children.push(hairline);

  // 5. Label text.
  const labelHeight = 18;
  const label: TextNode = {
    kind: 'text',
    recipeId: 'statCardWithDepth.label',
    bbox: {
      x: bbox.x + PADDING,
      y: bbox.y + PADDING,
      w: bbox.w - PADDING * 2,
      h: labelHeight,
    },
    zOrder: 5,
    metadata: { role: 'stat-card-label' },
    paragraphs: [
      {
        runs: [
          {
            text: props.label,
            fontSizePx: 12,
            fontWeight: 500,
            color: TEXT_DIM,
            italic: false,
            underline: false,
          },
        ],
        align: 'left',
      },
    ],
  };
  children.push(label);

  // 6. Value text.
  const valueHeight = 64;
  const value: TextNode = {
    kind: 'text',
    recipeId: 'statCardWithDepth.value',
    bbox: {
      x: bbox.x + PADDING,
      y: bbox.y + PADDING + labelHeight + 8,
      w: bbox.w - PADDING * 2,
      h: valueHeight,
    },
    zOrder: 6,
    metadata: { role: 'stat-card-value' },
    paragraphs: [
      {
        runs: [
          {
            text: props.value,
            fontSizePx: 56,
            fontWeight: 700,
            color: TEXT_BRIGHT,
            italic: false,
            underline: false,
          },
        ],
        align: 'left',
      },
    ],
  };
  children.push(value);

  // 7. Optional delta pill (rounded-rect background + text on top).
  let cursorY = bbox.y + PADDING + labelHeight + 8 + valueHeight + 12;
  if (props.delta) {
    const pillH = 24;
    const pillW = Math.max(56, props.delta.length * 9 + 24);
    const deltaBg: ShapeNode = {
      kind: 'shape',
      recipeId: 'statCardWithDepth.delta',
      bbox: { x: bbox.x + PADDING, y: cursorY, w: pillW, h: pillH },
      zOrder: 7,
      metadata: { role: 'stat-card-delta-bg', tint },
      shape: 'rounded-rect',
      borderRadiusPx: 9999,
      fill: { kind: 'solid', color: dt.bg },
    };
    const deltaText: TextNode = {
      kind: 'text',
      recipeId: 'statCardWithDepth.delta',
      bbox: { x: bbox.x + PADDING + 12, y: cursorY, w: pillW - 24, h: pillH },
      zOrder: 8,
      metadata: { role: 'stat-card-delta-text', tint },
      paragraphs: [
        {
          runs: [
            {
              text: props.delta,
              fontSizePx: 12,
              fontWeight: 600,
              color: dt.fg,
              italic: false,
              underline: false,
            },
          ],
          align: 'left',
        },
      ],
    };
    children.push(deltaBg, deltaText);
    cursorY += pillH + 12;
  }

  // 8. Optional description text.
  if (props.description) {
    const desc: TextNode = {
      kind: 'text',
      recipeId: 'statCardWithDepth.desc',
      bbox: {
        x: bbox.x + PADDING,
        y: cursorY,
        w: bbox.w - PADDING * 2,
        h: bbox.y + bbox.h - cursorY - PADDING,
      },
      zOrder: 9,
      metadata: { role: 'stat-card-desc' },
      paragraphs: [
        {
          runs: [
            {
              text: props.description,
              fontSizePx: 14,
              fontWeight: 400,
              color: TEXT_DIM,
              italic: false,
              underline: false,
            },
          ],
          align: 'left',
        },
      ],
    };
    children.push(desc);
  }

  return {
    kind: 'group',
    recipeId: 'statCardWithDepth',
    bbox: { ...bbox },
    zOrder: 0,
    metadata: { role: 'stat-card-with-depth' },
    children,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function colorToCss(c: Color): string {
  if (typeof c === 'string') return c;
  if (c.alpha === undefined || c.alpha >= 0.999) return c.hex;
  const r = parseInt(c.hex.slice(1, 3), 16);
  const g = parseInt(c.hex.slice(3, 5), 16);
  const b = parseInt(c.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${c.alpha})`;
}
