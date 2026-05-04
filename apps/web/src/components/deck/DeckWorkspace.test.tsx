// @vitest-environment jsdom

import { cleanup, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeckBeat, DeckPlan, DeckSlide } from '@pixelpitch/contracts';
import type { ReactElement } from 'react';

import { DeckPhaseBar } from './DeckPhaseBar';
import { DeckWorkspace } from './DeckWorkspace';
import { OutlineEditor } from './OutlineEditor';

function mockPlan(overrides: Partial<DeckPlan> = {}): DeckPlan {
  return {
    version: 1,
    phase: 'narrative',
    title: 'Test Deck',
    audience: 'Engineers',
    tone: 'Strategic',
    keyMessage: 'Ship it',
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

const beats: DeckBeat[] = [
  { id: 'beat-1', type: 'context', label: 'Context', summary: 'Set the scene' },
  { id: 'beat-2', type: 'problem', label: 'Problem', summary: 'Show the gap' },
  { id: 'beat-3', type: 'ask', label: 'Ask', summary: 'Make the request' },
];

const slides: DeckSlide[] = [
  {
    id: 'slide-1',
    beatId: 'beat-1',
    type: 'title',
    title: 'Opening',
    file: 'slides/slide-1.html',
    status: 'ready',
    speakerNotes: 'Introduce the message.',
  },
  {
    id: 'slide-2',
    beatId: 'beat-2',
    type: 'content',
    title: 'Evidence',
    file: 'slides/slide-2.html',
    status: 'pending',
    speakerNotes: '',
  },
];

function renderStatic(ui: ReactElement) {
  document.body.innerHTML = renderToStaticMarkup(ui);
  return document.body;
}

function renderWorkspace(plan: DeckPlan) {
  return renderStatic(
    <DeckWorkspace
      projectId="project-1"
      plan={plan}
      onUpdatePlan={vi.fn()}
      onExport={vi.fn().mockResolvedValue(undefined)}
      exporting={false}
      chatPane={<div>Chat pane</div>}
      renderSlidePreview={(slideId) => <div>Preview {slideId}</div>}
      renderSlideThumbnail={(slide) => <div>Thumbnail {slide.title}</div>}
    />,
  );
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('DeckWorkspace', () => {
  it("renders StoryCanvas when phase is 'narrative'", () => {
    renderWorkspace(mockPlan({ phase: 'narrative' }));

    expect(screen.getByText(/Story Arc/)).toBeTruthy();
    expect(screen.getByText('KEY MESSAGE')).toBeTruthy();
  });

  it("renders OutlineEditor when phase is 'structure'", () => {
    renderWorkspace(mockPlan({ phase: 'structure', narrative: { beats } }));

    expect(screen.getByText('3 beats')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Add beat/ })).toBeTruthy();
  });

  it("renders SlideSorter when phase is 'generating'", () => {
    renderWorkspace(mockPlan({ phase: 'generating', slides }));

    expect(screen.getByText('2 slides · 1 ready')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Thumbnail Opening/ })).toBeTruthy();
  });

  it("renders SlideEditor when phase is 'ready'", () => {
    const body = renderWorkspace(mockPlan({ phase: 'ready', slides }));

    expect(body.querySelector('.slide-editor')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Slide 1: Opening' })).toBeTruthy();
  });

  it("auto-shows ExportPanel when phase is 'exporting'", () => {
    renderWorkspace(mockPlan({ phase: 'exporting', slides }));

    expect(screen.getByRole('heading', { name: 'Export to PPTX' })).toBeTruthy();
    expect(screen.getByText('2 slides ready for export.')).toBeTruthy();
  });
});

describe('OutlineEditor', () => {
  it('renders correct number of beat cards', () => {
    const body = renderStatic(
      <OutlineEditor
        beats={beats}
        onReorder={vi.fn()}
        onEditBeat={vi.fn()}
        onAddBeat={vi.fn()}
        onRemoveBeat={vi.fn()}
        onProceed={vi.fn()}
      />,
    );

    expect(body.querySelectorAll('.outline-beat')).toHaveLength(beats.length);
  });
});

describe('DeckPhaseBar', () => {
  it('marks the correct dot as active', () => {
    const body = renderStatic(<DeckPhaseBar phase="ready" />);
    const dots = body.querySelectorAll('.deck-phase-dot');

    expect(dots).toHaveLength(5);
    expect(dots[3]?.className).toContain('active');
    expect(dots[0]?.className).not.toContain('active');
    expect(dots[1]?.className).not.toContain('active');
    expect(dots[2]?.className).not.toContain('active');
    expect(dots[4]?.className).not.toContain('active');
  });
});
