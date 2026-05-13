import { afterEach, describe, expect, it, vi } from 'vitest';

import { startServer } from '../src/server.js';

const realFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', realFetch);
});

describe('Ollama Cloud execution test and proxy', () => {
  it('posts connection tests to the Ollama chat endpoint', async () => {
    const upstreamCalls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('http://127.0.0.1:')) {
        return realFetch(input, init);
      }
      upstreamCalls.push({ url, init });
      return new Response(JSON.stringify({ message: { content: 'ok' }, done: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));

    const started = await startServer({ port: 0, host: '127.0.0.1', returnServer: true }) as {
      server: { close(cb: () => void): void };
      url: string;
    };

    try {
      const response = await realFetch(`${started.url}/api/execution/test`, {
        body: JSON.stringify({
          mode: 'api',
          apiProtocol: 'ollama',
          apiKey: 'ollama-key',
          baseUrl: 'https://ollama.com',
          model: 'gpt-oss:120b-cloud',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        ok: true,
        mode: 'api',
        message: 'Ollama-compatible endpoint responded.',
      });
      expect(upstreamCalls).toHaveLength(1);
      expect(upstreamCalls[0]?.url).toBe('https://ollama.com/api/chat');
      expect(upstreamCalls[0]?.init?.headers).toMatchObject({
        Authorization: 'Bearer ollama-key',
        'Content-Type': 'application/json',
      });
      expect(JSON.parse(String(upstreamCalls[0]?.init?.body))).toMatchObject({
        model: 'gpt-oss:120b-cloud',
        stream: false,
        options: { num_predict: 1 },
      });
    } finally {
      await new Promise<void>((resolve) => started.server.close(resolve));
    }
  });

  it('streams Ollama newline JSON as Pixelpitch SSE deltas', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('http://127.0.0.1:')) {
        return realFetch(input, init);
      }
      expect(url).toBe('https://ollama.com/api/chat');
      expect(JSON.parse(String(init?.body))).toMatchObject({
        model: 'qwen3-coder:480b-cloud',
        stream: true,
      });
      return new Response(
        [
          JSON.stringify({ message: { content: 'hel' }, done: false }),
          JSON.stringify({ message: { content: 'lo' }, done: false }),
          JSON.stringify({ done: true }),
          '',
        ].join('\n'),
        { status: 200, headers: { 'content-type': 'application/x-ndjson' } },
      );
    }));

    const started = await startServer({ port: 0, host: '127.0.0.1', returnServer: true }) as {
      server: { close(cb: () => void): void };
      url: string;
    };

    try {
      const response = await realFetch(`${started.url}/api/proxy/ollama/stream`, {
        body: JSON.stringify({
          apiKey: 'ollama-key',
          baseUrl: 'https://ollama.com',
          model: 'qwen3-coder:480b-cloud',
          messages: [{ role: 'user', content: 'hi' }],
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toContain('event: delta');
      expect(text).toContain('"delta":"hel"');
      expect(text).toContain('"delta":"lo"');
      expect(text).toContain('event: end');
    } finally {
      await new Promise<void>((resolve) => started.server.close(resolve));
    }
  });
});
