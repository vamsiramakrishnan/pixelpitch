# Open Design 0.7.0 Parity Delta

Source release: <https://github.com/nexu-io/open-design/releases/tag/open-design-v0.7.0>

Fetched locally at `/tmp/open-design-v0.7.0` (`11b4750`, Open Design 0.7.0). Compared against upstream tag `open-design-v0.6.0`.

## Scope Notes

- Keep the existing exclusions from the 0.6.0 pass: Cloudflare Pages/custom domains, Tavily-backed research/search, and Langfuse telemetry.
- Treat upstream as a feature-port source, not a clean merge target. Pixelpitch remains Bun-first and keeps content under `content/*`.
- The 0.7.0 release is much larger than a patch bump: 107 merged PRs since 0.6.0 and 224 runtime/UI files changed in the focused daemon/web/contracts/desktop/tools surface.

## Highest-Value Runtime Gaps

1. Auto-memory store
   - Status: completed for first-pass runtime parity.
   - Upstream adds `packages/contracts/src/api/memory.ts`, daemon `memory.ts`, `memory-llm.ts`, `memory-extractions.ts`, and web Memory settings UI.
   - Pixelpitch now has filesystem-backed memory APIs, heuristic extraction, CLI/API prompt injection, and a compact Settings panel.
   - Remaining upstream delta: background LLM extraction provider override/history.

2. Critique Theater Phase 7 plus Phase 6.2 artifact extraction
   - Status: completed for daemon extraction and Phase 7 state primitives.
   - Upstream adds web reducer/replay/stream hooks under `apps/web/src/components/Theater/*`.
   - Upstream adds daemon artifact extraction/writer/handler modules and exposes critique-tagged artifacts through an endpoint.
   - Pixelpitch now persists SHIP `<ARTIFACT>` bytes under the run artifact directory, exposes `GET /api/projects/:projectId/critique/:runId/artifact`, and has reusable web reducer/SSE/replay hooks.

3. Scheduled routines
   - Status: completed for local-only routines.
   - Upstream adds `packages/contracts/src/api/routines.ts`, daemon `routines.ts`/`routine-routes.ts`, and `RoutinesSection.tsx`.
   - Pixelpitch now stores routines/runs locally, schedules enabled routines in-process, and exposes Settings UI without telemetry wiring.

4. Library install/uninstall
   - Upstream adds `apps/daemon/src/library-install.ts`, `SkillsSection.tsx`, and `DesignSystemsSection.tsx`.
   - This changes how skills/design systems are managed in-app and interacts with the 0.7.0 design-template split.

5. Provider model fetch
   - Status: completed.
   - Upstream adds `packages/contracts/src/api/providerModels.ts`, daemon `providerModels.ts`, web provider-model state, and a fetch-models button.
   - Pixelpitch now supports model discovery for Anthropic/OpenAI/Ollama-compatible providers from Settings.

6. HTTP 206 range requests
   - Status: completed.
   - Upstream added range support for video/audio serving.
   - Pixelpitch raw/file routes now honor `Range: bytes=...` with `206 Partial Content`.

## Highest-Value Web/UI Gaps

1. Designs tab redesign
   - Status: completed for the redesigned tab surface.
   - Cards with covers, tags, overflow menu, and multi-select.
   - Completes the batch-selection direction started in 0.6.0.

2. In-context preview comments
   - Status: partially covered by existing Pixelpitch preview comment targeting/popovers.
   - Upstream adds a comment thread directly in the artifact preview.
   - This overlaps with local preview-comment work, so port carefully instead of copying wholesale.

3. Unified Media tab
   - Consolidates Image/Video/Audio entries into one tab.
   - Requires checking Pixelpitch's current media config/provider state first.

4. Tweaks palette
   - Status: completed for the visible palette picker surface.
   - Upstream adds `PaletteTweaks.tsx` and HSL hue-shift recoloring.
   - Pixelpitch now exposes the curated palette picker in the file viewer; deeper HSL source rewriting remains a follow-up if we want exact upstream recolor behavior.

