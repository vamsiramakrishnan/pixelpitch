import { describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { defaultCritiqueConfig } from '@pixelpitch/contracts/critique';

import {
  createAgentRunService,
  createAgentRuntimeToolPrompt,
} from '../src/agent-run-service.js';
import { getCritiqueRun, migrateCritique } from '../src/critique/persistence.js';
import { ToolTokenRegistry } from '../src/tool-tokens.js';

function makeService(overrides: Record<string, unknown> = {}) {
  const sinks = new Map<string, (payload: unknown) => boolean>();
  const runs = {
    get: vi.fn(),
    cancel: vi.fn(),
    isTerminal: vi.fn((status: string) => ['succeeded', 'failed', 'canceled'].includes(status)),
    emit: vi.fn(),
    finish: vi.fn(),
  };
  const toolTokenRegistry = new ToolTokenRegistry();
  const service = createAgentRunService({
    runs,
    toolTokenRegistry,
    daemonUrl: 'http://127.0.0.1:17456',
    pixelpitchBin: '/repo/apps/daemon/dist/cli.js',
    projectRoot: '/repo',
    artifactsDir: '/repo/.pixelpitch/artifacts',
    db: null,
    critiqueCfg: { enabled: false },
    critiqueWarnedAdapters: new Set(),
    createSseErrorPayload: (code: string, message: string) => ({ code, message }),
    registerChatAgentEventSink(runId: string, sink: (payload: unknown) => boolean) {
      sinks.set(runId, sink);
    },
    unregisterChatAgentEventSink(runId: string) {
      sinks.delete(runId);
    },
    ...overrides,
  });
  return { service, sinks, runs, toolTokenRegistry };
}

describe('createAgentRuntimeToolPrompt', () => {
  it('is empty without a tool grant', () => {
    expect(createAgentRuntimeToolPrompt('http://127.0.0.1:1', null)).toBe('');
  });

  it('lists live artifact and connector tool endpoints when a grant exists', () => {
    const prompt = createAgentRuntimeToolPrompt('http://127.0.0.1:17456', {
      token: 'pptt_test',
      runId: 'run-1',
      projectId: 'project-1',
    });

    expect(prompt).toContain('PIXELPITCH_TOOL_TOKEN');
    expect(prompt).toContain('/api/tools/live-artifacts/create');
    expect(prompt).toContain('/api/tools/connectors/execute');
  });
});

describe('createAgentRunService tool context', () => {
  it('mints scoped tool tokens, registers event sinks, and revokes on cleanup', () => {
    const { service, sinks, toolTokenRegistry } = makeService();
    const events: Array<{ event: string; payload: unknown }> = [];
    const context = service.createToolContext({
      runId: 'run-1',
      projectId: 'project-1',
      cwd: '/repo/.pixelpitch/projects/project-1',
      send: (event: string, payload: unknown) => events.push({ event, payload }),
    });

    expect(context.grant?.runId).toBe('run-1');
    expect(context.runtimeToolPrompt).toContain('Pixelpitch runtime tools');
    expect(context.env.PIXELPITCH_TOOL_TOKEN).toBe(context.grant?.token);
    expect(toolTokenRegistry.activeRunTokenCount('run-1')).toBe(1);
    expect(sinks.has('run-1')).toBe(true);

    sinks.get('run-1')?.({ type: 'live_artifact', action: 'created' });
    expect(events).toContainEqual({
      event: 'agent',
      payload: { type: 'live_artifact', action: 'created' },
    });

    context.cleanup('child_exit');

    expect(toolTokenRegistry.activeRunTokenCount('run-1')).toBe(0);
    expect(sinks.has('run-1')).toBe(false);
  });

  it('bridges child tool events to a parent stream when supplied', () => {
    const { service, sinks } = makeService();
    const childEvents: unknown[] = [];
    const parentEvents: unknown[] = [];
    service.createToolContext({
      runId: 'child-run',
      parentRunId: 'parent-run',
      projectId: 'project-1',
      cwd: '/repo/.pixelpitch/projects/project-1',
      send: (_event: string, payload: unknown) => childEvents.push(payload),
      parentSend: (_event: string, payload: unknown) => parentEvents.push(payload),
    } as any);

    sinks.get('child-run')?.({ type: 'live_artifact_refresh', phase: 'started' });

    expect(childEvents).toEqual([{ type: 'live_artifact_refresh', phase: 'started' }]);
    expect(parentEvents).toEqual([{ type: 'live_artifact_refresh', phase: 'started' }]);
  });
});

describe('createAgentRunService child cancellation', () => {
  it('cascades parent cancellation to active child runs only', async () => {
    const parentRun = { id: 'parent', status: 'running' };
    const activeChild = { id: 'child-active', status: 'running' };
    const { service, runs } = makeService();
    runs.get.mockImplementation((id: string) => {
      if (id === activeChild.id) return activeChild;
      return null;
    });
    runs.cancel.mockImplementation((run: { child?: { kill?: (signal: string) => void }; status: string }) => {
      run.status = 'canceled';
      run.child?.kill?.('SIGTERM');
    });

    await service.startPreparedAgentRun({
      run: activeChild,
      runId: activeChild.id,
      parentRunId: parentRun.id,
      agentId: 'node',
      def: { id: 'node' },
      resolvedBin: '/usr/bin/node',
      args: ['-e', 'setTimeout(() => {}, 5000)'],
      prompt: '',
      cwd: null,
      projectId: null,
      conversationId: null,
      safeModel: null,
      safeReasoning: null,
      toolContext: null,
    } as any);

    const canceled = service.cancelChildren(parentRun.id);

    expect(canceled).toBe(1);
    expect(runs.cancel).toHaveBeenCalledWith(activeChild);
  });
});

describe('createAgentRunService parallel critique', () => {
  it('spawns real reviewer child runs and fans results into critique events', async () => {
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
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
      );
      INSERT INTO projects (id, name, created_at, updated_at) VALUES ('project-1', 'Project 1', 0, 0);
    `);
    migrateCritique(db);

    const runMap = new Map<string, any>();
    let nextRun = 0;
    const events: Array<{ runId: string; event: string; payload: any }> = [];
    const finishes: Array<{ runId: string; status: string }> = [];
    const runs = {
      create: vi.fn((meta: any = {}) => {
        nextRun += 1;
        const run = {
          id: `child-${nextRun}`,
          projectId: meta.projectId ?? null,
          conversationId: meta.conversationId ?? null,
          agentId: meta.agentId ?? null,
          status: 'queued',
          updatedAt: Date.now(),
          child: null,
          cancelRequested: false,
        };
        runMap.set(run.id, run);
        return run;
      }),
      get: vi.fn((id: string) => runMap.get(id) ?? null),
      cancel: vi.fn((run: any) => {
        run.cancelRequested = true;
        run.child?.kill?.('SIGTERM');
      }),
      isTerminal: vi.fn((status: string) => ['succeeded', 'failed', 'canceled'].includes(status)),
      emit: vi.fn((run: any, event: string, payload: any) => {
        events.push({ runId: run.id, event, payload });
      }),
      finish: vi.fn((run: any, status: string) => {
        run.status = status;
        finishes.push({ runId: run.id, status });
      }),
    };
    const reviewerPrompts: string[] = [];
    const service = createAgentRunService({
      runs,
      toolTokenRegistry: new ToolTokenRegistry(),
      daemonUrl: 'http://127.0.0.1:17456',
      pixelpitchBin: '/repo/apps/daemon/dist/cli.js',
      projectRoot: '/repo',
      artifactsDir: '/tmp/pixelpitch-agent-run-service-critique',
      db,
      critiqueCfg: {
        ...defaultCritiqueConfig(),
        enabled: true,
        cast: ['critic', 'brand'],
        weights: { designer: 0, critic: 0.5, brand: 0.5, a11y: 0, copy: 0 },
        scoreThreshold: 8,
        maxConcurrentRuns: 2,
      },
      parallelCritiqueEnabled: true,
      critiqueWarnedAdapters: new Set(),
      createSseErrorPayload: (code: string, message: string) => ({ code, message }),
      composeCritiquePanelPrompt: (ctx: any) => [
        `CUSTOM_PANEL_PROMPT role=${ctx.role} round=${ctx.round}`,
        ctx.runtimeToolPrompt,
        ctx.prompt,
      ].filter(Boolean).join('\n\n'),
      registerChatAgentEventSink() {},
      unregisterChatAgentEventSink() {},
    });
    const parentRun = {
      id: 'parent-run',
      status: 'queued',
      updatedAt: Date.now(),
      child: null,
      cancelRequested: false,
    };
    runMap.set(parentRun.id, parentRun);
    const toolContext = service.createToolContext({
      runId: parentRun.id,
      projectId: 'project-1',
      cwd: '/tmp',
      send: (event: string, payload: unknown) => runs.emit(parentRun, event, payload),
    });

    await service.startPreparedAgentRun({
      run: parentRun,
      runId: parentRun.id,
      agentId: 'shell-reviewer',
      def: {
        id: 'shell-reviewer',
        streamFormat: 'plain',
        buildArgs(prompt: string) {
          reviewerPrompts.push(prompt);
          const role = prompt.includes('brand reviewer') ? 'brand' : 'critic';
          const payload = JSON.stringify({
            role,
            score: 9,
            dimensions: [{ name: 'fit', score: 9, note: 'Solid.' }],
            mustFix: [],
          });
          return ['-c', `printf '%s\\n' ${JSON.stringify(payload)}`];
        },
      },
      resolvedBin: '/bin/sh',
      args: [],
      prompt: 'Review the current artifact.',
      cwd: '/tmp',
      projectId: 'project-1',
      conversationId: null,
      safeModel: null,
      safeReasoning: null,
      toolContext,
    } as any);

    expect(runs.create).toHaveBeenCalledTimes(2);
    expect(reviewerPrompts).toHaveLength(2);
    expect(reviewerPrompts.every((prompt) => prompt.includes('CUSTOM_PANEL_PROMPT'))).toBe(true);
    expect(reviewerPrompts.every((prompt) => prompt.includes('Pixelpitch runtime tools'))).toBe(true);
    const eventNames = events.map((event) => event.payload?.event ?? event.event);
    expect(eventNames).toContain('critique.panelist_close');
    expect(eventNames).toContain('critique.ship');
    expect(finishes).toContainEqual({ runId: parentRun.id, status: 'succeeded' });
    expect(getCritiqueRun(db, parentRun.id)?.status).toBe('shipped');

    db.close();
  });
});
