import { describe, expect, it } from 'vitest';
import { slotQuoteToIR } from '../SlotQuote';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('slotQuoteToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable quote with attribution + mark', () => {
    expect(slotQuoteToIR({
      bbox: { x: 100, y: 100, w: 800, h: 280 },
      text: 'The best way out is always through.',
      attribution: '— Robert Frost',
      withMark: true,
    }, tokens)).toMatchSnapshot();
  });

  it('omits the mark when withMark is unset', () => {
    const ir = slotQuoteToIR({ bbox: { x: 0, y: 0, w: 100, h: 100 }, text: 'X' }, tokens);
    expect(ir.children.find(c => c.recipeId === 'slot.quote.mark')).toBeUndefined();
  });
});
