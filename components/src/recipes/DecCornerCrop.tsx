// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import FrameSafeArea, { frameSafeAreaToIR } from '../primitives/FrameSafeArea';

export const DecCornerCropVersion = '1.0.0';

export interface DecCornerCropProps {
  bbox: Bbox;
  corners?: 'tl' | 'tr' | 'bl' | 'br' | 'all';
  sizePx?: number;
  color?: Color;
}

export default function DecCornerCrop(props: DecCornerCropProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="dec.corner-crop" data-recipe-version="1.0.0">
      <FrameSafeArea {...({ bbox: props.bbox } as unknown as ComponentProps<typeof FrameSafeArea>)} />
    </div>
  );
}

export function decCornerCropToIR(
  props: DecCornerCropProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof frameSafeAreaToIR>[0];
  const inner = frameSafeAreaToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'dec.corner-crop',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'dec.corner-crop',
      axis: 'dec',
      primitive: 'frame.safe-area',
      version: '1.0.0',
      corners: props.corners ?? undefined,
      sizePx: props.sizePx ?? undefined,
      color: props.color ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
