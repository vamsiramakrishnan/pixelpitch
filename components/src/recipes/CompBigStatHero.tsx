// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { dataDeltaBadgeToIR } from './DataDeltaBadge';
import { surfCardDepthToIR } from './SurfCardDepth';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompBigStatHeroVersion = '1.0.0';

export interface CompBigStatHeroProps {
  bbox: Bbox;
  eyebrow: string;
  value: string;
  unit?: string;
  headline: string;
  delta?: string;
}

export default function CompBigStatHero(_props: CompBigStatHeroProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.big-stat-hero"
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

export function compBigStatHeroToIR(
  props: CompBigStatHeroProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.big-stat-hero',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.big-stat-hero',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typeEyebrowRuledToIR({ bbox: props.bbox } as never, tokens), zOrder: 0 },
    { ...typeBigNumberGradientToIR({ bbox: props.bbox, gradient: "tokens.gradient.accent-grad" } as never, tokens), zOrder: 10 },
    { ...surfCardDepthToIR({ bbox: props.bbox } as never, tokens), zOrder: 20 },
    { ...dataDeltaBadgeToIR({ bbox: props.bbox } as never, tokens), zOrder: 30 },
    ],
  };
}
