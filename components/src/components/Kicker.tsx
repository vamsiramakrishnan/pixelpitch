/**
 * <Kicker> — small, uppercase, wide-tracking eyebrow text. Typically pairs
 * with a Title below it. The IR emits a single-paragraph text node tagged
 * with role=kicker so the Python emitter can preserve the role.
 */

import type { Bbox, Color, TextNode } from '../ir/schema';

export interface KickerProps {
  children: string;
  color?: Color;
  bbox?: Bbox;
}

const DEFAULT_COLOR = '#a78bfa';
const FONT_PX = 13;
const TRACKING_EM = 0.42;

export default function Kicker(props: KickerProps) {
  return (
    <div
      style={{
        fontSize: FONT_PX,
        textTransform: 'uppercase',
        letterSpacing: `${TRACKING_EM}em`,
        fontWeight: 700,
        color: typeof props.color === 'string' ? props.color : props.color?.hex ?? DEFAULT_COLOR,
      }}
    >
      {props.children}
    </div>
  );
}

export function kickerToIR(props: KickerProps): TextNode {
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
            fontSizePx: FONT_PX,
            fontWeight: 700,
            color: props.color ?? DEFAULT_COLOR,
            italic: false,
            underline: false,
          },
        ],
        align: 'left',
      },
    ],
  };
}
