import { describe, expect, it } from 'vitest';
import { dataBarToIR } from '../DataBar';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataBarToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable vertical bar set', () => {
    expect(dataBarToIR({
      bbox: { x: 0, y: 0, w: 400, h: 200 },
      values: [10, 30, 20, 45, 35],
    }, tokens)).toMatchSnapshot();
  });

  it('horizontal orientation lays bars out as rows', () => {
    const ir = dataBarToIR({
      bbox: { x: 0, y: 0, w: 400, h: 200 },
      values: [10, 20],
      orientation: 'horizontal',
    }, tokens);
    expect(ir.children.length).toBe(2);
    // bars should share x but differ in y
    expect(ir.children[0]?.bbox?.x).toBe(ir.children[1]?.bbox?.x);
    expect(ir.children[0]?.bbox?.y).not.toBe(ir.children[1]?.bbox?.y);
  });
});
