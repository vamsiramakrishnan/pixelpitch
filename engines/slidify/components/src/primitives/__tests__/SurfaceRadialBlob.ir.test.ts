import { describe, expect, it } from 'vitest';
import { surfaceRadialBlobToIR } from '../SurfaceRadialBlob';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('surfaceRadialBlobToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable radial blob', () => {
    expect(surfaceRadialBlobToIR({
      bbox: { x: 0, y: 0, w: 320, h: 320 },
      color: '#a78bfa',
      cx: 0.2,
      cy: 0.2,
      intensity: 'high',
    }, tokens)).toMatchSnapshot();
  });

  it('forwards cx/cy/intensity into the radial gradient stops', () => {
    const ir = surfaceRadialBlobToIR({
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      color: '#ff0000',
      cx: 0.75,
      cy: 0.25,
      intensity: 'low',
    }, tokens);
    const shape = ir.children[0];
    if (shape?.kind === 'shape' && shape.fill.kind === 'radial-gradient') {
      expect(shape.fill.cx).toBe(0.75);
      expect(shape.fill.cy).toBe(0.25);
      expect(shape.fill.stops.length).toBe(2);
    } else {
      throw new Error('expected radial-gradient shape');
    }
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = surfaceRadialBlobToIR({ bbox: { x: 0, y: 0, w: 10, h: 10 }, color: '#000000' }, tokens);
    expect(ir.recipeId).toBe('surface.radial-blob');
  });
});
