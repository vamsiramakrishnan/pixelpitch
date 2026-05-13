// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';

import { projectDir, resolveProjectDir } from './projects.js';

const IGNORE_NAMES = new Set([
  '.git',
  'node_modules',
  '.pixelpitch',
  '.od',
  '.tmp',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
  '__pycache__',
  '.venv',
  'venv',
  'target',
]);

export function makeIgnored(rootDir) {
  return (absPath) => {
    const rel = path.relative(rootDir, absPath);
    if (!rel || rel.startsWith('..')) return false;
    return rel.split(/[\\/]/).some((segment) => IGNORE_NAMES.has(segment));
  };
}

const registry = new Map();

async function addDirWatcher(entry, dir) {
  if (entry.ignored(dir) || entry.watchers.has(dir)) return;
  let dirStat;
  try {
    dirStat = await stat(dir);
  } catch {
    return;
  }
  if (!dirStat.isDirectory()) return;

  const watcher = fs.watch(dir, { persistent: true }, async (eventType, filename) => {
    if (!filename) return;
    const absPath = path.join(dir, String(filename));
    if (entry.ignored(absPath)) return;
    const rel = path.relative(entry.dir, absPath).split(path.sep).join('/');
    if (!rel || rel.startsWith('..')) return;

    let kind = eventType === 'change' ? 'change' : 'change';
    try {
      const nextStat = await stat(absPath);
      if (nextStat.isDirectory()) {
        await walkDirs(entry, absPath);
        return;
      }
      kind = eventType === 'rename' ? 'add' : 'change';
    } catch {
      kind = 'unlink';
    }

    const payload = { type: 'file-changed', path: rel, kind };
    for (const cb of entry.subscribers) {
      try {
        cb(payload);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[project-watchers] subscriber threw on', rel, err);
        }
      }
    }
  });
  watcher.on('error', (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[project-watchers] fs.watch error in', dir, err);
    }
  });
  entry.watchers.set(dir, watcher);
}

async function walkDirs(entry, dir) {
  await addDirWatcher(entry, dir);
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const item of entries) {
    if (!item.isDirectory()) continue;
    const child = path.join(dir, item.name);
    if (!entry.ignored(child)) await walkDirs(entry, child);
  }
}

async function makeEntry(dir, opts) {
  const entry = {
    dir,
    watchers: new Map(),
    subscribers: new Set(),
    ignored: opts.ignored || makeIgnored(dir),
    closing: null,
    ready: Promise.resolve(),
  };
  entry.ready = walkDirs(entry, dir);
  return entry;
}

export function subscribe(projectsRoot, projectId, onEvent, opts = {}) {
  const dir = opts.metadata
    ? resolveProjectDir(projectsRoot, projectId, opts.metadata)
    : projectDir(projectsRoot, projectId);
  let entry = registry.get(dir);
  if (!entry) {
    const factory = opts._watcherFactory || makeEntry;
    const maybeEntry = factory(dir, {
      ignored: opts.ignored || makeIgnored(dir),
    });
    if (typeof maybeEntry?.then === 'function') {
      entry = {
        dir,
        watchers: new Map(),
        subscribers: new Set(),
        ignored: opts.ignored || makeIgnored(dir),
        closing: null,
        ready: maybeEntry.then((resolved) => {
          Object.assign(entry, resolved);
        }),
      };
    } else {
      entry = maybeEntry;
    }
    registry.set(dir, entry);
  }
  entry.subscribers.add(onEvent);

  let unsubscribed = false;
  const unsubscribe = async () => {
    if (unsubscribed) return;
    unsubscribed = true;
    entry.subscribers.delete(onEvent);
    if (entry.subscribers.size > 0) return;
    registry.delete(dir);
    for (const watcher of entry.watchers.values()) watcher.close();
    entry.watchers.clear();
  };

  return { unsubscribe, ready: entry.ready || Promise.resolve() };
}

export async function _resetForTests() {
  const entries = [...registry.values()];
  registry.clear();
  for (const entry of entries) {
    for (const watcher of entry.watchers.values()) watcher.close();
  }
}

export function _activeWatcherCount() {
  return registry.size;
}
