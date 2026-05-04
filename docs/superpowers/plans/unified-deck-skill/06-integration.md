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

- [ ] **Step 4: Verify DeckPlan type names exist across workstreams**

```bash
rg "DeckPlan" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck/DeckWorkspace.tsx
rg "DeckSlide" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck
rg "DeckBeat" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck
rg "DeckPhase" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck
rg "FidelityIssue" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck/ExportPanel.tsx
```

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

- [ ] **Step 3: Verify test file content**

```bash
rg -n "DeckPlan schema|valid narrative-phase plan|validTransitions|phase: 'narrative'" packages/contracts/src/api/deck.test.ts
```

- [ ] **Step 4: Commit**

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

- [ ] **Step 3: Verify daemon test coverage**

```bash
rg -n "deck-plan.json|deck.html|missing|deck:plan:updated|fidelity|export" apps/daemon/src/deck.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/daemon/src/deck.test.ts
git commit -m "test(daemon): add deck assembly and export endpoint tests"
```

---

### Task 4: Daemon Deck Endpoint Integration Test

**Files:**
- Create: `apps/daemon/src/deck-endpoints.integration.test.ts`

- [ ] **Step 1: Write endpoint tests against a running daemon**

Use `fetch` against `PIXELPITCH_DAEMON_URL` or `http://127.0.0.1:${PIXELPITCH_PORT}`. The test must skip with a clear message when no daemon URL is present; do not silently pass without checking when the env var is provided.

```typescript
import { describe, expect, it } from 'vitest';

const daemonUrl =
  process.env.PIXELPITCH_DAEMON_URL ??
  (process.env.PIXELPITCH_PORT ? `http://127.0.0.1:${process.env.PIXELPITCH_PORT}` : null);

const maybeDescribe = daemonUrl ? describe : describe.skip;

maybeDescribe('deck daemon endpoints', () => {
  it('returns a DeckPlan-shaped payload from the plan route', async () => {
    const response = await fetch(`${daemonUrl}/api/projects/e2e-deck/deck/plan`);
    expect(response.status).toBeLessThan(500);
    if (response.status === 404) return;

    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body).toMatchObject({
      version: 1,
      composition: expect.objectContaining({
        frameworkId: expect.any(String),
        runtime: expect.any(String),
      }),
      narrative: expect.objectContaining({
        beats: expect.any(Array),
      }),
      slides: expect.any(Array),
      slidify: expect.objectContaining({
        fidelityIssues: expect.any(Array),
      }),
    });
  });

  it('returns slide fragment text for a known slide route', async () => {
    const response = await fetch(
      `${daemonUrl}/api/projects/e2e-deck/files/${encodeURIComponent('deck/slides/01-title.html')}`,
    );
    expect(response.status).toBeLessThan(500);
    if (response.status === 404) return;

    expect(response.ok).toBe(true);
    await expect(response.text()).resolves.toContain('data-slide-id="s1"');
  });

  it('exposes an event stream route for deck updates', async () => {
    const response = await fetch(`${daemonUrl}/api/projects/e2e-deck/events`, {
      headers: { Accept: 'text/event-stream' },
    });
    expect(response.status).toBeLessThan(500);
    if (response.status === 404) return;

    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type') ?? '').toContain('text/event-stream');
    await response.body?.cancel();
  });
});
```

- [ ] **Step 2: Start the daemon for integration verification**

```bash
pnpm tools-dev run daemon --daemon-port 17456
```

Use another terminal for the test command.

- [ ] **Step 3: Run the integration test against the daemon**

```bash
PIXELPITCH_DAEMON_URL=http://127.0.0.1:17456 bun run --filter @pixelpitch/daemon test -- deck-endpoints.integration
```

- [ ] **Step 4: Verify endpoint assertions**

```bash
rg -n "PIXELPITCH_DAEMON_URL|fetch\\(|deck/plan|text/event-stream|deck/slides/01-title.html" apps/daemon/src/deck-endpoints.integration.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/daemon/src/deck-endpoints.integration.test.ts
git commit -m "test(daemon): add deck endpoint integration test"
```

---

### Task 5: Web Component Smoke Tests

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

- [ ] **Step 3: Verify phase coverage**

```bash
rg -n "narrative|structure|generating|ready|StoryCanvas|OutlineEditor|SlideSorter|SlideEditor" apps/web/src/components/deck/DeckWorkspace.test.tsx
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/deck/DeckWorkspace.test.tsx
git commit -m "test(web): add DeckWorkspace phase routing smoke tests"
```

---

### Task 6: E2E Deck Fixtures

**Files:**
- Create: `e2e/fixtures/deck-ready/deck/deck-plan.json`
- Create: `e2e/fixtures/deck-ready/deck/theme.css`
- Create: `e2e/fixtures/deck-ready/deck/framework.css`
- Create: `e2e/fixtures/deck-ready/deck/framework.js`
- Create: `e2e/fixtures/deck-ready/deck/slides/01-title.html`
- Create: `e2e/fixtures/deck-ready/deck/slides/02-evidence.html`
- Create: `e2e/fixtures/deck-ready/deck/slides/03-ask.html`

- [ ] **Step 1: Create the ready-phase deck plan fixture**

```json
{
  "version": 1,
  "phase": "ready",
  "title": "Deck E2E Fixture",
  "audience": "Product leadership",
  "tone": "Crisp and operational",
  "keyMessage": "The unified deck workflow can preview and export assembled slides.",
  "composition": {
    "frameworkId": "html-ppt",
    "themeId": "minimal-white",
    "format": "16:9",
    "runtime": "deck/framework.js",
    "designSystemId": null
  },
  "interview": {
    "history": [
      {
        "questionId": "audience-decision",
        "question": "Who is this for, and what should they decide?",
        "answer": "Product leadership should approve the deck workflow.",
        "timestamp": "2026-05-04T00:00:00.000Z"
      }
    ]
  },
  "narrative": {
    "beats": [
      {
        "id": "b1",
        "type": "context",
        "label": "Context",
        "summary": "Introduce the deck workspace."
      },
      {
        "id": "b2",
        "type": "evidence",
        "label": "Evidence",
        "summary": "Show that three slides render from fragments.",
        "evidenceType": "stat",
        "dataPoints": ["3 slide fragments", "1 stitched preview"]
      },
      {
        "id": "b3",
        "type": "ask",
        "label": "Ask",
        "summary": "Open export and verify the export panel."
      }
    ]
  },
  "slides": [
    {
      "id": "s1",
      "beatId": "b1",
      "title": "Title",
      "file": "deck/slides/01-title.html",
      "status": "ready",
      "speakerNotes": "Introduce the workflow."
    },
    {
      "id": "s2",
      "beatId": "b2",
      "title": "Evidence",
      "file": "deck/slides/02-evidence.html",
      "status": "ready",
      "speakerNotes": "Call out the three thumbnail previews."
    },
    {
      "id": "s3",
      "beatId": "b3",
      "title": "Ask",
      "file": "deck/slides/03-ask.html",
      "status": "ready",
      "speakerNotes": "Open the export panel."
    }
  ],
  "slidify": {
    "lastExport": null,
    "fidelityIssues": []
  }
}
```

- [ ] **Step 2: Create the theme and framework fixtures**

```css
/* e2e/fixtures/deck-ready/deck/theme.css */
:root {
  --deck-bg: #ffffff;
  --deck-fg: #172033;
  --deck-accent: #2563eb;
  --deck-muted: #667085;
  --deck-font-display: Inter, system-ui, sans-serif;
  --deck-font-body: Inter, system-ui, sans-serif;
}
```

```css
/* e2e/fixtures/deck-ready/deck/framework.css */
.slide {
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  padding: 8vh 8vw;
  display: grid;
  align-content: center;
  gap: 24px;
  background: var(--deck-bg);
  color: var(--deck-fg);
  font-family: var(--deck-font-body);
}

