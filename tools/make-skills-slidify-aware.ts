#!/usr/bin/env bun
/**
 * make-skills-slidify-aware.ts
 *
 * Idempotently appends a "Slidify-aware authoring (PPTX export)" footer
 * to every skill whose frontmatter declares `pixelpitch.mode: deck`.
 *
 * The footer references craft/slidify-compat.md and the slide-author
 * skill — it ADDS slidify-awareness without removing any sophistication
 * from the skill's own authoring instructions.
 *
 * Re-runnable: skipped if the marker is already present.
 *
 * Usage: bun tools/make-skills-slidify-aware.ts
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SKILLS = join(ROOT, "content", "skills");
const MARKER = "<!-- pixelpitch:slidify-aware -->";

const FOOTER = `
${MARKER}
## Slidify-aware authoring (PPTX export)

This deck skill is part of pixelpitch's slide-designing system. The
HTML you author here is rendered live in the sandboxed iframe preview
and, when the user exports to PPTX, fed through \`slidify\` for a
maximally-editable PowerPoint file.

You don't need to change any of the design above to make slidify happy.
You can use \`backdrop-filter\`, \`mix-blend-mode\`, \`<canvas>\` heroes,
gradient text-clipping, and the full Tailwind / shadcn / Lucide stack.

There are **three free hints** that help slidify produce more editable
PPTX without changing a single pixel:

1. **Tag the slide title.** Add \`data-pptx-role="title"\` to the \`<h1>\`
   (or \`<h2>\`) you treat as the slide title. Slidify routes it to the
   master title placeholder and keeps it editable.
2. **Use atomic-seed atoms when one matches.** When your CSS happens to
   match a named recipe (\`bg.mesh\`, \`type.gfill-4\`, \`data.ring\`,
   etc.), tag the cluster anchor with \`data-atom="<id>"\`. Your CSS
   still runs in the browser unchanged; the hint just helps slidify
   pick the curated native recipe instead of guessing.
3. **Mark intentional bleed.** When a decorative element intentionally
   extends past the slide boundary (aurora glow, longshadow, marquee),
   tag the parent with \`data-pptx-allow-overflow="true"\`.

For irreducible effects (custom WebGL, complex masks), \`data-pptx-rasterize="true"\`
on the wrapper tells slidify to use a clean raster tile straight away
rather than discovering it.

Full guide: [\`content/craft/slidify-compat.md\`](../../craft/slidify-compat.md).
Atomic-seed grammar: [\`slide-author\`](../../.claude/skills/slide-author/SKILL.md)
sibling skill. Evolution loop (how slidify catches up to whatever this
skill emits): [\`docs/slidify-evolution.md\`](../../docs/slidify-evolution.md).

### Export

\`\`\`bash
slidify convert deck.html out.pptx --json --report-json /tmp/r.json
slidify field /tmp/r.json native_area_ratio        # how editable the result is
slidify check deck.html                             # exit 0 ok / 3 = drift
\`\`\`

Inside the pixelpitch web app, the daemon shells out to this same
\`slidify\` binary when the user clicks Export → PPTX.
`;

function isDeckSkill(skillMd: string): boolean {
  return /^pixelpitch:[\s\S]*?^\s+mode:\s*["']?deck["']?/m.test(skillMd);
}

function processSkill(name: string): "patched" | "already" | "not-deck" | "missing" {
  const skillDir = join(SKILLS, name);
  if (!statSync(skillDir).isDirectory()) return "missing";
  const skillMd = join(skillDir, "SKILL.md");
  let body: string;
  try {
    body = readFileSync(skillMd, "utf-8");
  } catch {
    return "missing";
  }
  if (!isDeckSkill(body)) return "not-deck";
  if (body.includes(MARKER)) return "already";
  const newBody = body.trimEnd() + "\n" + FOOTER;
  writeFileSync(skillMd, newBody);
  return "patched";
}

const names = readdirSync(SKILLS).sort();
let patched = 0,
  already = 0,
  skipped = 0;
for (const name of names) {
  const r = processSkill(name);
  if (r === "patched") {
    patched += 1;
    console.log(`  patched ${name}`);
  } else if (r === "already") {
    already += 1;
  } else {
    skipped += 1;
  }
}
console.log(`\ndone. patched=${patched} already-aware=${already} skipped=${skipped}`);
