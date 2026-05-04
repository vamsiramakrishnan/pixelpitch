# Integration & Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify all workstreams integrate correctly end-to-end: contracts typecheck, daemon serves deck APIs, web app renders all 5 phases, and slidify export produces a valid PPTX with fidelity report.

**Architecture:** Integration tests use Vitest for unit/component tests and Playwright for E2E flow. The test creates a deck project, walks through all phases, and verifies output.

**Tech Stack:** Vitest, Playwright, Bun, TypeScript

**Dependencies:** All 5 prior workstreams must be complete.

---

### Task 1: Contracts Typecheck Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run contracts typecheck**

```bash
bun run --filter @pixelpitch/contracts typecheck
```

Expected: PASS — all DeckPlan types compile cleanly.

- [ ] **Step 2: Run web typecheck**

```bash
bun run --filter @pixelpitch/web typecheck
```

Expected: PASS — all deck components import DeckPlan types correctly.

- [ ] **Step 3: Run daemon typecheck**

```bash
bun run --filter @pixelpitch/daemon typecheck
```

Expected: PASS — deck endpoints use contracts types.

---

### Task 2: DeckPlan Schema Validation Tests

**Files:**
- Create: `packages/contracts/src/api/deck.test.ts`

- [ ] **Step 1: Write schema validation tests**

```typescript
import { describe, expect, it } from 'vitest';
import type { DeckPlan } from './deck';

describe('DeckPlan schema', () => {
  it('accepts a valid narrative-phase plan', () => {
    const plan: DeckPlan = {
      version: 1,
      phase: 'narrative',
      title: 'Test Deck',
      audience: 'Engineers',
      tone: 'Strategic',
      keyMessage: 'We need to ship faster',
      composition: {
        frameworkId: 'html-ppt',
        themeId: 'tokyo-night',
        format: '16:9',
        runtime: 'framework.js',
        designSystemId: null,
      },
      interview: { history: [] },
      narrative: { beats: [] },
      slides: [],
      slidify: { lastExport: null, fidelityIssues: [] },
    };
    expect(plan.phase).toBe('narrative');
    expect(plan.version).toBe(1);
  });

  it('validates phase transitions', () => {
    const validTransitions: Record<string, string[]> = {
      narrative: ['structure'],
      structure: ['generating'],
      generating: ['ready'],
      ready: ['exporting', 'generating'],
      exporting: ['ready'],
    };
    expect(validTransitions.narrative).toContain('structure');
    expect(validTransitions.structure).not.toContain('narrative');
  });
});
```

- [ ] **Step 2: Run tests**

```bash
bun run --filter @pixelpitch/contracts test
```

- [ ] **Step 3: Commit**

```bash
git add packages/contracts/src/api/deck.test.ts
git commit -m "test(contracts): add DeckPlan schema validation tests"
```

---

### Task 3: Daemon Deck Endpoint Tests

**Files:**
- Create: `apps/daemon/src/deck.test.ts`

- [ ] **Step 1: Write assembly and export tests**

Test that:
- Assembly reads deck-plan.json and produces deck.html with all slides inlined
- Assembly fails gracefully when a slide file is missing
- The plan endpoint returns valid JSON
- Phase change detection emits the correct SSE event type

- [ ] **Step 2: Run tests**

```bash
bun run --filter @pixelpitch/daemon test
```

- [ ] **Step 3: Commit**

```bash
git add apps/daemon/src/deck.test.ts
git commit -m "test(daemon): add deck assembly and export endpoint tests"
```

---

### Task 4: Web Component Smoke Tests

**Files:**
- Create: `apps/web/src/components/deck/DeckWorkspace.test.tsx`

- [ ] **Step 1: Write render tests for each phase**

Test that DeckWorkspace renders the correct child component for each phase value:
- `narrative` → StoryCanvas visible
- `structure` → OutlineEditor visible
- `generating` → SlideSorter visible
- `ready` → SlideEditor visible

- [ ] **Step 2: Run tests**

```bash
bun run --filter @pixelpitch/web test
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/deck/DeckWorkspace.test.tsx
git commit -m "test(web): add DeckWorkspace phase routing smoke tests"
```

---

### Task 5: E2E Deck Workflow Test

**Files:**
- Create: `e2e/tests/deck-workflow.spec.ts`

- [ ] **Step 1: Write the full flow test**

```typescript
import { expect, test } from '@playwright/test';

test.describe('Deck workflow', () => {
  test('walks through narrative → structure → generate → polish → export', async ({ page }) => {
    // 1. Create a deck project
    await page.goto('/');
    await page.click('[data-testid="new-project-tab-deck"]');
    await page.fill('[data-testid="new-project-name"]', 'E2E Test Deck');
    await page.click('[data-testid="create-project"]');

    // 2. Verify narrative phase loads
    await expect(page.locator('.story-canvas')).toBeVisible({ timeout: 10000 });

    // 3. Answer interview questions (via chat)
    // ... (depends on agent behavior, may need mocked daemon)

    // 4. Verify outline editor appears after narrative
    // 5. Click "Proceed to slides"
    // 6. Verify slide sorter shows thumbnails
    // 7. Click a thumbnail to enter slide editor
    // 8. Verify slide preview renders in iframe
    // 9. Click Export → verify export panel
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
bun run test:e2e:live
```

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/deck-workflow.spec.ts
git commit -m "test(e2e): add deck workflow end-to-end test"
```

---

### Task 6: Cross-Workstream Consistency Check

- [ ] **Step 1: Verify type names match across workstreams**

Check that `DeckPlan`, `DeckSlide`, `DeckBeat`, `DeckPhase`, `FidelityIssue` are used consistently in:
- `packages/contracts/src/api/deck.ts`
- `apps/daemon/src/deck.ts`
- `apps/web/src/components/deck/*.tsx`

- [ ] **Step 2: Verify file paths match**

Check that all paths referenced in the plan (deck-plan.json, slides/*.html, theme.css, framework.js) are consistent between the daemon assembly logic and the web app srcdoc stitching.

- [ ] **Step 3: Run full typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(deck): unified deck skill — complete implementation"
```
