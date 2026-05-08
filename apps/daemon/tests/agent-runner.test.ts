import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  attachAgentOutputHandlers,
  spawnAgentProcess,
  type AgentDefinitionLike,
} from '../src/agent-runner.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'pixelpitch-agent-runner-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function writeScript(name: string, body: string): Promise<string> {
  const file = path.join(tempDir, name);
  await writeFile(file, body, 'utf8');
  return file;
}

function waitForClose(child: ReturnType<typeof spawnAgentProcess>['child']) {
  return new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.on('close', (code, signal) => resolve({ code, signal }));
  });
}

describe('spawnAgentProcess', () => {
  it('opens a stdin pipe for promptViaStdin agents', async () => {
    const script = await writeScript(
      'stdin-agent.mjs',
      `
setTimeout(() => {}, 25);
`,
    );
    const events: Array<{ event: string; payload: unknown }> = [];
    const def: AgentDefinitionLike = { id: 'fake', promptViaStdin: true };
    const spawned = spawnAgentProcess({
      agentId: 'fake',
      def,
      resolvedBin: '/usr/bin/node',
      args: [script],
      env: process.env,
      cwd: tempDir,
      prompt: 'hello sub-run',
      send: (event, payload) => events.push({ event, payload }),
      createExecutionErrorPayload: (message) => ({ message }),
    });

    const exit = await waitForClose(spawned.child);

    expect(exit.code).toBe(0);
    expect(spawned.child.stdin).toBeTruthy();
    expect(events).toEqual([]);
  });
});

describe('attachAgentOutputHandlers', () => {
  it('forwards stderr through the attached output handlers', async () => {
    const events: Array<{ event: string; payload: unknown }> = [];
    const def: AgentDefinitionLike = { id: 'fake' };
    const child = new EventEmitter() as any;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    attachAgentOutputHandlers({
      child,
      def,
      prompt: '',
      cwd: tempDir,
      send: (event, payload) => events.push({ event, payload }),
    });

    child.stderr.write('warn');

    expect(events).toContainEqual({
      event: 'stderr',
      payload: { chunk: 'warn' },
    });
  });

  it('forwards plain stdout through the attached output handlers', () => {
    const events: Array<{ event: string; payload: unknown }> = [];
    const def: AgentDefinitionLike = { id: 'fake' };
    const child = new EventEmitter() as any;
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    attachAgentOutputHandlers({
      child,
      def,
      prompt: '',
      cwd: tempDir,
      send: (event, payload) => events.push({ event, payload }),
    });

    child.stdout.write('hello');

    expect(events).toContainEqual({
      event: 'stdout',
      payload: { chunk: 'hello' },
    });
  });
});
