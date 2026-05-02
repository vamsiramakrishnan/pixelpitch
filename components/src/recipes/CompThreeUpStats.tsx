// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { dataDeltaBadgeToIR } from './DataDeltaBadge';
import { surfCardRaisedToIR } from './SurfCardRaised';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeBigNumberToIR } from './TypeBigNumber';
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
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.1 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: props.eyebrow } as never, tokens), zOrder: 0 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.18 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.1 * props.bbox.h }, value: props.headline } as never, tokens), zOrder: 10 },
    ...((props.kpis ?? []) as readonly unknown[]).map((__item, i, __arr) => { const n = __arr.length || 1; return { ...surfCardRaisedToIR({ bbox: { x: props.bbox.x + (0.075 + i * 0.295) * props.bbox.w, y: props.bbox.y + 0.4 * props.bbox.h, w: 0.265 * props.bbox.w, h: 0.45 * props.bbox.h } } as never, tokens), zOrder: 20 + i }; }),
    ...((props.kpis ?? []) as readonly unknown[]).map((__item, i, __arr) => { const n = __arr.length || 1; return { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + (0.10 + i * 0.295) * props.bbox.w, y: props.bbox.y + 0.44 * props.bbox.h, w: 0.215 * props.bbox.w, h: 0.04 * props.bbox.h }, label: (__item as Record<string, unknown> | undefined)?.label } as never, tokens), zOrder: 30 + i }; }),
    ...((props.kpis ?? []) as readonly unknown[]).map((__item, i, __arr) => { const n = __arr.length || 1; return { ...typeBigNumberToIR({ bbox: { x: props.bbox.x + (0.10 + i * 0.295) * props.bbox.w, y: props.bbox.y + 0.5 * props.bbox.h, w: 0.215 * props.bbox.w, h: 0.2 * props.bbox.h }, value: (__item as Record<string, unknown> | undefined)?.value } as never, tokens), zOrder: 40 + i }; }),
    ...((props.kpis ?? []) as readonly unknown[]).map((__item, i, __arr) => { const n = __arr.length || 1; return { ...dataDeltaBadgeToIR({ bbox: { x: props.bbox.x + (0.10 + i * 0.295) * props.bbox.w, y: props.bbox.y + 0.74 * props.bbox.h, w: 0.215 * props.bbox.w, h: 0.06 * props.bbox.h }, value: (__item as Record<string, unknown> | undefined)?.delta } as never, tokens), zOrder: 50 + i }; }),
    ],
  };
}
