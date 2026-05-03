// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotQuote, { slotQuoteToIR } from '../primitives/SlotQuote';

export const TypePullquoteBrutalistVersion = '1.0.0';

export interface TypePullquoteBrutalistProps {
  bbox: Bbox;
  quote: string;
  attribution?: string;
}

export default function TypePullquoteBrutalist(props: TypePullquoteBrutalistProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="type.pullquote-brutalist" data-recipe-version="1.0.0">
      <SlotQuote {...({ bbox: props.bbox, quote: props.quote, attribution: props.attribution } as unknown as ComponentProps<typeof SlotQuote>)} />
    </div>
  );
}

export function typePullquoteBrutalistToIR(
  props: TypePullquoteBrutalistProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, quote: props.quote, attribution: props.attribution } as unknown as Parameters<typeof slotQuoteToIR>[0];
  const inner = slotQuoteToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'type.pullquote-brutalist',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'type.pullquote-brutalist',
      axis: 'type',
      primitive: 'slot.quote',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
