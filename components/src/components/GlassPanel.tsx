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
 * NOTE on the IR:
 *   ShapeNode currently exposes only a single `shadow` slot (not an array of
 *   `boxShadow` layers). The inset glow is therefore a dedicated transparent
 *   rect on top of children carrying one inset shadow. If the schema later
 *   gains `boxShadow: BoxShadow[]`, this can collapse onto the base.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  ShapeNode,
} from '../ir/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassPanelProps {
  bbox: Bbox;
  /** React children for HTML preview only. */
  children?: ReactNode;
  /** Caller-provided IR children pasted on top of the panel chrome. */
  childrenIR?: IRNode[];
  /** Base tint, default white@8%. */
  tint?: Color;
  /** Corner radius, default 24. */
  borderRadiusPx?: number;
  /** Rim highlight color, default white@20%. */
  rimColor?: Color;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_TINT: Color = { hex: '#ffffff', alpha: 0.08 };
const DEFAULT_RIM: Color = { hex: '#ffffff', alpha: 0.2 };
const DEFAULT_RADIUS = 24;
const HAIRLINE: Color = { hex: '#ffffff', alpha: 0.18 };
const RIM_BOTTOM: Color = { hex: '#ffffff', alpha: 0 };
const INSET_GLOW: Color = { hex: '#ffffff', alpha: 0.1 };

// ---------------------------------------------------------------------------
// React component (HTML preview)
// ---------------------------------------------------------------------------

export default function GlassPanel(props: GlassPanelProps): ReactNode {
  const radius = props.borderRadiusPx ?? DEFAULT_RADIUS;
  const tint = colorToCss(props.tint ?? DEFAULT_TINT);
  const rim = colorToCss(props.rimColor ?? DEFAULT_RIM);
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
        border: '1px solid rgba(255,255,255,0.18)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        boxShadow: `inset 0 1px 0 ${rim}, inset 0 0 18px rgba(255,255,255,0.1)`,
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
          background: `linear-gradient(180deg, ${rim}, rgba(255,255,255,0))`,
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

export function glassPanelToIR(props: GlassPanelProps): GroupNodeT {
  const { bbox } = props;
  const radius = props.borderRadiusPx ?? DEFAULT_RADIUS;
  const tint = props.tint ?? DEFAULT_TINT;
  const rimTop = props.rimColor ?? DEFAULT_RIM;

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
        { color: RIM_BOTTOM, position: 1 },
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
    border: { width: 1, color: HAIRLINE, style: 'solid' },
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
      color: INSET_GLOW,
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
