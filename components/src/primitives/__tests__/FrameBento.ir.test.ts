import { describe, expect, it } from 'vitest';
import { frameBentoToIR } from '../FrameBento';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('frameBentoToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 2x2 grid', () => {
    const ir = frameBentoToIR(
      {
        bbox: { x: 0, y: 0, w: 1200, h: 600 },
        columns: 2,
        rows: 2,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 0, colSpan: 2 },
        ],
      },
      tokens,
    );
    expect(ir).toMatchSnapshot();
  });

  it('partitions the parent bbox accounting for the gap', () => {
    const gap = 24;
    const ir = frameBentoToIR(
      { bbox: { x: 0, y: 0, w: 248, h: 100 }, columns: 2, rows: 1, gap, cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      tokens,
    );
    expect(ir.children[0]?.bbox).toEqual({ x: 0, y: 0, w: 112, h: 100 });
    expect(ir.children[1]?.bbox).toEqual({ x: 136, y: 0, w: 112, h: 100 });
  });

  it('stamps the dotted recipe ids on cells', () => {
    const ir = frameBentoToIR(
      { bbox: { x: 0, y: 0, w: 100, h: 100 }, columns: 1, rows: 2, cells: [{ row: 0, col: 0 }, { row: 1, col: 0 }] },
      tokens,
    );
    expect(ir.recipeId).toBe('frame.bento');
    expect(ir.children[0]?.recipeId).toBe('frame.bento.cell-1');
    expect(ir.children[1]?.recipeId).toBe('frame.bento.cell-2');
  });
});
