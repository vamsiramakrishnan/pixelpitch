// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SurfaceRadialBlob, { surfaceRadialBlobToIR } from '../primitives/SurfaceRadialBlob';

export const BgAuroraCornersVersion = '1.0.0';

export interface BgAuroraCornersProps {
  bbox: Bbox;
  colorTL?: Color;
  colorTR?: Color;
  colorBL?: Color;
  colorBR?: Color;
}

export default function BgAuroraCorners(props: BgAuroraCornersProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="bg.aurora-corners" data-recipe-version="1.0.0">
      <SurfaceRadialBlob {...({ bbox: props.bbox, colorTL: props.colorTL, colorTR: props.colorTR, colorBL: props.colorBL, colorBR: props.colorBR } as unknown as ComponentProps<typeof SurfaceRadialBlob>)} />
    </div>
  );
}

export function bgAuroraCornersToIR(
  props: BgAuroraCornersProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, colorTL: props.colorTL, colorTR: props.colorTR, colorBL: props.colorBL, colorBR: props.colorBR } as unknown as Parameters<typeof surfaceRadialBlobToIR>[0];
  const inner = surfaceRadialBlobToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'bg.aurora-corners',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'bg.aurora-corners',
      axis: 'bg',
      primitive: 'surface.radial-blob',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
