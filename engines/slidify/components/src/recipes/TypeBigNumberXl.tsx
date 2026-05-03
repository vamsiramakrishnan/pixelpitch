// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotNumeral, { slotNumeralToIR } from '../primitives/SlotNumeral';

export const TypeBigNumberXlVersion = '1.0.0';

export interface TypeBigNumberXlProps {
  bbox: Bbox;
  value: string;
  unit?: string;
}

export default function TypeBigNumberXl(props: TypeBigNumberXlProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="type.big-number-xl" data-recipe-version="1.0.0">
      <SlotNumeral {...({ bbox: props.bbox, value: props.value } as unknown as ComponentProps<typeof SlotNumeral>)} />
    </div>
  );
}

export function typeBigNumberXlToIR(
  props: TypeBigNumberXlProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, value: props.value } as unknown as Parameters<typeof slotNumeralToIR>[0];
  const inner = slotNumeralToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'type.big-number-xl',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'type.big-number-xl',
      axis: 'type',
      primitive: 'slot.numeral',
      version: '1.0.0',
      unit: props.unit ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
