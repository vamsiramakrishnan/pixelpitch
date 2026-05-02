// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { surfCardRaisedToIR } from './SurfCardRaised';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
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
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.1 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: "Team" } as never, tokens), zOrder: 0 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.18 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.12 * props.bbox.h }, value: props.headline } as never, tokens), zOrder: 10 },
    { ...surfCardRaisedToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.4 * props.bbox.h, w: 0.265 * props.bbox.w, h: 0.2 * props.bbox.h } } as never, tokens), zOrder: 20 },
    { ...surfCardRaisedToIR({ bbox: { x: props.bbox.x + 0.367 * props.bbox.w, y: props.bbox.y + 0.4 * props.bbox.h, w: 0.265 * props.bbox.w, h: 0.2 * props.bbox.h } } as never, tokens), zOrder: 30 },
    { ...surfCardRaisedToIR({ bbox: { x: props.bbox.x + 0.66 * props.bbox.w, y: props.bbox.y + 0.4 * props.bbox.h, w: 0.265 * props.bbox.w, h: 0.2 * props.bbox.h } } as never, tokens), zOrder: 40 },
    { ...surfCardRaisedToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.65 * props.bbox.h, w: 0.265 * props.bbox.w, h: 0.2 * props.bbox.h } } as never, tokens), zOrder: 50 },
    { ...surfCardRaisedToIR({ bbox: { x: props.bbox.x + 0.367 * props.bbox.w, y: props.bbox.y + 0.65 * props.bbox.h, w: 0.265 * props.bbox.w, h: 0.2 * props.bbox.h } } as never, tokens), zOrder: 60 },
    { ...surfCardRaisedToIR({ bbox: { x: props.bbox.x + 0.66 * props.bbox.w, y: props.bbox.y + 0.65 * props.bbox.h, w: 0.265 * props.bbox.w, h: 0.2 * props.bbox.h } } as never, tokens), zOrder: 70 },
    ],
  };
}
