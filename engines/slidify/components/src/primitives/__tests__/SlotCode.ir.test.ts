import { describe, expect, it } from 'vitest';
import { slotCodeToIR } from '../SlotCode';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('slotCodeToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable code block with language pill', () => {
    expect(slotCodeToIR({
      bbox: { x: 100, y: 100, w: 600, h: 200 },
      code: "const x = 1;\nconst y = 2;",
      language: 'typescript',
    }, tokens)).toMatchSnapshot();
  });

  it('omits the pill when language is unset', () => {
    const ir = slotCodeToIR({ bbox: { x: 0, y: 0, w: 200, h: 80 }, code: 'noop' }, tokens);
    expect(ir.children.some(c => c.recipeId === 'slot.code.lang-pill')).toBe(false);
  });
});
