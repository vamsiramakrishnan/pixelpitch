import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runLiveArtifactsToolCli } from '../src/tools-live-artifacts-cli.js';

const originalEnv = { ...process.env };

async function withCapturedStdout(fn: () => Promise<void>): Promise<string[]> {
  const writes: string[] = [];
  const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    writes.push(String(chunk));
    return true;
  });
  try {
    await fn();
  } finally {
    spy.mockRestore();
  }
  return writes;
}

describe('tools live-artifacts CLI', () => {
  beforeEach(() => {
    process.env.PIXELPITCH_DAEMON_URL = 'http://127.0.0.1:17456';
    process.env.PIXELPITCH_TOOL_TOKEN = 'token-1';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  it('creates a live artifact from artifact.json plus sibling source files', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pixelpitch-live-cli-'));
    try {
      await writeFile(
        path.join(dir, 'artifact.json'),
        JSON.stringify({
          title: 'Clinic Console',
          document: { renderer: 'html_template_v1' },
        }),
        'utf8',
      );
      await writeFile(path.join(dir, 'template.html'), '<h1>{{data.title}}</h1>', 'utf8');
      await writeFile(path.join(dir, 'data.json'), JSON.stringify({ title: 'Clinic Console' }), 'utf8');
      await writeFile(path.join(dir, 'provenance.json'), JSON.stringify({ sources: [] }), 'utf8');

      const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body));
        expect(body.templateHtml).toBe('<h1>{{data.title}}</h1>');
        expect(body.provenanceJson).toEqual({ sources: [] });
        expect(body.input.document.dataJson).toEqual({ title: 'Clinic Console' });
        return new Response(
          JSON.stringify({
            artifact: {
              id: 'artifact-1',
              title: 'Clinic Console',
              status: 'ready',
              refreshStatus: 'idle',
              updatedAt: '2026-05-08T00:00:00.000Z',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      });
      vi.stubGlobal('fetch', fetchMock);

      const writes = await withCapturedStdout(async () => {
        const result = await runLiveArtifactsToolCli(['create', '--input', path.join(dir, 'artifact.json')]);
        expect(result.exitCode).toBe(0);
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://127.0.0.1:17456/api/tools/live-artifacts/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer token-1' }),
        }),
      );
      expect(JSON.parse(writes.join(''))).toEqual({
        ok: true,
        artifact: {
          id: 'artifact-1',
          title: 'Clinic Console',
          status: 'ready',
          refreshStatus: 'idle',
          updatedAt: '2026-05-08T00:00:00.000Z',
        },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('lists live artifacts in compact format', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            artifacts: [
              {
                id: 'artifact-1',
                title: 'Dashboard',
                status: 'ready',
                refreshStatus: 'idle',
                preview: { entry: 'index.html' },
                updatedAt: '2026-05-08T00:00:00.000Z',
                document: { dataJson: { hidden: true } },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const writes = await withCapturedStdout(async () => {
      const result = await runLiveArtifactsToolCli(['list']);
      expect(result.exitCode).toBe(0);
    });

    expect(JSON.parse(writes.join(''))).toEqual({
      ok: true,
      artifacts: [
        {
          id: 'artifact-1',
          title: 'Dashboard',
          status: 'ready',
          refreshStatus: 'idle',
          preview: { entry: 'index.html' },
          updatedAt: '2026-05-08T00:00:00.000Z',
        },
      ],
    });
  });
});
