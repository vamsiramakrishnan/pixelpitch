// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotCode, { slotCodeToIR } from '../primitives/SlotCode';

export const UiCodeBlockVersion = '1.0.0';

export interface UiCodeBlockProps {
  bbox: Bbox;
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

export default function UiCodeBlock(props: UiCodeBlockProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="ui.code-block" data-recipe-version="1.0.0">
      <SlotCode {...({ bbox: props.bbox } as unknown as ComponentProps<typeof SlotCode>)} />
    </div>
  );
}

export function uiCodeBlockToIR(
  props: UiCodeBlockProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Recipe-level props
  // beyond bbox are intentionally not forwarded — primitive shapes are
  // hand-tuned and the recipe row's prop set is for the matcher / LLM.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof slotCodeToIR>[0];
  const inner = slotCodeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'ui.code-block',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'ui.code-block',
      axis: 'ui',
      primitive: 'slot.code',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
