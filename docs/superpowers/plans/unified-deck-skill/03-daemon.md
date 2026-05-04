# Daemon Implementation Plan: Unified Deck Skill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Implement the orchestration logic for assembling, exporting, and managing unified decks.
**Architecture:** A new `DeckManager` service handles file-system operations and `slidify` integration, while `server.ts` exposes API endpoints and SSE events.
**Tech Stack:** Node.js, TypeScript, Bun, Slidify CLI
---

## Task 1: Create `apps/daemon/src/deck.ts` (DeckManager)

- [ ] Create `apps/daemon/src/deck.ts`.
- [ ] Implement `DeckManager` with methods: `getPlan`, `updatePlan`, `assemble`, `export`.
- [ ] Add `slidify` invocation and fidelity report parsing.

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

  async getPlan(): Promise<DeckPlan> {
    const content = await readFile(this.planPath, 'utf-8');
    return JSON.parse(content);
  }

  async updatePlan(plan: DeckPlan): Promise<void> {
    await writeFile(this.planPath, JSON.stringify(plan, null, 2));
  }

  async assemble(): Promise<DeckAssembleResponse> {
    const plan = await this.getPlan();
    const slidesDir = join(this.projectPath, 'deck', 'slides');
    
    let slidesHtml = '';
    for (const slide of plan.slides) {
      const fragmentPath = join(this.projectPath, 'deck', slide.file);
      const fragment = await readFile(fragmentPath, 'utf-8');
      slidesHtml += `\n<section class="slide" data-slide-id="${slide.id}">\n${fragment}\n</section>\n`;
    }

    const template = `
<!DOCTYPE html>
<html>
<head>
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

  async export(request: DeckExportRequest): Promise<DeckExportResponse> {
    await this.assemble();
    const deckHtml = join(this.projectPath, 'deck', 'deck.html');
    const outputPptx = join(this.projectPath, 'deck', 'deck.pptx');

    // Invoke slidify (Python CLI, not a bun package — installed via uv)
    const { stdout, stderr } = await execAsync(`slidify convert ${deckHtml} --output ${outputPptx} --json`);
    
    // Parse slidify's structured JSON report (--json flag outputs fidelity data)
    const fidelityReport: FidelityIssue[] = [];
    try {
      const report = JSON.parse(stdout);
      if (Array.isArray(report.slides)) {
        for (const slide of report.slides) {
          if (slide.strategy === 'raster' || slide.issues?.length) {
            fidelityReport.push({
              slideId: slide.id ?? `slide-${slide.index}`,
              issue: slide.strategy === 'raster' ? 'rasterized' : (slide.issues?.[0]?.type ?? 'layout-drift'),
              detail: slide.issues?.[0]?.message ?? `Slide converted via ${slide.strategy}`,
              severity: slide.strategy === 'raster' ? 'warning' : 'info',
            });
          }
        }
      }
    } catch {
      // Fallback: slidify didn't produce JSON, log stderr for debugging
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
}
```

## Task 2: Update `apps/daemon/src/server.ts` (Routes)

- [ ] Add deck routes to `apps/daemon/src/server.ts`.
- [ ] Implement SSE notifications for `deck-plan.json` changes.

```typescript
// Add imports
import { DeckManager } from './deck';

// In route registration block (e.g., after project routes)
app.get('/api/projects/:id/deck/plan', async (req, res) => {
  const project = await db.projects.get(req.params.id);
  const manager = new DeckManager(project.path);
  const plan = await manager.getPlan();
  res.json(plan);
});

app.patch('/api/projects/:id/deck/plan', async (req, res) => {
  const project = await db.projects.get(req.params.id);
  const manager = new DeckManager(project.path);
  const plan = await manager.getPlan();
  const updated = { ...plan, ...req.body };
  await manager.updatePlan(updated);
  sse.emitToProject(req.params.id, 'deck:plan:updated', { phase: updated.phase });
  res.json(updated);
});

app.post('/api/projects/:id/deck/assemble', async (req, res) => {
  const project = await db.projects.get(req.params.id);
  const manager = new DeckManager(project.path);
  const result = await manager.assemble();
  res.json(result);
});

app.post('/api/projects/:id/deck/export', async (req, res) => {
  const project = await db.projects.get(req.params.id);
  const manager = new DeckManager(project.path);
  const result = await manager.export(req.body);
  res.json(result);
});

// Update file watcher logic to emit deck:plan:updated
// Search for watcher.on('change', ...) and add:
if (path.endsWith('deck-plan.json')) {
  sse.emitToProject(projectId, 'deck:plan:updated', { path });
}
```

## Task 3: Update `apps/daemon/src/prompts/system.ts`

- [ ] Modify `composeSystemPrompt` to support `narrative: true`.
- [ ] Add per-slide context slicing logic.

```typescript
// In apps/daemon/src/prompts/system.ts

// 1. Add narrative check — use parsed frontmatter, not string matching
const isNarrative = skill?.narrative === true;

// 2. If narrative, skip standard discovery turns
if (isNarrative) {
  // Override DISCOVERY_AND_PHILOSOPHY turn rules
  // This is a simplified representation; actual implementation might 
  // wrap DISCOVERY_AND_PHILOSOPHY or add a prefix.
}

// 3. Per-slide context slicing
if (req.scope?.type === 'slide') {
  const slideId = req.scope.id;
  const plan = await deckManager.getPlan();
  const slide = plan.slides.find(s => s.id === slideId);
  if (slide) {
    const fragment = await readFile(join(projectPath, 'deck', slide.file), 'utf-8');
    const theme = await readFile(join(projectPath, 'deck', 'theme.css'), 'utf-8');
    extraContext.push({
      role: 'user',
      content: `Editing ONLY Slide ${slideId}.\n\nSlide Fragment:\n${fragment}\n\nTheme:\n${theme}`
    });
  }
}
```

## Task 4: Create Test for DeckManager

- [ ] Create `apps/daemon/src/deck.test.ts`.

```typescript
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
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

  it('should assemble a deck', async () => {
    const manager = new DeckManager(TMP_DIR);
    const result = await manager.assemble();
    expect(result.success).toBe(true);
    expect(result.slideCount).toBe(1);
  });
});
```

## Verification

- [ ] Run tests: `bun test apps/daemon/src/deck.test.ts`
- [ ] Verify API routes via `curl` or Postman against a running daemon.
