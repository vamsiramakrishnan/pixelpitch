/**
 * <Footer> — small bottom-of-slide text band. Typically one or two segments
 * (left = brand/source, right = page number).
 *
 * Wave-2 / Crew F2: now token-aware. Type defaults come from
 * `tokens.type('caption')` (size 13). Color stays as the historical
 * `#52525b` literal because no palette token currently matches that shade
 * (closest are `ink-3: #a1a1aa` and `ink-4: #71717a` — both visibly lighter).
 */

import type { Bbox, TextNode } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

export interface FooterProps {
  left?: string;
  right?: string;
  bbox?: Bbox;
}

// Footer is a "muted small caps" element; #52525b corresponds to zinc-600
// in the historical baseline. See the file-level doc.
const FOOTER_COLOR = '#52525b';

export default function Footer(props: FooterProps) {
  const ty = defaultTokens.type('caption');
  return (
    <div
      style={{
        position: 'absolute',
        bottom: defaultTokens.space(32),
        left: defaultTokens.space(80),
        right: defaultTokens.space(80),
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: ty.sizePx,
        color: FOOTER_COLOR,
        fontFamily: ty.family,
        // Footer historically uses an exaggerated tracking + weight 600,
        // distinct from the body 'caption' spec (which is 0.02em / weight 500).
        letterSpacing: '0.18em',
        fontWeight: 600,
      }}
    >
      <span>{props.left}</span>
      <span>{props.right}</span>
    </div>
  );
}

/**
 * IR emitter. `tokens` defaults to vercel-dark for backward compatibility.
 */
export function footerToIR(
  props: FooterProps,
  tokens: TokensApi = defaultTokens,
): TextNode {
  // Two segments emit as one text frame with two paragraphs (left/right
  // alignment is resolved at slide-layout time).
  const ty = tokens.type('caption');
  const sizePx = ty.sizePx;
  const paragraphs = [];
  if (props.left) {
    paragraphs.push({
      align: 'left' as const,
      runs: [{
        text: props.left,
        fontSizePx: sizePx,
        fontWeight: 600,
        color: FOOTER_COLOR,
        italic: false,
        underline: false,
      }],
    });
  }
  if (props.right) {
    paragraphs.push({
      align: 'right' as const,
      runs: [{
        text: props.right,
        fontSizePx: sizePx,
        fontWeight: 600,
        color: FOOTER_COLOR,
        italic: false,
        underline: false,
      }],
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
