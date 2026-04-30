/**
 * <Pill> — rounded-full status badge with optional dot prefix.
 * Emits as a Group: a rounded-rect shape behind a small text node.
 */

import type { Bbox, Color, GroupNodeT, ShapeNode, TextNode } from '../ir/schema';

export interface PillProps {
  children: string;
  color?: Color;          // text color
  bgColor?: Color;        // pill background
  borderColor?: Color;
  dotColor?: Color;       // optional leading status-dot
  bbox?: Bbox;
}

const DEFAULT_BG: Color = { hex: '#ffffff', alpha: 0.06 };
const DEFAULT_BORDER: Color = { hex: '#ffffff', alpha: 0.12 };
const DEFAULT_TEXT: Color = '#e4e4e7';

export default function Pill(props: PillProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 9999,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        fontSize: 13,
        color: '#e4e4e7',
        fontWeight: 500,
      }}
    >
      {props.dotColor && (
        <span style={{ width: 8, height: 8, borderRadius: 9999, background: typeof props.dotColor === 'string' ? props.dotColor : props.dotColor.hex }} />
      )}
      {props.children}
    </span>
  );
}

export function pillToIR(props: PillProps): GroupNodeT {
  const bbox = props.bbox ?? { x: 0, y: 0, w: 160, h: 32 };
  const bg: ShapeNode = {
    kind: 'shape',
    recipeId: 'pill.bg',
    bbox,
    zOrder: 0,
    metadata: { role: 'pill-bg' },
    shape: 'rounded-rect',
    borderRadiusPx: 9999,
    fill: { kind: 'solid', color: props.bgColor ?? DEFAULT_BG },
    border: {
      width: 1,
      color: props.borderColor ?? DEFAULT_BORDER,
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
      borderRadiusPx: 9999,
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
          fontSizePx: 13,
          fontWeight: 500,
          color: props.color ?? DEFAULT_TEXT,
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
