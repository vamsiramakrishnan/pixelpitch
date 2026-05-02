import { describe, expect, it } from 'vitest';
import { dataDonutToIR } from '../DataDonut';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataDonutToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 3-segment donut', () => {
    expect(dataDonutToIR({
      bbox: { x: 0, y: 0, w: 200, h: 200 },
      segments: [
        { value: 50, color: '#a78bfa', label: 'A' },
        { value: 30, color: '#f472b6', label: 'B' },
        { value: 20, color: '#34d399', label: 'C' },
      ],
    }, tokens)).toMatchSnapshot();
  });

  it('emits one path per segment + one hole', () => {
    const ir = dataDonutToIR({ bbox: { x: 0, y: 0, w: 200, h: 200 }, segments: [{ value: 1 }, { value: 1 }] }, tokens);
    expect(ir.children.length).toBe(3);
    expect(ir.children[ir.children.length - 1]?.recipeId).toBe('data.donut.hole');
  });

  it('omits the hole when innerRadiusFrac is 0 (pie)', () => {
    const ir = dataDonutToIR({
      bbox: { x: 0, y: 0, w: 200, h: 200 },
      segments: [{ value: 1 }, { value: 1 }],
      innerRadiusFrac: 0,
    }, tokens);
    expect(ir.children.length).toBe(2);
    expect(ir.children.some(c => c.recipeId === 'data.donut.hole')).toBe(false);
  });
});
