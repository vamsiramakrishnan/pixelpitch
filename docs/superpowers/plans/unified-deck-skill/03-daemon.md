# Daemon Implementation Plan: Unified Deck Skill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Implement the orchestration logic for assembling, exporting, and managing unified decks.
**Architecture:** A new `DeckManager` service handles file-system operations and `slidify` integration, while `server.ts` exposes API endpoints and SSE events.
**Tech Stack:** Node.js, TypeScript, Vitest, Slidify CLI (Python via `uv`)
---

## Task 1: Create `apps/daemon/src/deck.ts` Skeleton

- [ ] Create `apps/daemon/src/deck.ts`.
- [ ] Define the `DeckManager` class with the constructor and basic file path helpers.

```typescript
import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { 
  DeckPlan, 
  DeckAssembleResponse, 
  DeckExportRequest, 
  DeckExportResponse,
  FidelityIssue
} from '@pixelpitch/contracts';

const execAsync = promisify(exec);

export class DeckManager {
  constructor(private projectPath: string) {}

  private get planPath() {
    return join(this.projectPath, 'deck', 'deck-plan.json');
  }
}
```

- [ ] Verification command:

```bash
test -f apps/daemon/src/deck.ts && rg "class DeckManager" apps/daemon/src/deck.ts
```

## Task 2: Implement `getPlan` and `updatePlan`

- [ ] Add `getPlan` and `updatePlan` methods to `DeckManager`.
- [ ] Implement error handling for missing `deck-plan.json` (throw 404-style error).

```typescript
  async getPlan(): Promise<DeckPlan> {
    if (!existsSync(this.planPath)) {
      const err = new Error('Deck plan not found');
      (err as any).status = 404;
      throw err;
    }
    const content = await readFile(this.planPath, 'utf-8');
    return JSON.parse(content);
  }

  async updatePlan(plan: DeckPlan): Promise<void> {
    await writeFile(this.planPath, JSON.stringify(plan, null, 2));
  }
```

- [ ] Verification command:

```bash
rg -n "getPlan|updatePlan" apps/daemon/src/deck.ts
```

## Task 3: Implement `assemble`

- [ ] Add `assemble` method to `DeckManager`.
- [ ] Stitch `deck/theme.css`, `deck/framework.css`, and `deck/framework.js` into a monolithic `deck/deck.html`.
- [ ] Handle missing slide fragments by throwing a 422 error with the missing slide ID.

```typescript
  async assemble(): Promise<DeckAssembleResponse> {
    const plan = await this.getPlan();
    
    let slidesHtml = '';
    for (const slide of plan.slides) {
      const fragmentPath = join(this.projectPath, 'deck', slide.file);
      if (!existsSync(fragmentPath)) {
        const err = new Error(`Missing slide fragment: ${slide.file}`);
        (err as any).status = 422;
        throw err;
      }
      const fragment = await readFile(fragmentPath, 'utf-8');
      slidesHtml += `\n<section class="slide" data-slide-id="${slide.id}">\n${fragment}\n</section>\n`;
    }

    const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="framework.css">
  <link rel="stylesheet" href="theme.css">
  <script src="framework.js" defer></script>
</head>
<body class="deck-runtime">
  <div class="deck-shell">
    <div class="deck-stage">
      ${slidesHtml}
    </div>
  </div>
</body>
</html>`;

    const outputPath = join(this.projectPath, 'deck', 'deck.html');
    await writeFile(outputPath, template);

    return {
      success: true,
      outputPath: 'deck/deck.html',
      slideCount: plan.slides.length
    };
  }
