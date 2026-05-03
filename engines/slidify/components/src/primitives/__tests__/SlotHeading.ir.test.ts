import { describe, expect, it } from 'vitest';
import { slotHeadingToIR } from '../SlotHeading';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('slotHeadingToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable slide-title heading', () => {
    expect(slotHeadingToIR({ bbox: { x: 100, y: 100, w: 1080, h: 80 }, text: 'Hello world' }, tokens)).toMatchSnapshot();
  });

  it('selects the requested type scale', () => {
    const ir = slotHeadingToIR({ bbox: { x: 0, y: 0, w: 100, h: 100 }, text: 'X', scale: 'display' }, tokens);
    expect(ir.paragraphs[0]?.runs[0]?.fontSizePx).toBe(tokens.type('display').sizePx);
  });

  it('stamps recipeId == slot.heading', () => {
    expect(slotHeadingToIR({ bbox: { x: 0, y: 0, w: 100, h: 100 }, text: 'X' }, tokens).recipeId).toBe('slot.heading');
  });
});
