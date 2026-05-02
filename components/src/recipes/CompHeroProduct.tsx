// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { bgAuroraCornersToIR } from './BgAuroraCorners';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompHeroProductVersion = '1.0.0';

export interface CompHeroProductProps {
  bbox: Bbox;
  eyebrow: string;
  headline: string;
  cta?: string;
}

export default function CompHeroProduct(_props: CompHeroProductProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.hero-product"
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

export function compHeroProductToIR(
  props: CompHeroProductProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.hero-product',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.hero-product',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...bgAuroraCornersToIR({ bbox: props.bbox, intensity: "med" } as never, tokens), zOrder: 0 },
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.1 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: props.eyebrow } as never, tokens), zOrder: 10 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.2 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.45 * props.bbox.h }, value: props.headline } as never, tokens), zOrder: 20 },
    ],
  };
}
