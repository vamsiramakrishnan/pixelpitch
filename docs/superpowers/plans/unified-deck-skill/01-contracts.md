# Contracts Implementation Plan: Unified Deck Skill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Define the shared TypeScript interfaces and validation logic for the unified deck workflow.
**Architecture:** Centralized contracts in `packages/contracts` used by both the daemon and web app to ensure schema consistency across the narrative, structure, and export phases.
**Tech Stack:** TypeScript, Vitest (test runner)

## Phase 1: Core Type Definitions (TDD Cycles)

We will follow a strict TDD cycle for each type:
1. Write a type-guard/assertion test in `packages/contracts/src/api/deck.test.ts`.
2. Verify the test fails (compile error or runtime failure).
3. Write the minimal type and guard in `packages/contracts/src/api/deck.ts`.
4. Verify the test passes.

### Task 1: DeckPhase Enum
- [ ] **Test**: Write `isDeckPhase` guard test.
- [ ] **Type**: Define `DeckPhase` ('discovery' | 'structure' | 'draft' | 'refine' | 'ready').
- [ ] **Guard**: Implement `isDeckPhase(v: any): v is DeckPhase`.

```typescript
// packages/contracts/src/api/deck.test.ts
import { describe, expect, it } from 'vitest';
import { isDeckPhase } from './deck';

describe('DeckPhase', () => {
  it('validates all phase strings', () => {
    ['discovery', 'structure', 'draft', 'refine', 'ready'].forEach(p => {
      expect(isDeckPhase(p)).toBe(true);
    });
  });
  it('rejects invalid phases', () => {
    expect(isDeckPhase('final')).toBe(false);
    expect(isDeckPhase(null)).toBe(false);
    expect(isDeckPhase(undefined)).toBe(false);
    expect(isDeckPhase(123)).toBe(false);
  });
});

// packages/contracts/src/api/deck.ts
export type DeckPhase = 'discovery' | 'structure' | 'draft' | 'refine' | 'ready';
export function isDeckPhase(v: any): v is DeckPhase {
  return ['discovery', 'structure', 'draft', 'refine', 'ready'].includes(v);
}
```

### Task 2: FidelityIssue Type
- [ ] **Test**: Write `isFidelityIssue` guard test.
- [ ] **Type**: Define `FidelityIssue` with `slideId`, `severity` ('P0' | 'P1'), `message`, and optional `suggestion`.
- [ ] **Guard**: Implement `isFidelityIssue(v: any): v is FidelityIssue`.

```typescript
// packages/contracts/src/api/deck.test.ts
import { isFidelityIssue } from './deck';

describe('FidelityIssue', () => {
  it('validates a correct P0 issue', () => {
    const issue = { slideId: 's1', severity: 'P0', message: 'Text overflow' };
    expect(isFidelityIssue(issue)).toBe(true);
  });
  it('validates a correct P1 issue with suggestion', () => {
    const issue = { slideId: 's2', severity: 'P1', message: 'Low contrast', suggestion: 'Use #fff' };
    expect(isFidelityIssue(issue)).toBe(true);
  });
  it('rejects missing fields', () => {
    expect(isFidelityIssue({ slideId: 's1' })).toBe(false);
    expect(isFidelityIssue({ severity: 'P0', message: 'Fail' })).toBe(false);
  });
  it('rejects invalid severity', () => {
    expect(isFidelityIssue({ slideId: 's1', severity: 'P3', message: 'Low' })).toBe(false);
  });
});
```

### Task 3: DeckBeat Type
- [ ] **Test**: Write `isDeckBeat` guard test.
- [ ] **Type**: Define `DeckBeat` with `id`, `title`, `intent`, `status` ('pending' | 'ready').
- [ ] **Guard**: Implement `isDeckBeat(v: any): v is DeckBeat`.

```typescript
// packages/contracts/src/api/deck.test.ts
import { isDeckBeat } from './deck';

describe('DeckBeat', () => {
  it('validates a correct beat', () => {
    const beat = { id: 'b1', title: 'Intro', intent: 'Hook', status: 'ready' };
    expect(isDeckBeat(beat)).toBe(true);
  });
  it('rejects invalid status', () => {
    expect(isDeckBeat({ id: 'b1', title: 'T', intent: 'I', status: 'done' })).toBe(false);
  });
});
```

### Task 4: DeckSlide Type
- [ ] **Test**: Write `isDeckSlide` guard test.
- [ ] **Type**: Define `DeckSlide` with `id`, `beatId`, `path`, `status` ('pending' | 'generating' | 'ready' | 'needs-data' | 'needs-evidence').
- [ ] **Guard**: Implement `isDeckSlide(v: any): v is DeckSlide`.

