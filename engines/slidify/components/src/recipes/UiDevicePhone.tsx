// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import ChromeDeviceFrame, { chromeDeviceFrameToIR } from '../primitives/ChromeDeviceFrame';

export const UiDevicePhoneVersion = '1.0.0';

export interface UiDevicePhoneProps {
  bbox: Bbox;
  screenshotSrc?: string;
  notch?: boolean;
}

export default function UiDevicePhone(props: UiDevicePhoneProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  // Bind a local `tokens` so default-expr lookups (tokens.gradient(...))
  // resolve in this scope; the IR helper below uses its parameter.
  const tokens = defaultTokens;
  return (
    <div data-recipe-id="ui.device-phone" data-recipe-version="1.0.0">
      <ChromeDeviceFrame {...({ bbox: props.bbox, screenshotSrc: props.screenshotSrc, notch: props.notch ?? true, device: 'phone' } as unknown as ComponentProps<typeof ChromeDeviceFrame>)} />
    </div>
  );
}

export function uiDevicePhoneToIR(
  props: UiDevicePhoneProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, screenshotSrc: props.screenshotSrc, notch: props.notch ?? true, device: 'phone' } as unknown as Parameters<typeof chromeDeviceFrameToIR>[0];
  const inner = chromeDeviceFrameToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'ui.device-phone',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'ui.device-phone',
      axis: 'ui',
      primitive: 'chrome.device-frame',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
