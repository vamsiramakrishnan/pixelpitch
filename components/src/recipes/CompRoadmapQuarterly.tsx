// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { dataConnectorToIR } from './DataConnector';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';
import { uiStepperToIR } from './UiStepper';

export const CompRoadmapQuarterlyVersion = '1.0.0';

export interface CompRoadmapQuarterlyProps {
  bbox: Bbox;
  eyebrow: string;
  quarters: unknown[];
}

export default function CompRoadmapQuarterly(_props: CompRoadmapQuarterlyProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.roadmap-quarterly"
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

export function compRoadmapQuarterlyToIR(
  props: CompRoadmapQuarterlyProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.roadmap-quarterly',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.roadmap-quarterly',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...typeEyebrowRuledToIR({ bbox: props.bbox } as never, tokens), zOrder: 0 },
    { ...dataConnectorToIR({ bbox: props.bbox } as never, tokens), zOrder: 10 },
    { ...uiStepperToIR({ bbox: props.bbox } as never, tokens), zOrder: 20 },
    ],
  };
}
