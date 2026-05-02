// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { default as _PrimitiveDataDonut, dataDonutToIR as _primitive_dataDonutToIR } from '../primitives/DataDonut';

export const DataDonutVersion = '1.0.0';

export interface DataDonutProps {
  bbox: Bbox;
  segments: unknown[];
  thicknessPx?: number;
  startDeg?: number;
}

export default function DataDonut(props: DataDonutProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="data.donut" data-recipe-version="1.0.0">
      <_PrimitiveDataDonut {...({ bbox: props.bbox } as unknown as ComponentProps<typeof _PrimitiveDataDonut>)} />
    </div>
  );
}

export function dataDonutToIR(
  props: DataDonutProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof _primitive_dataDonutToIR>[0];
  const inner = _primitive_dataDonutToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.donut',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.donut',
      axis: 'data',
      primitive: 'data.donut',
      version: '1.0.0',
      segments: props.segments ?? undefined,
      thicknessPx: props.thicknessPx ?? undefined,
      startDeg: props.startDeg ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
