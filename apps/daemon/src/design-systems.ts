// @ts-nocheck
// Design-system registry. Scans <projectRoot>/design-systems/* for DESIGN.md
// files. Title comes from the first H1. Category comes from a
// `> Category: <name>` blockquote line beneath the H1. Summary is the first
// paragraph between the H1 and the next heading (Category line stripped).

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { DesignSystemTokens } from '@pixelpitch/contracts';

export async function listDesignSystems(root) {
  const out = [];
  let entries = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const designPath = path.join(root, entry.name, 'DESIGN.md');
    try {
      const stats = await stat(designPath);
      if (!stats.isFile()) continue;
      const raw = await readFile(designPath, 'utf8');
      const titleMatch = /^#\s+(.+?)\s*$/m.exec(raw);
      const title = cleanTitle(titleMatch?.[1] ?? entry.name);
      const systemDir = path.join(root, entry.name);

      // Check for structured tokens
      let hasStructuredTokens = false;
      let tokensColors = null;
      const tokensPath = path.join(systemDir, 'tokens.json');
      try {
        const tokensRaw = await readFile(tokensPath, 'utf8');
        const tokens = JSON.parse(tokensRaw);
        if (tokens && tokens.version === 1) {
          hasStructuredTokens = true;
          tokensColors = tokens.colors;
        }
      } catch { /* no tokens.json */ }

      // Scan for preview cards
      let previews = [];
      try {
        const previewDir = path.join(systemDir, 'preview');
        const previewEntries = await readdir(previewDir);
        previews = previewEntries
          .filter((f) => f.endsWith('.html'))
          .sort();
      } catch { /* no preview/ dir */ }

      // When structured tokens exist, derive swatches from tokens.colors
      // instead of regex (more reliable).
      const swatches = tokensColors
        ? [
            tokensColors.paper ?? '#ffffff',
            tokensColors.border ?? tokensColors.slate ?? '#cccccc',
            tokensColors.ink ?? '#111111',
            tokensColors.signal ?? '#888888',
          ]
        : extractSwatches(raw);

      out.push({
        id: entry.name,
        title,
        category: extractCategory(raw) ?? 'Uncategorized',
        summary: summarize(raw),
        swatches,
        surface: extractSurface(raw),
        body: raw,
        ...(hasStructuredTokens ? { hasStructuredTokens: true } : {}),
        ...(previews.length > 0 ? { previews } : {}),
      });
    } catch {
      // Skip.
    }
  }
  return out;
}

