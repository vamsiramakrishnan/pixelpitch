// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SurfaceShapeFill, { surfaceShapeFillToIR } from '../primitives/SurfaceShapeFill';

export const SurfCardBorderedVersion = '1.0.0';

export interface SurfCardBorderedProps {
  bbox: Bbox;
  bgColor?: Color;
  borderColor?: Color;
  borderPx?: number;
  radius?: number;
}

export default function SurfCardBordered(props: SurfCardBorderedProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="surf.card-bordered" data-recipe-version="1.0.0">
      <SurfaceShapeFill {...({ bbox: props.bbox } as unknown as ComponentProps<typeof SurfaceShapeFill>)} />
    </div>
  );
}

export function surfCardBorderedToIR(
  props: SurfCardBorderedProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof surfaceShapeFillToIR>[0];
  const inner = surfaceShapeFillToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'surf.card-bordered',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surf.card-bordered',
      axis: 'surf',
      primitive: 'surface.shape-fill',
      version: '1.0.0',
      bgColor: props.bgColor ?? undefined,
      borderColor: props.borderColor ?? undefined,
      borderPx: props.borderPx ?? undefined,
      radius: props.radius ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
