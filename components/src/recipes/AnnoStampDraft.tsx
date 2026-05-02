// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import AnnotationBadge, { annotationBadgeToIR } from '../primitives/AnnotationBadge';

export const AnnoStampDraftVersion = '1.0.0';

export interface AnnoStampDraftProps {
  bbox: Bbox;
  rotateDeg?: number;
}

export default function AnnoStampDraft(props: AnnoStampDraftProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="anno.stamp-draft" data-recipe-version="1.0.0">
      <AnnotationBadge {...({ bbox: props.bbox, rotateDeg: props.rotateDeg ?? -12, kind: 'stamp', tone: 'danger', label: 'DRAFT' } as unknown as ComponentProps<typeof AnnotationBadge>)} />
    </div>
  );
}

export function annoStampDraftToIR(
  props: AnnoStampDraftProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, rotateDeg: props.rotateDeg ?? -12, kind: 'stamp', tone: 'danger', label: 'DRAFT' } as unknown as Parameters<typeof annotationBadgeToIR>[0];
  const inner = annotationBadgeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'anno.stamp-draft',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'anno.stamp-draft',
      axis: 'anno',
      primitive: 'annotation.badge',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
