// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotList, { slotListToIR } from '../primitives/SlotList';

export const UiChecklistVersion = '1.0.0';

export interface UiChecklistProps {
  bbox: Bbox;
  items: unknown[];
}

export default function UiChecklist(props: UiChecklistProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="ui.checklist" data-recipe-version="1.0.0">
      <SlotList {...({ bbox: props.bbox } as unknown as ComponentProps<typeof SlotList>)} />
    </div>
  );
}

export function uiChecklistToIR(
  props: UiChecklistProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof slotListToIR>[0];
  const inner = slotListToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'ui.checklist',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'ui.checklist',
      axis: 'ui',
      primitive: 'slot.list',
      version: '1.0.0',
      items: props.items ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
