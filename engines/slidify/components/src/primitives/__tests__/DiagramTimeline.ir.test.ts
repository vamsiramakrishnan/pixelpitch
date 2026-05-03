import { describe, expect, it } from 'vitest';
import { diagramTimelineToIR } from '../DiagramTimeline';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('diagramTimelineToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable 4-event timeline', () => {
    expect(diagramTimelineToIR({
      bbox: { x: 100, y: 200, w: 1080, h: 240 },
      events: [
        { at: 0.05, date: 'Q1 25', label: 'Beta' },
        { at: 0.35, date: 'Q2 25', label: 'GA' },
        { at: 0.65, date: 'Q3 25', label: 'Scale' },
        { at: 0.95, date: 'Q4 25', label: 'Series A' },
      ],
    }, tokens)).toMatchSnapshot();
  });

  it('emits rail + 4 nodes per event', () => {
    const ir = diagramTimelineToIR({
      bbox: { x: 0, y: 0, w: 1000, h: 200 },
      events: [{ at: 0.5, date: 'Now', label: 'Today' }],
    }, tokens);
    // 1 rail + (tick + dot + date + label) = 5
    expect(ir.children.length).toBe(5);
    expect(ir.children[0]?.recipeId).toBe('diagram.timeline.rail');
  });
});
