// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import SlotCode, { slotCodeToIR } from '../primitives/SlotCode';

export const UiCodeBlockSyntaxVersion = '1.0.0';

export interface UiCodeBlockSyntaxProps {
  bbox: Bbox;
  code: string;
  language: string;
  showLineNumbers?: boolean;
  theme?: 'dark' | 'light';
}

export default function UiCodeBlockSyntax(props: UiCodeBlockSyntaxProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="ui.code-block-syntax" data-recipe-version="1.0.0">
      <SlotCode {...({ bbox: props.bbox, code: props.code, language: props.language } as unknown as ComponentProps<typeof SlotCode>)} />
    </div>
  );
}

export function uiCodeBlockSyntaxToIR(
  props: UiCodeBlockSyntaxProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, code: props.code, language: props.language } as unknown as Parameters<typeof slotCodeToIR>[0];
  const inner = slotCodeToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'ui.code-block-syntax',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'ui.code-block-syntax',
      axis: 'ui',
      primitive: 'slot.code',
      version: '1.0.0',
      showLineNumbers: props.showLineNumbers ?? undefined,
      theme: props.theme ?? undefined,
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
