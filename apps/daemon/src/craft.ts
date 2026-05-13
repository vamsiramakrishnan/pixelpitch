// @ts-nocheck
// Craft references loader. The active skill declares which sections it
// needs via `od.craft.requires`; this module reads the matching files
// from <projectRoot>/craft/<slug>.md and returns a single concatenated
// body ready to splice into the system prompt. Missing files are
// dropped silently — a skill that lists `motion` before we ship a
// motion.md should still work, just without the motion section.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * @param {string} craftDir absolute path to the craft/ directory
 * @param {string[]} requested slugs from `od.craft.requires`
 * @returns {Promise<{ body: string, sections: string[] }>}
 *   body is the concatenated markdown (each file preceded by a level-3
 *   section header). sections lists which slugs actually resolved.
 */
export async function loadCraftSections(craftDir, requested) {
  if (!craftDir || !Array.isArray(requested) || requested.length === 0) {
    return { body: "", sections: [] };
  }
  const seen = new Set();
  const parts = [];
  const sections = [];
  for (const raw of requested) {
    if (typeof raw !== "string") continue;
    const slug = raw.trim().toLowerCase();
    if (!SLUG_RE.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    try {
      const filePath = path.join(craftDir, `${slug}.md`);
      const text = await readFile(filePath, "utf8");
      const trimmed = text.trim();
      if (!trimmed) continue;
      parts.push(`### ${slug}\n\n${trimmed}`);
      sections.push(slug);
    } catch {
      // File doesn't exist or unreadable — skip silently. Skills can
      // forward-reference future craft sections without breaking.
    }
  }
  return { body: parts.join("\n\n---\n\n"), sections };
}

export async function listCraftSections(craftDir) {
  let entries = [];
  try {
    entries = await readdir(craftDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const slug = entry.name.slice(0, -3).toLowerCase();
    if (!SLUG_RE.test(slug)) continue;
    try {
      const body = await readFile(path.join(craftDir, entry.name), "utf8");
      const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || slug;
      const summary =
        body
          .split(/\n{2,}/)
          .map((part) => part.replace(/^#+\s+/gm, "").trim())
          .find((part) => part && !part.startsWith("---"))
          ?.replace(/\s+/g, " ")
          .slice(0, 220) || "";
      out.push({ id: slug, title, summary, path: `${slug}.md` });
    } catch {
      // Skip unreadable craft files; discovery should stay best-effort.
    }
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export async function searchCraftSections(craftDir, query, limit = 8) {
  const sections = await listCraftSections(craftDir);
  const terms = tokenizeSearch(query);
  if (terms.length === 0) return sections.slice(0, limit).map((section) => ({ section, score: 0, matched: [] }));
  const ranked = [];
  for (const section of sections) {
    let body = "";
    try {
      body = await readFile(path.join(craftDir, section.path), "utf8");
    } catch {
      body = "";
    }
    let score = 0;
    const matched = new Set();
    const fields = [
      [section.id, 6],
      [section.title, 6],
      [section.summary, 4],
      [body, 1],
    ];
    for (const term of terms) {
      for (const [value, weight] of fields) {
        if (String(value ?? "").toLowerCase().includes(term)) {
          score += weight;
          matched.add(term);
        }
      }
    }
    if (score > 0) ranked.push({ section, score, matched: [...matched] });
  }
  return ranked.sort((a, b) => b.score - a.score || a.section.title.localeCompare(b.section.title)).slice(0, limit);
}

function tokenizeSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9-]+/g)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}
