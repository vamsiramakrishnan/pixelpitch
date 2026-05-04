import { describe, expect, it } from 'vitest';
import type { DeckPlan } from './deck.js';
import { validatePhaseTransition } from './deck.js';

function mockPlan(overrides: Partial<DeckPlan> = {}): DeckPlan {
  return {
    version: 1,
    phase: 'narrative',
    title: '',
    audience: '',
    tone: '',
    keyMessage: '',
    composition: {
      frameworkId: 'html-ppt',
      themeId: 'minimal-white',
      format: '16:9',
      runtime: 'deck/framework.js',
      designSystemId: null,
    },
    interview: { history: [] },
    narrative: { beats: [] },
    slides: [],
    slidify: { lastExport: null, fidelityIssues: [] },
    ...overrides,
  };
}

describe('validatePhaseTransition', () => {
  describe('narrative → structure', () => {
    it('blocks when title is missing', () => {
      const result = validatePhaseTransition(mockPlan({ audience: 'VPs', keyMessage: 'Ship it' }), 'structure');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('blocks when audience is missing', () => {
      const result = validatePhaseTransition(mockPlan({ title: 'Q3 Review', keyMessage: 'Ship it' }), 'structure');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Audience is required');
    });

    it('blocks when keyMessage is missing', () => {
      const result = validatePhaseTransition(mockPlan({ title: 'Q3 Review', audience: 'VPs' }), 'structure');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Key message is required');
    });

    it('passes when all metadata present', () => {
      const result = validatePhaseTransition(
        mockPlan({ title: 'Q3 Review', audience: 'VPs', keyMessage: 'Ship it' }),
        'structure',
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('structure → generating', () => {
    it('blocks when no beats', () => {
      const result = validatePhaseTransition(mockPlan(), 'generating');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one narrative beat is required');
    });

    it('blocks when no ask/plan beat', () => {
      const plan = mockPlan({
        narrative: { beats: [{ id: 'b1', type: 'context', label: 'Context', summary: 'Setup' }] },
      });
      const result = validatePhaseTransition(plan, 'generating');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Narrative must contain an "ask" or "plan" beat');
    });

    it('passes with valid beats including an ask', () => {
      const plan = mockPlan({
        narrative: {
          beats: [
            { id: 'b1', type: 'context', label: 'Context', summary: 'Setup' },
            { id: 'b2', type: 'ask', label: 'Ask', summary: 'Approve POC' },
          ],
        },
      });
      const result = validatePhaseTransition(plan, 'generating');
      expect(result.valid).toBe(true);
    });
  });

  describe('generating → ready', () => {
    it('blocks when slides are incomplete', () => {
      const plan = mockPlan({
        slides: [
          { id: 's1', beatId: 'b1', type: 'title', title: 'Title', file: 'slides/01.html', status: 'ready', speakerNotes: '' },
          { id: 's2', beatId: 'b2', type: 'content', title: 'Problem', file: 'slides/02.html', status: 'needs-data', speakerNotes: '' },
        ],
      });
      const result = validatePhaseTransition(plan, 'ready');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('s2');
    });

    it('passes when all slides ready or fixed', () => {
      const plan = mockPlan({
        slides: [
          { id: 's1', beatId: 'b1', type: 'title', title: 'Title', file: 'slides/01.html', status: 'ready', speakerNotes: 'Welcome' },
          { id: 's2', beatId: 'b2', type: 'cta', title: 'Ask', file: 'slides/02.html', status: 'fixed', speakerNotes: 'Close' },
        ],
      });
      const result = validatePhaseTransition(plan, 'ready');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid jumps', () => {
    it('blocks narrative → ready', () => {
      const result = validatePhaseTransition(mockPlan(), 'ready');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cannot jump from narrative to ready');
    });
  });

  describe('ready → exporting', () => {
    it('always passes', () => {
      const plan = mockPlan({ phase: 'ready' });
      const result = validatePhaseTransition(plan, 'exporting');
      expect(result.valid).toBe(true);
    });
  });
});
