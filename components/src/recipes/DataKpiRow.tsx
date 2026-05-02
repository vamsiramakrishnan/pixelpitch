// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { default as _PrimitiveDataKpiRow, dataKpiRowToIR as _primitive_dataKpiRowToIR } from '../primitives/DataKpiRow';

export const DataKpiRowVersion = '1.0.0';

export interface DataKpiRowProps {
  bbox: Bbox;
  kpis: unknown[];
}

export default function DataKpiRow(props: DataKpiRowProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="data.kpi-row" data-recipe-version="1.0.0">
      <_PrimitiveDataKpiRow {...({ bbox: props.bbox } as unknown as ComponentProps<typeof _PrimitiveDataKpiRow>)} />
    </div>
  );
}

export function dataKpiRowToIR(
  props: DataKpiRowProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof _primitive_dataKpiRowToIR>[0];
  const inner = _primitive_dataKpiRowToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.kpi-row',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.kpi-row',
      axis: 'data',
      primitive: 'data.kpi-row',
      version: '1.0.0',
      kpis: props.kpis ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
