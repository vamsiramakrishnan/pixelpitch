/**
 * <ChromeWindowFrame> — Tier-A primitive (`chrome.window-frame`).
 *
 * A browser / terminal / minimal window-chrome frame: title bar with
 * traffic-light or windows-control glyphs, optional URL or prompt line,
 * and a body region. Backs `ui.browser-mac`, `ui.browser-win`,
 * `ui.browser-minimal`, `ui.terminal-window`.
 *
 * Composition (z-order bottom → top):
 *   - `chrome.window-frame.surface` ShapeNode (rounded-rect background)
 *   - `chrome.window-frame.titlebar`ShapeNode (top strip, slight tint)
 *   - `chrome.window-frame.controls` GroupNode of small dots / squares
 *   - `chrome.window-frame.url`     TextNode (omitted for `terminal`)
 *   - `chrome.window-frame.body`    TextNode (terminal/output text)
 *
 * F1 deps: none (rect + text + small dot shapes).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  ShapeNode,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type WindowChromeKind = 'mac' | 'win' | 'minimal' | 'terminal';
export type WindowFrameTheme = 'dark' | 'light';

export interface ChromeWindowFrameProps {
  bbox: Bbox;
  /** Chrome style. Optional — defaults to 'minimal'. */
  chrome?: WindowChromeKind;
  /** URL displayed in the address strip (browsers). */
  url?: string;
  /** Body text — terminal output, code, or empty. */
  body?: string;
  /** Frame theme. Default inferred from chrome (`terminal`/`mac`=dark). */
  theme?: WindowFrameTheme;
}

interface FrameTokens {
  surface: Color;
  titleBar: Color;
  text: Color;
  dim: Color;
  red: Color;
  yellow: Color;
  green: Color;
}

function frameTokens(t: TokensApi, theme: WindowFrameTheme): FrameTokens {
  if (theme === 'light') {
    return {
      surface: t.palette('surface-1'),
      titleBar: t.palette('surface-2'),
      text: t.palette('ink-1'),
      dim: t.palette('ink-3'),
      red: t.palette('danger'),
      yellow: t.palette('warn'),
      green: t.palette('success'),
    };
  }
  return {
    surface: t.palette('surface-2'),
    titleBar: t.palette('surface-3'),
    text: t.palette('ink-1'),
    dim: t.palette('ink-3'),
    red: t.palette('danger'),
    yellow: t.palette('warn'),
    green: t.palette('success'),
  };
}

