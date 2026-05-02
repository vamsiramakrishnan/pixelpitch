import { describe, expect, it } from 'vitest';
import { frameSectionToIR } from '../FrameSection';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('frameSectionToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable section frame', () => {
    expect(frameSectionToIR({ bbox: { x: 0, y: 0, w: 1280, h: 720 } }, tokens)).toMatchSnapshot();
  });

  it('places the strip on the requested side', () => {
    const left = frameSectionToIR({ bbox: { x: 0, y: 0, w: 200, h: 200 }, side: 'left', stripPx: 20 }, tokens);
    const right = frameSectionToIR({ bbox: { x: 0, y: 0, w: 200, h: 200 }, side: 'right', stripPx: 20 }, tokens);
    expect(left.children[1]?.bbox).toEqual({ x: 0, y: 0, w: 20, h: 200 });
    expect(right.children[1]?.bbox).toEqual({ x: 180, y: 0, w: 20, h: 200 });
  });
});
