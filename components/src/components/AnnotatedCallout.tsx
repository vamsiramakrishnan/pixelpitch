/**
 * <AnnotatedCallout> — annotation balloon with a pointer arrow + body card.
 *
 * Composition (z-order bottom → top):
 *   1. Pointer arrow         (see NOTE — currently a small rounded-rect)
 *   2. Body card             (rounded-rect 12px, solid `bgColor`)
 *   3. Label kicker          (11px, weight 700, `textColor` @ alpha 0.6, UPPERCASE)
 *   4. Body text             (16px, `textColor`)
 *
 * NOTE on the IR (Wave-2 / pre-F1 shapes):
 *   Pre-F1 the `ShapeNode.shape` enum was `'rect' | 'rounded-rect' | 'oval' |
 *   'line'` — no `'triangle'`. Until F1's expanded enum lands, the pointer is
 *   rendered as a short, narrow rounded-rect protruding from `pointerSide`.
 *   This produces a small visual "tab" rather than a true arrow; the Python
 *   compiler can later upgrade by keying off `recipeId ===
 *   'annotatedCallout.pointer'` and the `metadata.pointerSide` field.
 *
 * Wave-2 / Crew F2: now token-aware.
 *   - Default body color stays `'#fbbf24'` (amber-400) — no palette match.
 *   - Default text color resolves to `tokens.palette('ink-inverse')` (which
 *     equals the historical `'#0a0a0f'` in vercel-dark).
 *   - Body text size pulled from `tokens.type('body')` (16px).
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

export type PointerSide = 'top' | 'right' | 'bottom' | 'left';

export interface AnnotatedCalloutProps {
  /** bbox of the callout body (NOT including the pointer). */
  bbox: Bbox;
  /** Small kicker label, e.g. "INSIGHT". */
  label?: string;
  /** Main body text. */
  body: string;
  /** Side the pointer protrudes from. Default 'left'. */
  pointerSide?: PointerSide;
  /** Position along the pointer side (0..1), default 0.5. */
  pointerOffsetPct?: number;
  /** Pointer length in pixels, default 28. */
  pointerLengthPx?: number;
  /** Body card background, default '#fbbf24' (amber-400 — outside the palette). */
  bgColor?: Color;
  /** Body / label text color, default `tokens.palette('ink-inverse')`. */
  textColor?: Color;
}

// ---------------------------------------------------------------------------
// Defaults / static constants (non-token-derivable)
// ---------------------------------------------------------------------------

/** Amber-400 default; no palette token in the default vercel-dark bundle. */
const DEFAULT_BG: Color = '#fbbf24';
const RADIUS = 12;
const PADDING = 18;
const POINTER_THICKNESS = 12; // narrow side of the pointer
const LABEL_PX = 11;
const LABEL_TRACKING_EM = 0.18; // letter-spacing approximation

// ---------------------------------------------------------------------------
// React component (HTML preview)
// ---------------------------------------------------------------------------

export default function AnnotatedCallout(props: AnnotatedCalloutProps): ReactNode {
  const t = defaultTokens;
  const ty = t.type('body');
  const side = props.pointerSide ?? 'left';
  const len = props.pointerLengthPx ?? 28;
  const offset = clamp01(props.pointerOffsetPct ?? 0.5);
  const fgDefault = t.palette('ink-inverse');
  const bg = colorToCss(props.bgColor ?? DEFAULT_BG);
  const fg = colorToCss(props.textColor ?? fgDefault);
  const pointer = pointerStyle(side, len, offset, bg, props.bbox);
  return (
    <div
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: bg,
          borderRadius: RADIUS,
          padding: PADDING,
          boxSizing: 'border-box',
          color: fg,
          fontFamily: ty.family,
        }}
      >
        {props.label && (
          <div
            style={{
              fontSize: LABEL_PX,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: `${LABEL_TRACKING_EM}em`,
              color: withAlpha(props.textColor ?? fgDefault, 0.6),
              marginBottom: 6,
            }}
          >
            {props.label}
          </div>
        )}
        <div style={{ fontSize: ty.sizePx, lineHeight: 1.4 }}>{props.body}</div>
      </div>
      <div style={pointer} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

/**
 * IR emitter. `tokens` defaults to vercel-dark for backward compatibility.
 */
