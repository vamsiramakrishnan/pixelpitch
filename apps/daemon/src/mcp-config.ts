import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

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

export interface McpConfig {
  servers: McpServerConfig[];
}

export interface McpTemplate {
  id: string;
  label: string;
  description: string;
  transport: McpTransport;
  category: 'utilities' | 'design-systems' | 'data-viz' | 'publishing';
  homepage?: string;
  example?: string;
  command?: string;
  args?: string[];
  envFields?: Array<{ key: string; label?: string; required?: boolean; placeholder?: string; secret?: boolean }>;
  url?: string;
  headerFields?: Array<{ key: string; label?: string; required?: boolean; placeholder?: string; secret?: boolean }>;
}

const VALID_TRANSPORTS = new Set<McpTransport>(['stdio', 'sse', 'http']);
const SERVER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

function configFile(dataDir: string): string {
  return path.join(dataDir, 'mcp-config.json');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeStringMap(raw: unknown): Record<string, string> | undefined {
  if (!isPlainObject(raw)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === '__proto__' || key === 'constructor') continue;
    if (!key.trim() || typeof value !== 'string' || !value.trim()) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizeStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.filter((value): value is string => typeof value === 'string');
  return out.length > 0 ? out : undefined;
}

export function sanitizeMcpServer(raw: unknown): McpServerConfig | null {
  if (!isPlainObject(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!SERVER_ID_PATTERN.test(id)) return null;
  const transport = typeof raw.transport === 'string' ? raw.transport as McpTransport : 'stdio';
  if (!VALID_TRANSPORTS.has(transport)) return null;

  const next: McpServerConfig = { id, transport, enabled: raw.enabled !== false };
  if (typeof raw.label === 'string' && raw.label.trim()) next.label = raw.label.trim();
  if (typeof raw.templateId === 'string' && raw.templateId.trim()) next.templateId = raw.templateId.trim();

  if (transport === 'stdio') {
    if (typeof raw.command !== 'string' || !raw.command.trim()) return null;
    next.command = raw.command.trim();
    const args = sanitizeStringArray(raw.args);
    if (args) next.args = args;
    const env = sanitizeStringMap(raw.env);
    if (env) next.env = env;
  } else {
    if (typeof raw.url !== 'string' || !raw.url.trim()) return null;
    let parsed: URL;
    try {
      parsed = new URL(raw.url.trim());
    } catch {
      return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    next.url = parsed.toString();
    const headers = sanitizeStringMap(raw.headers);
    if (headers) next.headers = headers;
  }
  return next;
}

export function sanitizeMcpConfig(raw: unknown): McpConfig {
  const list = isPlainObject(raw) && Array.isArray(raw.servers) ? raw.servers : [];
  const seen = new Set<string>();
  const servers: McpServerConfig[] = [];
  for (const item of list) {
    const server = sanitizeMcpServer(item);
    if (!server || seen.has(server.id)) continue;
    seen.add(server.id);
    servers.push(server);
  }
  return { servers };
}

export async function readMcpConfig(dataDir: string): Promise<McpConfig> {
  try {
    return sanitizeMcpConfig(JSON.parse(await readFile(configFile(dataDir), 'utf8')) as unknown);
  } catch (err) {
    const e = err as { code?: string; name?: string; message?: string };
    if (e.code === 'ENOENT') return { servers: [] };
    if (e.name === 'SyntaxError') {
      console.error('[mcp-config] Corrupted JSON, returning empty:', e.message);
      return { servers: [] };
    }
    throw err;
  }
}

export async function writeMcpConfig(dataDir: string, body: unknown): Promise<McpConfig> {
  const next = sanitizeMcpConfig(body);
  const file = configFile(dataDir);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
  return next;
}

export function isManagedProjectCwd(cwd: string | null | undefined, projectsDir: string): boolean {
  if (!cwd || !projectsDir || cwd === projectsDir) return false;
  return cwd.startsWith(projectsDir + path.sep);
}

export function buildClaudeMcpJson(servers: McpServerConfig[]): unknown | null {
  const enabled = servers.filter((server) => server.enabled);
  if (enabled.length === 0) return null;
  const mcpServers: Record<string, Record<string, unknown>> = {};
  for (const server of enabled) {
    if (server.transport === 'stdio') {
      const entry: Record<string, unknown> = { command: server.command };
      if (server.args?.length) entry.args = server.args;
      if (server.env && Object.keys(server.env).length > 0) entry.env = server.env;
      mcpServers[server.id] = entry;
    } else {
      const entry: Record<string, unknown> = { type: server.transport, url: server.url };
      if (server.headers && Object.keys(server.headers).length > 0) entry.headers = server.headers;
      mcpServers[server.id] = entry;
    }
  }
  return { mcpServers };
}

export async function writeClaudeMcpConfigForCwd(
  cwd: string,
  servers: McpServerConfig[],
): Promise<void> {
  const target = path.join(cwd, '.mcp.json');
  const payload = buildClaudeMcpJson(servers);
  if (!payload) {
    await rm(target, { force: true });
    return;
  }
  await writeFile(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export const MCP_TEMPLATES: McpTemplate[] = [
  {
    id: 'filesystem',
    label: 'Filesystem',
    description: 'Read, write, and list files in a sandboxed directory.',
    transport: 'stdio',
    category: 'utilities',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '<allowed-dir>'],
    example: 'List the markdown files under the allowed directory and summarize them.',
  },
  {
    id: 'github',
    label: 'GitHub',
    description: 'Read repositories, issues, and pull requests through the GitHub MCP server.',
    transport: 'stdio',
    category: 'utilities',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envFields: [{ key: 'GITHUB_PERSONAL_ACCESS_TOKEN', required: true, secret: true }],
    example: 'Show me the 5 most recent open issues labeled bug.',
  },
  {
    id: 'fetch',
    label: 'Fetch',
    description: 'Fetch URLs and convert HTML to markdown.',
    transport: 'stdio',
    category: 'utilities',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
    example: 'Fetch a public URL and summarize the page.',
  },
];
