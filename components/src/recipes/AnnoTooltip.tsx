// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import AnnotationLeaderLine, { annotationLeaderLineToIR } from '../primitives/AnnotationLeaderLine';

export const AnnoTooltipVersion = '1.0.0';

export interface AnnoTooltipProps {
  bbox: Bbox;
  body: string;
  leaderTo: Record<string, unknown>;
  bgColor?: Color;
}

export default function AnnoTooltip(props: AnnoTooltipProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="anno.tooltip" data-recipe-version="1.0.0">
      <AnnotationLeaderLine {...({ bbox: props.bbox } as unknown as ComponentProps<typeof AnnotationLeaderLine>)} />
    </div>
  );
}

export function annoTooltipToIR(
  props: AnnoTooltipProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof annotationLeaderLineToIR>[0];
  const inner = annotationLeaderLineToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'anno.tooltip',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'anno.tooltip',
      axis: 'anno',
      primitive: 'annotation.leader-line',
      version: '1.0.0',
      body: props.body ?? undefined,
      leaderTo: props.leaderTo ?? undefined,
      bgColor: props.bgColor ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
