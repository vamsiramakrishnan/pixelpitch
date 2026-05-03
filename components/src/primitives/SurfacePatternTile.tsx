/**
 * <SurfacePatternTile> — Tier-A primitive (`surface.pattern-tile`).
 *
 * A rectangular surface filled with one of the F1 native pattern fills
 * (`dots`, `lines-h`, `lines-v`, `lines-grid`, `diagonal`, `crosshatch`).
 * Replaces ghost delegations for every `bg.dot-lattice-*`, `bg.line-grid`,
 * `bg.crosshatch`, `bg.diagonal` Tier-B recipe.
 *
 * Composition (z-order bottom → top):
 *   - `surface.pattern-tile`  ShapeNode (rect) with a PatternFill
 *
 * F1 deps: `PatternFill` (`<a:pattFill>` in the Python compiler).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  PatternFill,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type PatternKind = PatternFill['pattern'];

export interface SurfacePatternTileProps {
  bbox: Bbox;
  /** Which native pattern to tile. Optional — defaults to 'dots'. */
  pattern?: PatternKind;
  /** Pattern foreground (the dots / line strokes). Optional — defaults to ruler tint. */
  fgColor?: Color;
  /** Optional backdrop fill. Omit for transparent. */
  bgColor?: Color;
  /** Tile size in slide pixels. Used for both width + height. Default `16`. */
  tilePx?: number;
  /** Dot radius (for `dots`) or stroke width (for line patterns). Default `1`. */
  featurePx?: number;
  /** Rotation applied to the pattern, degrees CW. Default `0`. */
  angleDeg?: number;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// React preview — fakes the pattern via CSS gradients/SVG so designers can eye
// the layout. The Python compiler emits the real `<a:pattFill>`.
// ---------------------------------------------------------------------------

function previewBackground(props: SurfacePatternTileProps): string {
  const fg = colorToCss(props.fgColor ?? defaultTokens.palette('ruler'));
  const tile = props.tilePx ?? 16;
  const feat = props.featurePx ?? 1;
  const pattern = props.pattern ?? 'dots';
  switch (pattern) {
    case 'dots':
      return `radial-gradient(${fg} ${feat}px, transparent ${feat + 0.5}px) 0 0 / ${tile}px ${tile}px`;
    case 'lines-h':
      return `repeating-linear-gradient(0deg, ${fg} 0 ${feat}px, transparent ${feat}px ${tile}px)`;
    case 'lines-v':
      return `repeating-linear-gradient(90deg, ${fg} 0 ${feat}px, transparent ${feat}px ${tile}px)`;
    case 'lines-grid':
      return [
        `repeating-linear-gradient(0deg, ${fg} 0 ${feat}px, transparent ${feat}px ${tile}px)`,
        `repeating-linear-gradient(90deg, ${fg} 0 ${feat}px, transparent ${feat}px ${tile}px)`,
      ].join(', ');
    case 'diagonal':
      return `repeating-linear-gradient(45deg, ${fg} 0 ${feat}px, transparent ${feat}px ${tile}px)`;
    case 'crosshatch':
      return [
        `repeating-linear-gradient(45deg, ${fg} 0 ${feat}px, transparent ${feat}px ${tile}px)`,
        `repeating-linear-gradient(135deg, ${fg} 0 ${feat}px, transparent ${feat}px ${tile}px)`,
      ].join(', ');
  }
}

export default function SurfacePatternTile(props: SurfacePatternTileProps): ReactNode {
  const bg = props.bgColor ? colorToCss(props.bgColor) : 'transparent';
  return (
    <div
      data-recipe-id="surface.pattern-tile"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: previewBackground(props),
        backgroundColor: bg,
        transform: props.angleDeg ? `rotate(${props.angleDeg}deg)` : undefined,
        transformOrigin: 'center',
      }}
    >
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function surfacePatternTileToIR(
  props: SurfacePatternTileProps,
  _tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const tile = props.tilePx ?? 16;
  const feature = props.featurePx ?? 1;
  const angle = props.angleDeg ?? 0;
  const pattern: PatternKind = props.pattern ?? 'dots';
  const fgColor: Color = props.fgColor ?? _tokens.palette('ruler');

  const fill: PatternFill = {
    kind: 'pattern',
    pattern,
    fgColor,
    ...(props.bgColor ? { bgColor: props.bgColor } : {}),
    tileWidthPx: tile,
    tileHeightPx: tile,
    featureSizePx: feature,
    angleDeg: angle,
  };

  const node: ShapeNode = {
    kind: 'shape',
    recipeId: 'surface.pattern-tile',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.pattern-tile',
      axis: 'surface',
      pattern,
      tilePx: tile,
      featurePx: feature,
    },
    shape: 'rect',
    borderRadiusPx: 0,
    fill,
  };

  return {
    kind: 'group',
    recipeId: 'surface.pattern-tile',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surface.pattern-tile',
      axis: 'surface',
      pattern,
      tilePx: tile,
      featurePx: feature,
      angleDeg: angle,
    },
    children: [node],
  };
}
