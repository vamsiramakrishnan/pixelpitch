# Pixelpitch Packaging

Pixelpitch packaging is Bun-first.

## One-command setup

From a fresh checkout:

```bash
./setup.sh
```

That script installs Bun into `~/.bun` when it is missing, updates the current
process `PATH`, runs the root Bun workspace install, builds the workspace
dependency chain, mirrors skills, and optionally creates the Python/Slidify
environment when `uv` is available.

## Package-manager contract

- `bun.lock` at the repository root is the only JavaScript lockfile.
- Run dependency installs from the repository root only.
- Use `bun install` for local dependency refreshes.
- Use `bun ci` in CI and release jobs.
- Do not use `npm install`, `pnpm install`, or `yarn install` in package
  directories.

## Desktop artifacts

The packaging control plane is `@pixelpitch/tools-pack`:

```bash
bun run pack:mac
bun run pack:win
```

Direct commands are also supported:

```bash
bun run --filter @pixelpitch/tools-pack build
node tools/pack/bin/tools-pack.mjs mac build --to all
node tools/pack/bin/tools-pack.mjs win build --to nsis
```

`tools-pack` uses Bun for all JavaScript packaging work:

- workspace build steps use `bun run --filter ... build`
- internal package tarballs use `bun pm pack`
- assembled app production dependencies use
  `bun install --production --no-save --backend=copyfile`

## Runtime boundaries

Bun owns JavaScript dependency resolution, workspace scripts, and desktop
packaging orchestration. Node remains the runtime bundled into the packaged app.
`uv` remains scoped to the Python/Slidify engine used for PPTX export.