```

- [ ] Verification command:

```bash
rg -n "async assemble" apps/daemon/src/deck.ts
```

## Task 4: Implement `export` and Slidify Integration

- [ ] Add `export` method to `DeckManager`.
- [ ] Call `slidify convert` via `execAsync`.
- [ ] Parse Slidify's `--json` output into `FidelityIssue[]`.
- [ ] Handle missing Slidify installation by throwing a 500 error.

```typescript
  async export(request: DeckExportRequest): Promise<DeckExportResponse> {
    await this.assemble();
    const deckHtml = join(this.projectPath, 'deck', 'deck.html');
    const outputPptx = join(this.projectPath, 'deck', 'deck.pptx');

    let stdout: string;
    try {
      const result = await execAsync(`slidify convert ${deckHtml} --output ${outputPptx} --json`);
      stdout = result.stdout;
    } catch (err) {
      const error = new Error('Slidify export failed. Ensure `slidify` is installed via `uv`.');
      (error as any).status = 500;
      (error as any).details = (err as any).stderr || (err as any).message;
      throw error;
    }
    
    const fidelityReport: FidelityIssue[] = [];
    try {
      const report = JSON.parse(stdout);
      if (Array.isArray(report.slides)) {
        for (const slide of report.slides) {
          if (slide.strategy === 'raster' || (slide.issues && slide.issues.length > 0)) {
            fidelityReport.push({
              slideId: slide.id ?? `slide-${slide.index}`,
              issue: slide.strategy === 'raster' ? 'rasterized' : (slide.issues?.[0]?.type ?? 'layout-drift'),
              detail: slide.issues?.[0]?.message ?? `Slide converted via ${slide.strategy}`,
              severity: slide.strategy === 'raster' ? 'warning' : 'info',
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse slidify JSON report:', err);
    }

    const plan = await this.getPlan();
    plan.slidify = {
      lastExport: new Date().toISOString(),
      fidelityIssues: fidelityReport,
      exportPath: 'deck/deck.pptx'
    };
    await this.updatePlan(plan);

    return {
      success: true,
      pptxPath: 'deck/deck.pptx',
      fidelityReport
    };
  }
```

- [ ] Verification command:

```bash
rg -n "async export" apps/daemon/src/deck.ts
```

## Task 5: Implement `apps/daemon/src/deck.test.ts`

- [ ] Add tests for `assemble` (happy path and missing fragment).
- [ ] Add mock test for `export` to verify fidelity report parsing.

```typescript
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { DeckManager } from './deck';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

const TMP_DIR = './tmp-test-deck';

describe('DeckManager', () => {
  beforeEach(async () => {
    await mkdir(join(TMP_DIR, 'deck', 'slides'), { recursive: true });
    await writeFile(join(TMP_DIR, 'deck', 'deck-plan.json'), JSON.stringify({
      version: 1,
      phase: 'ready',
      slides: [{ id: '1', file: 'slides/1.html' }]
    }));
    await writeFile(join(TMP_DIR, 'deck', 'slides', '1.html'), '<h1>Slide 1</h1>');
  });

  afterEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it('assemble: should stitch slides into deck.html', async () => {
    const manager = new DeckManager(TMP_DIR);
    const result = await manager.assemble();
    expect(result.success).toBe(true);
    expect(result.slideCount).toBe(1);
    expect(existsSync(join(TMP_DIR, 'deck', 'deck.html'))).toBe(true);
  });

  it('assemble: should throw 422 if slide fragment is missing', async () => {
    const manager = new DeckManager(TMP_DIR);
    await rm(join(TMP_DIR, 'deck', 'slides', '1.html'));
    await expect(manager.assemble()).rejects.toMatchObject({ status: 422 });
  });

  it('export: should parse fidelity issues from slidify JSON', async () => {
    // This requires mocking execAsync or use a fixture
  });
});
```

- [ ] Verification command:

```bash
bun test apps/daemon/src/deck.test.ts
```

## Task 6: Add Deck Routes to `apps/daemon/src/server.ts`

- [ ] Add GET, PATCH, POST routes for decks.
- [ ] Ensure `PATCH /deck/plan` emits SSE and returns the updated plan.

```typescript
// Add to apps/daemon/src/server.ts imports
import { DeckManager } from './deck';

// Add routes
app.get('/api/projects/:id/deck/plan', async (req, res) => {
  try {
    const project = getProject(db, req.params.id);
    if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
    const manager = new DeckManager(project.path);
    const plan = await manager.getPlan();
    res.json(plan);
  } catch (err) {
    const status = (err as any).status || 500;
    sendApiError(res, status, 'INTERNAL_ERROR', String(err));
  }
});

app.patch('/api/projects/:id/deck/plan', async (req, res) => {
  try {
    const project = getProject(db, req.params.id);
    if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
    const manager = new DeckManager(project.path);
    const plan = await manager.getPlan();
    const updated = { ...plan, ...req.body };
    await manager.updatePlan(updated);
    
    // Broadcast change to project-scoped SSE listeners
    // We assume sseManager or similar exists, or use local sse if in a stream handler
    // For now, use the pattern: sse.sendToProject(req.params.id, 'deck:plan:updated', { phase: updated.phase });
    
    res.json(updated);
  } catch (err) {
    const status = (err as any).status || 400;
    sendApiError(res, status, 'BAD_REQUEST', String(err));
  }
});

app.post('/api/projects/:id/deck/assemble', async (req, res) => {
  const project = getProject(db, req.params.id);
  const manager = new DeckManager(project.path);
  const result = await manager.assemble();
  res.json(result);
});

app.post('/api/projects/:id/deck/export', async (req, res) => {
  const project = getProject(db, req.params.id);
  const manager = new DeckManager(project.path);
  const result = await manager.export(req.body);
  res.json(result);
});
```

- [ ] Verification command:

```bash
rg -n "deck/plan|deck/assemble|deck/export" apps/daemon/src/server.ts
```

## Task 7: Implement SSE Notifications in File Watcher

- [ ] Find the existing file watcher in `server.ts` (often `chokidar` or `fs.watch`).
- [ ] Add detection for `deck-plan.json` and emit `deck:plan:updated`.

```typescript
// Inside the watcher.on('change', (path) => { ... }) block:
if (path.endsWith('deck-plan.json')) {
  // Logic to resolve projectId from path
  // sse.sendToProject(projectId, 'deck:plan:updated', { path });
}
```

- [ ] Verification command:

```bash
rg -n "deck-plan.json" apps/daemon/src/server.ts
```

## Task 8: Update `apps/daemon/src/prompts/system.ts`

- [ ] Add per-slide context slicing to `composeSystemPrompt`.
- [ ] Ensure that when `req.scope.type === 'slide'`, the system prompt only contains that slide's HTML and the global `theme.css`.

```typescript
// Inside composeSystemPrompt in apps/daemon/src/prompts/system.ts

if (metadata?.kind === 'deck' && (req as any).scope?.type === 'slide') {
  const slideId = (req as any).scope.id;
  const project = getProject(db, (req as any).projectId);
  const deckManager = new DeckManager(project.path);
  
  try {
    const plan = await deckManager.getPlan();
    const slide = plan.slides.find(s => s.id === slideId);
    if (slide) {
      const fragment = await readFile(join(project.path, 'deck', slide.file), 'utf-8');
      const theme = await readFile(join(project.path, 'deck', 'theme.css'), 'utf-8');
      
      // Inject focused context
      parts.push(`\n\n## Focused Context: Slide ${slideId}\n\nYou are currently editing ONLY the slide fragment below. Do not modify other slides. Use the provided theme tokens.\n\n### Slide Fragment\n\`\`\`html\n${fragment}\n\`\`\`\n\n### theme.css\n\`\`\`css\n${theme}\n\`\`\``);
    }
  } catch (err) {
    // Fallback to full context if plan is missing
  }
}
```

- [ ] Verification command:

```bash
rg -n "scope?.type === 'slide'" apps/daemon/src/prompts/system.ts
```

## Task 9: Add Route Tests for Daemon

- [ ] Add tests to `apps/daemon/src/server.test.ts` (or create if it doesn't exist) to verify:
  - `PATCH /api/projects/:id/deck/plan` updates the file and returns 200.
  - `POST /api/projects/:id/deck/assemble` handles missing fragments with 422.

- [ ] Verification command:

```bash
bun test apps/daemon/src/server.test.ts
```

## Final Verification

- [ ] Ensure all methods are implemented and tested.

```bash
rg -n "getPlan|updatePlan|assemble|export" apps/daemon/src/deck.ts
```
