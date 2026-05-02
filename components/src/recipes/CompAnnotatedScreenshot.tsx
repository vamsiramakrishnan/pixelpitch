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
    { ...uiBrowserMacToIR({ bbox: props.bbox, url: props.url } as never, tokens), zOrder: 0 },
    { ...annoNumberedHotspotToIR({ bbox: props.bbox } as never, tokens), zOrder: 10 },
    { ...annoTooltipToIR({ bbox: props.bbox } as never, tokens), zOrder: 20 },
    ],
  };
}
