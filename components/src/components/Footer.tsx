/**
 * <Footer> — small bottom-of-slide text band. Typically one or two segments
 * (left = brand/source, right = page number).
 */

import type { Bbox, TextNode } from '../ir/schema';

export interface FooterProps {
  left?: string;
  right?: string;
  bbox?: Bbox;
}

export default function Footer(props: FooterProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 32,
        left: 80,
        right: 80,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 13,
        color: '#52525b',
        letterSpacing: '0.18em',
        fontWeight: 600,
      }}
    >
      <span>{props.left}</span>
      <span>{props.right}</span>
    </div>
  );
}

export function footerToIR(props: FooterProps): TextNode {
  // Two segments emit as one text frame with two paragraphs (left/right
  // alignment is resolved at slide-layout time).
  const paragraphs = [];
  if (props.left) {
    paragraphs.push({
      align: 'left' as const,
      runs: [{ text: props.left, fontSizePx: 13, fontWeight: 600, color: '#52525b', italic: false, underline: false }],
    });
  }
  if (props.right) {
    paragraphs.push({
      align: 'right' as const,
      runs: [{ text: props.right, fontSizePx: 13, fontWeight: 600, color: '#52525b', italic: false, underline: false }],
    });
  }
  return {
    kind: 'text',
    recipeId: 'footer',
    bbox: props.bbox ?? { x: 80, y: 680, w: 1120, h: 18 },
    zOrder: 100,
    metadata: { role: 'footer' },
    paragraphs,
  };
}
