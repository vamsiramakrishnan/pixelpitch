import { describe, expect, it } from 'vitest';
import { frameSafeAreaToIR } from '../FrameSafeArea';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('frameSafeAreaToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable group with the inner bbox', () => {
    expect(frameSafeAreaToIR({ bbox: { x: 0, y: 0, w: 1280, h: 720 } }, tokens)).toMatchSnapshot();
  });

  it('honours padding tier', () => {
    const tight = frameSafeAreaToIR({ bbox: { x: 0, y: 0, w: 1280, h: 720 }, padding: 'tight' }, tokens);
    const cozy  = frameSafeAreaToIR({ bbox: { x: 0, y: 0, w: 1280, h: 720 }, padding: 'cozy' }, tokens);
    const spaci = frameSafeAreaToIR({ bbox: { x: 0, y: 0, w: 1280, h: 720 }, padding: 'spacious' }, tokens);
    expect(tight.metadata.insetPx).toBeLessThan(cozy.metadata.insetPx as number);
    expect(spaci.metadata.insetPx).toBeGreaterThan(cozy.metadata.insetPx as number);
  });

  it('passes children through with the inner bbox when child has no bbox', () => {
    const ir = frameSafeAreaToIR(
      {
        bbox: { x: 0, y: 0, w: 1280, h: 720 },
        childrenIR: [
          { kind: 'shape', recipeId: 'demo', zOrder: 0, metadata: {}, shape: 'rect', borderRadiusPx: 0, fill: { kind: 'solid', color: '#ff00ff' } },
        ],
      },
      tokens,
    );
    expect(ir.children[0]?.bbox).toEqual(ir.metadata.innerBbox);
  });

  it('stamps recipeId equal to the atom id', () => {
    expect(frameSafeAreaToIR({ bbox: { x: 0, y: 0, w: 100, h: 100 } }, tokens).recipeId).toBe('frame.safe-area');
  });
});
