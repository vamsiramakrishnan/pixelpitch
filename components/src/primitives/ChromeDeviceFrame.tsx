/**
 * <ChromeDeviceFrame> — Tier-A primitive (`chrome.device-frame`).
 *
 * Phone or laptop hardware bezel surrounding a screenshot. Used by
 * `ui.device-phone` and `ui.device-laptop`. The screenshot region is
 * exposed as a PictureNode so reverse-mapping recovers the source URL;
 * the bezel is a stack of rounded-rect ShapeNodes.
 *
 * Composition (z-order bottom → top):
 *   - `chrome.device-frame.bezel`     ShapeNode (outer rounded-rect, dark fill)
 *   - `chrome.device-frame.screen`    PictureNode (the screenshot, clipped)
 *                                     OR ShapeNode if no src
 *   - `chrome.device-frame.notch`     ShapeNode (phone only, optional)
 *   - `chrome.device-frame.base`      ShapeNode (laptop only, hinge bar)
 *
 * F1 deps: ClipPath rounded-rect (PictureNode clip), multi-shadow.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  GroupNodeT,
  Node as IRNode,
  PictureNode,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type DeviceKind = 'phone' | 'laptop';

export interface ChromeDeviceFrameProps {
  bbox: Bbox;
  /** Phone or laptop. */
  device: DeviceKind;
  /** Optional screenshot URL / data: URI. */
  screenshotSrc?: string;
  /** Phone only — render a notch. Default `true`. */
  notch?: boolean;
}

const PHONE_BEZEL = 8;
const LAPTOP_BEZEL = 14;
const LAPTOP_BASE = 18;

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function ChromeDeviceFrame(props: ChromeDeviceFrameProps): ReactNode {
  const t = defaultTokens;
  const isPhone = props.device === 'phone';
  const bezelColor = colorToCss(t.palette('ink-1'));
  const placeholderColor = colorToCss(t.palette('surface-3'));
  const bezelPad = isPhone ? PHONE_BEZEL : LAPTOP_BEZEL;
  return (
    <div
      data-recipe-id="chrome.device-frame"
      data-device={props.device}
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: bezelColor,
        borderRadius: isPhone ? 36 : 12,
        padding: bezelPad,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '100%',
          height: isPhone ? '100%' : `calc(100% - ${LAPTOP_BASE}px)`,
          background: props.screenshotSrc ? `url(${props.screenshotSrc}) center/cover` : placeholderColor,
          borderRadius: isPhone ? 28 : 6,
        }}
      />
      {isPhone && props.notch !== false && (
        <span
          style={{
            position: 'absolute',
            top: 4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 96,
            height: 18,
            background: bezelColor,
            borderRadius: 9999,
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function chromeDeviceFrameToIR(
  props: ChromeDeviceFrameProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const isPhone = props.device === 'phone';
  const children: IRNode[] = [];

  // Bezel
  const bezel: ShapeNode = {
    kind: 'shape',
    recipeId: 'chrome.device-frame.bezel',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'device-bezel', device: props.device },
    shape: 'rounded-rect',
    borderRadiusPx: isPhone ? 36 : 12,
    fill: { kind: 'solid', color: tokens.palette('ink-1') },
  };
  children.push(bezel);

  // Screen
  const bezelPad = isPhone ? PHONE_BEZEL : LAPTOP_BEZEL;
  const baseH = isPhone ? 0 : LAPTOP_BASE;
  const screenBbox: Bbox = {
    x: props.bbox.x + bezelPad,
    y: props.bbox.y + bezelPad,
    w: Math.max(0, props.bbox.w - bezelPad * 2),
    h: Math.max(0, props.bbox.h - bezelPad * 2 - baseH),
  };
  if (props.screenshotSrc) {
    const screen: PictureNode = {
      kind: 'picture',
      recipeId: 'chrome.device-frame.screen',
      bbox: screenBbox,
      zOrder: 10,
      metadata: { role: 'device-screen' },
      src: props.screenshotSrc,
      alt: '',
      clipPath: { kind: 'rounded-rect', radiusPx: isPhone ? 28 : 6, insetPx: 0 },
    };
    children.push(screen);
  } else {
    const placeholder: ShapeNode = {
      kind: 'shape',
      recipeId: 'chrome.device-frame.screen',
      bbox: screenBbox,
      zOrder: 10,
      metadata: { role: 'device-screen', placeholder: true },
      shape: 'rounded-rect',
      borderRadiusPx: isPhone ? 28 : 6,
      fill: { kind: 'solid', color: tokens.palette('surface-3') },
    };
    children.push(placeholder);
  }

  // Phone notch
  if (isPhone && props.notch !== false) {
    const notchW = 96;
    const notchH = 18;
    const notch: ShapeNode = {
      kind: 'shape',
      recipeId: 'chrome.device-frame.notch',
      bbox: {
        x: props.bbox.x + (props.bbox.w - notchW) / 2,
        y: props.bbox.y + 4,
        w: notchW,
        h: notchH,
      },
      zOrder: 20,
      metadata: { role: 'device-notch' },
      shape: 'rounded-rect',
      borderRadiusPx: 9999,
      fill: { kind: 'solid', color: tokens.palette('ink-1') },
    };
    children.push(notch);
  }

  // Laptop hinge / base bar.
  if (!isPhone) {
    const base: ShapeNode = {
      kind: 'shape',
      recipeId: 'chrome.device-frame.base',
      bbox: {
        x: props.bbox.x,
        y: props.bbox.y + props.bbox.h - LAPTOP_BASE,
        w: props.bbox.w,
        h: LAPTOP_BASE,
      },
      zOrder: 20,
      metadata: { role: 'device-base' },
      shape: 'rect',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: tokens.palette('ink-2') },
    };
    children.push(base);
  }

  return {
    kind: 'group',
    recipeId: 'chrome.device-frame',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'chrome.device-frame',
      axis: 'chrome',
      device: props.device,
      hasScreenshot: !!props.screenshotSrc,
      notch: isPhone ? props.notch !== false : undefined,
    },
    children,
  };
}
