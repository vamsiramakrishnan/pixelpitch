// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { dataBulletBarToIR } from './DataBulletBar';
import { dataDeltaBadgeToIR } from './DataDeltaBadge';
import { surfCardRaisedToIR } from './SurfCardRaised';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompThreeUpStatsVersion = '1.0.0';

export interface CompThreeUpStatsProps {
  bbox: Bbox;
  eyebrow: string;
  headline: string;
  kpis: unknown[];
}

export default function CompThreeUpStats(_props: CompThreeUpStatsProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.three-up-stats"
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

export function compThreeUpStatsToIR(
  props: CompThreeUpStatsProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.three-up-stats',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.three-up-stats',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typeEyebrowRuledToIR({ bbox: props.bbox } as never, tokens), zOrder: 0 },
    { ...surfCardRaisedToIR({ bbox: props.bbox } as never, tokens), zOrder: 10 },
    { ...dataBulletBarToIR({ bbox: props.bbox } as never, tokens), zOrder: 20 },
    { ...dataDeltaBadgeToIR({ bbox: props.bbox } as never, tokens), zOrder: 30 },
    ],
  };
}
