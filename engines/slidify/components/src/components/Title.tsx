/**
 * <Title> — display headline. `size` selects from a curated scale; the IR
 * emits a `text` node with one or more paragraphs (one per <br/>-separated
 * span). Children may be a string or a Fragment containing <Accent> spans.
 *
 * Wave-2 / Crew F2: now token-aware. Sizes are still a curated `TitleSize`
 * union (the historical 6-tier scale). The HTML preview consults
 * `tokens.fonts.sans` and `tokens.palette('ink-1')` for defaults; the IR
 * emitter does not stamp `fontFamily` on runs (kept lean for snapshot parity
 * with the v0.1 baseline).
 */

import type { ReactNode } from 'react';
import type { Bbox, Color, Paragraph, TextNode, TextRun } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

const SIZE_SCALE: Record<TitleSize, { px: number; weight: number; tracking: number }> = {
  sm:    { px: 32,  weight: 700, tracking: -0.01 },
  md:    { px: 48,  weight: 800, tracking: -0.025 },
  lg:    { px: 56,  weight: 800, tracking: -0.025 },
  xl:    { px: 72,  weight: 800, tracking: -0.035 },
  '2xl': { px: 96,  weight: 800, tracking: -0.04 },
  '3xl': { px: 104, weight: 800, tracking: -0.045 },
};

export type TitleSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

export interface TitleProps {
  children: ReactNode;
  size?: TitleSize;
  color?: Color;
  bbox?: Bbox;
  align?: Paragraph['align'];
}

export default function Title(props: TitleProps) {
  const cfg = SIZE_SCALE[props.size ?? 'lg'];
  const inkDefault = defaultTokens.palette('ink-1');
  const inkHex = typeof inkDefault === 'string' ? inkDefault : inkDefault.hex;
  return (
    <h1
      style={{
        fontSize: cfg.px,
        fontWeight: cfg.weight,
        letterSpacing: `${cfg.tracking}em`,
        lineHeight: 1.0,
        fontFamily: defaultTokens.fonts.sans,
        color: typeof props.color === 'string' ? props.color : props.color?.hex ?? inkHex,
        margin: 0,
        textAlign: props.align ?? 'left',
      }}
    >
      {props.children}
    </h1>
  );
}

/**
 * IR emitter — flattens children into a sequence of TextRuns. Assumes
 * children are either strings or { text, color?, weight?, italic? } run-spec
 * objects (the JSX→IR compiler resolves <Accent> to a run-spec).
 *
 * @param tokens active token bundle; defaults to vercel-dark for backward
 *   compatibility with v0.1 callers that omit the second arg.
 */
export function titleToIR(
  props: TitleProps & { children: string | RunSpec[] },
  tokens: TokensApi = defaultTokens,
): TextNode {
  // `tokens` accepted for future use (e.g., theme-driven default color);
  // the v0.1 IR shape doesn't carry a fontFamily/color on Title runs by
  // default, so we keep the snapshot lean for parity.
  void tokens;
  const cfg = SIZE_SCALE[props.size ?? 'lg'];
  const runs: TextRun[] = normalizeChildren(props.children, cfg);
  const para: Paragraph = {
    runs,
    align: props.align ?? 'left',
  };
  return {
    kind: 'text',
    recipeId: 'title',
    bbox: props.bbox,
    zOrder: 0,
    metadata: { role: 'title', size: props.size ?? 'lg' },
    paragraphs: [para],
  };
}

export interface RunSpec {
  text: string;
  color?: Color;
  weight?: number;
  italic?: boolean;
  underline?: boolean;
}

function normalizeChildren(
  children: string | RunSpec[],
  cfg: { px: number; weight: number; tracking: number },
): TextRun[] {
  if (typeof children === 'string') {
    return [
      {
        text: children,
        fontSizePx: cfg.px,
        fontWeight: cfg.weight,
        italic: false,
        underline: false,
      },
    ];
  }
  return children.map(c => ({
    text: c.text,
    fontSizePx: cfg.px,
    fontWeight: c.weight ?? cfg.weight,
    color: c.color,
    italic: c.italic ?? false,
    underline: c.underline ?? false,
  }));
}
