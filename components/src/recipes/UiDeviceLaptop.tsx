// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.
// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.

import type { ComponentProps, ReactNode } from 'react';
import type { Bbox, GroupNodeT } from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import ChromeDeviceFrame, { chromeDeviceFrameToIR } from '../primitives/ChromeDeviceFrame';

export const UiDeviceLaptopVersion = '1.0.0';

export interface UiDeviceLaptopProps {
  bbox: Bbox;
  screenshotSrc?: string;
}

export default function UiDeviceLaptop(props: UiDeviceLaptopProps): ReactNode {
  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper
  // around the underlying primitive. Visual fidelity comes from the
  // primitive; this wrapper exists so the IR carries the atom id.
  return (
    <div data-recipe-id="ui.device-laptop" data-recipe-version="1.0.0">
      <ChromeDeviceFrame {...({ bbox: props.bbox, screenshotSrc: props.screenshotSrc, device: 'laptop' } as unknown as ComponentProps<typeof ChromeDeviceFrame>)} />
    </div>
  );
}

export function uiDeviceLaptopToIR(
  props: UiDeviceLaptopProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  // Delegate visual composition to the primitive, then re-stamp recipeId
  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are
  // the intersection of recipe props and the primitive's known prop set;
  // unrecognized recipe props ride along inside metadata so reverse-mapping
  // can still recover them.
  const primitiveArgs = { bbox: props.bbox, screenshotSrc: props.screenshotSrc, device: 'laptop' } as unknown as Parameters<typeof chromeDeviceFrameToIR>[0];
  const inner = chromeDeviceFrameToIR(primitiveArgs, tokens);
  return {
    kind: 'group',
    recipeId: 'ui.device-laptop',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'ui.device-laptop',
      axis: 'ui',
      primitive: 'chrome.device-frame',
      version: '1.0.0',
    },
    children: [{ ...inner, zOrder: 0 }],
  };
}
