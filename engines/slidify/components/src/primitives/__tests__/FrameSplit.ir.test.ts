import { describe, expect, it } from 'vitest';
import { frameSplitToIR } from '../FrameSplit';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('frameSplitToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 60/40 split', () => {
    expect(frameSplitToIR({ bbox: { x: 0, y: 0, w: 1280, h: 720 } }, tokens)).toMatchSnapshot();
  });

  it('honours the ratio prop', () => {
    const ir = frameSplitToIR({ bbox: { x: 0, y: 0, w: 1000, h: 100 }, ratio: 0.7, gap: 0 }, tokens);
    expect(ir.children[0]?.bbox?.w).toBeCloseTo(700, 6);
    expect(ir.children[1]?.bbox?.w).toBeCloseTo(300, 6);
  });

  it('stamps left/right recipe ids', () => {
    const ir = frameSplitToIR({ bbox: { x: 0, y: 0, w: 100, h: 100 } }, tokens);
    expect(ir.recipeId).toBe('frame.split');
    expect(ir.children[0]?.recipeId).toBe('frame.split.left');
    expect(ir.children[1]?.recipeId).toBe('frame.split.right');
  });
});
