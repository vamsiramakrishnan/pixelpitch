import { describe, expect, it } from 'vitest';
import { surfaceShapeFillToIR } from '../SurfaceShapeFill';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('surfaceShapeFillToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable rounded-rect with solid fill', () => {
    expect(surfaceShapeFillToIR({
      bbox: { x: 0, y: 0, w: 320, h: 200 },
      fill: { kind: 'solid', color: '#a78bfa' },
      shape: 'rounded-rect',
      radiusPx: 16,
    }, tokens)).toMatchSnapshot();
  });

  it('forwards fill, border, and shadows into the IR shape', () => {
    const ir = surfaceShapeFillToIR({
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      fill: { kind: 'solid', color: '#222222' },
      border: { width: 2, color: '#ff0000', style: 'solid' },
      shadows: [{ offsetX: 2, offsetY: 4, blur: 8, spread: 0, color: '#0000007f', inset: false }],
    }, tokens);
    const shape = ir.children[0];
    expect(shape?.kind).toBe('shape');
    if (shape?.kind === 'shape') {
      expect(shape.fill).toEqual({ kind: 'solid', color: '#222222' });
      expect(shape.border?.width).toBe(2);
      expect(shape.shadows?.length).toBe(1);
    }
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = surfaceShapeFillToIR({
      bbox: { x: 0, y: 0, w: 10, h: 10 },
      fill: { kind: 'solid', color: '#ffffff' },
    }, tokens);
    expect(ir.recipeId).toBe('surface.shape-fill');
  });
});
