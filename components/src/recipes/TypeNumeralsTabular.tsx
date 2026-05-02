// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotCaption, { slotCaptionToIR } from '../primitives/SlotCaption';

export const TypeNumeralsTabularVersion = '1.0.0';

export interface TypeNumeralsTabularProps {
  bbox: Bbox;
  digits: string;
}

export default function TypeNumeralsTabular(props: TypeNumeralsTabularProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="type.numerals-tabular" data-recipe-version="1.0.0">
      <SlotCaption {...({ bbox: props.bbox } as unknown as ComponentProps<typeof SlotCaption>)} />
    </div>
  );
}

export function typeNumeralsTabularToIR(
  props: TypeNumeralsTabularProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof slotCaptionToIR>[0];
  const inner = slotCaptionToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'type.numerals-tabular',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'type.numerals-tabular',
      axis: 'type',
      primitive: 'slot.caption',
      version: '1.0.0',
      digits: props.digits ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