export async function searchDesignSystems(root, query, limit = 8) {
  const systems = await listDesignSystems(root);
  const terms = tokenizeSearch(query);
  if (terms.length === 0) {
    return systems.slice(0, limit).map((system) => ({
      designSystem: stripDesignSystemBody(system),
      score: 0,
      matched: [],
    }));
  }
  return systems
    .map((system) => {
      const fields = [
        [system.id, 7],
        [system.title, 7],
        [system.category, 5],
        [system.summary, 4],
        [system.surface, 3],
        [system.body, 1],
      ];
      let score = 0;
      const matched = new Set();
      for (const term of terms) {
        for (const [value, weight] of fields) {
          if (String(value ?? '').toLowerCase().includes(term)) {
            score += weight;
            matched.add(term);
          }
        }
      }
      return { designSystem: stripDesignSystemBody(system), score, matched: [...matched] };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.designSystem.title.localeCompare(b.designSystem.title))
    .slice(0, limit);
}

function stripDesignSystemBody(system) {
  const { body, ...rest } = system;
  return rest;
}

function tokenizeSearch(value) {
  return String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/g)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

export async function readDesignSystem(root, id) {
  const file = path.join(root, id, 'DESIGN.md');
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

export async function readDesignSystemTokens(root: string, id: string): Promise<DesignSystemTokens | null> {
  const file = path.join(root, id, 'tokens.json');
  try {
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as DesignSystemTokens;
  } catch {
    return null;
  }
}

export async function listDesignSystemPreviews(root: string, id: string): Promise<string[]> {
  const previewDir = path.join(root, id, 'preview');
  try {
    const entries = await readdir(previewDir);
    return entries.filter((f) => f.endsWith('.html')).sort();
  } catch {
    return [];
  }
}

function summarize(raw) {
  const lines = raw.split(/\r?\n/);
  const firstH1 = lines.findIndex((l) => /^#\s+/.test(l));
  if (firstH1 === -1) return '';
  const afterH1 = lines.slice(firstH1 + 1);
  const nextHeading = afterH1.findIndex((l) => /^#{1,6}\s+/.test(l));
  const window = (nextHeading === -1 ? afterH1 : afterH1.slice(0, nextHeading))
    .join('\n')
    // Drop the Category metadata line — it's surfaced separately.
    .replace(/^>\s*Category:.*$/gim, '')
    .replace(/^>\s*/gm, '')
    .trim();
  return window.split(/\n\n/)[0]?.slice(0, 240) ?? '';
}

function extractCategory(raw) {
  const m = /^>\s*Category:\s*(.+?)\s*$/im.exec(raw);
  return m?.[1];
}

const KNOWN_SURFACES = new Set(['web', 'image', 'video', 'audio']);
function extractSurface(raw) {
  const m = /^>\s*Surface:\s*(.+?)\s*$/im.exec(raw);
  if (!m) return 'web';
  const v = m[1].trim().toLowerCase();
  return KNOWN_SURFACES.has(v) ? v : 'web';
}

// Strip boilerplate like "Design System Inspired by Cohere" → "Cohere" so
// the picker dropdown reads cleanly. Hand-authored titles that don't match
// the pattern (e.g. "Neutral Modern") pass through unchanged.
function cleanTitle(raw) {
  return raw
    .replace(/^Design System (Inspired by|for)\s+/i, '')
    .trim();
}

/**
 * Pull 4 representative colors from a DESIGN.md so the picker can render
 * a tiny swatch row next to each system. Order: [bg, support, fg, accent].
 *
 * The shape is deliberately compact — one accent + one background + one
 * fg + one supporting tone — so the row reads like a brand mark even at
 * thumbnail scale. Picked greedily by token-name hints (matches the
 * heuristics in design-system-preview.js so the strip and the showcase
 * agree on which colors the system "is").
 *
 * @param {string} raw  Markdown body of DESIGN.md
 * @returns {string[]}  Up to 4 hex strings; [] if extraction fails.
 */
function extractSwatches(raw) {
  const colors = [];
  const seen = new Set();
  function push(name, value) {
    const cleanName = name.replace(/[*_`]+/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const v = normalizeHex(value);
    if (!v || cleanName.length > 60) return;
    const key = `${cleanName}|${v}`;
    if (seen.has(key)) return;
    seen.add(key);
    colors.push({ name: cleanName, value: v });
  }
  // Form A: "- **Background:** `#FAFAFA`"
  const reA = /^[\s>*-]*\**\s*([A-Za-z][A-Za-z0-9 /&()+_-]{1,40}?)\s*\**\s*[:：]\s*`?(#[0-9a-fA-F]{3,8})/gm;
  let m;
  while ((m = reA.exec(raw)) !== null) push(m[1], m[2]);
  // Form B: "**Stripe Purple** (`#533afd`)"
  const reB = /\*\*([A-Za-z][A-Za-z0-9 /&()+_-]{1,40}?)\*\*\s*\(?\s*`?(#[0-9a-fA-F]{3,8})/g;
  while ((m = reB.exec(raw)) !== null) push(m[1], m[2]);
  if (colors.length === 0) return [];

  function pick(hints) {
    for (const h of hints) {
      const found = colors.find((c) => c.name.includes(h));
      if (found) return found.value;
    }
    return null;
  }
  function isNeutral(hex) {
    if (!/^#[0-9a-f]{6}$/.test(hex)) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return Math.max(r, g, b) - Math.min(r, g, b) < 10;
  }

  const bg =
    pick(['page background', 'background', 'canvas', 'paper', 'surface'])
    ?? '#ffffff';
  const fg =
    pick(['heading', 'foreground', 'ink', 'fg', 'text', 'navy', 'graphite'])
    ?? '#111111';
  const accent =
    pick(['primary brand', 'brand primary', 'accent', 'brand', 'primary'])
    ?? colors.find((c) => !isNeutral(c.value))?.value
    ?? colors[0]?.value
    ?? '#888888';
  const support =
    pick(['border', 'divider', 'rule', 'muted', 'secondary', 'subtle'])
    ?? colors.find(
      (c) => isNeutral(c.value) && c.value !== bg && c.value !== fg,
    )?.value
    ?? '#cccccc';

  return [bg, support, fg, accent];
}

function normalizeHex(raw) {
  if (typeof raw !== 'string') return null;
  const m = /^#([0-9a-fA-F]{3,8})$/.exec(raw.trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 4) hex = hex.split('').map((c) => c + c).join('').slice(0, 8);
  return '#' + hex.toLowerCase();
}
