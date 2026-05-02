// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import AnnotationBadge, { annotationBadgeToIR } from '../primitives/AnnotationBadge';

export const AnnoCalloutBubbleVersion = '1.0.0';

export interface AnnoCalloutBubbleProps {
  bbox: Bbox;
  body: string;
  pointerSide?: 'top' | 'right' | 'bottom' | 'left';
  pointerOffset?: number;
  bgColor?: Color;
}

export default function AnnoCalloutBubble(props: AnnoCalloutBubbleProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="anno.callout-bubble" data-recipe-version="1.0.0">
      <AnnotationBadge {...({ bbox: props.bbox, body: props.body, kind: 'pill' } as unknown as ComponentProps<typeof AnnotationBadge>)} />
    </div>
  );
}

export function annoCalloutBubbleToIR(
  props: AnnoCalloutBubbleProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, body: props.body, kind: 'pill' } as unknown as Parameters<typeof annotationBadgeToIR>[0];
  const inner = annotationBadgeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'anno.callout-bubble',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'anno.callout-bubble',
      axis: 'anno',
      primitive: 'annotation.badge',
      version: '1.0.0',
      pointerSide: props.pointerSide ?? undefined,
      pointerOffset: props.pointerOffset ?? undefined,
      bgColor: props.bgColor ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
