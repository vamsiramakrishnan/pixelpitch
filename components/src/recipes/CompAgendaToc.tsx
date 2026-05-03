// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { decHairlineRuleToIR } from './DecHairlineRule';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';
import { typeNumeralsTabularToIR } from './TypeNumeralsTabular';

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
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.12 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: "Today" } as never, tokens), zOrder: 0 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.18 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.16 * props.bbox.h }, value: "What we will cover" } as never, tokens), zOrder: 10 },
    { ...decHairlineRuleToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.42 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.005 * props.bbox.h } } as never, tokens), zOrder: 20 },
    ...((props.items ?? []) as readonly unknown[]).map((__item, i, __arr) => { const n = __arr.length || 1; return { ...typeNumeralsTabularToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + (0.46 + i * 0.075) * props.bbox.h, w: 0.1 * props.bbox.w, h: 0.06 * props.bbox.h }, digits: (__item as Record<string, unknown> | undefined)?.num } as never, tokens), zOrder: 30 + i }; }),
    ...((props.items ?? []) as readonly unknown[]).map((__item, i, __arr) => { const n = __arr.length || 1; return { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.18 * props.bbox.w, y: props.bbox.y + (0.46 + i * 0.075) * props.bbox.h, w: 0.75 * props.bbox.w, h: 0.06 * props.bbox.h }, label: (__item as Record<string, unknown> | undefined)?.title } as never, tokens), zOrder: 40 + i }; }),
    ],
  };
}
