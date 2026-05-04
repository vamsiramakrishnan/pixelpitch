# Web Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 9 React components that render the deck authoring workspace — phase-driven UI from narrative interview through slide editing to export.

**Architecture:** `DeckWorkspace` reads `deck-plan.json` via the daemon API and renders the phase-appropriate child component. Each phase has its own component. The slide preview is an iframe with dynamically stitched srcdoc.

**Tech Stack:** React 18, TypeScript, CSS (index.css), existing Icon/Loading/QuestionForm components

**Dependencies:** Requires `packages/contracts/src/api/deck.ts` (from 01-contracts.md) and daemon endpoints (from 03-daemon.md)

---

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

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(deck): add CSS styles for all deck workspace components"
```
