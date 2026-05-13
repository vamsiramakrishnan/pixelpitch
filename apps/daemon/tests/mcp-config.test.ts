import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import {
  buildClaudeMcpJson,
  isManagedProjectCwd,
  readMcpConfig,
  sanitizeMcpConfig,
  writeClaudeMcpConfigForCwd,
  writeMcpConfig,
} from '../src/mcp-config.js';

describe('mcp config', () => {
  it('sanitizes and de-duplicates configured servers', () => {
    expect(sanitizeMcpConfig({
      servers: [
        { id: 'github', transport: 'stdio', command: 'npx', args: ['-y', 'server'] },
        { id: 'github', transport: 'stdio', command: 'ignored' },
        { id: '../bad', transport: 'stdio', command: 'npx' },
        { id: 'remote', transport: 'http', url: 'https://example.com/mcp', headers: { Authorization: '' } },
      ],
    })).toEqual({
      servers: [
        { id: 'github', transport: 'stdio', enabled: true, command: 'npx', args: ['-y', 'server'] },
        { id: 'remote', transport: 'http', enabled: true, url: 'https://example.com/mcp' },
      ],
    });
  });

  it('persists config and writes Claude .mcp.json in managed project folders', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'pixelpitch-mcp-data-'));
    const projectDir = await mkdtemp(path.join(tmpdir(), 'pixelpitch-mcp-project-'));
    try {
      await writeMcpConfig(dataDir, {
        servers: [{ id: 'fetch', transport: 'stdio', command: 'npx', args: ['-y', 'fetch'] }],
      });
      const config = await readMcpConfig(dataDir);
      expect(buildClaudeMcpJson(config.servers)).toEqual({
        mcpServers: {
          fetch: { command: 'npx', args: ['-y', 'fetch'] },
        },
      });

      await writeClaudeMcpConfigForCwd(projectDir, config.servers);
      expect(JSON.parse(await readFile(path.join(projectDir, '.mcp.json'), 'utf8'))).toEqual({
        mcpServers: {
          fetch: { command: 'npx', args: ['-y', 'fetch'] },
        },
      });
    } finally {
      await rm(dataDir, { recursive: true, force: true });
      await rm(projectDir, { recursive: true, force: true });
    }
  });

  it('only treats project children as managed MCP config targets', () => {
    expect(isManagedProjectCwd('/repo/.pixelpitch/projects/p1', '/repo/.pixelpitch/projects')).toBe(true);
    expect(isManagedProjectCwd('/repo/.pixelpitch/projects', '/repo/.pixelpitch/projects')).toBe(false);
    expect(isManagedProjectCwd('/Users/me/project', '/repo/.pixelpitch/projects')).toBe(false);
  });
});
