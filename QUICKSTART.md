# Pixelpitch Quickstart

Five minutes from `git clone` to a designer-grade slide deck rendered in
your browser, exported to PPTX.

## TL;DR

```bash
./setup.sh
bun run dev
```

`setup.sh` installs Bun into `~/.bun` when needed, runs the root Bun workspace
install, builds the dependency chain, and mirrors bundled skills. Then
`bun run dev` starts the daemon + web app and prints the URL.

That's it. Pick a skill in the UI, type a brief, watch the deck stream
into the sandboxed iframe preview. When you're happy, hit "Export" → PPTX
(slidify does the conversion under the hood).

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Bun** | `>=1.1` | Workspace + JS runtime. Installed automatically by `./setup.sh` when missing. |
| **Node** | `>=22` | Some build steps shell to Node. Comes from your package manager (or `nvm install 22`). |
| **git** | any | obvious |
| **uv** *(optional)* | any | Bootstraps slidify (the Python HTML→PPTX converter). Install: `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **At least one code-agent CLI** *(optional)* | latest | `claude` / `codex` / `gemini` / `cursor-agent` / `copilot` / `devin` / `opencode` / `qwen` / `hermes` / `kimi` / `pi` / `kiro` / `mistral`. The daemon detects whichever you have on PATH. Without one, use BYOK API mode in Settings. |

Verify with `bun run doctor`.

## What `bun run dev` does

1. Builds the workspace dependency chain (`@pixelpitch/platform` →
   `@pixelpitch/sidecar-proto` → `@pixelpitch/sidecar` →
   `@pixelpitch/tools-dev` → `@pixelpitch/daemon`).
2. Starts the daemon on `127.0.0.1:17456` (PATH-scans your installed
   agent CLIs, exposes `/api/*`, persists projects under
   `~/.pixelpitch/app.sqlite`).
3. Starts the Next.js web app on `http://localhost:3000` (chat, sandboxed
   iframe preview, design-system browser, exports).
4. Opens the URL in your browser.

Stop everything: `bun run stop`. Tail logs: `bun run logs`.

## Building a designer-grade deck (the 6-step pipeline)

This is what an agent does on your behalf when you send a brief in the UI:

### 1. Design language

Discovery prompt + 5-school direction picker
(`apps/daemon/src/prompts/discovery.ts`,
`apps/daemon/src/prompts/directions.ts`). Five curated directions ship
out-of-the-box: **Editorial Monocle**, **Modern Minimal**, **Warm Soft**,
**Tech Utility**, **Brutalist Experimental** — each with a deterministic
OKLch palette and font stack.

### 2. Components / design system

Pick from 138 design systems in `design-systems/`, or drop your own
`DESIGN.md` into the project. The resolver
(`apps/daemon/src/design-systems.ts`) parses the awesome-claude-design
9-section schema and threads tokens into every prompt.

### 3. Narrative

The chosen deck skill drafts the slide arc. Available skills:

| Skill | Best for |
|---|---|
| `simple-deck` | Generic horizontal-swipe deck |
| `replit-deck` | 8 polished themes (helix / holm / vance / bevel / world-dark / world-mint / atlas / bluehouse) |
| `guizang-ppt` | Magazine-style with WebGL hero |
| `weekly-update` | 6-8 slide team status |
| `html-ppt-pitch-deck` | 10-slide investor deck |
| `html-ppt-tech-sharing` | Conference / engineering talk |
| `html-ppt-product-launch` | Launch keynote |
| `html-ppt-course-module` | Teaching / workshop |
| `html-ppt-presenter-mode-reveal` | Reveal.js with speaker notes |
| `html-ppt-taste-editorial` | Editorial-minimalist 16:9 |
| `html-ppt-taste-brutalist` | CRT-terminal aesthetic |
| `html-ppt-xhs-post` | 9-page 3:4 vertical (Instagram / 小红书) |
| `motion-frames` | Animated CSS hero frame |
| `hyperframes` | Full HyperFrames timeline (animated → MP4 capable) |

### 4. Slide design

The skill copies `templates/deck-framework.html` (the bulletproof 1280×720
centering scaffold) and lays out each slide. The agent edits CSS variables
in the seed `<style>` block — no inline rewrites per slide.

For maximum slidify editability, also reference
`.claude/skills/slide-author/SKILL.md` (atomic-seed grammar: 10 axes ×
atoms × typographic registers).

### 5. Deck composition / preview

Each slide streams as an `<artifact>` block parsed by
`apps/web/src/artifacts/parser.ts`, rendered in a sandboxed iframe via
`apps/web/src/runtime/srcdoc.ts` (vendored React 18 + Babel). Tweak tokens
in the live "Tweaks" panel — `apps/web/src/runtime/tweaks-bridge.ts`
patches them in without remount (sub-50 ms).

### 6. Export to PPTX

Hit Export → PPTX. The web app shells out to slidify:

```bash
slidify convert <input.html> <output.pptx> --json
```

Slidify produces maximally-editable PPTX (text frames, shapes, lines,
SVG-derived geometry as native shapes; raster only where PPTX can't model
the effect). The single optimized metric is `native_area_ratio` subject to
SSIM ≥ 0.95 / OCR recall ≥ 0.98 floors.

For HyperFrames-shaped HTML (with `window.__hf = { duration, seek, media,
transitions }`), slidify natively-emits frame `t=0`; the same artifact is
also renderable to MP4 by the upstream HyperFrames engine.

## Standalone slidify (without the web app)

If you already have slide HTML and just want a PPTX:

```bash
# install slidify into a venv (one-time)
./setup.sh   # if you have uv
# or:
make sync && make playwright

# convert
.venv/bin/slidify deck.html out.pptx --json
.venv/bin/slidify check deck.html      # editability + fidelity audit
.venv/bin/slidify guide                # in-tree long-form authoring guides
```

## Common commands

| Command | Does |
|---|---|
| `./setup.sh` | Install Bun if needed, install deps, build chain, mirror skills |
| `bash tools/bootstrap.sh` | Same setup entrypoint without the root wrapper |
| `bun run bootstrap` | Re-run setup after Bun is already installed |
| `bun run dev` / `make up` | Start daemon + web, watch for changes |
| `bun run stop` | Stop daemon + web |
| `bun run status` / `bun run logs` | Inspect the running processes |
| `bun run doctor` / `make doctor` | Environment health check |
| `bun run typecheck` | TypeScript across all workspaces |
| `bun run test` | Tests across all workspaces |
| `bun run skills:sync` | Re-mirror `skills/` → `.claude/skills/` + `.gemini/skills/` |
| `bun run skills:verify` | Verify the mirrors are in sync |
| `make bench-render DECK=product-pitch` | Slidify benchmark deck |
| `slidify guide` | Slidify's own in-tree authoring guides |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `bun: command not found` | `./setup.sh` |
| `Port 17456 already in use` | Another pixelpitch (or OD) is running. `bun run stop` or `lsof -iTCP:17456 -sTCP:LISTEN`. |
| Web UI is blank | Run `bun run dev` (it builds + starts both). If you only ran `bun install`, the workspace dep chain isn't built yet. |
| Daemon refuses to start: "no agents detected" | Install at least one of: `claude` / `codex` / `gemini` / etc. Or use BYOK API mode in Settings. |
| `slidify: command not found` | `./setup.sh` (needs `uv`), or `make sync` directly. |
| PPTX export fails with `editability_drift` | Slidify exit code 3 — open `out.pptx.report.json` and check `oracle.fidelity_report` for the failing region. Use `slidify check deck.html` to debug. |
| `bun install` complains about workspaces | Ensure you're on Bun `>=1.1`: `bun --version`. |
| Skills mismatch between `.claude/` and `.gemini/` | `bun run skills:sync` |

## What's where

```
apps/web/                 Next.js web app (chat, preview, exports)
apps/daemon/              Express daemon (agents, projects, persistence)
apps/desktop/             Optional Electron sidecar (E2E only)
apps/packaged/            Single-binary packaged entry
packages/                 Shared TS packages
  contracts/              web ↔ daemon types
  platform/               cross-platform spawn
  sidecar/                vendored React 18 + Babel runtime
  sidecar-proto/          IPC protocol types
  hyperframes-types/      HyperFrames slide-runtime contracts
skills/                   59 bundled skills (slide-author, deck variants, prototypes, ...)
templates/                deck-framework.html (every deck skill copies this)
craft/                    anti-AI-slop, color, typography reference
design-systems/           138 awesome-claude-design entries
prompt-templates/         Image / video / audio generation prompts
assets/frames/            Device chrome HTML (iphone, ipad, macbook, browser)
docs/                     Architecture, skills protocol, agent adapters, modes
slidify/                  Python HTML→PPTX converter (the export backend)
components/               @slidify/components — multi-target React components
_bench/                   Slidify benchmark corpus + harvest reports
tools/                    Dev runner, packager, rename script, sync scripts
```

Full attribution: [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
Architecture deep-dive: [`docs/architecture.md`](docs/architecture.md).
