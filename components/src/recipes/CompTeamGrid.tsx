// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { surfCardRaisedToIR } from './SurfCardRaised';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompTeamGridVersion = '1.0.0';

export interface CompTeamGridProps {
  bbox: Bbox;
  headline: string;
  members: unknown[];
}

export default function CompTeamGrid(_props: CompTeamGridProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.team-grid"
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

export function compTeamGridToIR(
  props: CompTeamGridProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.team-grid',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.team-grid',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typeEyebrowRuledToIR({ bbox: props.bbox } as never, tokens), zOrder: 0 },
    { ...surfCardRaisedToIR({ bbox: props.bbox } as never, tokens), zOrder: 10 },
    { kind: 'group' as const, recipeId: 'ui.avatar-cluster', bbox: props.bbox, zOrder: 20, metadata: { role: 'ui.avatar-cluster', placeholder: true }, children: [] },
    ],
  };
}
