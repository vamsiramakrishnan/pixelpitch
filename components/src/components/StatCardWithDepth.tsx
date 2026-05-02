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
 * NOTE on the IR (Wave-2 / pre-F1 shadows):
 *   ShapeNode currently exposes only a single `shadow` slot (not an array of
 *   `boxShadow` layers). Multi-layer shadow stacks are therefore expressed as
 *   sibling ShapeNodes — one transparent rect per shadow layer. When F1's
 *   `shadows: BoxShadow[]` array lands and the post-F1+F2 cleanup PR runs,
 *   the two `.shadow` siblings here can collapse onto `.base`. F2 leaves them
 *   intact per CONTRACT coordination notes.
 *
 * Wave-2 / Crew F2: now token-aware. Where the palette doesn't carry an
 * exact match, the historical literal is kept inline and noted below.
 *   - `DEFAULT_BG = '#1a1a2e'`        — no palette match (sits between
 *     `surface-3 #16162a` and `surface-4 #1f1f3a`).
 *   - `DELTA_TINT.up.fg = '#a7f3d0'`  — emerald-200; no palette match.
 *   - `DELTA_TINT.down.fg = '#fecaca'`— red-200; no palette match.
 *   - `DELTA_TINT.neutral.fg = '#e4e4e7'` — no palette match.
 *   - `TEXT_BRIGHT = '#ffffff'`       — kept as a primitive string for
 *     snapshot parity (the equivalent palette call would emit a `{hex,
 *     alpha:1}` object which differs structurally even though it renders
 *     the same).
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
// Static (non-token-derivable) constants
// ---------------------------------------------------------------------------

/** Bg fallback that lives outside the palette table. */
const DEFAULT_BG: Color = '#1a1a2e';
/** Card-bright white. Kept as a primitive string for snapshot parity. */
const TEXT_BRIGHT: Color = '#ffffff';
/** Emerald-200 — used as the "up" delta foreground. No palette token. */
const DELTA_FG_UP: Color = '#a7f3d0';
/** Red-200 — used as the "down" delta foreground. No palette token. */
const DELTA_FG_DOWN: Color = '#fecaca';
/** Neutral delta foreground. No palette token. */
const DELTA_FG_NEUTRAL: Color = '#e4e4e7';

const RADIUS = 18;
const PADDING = 24;

// ---------------------------------------------------------------------------
// Token-derived defaults — synthesized inside the helpers so a non-default
// `tokens` arg can override them.
// ---------------------------------------------------------------------------

interface ResolvedDefaults {
  accent: Color;
  border: Color;
  hairline: Color;
  rimTop: Color;
  rimBottom: Color;
  textDim: Color;
  shadowOuter: Color;
  shadowInner: Color;
  deltaTint: Record<DeltaColor, { fg: Color; bg: Color }>;
}

function resolveDefaults(tokens: TokensApi): ResolvedDefaults {
  return {
    accent:       tokens.palette('accent', 0.45),
    border:       tokens.palette('divider', 0.1),
    hairline:     tokens.palette('divider', 0.08),
    rimTop:       tokens.palette('ruler', 0.2),
    rimBottom:    tokens.palette('ruler', 0),
    textDim:      tokens.palette('ruler', 0.65),
    shadowOuter:  tokens.palette('surface-scrim', 0.55),
    shadowInner:  tokens.palette('surface-scrim', 0.35),
    deltaTint: {
      up:      { fg: DELTA_FG_UP,      bg: tokens.palette('success', 0.18) },
      down:    { fg: DELTA_FG_DOWN,    bg: tokens.palette('danger', 0.2) },
      neutral: { fg: DELTA_FG_NEUTRAL, bg: tokens.palette('divider', 0.1) },
    },
  };
}

// ---------------------------------------------------------------------------
// React component (HTML preview)
// ---------------------------------------------------------------------------

export default function StatCardWithDepth(props: StatCardWithDepthProps): ReactNode {
  const t = defaultTokens;
  const d = resolveDefaults(t);
  const bg = colorToCss(props.bgColor ?? DEFAULT_BG);
  const accent = colorToCss(props.accentColor ?? d.accent);
  const tint = props.deltaColor ?? 'up';
  const dt = d.deltaTint[tint];
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
        border: `1px solid ${colorToCss(d.border)}`,
        boxShadow:
          `0 24px 48px ${colorToCss(d.shadowOuter)}, ` +
          `0 8px 16px ${colorToCss(d.shadowInner)}, ` +
          `inset 0 1px 0 ${accent}`,
        padding: PADDING,
        boxSizing: 'border-box',
        color: colorToCss(TEXT_BRIGHT),
        fontFamily: t.fonts.sans,
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
          background: `linear-gradient(180deg, ${colorToCss(d.rimTop)}, ${colorToCss(d.rimBottom)})`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ fontSize: 12, color: colorToCss(d.textDim), marginBottom: 8 }}>
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
        <div style={{ marginTop: 12, fontSize: 14, color: colorToCss(d.textDim) }}>
          {props.description}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

/**
 * IR emitter. `tokens` defaults to vercel-dark for backward compatibility.
 */
export function statCardWithDepthToIR(
  props: StatCardWithDepthProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const { bbox } = props;
  const d = resolveDefaults(tokens);
  const tint = props.deltaColor ?? 'up';
  const dt = d.deltaTint[tint];

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
      color: d.shadowOuter,
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
      color: d.shadowInner,
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
    border: { width: 1, color: d.border, style: 'solid' },
  };
  children.push(base);

  // 3. Rim highlight — top half, linear-gradient white@20% → accent → transparent.
  const accent = props.accentColor ?? d.accent;
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
        { color: d.rimTop, position: 0 },
        { color: accent, position: 0.6 },
        { color: d.rimBottom, position: 1 },
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
    border: { width: 1, color: d.hairline, style: 'solid' },
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
            color: d.textDim,
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
              color: d.textDim,
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
