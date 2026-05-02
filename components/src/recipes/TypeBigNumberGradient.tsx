// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import type { LinearGradient } from '../tokens';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotNumeral, { slotNumeralToIR } from '../primitives/SlotNumeral';

export const TypeBigNumberGradientVersion = '1.0.0';

export interface TypeBigNumberGradientProps {
  bbox: Bbox;
  value: string;
  unit?: string;
  gradient?: LinearGradient;
}

export default function TypeBigNumberGradient(props: TypeBigNumberGradientProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="type.big-number-gradient" data-recipe-version="1.0.0">
      <SlotNumeral {...({ bbox: props.bbox, value: props.value, gradient: props.gradient } as unknown as ComponentProps<typeof SlotNumeral>)} />
    </div>
  );
}

export function typeBigNumberGradientToIR(
  props: TypeBigNumberGradientProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, value: props.value, gradient: props.gradient } as unknown as Parameters<typeof slotNumeralToIR>[0];
  const inner = slotNumeralToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'type.big-number-gradient',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'type.big-number-gradient',
      axis: 'type',
      primitive: 'slot.numeral',
      version: '1.0.0',
      unit: props.unit ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
