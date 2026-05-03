import { describe, expect, it } from 'vitest';
import { dataGaugeToIR } from '../DataGauge';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataGaugeToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 65/100 gauge', () => {
    expect(dataGaugeToIR({
      bbox: { x: 0, y: 0, w: 200, h: 120 },
      value: 65,
      max: 100,
    }, tokens)).toMatchSnapshot();
  });

  it('emits one track and one value path', () => {
    const ir = dataGaugeToIR({ bbox: { x: 0, y: 0, w: 200, h: 120 }, value: 50 }, tokens);
    expect(ir.children.length).toBe(2);
    expect(ir.children[0]?.recipeId).toBe('data.gauge.track');
    expect(ir.children[1]?.recipeId).toBe('data.gauge.value');
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = dataGaugeToIR({ bbox: { x: 0, y: 0, w: 80, h: 60 }, value: 10 }, tokens);
    expect(ir.recipeId).toBe('data.gauge');
  });
});
