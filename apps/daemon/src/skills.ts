// @ts-nocheck
// Skill registry. Scans <projectRoot>/skills/* for SKILL.md files, parses
// front-matter, returns listing. No watching in this MVP — re-scans on every
// GET /api/skills, which is fine for dozens of skills.

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export async function listSkills(skillsRoot) {
  const out = [];
  let entries = [];
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(skillsRoot, entry.name);
    const skillPath = path.join(dir, "SKILL.md");
    try {
      const stats = await stat(skillPath);
      if (!stats.isFile()) continue;
      const raw = await readFile(skillPath, "utf8");
      const { data, body } = parseFrontmatter(raw);
      const pixelpitch = data.pixelpitch || data.od || {};
      const hasAttachments = await dirHasAttachments(dir);
      const mode = pixelpitch.mode || inferMode(body, data.description);
      const surface = normalizeSurface(pixelpitch.surface, mode);
      out.push({
        id: data.name || entry.name,
        name: data.name || entry.name,
        description: data.description || "",
        triggers: Array.isArray(data.triggers) ? data.triggers : [],
        mode,
        surface,
        craftRequires: normalizeCraftRequires(pixelpitch.craft?.requires),
        platform: normalizePlatform(
          pixelpitch.platform,
          mode,
          body,
          data.description
        ),
        scenario: normalizeScenario(pixelpitch.scenario, body, data.description),
        previewType: pixelpitch.preview?.type || "html",
        designSystemRequired: pixelpitch.design_system?.requires ?? true,
        defaultFor: normalizeDefaultFor(pixelpitch.default_for),
        upstream:
          typeof pixelpitch.upstream === "string" ? pixelpitch.upstream : null,
        featured: normalizeFeatured(pixelpitch.featured),
        // Optional metadata hints used by 'Use this prompt' fast-create so
        // the resulting project mirrors the shipped example.html. Each hint
        // is only consumed when its kind matches the skill mode; missing
        // hints fall back to the same defaults the new-project form uses.
        fidelity: normalizeFidelity(pixelpitch.fidelity),
        speakerNotes: normalizeBoolHint(pixelpitch.speaker_notes),
        animations: normalizeBoolHint(pixelpitch.animations),
        examplePrompt: derivePrompt(data, pixelpitch),
        cliProcedures: normalizeCliProcedures(pixelpitch, body),
        body: hasAttachments ? withSkillRootPreamble(body, dir) : body,
        dir,
      });
    } catch {
      // Skip unreadable entries — this is discovery, not validation.
    }
  }
  return out;
}

export async function searchSkills(skillsRoot, query, limit = 8) {
  const skills = await listSkills(skillsRoot);
  const terms = tokenizeSearch(query);
  if (terms.length === 0) {
    return skills.slice(0, limit).map((skill) => ({
      skill: stripSearchOnlySkillFields(skill),
      score: 0,
      matched: [],
    }));
  }
  const ranked = skills
    .map((skill) => {
      const fields = [
        [skill.id, 6],
        [skill.name, 6],
        [skill.description, 5],
        [skill.mode, 4],
        [skill.surface, 3],
        [skill.scenario, 3],
        [skill.platform, 2],
        [Array.isArray(skill.triggers) ? skill.triggers.join(" ") : "", 4],
        [Array.isArray(skill.craftRequires) ? skill.craftRequires.join(" ") : "", 3],
        [skill.examplePrompt, 3],
        [skill.body, 1],
      ];
      let score = 0;
      const matched = new Set();
      for (const term of terms) {
        for (const [value, weight] of fields) {
          const hay = String(value ?? "").toLowerCase();
          if (!hay) continue;
          if (hay.includes(term)) {
            score += weight;
            matched.add(term);
          }
        }
      }
      return { skill, score, matched: [...matched] };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit);
  return ranked.map((item) => ({
    skill: stripSearchOnlySkillFields(item.skill),
    score: item.score,
    matched: item.matched,
  }));
}

function stripSearchOnlySkillFields(skill) {
  const { body, dir, ...rest } = skill;
  return {
    ...rest,
    hasBody: typeof body === "string" && body.length > 0,
  };
}

function tokenizeSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9-]+/g)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

