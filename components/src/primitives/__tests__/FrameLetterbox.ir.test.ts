import { describe, expect, it } from 'vitest';
import { frameLetterboxToIR } from '../FrameLetterbox';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('frameLetterboxToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable letterbox', () => {
    expect(frameLetterboxToIR({ bbox: { x: 0, y: 0, w: 1280, h: 720 } }, tokens)).toMatchSnapshot();
  });

  it('produces top + bottom + content children', () => {
    const ir = frameLetterboxToIR({ bbox: { x: 0, y: 0, w: 1000, h: 500 }, barHeightPx: 50 }, tokens);
    expect(ir.children.map(c => c.recipeId)).toEqual([
      'frame.letterbox.top-bar',
      'frame.letterbox.bottom-bar',
      'frame.letterbox.content',
    ]);
    expect(ir.children[0]?.bbox).toEqual({ x: 0, y: 0, w: 1000, h: 50 });
    expect(ir.children[1]?.bbox).toEqual({ x: 0, y: 450, w: 1000, h: 50 });
  });
});
