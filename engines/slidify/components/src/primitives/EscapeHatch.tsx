/**
 * <EscapeHatch> — the first-class metered escape valve.
 *
 * Per CONTRACT-v2 §F. When an LLM (or designer) needs a treatment that no
 * Tier-A primitive or Tier-B recipe can express, it reaches for this atom
 * instead of silently rasterizing in the matcher. The payload is preserved
 * so the harvester can later cluster intents and surface promotion
 * candidates (`report.escapeRate.byIntent` → `atom-proposal` issues).
 *
 * Pipeline:
 *   1. TSX renders a sandboxed preview div so the designer can SEE the
 *      escape (this file).
 *   2. `escapeHatchToIR` emits a `RasterNode` with `pngBase64: ''` and the
 *      full CSS payload + intent in `metadata`.
 *   3. The Python compiler (`slidify/compile_ir.py`) detects
 *      `metadata.role === 'escape-hatch'`, screenshots the payload via
 *      Chromium, embeds the PNG, and stamps the metadata into the slide
 *      shape's extension list for the harvester.
 *   4. `report.escapeRate` (slidify/api.py + slidify/models.py) sums the
 *      escape-hatched bbox area across the deck.
 *
 * Tier:    A (structural primitive — survives trend rotation)
 * Atom id: chrome.escape-hatch
 *
 * Note on the bbox: per CONTRACT-v1 §9.5, escape-hatch rasters are excluded
 * from the `native_area_ratio` denominator — they are deliberate native
 * skips, not failures. The exclusion key is `metadata.excludeFromNativeRatio`.
 */

import type { CSSProperties } from 'react';
import type { Bbox, RasterNode } from '../ir/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EscapeHatchProps {
  bbox: Bbox;
  /** Free-form CSS payload to render. Captured verbatim in IR metadata
   *  so the harvester can cluster identical CSS into atom proposals. */
  cssPayload: string;
  /** Optional HTML body to render inside the styled box. Default empty. */
  body?: string;
  /** Free-text intent label. Clustered later by harvester (e.g.
   *  "non-rect-clip", "complex-text-warp", "ad-hoc-grid"). */
  intent: string;
  /** Optional: the atom the LLM tried first before escaping. Helps the
   *  harvester surface "people keep failing at surf.glass" signals. */
  attempted?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bboxToStyle(bbox: Bbox): CSSProperties {
  return {
    left: bbox.x,
    top: bbox.y,
    width: bbox.w,
    height: bbox.h,
  };
}

/**
 * Parse a free-form CSS payload (e.g. "background: red; clip-path: ...")
 * into a React inline-style object. Anything we can't parse we leave behind
 * — the React preview is best-effort; the source of truth for the Python
 * compiler is the raw string in `cssPayload`.
 */
function parsePayload(css: string): CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const colon = decl.indexOf(':');
    if (colon < 0) continue;
    const prop = decl.slice(0, colon).trim();
    const value = decl.slice(colon + 1).trim();
    if (!prop || !value) continue;
    // CSS kebab-case → React camelCase
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = value;
  }
  return out as CSSProperties;
}

// ---------------------------------------------------------------------------
// React component (HTML preview)
// ---------------------------------------------------------------------------

export default function EscapeHatch(props: EscapeHatchProps) {
  return (
    <div
      data-atom="chrome.escape-hatch"
      data-intent={props.intent}
      data-attempted={props.attempted ?? ''}
      style={{ position: 'absolute', ...bboxToStyle(props.bbox) }}
    >
      <div
        style={{ width: '100%', height: '100%', ...parsePayload(props.cssPayload) }}
        dangerouslySetInnerHTML={{ __html: props.body ?? '' }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

/**
 * Emit a `RasterNode` carrying the escape-hatch payload. The Python
 * compiler picks this up by its `recipeId === 'chrome.escape-hatch'`
 * (or, equivalently, `metadata.role === 'escape-hatch'`), renders the
 * cssPayload via Chromium, and fills in `pngBase64` server-side.
 *
 * `excludeFromNativeRatio: true` flags the raster so it doesn't count
 * against `native_area_ratio` (per CONTRACT-v1 §9.5).
 */
export function escapeHatchToIR(props: EscapeHatchProps): RasterNode {
  return {
    kind: 'raster',
    recipeId: 'chrome.escape-hatch',
    bbox: props.bbox,
    zOrder: 0,
    metadata: {
      role: 'escape-hatch',
      cssPayload: props.cssPayload,
      body: props.body ?? '',
      intent: props.intent,
      attempted: props.attempted ?? null,
      // Excluded from native_area_ratio computations — see CONTRACT-v1 §9.5.
      excludeFromNativeRatio: true,
    },
    pngBase64: '', // Python compiler fills this in via Chromium screenshot.
  };
}