### Task 5: ChatMessageScope Type
- [ ] **Test**: Write `isChatMessageScope` guard test.
- [ ] **Type**: Define `ChatMessageScope` with optional `slideId`, `beatId`, and `phase`.
- [ ] **Guard**: Implement `isChatMessageScope(v: any): v is ChatMessageScope`.

### Task 6: DeckPlan Interface
- [ ] **Test**: Write `isDeckPlan` guard test.
- [ ] **Type**: Define `DeckPlan` as the root object.
- [ ] **Guard**: Implement `isDeckPlan(v: any): v is DeckPlan`.

## Phase 2: Logic and Transitions (Task 7 Expansion)

Implement a robust state machine validator that prevents illegal jumps. This task is broken into individual sub-gates with exact test code.

### Gate 7.1: Discovery to Structure
- [ ] **Requirement**: Must have at least 3 interview history entries or `keyMessage` defined.
- [ ] **Implementation**: Add gate check to `validatePhaseTransition`.
- [ ] **Test Code**:
```typescript
it('blocks transition to structure if interview is empty', () => {
  const plan = { 
    phase: 'discovery', 
    interview: { history: [] },
    keyMessage: ''
  } as any as DeckPlan;
  const result = validatePhaseTransition(plan, 'structure');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Discovery phase requires at least 3 interview answers or a key message.');
});

it('allows transition to structure if keyMessage is present', () => {
  const plan = { 
    phase: 'discovery', 
    interview: { history: [] },
    keyMessage: 'Our app saves time.'
  } as any as DeckPlan;
  const result = validatePhaseTransition(plan, 'structure');
  expect(result.valid).toBe(true);
});
```

### Gate 7.2: Structure to Draft
- [ ] **Requirement**: Must have at least one beat in `narrative.beats`.
- [ ] **Implementation**: Add gate check to `validatePhaseTransition`.
- [ ] **Test Code**:
```typescript
it('blocks transition to draft if no beats defined', () => {
  const plan = { 
    phase: 'structure', 
    narrative: { beats: [] } 
  } as any as DeckPlan;
  const result = validatePhaseTransition(plan, 'draft');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Structure phase requires at least one narrative beat.');
});
```

### Gate 7.3: Draft to Refine
- [ ] **Requirement**: All slides in `manifest.slides` must be 'ready' or 'needs-evidence'.
- [ ] **Implementation**: Add gate check to `validatePhaseTransition`.
- [ ] **Test Code**:
```typescript
it('blocks transition to refine if slides are still generating', () => {
  const plan = {
    phase: 'draft',
    slides: [
      { id: 's1', status: 'ready' },
      { id: 's2', status: 'generating' }
    ]
  } as any as DeckPlan;
  const result = validatePhaseTransition(plan, 'refine');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Cannot enter refine phase while slides are still generating.');
});
```

### Gate 7.4: Refine to Ready
- [ ] **Requirement**: Zero P0 fidelity issues in `slidify.fidelityIssues`.
- [ ] **Implementation**: Add gate check to `validatePhaseTransition`.
- [ ] **Test Code**:
```typescript
it('blocks transition to ready if P0 issues exist', () => {
  const plan = {
    phase: 'refine',
    slidify: { 
      fidelityIssues: [
        { severity: 'P0', message: 'Layout drift detected' },
        { severity: 'P1', message: 'Small font' }
      ] 
    }
  } as any as DeckPlan;
  const result = validatePhaseTransition(plan, 'ready');
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Cannot mark as ready while P0 fidelity issues persist.');
});
```

## Phase 3: API Request Types

### Task 8: DeckPlanUpdateRequest
- [ ] Define `DeckPlanUpdateRequest` for the `PATCH /api/projects/:id/deck-plan` endpoint.

```typescript
export interface DeckPlanUpdateRequest {
  phase?: DeckPhase;
  plan?: Partial<DeckPlan>;
}
```

## Phase 4: Integration

### Task 9: Update `packages/contracts/src/index.ts`
- [ ] Add the export for the deck contracts to `packages/contracts/src/index.ts`.
```typescript
export * from './api/deck';
```

## Final Verification

- [ ] Ensure all types are exported and tested.
- [ ] Ensure `validatePhaseTransition` handles all gates defined in Phase 2.

```bash
bun test packages/contracts/src/api/deck.test.ts
```

```bash
rg -n "DeckPhase|DeckBeat|DeckSlide|FidelityIssue|ChatMessageScope|DeckPlanUpdateRequest" packages/contracts/src/api/deck.ts
```
