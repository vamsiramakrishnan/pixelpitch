// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SurfacePatternTile, { surfacePatternTileToIR } from '../primitives/SurfacePatternTile';

export const BgLineGridVersion = '1.0.0';

export interface BgLineGridProps {
  bbox: Bbox;
  color?: Color;
  spacingPx?: number;
  strokeWidthPx?: number;
}

export default function BgLineGrid(props: BgLineGridProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="bg.line-grid" data-recipe-version="1.0.0">
      <SurfacePatternTile {...({ bbox: props.bbox, pattern: 'lines-grid' } as unknown as ComponentProps<typeof SurfacePatternTile>)} />
    </div>
  );
}

export function bgLineGridToIR(
  props: BgLineGridProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, pattern: 'lines-grid' } as unknown as Parameters<typeof surfacePatternTileToIR>[0];
  const inner = surfacePatternTileToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'bg.line-grid',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'bg.line-grid',
      axis: 'bg',
      primitive: 'surface.pattern-tile',
      version: '1.0.0',
      color: props.color ?? undefined,
      spacingPx: props.spacingPx ?? undefined,
      strokeWidthPx: props.strokeWidthPx ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
