// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Fill, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import AnnotationBadge, { annotationBadgeToIR } from '../primitives/AnnotationBadge';

export const SurfTapeBandVersion = '1.0.0';

export interface SurfTapeBandProps {
  bbox: Bbox;
  skewDeg?: number;
  fill?: Fill;
  label?: string;
}

export default function SurfTapeBand(props: SurfTapeBandProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="surf.tape-band" data-recipe-version="1.0.0">
      <AnnotationBadge {...({ bbox: props.bbox, label: props.label, kind: 'sticker' } as unknown as ComponentProps<typeof AnnotationBadge>)} />
    </div>
  );
}

export function surfTapeBandToIR(
  props: SurfTapeBandProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, label: props.label, kind: 'sticker' } as unknown as Parameters<typeof annotationBadgeToIR>[0];
  const inner = annotationBadgeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'surf.tape-band',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surf.tape-band',
      axis: 'surf',
      primitive: 'annotation.badge',
      version: '1.0.0',
      skewDeg: props.skewDeg ?? undefined,
      fill: props.fill ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
