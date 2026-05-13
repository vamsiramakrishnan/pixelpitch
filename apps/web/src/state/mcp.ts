export type McpTransport = 'stdio' | 'sse' | 'http';

export interface McpServerConfig {
  id: string;
  label?: string;
  templateId?: string;
  transport: McpTransport;
  enabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface McpTemplate {
  id: string;
  label: string;
  description: string;
  transport: McpTransport;
  category?: string;
  homepage?: string;
  example?: string;
  command?: string;
  args?: string[];
  url?: string;
}

export interface McpServersResponse {
  servers: McpServerConfig[];
  templates: McpTemplate[];
}

export interface StartMcpOAuthResponse {
  authorizeUrl: string;
  state: string;
  redirectUri: string;
}

export interface McpOAuthStatusResponse {
  connected: boolean;
  expiresAt?: number | null;
  scope?: string | null;
  savedAt?: number;
}

export async function fetchMcpServers(): Promise<McpServersResponse | null> {
  try {
    const res = await fetch('/api/mcp/servers');
    if (!res.ok) return null;
    const data = (await res.json()) as McpServersResponse;
    return {
      servers: Array.isArray(data?.servers) ? data.servers : [],
      templates: Array.isArray(data?.templates) ? data.templates : [],
    };
  } catch {
    return null;
  }
}

export async function saveMcpServers(
  servers: McpServerConfig[],
): Promise<McpServersResponse | null> {
  try {
    const res = await fetch('/api/mcp/servers', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ servers }),
    });
    if (!res.ok) return null;
    return (await res.json()) as McpServersResponse;
  } catch {
    return null;
  }
}

export type StartMcpOAuthResult =
  | { ok: true; response: StartMcpOAuthResponse }
  | { ok: false; status: number | null; message: string };

export async function startMcpOAuth(
  serverId: string,
): Promise<StartMcpOAuthResult> {
  try {
    const res = await fetch('/api/mcp/oauth/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serverId }),
    });
    if (!res.ok) {
      let message = `Daemon returned HTTP ${res.status}.`;
      try {
        const body = await res.json();
        if (typeof body?.error === 'string') message = body.error;
      } catch {
        // ignore
      }
      return { ok: false, status: res.status, message };
    }
    return { ok: true, response: (await res.json()) as StartMcpOAuthResponse };
  } catch (err) {
    return {
      ok: false,
      status: null,
      message: err instanceof Error ? err.message : 'Network error reaching daemon.',
    };
  }
}

export async function fetchMcpOAuthStatus(
  serverId: string,
): Promise<McpOAuthStatusResponse | null> {
  try {
    const res = await fetch(`/api/mcp/oauth/status?serverId=${encodeURIComponent(serverId)}`);
    if (!res.ok) return null;
    return (await res.json()) as McpOAuthStatusResponse;
  } catch {
    return null;
  }
}

export async function disconnectMcpOAuth(serverId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/mcp/oauth/disconnect', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ serverId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function suggestMcpServerId(
  label: string,
  taken: ReadonlySet<string>,
): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'mcp-server';
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const next = `${base}-${i}`;
    if (!taken.has(next)) return next;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
