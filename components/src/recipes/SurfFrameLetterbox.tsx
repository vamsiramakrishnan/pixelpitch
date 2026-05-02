// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, Color, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import FrameLetterbox, { frameLetterboxToIR } from '../primitives/FrameLetterbox';

export const SurfFrameLetterboxVersion = '1.0.0';

export interface SurfFrameLetterboxProps {
  bbox: Bbox;
  bandPx?: number;
  bgColor?: Color;
}

export default function SurfFrameLetterbox(props: SurfFrameLetterboxProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="surf.frame-letterbox" data-recipe-version="1.0.0">
      <FrameLetterbox {...({ bbox: props.bbox } as unknown as ComponentProps<typeof FrameLetterbox>)} />
    </div>
  );
}

export function surfFrameLetterboxToIR(
  props: SurfFrameLetterboxProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Recipe-level props
  // beyond bbox are intentionally not forwarded — primitive shapes are
  // hand-tuned and the recipe row's prop set is for the matcher / LLM.
  const primitiveArgs = { bbox: props.bbox } as unknown as Parameters<typeof frameLetterboxToIR>[0];
  const inner = frameLetterboxToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'surf.frame-letterbox',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'surf.frame-letterbox',
      axis: 'surf',
      primitive: 'frame.letterbox',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
