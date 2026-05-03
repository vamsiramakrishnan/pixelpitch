import { describe, expect, it } from 'vitest';
import { annotationLeaderLineToIR } from '../AnnotationLeaderLine';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('annotationLeaderLineToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable arrow leader', () => {
    expect(annotationLeaderLineToIR({
      bbox: { x: 0, y: 0, w: 400, h: 200 },
      from: { x: 30, y: 30 },
      to: { x: 370, y: 170 },
    }, tokens)).toMatchSnapshot();
  });

  it('forwards from/to coordinates into the path commands', () => {
    const ir = annotationLeaderLineToIR({
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      from: { x: 10, y: 10 },
      to: { x: 90, y: 90 },
    }, tokens);
    const path = ir.children[0];
    if (path?.kind === 'path') {
      expect(path.commands[0]).toMatchObject({ op: 'M', x: 10, y: 10 });
      expect(path.commands[1]).toMatchObject({ op: 'L', x: 90, y: 90 });
    } else {
      throw new Error('expected path child');
    }
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = annotationLeaderLineToIR({
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      from: { x: 0, y: 0 },
      to: { x: 1, y: 1 },
    }, tokens);
    expect(ir.recipeId).toBe('annotation.leader-line');
  });
});
