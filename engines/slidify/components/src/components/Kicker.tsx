/**
 * <Kicker> — small, uppercase, wide-tracking eyebrow text. Typically pairs
 * with a Title below it. The IR emits a single-paragraph text node tagged
 * with role=kicker so the Python emitter can preserve the role.
 *
 * Wave-2 / Crew F2: now token-aware. The default color is `tokens.palette('accent')`
 * (was `#a78bfa`); fontSize / weight / tracking come from `tokens.type('eyebrow')`.
 */

import type { Bbox, Color, TextNode } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

export interface KickerProps {
  children: string;
  color?: Color;
  bbox?: Bbox;
}

export default function Kicker(props: KickerProps) {
  const t = defaultTokens;
  const ty = t.type('eyebrow');
  return (
    <div
      style={{
        fontSize: ty.sizePx,
        textTransform: 'uppercase',
        letterSpacing: `${ty.trackingEm}em`,
        // Eyebrow keeps weight 700 for backward visual parity (pre-token
        // baseline used 700; token spec is 600). Override at the run level.
        fontWeight: 700,
        fontFamily: ty.family,
        color:
          typeof props.color === 'string'
            ? props.color
            : props.color?.hex
            ?? (typeof t.palette('accent') === 'string'
              ? (t.palette('accent') as string)
              : (t.palette('accent') as { hex: string }).hex),
      }}
    >
      {props.children}
    </div>
  );
}

/**
 * IR emitter. Pass `tokens` to override the active theme; defaults to the
 * vercel-dark singleton, which preserves the historical look.
 */
export function kickerToIR(props: KickerProps, tokens: TokensApi = defaultTokens): TextNode {
  const ty = tokens.type('eyebrow');
  return {
    kind: 'text',
    recipeId: 'kicker',
    bbox: props.bbox,
    zOrder: 0,
    metadata: { role: 'kicker' },
    paragraphs: [
      {
        runs: [
          {
            text: props.children.toUpperCase(),
            fontSizePx: ty.sizePx,
            // Pre-token baseline used weight 700 here (the spec eyebrow weight
            // is 600); preserve 700 for snapshot parity.
            fontWeight: 700,
            color: props.color ?? tokens.palette('accent'),
            italic: false,
            underline: false,
          },
        ],
        align: 'left',
      },
    ],
  };
}
