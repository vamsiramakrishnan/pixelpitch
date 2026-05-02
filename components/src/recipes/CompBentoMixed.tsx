// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { surfBentoCellToIR } from './SurfBentoCell';
import { uiCodeBlockSyntaxToIR } from './UiCodeBlockSyntax';

export const CompBentoMixedVersion = '1.0.0';

export interface CompBentoMixedProps {
  bbox: Bbox;
  cells: unknown[];
}

export default function CompBentoMixed(_props: CompBentoMixedProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.bento-mixed"
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

export function compBentoMixedToIR(
  props: CompBentoMixedProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.bento-mixed',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.bento-mixed',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...surfBentoCellToIR({ bbox: props.bbox, cells: props.cells } as never, tokens), zOrder: 0 },
    { kind: 'group' as const, recipeId: 'surf.glass', bbox: props.bbox, zOrder: 10, metadata: { role: 'surf.glass', placeholder: true }, children: [] },
    { ...uiCodeBlockSyntaxToIR({ bbox: props.bbox } as never, tokens), zOrder: 20 },
    { kind: 'group' as const, recipeId: 'ui.avatar-cluster', bbox: props.bbox, zOrder: 30, metadata: { role: 'ui.avatar-cluster', placeholder: true }, children: [] },
    ],
  };
}
