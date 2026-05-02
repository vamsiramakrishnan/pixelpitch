// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { decHairlineRuleToIR } from './DecHairlineRule';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';
import { typeNumeralsTabularToIR } from './TypeNumeralsTabular';

export const CompAgenda2colVersion = '1.0.0';

export interface CompAgenda2colProps {
  bbox: Bbox;
  headline: string;
  items: unknown[];
}

export default function CompAgenda2col(_props: CompAgenda2colProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.agenda-2col"
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

export function compAgenda2colToIR(
  props: CompAgenda2colProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.agenda-2col',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.agenda-2col',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.12 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: "Agenda" } as never, tokens), zOrder: 0 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.18 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.18 * props.bbox.h }, value: props.headline } as never, tokens), zOrder: 10 },
    { ...decHairlineRuleToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.4 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.005 * props.bbox.h } } as never, tokens), zOrder: 20 },
    { ...typeNumeralsTabularToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.45 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.4 * props.bbox.h }, digits: "01 · 02 · 03 · 04 · 05 · 06" } as never, tokens), zOrder: 30 },
    ],
  };
}