export function annotatedCalloutToIR(
  props: AnnotatedCalloutProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const { bbox } = props;
  const ty = tokens.type('body');
  const side = props.pointerSide ?? 'left';
  const len = props.pointerLengthPx ?? 28;
  const offset = clamp01(props.pointerOffsetPct ?? 0.5);
  const bg = props.bgColor ?? DEFAULT_BG;
  const fg = props.textColor ?? tokens.palette('ink-inverse');

  const children: IRNode[] = [];

  // 1. Pointer — narrow rounded-rect protruding from `side`.
  // TODO: replace with shape: 'triangle' once F1's expanded enum lands.
  const pointerBbox = pointerBboxFor(side, len, offset, bbox);
  const pointer: ShapeNode = {
    kind: 'shape',
    recipeId: 'annotatedCallout.pointer',
    bbox: pointerBbox,
    zOrder: 0,
    metadata: { role: 'callout-pointer', pointerSide: side, pointerOffsetPct: offset },
    shape: 'rounded-rect',
    borderRadiusPx: 2,
    fill: { kind: 'solid', color: bg },
  };
  children.push(pointer);

  // 2. Body card.
  const card: ShapeNode = {
    kind: 'shape',
    recipeId: 'annotatedCallout.body',
    bbox: { ...bbox },
    zOrder: 1,
    metadata: { role: 'callout-body' },
    shape: 'rounded-rect',
    borderRadiusPx: RADIUS,
    fill: { kind: 'solid', color: bg },
  };
  children.push(card);

  // 3. Label kicker (optional).
  let textY = bbox.y + PADDING;
  if (props.label) {
    const labelHeight = 16;
    const label: TextNode = {
      kind: 'text',
      recipeId: 'annotatedCallout.label',
      bbox: {
        x: bbox.x + PADDING,
        y: textY,
        w: bbox.w - PADDING * 2,
        h: labelHeight,
      },
      zOrder: 2,
      metadata: { role: 'callout-label', trackingEm: LABEL_TRACKING_EM },
      paragraphs: [
        {
          runs: [
            {
              text: props.label.toUpperCase(),
              fontSizePx: LABEL_PX,
              fontWeight: 700,
              color: withAlphaIR(fg, 0.6),
              italic: false,
              underline: false,
            },
          ],
          align: 'left',
        },
      ],
    };
    children.push(label);
    textY += labelHeight + 6;
  }

  // 4. Body text.
  const body: TextNode = {
    kind: 'text',
    recipeId: 'annotatedCallout.body',
    bbox: {
      x: bbox.x + PADDING,
      y: textY,
      w: bbox.w - PADDING * 2,
      h: bbox.y + bbox.h - textY - PADDING,
    },
    zOrder: 3,
    metadata: { role: 'callout-body-text' },
    paragraphs: [
      {
        runs: [
          {
            text: props.body,
            fontSizePx: ty.sizePx,
            fontWeight: 400,
            color: fg,
            italic: false,
            underline: false,
          },
        ],
        align: 'left',
      },
    ],
  };
  children.push(body);

  // The group bbox encompasses both the body card and the pointer.
  const groupBbox = unionBbox(bbox, pointerBbox);

  return {
    kind: 'group',
    recipeId: 'annotatedCallout',
    bbox: groupBbox,
    zOrder: 0,
    metadata: { role: 'annotated-callout', pointerSide: side },
    children,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pointerBboxFor(
  side: PointerSide,
  len: number,
  offset: number,
  bbox: Bbox,
): Bbox {
  // The "long" axis points outward by `len`; the "short" axis is
  // POINTER_THICKNESS, centered at `offset` along the chosen side.
  switch (side) {
    case 'left': {
      const cy = bbox.y + bbox.h * offset;
      return { x: bbox.x - len, y: cy - POINTER_THICKNESS / 2, w: len, h: POINTER_THICKNESS };
    }
    case 'right': {
      const cy = bbox.y + bbox.h * offset;
      return { x: bbox.x + bbox.w, y: cy - POINTER_THICKNESS / 2, w: len, h: POINTER_THICKNESS };
    }
    case 'top': {
      const cx = bbox.x + bbox.w * offset;
      return { x: cx - POINTER_THICKNESS / 2, y: bbox.y - len, w: POINTER_THICKNESS, h: len };
    }
    case 'bottom':
    default: {
      const cx = bbox.x + bbox.w * offset;
      return { x: cx - POINTER_THICKNESS / 2, y: bbox.y + bbox.h, w: POINTER_THICKNESS, h: len };
    }
  }
}

function pointerStyle(
  side: PointerSide,
  len: number,
  offset: number,
  bg: string,
  bbox: Bbox,
): React.CSSProperties {
  const common: React.CSSProperties = {
    position: 'absolute',
    background: bg,
    borderRadius: 2,
  };
  switch (side) {
    case 'left':
      return {
        ...common,
        left: -len,
        top: bbox.h * offset - POINTER_THICKNESS / 2,
        width: len,
        height: POINTER_THICKNESS,
      };
    case 'right':
      return {
        ...common,
        left: bbox.w,
        top: bbox.h * offset - POINTER_THICKNESS / 2,
        width: len,
        height: POINTER_THICKNESS,
      };
    case 'top':
      return {
        ...common,
        top: -len,
        left: bbox.w * offset - POINTER_THICKNESS / 2,
        height: len,
        width: POINTER_THICKNESS,
      };
    case 'bottom':
    default:
      return {
        ...common,
        top: bbox.h,
        left: bbox.w * offset - POINTER_THICKNESS / 2,
        height: len,
        width: POINTER_THICKNESS,
      };
  }
}

function unionBbox(a: Bbox, b: Bbox): Bbox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: right - x, h: bottom - y };
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function colorToCss(c: Color): string {
  if (typeof c === 'string') return c;
  if (c.alpha === undefined || c.alpha >= 0.999) return c.hex;
  const r = parseInt(c.hex.slice(1, 3), 16);
  const g = parseInt(c.hex.slice(3, 5), 16);
  const b = parseInt(c.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${c.alpha})`;
}

function withAlpha(c: Color, alpha: number): string {
  if (typeof c === 'string') {
    if (!/^#[0-9a-fA-F]{6}$/.test(c)) return c;
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  const r = parseInt(c.hex.slice(1, 3), 16);
  const g = parseInt(c.hex.slice(3, 5), 16);
  const b = parseInt(c.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function withAlphaIR(c: Color, alpha: number): Color {
  if (typeof c === 'string') {
    if (/^#[0-9a-fA-F]{6}$/.test(c)) return { hex: c, alpha };
    // 8-char hex — keep as-is (custom-alpha hex strings are valid IR colors).
    return c;
  }
  return { hex: c.hex, alpha };
}

// We rely on React types for CSSProperties; reference React namespace to avoid
// importing the type explicitly at the top.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace React {
  type CSSProperties = import('react').CSSProperties;
}
