import { describe, expect, it } from 'vitest';
import { decorationShapePresetToIR } from '../DecorationShapePreset';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('decorationShapePresetToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable left-brace', () => {
    expect(decorationShapePresetToIR({
      bbox: { x: 0, y: 0, w: 32, h: 200 },
      preset: 'brace-left',
      fill: { kind: 'solid', color: '#a78bfa' },
    }, tokens)).toMatchSnapshot();
  });

  it('forwards preset, fill, and stroke into the ShapeNode', () => {
    const ir = decorationShapePresetToIR({
      bbox: { x: 0, y: 0, w: 64, h: 64 },
      preset: 'star-5',
      fill: { kind: 'solid', color: '#fbbf24' },
      stroke: { color: '#ffffff', widthPx: 2 },
    }, tokens);
    const shape = ir.children[0];
    if (shape?.kind === 'shape') {
      expect(shape.shape).toBe('star-5');
      expect(shape.border?.width).toBe(2);
    }
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = decorationShapePresetToIR({ bbox: { x: 0, y: 0, w: 10, h: 10 }, preset: 'plus' }, tokens);
    expect(ir.recipeId).toBe('decoration.shape-preset');
  });
});
