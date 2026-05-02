// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Fill, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotEyebrow, { slotEyebrowToIR } from '../primitives/SlotEyebrow';

export const TypeEyebrowTapeVersion = '1.0.0';

export interface TypeEyebrowTapeProps {
  bbox: Bbox;
  label: string;
  skewDeg?: number;
  fill?: Fill;
}

export default function TypeEyebrowTape(props: TypeEyebrowTapeProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="type.eyebrow-tape" data-recipe-version="1.0.0">
      <SlotEyebrow {...({ bbox: props.bbox } as unknown as ComponentProps<typeof SlotEyebrow>)} />
    </div>
  );
}

export function typeEyebrowTapeToIR(
  props: TypeEyebrowTapeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Recipe-level props
  // beyond bbox are intentionally not forwarded — primitive shapes are
  // hand-tuned and the recipe row's prop set is for the matcher / LLM.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof slotEyebrowToIR>[0];
  const inner = slotEyebrowToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'type.eyebrow-tape',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'type.eyebrow-tape',
      axis: 'type',
      primitive: 'slot.eyebrow',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
