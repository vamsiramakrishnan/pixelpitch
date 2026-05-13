# Open Design 0.6.0 Parity Delta

Source release: <https://github.com/nexu-io/open-design/releases/tag/open-design-v0.6.0>

Compared locally against fetched tag `upstream-open-design-v0.6.0` (`68fb4d7`, Open Design 0.6.0) from current Pixelpitch branch `feature/slidify-opendesign-main` at `09f346c`.

## Current Shape

- Histories do not share a local merge base, so treat this as a feature-port, not a clean merge.
- Pixelpitch is Bun-first and branded around `pixelpitch`; upstream 0.6.0 is pnpm-first and branded around `open-design`.
- Pixelpitch keeps artifact content under `content/skills` and `content/design-systems`; upstream 0.6.0 uses top-level `skills`, `design-systems`, `craft`, `prompt-templates`, and `assets`.
- Local worktree is dirty. Do not start parity work by resetting or wholesale replacing files.

## Explicitly Out Of Scope

- Cloudflare Pages deployment and custom domains.
- Tavily-backed research/search, including the `od research search` command and `/api/research/search`.
- Langfuse telemetry.

Keep these out of the parity build unless the scope changes. Existing Pixelpitch Cloud Run deploy behavior can stay as-is while the rest of 0.6.0 is ported.

## P0 Product Parity Gaps

1. External MCP client and OAuth
   - Status: MCP client configuration foundation completed in Pixelpitch.
   - Ported locally:
     - `apps/daemon/src/mcp-config.ts`
     - `apps/daemon/src/mcp-install-info.ts`
     - `apps/web/src/components/McpClientSection.tsx`
     - `apps/web/src/state/mcp.ts`
     - `packages/contracts/src/api/mcp.ts`
   - Caveat: OAuth route shape is present, but provider token exchange/persistence is still a guarded stub. The current UI surfaces that daemon response instead of pretending OAuth is complete.

2. Direct desktop PDF export
   - Status: completed in Pixelpitch.
   - Ported locally:
     - `apps/daemon/src/pdf-export.ts`
     - `apps/desktop/src/main/pdf-export.ts`
     - daemon route `POST /api/projects/:id/export/pdf`
   - Web now calls the daemon/desktop export route and falls back to browser export when the desktop sidecar is unavailable.

3. Orbit activity summaries
   - Status: completed in Pixelpitch at daemon/API level with compact Settings UI.
   - Ported locally:
     - `apps/daemon/src/orbit.ts`
     - `packages/contracts/src/api/orbit.ts`
   - Added `/api/orbit/status`, `/api/orbit/run`, app-config scheduling fields, and a Settings panel for enable/time/template/manual run.

4. Critique Theater Phase 6.1
   - Status: daemon interrupt surface completed in Pixelpitch.
   - Local has substantial critique support already.
   - Upstream-specific modules now ported:
     - `apps/daemon/src/critique/interrupt-handler.ts`
     - `apps/daemon/src/critique/run-registry.ts`
   - Remaining cleanup: move/export `CritiqueRoundSummary` and `CritiqueRunStatus` through `@pixelpitch/contracts` instead of keeping them daemon-private.

## P1 Platform And Runtime Gaps

- BYOK Ollama Cloud:
  - Status: completed in Pixelpitch.
  - Pixelpitch now has `apiProtocol: ollama`, `/api/proxy/ollama/stream`, `providers/ollama-compatible.ts`, and Settings UI wiring.
- Connection testing:
  - Status: provider/API-mode route and UI test wiring completed in Pixelpitch.
  - Pixelpitch now has shared connection-test contracts and `/api/execution/test` supports Anthropic/OpenAI/Ollama provider checks.
- Local-folder import and linked directories:
  - Status: completed in Pixelpitch.
  - Added folder import, linked-dir validation, project file resolution against imported folders, and project file-change SSE watcher support.
