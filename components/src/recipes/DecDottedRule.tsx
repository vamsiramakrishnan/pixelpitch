// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import DecorationLineStroke, { decorationLineStrokeToIR } from '../primitives/DecorationLineStroke';

export const DecDottedRuleVersion = '1.0.0';

export interface DecDottedRuleProps {
  bbox: Bbox;
  orientation?: 'h' | 'v';
  color?: Color;
}

export default function DecDottedRule(props: DecDottedRuleProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="dec.dotted-rule" data-recipe-version="1.0.0">
      <DecorationLineStroke {...({ bbox: props.bbox, orientation: props.orientation, color: props.color, dash: 'dotted' } as unknown as ComponentProps<typeof DecorationLineStroke>)} />
    </div>
  );
}

export function decDottedRuleToIR(
  props: DecDottedRuleProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, orientation: props.orientation, color: props.color, dash: 'dotted' } as unknown as Parameters<typeof decorationLineStrokeToIR>[0];
  const inner = decorationLineStrokeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'dec.dotted-rule',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'dec.dotted-rule',
      axis: 'dec',
      primitive: 'decoration.line-stroke',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
