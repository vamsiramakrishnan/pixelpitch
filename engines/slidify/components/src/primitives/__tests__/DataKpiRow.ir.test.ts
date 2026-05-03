import { describe, expect, it } from 'vitest';
import { dataKpiRowToIR } from '../DataKpiRow';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataKpiRowToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable KPI row', () => {
    expect(dataKpiRowToIR({
      bbox: { x: 0, y: 0, w: 1000, h: 200 },
      cells: [
        { label: 'ARR',    value: '$12.4M', delta: '+18%' },
        { label: 'Churn',  value: '2.1%',   delta: '-0.3%' },
        { label: 'NPS',    value: '67',     delta: '+9' },
      ],
    }, tokens)).toMatchSnapshot();
  });

  it('produces one cell-N.{label,value,delta} group per cell', () => {
    const ir = dataKpiRowToIR({
      bbox: { x: 0, y: 0, w: 600, h: 100 },
      cells: [{ label: 'A', value: '1' }, { label: 'B', value: '2', delta: '+x' }],
    }, tokens);
    const ids = ir.children.map(c => c.recipeId);
    expect(ids).toContain('data.kpi-row.cell-1.label');
    expect(ids).toContain('data.kpi-row.cell-2.delta');
  });
});
