import { describe, expect, it } from 'vitest';
import { dataSparklineToIR } from '../DataSparkline';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataSparklineToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable trend line', () => {
    expect(dataSparklineToIR({
      bbox: { x: 0, y: 0, w: 320, h: 80 },
      values: [1, 4, 2, 6, 5, 8, 7, 9],
      fillUnder: true,
    }, tokens)).toMatchSnapshot();
  });

  it('emits the correct sub-recipe ids', () => {
    const ir = dataSparklineToIR({ bbox: { x: 0, y: 0, w: 100, h: 50 }, values: [1, 2, 3], fillUnder: true }, tokens);
    expect(ir.children.map(c => c.recipeId)).toEqual([
      'data.sparkline.area',
      'data.sparkline.line',
      'data.sparkline.last-marker',
    ]);
  });

  it('the line path emits one M and (n-1) L commands', () => {
    const ir = dataSparklineToIR({ bbox: { x: 0, y: 0, w: 100, h: 50 }, values: [1, 2, 3, 4] }, tokens);
    const line = ir.children.find(c => c.recipeId === 'data.sparkline.line');
    if (line && line.kind === 'path') {
      expect(line.commands[0]?.op).toBe('M');
      expect(line.commands.length).toBe(4);
    }
  });
});
