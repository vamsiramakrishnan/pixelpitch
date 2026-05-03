#!/usr/bin/env bun
/**
 * skills-verify.ts
 *
 * Hashes each skill under `content/skills/` and verifies the same content exists
 * under `.claude/skills/` and `.gemini/skills/`. Skills that only exist
 * in the mirror dirs (e.g. `slide-author`, `html-to-slides`) are noted
 * but not flagged as errors.
 *
 * Exits 0 if mirrors are consistent with `content/skills/`, 1 otherwise.
 *
 * Usage: bun tools/skills-verify.ts
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SOURCE = join(ROOT, "content", "skills");
const TARGETS = [join(ROOT, ".claude", "skills"), join(ROOT, ".gemini", "skills")];

function hashDir(dir: string): string {
  if (!existsSync(dir)) return "MISSING";
  const h = createHash("sha256");
  function walk(d: string) {
    for (const entry of readdirSync(d).sort()) {
      const p = join(d, entry);
      const s = statSync(p);
      if (s.isDirectory()) {
        h.update(`D:${relative(dir, p)}\n`);
        walk(p);
      } else if (s.isFile()) {
        const buf = readFileSync(p);
        h.update(`F:${relative(dir, p)}:${buf.length}:`);
        h.update(buf);
        h.update("\n");
      }
    }
  }
  walk(dir);
  return h.digest("hex");
}

let failed = 0;
const skills = readdirSync(SOURCE).filter((n) => statSync(join(SOURCE, n)).isDirectory()).sort();
console.log(`skills-verify: ${skills.length} skills under ${relative(ROOT, SOURCE)}/`);
for (const skill of skills) {
  const srcHash = hashDir(join(SOURCE, skill));
  for (const target of TARGETS) {
    const tgtHash = hashDir(join(target, skill));
    if (srcHash !== tgtHash) {
      const tgtRel = relative(ROOT, join(target, skill));
      console.error(`  MISMATCH: ${skill} (source vs ${tgtRel})`);
      failed += 1;
    }
  }
}
// Note skills that exist only in mirrors (pixelpitch-native, e.g. slide-author).
for (const target of TARGETS) {
  if (!existsSync(target)) continue;
  const onlyInMirror = readdirSync(target)
    .filter((n) => statSync(join(target, n)).isDirectory())
    .filter((n) => !skills.includes(n));
  for (const skill of onlyInMirror) {
    console.log(`  (mirror-only) ${relative(ROOT, target)}/${skill}`);
  }
}
if (failed > 0) {
  console.error(`skills-verify: ${failed} mismatches`);
  process.exit(1);
}
console.log("skills-verify: ok");