// Skills that ship side files (e.g. `assets/template.html`, `references/*.md`)
// need the agent to know where the skill lives on disk — relative paths in the
// SKILL.md body resolve against the agent's CWD, which is the daemon root, not
// the skill folder. We prepend a short preamble so any capable code agent can
// open those files via absolute paths.
function withSkillRootPreamble(body, dir) {
  const preamble = [
    "> **Skill root (absolute):** `" + dir + "`",
    ">",
    "> This skill ships side files alongside `SKILL.md`. When the workflow",
    "> below references relative paths such as `assets/template.html` or",
    "> `references/layouts.md`, resolve them against the skill root above and",
    "> open them via their full absolute path.",
    "",
    "",
  ].join("\n");
  return preamble + body;
}

async function dirHasAttachments(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.some(
      (e) =>
        e.name !== "SKILL.md" &&
        (e.isDirectory() || /\.(md|html|css|js|json|txt)$/i.test(e.name))
    );
  } catch {
    return false;
  }
}

// Craft sections live at <projectRoot>/craft/<name>.md. We accept any
// alphanumeric+dash slug here so adding a new section is as simple as
// dropping a file in craft/ and listing its name in the skill — no
// daemon-side allowlist to keep in sync. The compose path checks the
// file actually exists before injecting; missing files fall through
// silently. The frontend can render the requested list verbatim.
function normalizeCraftRequires(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const slug = v.trim().toLowerCase();
    if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug);
  }
  return out;
}

function normalizeDefaultFor(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}

// Optional `pixelpitch.fidelity` hint for prototype skills. Only 'wireframe' and
// 'high-fidelity' are meaningful — anything else collapses to null so the
// caller falls back to the form default ('high-fidelity').
function normalizeFidelity(value) {
  if (value === "wireframe" || value === "high-fidelity") return value;
  return null;
}

// Coerce truthy / falsy strings ("true", "yes", "false", "no") and booleans
// to a real boolean. Returns null for anything we can't interpret so the
// caller knows to fall back to the form default.
function normalizeBoolHint(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "yes" || v === "1") return true;
    if (v === "false" || v === "no" || v === "0") return false;
  }
  return null;
}

