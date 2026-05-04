# Contracts Implementation Plan: Unified Deck Skill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Define the shared TypeScript interfaces and validation logic for the unified deck workflow.
**Architecture:** Centralized contracts in `packages/contracts` used by both the daemon and web app to ensure schema consistency across the narrative, structure, and export phases.
**Tech Stack:** TypeScript, Bun (test runner)
---

## Task 1: Create `packages/contracts/src/api/deck.ts`

- [ ] Create the file `packages/contracts/src/api/deck.ts`.
- [ ] Export all interfaces and types from the spec.
- [ ] Add `DECK_PLAN_VERSION = 1` constant.
- [ ] Add type guards for phase transitions.

```typescript
/**
 * Core Deck Plan contract
 */
export const DECK_PLAN_VERSION = 1;

export type DeckPhase = 'narrative' | 'structure' | 'generating' | 'ready' | 'exporting';

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

/**
 * API Request/Response Shapes
 */
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

/**
 * Validation Logic
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

  return { valid: errors.length === 0, errors };
}
```

## Task 2: Update `packages/contracts/src/api/index.ts`

- [ ] Export everything from `./deck` in `packages/contracts/src/api/index.ts`.

```typescript
export * from './deck';
```

## Task 3: Create Test for Contracts

- [ ] Create `packages/contracts/src/api/deck.test.ts`.
- [ ] Add tests for `validatePhaseTransition`.

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

describe('DeckPlan Validation', () => {
  it('should block transition to structure if metadata is missing', () => {
    const result = validatePhaseTransition(mockPlan, 'structure');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Title is required');
  });

  it('should allow transition to structure if metadata is present', () => {
    const validPlan = { ...mockPlan, title: 'Test', audience: 'Test', keyMessage: 'Test' };
    const result = validatePhaseTransition(validPlan, 'structure');
    expect(result.valid).toBe(true);
  });
});
```

## Verification

- [ ] Run tests: `bun test packages/contracts/src/api/deck.test.ts`