const TITLEBAR_H = 28;

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function ChromeWindowFrame(props: ChromeWindowFrameProps): ReactNode {
  const t = defaultTokens;
  const chrome: WindowChromeKind = props.chrome ?? 'minimal';
  const theme: WindowFrameTheme = props.theme ?? (chrome === 'terminal' ? 'dark' : 'dark');
  const f = frameTokens(t, theme);
  const showUrl = chrome !== 'terminal' && (props.url !== undefined);
  return (
    <div
      data-recipe-id="chrome.window-frame"
      data-chrome={chrome}
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: colorToCss(f.surface),
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: chrome === 'terminal' ? t.fonts.mono : t.fonts.sans,
        color: colorToCss(f.text),
      }}
    >
      <div
        style={{
          height: TITLEBAR_H,
          background: colorToCss(f.titleBar),
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px',
        }}
      >
        {chrome === 'mac' && (
          <>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: colorToCss(f.red) }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: colorToCss(f.yellow) }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: colorToCss(f.green) }} />
          </>
        )}
        {chrome === 'win' && (
          <>
            <span style={{ marginLeft: 'auto', width: 14, height: 14, background: colorToCss(f.dim) }} />
            <span style={{ width: 14, height: 14, background: colorToCss(f.dim) }} />
            <span style={{ width: 14, height: 14, background: colorToCss(f.red) }} />
          </>
        )}
        {showUrl && (
          <span style={{ marginLeft: 12, fontSize: 12, color: colorToCss(f.dim) }}>{props.url}</span>
        )}
      </div>
      <div style={{ padding: 12, fontSize: 12, whiteSpace: 'pre-wrap' }}>{props.body ?? ''}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function chromeWindowFrameToIR(
  props: ChromeWindowFrameProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const chrome: WindowChromeKind = props.chrome ?? 'minimal';
  const theme: WindowFrameTheme = props.theme ?? 'dark';
  const f = frameTokens(tokens, theme);
  const children: IRNode[] = [];

  const surface: ShapeNode = {
    kind: 'shape',
    recipeId: 'chrome.window-frame.surface',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'window-surface', chrome, theme },
    shape: 'rounded-rect',
    borderRadiusPx: 12,
    fill: { kind: 'solid', color: f.surface },
  };
  children.push(surface);

  const titleBbox: Bbox = {
    x: props.bbox.x,
    y: props.bbox.y,
    w: props.bbox.w,
    h: TITLEBAR_H,
  };
  const titleBar: ShapeNode = {
    kind: 'shape',
    recipeId: 'chrome.window-frame.titlebar',
    bbox: titleBbox,
    zOrder: 10,
    metadata: { role: 'window-titlebar' },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: { kind: 'solid', color: f.titleBar },
  };
  children.push(titleBar);

  // Controls (traffic lights for mac, square buttons for win, nothing for minimal/terminal).
  const controlChildren: ShapeNode[] = [];
  if (chrome === 'mac') {
    const colors = [f.red, f.yellow, f.green];
    colors.forEach((c, i) => {
      controlChildren.push({
        kind: 'shape',
        recipeId: `chrome.window-frame.dot-${i + 1}`,
        bbox: { x: props.bbox.x + 12 + i * 18, y: props.bbox.y + 8, w: 12, h: 12 },
        zOrder: 20 + i,
        metadata: { role: 'window-control', kind: 'mac', index: i },
        shape: 'oval',
        borderRadiusPx: 0,
        fill: { kind: 'solid', color: c },
      });
    });
  } else if (chrome === 'win') {
    const dims = [f.dim, f.dim, f.red];
    dims.forEach((c, i) => {
      controlChildren.push({
        kind: 'shape',
        recipeId: `chrome.window-frame.btn-${i + 1}`,
        bbox: {
          x: props.bbox.x + props.bbox.w - 16 - (2 - i) * 22,
          y: props.bbox.y + 7,
          w: 14,
          h: 14,
        },
        zOrder: 20 + i,
        metadata: { role: 'window-control', kind: 'win', index: i },
        shape: 'rect',
        borderRadiusPx: 0,
        fill: { kind: 'solid', color: c },
      });
    });
  }
  children.push(...controlChildren);

  // URL strip — text inside the title bar.
  if (chrome !== 'terminal' && props.url !== undefined) {
    const urlBbox: Bbox = {
      x: props.bbox.x + 80,
      y: props.bbox.y,
      w: Math.max(0, props.bbox.w - 160),
      h: TITLEBAR_H,
    };
    const url: TextNode = {
      kind: 'text',
      recipeId: 'chrome.window-frame.url',
      bbox: urlBbox,
      zOrder: 30,
      metadata: { role: 'window-url' },
      paragraphs: [{
        runs: [{
          text: props.url,
          fontSizePx: 12,
          fontWeight: 500,
          fontFamily: tokens.fonts.sans,
          color: f.dim,
          italic: false,
          underline: false,
        }],
        align: 'left',
      }],
    };
    children.push(url);
  }

  // Body text (terminal / code / blank).
  if (props.body) {
    const bodyBbox: Bbox = {
      x: props.bbox.x + 12,
      y: props.bbox.y + TITLEBAR_H + 12,
      w: Math.max(0, props.bbox.w - 24),
      h: Math.max(0, props.bbox.h - TITLEBAR_H - 24),
    };
    const body: TextNode = {
      kind: 'text',
      recipeId: 'chrome.window-frame.body',
      bbox: bodyBbox,
      zOrder: 40,
      metadata: { role: 'window-body' },
      paragraphs: [{
        runs: [{
          text: props.body,
          fontSizePx: 12,
          fontWeight: 400,
          fontFamily: chrome === 'terminal' ? tokens.fonts.mono : tokens.fonts.mono,
          color: f.text,
          italic: false,
          underline: false,
        }],
        align: 'left',
      }],
    };
    children.push(body);
  }

  return {
    kind: 'group',
    recipeId: 'chrome.window-frame',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'chrome.window-frame',
      axis: 'chrome',
      chrome,
      theme,
    },
    children,
  };
}
