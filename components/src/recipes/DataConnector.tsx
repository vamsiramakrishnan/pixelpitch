// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import DiagramConnector, { diagramConnectorToIR } from '../primitives/DiagramConnector';

export const DataConnectorVersion = '1.0.0';

export interface DataConnectorProps {
  bbox: Bbox;
  from: Record<string, unknown>;
  to: Record<string, unknown>;
  kind?: 'straight' | 'orthogonal' | 'curved';
  head?: 'none' | 'arrow' | 'dot' | 'diamond' | 'bar';
  dashed?: boolean;
  color?: Color;
}

export default function DataConnector(props: DataConnectorProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="data.connector" data-recipe-version="1.0.0">
      <DiagramConnector {...({ bbox: props.bbox, from: props.from, to: props.to, kind: props.kind } as unknown as ComponentProps<typeof DiagramConnector>)} />
    </div>
  );
}

export function dataConnectorToIR(
  props: DataConnectorProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, from: props.from, to: props.to, kind: props.kind } as unknown as Parameters<typeof diagramConnectorToIR>[0];
  const inner = diagramConnectorToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'data.connector',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.connector',
      axis: 'data',
      primitive: 'diagram.connector',
      version: '1.0.0',
      head: props.head ?? undefined,
      dashed: props.dashed ?? undefined,
      color: props.color ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
