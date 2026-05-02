// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { bgAuroraCornersToIR } from './BgAuroraCorners';
import { decNumeralChapterToIR } from './DecNumeralChapter';
import { typeEyebrowRuledToIR } from './TypeEyebrowRuled';

export const CompSectionDividerMeshVersion = '1.0.0';

export interface CompSectionDividerMeshProps {
  bbox: Bbox;
  chapter: string;
  title: string;
}

export default function CompSectionDividerMesh(_props: CompSectionDividerMeshProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.section-divider-mesh"
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

export function compSectionDividerMeshToIR(
  props: CompSectionDividerMeshProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.section-divider-mesh',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.section-divider-mesh',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...bgAuroraCornersToIR({ bbox: props.bbox, intensity: "high" } as never, tokens), zOrder: 0 },
    { ...decNumeralChapterToIR({ bbox: { x: props.bbox.x + 0.05 * props.bbox.w, y: props.bbox.y + 0.15 * props.bbox.h, w: 0.55 * props.bbox.w, h: 0.55 * props.bbox.h }, digits: props.chapter } as never, tokens), zOrder: 10 },
    { ...typeEyebrowRuledToIR({ bbox: { x: props.bbox.x + 0.05 * props.bbox.w, y: props.bbox.y + 0.78 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.04 * props.bbox.h }, label: props.title } as never, tokens), zOrder: 20 },
    ],
  };
}
