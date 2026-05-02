// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { decHairlineRuleToIR } from './DecHairlineRule';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompAgendaTocVersion = '1.0.0';

export interface CompAgendaTocProps {
  bbox: Bbox;
  items: unknown[];
}

export default function CompAgendaToc(_props: CompAgendaTocProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.agenda-toc"
      data-composite="true"
      style={{
        position: 'absolute',
        left: _props.bbox.x,
        top: _props.bbox.y,
        width: _props.bbox.w,
        height: _props.bbox.h,
      }}
    />
  );
}

export function compAgendaTocToIR(
  props: CompAgendaTocProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.agenda-toc',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.agenda-toc',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typeEyebrowRuledToIR({ bbox: props.bbox } as never, tokens), zOrder: 0 },
    { ...decHairlineRuleToIR({ bbox: props.bbox } as never, tokens), zOrder: 10 },
    ],
  };
}