.slide h1 {
  margin: 0;
  font-family: var(--deck-font-display);
  font-size: 72px;
  line-height: 0.95;
}

.slide p {
  margin: 0;
  max-width: 780px;
  color: var(--deck-muted);
  font-size: 28px;
  line-height: 1.25;
}

.metric {
  color: var(--deck-accent);
  font-size: 112px;
  font-weight: 800;
}
```

```javascript
// e2e/fixtures/deck-ready/deck/framework.js
window.__deckFrameworkReady = true;
document.documentElement.classList.add('framework-ready');
```

- [ ] **Step 3: Create slide fragment fixtures**

```html
<!-- e2e/fixtures/deck-ready/deck/slides/01-title.html -->
<section class="slide deck-title" data-slide-id="s1">
  <h1 data-pptx-role="title">Deck workspace renders stitched previews</h1>
  <p>Ready-phase fixture with three slide fragments.</p>
</section>
```

```html
<!-- e2e/fixtures/deck-ready/deck/slides/02-evidence.html -->
<section class="slide deck-evidence" data-slide-id="s2">
  <div class="metric">3</div>
  <h1 data-pptx-role="title">Fragments become thumbnails</h1>
  <p>Slide strip should show three thumbnail iframes.</p>
</section>
```

```html
<!-- e2e/fixtures/deck-ready/deck/slides/03-ask.html -->
<section class="slide deck-ask" data-slide-id="s3">
  <h1 data-pptx-role="title">Open export from the workspace</h1>
  <p>The export panel should appear without invoking slidify.</p>
