import { describe, expect, it } from 'vitest';
import { dataTableToIR } from '../DataTable';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataTableToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 3x2 table with zebra + dividers', () => {
    expect(dataTableToIR({
      bbox: { x: 0, y: 0, w: 800, h: 240 },
      headers: ['Name', 'Value', 'Delta'],
      rows: [
        ['Alpha', '12', '+1'],
        ['Beta',  '34', '-2'],
      ],
      zebra: true,
      withVerticalDividers: true,
      withRowDividers: true,
    }, tokens)).toMatchSnapshot();
  });

  it('emits headers + cells with the right recipe ids', () => {
    const ir = dataTableToIR({
      bbox: { x: 0, y: 0, w: 600, h: 200 },
      headers: ['A'],
      rows: [['x']],
    }, tokens);
    const ids = ir.children.map(c => c.recipeId);
    expect(ids).toContain('data.table.header-1');
    expect(ids).toContain('data.table.cell-1-1');
  });
});
