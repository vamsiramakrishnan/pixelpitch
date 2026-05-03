// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { slotNumeralToIR } from '../primitives/SlotNumeral';
import { surfaceShapeFillToIR } from '../primitives/SurfaceShapeFill';

export const AnnoNumberedHotspotVersion = '1.0.0';

export interface AnnoNumberedHotspotProps {
  bbox: Bbox;
  n: string;
  anchor: Record<string, unknown>;
  bgColor?: Color;
}

export default function AnnoNumberedHotspot(_props: AnnoNumberedHotspotProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="anno.numbered-hotspot"
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

export function annoNumberedHotspotToIR(
  props: AnnoNumberedHotspotProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'anno.numbered-hotspot',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'anno.numbered-hotspot',
      axis: 'anno',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...surfaceShapeFillToIR({ bbox: { x: props.bbox.x + 0 * props.bbox.w, y: props.bbox.y + 0 * props.bbox.h, w: 1 * props.bbox.w, h: 1 * props.bbox.h }, shape: "oval", bgColor: props.bgColor } as Parameters<typeof surfaceShapeFillToIR>[0], tokens), recipeId: 'surface.shape-fill', zOrder: 0 },
    { ...slotNumeralToIR({ bbox: { x: props.bbox.x + 0 * props.bbox.w, y: props.bbox.y + 0.05 * props.bbox.h, w: 1 * props.bbox.w, h: 0.95 * props.bbox.h }, digits: props.n, scale: "numeral-md" } as Parameters<typeof slotNumeralToIR>[0], tokens), recipeId: 'slot.numeral', zOrder: 10 },
    ],
  };
}
