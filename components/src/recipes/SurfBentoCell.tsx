// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SurfaceShapeFill, { surfaceShapeFillToIR } from '../primitives/SurfaceShapeFill';

export const SurfBentoCellVersion = '1.0.0';

export interface SurfBentoCellProps {
  bbox: Bbox;
  bgColor?: Color;
  radius?: number;
  padding?: number;
}

export default function SurfBentoCell(props: SurfBentoCellProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="surf.bento-cell" data-recipe-version="1.0.0">
      <SurfaceShapeFill {...({ bbox: props.bbox, bgColor: props.bgColor ?? tokens.palette("surface-3"), radius: props.radius ?? 24 } as unknown as ComponentProps<typeof SurfaceShapeFill>)} />
    </div>
  );
}

export function surfBentoCellToIR(
  props: SurfBentoCellProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, bgColor: props.bgColor ?? tokens.palette("surface-3"), radius: props.radius ?? 24 } as unknown as Parameters<typeof surfaceShapeFillToIR>[0];
  const inner = surfaceShapeFillToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'surf.bento-cell',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surf.bento-cell',
      axis: 'surf',
      primitive: 'surface.shape-fill',
      version: '1.0.0',
      padding: props.padding ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
