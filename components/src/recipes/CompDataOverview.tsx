// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { dataBarSetHToIR } from './DataBarSetH';
import { dataDonutToIR } from './DataDonut';
import { dataKpiRowToIR } from './DataKpiRow';
import { dataSparklineToIR } from '../primitives/DataSparkline';
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
    { ...typeEyebrowRuledToIR({ bbox: props.bbox } as never, tokens), zOrder: 0 },
    { ...dataDonutToIR({ bbox: props.bbox } as never, tokens), zOrder: 10 },
    { ...dataBarSetHToIR({ bbox: props.bbox } as never, tokens), zOrder: 20 },
    { ...dataSparklineToIR({ bbox: props.bbox } as Parameters<typeof dataSparklineToIR>[0], tokens), recipeId: 'data.sparkline', zOrder: 30 },
    { ...dataKpiRowToIR({ bbox: props.bbox, kpis: props.kpis } as never, tokens), zOrder: 40 },
    ],
  };
}