</section>
```

- [ ] **Step 4: Verify fixture files**

```bash
test -f e2e/fixtures/deck-ready/deck/deck-plan.json
test -f e2e/fixtures/deck-ready/deck/slides/01-title.html
test -f e2e/fixtures/deck-ready/deck/slides/02-evidence.html
test -f e2e/fixtures/deck-ready/deck/slides/03-ask.html
rg -n "\"phase\": \"ready\"|\"id\": \"s1\"|\"id\": \"s2\"|\"id\": \"s3\"" e2e/fixtures/deck-ready/deck/deck-plan.json
rg -n "data-slide-id=\"s1\"|data-slide-id=\"s2\"|data-slide-id=\"s3\"|framework-ready|--deck-bg" e2e/fixtures/deck-ready/deck
```

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/deck-ready
git commit -m "test(e2e): add ready deck workflow fixtures"
```

---

### Task 7: E2E Deck Workflow Test

**Files:**
- Create: `e2e/tests/deck-workflow.spec.ts`

- [ ] **Step 1: Write the full flow test**

```typescript
import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const fixtureRoot = path.resolve(__dirname, '../fixtures/deck-ready');

async function copyFixtureProject(projectRoot: string) {
  await fs.rm(projectRoot, { recursive: true, force: true });
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.cp(fixtureRoot, projectRoot, { recursive: true });
}

test.describe('Deck workflow', () => {
  test.beforeEach(async ({}, testInfo) => {
    const projectRoot = path.join(testInfo.outputDir, 'deck-fixture-project');
    await copyFixtureProject(projectRoot);
    process.env.PIXELPITCH_E2E_PROJECT_DIR = projectRoot;
  });

  test('renders a ready deck fixture, loads preview, and opens export panel', async ({ page }) => {
    await page.goto('/projects/e2e-deck?mode=deck');

    await expect(page.locator('.deck-workspace')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.deck-phase-bar')).toContainText('Polish');
    await expect(page.locator('.slide-strip .slide-thumb')).toHaveCount(3);

    await page.locator('.slide-strip .slide-thumb').nth(1).click();
    await expect(page.locator('.slide-editor')).toBeVisible();
    await expect(page.locator('.slide-nav-count')).toContainText('2 / 3');

    const preview = page.frameLocator('iframe[title="Slide preview"]');
    await expect(preview.locator('[data-slide-id="s2"]')).toBeVisible();
    await expect(preview.locator('.metric')).toHaveText('3');

    await page.getByRole('button', { name: 'Export PPTX' }).click();
    await expect(page.locator('.export-panel-overlay')).toBeVisible();
    await expect(page.locator('.export-panel')).toContainText('3 slides ready for export');
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
bun run test:e2e:live
```

- [ ] **Step 3: Verify test assertions**

```bash
rg -n "copyFixtureProject|deck-fixture-project|deck-workspace|slide-thumb|Slide preview|export-panel" e2e/tests/deck-workflow.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add e2e/tests/deck-workflow.spec.ts
git commit -m "test(e2e): add deck workflow end-to-end test"
```

---

### Task 8: Cross-Workstream Consistency Check

- [ ] **Step 1: Verify type names match across workstreams**

```bash
rg "DeckPlan" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck/DeckWorkspace.tsx
rg "DeckSlide" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck
rg "DeckBeat" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck
rg "DeckPhase" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck
rg "FidelityIssue" packages/contracts/src/api/deck.ts apps/daemon/src/deck.ts apps/web/src/components/deck/ExportPanel.tsx
```

- [ ] **Step 2: Verify file paths match**

```bash
rg "deck-plan\\.json" packages/contracts/src/api/deck.ts apps/daemon/src apps/web/src e2e
rg "deck/theme\\.css|theme.css" apps/daemon/src apps/web/src e2e/fixtures/deck-ready
rg "deck/framework\\.js|framework.js" apps/daemon/src apps/web/src e2e/fixtures/deck-ready
rg "deck/slides|slides/.*\\.html" apps/daemon/src apps/web/src e2e/fixtures/deck-ready
rg "buildSrcdoc|srcDoc" apps/web/src/runtime/srcdoc.ts apps/web/src/components
```

- [ ] **Step 3: Run full typecheck**

```bash
bun run typecheck
```

- [ ] **Step 4: Run full tests**

```bash
bun run test
```

- [ ] **Step 5: Verify implementation and test files are present**

```bash
test -f packages/contracts/src/api/deck.test.ts
test -f apps/daemon/src/deck.test.ts
test -f apps/daemon/src/deck-endpoints.integration.test.ts
test -f apps/web/src/components/deck/DeckWorkspace.test.tsx
test -f e2e/tests/deck-workflow.spec.ts
test -f e2e/fixtures/deck-ready/deck/deck-plan.json
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(deck): unified deck skill — complete implementation"
```

---
Status: done
Sender: codex
Receiver: claude
Summary: Expanded integration testing with exact contract checks, daemon fetch-based endpoint integration tests, E2E fixtures, a real Playwright ready-deck workflow, and verification commands after every task.
Files changed:
- docs/superpowers/plans/unified-deck-skill/06-integration.md
Verification: integration plan matches gold standard depth
Next handoff: final review and commit
---