// Coerce `pixelpitch.featured` into a numeric priority. Lower numbers float to the
// top of the Examples gallery; `true` is treated as priority 1; anything
// missing/unrecognised becomes null so non-featured skills keep their
// natural alphabetical order.
function normalizeFeatured(value) {
  if (value === true) return 1;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// Prefer an explicitly authored `pixelpitch.example_prompt`. Fall back to the
// skill description's first sentence — it's already written in actionable
// language ("Admin / analytics dashboard in a single HTML file…") so it
// serves as a passable starter prompt.
function derivePrompt(data, pixelpitch = data.pixelpitch || data.od || {}) {
  const explicit = pixelpitch.example_prompt;
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  const desc =
    typeof data.description === "string" ? data.description.trim() : "";
  if (!desc) return "";
  const collapsed = desc.replace(/\s+/g, " ").trim();
  const firstSentence = collapsed.match(/^.+?[.!?。！？](?:\s|$)/)?.[0]?.trim();
  return (firstSentence || collapsed).slice(0, 320);
}

function normalizeCliProcedures(pixelpitch, body) {
  const authored =
    pixelpitch.cli_procedures ||
    pixelpitch.cliProcedures ||
    pixelpitch.clis ||
    pixelpitch.cli ||
    pixelpitch.tools?.cli;
  const procedures = [];
  const values = Array.isArray(authored) ? authored : authored ? [authored] : [];
  for (const value of values) {
    if (typeof value === "string") {
      const command = value.trim();
      if (command) procedures.push({ command, when: "", customize: "", output: "" });
    } else if (value && typeof value === "object") {
      const command = typeof value.command === "string" ? value.command.trim() : "";
      if (!command) continue;
      procedures.push({
        command,
        when: typeof value.when === "string" ? value.when.trim() : "",
        customize: typeof value.customize === "string" ? value.customize.trim() : "",
        output: typeof value.output === "string" ? value.output.trim() : "",
      });
    }
  }
  if (procedures.length > 0) return procedures.slice(0, 8);
  return inferCliProceduresFromBody(body).slice(0, 8);
}

function inferCliProceduresFromBody(body) {
  const procedures = [];
  const seen = new Set();
  const fenceRe = /```(?:bash|sh|shell|zsh)?\n([\s\S]*?)```/gi;
  for (const match of body.matchAll(fenceRe)) {
    const lines = String(match[1] ?? "").split(/\r?\n/);
    for (const line of lines) {
      const command = line.trim().replace(/^[$>]\s*/, "");
      if (!looksLikeSkillCliCommand(command) || seen.has(command)) continue;
      seen.add(command);
      procedures.push({
        command,
        when: "Run when this skill's procedure calls for its CLI step.",
        customize: "Replace placeholder paths, model ids, prompts, durations, and output names with the current project values before running.",
        output: "Read stdout/stderr and any written project files before continuing.",
      });
    }
  }
  return procedures;
}

function looksLikeSkillCliCommand(command) {
  if (!command || command.startsWith("#")) return false;
  return /^(pixelpitch|od|slidify|\.\/scripts\/|bun\s|npx\s|npm\s|pnpm\s|python\s|python3\s|node\s)/.test(command);
}

function inferMode(body, description) {
  const hay = `${description ?? ""}\n${body ?? ""}`.toLowerCase();
  if (/\bimage|poster|illustration|photography|图片|海报|插画/.test(hay)) return "image";
  if (/\bvideo|motion|shortform|animation|视频|动效|短片/.test(hay)) return "video";
  if (/\baudio|music|jingle|tts|sound|音频|音乐|配音|音效/.test(hay)) return "audio";
  if (/\bppt|deck|slide|presentation|幻灯|投影/.test(hay)) return "deck";
  if (/\bdesign[- ]system|\bdesign\.md|\bdesign tokens/.test(hay))
    return "design-system";
  if (/\btemplate\b/.test(hay)) return "template";
  return "prototype";
}

const KNOWN_SURFACES = new Set(["web", "image", "video", "audio"]);
function normalizeSurface(value, mode) {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (KNOWN_SURFACES.has(v)) return v;
  }
  if (mode === "image" || mode === "video" || mode === "audio") return mode;
  return "web";
}

// Validate platform tag — only desktop / mobile are meaningful for the
// Examples gallery. Falls back to autodetecting "mobile" from descriptions
// so legacy skills sort under the right pill without authoring changes.
function normalizePlatform(value, mode, body, description) {
  if (value === "desktop" || value === "mobile") return value;
  if (mode !== "prototype") return null;
  const hay = `${description ?? ""}\n${body ?? ""}`.toLowerCase();
  if (/mobile|phone|ios|android|手机|移动端/.test(hay)) return "mobile";
  return "desktop";
}

// Normalise a scenario tag to a small fixed vocabulary so the filter pills
// stay tidy. Unknown values pass through verbatim so authors can experiment;
// missing values default to "general".
const KNOWN_SCENARIOS = new Set([
  "general",
  "engineering",
  "product",
  "design",
  "marketing",
  "sales",
  "finance",
  "hr",
  "operations",
  "support",
  "legal",
  "education",
  "personal",
]);
function normalizeScenario(value, body, description) {
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v) return v;
  }
  const hay = `${description ?? ""}\n${body ?? ""}`.toLowerCase();
  if (/finance|invoice|expense|budget|p&l|revenue/.test(hay)) return "finance";
  if (/\bhr\b|onboarding|payroll|employee|人事/.test(hay)) return "hr";
  if (/marketing|campaign|brand|landing/.test(hay)) return "marketing";
  if (/runbook|incident|deploy|engineering|sre|api/.test(hay))
    return "engineering";
  if (/spec|prd|roadmap|product manager|product team/.test(hay))
    return "product";
  if (/design system|moodboard|mockup|ui kit/.test(hay)) return "design";
  if (/sales|quote|proposal|lead/.test(hay)) return "sales";
  if (/operations|ops|logistics|inventory/.test(hay)) return "operations";
  return "general";
}
// Surface the vocabulary so callers (frontend filter UI) could mirror it
// later if they want to. Not exported today, kept here for documentation.
void KNOWN_SCENARIOS;
