// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import DataHeatmap, { dataHeatmapToIR } from '../primitives/DataHeatmap';

export const DataMiniHeatmapVersion = '1.0.0';

export interface DataMiniHeatmapProps {
  bbox: Bbox;
  cells: unknown[];
  colorScale?: unknown[];
}

export default function DataMiniHeatmap(props: DataMiniHeatmapProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="data.mini-heatmap" data-recipe-version="1.0.0">
      <DataHeatmap {...({ bbox: props.bbox, cells: props.cells, colorScale: props.colorScale } as unknown as ComponentProps<typeof DataHeatmap>)} />
    </div>
  );
}

export function dataMiniHeatmapToIR(
  props: DataMiniHeatmapProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, cells: props.cells, colorScale: props.colorScale } as unknown as Parameters<typeof dataHeatmapToIR>[0];
  const inner = dataHeatmapToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.mini-heatmap',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.mini-heatmap',
      axis: 'data',
      primitive: 'data.heatmap',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
