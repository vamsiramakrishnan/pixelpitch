import { describe, expect, it } from 'vitest';
import { diagramFlowStepToIR } from '../DiagramFlowStep';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('diagramFlowStepToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable step with circular dot', () => {
    expect(diagramFlowStepToIR({
      bbox: { x: 0, y: 0, w: 280, h: 36 },
      n: 1,
      label: 'Discover',
    }, tokens)).toMatchSnapshot();
  });

  it('emits dot, numeral, and label nodes', () => {
    const ir = diagramFlowStepToIR({ bbox: { x: 0, y: 0, w: 280, h: 36 }, n: 'Q1', label: 'Foo', shape: 'pill' }, tokens);
    expect(ir.children.length).toBe(3);
    const recipeIds = ir.children.map(c => c.recipeId);
    expect(recipeIds).toContain('diagram.flow-step.dot');
    expect(recipeIds).toContain('diagram.flow-step.numeral');
    expect(recipeIds).toContain('diagram.flow-step.label');
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = diagramFlowStepToIR({ bbox: { x: 0, y: 0, w: 100, h: 30 }, n: 1, label: '' }, tokens);
    expect(ir.recipeId).toBe('diagram.flow-step');
  });
});
