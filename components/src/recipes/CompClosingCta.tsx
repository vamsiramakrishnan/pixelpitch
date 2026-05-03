// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { bgAuroraCornersToIR } from './BgAuroraCorners';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompClosingCtaVersion = '1.0.0';

export interface CompClosingCtaProps {
  bbox: Bbox;
  headline: string;
  cta?: string;
}

export default function CompClosingCta(_props: CompClosingCtaProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.closing-cta"
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

export function compClosingCtaToIR(
  props: CompClosingCtaProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.closing-cta',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.closing-cta',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...bgAuroraCornersToIR({ bbox: props.bbox, intensity: "high" } as never, tokens), zOrder: 0 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.32 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.36 * props.bbox.h }, value: props.headline } as never, tokens), zOrder: 10 },
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.74 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: props.cta } as never, tokens), zOrder: 20 },
    ],
  };
}
