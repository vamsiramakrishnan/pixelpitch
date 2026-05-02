// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotNumeral, { slotNumeralToIR } from '../primitives/SlotNumeral';

export const DecNumeralChapterVersion = '1.0.0';

export interface DecNumeralChapterProps {
  bbox: Bbox;
  digits: string;
}

export default function DecNumeralChapter(props: DecNumeralChapterProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="dec.numeral-chapter" data-recipe-version="1.0.0">
      <SlotNumeral {...({ bbox: props.bbox, digits: props.digits } as unknown as ComponentProps<typeof SlotNumeral>)} />
    </div>
  );
}

export function decNumeralChapterToIR(
  props: DecNumeralChapterProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, digits: props.digits } as unknown as Parameters<typeof slotNumeralToIR>[0];
  const inner = slotNumeralToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'dec.numeral-chapter',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'dec.numeral-chapter',
      axis: 'dec',
      primitive: 'slot.numeral',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
