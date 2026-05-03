// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import DataBar, { dataBarToIR } from '../primitives/DataBar';

export const DataBarSetVVersion = '1.0.0';

export interface DataBarSetVProps {
  bbox: Bbox;
  bars: unknown[];
  max?: number;
}

export default function DataBarSetV(props: DataBarSetVProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="data.bar-set-v" data-recipe-version="1.0.0">
      <DataBar {...({ bbox: props.bbox, bars: props.bars, max: props.max } as unknown as ComponentProps<typeof DataBar>)} />
    </div>
  );
}

export function dataBarSetVToIR(
  props: DataBarSetVProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, bars: props.bars, max: props.max } as unknown as Parameters<typeof dataBarToIR>[0];
  const inner = dataBarToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.bar-set-v',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.bar-set-v',
      axis: 'data',
      primitive: 'data.bar',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
