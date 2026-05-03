/**
 * <GlassPanel> — frosted-glass container.
 *
 * Composition (z-order bottom → top):
 *   1. Base translucent rounded-rect (fill = `tint`, no border)
 *   2. Rim highlight (top 50%, linear-gradient white@20% → transparent)
 *   3. Hairline (1px outline, white@18%)
 *   4. ...caller-provided childrenIR pasted on top
 *   5. Inset glow rect (transparent fill, inset shadow white@10%, blur 18px)
 *
 * NOTE on the IR (Wave-2 / pre-F1 shadows):
 *   ShapeNode currently exposes only a single `shadow` slot (not an array of
 *   `boxShadow` layers). The inset glow is therefore a dedicated transparent
 *   rect on top of children carrying one inset shadow. Once F1's
 *   `shadows: BoxShadow[]` array lands, a follow-up cleanup PR can collapse
 *   this onto the base.
 *
 * Wave-2 / Crew F2: now token-aware. All defaults flow through tokens with
 * explicit alphas for v0.1 visual parity:
 *   - tint default     -> `tokens.palette('ghost',   0.08)` (white @ 8%)
 *   - rim default      -> `tokens.palette('ruler',   0.2)`  (white @ 20%)
 *   - hairline         -> `tokens.palette('ruler',   0.18)` (white @ 18%)
 *   - rim bottom       -> `tokens.palette('ruler',   0)`    (transparent)
 *   - inset glow       -> `tokens.palette('divider', 0.1)`  (white @ 10%)
 *   - default radius   -> `tokens.radius('bento')`          (24)
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassPanelProps {
  bbox: Bbox;
  /** React children for HTML preview only. */
  children?: ReactNode;
  /** Caller-provided IR children pasted on top of the panel chrome. */
  childrenIR?: IRNode[];
  /** Base tint, default `tokens.palette('ghost', 0.08)`. */
  tint?: Color;
  /** Corner radius, default `tokens.radius('bento')` (24). */
  borderRadiusPx?: number;
  /** Rim highlight color, default `tokens.palette('ruler', 0.2)`. */
  rimColor?: Color;
}

// ---------------------------------------------------------------------------
// React component (HTML preview)
// ---------------------------------------------------------------------------

export default function GlassPanel(props: GlassPanelProps): ReactNode {
  const t = defaultTokens;
  const radius = props.borderRadiusPx ?? t.radius('bento');
  const tint = colorToCss(props.tint ?? t.palette('ghost', 0.08));
  const rim = colorToCss(props.rimColor ?? t.palette('ruler', 0.2));
  const hairline = colorToCss(t.palette('ruler', 0.18));
  const insetGlow = colorToCss(t.palette('divider', 0.1));
  return (
    <div
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        borderRadius: radius,
        background: tint,
        border: `1px solid ${hairline}`,
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        boxShadow: `inset 0 1px 0 ${rim}, inset 0 0 18px ${insetGlow}`,
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
          background: `linear-gradient(180deg, ${rim}, ${colorToCss(t.palette('ruler', 0))})`,
          pointerEvents: 'none',
        }}
      />
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

/**
 * IR emitter. `tokens` defaults to vercel-dark for backward compatibility.
 */
export function glassPanelToIR(
  props: GlassPanelProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const { bbox } = props;
  const radius = props.borderRadiusPx ?? tokens.radius('bento');
  const tint = props.tint ?? tokens.palette('ghost', 0.08);
  const rimTop = props.rimColor ?? tokens.palette('ruler', 0.2);
  const rimBottom = tokens.palette('ruler', 0);
  const hairlineColor = tokens.palette('ruler', 0.18);
  const insetGlowColor = tokens.palette('divider', 0.1);

  const children: IRNode[] = [];

  // 1. Base translucent rounded-rect.
  const base: ShapeNode = {
    kind: 'shape',
    recipeId: 'glassPanel.base',
    bbox: { ...bbox },
    zOrder: 0,
    metadata: { role: 'glass-panel-base' },
    shape: 'rounded-rect',
    borderRadiusPx: radius,
    fill: { kind: 'solid', color: tint },
  };
  children.push(base);

  // 2. Rim highlight — top 50%, linear-gradient white@20% → transparent.
  const rim: ShapeNode = {
    kind: 'shape',
    recipeId: 'glassPanel.rim',
    bbox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h / 2 },
    zOrder: 1,
    metadata: { role: 'glass-panel-rim' },
    shape: 'rounded-rect',
    borderRadiusPx: radius,
    fill: {
      kind: 'linear-gradient',
      angleDeg: 180,
      stops: [
        { color: rimTop, position: 0 },
        { color: rimBottom, position: 1 },
      ],
    },
  };
  children.push(rim);

  // 3. Hairline — 1px outline, white@18%.
  const hairline: ShapeNode = {
    kind: 'shape',
    recipeId: 'glassPanel.hairline',
    bbox: { ...bbox },
    zOrder: 2,
    metadata: { role: 'glass-panel-hairline' },
    shape: 'rounded-rect',
    borderRadiusPx: radius,
    fill: { kind: 'none' },
    border: { width: 1, color: hairlineColor, style: 'solid' },
  };
  children.push(hairline);

  // 4. Caller-provided child IR nodes — pasted on top, z-stacked above chrome.
  let zCursor = 3;
  for (const child of props.childrenIR ?? []) {
    children.push({ ...child, zOrder: zCursor });
    zCursor += 1;
  }

  // 5. Inset glow rect — transparent fill, inset shadow on top.
  const insetGlow: ShapeNode = {
    kind: 'shape',
    recipeId: 'glassPanel.insetGlow',
    bbox: { ...bbox },
    zOrder: zCursor,
    metadata: { role: 'glass-panel-inset-glow' },
    shape: 'rounded-rect',
    borderRadiusPx: radius,
    fill: { kind: 'none' },
    shadow: {
      offsetX: 0,
      offsetY: 0,
      blur: 18,
      spread: 0,
      color: insetGlowColor,
      inset: true,
    },
  };
  children.push(insetGlow);

  return {
    kind: 'group',
    recipeId: 'glassPanel',
    bbox: { ...bbox },
    zOrder: 0,
    metadata: { role: 'glass-panel' },
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