5. Responsive preview and design handoff outputs
   - Status: partially covered by earlier preview/export controls; exact upstream DESIGN-HANDOFF / DESIGN-MANIFEST output remains follow-up.
   - Upstream updates preview/export logic for tablet/mobile auto-fit and DESIGN-HANDOFF / DESIGN-MANIFEST outputs.
   - This is a good follow-up after manual edit and PDF export because it improves artifact handoff quality.

6. Message feedback and shortcuts
   - Upstream adds thumbs-up/down feedback and `Cmd/Ctrl+,` for Settings.
   - Feedback may touch analytics/telemetry; port only local storage/API-neutral parts unless telemetry scope changes.

## Content Gaps

- New design systems missing from local content:
  - Status: completed.
  - Added `hud`, `loom`, `trading-terminal`, and `wechat`.
- Design-system token infrastructure:
  - Status: completed for local content sync.
  - Upstream adds `_schema`, `default/tokens.css`, `default/components.html`, `kami/tokens.css`, and `kami/components.html`.
  - Added those files while preserving local `DESIGN.md`, `SKILL.md`, previews, and `tokens.json`.
- New skills/design templates worth syncing into `content/skills` or a local `content/design-templates` mapping:
  - Status: completed for the three new skill directories.
  - Added `agent-browser`, `login-flow`, and `release-notes-one-pager`.
- Upstream split many artifact-shape skills from `skills/` into `design-templates/`.
  - Do not move local content blindly; first decide whether Pixelpitch should preserve `content/skills` as the installed-skill surface and add `content/design-templates` as a separate library surface.

## Lower Priority / Deferred

- Analytics and telemetry worker are out of scope unless explicitly enabled for Pixelpitch.
- Background LLM memory extraction is deferred until BYOK credential routing is reviewed.
- Packaging remains deferred: 0.7.0 adds macOS Intel build support, Nix flake, release cache improvements, and Windows reinstall fixes.
- Upstream route split (`chat-routes`, `project-routes`, `media-routes`, `mcp-routes`, `deploy-routes`, etc.) is valuable for maintainability but risky to port before feature parity is stable.

## Suggested Port Order

1. Contracts: memory, routines, provider models, critique artifact status.
2. Daemon: memory store, critique artifact extraction, provider model fetch, routines.
3. Web: Memory settings, Critique Phase 7 reducer/hooks, provider model fetch UI.
4. Web/UI: Designs tab redesign, preview comments, tweaks palette, responsive handoff exports.
5. Content: new non-search skills, new design systems, token schema/components.
6. Runtime hardening: HTTP range requests, artifact stub guard, markdown/prose artifact validation.
7. Packaging and Nix only after runtime parity lands.

## Ported In This Pass

- Provider model discovery for Anthropic/OpenAI/Ollama-compatible BYOK endpoints.
- Filesystem-backed memory store with daemon API, Settings panel, heuristic extraction, and prompt injection for local-agent and API-mode chats.
- Critique artifact extraction/writer/handler, critique artifact HTTP endpoint, shared critique persistence/status contracts, and Phase 7 Theater reducer/SSE/replay hooks.
- Local scheduled routines: contracts, DB persistence, daemon scheduler/routes, and Settings Routines panel.
- Designs tab redesign with live-artifact cards, covers, overflow actions, rename, delete, and multi-select.
- File viewer palette tweaks picker.
- HTTP 206 byte-range support for project raw/file routes.
- Artifact stub regression guard for HTML/deck artifact writes, with `PIXELPITCH_ARTIFACT_STUB_GUARD` env controls.
- New non-search 0.7.0 content: `hud`, `loom`, `trading-terminal`, `wechat`, `agent-browser`, `login-flow`, `release-notes-one-pager`, plus design-system token/schema files.
