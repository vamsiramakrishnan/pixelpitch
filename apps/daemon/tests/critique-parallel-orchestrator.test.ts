import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  defaultCritiqueConfig,
  type CritiqueConfig,
  type CritiqueSseEvent,
  type PanelistRole,
} from '@pixelpitch/contracts/critique';

import { runParallelReviewRound } from '../src/critique/parallel-orchestrator.js';
import { getCritiqueRun, migrateCritique } from '../src/critique/persistence.js';

let db: Database.Database;
let tempDir: string;

function freshDb(): Database.Database {
  const next = new Database(':memory:');
  next.pragma('foreign_keys = ON');
  next.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    INSERT INTO projects (id, name, created_at, updated_at) VALUES ('p1', 'p1', 0, 0);
  `);
  migrateCritique(next);
  return next;
}

function config(overrides: Partial<CritiqueConfig> = {}): CritiqueConfig {
  return {
    ...defaultCritiqueConfig(),
    enabled: true,
    cast: ['critic', 'brand', 'a11y', 'copy'],
    weights: { designer: 0, critic: 0.4, brand: 0.2, a11y: 0.2, copy: 0.2 },
    maxConcurrentRuns: 2,
    ...overrides,
  };
}

beforeEach(async () => {
  db = freshDb();
  tempDir = await mkdtemp(path.join(tmpdir(), 'pixelpitch-parallel-critique-'));
});

afterEach(async () => {
  db.close();
  await rm(tempDir, { recursive: true, force: true });
});

describe('runParallelReviewRound', () => {
  it('runs reviewers in parallel batches, emits existing critique events, and persists a shipped row', async () => {
    const events: CritiqueSseEvent[] = [];
    let active = 0;
    let maxActive = 0;
    const started: PanelistRole[] = [];
    const result = await runParallelReviewRound({
      runId: 'parallel-ship',
      projectId: 'p1',
      conversationId: null,
      artifactId: 'artifact-1',
      artifactDir: tempDir,
      adapter: 'parallel-test',
      cfg: config({ scoreThreshold: 8 }),
      db,
      bus: { emit: (event) => events.push(event) },
      prompt: 'review this artifact',
      spawnReviewer: async ({ role }) => {
        started.push(role);
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return {
          role,
          score: 9,
          dimensions: [{ name: `${role}-quality`, score: 9, note: 'Strong.' }],
        };
      },
    });

    expect(result.status).toBe('shipped');
    expect(result.composite).toBeCloseTo(9);
    expect(maxActive).toBe(2);
    expect(started.sort()).toEqual(['a11y', 'brand', 'copy', 'critic']);
    expect(events.map((event) => event.event)).toContain('critique.run_started');
    expect(events.map((event) => event.event)).toContain('critique.panelist_open');
    expect(events.map((event) => event.event)).toContain('critique.panelist_dim');
    expect(events.map((event) => event.event)).toContain('critique.round_end');
    expect(events.map((event) => event.event)).toContain('critique.ship');

    const row = getCritiqueRun(db, 'parallel-ship');
    expect(row?.status).toBe('shipped');
    expect(row?.score).toBeCloseTo(9);
    expect(row?.rounds).toEqual([
      { n: 1, composite: 9, mustFix: 0, decision: 'ship' },
    ]);
    expect(row?.transcriptPath).toBe('transcript.ndjson');
  });

  it('persists below_threshold when reviewers report must-fix items', async () => {
    const events: CritiqueSseEvent[] = [];
    const result = await runParallelReviewRound({
      runId: 'parallel-below',
      projectId: 'p1',
      conversationId: null,
      artifactId: 'artifact-1',
      artifactDir: tempDir,
      adapter: 'parallel-test',
      cfg: config({ scoreThreshold: 8 }),
      db,
      bus: { emit: (event) => events.push(event) },
      prompt: 'review this artifact',
      spawnReviewer: async ({ role }) => ({
        role,
        score: 9,
        mustFix: role === 'critic' ? ['Fix hierarchy before ship.'] : [],
      }),
    });

    expect(result.status).toBe('below_threshold');
    expect(result.rounds[0]?.mustFix).toBe(1);
    expect(events.some((event) => event.event === 'critique.panelist_must_fix')).toBe(true);
    expect(getCritiqueRun(db, 'parallel-below')?.status).toBe('below_threshold');
  });

  it('emits failed and persists failed when a reviewer sub-run fails', async () => {
    const events: CritiqueSseEvent[] = [];
    const result = await runParallelReviewRound({
      runId: 'parallel-failed',
      projectId: 'p1',
      conversationId: null,
      artifactId: 'artifact-1',
      artifactDir: tempDir,
      adapter: 'parallel-test',
      cfg: config(),
      db,
      bus: { emit: (event) => events.push(event) },
      prompt: 'review this artifact',
      spawnReviewer: async ({ role }) => {
        if (role === 'brand') throw new Error('brand reviewer crashed');
        return { role, score: 9 };
      },
    });

    expect(result.status).toBe('failed');
    expect(events.map((event) => event.event)).toContain('critique.failed');
    expect(getCritiqueRun(db, 'parallel-failed')?.status).toBe('failed');
  });
});
