import { describe, expect, it } from 'vitest';
import { slotNumeralToIR } from '../SlotNumeral';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('slotNumeralToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable numeral-md value', () => {
    expect(slotNumeralToIR({ bbox: { x: 0, y: 0, w: 300, h: 120 }, value: '42%' }, tokens)).toMatchSnapshot();
  });

  it('attaches a gradient fill via metadata when gradient prop is set', () => {
    const ir = slotNumeralToIR({ bbox: { x: 0, y: 0, w: 100, h: 100 }, value: '99', gradient: 'accent-grad' }, tokens);
    expect(ir.metadata.gradientKey).toBe('accent-grad');
    expect(ir.metadata.gradientFill).toBeDefined();
  });
});
