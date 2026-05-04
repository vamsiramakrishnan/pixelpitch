# Contracts Implementation Plan: Unified Deck Skill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Define the shared TypeScript interfaces and validation logic for the unified deck workflow.
**Architecture:** Centralized contracts in `packages/contracts` used by both the daemon and web app to ensure schema consistency across the narrative, structure, and export phases.
**Tech Stack:** TypeScript, Vitest (test runner)
---

## Task 1: Initialize `packages/contracts/src/api/deck.ts`

- [ ] Create the file `packages/contracts/src/api/deck.ts` with the version constant.
- [ ] Write the basic phase type.

```typescript
export const DECK_PLAN_VERSION = 1;
export type DeckPhase = 'narrative' | 'structure' | 'generating' | 'ready' | 'exporting';
```

- [ ] Verification command:

```bash
test -f packages/contracts/src/api/deck.ts && rg "DECK_PLAN_VERSION = 1" packages/contracts/src/api/deck.ts
```

## Task 2: Define Composition and Interview Types

- [ ] Append `DeckComposition` and `DeckInterview` to `packages/contracts/src/api/deck.ts`.

```typescript
export interface DeckComposition {
  frameworkId: string;            // e.g., 'html-ppt', 'replit-deck'
  themeId: string;                // e.g., 'tokyo-night.css'
  format: '16:9' | '3:4' | 'A4';
  runtime: string;                // path to framework.js
  designSystemId: string | null;
}

export interface DeckInterview {
  history: Array<{
    questionId: string;
    question: string;
    answer: string;
    timestamp: string;
  }>;
  pendingQuestionId?: string;
}
```

- [ ] Verification command:

```bash
rg -n "DeckComposition|DeckInterview" packages/contracts/src/api/deck.ts
```

## Task 3: Define Beat and Evidence Types

- [ ] Append `DeckBeatType`, `DeckEvidenceType`, and `DeckBeat` to `packages/contracts/src/api/deck.ts`.

```typescript
export type DeckBeatType = 'context' | 'problem' | 'solution' | 'evidence' | 'how' | 'plan' | 'ask' | 'custom';
export type DeckEvidenceType = 'stat' | 'chart' | 'diagram' | 'quote' | 'screenshot' | 'table' | 'none';

export interface DeckBeat {
  id: string;
  type: DeckBeatType;
  label: string;
  summary: string;
  evidenceType?: DeckEvidenceType;
  dataPoints?: string[];
}
```

- [ ] Verification command:

```bash
rg -n "DeckBeatType|DeckEvidenceType|DeckBeat" packages/contracts/src/api/deck.ts
```

## Task 4: Define Slide and Fidelity Types

- [ ] Append `DeckSlideStatus`, `DeckSlide`, and `FidelityIssue` to `packages/contracts/src/api/deck.ts`.

```typescript
export type DeckSlideStatus = 'pending' | 'generating' | 'ready' | 'needs-evidence' | 'needs-data' | 'fixed';

export interface DeckSlide {
  id: string;
  beatId: string;
  type: string;                     // maps to archetype in slide-types.md
  title: string;
  file: string;                     // slides/01-title.html
  status: DeckSlideStatus;
  speakerNotes: string;
  qualityIssues?: string[];
}

export interface FidelityIssue {
  slideId: string;
  issue: 'rasterized' | 'overflow' | 'font-missing' | 'layout-drift';
  detail: string;
  severity: 'info' | 'warning' | 'error';
}
```

- [ ] Verification command:

```bash
rg -n "DeckSlide|FidelityIssue" packages/contracts/src/api/deck.ts
```

## Task 5: Define Export and Plan Types

- [ ] Append `DeckExportState` and `DeckPlan` to `packages/contracts/src/api/deck.ts`.

```typescript
export interface DeckExportState {
  lastExport: string | null;      // ISO timestamp
  fidelityIssues: FidelityIssue[];
  exportPath?: string;            // relative path to produced .pptx
}

export interface DeckPlan {
  version: typeof DECK_PLAN_VERSION;
  phase: DeckPhase;
  
  // Deck metadata
  title: string;
  audience: string;
  tone: string;
  keyMessage: string;
  
  composition: DeckComposition;
  interview: DeckInterview;
  narrative: {
    beats: DeckBeat[];
  };
  slides: DeckSlide[];
  slidify: DeckExportState;
}
```

- [ ] Verification command:

```bash
rg -n "DeckExportState|DeckPlan" packages/contracts/src/api/deck.ts
```

## Task 6: Define API Request/Response and Scope Types

- [ ] Append `DeckAssembleResponse`, `DeckExportRequest`, `DeckExportResponse`, `DeckPlanUpdateRequest`, and `ChatMessageScope` to `packages/contracts/src/api/deck.ts`.
- [ ] Note: `ChatMessageScope` is used by the daemon for per-slide chat routing.

```typescript
export interface DeckAssembleResponse {
  success: boolean;
  outputPath: string; // deck.html
  slideCount: number;
}

export interface DeckExportRequest {
  target: 'pptx' | 'pdf';
  includeFidelityReport: boolean;
}

export interface DeckExportResponse {
  success: boolean;
  pptxPath: string;
  fidelityReport: FidelityIssue[];
}

export interface DeckPlanUpdateRequest {
  phase?: DeckPhase;
  title?: string;
  audience?: string;
  tone?: string;
  keyMessage?: string;
  composition?: Partial<DeckComposition>;
  interview?: Partial<DeckInterview>;
  narrative?: {
    beats?: DeckBeat[];
  };
  slides?: DeckSlide[];
}

export interface ChatMessageScope {
  type: 'slide';
  id: string;
}
```

- [ ] Verification command:

