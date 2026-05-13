import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { startServer } from '../src/server.js';

describe('local folder import', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('imports an existing folder as a project and reads files from the folder', async () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'pixelpitch-folder-import-'));
    roots.push(folder);
    writeFileSync(path.join(folder, 'index.html'), '<!doctype html><h1>Linked</h1>');

    const started = await startServer({ port: 0, host: '127.0.0.1', returnServer: true }) as {
      server: { close(cb: () => void): void };
      url: string;
    };

    try {
      const importResponse = await fetch(`${started.url}/api/import/folder`, {
        body: JSON.stringify({ baseDir: folder }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      expect(importResponse.status).toBe(200);
      const imported = await importResponse.json() as {
        project: { id: string; metadata: { baseDir: string; importedFrom: string; entryFile: string } };
        entryFile: string;
      };
      expect(imported.project.metadata.baseDir).toBe(folder);
      expect(imported.project.metadata.importedFrom).toBe('folder');
      expect(imported.entryFile).toBe('index.html');

      const filesResponse = await fetch(`${started.url}/api/projects/${imported.project.id}/files`);
      expect(filesResponse.status).toBe(200);
      expect(await filesResponse.json()).toMatchObject({
        files: [expect.objectContaining({ name: 'index.html' })],
      });

      const rawResponse = await fetch(`${started.url}/api/projects/${imported.project.id}/raw/index.html`);
      expect(rawResponse.status).toBe(200);
      expect(await rawResponse.text()).toContain('<h1>Linked</h1>');
    } finally {
      await new Promise<void>((resolve) => started.server.close(resolve));
    }
  });

  it('validates linked directories on project metadata patches', async () => {
    const linked = mkdtempSync(path.join(tmpdir(), 'pixelpitch-linked-dir-'));
    roots.push(linked);
    const projectFolder = mkdtempSync(path.join(tmpdir(), 'pixelpitch-folder-import-'));
    roots.push(projectFolder);
    await mkdir(path.join(projectFolder, 'src'), { recursive: true });
    await writeFile(path.join(projectFolder, 'index.html'), '<h1>Linked</h1>');

    const started = await startServer({ port: 0, host: '127.0.0.1', returnServer: true }) as {
      server: { close(cb: () => void): void };
      url: string;
    };

    try {
      const importResponse = await fetch(`${started.url}/api/import/folder`, {
        body: JSON.stringify({ baseDir: projectFolder }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      const imported = await importResponse.json() as { project: { id: string } };

      const patchResponse = await fetch(`${started.url}/api/projects/${imported.project.id}`, {
        body: JSON.stringify({ metadata: { kind: 'prototype', linkedDirs: [linked] } }),
        headers: { 'content-type': 'application/json' },
        method: 'PATCH',
      });
      expect(patchResponse.status).toBe(200);
      const patched = await patchResponse.json() as {
        project: { metadata: { baseDir: string; linkedDirs: string[] } };
      };
      expect(patched.project.metadata.baseDir).toBe(projectFolder);
      expect(patched.project.metadata.linkedDirs).toEqual([linked]);
    } finally {
      await new Promise<void>((resolve) => started.server.close(resolve));
    }
  });
});
