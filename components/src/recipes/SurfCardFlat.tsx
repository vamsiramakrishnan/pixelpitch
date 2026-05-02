// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import FrameSafeArea, { frameSafeAreaToIR } from '../primitives/FrameSafeArea';

export const SurfCardFlatVersion = '1.0.0';

export interface SurfCardFlatProps {
  bbox: Bbox;
  bgColor?: Color;
  radius?: number;
}

export default function SurfCardFlat(props: SurfCardFlatProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="surf.card-flat" data-recipe-version="1.0.0">
      <FrameSafeArea {...({ bbox: props.bbox } as unknown as ComponentProps<typeof FrameSafeArea>)} />
    </div>
  );
}

export function surfCardFlatToIR(
  props: SurfCardFlatProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Recipe-level props
  // beyond bbox are intentionally not forwarded — primitive shapes are
  // hand-tuned and the recipe row's prop set is for the matcher / LLM.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof frameSafeAreaToIR>[0];
  const inner = frameSafeAreaToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'surf.card-flat',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surf.card-flat',
      axis: 'surf',
      primitive: 'frame.safe-area',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
