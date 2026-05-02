// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import DecorationShapePreset, { decorationShapePresetToIR } from '../primitives/DecorationShapePreset';

export const DecArrowUpVersion = '1.0.0';

export interface DecArrowUpProps {
  bbox: Bbox;
  color?: Color;
}

export default function DecArrowUp(props: DecArrowUpProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="dec.arrow-up" data-recipe-version="1.0.0">
      <DecorationShapePreset {...({ bbox: props.bbox, preset: 'arrow-up' } as unknown as ComponentProps<typeof DecorationShapePreset>)} />
    </div>
  );
}

export function decArrowUpToIR(
  props: DecArrowUpProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, preset: 'arrow-up' } as unknown as Parameters<typeof decorationShapePresetToIR>[0];
  const inner = decorationShapePresetToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'dec.arrow-up',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'dec.arrow-up',
      axis: 'dec',
      primitive: 'decoration.shape-preset',
      version: '1.0.0',
      color: props.color ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