- Agent adapter parity:
  - Status: completed for runtime parity.
  - Added platform command invocation for probes, configured executable/env overrides, Codex `--add-dir`/sandbox/model/reasoning updates, and Qoder adapter + stream parser.

## P1 Web/UI Gaps

- Top bar redesign: Share/Present in the top bar, zoom dropdown, focus toggle.
- Draggable file tabs, batch delete, sortable design-file table columns.
- Manual edit panel and edit-mode bridge:
  - Missing `apps/web/src/components/ManualEditPanel.tsx`
  - Missing `apps/web/src/edit-mode/*`
- MCP client browser:
  - Status: MCP client section added.
  - `ConnectorsBrowser.tsx` remains out of this pass because Cloudflare/Tavily/Langfuse-related connector catalog work is out of scope.
- Quick switcher:
  - Missing `apps/web/src/components/QuickSwitcher.tsx`
  - Missing `apps/web/src/quickSwitcherRecents.ts`
- Privacy consent:
  - Missing `apps/web/src/components/PrivacyConsentModal.tsx`
  - Missing `apps/web/src/components/PrivacySection.tsx`
- i18n parity:
  - Status: completed.
  - Added `id`, `th`, `tr`, `uk`, plus `content.fr.ts` and `content.ru.ts`.
  - Note: the new UI locale registrations currently use the local English dictionary as an exact-key fallback because upstream translations target a larger UI dictionary that includes out-of-scope connector/deploy strings.

## P1 Skills, Templates, Design Systems, Craft

- Status: completed for non-search content.
- `content/skills` now contains all upstream v0.6.0 skill directories except `x-research`, which remains intentionally excluded with Tavily/search.
- `content/design-systems` now includes the upstream v0.6.0 design-system directories missing locally.
- `content/craft` now includes the upstream v0.6.0 craft rules while preserving Pixelpitch-specific `slidify-compat.md`.

## P2 Packaging, Docs, And Release Infrastructure

- Upstream `tools/pack` is heavily refactored:
  - split mac/win implementations into subdirectories
  - adds Linux package support
  - adds source-hash caching and lock/cache helpers
  - adds many tests under `tools/pack/tests`
- Upstream adds `apps/landing-page`.
- Upstream adds Docker/Vercel/release assets and several docs/test directories not present locally.
- Root runtime baseline differs:
  - Upstream: Node `~24`, pnpm `>=10.33.2 <11`, packageManager pinned.
  - Local: Bun `>=1.1`, Node `>=22`, custom workspaces in root `package.json`.
  - Preserve Pixelpitch's Bun-first workflow unless intentionally switching package managers.

## Suggested Build Order

1. Contracts first:
   - add `api/mcp.ts`, `api/orbit.ts`, `api/connectionTest.ts`, and missing PDF export fields.
   - move critique run summary/status types into contracts.
2. Daemon service layer:
   - port PDF export, Orbit, MCP OAuth/client, connection tests, Ollama proxy support, and local-folder/link watcher support.
   - adapt env/path names from `OD_*` to `PIXELPITCH_*`.
3. Web integration:
   - wire settings/privacy/MCP/PDF/Orbit/Ollama UI.
   - port top bar redesign after API surfaces compile.
4. Content layer:
   - decide whether to adopt upstream top-level `skills`, `design-systems`, `craft`, `prompt-templates`, `assets` layout or map them into existing `content/*` conventions.
   - sync the missing skills/design systems/craft rules.
5. Packaging:
   - port `tools/pack` refactor only after runtime APIs are stable.
6. Validation:
   - run `bun run --filter @pixelpitch/contracts typecheck`
   - run `bun run --filter @pixelpitch/daemon test`
   - run `bun run --filter @pixelpitch/web typecheck`
   - run root `bun run typecheck` and `bun run test`
   - add targeted route tests for MCP OAuth, PDF export, connection testing, Ollama proxying, and Orbit.
