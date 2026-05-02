// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import FrameBento, { frameBentoToIR } from '../primitives/FrameBento';

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
  return (
    <div data-recipe-id="surf.bento-cell" data-recipe-version="1.0.0">
      <FrameBento {...({ bbox: props.bbox } as unknown as ComponentProps<typeof FrameBento>)} />
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
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof frameBentoToIR>[0];
  const inner = frameBentoToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'surf.bento-cell',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surf.bento-cell',
      axis: 'surf',
      primitive: 'frame.bento',
      version: '1.0.0',
      bgColor: props.bgColor ?? undefined,
      radius: props.radius ?? undefined,
      padding: props.padding ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
