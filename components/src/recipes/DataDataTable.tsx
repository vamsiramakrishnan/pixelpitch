// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import DataTable, { dataTableToIR } from '../primitives/DataTable';

export const DataDataTableVersion = '1.0.0';

export interface DataDataTableProps {
  bbox: Bbox;
  headers: unknown[];
  rows: unknown[];
  zebra?: boolean;
  align?: unknown[];
}

export default function DataDataTable(props: DataDataTableProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="data.data-table" data-recipe-version="1.0.0">
      <DataTable {...({ bbox: props.bbox, headers: props.headers, rows: props.rows, zebra: props.zebra, align: props.align } as unknown as ComponentProps<typeof DataTable>)} />
    </div>
  );
}

export function dataDataTableToIR(
  props: DataDataTableProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, headers: props.headers, rows: props.rows, zebra: props.zebra, align: props.align } as unknown as Parameters<typeof dataTableToIR>[0];
  const inner = dataTableToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.data-table',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.data-table',
      axis: 'data',
      primitive: 'data.table',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
