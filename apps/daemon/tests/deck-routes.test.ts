import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer } from '../src/server.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import fs from 'fs';
import os from 'os';

describe('Deck Routes', () => {
  let server: http.Server;
  let baseUrl: string;
  let tempDir: string;
  let projectId = 'test-deck-project';

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(join(os.tmpdir(), 'pixelpitch-test-'));
    process.env.PIXELPITCH_DATA_DIR = join(tempDir, '.pixelpitch');
    
    // We need to seed the DB. Since startServer opens it, we might need to 
    // open it ourselves first or use the API to create a project.
    
    const started = await startServer({ port: 0, returnServer: true }) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;

    // Create a project via API
    const resp = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: projectId, name: 'Test Project' })
    });
    const { project } = await resp.json() as any;

    // Setup deck folder and plan
    const deckDir = join(project.path, 'deck');
    await mkdir(deckDir, { recursive: true });
    await writeFile(join(deckDir, 'deck-plan.json'), JSON.stringify({
      version: 1,
      phase: 'ready',
      slides: [{ id: '1', file: 'slides/1.html' }],
      slidify: { lastExport: null, fidelityIssues: [] }
    }));
    await mkdir(join(deckDir, 'slides'), { recursive: true });
    await writeFile(join(deckDir, 'slides', '1.html'), '<h1>Slide 1</h1>');
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(tempDir, { recursive: true, force: true });
  });

  it('GET /api/projects/:id/deck/plan returns the plan', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/deck/plan`);
    expect(res.ok).toBe(true);
    const plan = await res.json() as any;
    expect(plan.phase).toBe('ready');
  });

  it('PATCH /api/projects/:id/deck/plan updates the plan', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/deck/plan`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Title' })
    });
    expect(res.ok).toBe(true);
    const plan = await res.json() as any;
    expect(plan.title).toBe('New Title');
  });

  it('POST /api/projects/:id/deck/assemble stitches the deck', async () => {
    const res = await fetch(`${baseUrl}/api/projects/${projectId}/deck/assemble`, {
      method: 'POST'
    });
    expect(res.ok).toBe(true);
    const result = await res.json() as any;
    expect(result.success).toBe(true);
    expect(result.slideCount).toBe(1);
  });
});
