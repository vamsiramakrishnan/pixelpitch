# Web Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 9 React components that render the deck authoring workspace — phase-driven UI from narrative interview through slide editing to export.

**Architecture:** `DeckWorkspace` reads `deck-plan.json` via the daemon API and renders the phase-appropriate child component. Each phase has its own component. The slide preview is an iframe with dynamically stitched srcdoc.

**Tech Stack:** React 18, TypeScript, CSS (index.css), existing Icon/Loading/QuestionForm components

**Dependencies:** Requires `packages/contracts/src/api/deck.ts` (from 01-contracts.md) and daemon endpoints (from 03-daemon.md)

---

## Required TDD Expansion for Component Tasks

Every component task below must be implemented as a red/green/commit cycle. Do not skip the failing-test step. Each task must include a focused render test before component code exists, the exact test run showing the expected failure, the implementation, the exact test run showing the pass, a focused `rg` verification command, and a commit.

Use these file targets:

- `apps/web/src/components/deck/DeckPhaseBar.test.tsx`
- `apps/web/src/components/deck/StoryCanvas.test.tsx`
- `apps/web/src/components/deck/OutlineEditor.test.tsx`
- `apps/web/src/components/deck/SlideStrip.test.tsx`
- `apps/web/src/components/deck/SlideSorter.test.tsx`
- `apps/web/src/components/deck/SlideEditor.test.tsx`
- `apps/web/src/components/deck/ExportPanel.test.tsx`
- `apps/web/src/components/deck/SlidePlanner.test.tsx`
- `apps/web/src/components/deck/DeckWorkspace.test.tsx`

### TDD checklist for Task 1: `DeckPhaseBar`

- [ ] **Step 1: Write the minimal render test first**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeckPhaseBar } from './DeckPhaseBar';

