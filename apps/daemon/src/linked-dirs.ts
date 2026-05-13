import fs from 'node:fs';
import path from 'node:path';

const BLOCKED_CANONICAL = (() => {
  const raw =
    process.platform === 'win32'
      ? ['C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)']
      : ['/etc', '/proc', '/sys', '/dev', '/boot'];
  const set = new Set(raw);
  for (const p of raw) {
    try {
      set.add(fs.realpathSync.native(p));
    } catch {
      // Keep the literal path if it is not resolvable in this environment.
    }
  }
  return [...set];
})();

function isFilesystemRoot(p: string): boolean {
  if (process.platform === 'win32') return /^[A-Za-z]:\\?$/.test(p);
  return p === '/';
}

function isBlocked(realPath: string): boolean {
  if (isFilesystemRoot(realPath)) return true;
  return BLOCKED_CANONICAL.some(
    (blocked) =>
      realPath === blocked ||
      realPath.startsWith(blocked + path.sep) ||
      blocked.startsWith(realPath + path.sep),
  );
}

export function validateLinkedDirs(
  dirs: unknown,
): { dirs: string[]; error?: undefined } | { error: string; dirs?: undefined } {
  if (!Array.isArray(dirs)) return { error: 'linkedDirs must be an array' };
  const validated: string[] = [];
  for (const item of dirs) {
    if (typeof item !== 'string' || !item.trim()) {
      return { error: 'each linked dir must be a non-empty string' };
    }
    if (!path.isAbsolute(item)) {
      return { error: `linked dir must be an absolute path: ${item}` };
    }
    let realPath: string;
    try {
      realPath = fs.realpathSync.native(path.resolve(item));
      if (!fs.statSync(realPath).isDirectory()) return { error: `not a directory: ${item}` };
    } catch {
      return { error: `directory does not exist or is not accessible: ${item}` };
    }
    if (isBlocked(realPath)) return { error: `system directory not allowed: ${item}` };
    validated.push(realPath);
  }
  return { dirs: [...new Set(validated)] };
}
