// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { annoNumberedHotspotToIR } from './AnnoNumberedHotspot';
import { annoTooltipToIR } from './AnnoTooltip';
import { uiBrowserMacToIR } from './UiBrowserMac';

export const CompAnnotatedScreenshotVersion = '1.0.0';

export interface CompAnnotatedScreenshotProps {
  bbox: Bbox;
  url?: string;
  screenshot: string;
  annotations: unknown[];
}

export default function CompAnnotatedScreenshot(_props: CompAnnotatedScreenshotProps): ReactNode {
  // Composite atoms render as a flat HTML preview shell. The IR emitter
  // is the authoritative composition; this preview surfaces the recipeId
  // for designers eyeballing the deck.
  return (
    <div
      data-recipe-id="comp.annotated-screenshot"
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

export function compAnnotatedScreenshotToIR(
  props: CompAnnotatedScreenshotProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  return {
    kind: 'group',
    recipeId: 'comp.annotated-screenshot',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'comp.annotated-screenshot',
      axis: 'comp',
      composite: true,
      version: '1.0.0',
    },
    children: [
    { ...uiBrowserMacToIR({ bbox: { x: props.bbox.x + 0.075 * props.bbox.w, y: props.bbox.y + 0.1 * props.bbox.h, w: 0.85 * props.bbox.w, h: 0.75 * props.bbox.h }, url: props.url } as never, tokens), zOrder: 0 },
    { ...annoNumberedHotspotToIR({ bbox: { x: props.bbox.x + 0.2 * props.bbox.w, y: props.bbox.y + 0.3 * props.bbox.h, w: 0.05 * props.bbox.w, h: 0.07 * props.bbox.h } } as never, tokens), zOrder: 10 },
    { ...annoNumberedHotspotToIR({ bbox: { x: props.bbox.x + 0.55 * props.bbox.w, y: props.bbox.y + 0.5 * props.bbox.h, w: 0.05 * props.bbox.w, h: 0.07 * props.bbox.h } } as never, tokens), zOrder: 20 },
    { ...annoTooltipToIR({ bbox: { x: props.bbox.x + 0.27 * props.bbox.w, y: props.bbox.y + 0.3 * props.bbox.h, w: 0.18 * props.bbox.w, h: 0.07 * props.bbox.h } } as never, tokens), zOrder: 30 },
    ],
  };
}
