// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SurfaceLinearFade, { surfaceLinearFadeToIR } from '../primitives/SurfaceLinearFade';

export const MaskGradientFadeEdgeVersion = '1.0.0';

export interface MaskGradientFadeEdgeProps {
  bbox: Bbox;
  src: string;
  edge?: 'top' | 'right' | 'bottom' | 'left' | 'all';
  fadePct?: number;
}

export default function MaskGradientFadeEdge(props: MaskGradientFadeEdgeProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="mask.gradient-fade-edge" data-recipe-version="1.0.0">
      <SurfaceLinearFade {...({ bbox: props.bbox, fadePct: props.fadePct } as unknown as ComponentProps<typeof SurfaceLinearFade>)} />
    </div>
  );
}

export function maskGradientFadeEdgeToIR(
  props: MaskGradientFadeEdgeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, fadePct: props.fadePct } as unknown as Parameters<typeof surfaceLinearFadeToIR>[0];
  const inner = surfaceLinearFadeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'mask.gradient-fade-edge',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'mask.gradient-fade-edge',
      axis: 'mask',
      primitive: 'surface.linear-fade',
      version: '1.0.0',
      src: props.src ?? undefined,
      edge: props.edge ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
