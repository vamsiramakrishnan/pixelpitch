# tools/AGENTS.md

Follow the root `AGENTS.md` first. This file only records module-level boundaries for `tools/`.

## Active tools

- `tools/dev` provides `@pixelpitch/tools-dev` and the `tools-dev` bin. It is the only currently active local development lifecycle control plane.
- `bun run dev` manages daemon -> web.
- `node tools/dev/bin/tools-dev.mjs run web` runs foreground daemon + web for the Playwright webServer flow.
- `node tools/dev/bin/tools-dev.mjs inspect desktop ...` inspects the desktop runtime through sidecar IPC.
- `tools/pack` provides `@pixelpitch/tools-pack` and the `tools-pack` bin. The active slice is packaged artifact build/install/start/stop/logs/uninstall/cleanup/list/reset plus beta release artifact preparation for mac and Windows lanes.

## Packaging scope

- Keep `tools-pack` focused on packaging/runtime control and release artifact preparation. Runtime updater product integration remains a later phase.
- Pack-specific Electron builder resources belong under `tools/pack/resources/`; do not reference app/docs/download assets directly from pack logic.
- Namespace controls packaged data/log/runtime/cache paths. Ports are transient transport details and must not participate in path decisions.
- The package/build boundary is Bun-first: root `bun run build` and `tools-pack` both use `bun run --filter ...`.

## Orchestration boundary

- Orchestration layers must consume primitives from `@pixelpitch/sidecar-proto`, `@pixelpitch/sidecar`, and `@pixelpitch/platform`.
- Do not hand-build `--od-stamp-*` args, process-scan regexes, runtime tokens, process roles, or duplicate namespace/source args in `tools/dev`, future `tools/pack`, or packaged launchers.
- Port flags are authoritative inputs: `--daemon-port` and `--web-port`. Internal env vars are `PIXELPITCH_PORT` and `PIXELPITCH_WEB_PORT`; do not introduce `NEXT_PORT`.

## Common tools commands

```bash
bun run --filter @pixelpitch/tools-dev typecheck
bun run --filter @pixelpitch/tools-dev build
bun run --filter @pixelpitch/tools-pack typecheck
bun run --filter @pixelpitch/tools-pack build
node tools/dev/bin/tools-dev.mjs status --json
node tools/dev/bin/tools-dev.mjs logs --json
node tools/pack/bin/tools-pack.mjs mac build --to all
node tools/pack/bin/tools-pack.mjs mac install
node tools/pack/bin/tools-pack.mjs mac cleanup
node tools/pack/bin/tools-pack.mjs win build --to nsis
node tools/pack/bin/tools-pack.mjs win install
node tools/pack/bin/tools-pack.mjs win inspect --expr "document.title"
node tools/pack/bin/tools-pack.mjs win cleanup
```
