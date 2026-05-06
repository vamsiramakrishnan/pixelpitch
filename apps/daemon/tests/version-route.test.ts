import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer } from '../src/server.js';

describe('/api/version', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const started = await startServer({ port: 0, host: '127.0.0.1', returnServer: true }) as {
      url: string;
      server: http.Server;
    };
    baseUrl = started.url;
    server = started.server;
  });

  afterAll(() => new Promise<void>((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  }));

  it('returns current app version info', async () => {
    const res = await fetch(`${baseUrl}/api/version`);
    const json = await res.json() as unknown;

    expect(res.ok).toBe(true);
    expect(json).toEqual({
      version: {
        version: expect.any(String),
        channel: expect.any(String),
        packaged: expect.any(Boolean),
        platform: expect.any(String),
        arch: expect.any(String),
      },
    });
  });

  it('keeps health version aligned with version endpoint', async () => {
    const [healthRes, versionRes] = await Promise.all([
      fetch(`${baseUrl}/api/health`),
      fetch(`${baseUrl}/api/version`),
    ]);
    const health = await healthRes.json() as { ok?: unknown; version?: unknown };
    const version = await versionRes.json() as { version?: { version?: unknown } };

    expect(healthRes.ok).toBe(true);
    expect(versionRes.ok).toBe(true);
    expect(health).toEqual({ ok: true, version: version.version?.version });
  });

  it('exposes dependency-aware readiness endpoints', async () => {
    const [readyRes, healthzRes] = await Promise.all([
      fetch(`${baseUrl}/api/readyz`),
      fetch(`${baseUrl}/api/healthz`),
    ]);
    const ready = await readyRes.json() as {
      ok?: unknown;
      status?: unknown;
      version?: unknown;
      checks?: Record<string, unknown>;
    };
    const healthz = await healthzRes.json() as unknown;

    expect(readyRes.ok).toBe(true);
    expect(healthzRes.ok).toBe(true);
    expect(ready).toEqual({
      ok: true,
      status: 'ok',
      version: expect.any(String),
      checks: {
        database: 'ok',
        projectsDir: 'ok',
        resources: 'ok',
      },
    });
    expect(healthz).toEqual(ready);
  });
});
