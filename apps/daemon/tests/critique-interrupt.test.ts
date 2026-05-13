import { describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';

import { handleCritiqueInterrupt } from '../src/critique/interrupt-handler.js';
import { insertCritiqueRun, migrateCritique } from '../src/critique/persistence.js';
import { createRunRegistry } from '../src/critique/run-registry.js';

function freshDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    INSERT INTO projects (id, name, created_at, updated_at) VALUES ('p1', 'p1', 0, 0);
    INSERT INTO projects (id, name, created_at, updated_at) VALUES ('p2', 'p2', 0, 0);
  `);
  migrateCritique(db);
  return db;
}

function mockRes() {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res;
}

describe('critique interrupt endpoint handler', () => {
  it('aborts the registered run handle for the matching project/run pair', () => {
    const db = freshDb();
    insertCritiqueRun(db, {
      id: 'run-1',
      projectId: 'p1',
      status: 'running',
      protocolVersion: 1,
    });
    const registry = createRunRegistry();
    const abort = new AbortController();
    registry.register({ runId: 'run-1', projectId: 'p1', abort, startedAt: 1 });

    const res = mockRes();
    handleCritiqueInterrupt(db, registry)(
      { params: { projectId: 'p1', runId: 'run-1' } } as any,
      res as any,
    );

    expect(abort.signal.aborted).toBe(true);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      runId: 'run-1',
      accepted: true,
      prevStatus: 'running',
    });
  });

  it('does not leak or abort a run from another project with the same run id', () => {
    const db = freshDb();
    insertCritiqueRun(db, {
      id: 'run-1',
      projectId: 'p2',
      status: 'running',
      protocolVersion: 1,
    });
    const registry = createRunRegistry();
    const abort = new AbortController();
    registry.register({ runId: 'run-1', projectId: 'p2', abort, startedAt: 1 });

    const res = mockRes();
    handleCritiqueInterrupt(db, registry)(
      { params: { projectId: 'p1', runId: 'run-1' } } as any,
      res as any,
    );

    expect(abort.signal.aborted).toBe(false);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('recovers a running row when the daemon has no live abort handle', () => {
    const db = freshDb();
    insertCritiqueRun(db, {
      id: 'run-1',
      projectId: 'p1',
      status: 'running',
      protocolVersion: 1,
    });

    const res = mockRes();
    handleCritiqueInterrupt(db, createRunRegistry())(
      { params: { projectId: 'p1', runId: 'run-1' } } as any,
      res as any,
    );

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      runId: 'run-1',
      accepted: true,
      prevStatus: 'running',
      recovered: true,
    });
  });
});
