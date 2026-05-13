#!/usr/bin/env bun
/**
 * skills-sync.ts
 *
 * Mirrors the canonical `content/skills/` directory into `.claude/skills/`,
 * `.gemini/skills/`, and `${CODEX_HOME:-~/.codex}/skills/` so AI agents that look in those locations discover
 * the bundled skill catalog.
 *
 * Behavior:
 *   - Files that originate from `content/skills/<skill>/` overwrite their copies
 *     in `.claude/skills/<skill>/`, `.gemini/skills/<skill>/`, and the Codex skills dir.
 *   - Skills that exist ONLY in a mirror dir (e.g. pixelpitch's own
 *     `slide-author` and `html-to-slides`) are left untouched.
 *   - Removed-from-source skills are NOT pruned from the mirrors —
 *     deletion is manual to avoid surprises.
 *
 * Usage: bun tools/skills-sync.ts
 */
import { mkdirSync, readdirSync, statSync, copyFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "content", "skills");
const CODEX_SKILLS_DIR = process.env.CODEX_SKILLS_DIR?.trim()
  || join(process.env.CODEX_HOME?.trim() || join(os.homedir(), ".codex"), "skills");
const TARGETS = [
  join(ROOT, ".claude", "skills"),
  join(ROOT, ".gemini", "skills"),
  CODEX_SKILLS_DIR,
];

function copyDir(src: string, dst: string): number {
  let count = 0;
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src)) {
    const sp = join(src, entry);
    const dp = join(dst, entry);
    const s = statSync(sp);
    if (s.isDirectory()) {
      count += copyDir(sp, dp);
    } else if (s.isFile()) {
      copyFileSync(sp, dp);
      count += 1;
    }
  }
  return count;
}

if (!existsSync(SOURCE)) {
  console.error(`skills-sync: ${SOURCE} does not exist`);
  process.exit(1);
}

const skills = readdirSync(SOURCE).filter((name) => {
  return statSync(join(SOURCE, name)).isDirectory();
});

console.log(`skills-sync: ${skills.length} skills under ${relative(ROOT, SOURCE)}/`);

for (const target of TARGETS) {
  let total = 0;
  for (const skill of skills) {
    total += copyDir(join(SOURCE, skill), join(target, skill));
  }
  console.log(`  → ${relative(ROOT, target)}: ${total} files copied across ${skills.length} skills`);
}

console.log("done.");
