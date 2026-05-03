import { describe, expect, it } from 'vitest';
import { slotEyebrowToIR } from '../SlotEyebrow';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('slotEyebrowToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable plain eyebrow', () => {
    expect(slotEyebrowToIR({ bbox: { x: 0, y: 0, w: 200, h: 24 }, text: 'kicker' }, tokens)).toMatchSnapshot();
  });

  it('emits a leading rule when withRule="before"', () => {
    const ir = slotEyebrowToIR({ bbox: { x: 0, y: 0, w: 200, h: 24 }, text: 'kicker', withRule: 'before' }, tokens);
    expect(ir.children[0]?.recipeId).toBe('slot.eyebrow.rule');
    expect(ir.children[1]?.recipeId).toBe('slot.eyebrow.text');
  });
});
