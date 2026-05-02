// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { dataBarSetHToIR } from './DataBarSetH';
import { dataDonutToIR } from './DataDonut';
import { dataKpiRowToIR } from './DataKpiRow';
import { dataSparklineToIR } from '../primitives/DataSparkline';
import { typeBigNumberGradientToIR } from './TypeBigNumberGradient';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompDataOverviewVersion = '1.0.0';

export interface CompDataOverviewProps {
  bbox: Bbox;
  headline: string;
  kpis: unknown[];
  chart?: Record<string, unknown>;
}

export default function CompDataOverview(_props: CompDataOverviewProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.data-overview"
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

export function compDataOverviewToIR(
  props: CompDataOverviewProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.data-overview',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.data-overview',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.08 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: "Data overview" } as never, tokens), zOrder: 0 },
    { ...typeBigNumberGradientToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.14 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.1 * props.bbox.h }, value: props.headline } as never, tokens), zOrder: 10 },
    { ...dataDonutToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.3 * props.bbox.h, w: 0.2 * props.bbox.w, h: 0.3 * props.bbox.h } } as never, tokens), zOrder: 20 },
    { ...dataBarSetHToIR({ bbox: { x: props.bbox.x + 0.32 * props.bbox.w, y: props.bbox.y + 0.3 * props.bbox.h, w: 0.32 * props.bbox.w, h: 0.3 * props.bbox.h } } as never, tokens), zOrder: 30 },
    { ...dataSparklineToIR({ bbox: { x: props.bbox.x + 0.66 * props.bbox.w, y: props.bbox.y + 0.3 * props.bbox.h, w: 0.27 * props.bbox.w, h: 0.3 * props.bbox.h } } as Parameters<typeof dataSparklineToIR>[0], tokens), recipeId: 'data.sparkline', zOrder: 40 },
    { ...dataKpiRowToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.68 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.22 * props.bbox.h }, kpis: props.kpis } as never, tokens), zOrder: 50 },
    ],
  };
}
