// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { typePullquoteSerifToIR } from './TypePullquoteSerif';

export const CompQuoteEditorialVersion = '1.0.0';

export interface CompQuoteEditorialProps {
  bbox: Bbox;
  quote: string;
  attribution?: string;
}

export default function CompQuoteEditorial(_props: CompQuoteEditorialProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.quote-editorial"
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

export function compQuoteEditorialToIR(
  props: CompQuoteEditorialProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.quote-editorial',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.quote-editorial',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typePullquoteSerifToIR({ bbox: props.bbox } as never, tokens), zOrder: 0 },
    { kind: 'group' as const, recipeId: 'ui.avatar-cluster', bbox: props.bbox, zOrder: 10, metadata: { role: 'ui.avatar-cluster', placeholder: true }, children: [] },
    ],
  };
}
