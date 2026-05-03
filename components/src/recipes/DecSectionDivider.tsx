// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Fill, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SurfaceShapeFill, { surfaceShapeFillToIR } from '../primitives/SurfaceShapeFill';

export const DecSectionDividerVersion = '1.0.0';

export interface DecSectionDividerProps {
  bbox: Bbox;
  fill?: Fill;
}

export default function DecSectionDivider(props: DecSectionDividerProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="dec.section-divider" data-recipe-version="1.0.0">
      <SurfaceShapeFill {...({ bbox: props.bbox, fill: props.fill ?? tokens.gradient("accent-grad") } as unknown as ComponentProps<typeof SurfaceShapeFill>)} />
    </div>
  );
}

export function decSectionDividerToIR(
  props: DecSectionDividerProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, fill: props.fill ?? tokens.gradient("accent-grad") } as unknown as Parameters<typeof surfaceShapeFillToIR>[0];
  const inner = surfaceShapeFillToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'dec.section-divider',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'dec.section-divider',
      axis: 'dec',
      primitive: 'surface.shape-fill',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
