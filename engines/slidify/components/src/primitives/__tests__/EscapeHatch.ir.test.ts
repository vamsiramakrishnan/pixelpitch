/**
 * IR-shape contract for the EscapeHatch primitive.
 *
 * Asserts the wire format the Python compiler depends on. Every field below
 * is load-bearing: dropping any of them would silently break the harvester
 * or the report.escapeRate metering.
 */

import { describe, expect, it } from 'vitest';

import { escapeHatchToIR, type EscapeHatchProps } from '../EscapeHatch';
import { Node as NodeSchema } from '../../ir/schema';

const baseProps: EscapeHatchProps = {
  bbox: { x: 100, y: 100, w: 800, h: 200 },
  cssPayload: 'background: radial-gradient(circle, #a78bfa, #1e1b4b); clip-path: polygon(50% 0, 100% 100%, 0 100%);',
  intent: 'non-rect-clip',
  attempted: 'surf.glass',
};

describe('escapeHatchToIR', () => {
  it('emits a raster node with recipeId chrome.escape-hatch', () => {
    const node = escapeHatchToIR(baseProps);
    expect(node.kind).toBe('raster');
    expect(node.recipeId).toBe('chrome.escape-hatch');
  });

  it('preserves the bbox verbatim', () => {
    const node = escapeHatchToIR(baseProps);
    expect(node.bbox).toEqual({ x: 100, y: 100, w: 800, h: 200 });
  });

  it('captures cssPayload, intent, and attempted in metadata', () => {
    const node = escapeHatchToIR(baseProps);
    expect(node.metadata.role).toBe('escape-hatch');
    expect(node.metadata.cssPayload).toBe(baseProps.cssPayload);
    expect(node.metadata.intent).toBe('non-rect-clip');
    expect(node.metadata.attempted).toBe('surf.glass');
  });

  it('marks the raster as excluded from native_area_ratio', () => {
    const node = escapeHatchToIR(baseProps);
    expect(node.metadata.excludeFromNativeRatio).toBe(true);
  });

  it('leaves pngBase64 empty for the Python compiler to fill', () => {
    const node = escapeHatchToIR(baseProps);
    expect(node.pngBase64).toBe('');
  });

  it('defaults body to empty string and attempted to null', () => {
    const node = escapeHatchToIR({
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      cssPayload: 'background: red;',
      intent: 'unspecified',
    });
    expect(node.metadata.body).toBe('');
    expect(node.metadata.attempted).toBeNull();
  });

  it('passes zod RasterNode validation', () => {
    const node = escapeHatchToIR(baseProps);
    // Round-trip through the Node validator — same path the wire format takes.
    const parsed = NodeSchema.parse(node);
    expect(parsed.kind).toBe('raster');
    expect((parsed as { recipeId: string }).recipeId).toBe('chrome.escape-hatch');
  });

  it('snapshot of full IR shape', () => {
    expect(escapeHatchToIR(baseProps)).toMatchInlineSnapshot(`
      {
        "bbox": {
          "h": 200,
          "w": 800,
          "x": 100,
          "y": 100,
        },
        "kind": "raster",
        "metadata": {
          "attempted": "surf.glass",
          "body": "",
          "cssPayload": "background: radial-gradient(circle, #a78bfa, #1e1b4b); clip-path: polygon(50% 0, 100% 100%, 0 100%);",
          "excludeFromNativeRatio": true,
          "intent": "non-rect-clip",
          "role": "escape-hatch",
        },
        "pngBase64": "",
        "recipeId": "chrome.escape-hatch",
        "zOrder": 0,
      }
    `);
  });
});
