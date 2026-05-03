import { describe, expect, it } from 'vitest';
import { surfaceLinearFadeToIR } from '../SurfaceLinearFade';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('surfaceLinearFadeToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable bottom-scrim', () => {
    expect(surfaceLinearFadeToIR({
      bbox: { x: 0, y: 520, w: 1280, h: 200 },
      color: '#000000',
      direction: 'bottom',
      opacity: 0.7,
    }, tokens)).toMatchSnapshot();
  });

  it('translates direction enum into the right gradient angle', () => {
    const expected: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270, 'tl-br': 135, 'bl-tr': 45 };
    for (const [d, deg] of Object.entries(expected)) {
      const ir = surfaceLinearFadeToIR({
        bbox: { x: 0, y: 0, w: 100, h: 100 },
        color: '#ffffff',
        direction: d as 'top',
      }, tokens);
      expect(ir.metadata.angleDeg).toBe(deg);
    }
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = surfaceLinearFadeToIR({
      bbox: { x: 0, y: 0, w: 10, h: 10 },
      color: '#000000',
      direction: 'bottom',
    }, tokens);
    expect(ir.recipeId).toBe('surface.linear-fade');
  });
});