```bash
rg -n "DeckPlanUpdateRequest|ChatMessageScope" packages/contracts/src/api/deck.ts
```

## Task 7: Implement `validatePhaseTransition`

- [ ] Append the validation function to `packages/contracts/src/api/deck.ts`.

```typescript
/**
 * Validation Logic for phase transitions
 */
export function validatePhaseTransition(plan: DeckPlan, nextPhase: DeckPhase): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (nextPhase === 'structure') {
    if (!plan.title) errors.push('Title is required');
    if (!plan.audience) errors.push('Audience is required');
    if (!plan.keyMessage) errors.push('Key message is required');
  }
  
  if (nextPhase === 'generating') {
    if (plan.narrative.beats.length === 0) errors.push('At least one narrative beat is required');
    const hasCallToAction = plan.narrative.beats.some(b => b.type === 'ask' || b.type === 'plan');
    if (!hasCallToAction) errors.push('Narrative must contain an "ask" or "plan" beat');
  }
  
  if (nextPhase === 'ready') {
    const incomplete = plan.slides.filter(s => s.status !== 'ready' && s.status !== 'fixed');
    if (incomplete.length > 0) {
      errors.push(`Incomplete slides: ${incomplete.map(s => s.id).join(', ')}`);
    }
  }

  // Phase sequence validation (optional but recommended)
  if (plan.phase === 'narrative' && nextPhase === 'ready') {
    errors.push('Cannot jump from narrative to ready; must go through structure and generating');
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] Verification command:

```bash
rg -n "function validatePhaseTransition" packages/contracts/src/api/deck.ts
```

## Task 8: Update `packages/contracts/src/index.ts`

- [ ] Add the export for the deck contracts to `packages/contracts/src/index.ts`.

```typescript
export * from './api/deck';
```

- [ ] Verification command:

```bash
rg "export \* from './api/deck'" packages/contracts/src/index.ts
```

## Task 9: Create and Run Validation Tests

- [ ] Create `packages/contracts/src/api/deck.test.ts`.
- [ ] Add comprehensive tests for phase transitions including success and failure cases.

```typescript
import { describe, expect, it } from 'vitest';
import { DeckPlan, validatePhaseTransition } from './deck';

const mockPlan: DeckPlan = {
  version: 1,
  phase: 'narrative',
  title: '',
  audience: '',
  tone: '',
  keyMessage: '',
  composition: {
    frameworkId: 'html-ppt',
    themeId: 'tokyo-night',
    format: '16:9',
    runtime: 'assets/framework.js',
    designSystemId: null
  },
  interview: { history: [] },
  narrative: { beats: [] },
  slides: [],
  slidify: { lastExport: null, fidelityIssues: [] }
};

describe('DeckPlan Phase Validation', () => {
  it('narrative -> structure: fails without title/audience/keyMessage', () => {
    const result = validatePhaseTransition(mockPlan, 'structure');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
    expect(result.errors).toContain('Audience is required');
    expect(result.errors).toContain('Key message is required');
  });

  it('narrative -> structure: passes with all three', () => {
    const validPlan = { ...mockPlan, title: 'Test', audience: 'Test', keyMessage: 'Test' };
    const result = validatePhaseTransition(validPlan, 'structure');
    expect(result.valid).toBe(true);
  });

  it('structure -> generating: fails without beats', () => {
    const plan = { ...mockPlan, title: 'T', audience: 'A', keyMessage: 'K', phase: 'structure' } as DeckPlan;
    const result = validatePhaseTransition(plan, 'generating');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one narrative beat is required');
  });

  it('structure -> generating: fails without ask/plan beat', () => {
    const plan = { 
      ...mockPlan, 
      title: 'T', audience: 'A', keyMessage: 'K', phase: 'structure',
      narrative: { beats: [{ id: '1', type: 'context', label: 'L', summary: 'S' }] }
    } as DeckPlan;
    const result = validatePhaseTransition(plan, 'generating');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Narrative must contain an "ask" or "plan" beat');
  });

  it('structure -> generating: passes with valid beats', () => {
    const plan = { 
      ...mockPlan, 
      title: 'T', audience: 'A', keyMessage: 'K', phase: 'structure',
      narrative: { beats: [{ id: '1', type: 'ask', label: 'L', summary: 'S' }] }
    } as DeckPlan;
    const result = validatePhaseTransition(plan, 'generating');
    expect(result.valid).toBe(true);
  });

  it('generating -> ready: fails with incomplete slides', () => {
    const plan = { 
      ...mockPlan, 
      phase: 'generating',
      slides: [{ id: '1', status: 'pending' }] 
    } as any as DeckPlan;
    const result = validatePhaseTransition(plan, 'ready');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Incomplete slides: 1');
  });

  it('generating -> ready: passes when all ready/fixed', () => {
    const plan = { 
      ...mockPlan, 
      phase: 'generating',
      slides: [{ id: '1', status: 'ready' }, { id: '2', status: 'fixed' }] 
    } as any as DeckPlan;
    const result = validatePhaseTransition(plan, 'ready');
    expect(result.valid).toBe(true);
  });

  it('Invalid transitions: narrative -> ready should be rejected', () => {
    const result = validatePhaseTransition(mockPlan, 'ready');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Cannot jump from narrative to ready; must go through structure and generating');
  });
});
```

- [ ] Verification command:

```bash
bun test packages/contracts/src/api/deck.test.ts
```

## Final Verification

- [ ] Ensure all types are exported and tested.

```bash
rg -n "DeckPhase|DeckBeat|DeckSlide|FidelityIssue|ChatMessageScope|DeckPlanUpdateRequest" packages/contracts/src/api/deck.ts
```
