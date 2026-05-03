// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import FrameSafeArea, { frameSafeAreaToIR } from '../primitives/FrameSafeArea';

export const DataBulletBarVersion = '1.0.0';

export interface DataBulletBarProps {
  bbox: Bbox;
  value: number;
  target: number;
  max: number;
  ranges?: unknown[];
}

export default function DataBulletBar(props: DataBulletBarProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="data.bullet-bar" data-recipe-version="1.0.0">
      <FrameSafeArea {...({ bbox: props.bbox } as unknown as ComponentProps<typeof FrameSafeArea>)} />
    </div>
  );
}

export function dataBulletBarToIR(
  props: DataBulletBarProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof frameSafeAreaToIR>[0];
  const inner = frameSafeAreaToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.bullet-bar',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.bullet-bar',
      axis: 'data',
      primitive: 'frame.safe-area',
      version: '1.0.0',
      value: props.value ?? undefined,
      target: props.target ?? undefined,
      max: props.max ?? undefined,
      ranges: props.ranges ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
