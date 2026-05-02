// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SurfaceRadialBlob, { surfaceRadialBlobToIR } from '../primitives/SurfaceRadialBlob';

export const BgSpotlightSoftVersion = '1.0.0';

export interface BgSpotlightSoftProps {
  bbox: Bbox;
  cx?: number;
  cy?: number;
  color?: Color;
}

export default function BgSpotlightSoft(props: BgSpotlightSoftProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="bg.spotlight-soft" data-recipe-version="1.0.0">
      <SurfaceRadialBlob {...({ bbox: props.bbox, color: props.color, cx: props.cx, cy: props.cy } as unknown as ComponentProps<typeof SurfaceRadialBlob>)} />
    </div>
  );
}

export function bgSpotlightSoftToIR(
  props: BgSpotlightSoftProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, color: props.color, cx: props.cx, cy: props.cy } as unknown as Parameters<typeof surfaceRadialBlobToIR>[0];
  const inner = surfaceRadialBlobToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'bg.spotlight-soft',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'bg.spotlight-soft',
      axis: 'bg',
      primitive: 'surface.radial-blob',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
