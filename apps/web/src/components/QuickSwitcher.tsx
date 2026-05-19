// Cmd/Ctrl+P file palette overlay.
//
// Filters the project's `ProjectFile[]` by case-insensitive substring (with
// a small score boost for prefix-on-name matches), and calls onOpenFile on
// Enter. Esc closes. ↑↓ navigates the list. With an empty query, recents
// surface first, then the rest of the file list by mtime.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pushRecent, readRecents } from '../quickSwitcherRecents';
import type { LiveArtifactSummary, ProjectFile } from '../types';

interface Props {
  projectId: string;
  files: ProjectFile[];
  liveArtifacts?: LiveArtifactSummary[];
  onOpenFile: (name: string) => void;
  onOpenLiveArtifact?: (artifactId: string) => void;
  onClose: () => void;
}

type SwitcherItem =
  | { type: 'file'; file: ProjectFile; key: string; label: string; detail: string; kind: string; mtime: number }
  | { type: 'artifact'; artifact: LiveArtifactSummary; key: string; label: string; detail: string; kind: string; mtime: number };

export function QuickSwitcher({
  projectId,
  files,
  liveArtifacts = [],
  onOpenFile,
  onOpenLiveArtifact,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: SwitcherItem[] = [
      ...files.map((file) => ({
        type: 'file' as const,
        file,
        key: `file:${file.name}`,
        label: baseName(file.name),
        detail: dirName(file.name),
        kind: file.kind.toUpperCase(),
        mtime: file.mtime,
      })),
      ...liveArtifacts.map((artifact) => ({
        type: 'artifact' as const,
        artifact,
        key: `artifact:${artifact.id}`,
        label: artifact.title || artifact.id,
        detail: 'Live artifact',
        kind: 'LIVE',
        mtime: Date.parse(artifact.updatedAt || artifact.createdAt || '') || 0,
      })),
    ];
    if (q) {
      return items
        .map((item) => ({ item, score: scoreItem(item, q) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.item)
        .slice(0, 50);
    }
    // No query: recents (still-extant) first, then mtime-desc for the rest.
    const recents = readRecents(projectId);
    const byRecentKey = new Map(items.map((item) => [
      item.type === 'file' ? item.file.name : `artifact:${item.artifact.id}`,
      item,
    ] as const));
    const recentItems: SwitcherItem[] = [];
    const seen = new Set<string>();
    for (const name of recents) {
      const hit = byRecentKey.get(name);
      if (hit && !seen.has(name)) {
        recentItems.push(hit);
        seen.add(name);
      }
    }
    const rest = items
      .filter((item) => !seen.has(item.type === 'file' ? item.file.name : `artifact:${item.artifact.id}`))
      .slice()
      .sort((a, b) => b.mtime - a.mtime);
    return [...recentItems, ...rest].slice(0, 50);
  }, [files, liveArtifacts, query, projectId]);

  // Reset cursor when the result set changes shape.
  useEffect(() => {
    setCursor(0);
  }, [query]);

  // Keep the highlighted row in view as the cursor moves.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLDivElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const open = useCallback(
    (item: SwitcherItem) => {
      if (item.type === 'artifact') {
        onOpenLiveArtifact?.(item.artifact.id);
        pushRecent(projectId, `artifact:${item.artifact.id}`);
      } else {
        onOpenFile(item.file.name);
        pushRecent(projectId, item.file.name);
      }
      onClose();
    },
    [onOpenFile, onOpenLiveArtifact, onClose, projectId],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    // Don't intercept navigation/commit keys while an IME composition is
    // active — those keys are how users select / commit candidates when
    // typing CJK file names. Without this guard, ↑↓/Enter would steer the
    // palette cursor instead of the IME picker.
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (matches.length === 0) return;
      setCursor((c) => nextCursor(c, matches.length, 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (matches.length === 0) return;
      setCursor((c) => nextCursor(c, matches.length, -1));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = matches[cursor];
      if (hit) open(hit);
    }
  }

  const hasQuery = query.trim().length > 0;
  const emptyLabel = hasQuery ? 'No matching files' : 'No files in this project yet';

  return (
    <div className="qs-overlay" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="qs-palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="qs-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Open file..."
          spellCheck={false}
          aria-label="Open file"
        />
        <div className="qs-list" ref={listRef} role="listbox">
          {matches.length === 0 ? (
            <div className="qs-empty">{emptyLabel}</div>
          ) : (
            matches.map((item, i) => (
              <div
                key={item.key}
                data-idx={i}
                role="option"
                aria-selected={i === cursor}
                className={`qs-row ${i === cursor ? 'qs-row-active' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => open(item)}
              >
                <span className="qs-name" title={item.type === 'file' ? item.file.name : item.artifact.id}>{item.label}</span>
                <span className="qs-path">{item.detail}</span>
                <span className={`qs-kind${item.type === 'artifact' ? ' live' : ''}`}>{item.kind}</span>
              </div>
            ))
          )}
        </div>
        <div className="qs-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

// Cursor advance with wrap-around. Pulled out as a pure function so the
// boundary-wrap behavior can be unit-tested without simulating keyboard
// events (the rest of the test suite uses static-markup rendering).
// Exported for unit testing.
export function nextCursor(current: number, total: number, direction: 1 | -1): number {
  if (total <= 0) return 0;
  if (direction === 1) return (current + 1) % total;
  return (current - 1 + total) % total;
}

// Cheap fuzzy: prefix-on-basename beats substring-on-basename beats
// substring-on-full-name. Good enough for typical file lists; users who
// want sublime-text-style matching can graduate to a real fuzzy lib later.
// Exported for unit testing.
export function scoreMatch(file: ProjectFile, q: string): number {
  const name = file.name.toLowerCase();
  const base = baseName(name);
  if (base === q) return 1000;
  if (base.startsWith(q)) return 500;
  if (base.includes(q)) return 250;
  if (name.includes(q)) return 100;
  return 0;
}

function scoreItem(item: SwitcherItem, q: string): number {
  if (item.type === 'file') return scoreMatch(item.file, q);
  const title = item.label.toLowerCase();
  const id = item.artifact.id.toLowerCase();
  if (title === q || id === q) return 1000;
  if (title.startsWith(q)) return 520;
  if (title.includes(q)) return 270;
  if (id.includes(q)) return 110;
  return 0;
}

function baseName(name: string): string {
  const i = name.lastIndexOf('/');
  return i >= 0 ? name.slice(i + 1) : name;
}

function dirName(name: string): string {
  const i = name.lastIndexOf('/');
  return i >= 0 ? name.slice(0, i) : '';
}
