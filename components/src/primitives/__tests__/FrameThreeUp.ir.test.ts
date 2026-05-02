import { describe, expect, it } from 'vitest';
import { frameThreeUpToIR } from '../FrameThreeUp';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('frameThreeUpToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 3-up layout', () => {
    expect(frameThreeUpToIR({ bbox: { x: 0, y: 0, w: 1200, h: 400 } }, tokens)).toMatchSnapshot();
  });

  it('produces three equal columns', () => {
    const ir = frameThreeUpToIR({ bbox: { x: 0, y: 0, w: 348, h: 100 }, gap: 24 }, tokens);
    expect(ir.children.length).toBe(3);
    const widths = ir.children.map(c => c.bbox?.w);
    expect(widths).toEqual([100, 100, 100]);
  });

  it('stamps col-N recipe ids', () => {
    const ir = frameThreeUpToIR({ bbox: { x: 0, y: 0, w: 300, h: 100 } }, tokens);
    expect(ir.children.map(c => c.recipeId)).toEqual([
      'frame.three-up.col-1',
      'frame.three-up.col-2',
      'frame.three-up.col-3',
    ]);
  });
});
