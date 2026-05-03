// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { default as _PrimitiveDataDeltaBadge, dataDeltaBadgeToIR as _primitive_dataDeltaBadgeToIR } from '../primitives/DataDeltaBadge';

export const DataDeltaBadgeVersion = '1.0.0';

export interface DataDeltaBadgeProps {
  bbox: Bbox;
  value: string;
  direction?: 'up' | 'down' | 'flat';
  size?: 'sm' | 'md';
}

export default function DataDeltaBadge(props: DataDeltaBadgeProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="data.delta-badge" data-recipe-version="1.0.0">
      <_PrimitiveDataDeltaBadge {...({ bbox: props.bbox, value: props.value, direction: props.direction ?? "up", size: props.size ?? "md" } as unknown as ComponentProps<typeof _PrimitiveDataDeltaBadge>)} />
    </div>
  );
}

export function dataDeltaBadgeToIR(
  props: DataDeltaBadgeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, value: props.value, direction: props.direction ?? "up", size: props.size ?? "md" } as unknown as Parameters<typeof _primitive_dataDeltaBadgeToIR>[0];
  const inner = _primitive_dataDeltaBadgeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.delta-badge',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.delta-badge',
      axis: 'data',
      primitive: 'data.delta-badge',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
