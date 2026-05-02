// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import FrameSafeArea, { frameSafeAreaToIR } from '../primitives/FrameSafeArea';

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
  return (
    <div data-recipe-id="data.delta-badge" data-recipe-version="1.0.0">
      <FrameSafeArea {...({ bbox: props.bbox } as unknown as ComponentProps<typeof FrameSafeArea>)} />
    </div>
  );
}

export function dataDeltaBadgeToIR(
  props: DataDeltaBadgeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Recipe-level props
  // beyond bbox are intentionally not forwarded — primitive shapes are
  // hand-tuned and the recipe row's prop set is for the matcher / LLM.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof frameSafeAreaToIR>[0];
  const inner = frameSafeAreaToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.delta-badge',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.delta-badge',
      axis: 'data',
      primitive: 'frame.safe-area',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
