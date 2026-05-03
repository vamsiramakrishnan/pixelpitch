import { describe, expect, it } from 'vitest';
import { surfacePatternTileToIR } from '../SurfacePatternTile';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('surfacePatternTileToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable dot-lattice tile', () => {
    expect(surfacePatternTileToIR({
      bbox: { x: 0, y: 0, w: 320, h: 200 },
      pattern: 'dots',
      fgColor: '#a78bfa',
      tilePx: 24,
      featurePx: 1.5,
    }, tokens)).toMatchSnapshot();
  });

  it('forwards every pattern kind through to the IR fill', () => {
    for (const k of ['dots', 'lines-h', 'lines-v', 'lines-grid', 'diagonal', 'crosshatch'] as const) {
      const ir = surfacePatternTileToIR({
        bbox: { x: 0, y: 0, w: 100, h: 100 },
        pattern: k,
        fgColor: '#ffffff',
      }, tokens);
      const shape = ir.children[0];
      expect(shape?.kind).toBe('shape');
      if (shape?.kind === 'shape' && shape.fill.kind === 'pattern') {
        expect(shape.fill.pattern).toBe(k);
      }
    }
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = surfacePatternTileToIR({
      bbox: { x: 0, y: 0, w: 10, h: 10 },
      pattern: 'dots',
      fgColor: '#000000',
    }, tokens);
    expect(ir.recipeId).toBe('surface.pattern-tile');
  });
});