describe('DeckPhaseBar', () => {
  it.each(['narrative', 'structure', 'generating', 'ready', 'exporting'] as const)(
    'renders phase state %s',
    (phase) => {
      const { container } = render(<DeckPhaseBar phase={phase} />);
      expect(screen.getByText('Narrative')).toBeInTheDocument();
      expect(screen.getByText('Structure')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
      expect(screen.getByText('Polish')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(container.querySelector('.deck-phase-dot.active')).toBeTruthy();
    },
  );
});
```

- [ ] **Step 2: Run the test and verify it fails because the component does not exist yet**

```bash
bun run --filter @pixelpitch/web test -- DeckPhaseBar
```

Expected failure: module resolution fails for `./DeckPhaseBar` or exported component is missing.

- [ ] **Step 3: Write `DeckPhaseBar.tsx` using the implementation in Task 1.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- DeckPhaseBar
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "DeckPhaseBar|deck-phase-bar|deck-phase-dot|deck-phase-label|PHASES" apps/web/src/components/deck/DeckPhaseBar.tsx apps/web/src/components/deck/DeckPhaseBar.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/DeckPhaseBar.tsx apps/web/src/components/deck/DeckPhaseBar.test.tsx
git commit -m "feat(deck): add DeckPhaseBar phase progress component"
```

### TDD checklist for Task 2: `StoryCanvas`

- [ ] **Step 1: Write the minimal render test first**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DeckPlan } from '@pixelpitch/contracts';
import { StoryCanvas } from './StoryCanvas';

const plan: DeckPlan = {
  version: 1,
  phase: 'narrative',
  title: 'Launch Readiness',
  audience: 'Product leadership',
  tone: 'Crisp',
  keyMessage: 'The launch is ready after export reliability work.',
  composition: { frameworkId: 'html-ppt', themeId: 'minimal-white', format: '16:9', runtime: 'deck/framework.js', designSystemId: null },
  interview: { history: [] },
  narrative: { beats: [] },
  slides: [],
  slidify: { lastExport: null, fidelityIssues: [] },
};

describe('StoryCanvas', () => {
  it('renders known story fields and progress bars', () => {
    const { container } = render(<StoryCanvas plan={plan} />);
    expect(screen.getByText('AUDIENCE')).toBeInTheDocument();
    expect(screen.getByText('KEY MESSAGE')).toBeInTheDocument();
    expect(screen.getByText('TONE')).toBeInTheDocument();
    expect(container.querySelectorAll('.story-canvas-card')).toHaveLength(3);
  });

  it('renders a pending card when required fields are missing', () => {
    render(<StoryCanvas plan={{ ...plan, audience: '', tone: '', keyMessage: '' }} />);
    expect(screen.getByText('WAITING FOR ANSWERS')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails because the component does not exist yet**

```bash
bun run --filter @pixelpitch/web test -- StoryCanvas
```

- [ ] **Step 3: Write `StoryCanvas.tsx` using the implementation in Task 2.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- StoryCanvas
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "StoryCanvas|story-canvas|story-canvas-card|story-canvas-progress|WAITING FOR ANSWERS" apps/web/src/components/deck/StoryCanvas.tsx apps/web/src/components/deck/StoryCanvas.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/StoryCanvas.tsx apps/web/src/components/deck/StoryCanvas.test.tsx
git commit -m "feat(deck): add StoryCanvas live card stack for narrative interview"
```

### TDD checklist for Task 3: `OutlineEditor`

- [ ] **Step 1: Write the minimal render and interaction test first**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckBeat } from '@pixelpitch/contracts';
import { OutlineEditor } from './OutlineEditor';

const beats: DeckBeat[] = [
  { id: 'b1', type: 'context', label: 'Context', summary: 'Set the launch context' },
  { id: 'b2', type: 'ask', label: 'Ask', summary: 'Approve two engineers' },
];

describe('OutlineEditor', () => {
  it('renders beats and calls edit/add/remove/proceed handlers', () => {
    const onEditBeat = vi.fn();
    const onAddBeat = vi.fn();
    const onRemoveBeat = vi.fn();
    const onProceed = vi.fn();
    render(
      <OutlineEditor
        beats={beats}
        onReorder={vi.fn()}
        onEditBeat={onEditBeat}
        onAddBeat={onAddBeat}
        onRemoveBeat={onRemoveBeat}
        onProceed={onProceed}
      />,
    );
    fireEvent.change(screen.getByDisplayValue('Set the launch context'), { target: { value: 'Updated context' } });
    expect(onEditBeat).toHaveBeenCalledWith('b1', { summary: 'Updated context' });
    fireEvent.click(screen.getByText('Add beat'));
    fireEvent.click(screen.getByText(/Proceed to slides/));
    expect(onAddBeat).toHaveBeenCalled();
    expect(onProceed).toHaveBeenCalled();
    expect(screen.getAllByLabelText('Remove beat')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- OutlineEditor
```

- [ ] **Step 3: Write `OutlineEditor.tsx` using the implementation in Task 3.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- OutlineEditor
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "OutlineEditor|outline-editor|outline-beat|onReorder|draggable" apps/web/src/components/deck/OutlineEditor.tsx apps/web/src/components/deck/OutlineEditor.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/OutlineEditor.tsx apps/web/src/components/deck/OutlineEditor.test.tsx
git commit -m "feat(deck): add OutlineEditor with drag-reorder and inline editing"
```

### TDD checklist for Task 4: `SlideStrip`

- [ ] **Step 1: Write the minimal render and selection test first**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckSlide } from '@pixelpitch/contracts';
import { SlideStrip } from './SlideStrip';

const slides: DeckSlide[] = [
  { id: 's1', title: 'Title', file: 'deck/slides/01-title.html', beatId: 'b1', status: 'ready' },
  { id: 's2', title: 'Ask', file: 'deck/slides/02-ask.html', beatId: 'b2', status: 'needs-data' },
];

describe('SlideStrip', () => {
  it('renders thumbnails and selects a slide', () => {
    const onSelect = vi.fn();
    render(<SlideStrip slides={slides} activeId="s1" onSelect={onSelect} renderThumbnail={(slide) => <span>thumb {slide.id}</span>} />);
    expect(screen.getByLabelText('Slide 1: Title')).toBeInTheDocument();
    expect(screen.getByText('thumb s2')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Slide 2: Ask'));
    expect(onSelect).toHaveBeenCalledWith('s2');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- SlideStrip
```

- [ ] **Step 3: Write `SlideStrip.tsx` using the implementation in Task 4.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- SlideStrip
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "SlideStrip|slide-strip|slide-thumb|slide-thumb-preview|renderThumbnail" apps/web/src/components/deck/SlideStrip.tsx apps/web/src/components/deck/SlideStrip.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/SlideStrip.tsx apps/web/src/components/deck/SlideStrip.test.tsx
git commit -m "feat(deck): add SlideStrip horizontal thumbnail navigation"
```

### TDD checklist for Task 5: `SlideSorter`

- [ ] **Step 1: Write the minimal render and warning test first**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckSlide } from '@pixelpitch/contracts';
import { SlideSorter } from './SlideSorter';

const slides: DeckSlide[] = [
  { id: 's1', title: 'Ready', file: 'deck/slides/01.html', beatId: 'b1', status: 'ready' },
  { id: 's2', title: 'Missing Data', file: 'deck/slides/02.html', beatId: 'b2', status: 'needs-data' },
];

describe('SlideSorter', () => {
  it('renders slide cards, status summary, and selection', () => {
    const onSelect = vi.fn();
    render(<SlideSorter slides={slides} onSelect={onSelect} renderThumbnail={(slide) => <span>{slide.title} preview</span>} />);
    expect(screen.getByText(/2 slides/)).toBeInTheDocument();
    expect(screen.getByText(/1 need attention/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Missing Data preview'));
    expect(onSelect).toHaveBeenCalledWith('s2');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- SlideSorter
```

- [ ] **Step 3: Write `SlideSorter.tsx` using the implementation in Task 5.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- SlideSorter
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "SlideSorter|slide-sorter|slide-sorter-grid|slide-sorter-warning|needs-data" apps/web/src/components/deck/SlideSorter.tsx apps/web/src/components/deck/SlideSorter.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/SlideSorter.tsx apps/web/src/components/deck/SlideSorter.test.tsx
git commit -m "feat(deck): add SlideSorter thumbnail grid with quality badges"
```

### TDD checklist for Task 6: `SlideEditor`

- [ ] **Step 1: Write the minimal render and keyboard navigation test first**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckPlan } from '@pixelpitch/contracts';
import { SlideEditor } from './SlideEditor';

const plan: DeckPlan = {
  version: 1,
  phase: 'ready',
  title: 'Deck',
  audience: 'Leaders',
  tone: 'Direct',
  keyMessage: 'Ship it',
  composition: { frameworkId: 'html-ppt', themeId: 'minimal-white', format: '16:9', runtime: 'deck/framework.js', designSystemId: null },
  interview: { history: [] },
  narrative: { beats: [] },
  slides: [
    { id: 's1', title: 'One', file: 'deck/slides/01.html', beatId: 'b1', status: 'ready', speakerNotes: 'First note' },
    { id: 's2', title: 'Two', file: 'deck/slides/02.html', beatId: 'b2', status: 'ready', speakerNotes: 'Second note' },
  ],
  slidify: { lastExport: null, fidelityIssues: [] },
};

describe('SlideEditor', () => {
  it('renders preview, notes, buttons, and arrow-key navigation', () => {
    const onSelectSlide = vi.fn();
    render(
      <SlideEditor
        plan={plan}
        activeSlideId="s1"
        onSelectSlide={onSelectSlide}
        slidePreview={<iframe title="slide preview" />}
        renderThumbnail={(slide) => <span>{slide.title}</span>}
      />,
    );
    expect(screen.getByTitle('slide preview')).toBeInTheDocument();
    expect(screen.getByText('First note')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onSelectSlide).toHaveBeenCalledWith('s2');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- SlideEditor
```

- [ ] **Step 3: Write `SlideEditor.tsx` using the implementation in Task 6 and include the keyboard listener from Task 14.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- SlideEditor
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "SlideEditor|slide-editor|slide-nav|keydown|ArrowLeft|ArrowRight|speakerNotes" apps/web/src/components/deck/SlideEditor.tsx apps/web/src/components/deck/SlideEditor.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/SlideEditor.tsx apps/web/src/components/deck/SlideEditor.test.tsx
git commit -m "feat(deck): add SlideEditor with preview, nav, keyboard controls, and speaker notes"
```

### TDD checklist for Task 7: `ExportPanel`

- [ ] **Step 1: Write the minimal render and action test first**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckPlan } from '@pixelpitch/contracts';
import { ExportPanel } from './ExportPanel';

const plan: DeckPlan = {
  version: 1,
  phase: 'ready',
  title: 'Deck',
  audience: 'Board',
  tone: 'Executive',
  keyMessage: 'Approve the plan',
  composition: { frameworkId: 'html-ppt', themeId: 'minimal-white', format: '16:9', runtime: 'deck/framework.js', designSystemId: null },
  interview: { history: [] },
  narrative: { beats: [] },
  slides: [{ id: 's1', title: 'Ask', file: 'deck/slides/01.html', beatId: 'b1', status: 'ready' }],
  slidify: { lastExport: null, fidelityIssues: [] },
};

describe('ExportPanel', () => {
  it('renders ready state and starts export', () => {
    const onExport = vi.fn();
    render(<ExportPanel plan={plan} exporting={false} onExport={onExport} onClose={vi.fn()} onFixSlide={vi.fn()} />);
    expect(screen.getByText('Export to PPTX')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Export PPTX'));
    expect(onExport).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- ExportPanel
```

- [ ] **Step 3: Write `ExportPanel.tsx` using the implementation in Task 7.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- ExportPanel
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "ExportPanel|export-panel|export-panel-overlay|fidelity-badge|Export PPTX" apps/web/src/components/deck/ExportPanel.tsx apps/web/src/components/deck/ExportPanel.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/ExportPanel.tsx apps/web/src/components/deck/ExportPanel.test.tsx
git commit -m "feat(deck): add ExportPanel with fidelity report and download"
```

### TDD checklist for Task 8: `SlidePlanner`

- [ ] **Step 1: Write the minimal render and evidence selection test first**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckBeat } from '@pixelpitch/contracts';
import { SlidePlanner } from './SlidePlanner';

const beat: DeckBeat = {
  id: 'b1',
  type: 'evidence',
  label: 'Evidence',
  summary: 'Show export reliability',
  evidenceType: 'stat',
  dataPoints: ['99% successful exports'],
};

describe('SlidePlanner', () => {
  it('renders content controls and emits updates', () => {
    const onUpdate = vi.fn();
    render(<SlidePlanner beat={beat} slideIndex={0} totalSlides={3} onUpdate={onUpdate} preview={<span>preview</span>} />);
    fireEvent.change(screen.getByDisplayValue('Show export reliability'), { target: { value: 'Show retry reliability' } });
    fireEvent.click(screen.getByText('Chart'));
    expect(onUpdate).toHaveBeenCalledWith({ summary: 'Show retry reliability' });
    expect(onUpdate).toHaveBeenCalledWith({ evidenceType: 'chart' });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- SlidePlanner
```

- [ ] **Step 3: Write `SlidePlanner.tsx` using the implementation in Task 8.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- SlidePlanner
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "SlidePlanner|slide-planner|EVIDENCE_OPTIONS|slide-planner-pill|dataPoints" apps/web/src/components/deck/SlidePlanner.tsx apps/web/src/components/deck/SlidePlanner.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/SlidePlanner.tsx apps/web/src/components/deck/SlidePlanner.test.tsx
git commit -m "feat(deck): add SlidePlanner content card with evidence selector"
```

### TDD checklist for Task 9: `DeckWorkspace`

- [ ] **Step 1: Write the minimal phase-routing and export test first**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeckPhase, DeckPlan } from '@pixelpitch/contracts';
import { DeckWorkspace } from './DeckWorkspace';

function makePlan(phase: DeckPhase): DeckPlan {
  return {
    version: 1,
    phase,
    title: 'Workspace Deck',
    audience: 'Operators',
    tone: 'Practical',
    keyMessage: 'The workflow is connected.',
    composition: { frameworkId: 'html-ppt', themeId: 'minimal-white', format: '16:9', runtime: 'deck/framework.js', designSystemId: null },
    interview: { history: [] },
    narrative: { beats: [{ id: 'b1', type: 'ask', label: 'Ask', summary: 'Approve rollout' }] },
    slides: [{ id: 's1', title: 'Ask', file: 'deck/slides/01.html', beatId: 'b1', status: 'ready' }],
    slidify: { lastExport: null, fidelityIssues: [] },
  };
}

describe('DeckWorkspace', () => {
  it.each([
    ['narrative', '.story-canvas'],
    ['structure', '.outline-editor'],
    ['generating', '.slide-sorter'],
    ['ready', '.slide-editor'],
  ] as const)('renders %s phase content', (phase, selector) => {
    const { container } = render(
      <DeckWorkspace
        projectId="p1"
        plan={makePlan(phase)}
        onUpdatePlan={vi.fn()}
        chatPane={<span>chat</span>}
        renderSlidePreview={() => <iframe title="slide preview" />}
        renderSlideThumbnail={() => <span>thumb</span>}
        onExport={vi.fn()}
        exporting={false}
      />,
    );
    expect(container.querySelector(selector)).toBeTruthy();
  });

  it('opens export panel from the topbar', () => {
    render(
      <DeckWorkspace
        projectId="p1"
        plan={makePlan('ready')}
        onUpdatePlan={vi.fn()}
        chatPane={<span>chat</span>}
        renderSlidePreview={() => <iframe title="slide preview" />}
        renderSlideThumbnail={() => <span>thumb</span>}
        onExport={vi.fn()}
        exporting={false}
      />,
    );
    fireEvent.click(screen.getByText('Export PPTX'));
    expect(screen.getByText('Export to PPTX')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- DeckWorkspace
```

- [ ] **Step 3: Write `DeckWorkspace.tsx` and `index.ts` using Task 9, plus the SSE subscription from Task 13.**
- [ ] **Step 4: Run the test again and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- DeckWorkspace
```

- [ ] **Step 5: Verify implementation details**

```bash
rg -n "DeckWorkspace|deck-workspace|EventSource|deck:plan:updated|renderSlidePreview|renderSlideThumbnail" apps/web/src/components/deck/DeckWorkspace.tsx apps/web/src/components/deck/index.ts apps/web/src/components/deck/DeckWorkspace.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/deck/DeckWorkspace.tsx apps/web/src/components/deck/index.ts apps/web/src/components/deck/DeckWorkspace.test.tsx
git commit -m "feat(deck): add DeckWorkspace orchestrator and barrel export"
```

### Task 1: DeckPhaseBar Component

**Files:**
- Create: `apps/web/src/components/deck/DeckPhaseBar.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { DeckPhase } from '@pixelpitch/contracts';

const PHASES: { key: DeckPhase; label: string }[] = [
  { key: 'narrative', label: 'Narrative' },
  { key: 'structure', label: 'Structure' },
  { key: 'generating', label: 'Generate' },
  { key: 'ready', label: 'Polish' },
  { key: 'exporting', label: 'Export' },
];

const ORDER: Record<DeckPhase, number> = {
  narrative: 0, structure: 1, generating: 2, ready: 3, exporting: 4,
};

export function DeckPhaseBar({ phase }: { phase: DeckPhase }) {
  const current = ORDER[phase];
  return (
    <div className="deck-phase-bar">
      {PHASES.map(({ key, label }, i) => (
        <div key={key} className="deck-phase-item">
          <div
            className={`deck-phase-dot${
              i < current ? ' done' : i === current ? ' active' : ''
            }`}
          />
          <span
            className={`deck-phase-label${i === current ? ' active' : ''}`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders**

Import in a test harness or storybook. Confirm dots show correct states for each phase value.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/deck/DeckPhaseBar.tsx
git commit -m "feat(deck): add DeckPhaseBar phase progress component"
```

---

### Task 2: StoryCanvas Component

**Files:**
- Create: `apps/web/src/components/deck/StoryCanvas.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { DeckPlan } from '@pixelpitch/contracts';

interface Props {
  plan: DeckPlan;
}

const CARD_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  audience: { bg: 'rgba(129,140,248,0.06)', border: 'rgba(129,140,248,0.2)', label: '#818cf8' },
  keyMessage: { bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.2)', label: '#34d399' },
  tone: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)', label: '#f59e0b' },
  pending: { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.08)', label: '#6b7280' },
};

export function StoryCanvas({ plan }: Props) {
  const cards = [
    { key: 'audience', label: 'AUDIENCE', value: plan.audience },
    { key: 'keyMessage', label: 'KEY MESSAGE', value: plan.keyMessage },
    { key: 'tone', label: 'TONE', value: plan.tone },
  ].filter((c) => c.value);

  const pending = ['audience', 'keyMessage', 'tone'].filter(
    (k) => !plan[k as keyof DeckPlan],
  );

  return (
    <div className="story-canvas">
      <div className="story-canvas-header">
        <span className="story-canvas-kicker">Story Arc — Building...</span>
        <div className="story-canvas-progress">
          {[...cards, ...pending.map(() => null)].map((c, i) => (
            <div
              key={i}
              className={`story-canvas-bar${c ? ' filled' : ''}`}
            />
          ))}
        </div>
      </div>
      {cards.map((card) => {
        const colors = CARD_COLORS[card.key] ?? CARD_COLORS.pending;
        return (
          <div
            key={card.key}
            className="story-canvas-card"
            style={{
              background: colors.bg,
              borderColor: colors.border,
              borderLeftColor: colors.label,
            }}
          >
            <div className="story-canvas-card-label" style={{ color: colors.label }}>
              {card.label}
            </div>
            <div className="story-canvas-card-value">{card.value}</div>
          </div>
        );
      })}
      {pending.length > 0 ? (
        <div
          className="story-canvas-card pending"
          style={{
            background: CARD_COLORS.pending.bg,
            borderColor: CARD_COLORS.pending.border,
          }}
        >
          <div className="story-canvas-card-label" style={{ color: CARD_COLORS.pending.label }}>
            {pending.length === 3 ? 'WAITING FOR ANSWERS' : 'DECISION NEEDED'}
          </div>
          <div className="story-canvas-card-value">Waiting for answer...</div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deck/StoryCanvas.tsx
git commit -m "feat(deck): add StoryCanvas live card stack for narrative interview"
```

---

### Task 3: OutlineEditor Component

**Files:**
- Create: `apps/web/src/components/deck/OutlineEditor.tsx`

- [ ] **Step 1: Create the component with drag-reorder**

```tsx
import { useState } from 'react';
import type { DeckBeat, DeckBeatType } from '@pixelpitch/contracts';
import { Icon } from '../Icon';

interface Props {
  beats: DeckBeat[];
  onReorder: (beats: DeckBeat[]) => void;
  onEditBeat: (id: string, updates: Partial<DeckBeat>) => void;
  onAddBeat: () => void;
  onRemoveBeat: (id: string) => void;
  onProceed: () => void;
}

const BEAT_COLORS: Record<DeckBeatType, { bg: string; text: string }> = {
  context: { bg: '#e8f0fe', text: '#1a73e8' },
  problem: { bg: '#fce8e6', text: '#d93025' },
  solution: { bg: '#e6f4ea', text: '#34a853' },
  evidence: { bg: '#f3e8fd', text: '#8430ce' },
  how: { bg: '#fef7e0', text: '#f9ab00' },
  plan: { bg: '#f2f3f5', text: '#5f6f89' },
  ask: { bg: '#e8f0fe', text: '#1a73e8' },
  custom: { bg: '#f2f3f5', text: '#5f6f89' },
};

export function OutlineEditor({ beats, onReorder, onEditBeat, onAddBeat, onRemoveBeat, onProceed }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...beats];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved!);
    onReorder(next);
    setDragIdx(null);
  }

  return (
    <div className="outline-editor">
      <div className="outline-editor-header">
        <div>
          <div className="outline-editor-title">{beats.length} beats</div>
        </div>
        <div className="outline-editor-actions">
          <button type="button" className="ghost" onClick={onAddBeat}>
            <Icon name="plus" size={12} /> Add beat
          </button>
          <button type="button" className="primary" onClick={onProceed}>
            Proceed to slides →
          </button>
        </div>
      </div>
      <div className="outline-editor-list">
        {beats.map((beat, idx) => {
          const colors = BEAT_COLORS[beat.type];
          return (
            <div
              key={beat.id}
              className={`outline-beat${dragIdx === idx ? ' dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
            >
              <span className="outline-beat-handle" aria-hidden>⠿</span>
              <span
                className="outline-beat-type"
                style={{ background: colors.bg, color: colors.text }}
              >
                {beat.type.toUpperCase()}
              </span>
              <input
                className="outline-beat-summary"
                value={beat.summary}
                onChange={(e) => onEditBeat(beat.id, { summary: e.target.value })}
                placeholder="What's the key point of this beat?"
              />
              <button
                type="button"
                className="outline-beat-remove"
                onClick={() => onRemoveBeat(beat.id)}
                aria-label="Remove beat"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deck/OutlineEditor.tsx
git commit -m "feat(deck): add OutlineEditor with drag-reorder and inline editing"
```

---

### Task 4: SlideStrip Component

**Files:**
- Create: `apps/web/src/components/deck/SlideStrip.tsx`

- [ ] **Step 1: Create the horizontal thumbnail strip**

```tsx
import type { DeckSlide } from '@pixelpitch/contracts';

interface Props {
  slides: DeckSlide[];
  activeId: string | null;
  onSelect: (id: string) => void;
  renderThumbnail: (slide: DeckSlide) => React.ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  ready: '#34d399',
  fixed: '#34d399',
  generating: '#818cf8',
  pending: 'rgba(255,255,255,0.15)',
  'needs-evidence': '#fbbf24',
  'needs-data': '#f87171',
};

export function SlideStrip({ slides, activeId, onSelect, renderThumbnail }: Props) {
  return (
    <div className="slide-strip">
      {slides.map((slide, idx) => (
        <button
          key={slide.id}
          type="button"
          className={`slide-thumb${slide.id === activeId ? ' active' : ''}`}
          onClick={() => onSelect(slide.id)}
          aria-label={`Slide ${idx + 1}: ${slide.title}`}
        >
          <div className="slide-thumb-preview">
            {renderThumbnail(slide)}
            <span className="slide-thumb-num">{idx + 1}</span>
            <span
              className="slide-thumb-badge"
              style={{ background: STATUS_COLORS[slide.status] ?? 'rgba(255,255,255,0.15)' }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deck/SlideStrip.tsx
git commit -m "feat(deck): add SlideStrip horizontal thumbnail navigation"
```

---

### Task 5: SlideSorter Component

**Files:**
- Create: `apps/web/src/components/deck/SlideSorter.tsx`

- [ ] **Step 1: Create the thumbnail grid with quality badges**

```tsx
import type { DeckSlide } from '@pixelpitch/contracts';

interface Props {
  slides: DeckSlide[];
  onSelect: (id: string) => void;
  renderThumbnail: (slide: DeckSlide) => React.ReactNode;
}

export function SlideSorter({ slides, onSelect, renderThumbnail }: Props) {
  const issues = slides.filter(
    (s) => s.status === 'needs-evidence' || s.status === 'needs-data',
  );

  return (
    <div className="slide-sorter">
      <div className="slide-sorter-header">
        <span>
          {slides.length} slides · {slides.filter((s) => s.status === 'ready' || s.status === 'fixed').length} ready
          {issues.length > 0 ? ` · ${issues.length} need attention` : ''}
        </span>
      </div>
      <div className="slide-sorter-grid">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            className={`slide-sorter-card${
              slide.status === 'needs-data' ? ' error' : ''
            }`}
            onClick={() => onSelect(slide.id)}
          >
            <div className="slide-sorter-preview">
              {renderThumbnail(slide)}
            </div>
            <div className="slide-sorter-meta">
              <span>{idx + 1} · {slide.title}</span>
              <span
                className="slide-sorter-badge"
                style={{
                  background:
                    slide.status === 'ready' || slide.status === 'fixed'
                      ? '#34d399'
                      : slide.status === 'needs-evidence'
                        ? '#fbbf24'
                        : slide.status === 'needs-data'
                          ? '#f87171'
                          : 'rgba(255,255,255,0.15)',
                }}
              />
            </div>
          </button>
        ))}
      </div>
      {issues.length > 0 ? (
        <div className="slide-sorter-warning">
          <strong>{issues.length} slides need attention:</strong>{' '}
          {issues.map((s, i) => (
            <span key={s.id}>
              {i > 0 ? ', ' : ''}Slide {slides.indexOf(s) + 1} — {s.status.replace('-', ' ')}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deck/SlideSorter.tsx
git commit -m "feat(deck): add SlideSorter thumbnail grid with quality badges"
```

---

### Task 6: SlideEditor Component

**Files:**
- Create: `apps/web/src/components/deck/SlideEditor.tsx`

- [ ] **Step 1: Create the main slide editing workspace**

```tsx
import type { DeckPlan, DeckSlide } from '@pixelpitch/contracts';
import { SlideStrip } from './SlideStrip';

interface Props {
  plan: DeckPlan;
  activeSlideId: string | null;
  onSelectSlide: (id: string) => void;
  slidePreview: React.ReactNode;
  renderThumbnail: (slide: DeckSlide) => React.ReactNode;
}

export function SlideEditor({
  plan,
  activeSlideId,
  onSelectSlide,
  slidePreview,
  renderThumbnail,
}: Props) {
  const activeSlide = plan.slides.find((s) => s.id === activeSlideId);
  const activeIdx = plan.slides.findIndex((s) => s.id === activeSlideId);

  function navigate(delta: number) {
    const next = Math.max(0, Math.min(plan.slides.length - 1, activeIdx + delta));
    onSelectSlide(plan.slides[next]!.id);
  }

  return (
    <div className="slide-editor">
      <SlideStrip
        slides={plan.slides}
        activeId={activeSlideId}
        onSelect={onSelectSlide}
        renderThumbnail={renderThumbnail}
      />
      <div className="slide-editor-preview">
        {slidePreview}
        <div className="slide-nav">
          <button
            type="button"
            className="slide-nav-btn"
            onClick={() => navigate(-1)}
            disabled={activeIdx <= 0}
          >
            ‹
          </button>
          <span className="slide-nav-count">
            {activeIdx + 1} / {plan.slides.length}
          </span>
          <button
            type="button"
            className="slide-nav-btn"
            onClick={() => navigate(1)}
            disabled={activeIdx >= plan.slides.length - 1}
          >
            ›
          </button>
        </div>
      </div>
      {activeSlide ? (
        <div className="slide-editor-notes">
          <span className="slide-editor-notes-label">Notes</span>
          <span className="slide-editor-notes-text">
            {activeSlide.speakerNotes || 'No speaker notes yet.'}
          </span>
          {activeSlide.status === 'ready' || activeSlide.status === 'fixed' ? (
            <span className="slide-editor-confidence ready">Ready to present</span>
          ) : (
            <span className="slide-editor-confidence pending">{activeSlide.status}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deck/SlideEditor.tsx
git commit -m "feat(deck): add SlideEditor with preview, nav, and speaker notes"
```

---

### Task 7: ExportPanel Component

**Files:**
- Create: `apps/web/src/components/deck/ExportPanel.tsx`

- [ ] **Step 1: Create the export overlay**

```tsx
import type { DeckPlan, FidelityIssue } from '@pixelpitch/contracts';
import { Icon } from '../Icon';

interface Props {
  plan: DeckPlan;
  exporting: boolean;
  onExport: () => void;
  onClose: () => void;
  onFixSlide: (slideId: string) => void;
}

export function ExportPanel({ plan, exporting, onExport, onClose, onFixSlide }: Props) {
  const issues = plan.slidify.fidelityIssues;
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="export-panel-overlay">
      <div className="export-panel">
        <div className="export-panel-header">
          <h2>Export to PPTX</h2>
          <button type="button" className="icon-only" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        {exporting ? (
          <div className="export-panel-progress">
            <div className="export-panel-spinner" />
            <span>Running slidify...</span>
          </div>
        ) : plan.slidify.lastExport ? (
          <div className="export-panel-report">
            <div className="export-panel-summary">
              {errors.length === 0 ? (
                <span className="export-panel-success">Export complete — all slides converted</span>
              ) : (
                <span className="export-panel-warn">
                  {errors.length} slide{errors.length > 1 ? 's' : ''} need attention
                </span>
              )}
            </div>
            {issues.length > 0 ? (
              <table className="export-panel-table">
                <thead>
                  <tr>
                    <th>Slide</th>
                    <th>Issue</th>
                    <th>Severity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue, i) => (
                    <tr key={i}>
                      <td>{issue.slideId}</td>
                      <td>{issue.detail}</td>
                      <td>
                        <span className={`fidelity-badge ${issue.severity}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => onFixSlide(issue.slideId)}
                        >
                          Fix
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {plan.slidify.exportPath ? (
              <a
                href={`/api/projects/current/files/${plan.slidify.exportPath}`}
                className="primary export-panel-download"
                download
              >
                <Icon name="download" size={14} /> Download PPTX
              </a>
            ) : null}
          </div>
        ) : (
          <div className="export-panel-ready">
            <p>{plan.slides.length} slides ready for export.</p>
            <button type="button" className="primary" onClick={onExport}>
              Export PPTX
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deck/ExportPanel.tsx
git commit -m "feat(deck): add ExportPanel with fidelity report and download"
```

---

### Task 8: SlidePlanner Component

**Files:**
- Create: `apps/web/src/components/deck/SlidePlanner.tsx`

- [ ] **Step 1: Create content card editor for each beat**

```tsx
import { useState } from 'react';
import type { DeckBeat, DeckEvidenceType } from '@pixelpitch/contracts';

interface Props {
  beat: DeckBeat;
  slideIndex: number;
  totalSlides: number;
  onUpdate: (updates: Partial<DeckBeat>) => void;
  preview: React.ReactNode;
}

const EVIDENCE_OPTIONS: { value: DeckEvidenceType; label: string }[] = [
  { value: 'stat', label: 'Big stat' },
  { value: 'chart', label: 'Chart' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'quote', label: 'Quote' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'table', label: 'Table' },
  { value: 'none', label: 'None' },
];

export function SlidePlanner({ beat, slideIndex, totalSlides, onUpdate, preview }: Props) {
  return (
    <div className="slide-planner">
      <div className="slide-planner-header">
        Slide {slideIndex + 1} of {totalSlides} — {beat.type}
      </div>
      <div className="slide-planner-body">
        <div className="slide-planner-form">
          <label className="slide-planner-label">
            Headline
            <input
              className="slide-planner-input"
              value={beat.summary}
              onChange={(e) => onUpdate({ summary: e.target.value })}
              placeholder="What's the one takeaway from this slide?"
            />
          </label>
          <label className="slide-planner-label">
            Evidence type
            <div className="slide-planner-pills">
              {EVIDENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`slide-planner-pill${beat.evidenceType === opt.value ? ' active' : ''}`}
                  onClick={() => onUpdate({ evidenceType: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </label>
          <label className="slide-planner-label">
            Key data points
            <textarea
              className="slide-planner-textarea"
              value={(beat.dataPoints ?? []).join('\n')}
              onChange={(e) =>
                onUpdate({ dataPoints: e.target.value.split('\n').filter(Boolean) })
              }
              placeholder="One data point per line"
              rows={3}
            />
          </label>
        </div>
        <div className="slide-planner-preview">
          {preview}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/deck/SlidePlanner.tsx
git commit -m "feat(deck): add SlidePlanner content card with evidence selector"
```

---

### Task 9: DeckWorkspace Orchestrator

**Files:**
- Create: `apps/web/src/components/deck/DeckWorkspace.tsx`
- Create: `apps/web/src/components/deck/index.ts`

- [ ] **Step 1: Create the top-level orchestrator**

```tsx
import { useEffect, useState } from 'react';
import type { DeckPlan } from '@pixelpitch/contracts';
import { DeckPhaseBar } from './DeckPhaseBar';
import { ExportPanel } from './ExportPanel';
import { OutlineEditor } from './OutlineEditor';
import { SlideEditor } from './SlideEditor';
import { SlideSorter } from './SlideSorter';
import { StoryCanvas } from './StoryCanvas';

interface Props {
  projectId: string;
  plan: DeckPlan | null;
  onUpdatePlan: (updates: Partial<DeckPlan>) => void;
  chatPane: React.ReactNode;
  renderSlidePreview: (slideId: string) => React.ReactNode;
  renderSlideThumbnail: (slideId: string) => React.ReactNode;
  onExport: () => void;
  exporting: boolean;
}

export function DeckWorkspace({
  projectId,
  plan,
  onUpdatePlan,
  chatPane,
  renderSlidePreview,
  renderSlideThumbnail,
  onExport,
  exporting,
}: Props) {
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (plan?.slides.length && !activeSlideId) {
      setActiveSlideId(plan.slides[0]!.id);
    }
  }, [plan?.slides.length, activeSlideId]);

  if (!plan) return null;

  return (
    <div className="deck-workspace">
      <div className="deck-workspace-topbar">
        <DeckPhaseBar phase={plan.phase} />
        <span className="deck-workspace-title">{plan.title || 'Untitled Deck'}</span>
        <div className="deck-workspace-actions">
          <button type="button" className="topbar-btn" onClick={() => setShowExport(true)}>
            Export PPTX
          </button>
        </div>
      </div>

      <div className="deck-workspace-body">
        {plan.phase === 'narrative' ? (
          <>
            <div className="deck-workspace-chat">{chatPane}</div>
            <div className="deck-workspace-canvas">
              <StoryCanvas plan={plan} />
            </div>
          </>
        ) : null}

        {plan.phase === 'structure' ? (
          <OutlineEditor
            beats={plan.narrative.beats}
            onReorder={(beats) => onUpdatePlan({ narrative: { beats } })}
            onEditBeat={(id, updates) => {
              const beats = plan.narrative.beats.map((b) =>
                b.id === id ? { ...b, ...updates } : b,
              );
              onUpdatePlan({ narrative: { beats } });
            }}
            onAddBeat={() => {
              const beats = [
                ...plan.narrative.beats,
                {
                  id: `b${Date.now()}`,
                  type: 'custom' as const,
                  label: 'New beat',
                  summary: '',
                },
              ];
              onUpdatePlan({ narrative: { beats } });
            }}
            onRemoveBeat={(id) => {
              const beats = plan.narrative.beats.filter((b) => b.id !== id);
              onUpdatePlan({ narrative: { beats } });
            }}
            onProceed={() => onUpdatePlan({ phase: 'generating' })}
          />
        ) : null}

        {plan.phase === 'generating' ? (
          <SlideSorter
            slides={plan.slides}
            onSelect={(id) => {
              setActiveSlideId(id);
              onUpdatePlan({ phase: 'ready' });
            }}
            renderThumbnail={(slide) => renderSlideThumbnail(slide.id)}
          />
        ) : null}

        {plan.phase === 'ready' ? (
          <>
            <div className="deck-workspace-chat">{chatPane}</div>
            <div className="deck-workspace-editor">
              <SlideEditor
                plan={plan}
                activeSlideId={activeSlideId}
                onSelectSlide={setActiveSlideId}
                slidePreview={activeSlideId ? renderSlidePreview(activeSlideId) : null}
                renderThumbnail={(slide) => renderSlideThumbnail(slide.id)}
              />
            </div>
          </>
        ) : null}
      </div>

      {showExport ? (
        <ExportPanel
          plan={plan}
          exporting={exporting}
          onExport={onExport}
          onClose={() => setShowExport(false)}
          onFixSlide={(slideId) => {
            setActiveSlideId(slideId);
            setShowExport(false);
            onUpdatePlan({ phase: 'ready' });
          }}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Create barrel export**

```tsx
// apps/web/src/components/deck/index.ts
export { DeckWorkspace } from './DeckWorkspace';
export { DeckPhaseBar } from './DeckPhaseBar';
export { StoryCanvas } from './StoryCanvas';
export { OutlineEditor } from './OutlineEditor';
export { SlidePlanner } from './SlidePlanner';
export { SlideSorter } from './SlideSorter';
export { SlideEditor } from './SlideEditor';
export { SlideStrip } from './SlideStrip';
export { ExportPanel } from './ExportPanel';
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/deck/
git commit -m "feat(deck): add DeckWorkspace orchestrator and barrel export"
```

---

### Task 10: Wire DeckWorkspace into ProjectView

**Files:**
- Modify: `apps/web/src/components/ProjectView.tsx`

- [ ] **Step 1: Import and detect deck mode**

In ProjectView.tsx, add deck detection and render DeckWorkspace when the project has a deck-plan.json:

```tsx
import { DeckWorkspace } from './deck';

// In the component body, after isDeck detection:
const [deckPlan, setDeckPlan] = useState<DeckPlan | null>(null);

useEffect(() => {
  if (!isDeck || !projectId) return;
  // Use the dedicated deck plan endpoint (not generic file API)
  fetch(`/api/projects/${projectId}/deck/plan`)
    .then((r) => r.ok ? r.json() : null)
    .then(setDeckPlan)
    .catch(() => setDeckPlan(null));
}, [isDeck, projectId]);

// In the render, when deckPlan exists, render DeckWorkspace instead of FileWorkspace
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ProjectView.tsx
git commit -m "feat(deck): wire DeckWorkspace into ProjectView for deck projects"
```

---

### Task 11: CSS Styles for Deck Components

**Files:**
- Modify: `apps/web/src/index.css`

- [ ] **Step 1: Add deck workspace styles**

Add CSS for all deck components at the end of index.css. This includes:
- `.deck-workspace` grid layout
- `.deck-phase-bar` phase dots
- `.story-canvas` card stack
- `.outline-editor` draggable list
- `.slide-strip` thumbnail strip
- `.slide-sorter` thumbnail grid
- `.slide-editor` preview + notes
- `.export-panel` overlay
- Dark mode variants for all

- [ ] **Step 2: Append this CSS**

```css
.deck-workspace {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 100%;
  background: var(--app-bg, #f7f8fb);
  color: var(--app-fg, #172033);
}

.deck-workspace-topbar {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.1);
  background: rgba(255, 255, 255, 0.92);
}

.deck-workspace-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 650;
}

.deck-workspace-body {
  display: grid;
  grid-template-columns: minmax(320px, 0.32fr) minmax(0, 1fr);
  min-height: 0;
}

.deck-workspace-chat,
.deck-workspace-canvas,
.deck-workspace-editor {
  min-width: 0;
  min-height: 0;
}

.deck-workspace-chat {
  border-right: 1px solid rgba(23, 32, 51, 0.1);
  background: rgba(255, 255, 255, 0.72);
}

.deck-workspace-canvas,
.deck-workspace-editor {
  padding: 20px;
  overflow: auto;
}

.deck-phase-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.deck-phase-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.deck-phase-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #c7cedb;
  box-shadow: 0 0 0 3px rgba(199, 206, 219, 0.22);
}

.deck-phase-dot.done {
  background: #2fbf71;
  box-shadow: 0 0 0 3px rgba(47, 191, 113, 0.18);
}

.deck-phase-dot.active {
  background: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.18);
}

.deck-phase-label {
  font-size: 12px;
  font-weight: 600;
  color: #657083;
}

.deck-phase-label.active {
  color: #172033;
}

.story-canvas {
  display: grid;
  gap: 14px;
  max-width: 760px;
}

.story-canvas-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.story-canvas-kicker,
.slide-editor-notes-label,
.slide-planner-header {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #667085;
}

.story-canvas-progress {
  display: grid;
  grid-template-columns: repeat(3, 42px);
  gap: 5px;
}

.story-canvas-bar {
  height: 4px;
  border-radius: 999px;
  background: rgba(23, 32, 51, 0.12);
}

.story-canvas-bar.filled {
  background: #2563eb;
}

.story-canvas-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid rgba(23, 32, 51, 0.1);
  border-left-width: 4px;
  border-radius: 8px;
  background: #fff;
}

.story-canvas-card.pending {
  border-left-color: rgba(23, 32, 51, 0.28);
}

.story-canvas-card-label {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.story-canvas-card-value {
  font-size: 18px;
  line-height: 1.35;
  color: #172033;
}

.outline-editor {
  display: grid;
  gap: 16px;
  width: 100%;
}

.outline-editor-header,
.slide-sorter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.outline-editor-title {
  font-size: 18px;
  font-weight: 700;
}

.outline-editor-actions {
  display: inline-flex;
  gap: 8px;
}

.outline-editor-list {
  display: grid;
  gap: 10px;
}

.outline-beat {
  display: grid;
  grid-template-columns: auto auto minmax(160px, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(23, 32, 51, 0.1);
  border-radius: 8px;
  background: #fff;
}

.outline-beat.dragging {
  opacity: 0.55;
}

.outline-beat-handle {
  cursor: grab;
  color: #8a94a6;
}

.outline-beat-type,
.fidelity-badge,
.slide-sorter-badge {
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.outline-beat-type {
  padding: 4px 8px;
}

.outline-beat-summary {
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
}

.outline-beat-remove,
.icon-only,
.slide-nav-btn {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(23, 32, 51, 0.12);
  border-radius: 7px;
  background: #fff;
  color: inherit;
}

.slide-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 10px 0;
}

.slide-thumb {
  flex: 0 0 142px;
  padding: 0;
  border: 1px solid rgba(23, 32, 51, 0.12);
  border-radius: 8px;
  background: #fff;
}

.slide-thumb.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.slide-thumb-preview,
.slide-sorter-preview,
.slide-editor-preview-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #eef1f6;
}

.slide-thumb-num {
  position: absolute;
  left: 7px;
  bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.slide-thumb-badge,
.slide-sorter-badge {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 9px;
  height: 9px;
}

.slide-sorter {
  display: grid;
  gap: 16px;
}

.slide-sorter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.slide-sorter-card {
  display: grid;
  gap: 9px;
  padding: 10px;
  border: 1px solid rgba(23, 32, 51, 0.12);
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-align: left;
}

.slide-sorter-card.error {
  border-color: rgba(220, 38, 38, 0.38);
}

.slide-sorter-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 650;
}

.slide-sorter-warning {
  padding: 12px;
  border: 1px solid rgba(180, 83, 9, 0.24);
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.1);
  color: #7c4a03;
}

.slide-editor {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 14px;
  min-height: 0;
}

.slide-editor-preview {
  display: grid;
  place-items: center;
  min-height: 0;
  padding: 18px;
  border-radius: 8px;
  background: #dfe5ef;
}

.slide-editor-preview iframe {
  width: min(100%, 1280px);
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(23, 32, 51, 0.18);
}

.slide-nav {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.slide-nav-count {
  font-size: 12px;
  font-weight: 700;
}

.slide-editor-notes {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(23, 32, 51, 0.1);
  border-radius: 8px;
  background: #fff;
}

.slide-editor-notes-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slide-editor-confidence {
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 750;
}

.slide-editor-confidence.ready {
  background: rgba(47, 191, 113, 0.14);
  color: #147346;
}

.slide-editor-confidence.pending {
  background: rgba(251, 191, 36, 0.18);
  color: #7c4a03;
}

.slide-planner {
  display: grid;
  gap: 12px;
}

.slide-planner-body {
  display: grid;
  grid-template-columns: minmax(280px, 0.42fr) minmax(0, 1fr);
  gap: 16px;
}

.slide-planner-form {
  display: grid;
  gap: 14px;
}

.slide-planner-label {
  display: grid;
  gap: 7px;
  font-size: 12px;
  font-weight: 650;
}

.slide-planner-input,
.slide-planner-textarea {
  width: 100%;
  border: 1px solid rgba(23, 32, 51, 0.14);
  border-radius: 7px;
  padding: 9px 10px;
  background: #fff;
  color: inherit;
}

.slide-planner-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.slide-planner-pill {
  border: 1px solid rgba(23, 32, 51, 0.14);
  border-radius: 999px;
  padding: 6px 10px;
  background: #fff;
  color: inherit;
}

.slide-planner-pill.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
  color: #1746a2;
}

.slide-planner-preview {
  min-width: 0;
}

.export-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(10, 15, 25, 0.46);
}

.export-panel {
  display: grid;
  gap: 18px;
  width: min(720px, 100%);
  max-height: min(720px, calc(100vh - 48px));
  overflow: auto;
  border-radius: 8px;
  padding: 20px;
  background: #fff;
  color: #172033;
  box-shadow: 0 24px 90px rgba(10, 15, 25, 0.28);
}

.export-panel-header,
.export-panel-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.export-panel-header h2 {
  margin: 0;
  font-size: 20px;
}

.export-panel-progress,
.export-panel-ready {
  display: grid;
  justify-items: start;
  gap: 12px;
}

.export-panel-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(37, 99, 235, 0.18);
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: deck-spin 0.9s linear infinite;
}

.export-panel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.export-panel-table th,
.export-panel-table td {
  padding: 9px;
  border-bottom: 1px solid rgba(23, 32, 51, 0.1);
  text-align: left;
}

.fidelity-badge {
  padding: 4px 8px;
}

.fidelity-badge.error {
  background: rgba(220, 38, 38, 0.12);
  color: #991b1b;
}

.fidelity-badge.warning {
  background: rgba(251, 191, 36, 0.16);
  color: #7c4a03;
}

.export-panel-download {
  width: fit-content;
}

@keyframes deck-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-color-scheme: dark) {
  .deck-workspace {
    background: #111722;
    color: #edf2fb;
  }

  .deck-workspace-topbar,
  .deck-workspace-chat,
  .story-canvas-card,
  .outline-beat,
  .outline-beat-remove,
  .icon-only,
  .slide-nav-btn,
  .slide-thumb,
  .slide-sorter-card,
  .slide-editor-notes,
  .slide-planner-input,
  .slide-planner-textarea,
  .slide-planner-pill,
  .export-panel {
    background: #182131;
    color: #edf2fb;
  }

  .deck-workspace-topbar,
  .deck-workspace-chat,
  .story-canvas-card,
  .outline-beat,
  .slide-thumb,
  .slide-sorter-card,
  .slide-editor-notes,
  .slide-planner-input,
  .slide-planner-textarea,
  .slide-planner-pill,
  .export-panel-table th,
  .export-panel-table td {
    border-color: rgba(237, 242, 251, 0.12);
  }

  .deck-phase-label {
    color: #9aa8bd;
  }

  .deck-phase-label.active,
  .story-canvas-card-value {
    color: #edf2fb;
  }

  .story-canvas-bar {
    background: rgba(237, 242, 251, 0.14);
  }

  .slide-thumb-preview,
  .slide-sorter-preview,
  .slide-editor-preview {
    background: #0d1320;
  }

  .slide-editor-preview iframe {
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
  }

  .slide-sorter-warning {
    border-color: rgba(251, 191, 36, 0.28);
    background: rgba(251, 191, 36, 0.12);
    color: #f7d071;
  }

  .export-panel-overlay {
    background: rgba(0, 0, 0, 0.62);
  }
}
```

- [ ] **Step 3: Verify CSS selectors exist**

```bash
rg -n "deck-workspace|deck-phase-bar|story-canvas|outline-editor|slide-strip|slide-sorter|slide-editor|export-panel|prefers-color-scheme: dark" apps/web/src/index.css
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(deck): add CSS styles for all deck workspace components"
```

---

### Task 12: Implement Slide Srcdoc Stitching

**Files:**
- Modify: `apps/web/src/components/ProjectView.tsx`
- Reference: `apps/web/src/runtime/srcdoc.ts`

- [ ] **Step 1: Add a focused test before implementation**

Extend the ProjectView or deck integration test to assert that `renderSlidePreview` and `renderSlideThumbnail` render iframes whose `srcDoc` includes theme CSS, framework JS, and the requested slide fragment.

```tsx
expect(screen.getByTitle('Slide preview')).toHaveAttribute('srcdoc', expect.stringContaining('deck-title'));
expect(screen.getByTitle('Slide preview')).toHaveAttribute('srcdoc', expect.stringContaining('--deck-bg'));
expect(screen.getByTitle('Slide preview')).toHaveAttribute('srcdoc', expect.stringContaining('framework-ready'));
```

- [ ] **Step 2: Run the test and verify it fails because `srcDoc` is not assembled**

```bash
bun run --filter @pixelpitch/web test -- DeckWorkspace
```

- [ ] **Step 3: Use the existing `buildSrcdoc()` helper**

Read `apps/web/src/runtime/srcdoc.ts` and use its existing `buildSrcdoc()` function. Do not duplicate the full HTML wrapper logic in `ProjectView.tsx`.

```bash
rg -n "function buildSrcdoc|export .*buildSrcdoc|srcdoc" apps/web/src/runtime/srcdoc.ts
```

- [ ] **Step 4: Add slide asset fetching and iframe renderers**

```tsx
import { buildSrcdoc } from '../runtime/srcdoc';

type SlideSrcdocAssets = {
  themeCss: string;
  frameworkCss: string;
  frameworkJs: string;
  fragments: Record<string, string>;
};

const [slideAssets, setSlideAssets] = useState<SlideSrcdocAssets | null>(null);

useEffect(() => {
  if (!isDeck || !projectId || !deckPlan) return;
  let cancelled = false;

  async function fetchText(path: string) {
    const response = await fetch(`/api/projects/${projectId}/files/${encodeURIComponent(path)}`);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.text();
  }

  async function loadAssets() {
    const [themeCss, frameworkCss, frameworkJs, slideEntries] = await Promise.all([
      fetchText('deck/theme.css'),
      fetchText('deck/framework.css'),
      fetchText('deck/framework.js'),
      Promise.all(
        deckPlan.slides.map(async (slide) => [
          slide.id,
          await fetchText(slide.file),
        ] as const),
      ),
    ]);

    if (!cancelled) {
      setSlideAssets({
        themeCss,
        frameworkCss,
        frameworkJs,
        fragments: Object.fromEntries(slideEntries),
      });
    }
  }

  loadAssets().catch(() => {
    if (!cancelled) setSlideAssets(null);
  });

  return () => {
    cancelled = true;
  };
}, [isDeck, projectId, deckPlan]);

function renderSlideFrame(slideId: string, title: string, scale: 'preview' | 'thumbnail') {
  const slide = deckPlan?.slides.find((entry) => entry.id === slideId);
  const fragment = slideAssets?.fragments[slideId];
  if (!slide || !slideAssets || !fragment) return null;

  const srcDoc = buildSrcdoc({
    title,
    html: fragment,
    css: `${slideAssets.themeCss}\n${slideAssets.frameworkCss}`,
    js: slideAssets.frameworkJs,
  });

  return (
    <iframe
      title={title}
      className={scale === 'thumbnail' ? 'deck-slide-thumbnail-frame' : 'deck-slide-preview-frame'}
      sandbox="allow-scripts"
      srcDoc={srcDoc}
    />
  );
}

const renderSlidePreview = (slideId: string) =>
  renderSlideFrame(slideId, 'Slide preview', 'preview');

const renderSlideThumbnail = (slideId: string) =>
  renderSlideFrame(slideId, 'Slide thumbnail', 'thumbnail');
```

- [ ] **Step 5: Run the test and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- DeckWorkspace
```

- [ ] **Step 6: Verify srcdoc stitching**

```bash
rg -n "buildSrcdoc|theme.css|framework.css|framework.js|srcDoc|deck-slide-preview-frame|deck-slide-thumbnail-frame" apps/web/src/components/ProjectView.tsx apps/web/src/runtime/srcdoc.ts
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ProjectView.tsx apps/web/src/components/deck/DeckWorkspace.test.tsx
git commit -m "feat(deck): stitch slide fragments into preview srcdoc"
```

---

### Task 13: Subscribe to Deck Plan SSE Updates

**Files:**
- Modify: `apps/web/src/components/ProjectView.tsx`
- Modify: `apps/web/src/components/deck/DeckWorkspace.test.tsx`

- [ ] **Step 1: Add a failing test for live plan refresh**

Mock `EventSource`, emit a `deck:plan:updated` message, and assert that the plan endpoint is fetched again.

```tsx
expect(fetch).toHaveBeenCalledWith('/api/projects/p1/deck/plan');
eventSource.emit('deck:plan:updated', new MessageEvent('deck:plan:updated', { data: '{"projectId":"p1"}' }));
expect(fetch).toHaveBeenCalledTimes(2);
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- DeckWorkspace
```

- [ ] **Step 3: Add the SSE subscription beside the existing plan fetch**

```tsx
const reloadDeckPlan = useCallback(async () => {
  if (!isDeck || !projectId) return;
  const response = await fetch(`/api/projects/${projectId}/deck/plan`);
  setDeckPlan(response.ok ? await response.json() : null);
}, [isDeck, projectId]);

useEffect(() => {
  reloadDeckPlan().catch(() => setDeckPlan(null));
}, [reloadDeckPlan]);

useEffect(() => {
  if (!isDeck || !projectId) return;
  const events = new EventSource(`/api/projects/${projectId}/events`);

  function handlePlanUpdated(event: MessageEvent) {
    const payload = event.data ? JSON.parse(event.data) : {};
    if (!payload.projectId || payload.projectId === projectId) {
      reloadDeckPlan().catch(() => setDeckPlan(null));
    }
  }

  events.addEventListener('deck:plan:updated', handlePlanUpdated);

  return () => {
    events.removeEventListener('deck:plan:updated', handlePlanUpdated);
    events.close();
  };
}, [isDeck, projectId, reloadDeckPlan]);
```

- [ ] **Step 4: Run the test and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- DeckWorkspace
```

- [ ] **Step 5: Verify SSE implementation**

```bash
rg -n "EventSource|deck:plan:updated|reloadDeckPlan|addEventListener|removeEventListener" apps/web/src/components/ProjectView.tsx apps/web/src/components/deck/DeckWorkspace.test.tsx
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ProjectView.tsx apps/web/src/components/deck/DeckWorkspace.test.tsx
git commit -m "feat(deck): refresh DeckWorkspace from deck plan SSE events"
```

---

### Task 14: Add SlideEditor Keyboard Navigation

**Files:**
- Modify: `apps/web/src/components/deck/SlideEditor.tsx`
- Modify: `apps/web/src/components/deck/SlideEditor.test.tsx`

- [ ] **Step 1: Add the failing keyboard test**

The Task 6 TDD test already includes `ArrowRight`. Add `ArrowLeft`, boundary behavior, and text-input guarding.

```tsx
fireEvent.keyDown(window, { key: 'ArrowRight' });
expect(onSelectSlide).toHaveBeenCalledWith('s2');
fireEvent.keyDown(window, { key: 'ArrowLeft' });
expect(onSelectSlide).toHaveBeenCalledWith('s1');
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
bun run --filter @pixelpitch/web test -- SlideEditor
```

- [ ] **Step 3: Add this `useEffect` inside `SlideEditor` after `navigate`**

```tsx
useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable;

    if (isTyping) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(-1);
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(1);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [activeIdx, plan.slides]);
```

- [ ] **Step 4: Import `useEffect`**

```tsx
import { useEffect } from 'react';
```

- [ ] **Step 5: Run the test and verify it passes**

```bash
bun run --filter @pixelpitch/web test -- SlideEditor
```

- [ ] **Step 6: Verify keyboard implementation**

```bash
rg -n "useEffect|keydown|ArrowLeft|ArrowRight|isContentEditable|removeEventListener" apps/web/src/components/deck/SlideEditor.tsx apps/web/src/components/deck/SlideEditor.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/deck/SlideEditor.tsx apps/web/src/components/deck/SlideEditor.test.tsx
git commit -m "feat(deck): add keyboard slide navigation"
```
