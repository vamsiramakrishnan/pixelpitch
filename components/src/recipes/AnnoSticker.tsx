// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import AnnotationBadge, { annotationBadgeToIR } from '../primitives/AnnotationBadge';

export const AnnoStickerVersion = '1.0.0';

export interface AnnoStickerProps {
  bbox: Bbox;
  body: string;
  rotateDeg?: number;
  bgColor?: Color;
}

export default function AnnoSticker(props: AnnoStickerProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="anno.sticker" data-recipe-version="1.0.0">
      <AnnotationBadge {...({ bbox: props.bbox, body: props.body, rotateDeg: props.rotateDeg ?? -4, kind: 'sticker' } as unknown as ComponentProps<typeof AnnotationBadge>)} />
    </div>
  );
}

export function annoStickerToIR(
  props: AnnoStickerProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, body: props.body, rotateDeg: props.rotateDeg ?? -4, kind: 'sticker' } as unknown as Parameters<typeof annotationBadgeToIR>[0];
  const inner = annotationBadgeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'anno.sticker',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'anno.sticker',
      axis: 'anno',
      primitive: 'annotation.badge',
      version: '1.0.0',
      bgColor: props.bgColor ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
