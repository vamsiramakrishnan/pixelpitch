// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { bgAuroraCornersToIR } from './BgAuroraCorners';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';
import { typePullquoteSerifToIR } from './TypePullquoteSerif';

export const CompHeroInvestorVersion = '1.0.0';

export interface CompHeroInvestorProps {
  bbox: Bbox;
  eyebrow: string;
  headline: string;
  lede?: string;
}

export default function CompHeroInvestor(_props: CompHeroInvestorProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.hero-investor"
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

export function compHeroInvestorToIR(
  props: CompHeroInvestorProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.hero-investor',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.hero-investor',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { kind: 'group' as const, recipeId: 'bg.aurora-band', bbox: props.bbox, zOrder: 0, metadata: { role: 'bg.aurora-band', placeholder: true }, children: [] },
    { ...bgAuroraCornersToIR({ bbox: props.bbox, intensity: "low" } as never, tokens), zOrder: 10 },
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.12 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: props.eyebrow } as never, tokens), zOrder: 20 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.2 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.45 * props.bbox.h }, value: props.headline } as never, tokens), zOrder: 30 },
    { ...typePullquoteSerifToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.72 * props.bbox.h, w: 0.7 * props.bbox.w, h: 0.18 * props.bbox.h }, quote: props.lede } as never, tokens), zOrder: 40 },
    ],
  };
}
