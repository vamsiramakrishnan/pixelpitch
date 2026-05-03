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
    { ...surfBentoCellToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.1 * props.bbox.h, w: 0.42 * props.bbox.w, h: 0.8 * props.bbox.h } } as never, tokens), zOrder: 0 },
    { ...surfBentoCellToIR({ bbox: { x: props.bbox.x + 0.52 * props.bbox.w, y: props.bbox.y + 0.1 * props.bbox.h, w: 0.405 * props.bbox.w, h: 0.38 * props.bbox.h } } as never, tokens), zOrder: 10 },
    { ...surfBentoCellToIR({ bbox: { x: props.bbox.x + 0.52 * props.bbox.w, y: props.bbox.y + 0.52 * props.bbox.h, w: 0.193 * props.bbox.w, h: 0.38 * props.bbox.h } } as never, tokens), zOrder: 20 },
    { ...surfBentoCellToIR({ bbox: { x: props.bbox.x + 0.732 * props.bbox.w, y: props.bbox.y + 0.52 * props.bbox.h, w: 0.193 * props.bbox.w, h: 0.38 * props.bbox.h } } as never, tokens), zOrder: 30 },
    { ...uiCodeBlockSyntaxToIR({ bbox: { x: props.bbox.x + 0.1 * props.bbox.w, y: props.bbox.y + 0.13 * props.bbox.h, w: 0.37 * props.bbox.w, h: 0.74 * props.bbox.h }, code: "await convert(\\\"deck.html\\\", \\\"out.pptx\\\")", language: "typescript" } as never, tokens), zOrder: 40 },
    ],
  };
}
