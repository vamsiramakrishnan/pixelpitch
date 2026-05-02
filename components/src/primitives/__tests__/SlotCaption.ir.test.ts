import { describe, expect, it } from 'vitest';
import { slotCaptionToIR } from '../SlotCaption';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('slotCaptionToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable caption', () => {
    expect(slotCaptionToIR({ bbox: { x: 0, y: 0, w: 600, h: 80 }, text: 'A short caption.' }, tokens)).toMatchSnapshot();
  });

  it('uses lede sizing when register=lede', () => {
    const ir = slotCaptionToIR({ bbox: { x: 0, y: 0, w: 100, h: 40 }, text: 'X', register: 'lede' }, tokens);
    expect(ir.paragraphs[0]?.runs[0]?.fontSizePx).toBe(tokens.type('lede').sizePx);
  });
});
