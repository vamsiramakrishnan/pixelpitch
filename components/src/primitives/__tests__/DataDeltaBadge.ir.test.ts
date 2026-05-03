import { describe, expect, it } from 'vitest';
import { dataDeltaBadgeToIR } from '../DataDeltaBadge';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataDeltaBadgeToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable up-success delta', () => {
    expect(dataDeltaBadgeToIR({
      bbox: { x: 0, y: 0, w: 96, h: 28 },
      value: '+29.4%',
      direction: 'up',
    }, tokens)).toMatchSnapshot();
  });

  it('auto-tones the badge by direction', () => {
    const up = dataDeltaBadgeToIR({ bbox: { x: 0, y: 0, w: 100, h: 28 }, value: '+5%', direction: 'up' }, tokens);
    const dn = dataDeltaBadgeToIR({ bbox: { x: 0, y: 0, w: 100, h: 28 }, value: '-5%', direction: 'down' }, tokens);
    const fl = dataDeltaBadgeToIR({ bbox: { x: 0, y: 0, w: 100, h: 28 }, value: '0%', direction: 'flat' }, tokens);
    expect(up.metadata.tone).toBe('success');
    expect(dn.metadata.tone).toBe('danger');
    expect(fl.metadata.tone).toBe('neutral');
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = dataDeltaBadgeToIR({ bbox: { x: 0, y: 0, w: 10, h: 10 }, value: 'x' }, tokens);
    expect(ir.recipeId).toBe('data.delta-badge');
  });
});
