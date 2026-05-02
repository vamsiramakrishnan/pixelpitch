// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import DataDonut, { dataDonutToIR } from '../primitives/DataDonut';

export const DataDonutMultiSegmentVersion = '1.0.0';

export interface DataDonutMultiSegmentProps {
  bbox: Bbox;
  segments: unknown[];
  thicknessPx?: number;
  startDeg?: number;
  gapDeg?: number;
}

export default function DataDonutMultiSegment(props: DataDonutMultiSegmentProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="data.donut-multi-segment" data-recipe-version="1.0.0">
      <DataDonut {...({ bbox: props.bbox } as unknown as ComponentProps<typeof DataDonut>)} />
    </div>
  );
}

export function dataDonutMultiSegmentToIR(
  props: DataDonutMultiSegmentProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof dataDonutToIR>[0];
  const inner = dataDonutToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.donut-multi-segment',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.donut-multi-segment',
      axis: 'data',
      primitive: 'data.donut',
      version: '1.0.0',
      segments: props.segments ?? undefined,
      thicknessPx: props.thicknessPx ?? undefined,
      startDeg: props.startDeg ?? undefined,
      gapDeg: props.gapDeg ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
