import { describe, expect, it } from 'vitest';
import { dataHeatmapToIR } from '../DataHeatmap';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('dataHeatmapToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 3x3 heatmap', () => {
    expect(dataHeatmapToIR({
      bbox: { x: 0, y: 0, w: 90, h: 90 },
      cells: [[0, 0.25, 0.5], [0.5, 0.75, 1], [1, 0.75, 0]],
    }, tokens)).toMatchSnapshot();
  });

  it('emits one ShapeNode per cell', () => {
    const ir = dataHeatmapToIR({
      bbox: { x: 0, y: 0, w: 60, h: 60 },
      cells: [[0, 0.5], [0.5, 1]],
    }, tokens);
    expect(ir.children.length).toBe(4);
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = dataHeatmapToIR({
      bbox: { x: 0, y: 0, w: 30, h: 30 },
      cells: [[0]],
    }, tokens);
    expect(ir.recipeId).toBe('data.heatmap');
  });
});
