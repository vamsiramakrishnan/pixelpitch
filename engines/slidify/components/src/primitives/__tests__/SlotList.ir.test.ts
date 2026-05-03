import { describe, expect, it } from 'vitest';
import { slotListToIR } from '../SlotList';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('slotListToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable bulleted list', () => {
    expect(slotListToIR({
      bbox: { x: 100, y: 100, w: 600, h: 200 },
      items: ['First', 'Second', 'Third'],
    }, tokens)).toMatchSnapshot();
  });

  it('emits a PathShape for check markers', () => {
    const ir = slotListToIR({ bbox: { x: 0, y: 0, w: 200, h: 60 }, items: ['a'], marker: 'check' }, tokens);
    const marker = ir.children.find(c => c.recipeId === 'slot.list.marker-1');
    expect(marker?.kind).toBe('path');
  });

  it('emits an oval ShapeNode for bullet markers', () => {
    const ir = slotListToIR({ bbox: { x: 0, y: 0, w: 200, h: 60 }, items: ['a'], marker: 'bullet' }, tokens);
    const marker = ir.children.find(c => c.recipeId === 'slot.list.marker-1');
    expect(marker?.kind).toBe('shape');
  });
});
