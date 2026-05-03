import { describe, expect, it } from 'vitest';
import { decorationLineStrokeToIR } from '../DecorationLineStroke';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('decorationLineStrokeToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable horizontal hairline', () => {
    expect(decorationLineStrokeToIR({
      bbox: { x: 0, y: 360, w: 1280, h: 1 },
      orientation: 'h',
      color: '#27272a',
    }, tokens)).toMatchSnapshot();
  });

  it('produces a dasharray for dotted/dashed and none for solid', () => {
    const solid = decorationLineStrokeToIR({ bbox: { x: 0, y: 0, w: 100, h: 1 }, orientation: 'h', color: '#fff' }, tokens);
    const dotted = decorationLineStrokeToIR({ bbox: { x: 0, y: 0, w: 100, h: 1 }, orientation: 'h', color: '#fff', dash: 'dotted' }, tokens);
    const dashed = decorationLineStrokeToIR({ bbox: { x: 0, y: 0, w: 100, h: 1 }, orientation: 'h', color: '#fff', dash: 'dashed' }, tokens);
    const solidPath = solid.children[0];
    const dottedPath = dotted.children[0];
    const dashedPath = dashed.children[0];
    if (solidPath?.kind === 'path') expect(solidPath.strokeDasharray).toBeUndefined();
    if (dottedPath?.kind === 'path') expect(dottedPath.strokeDasharray).toBeDefined();
    if (dashedPath?.kind === 'path') expect(dashedPath.strokeDasharray).toBeDefined();
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = decorationLineStrokeToIR({ bbox: { x: 0, y: 0, w: 10, h: 1 }, orientation: 'h', color: '#000' }, tokens);
    expect(ir.recipeId).toBe('decoration.line-stroke');
  });
});
