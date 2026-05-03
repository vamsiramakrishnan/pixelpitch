# Third-Party Notices

Pixelpitch incorporates code from the following open-source projects.
Each entry below names the upstream repo, its license, the location of
the code in this repository, and the upstream commit at copy time.

---

## Open Design (`nexu-io/open-design`) — Apache License 2.0

Pixelpitch's web UI, local daemon, agent-detection layer, streaming
protocols, sandboxed-iframe preview, exporters, skill registry, design-
system resolver, design-language prompts, and bundled skill catalog were
copied and renamed from Open Design.

**Locations:**

- `apps/web/` — Next.js 16 web app (renamed `@pixelpitch/web`).
- `apps/daemon/` — Express + Node daemon (renamed `@pixelpitch/daemon`,
  default port `17456`).
- `apps/desktop/` — Electron sidecar (renamed).
- `apps/packaged/` — packaged-binary entry (renamed).
- `packages/contracts/`, `packages/platform/`, `packages/sidecar/`,
  `packages/sidecar-proto/` — shared TypeScript packages
  (renamed `@pixelpitch/*`).
- `skills/` — bundled skill catalog (60+ skills).
- `prompt-templates/` — image / video / audio generation prompts.
- `design-systems/` — 138 awesome-claude-design entries.
- `e2e/` — Playwright end-to-end test harness.
- `tools/dev/`, `tools/pack/` — workspace build helpers.
- `scripts/` — postinstall and maintenance scripts.

**Upstream:** https://github.com/nexu-io/open-design  
**License:** Apache 2.0 — see [`apps/AGENTS.md`](apps/AGENTS.md) and
upstream `LICENSE`.  
**Upstream commit at copy time:** `3c954ad2b322e81a37e694d4b210f73742798538`
(2026-05-03).

The code was renamed to pixelpitch conventions
(`@open-design/*` → `@pixelpitch/*`, `~/.od/` → `~/.pixelpitch/`, port
`7456` → `17456`, etc.) by `tools/rename-od-to-pixelpitch.sh`. The script
is checked in for auditability.

---

## HyperFrames (`heygen-com/hyperframes`) — Apache License 2.0

Slide-runtime type contracts (`HfProtocol`, frame data model, registry
schema, GSAP/HTML parsers).

**Locations:**

- `packages/hyperframes-types/` — type definitions and schemas.

**Upstream:** https://github.com/heygen-com/hyperframes  
**License:** Apache 2.0 — see
[`packages/hyperframes-types/LICENSE`](packages/hyperframes-types/LICENSE)
and [`packages/hyperframes-types/NOTICE`](packages/hyperframes-types/NOTICE).  
**Upstream commit at copy time:** `4760afd3fcb11274979d5a39c58fda818d76c0d9`.

The only edit applied was rewriting `../core.types` import paths to
`./core.types` to fit the flattened layout.

---

## guizang-ppt-skill (`op7418/guizang-ppt-skill`) — MIT License

Magazine-style deck templates with WebGL hero canvases, P0/P1/P2/P3
quality checklist, and 10-layout typology.

**Locations:**

- `skills/guizang-ppt/` — vendored along the chain
  upstream → Open Design → pixelpitch.

**Upstream:** https://github.com/op7418/guizang-ppt-skill  
**License:** MIT — see `skills/guizang-ppt/LICENSE` (preserved verbatim).  
**Author:** op7418 (歸藏).

---

## Inspiration without code copy

These projects shaped the design and prompts via Open Design's
synthesis. No source text was vendored from them into pixelpitch.

- `OpenCoworkAI/open-codesign` (MIT) — streaming-artifact loop,
  sandboxed-iframe preview, exporters. Synthesized into Open Design.
- `multica-ai/multica` (Modified Apache 2.0) — daemon shape, PATH-scan
  agent detection, two-phase cancellation. Synthesized into Open Design.
- `alchaincyf/huashu-design` (personal-use license) — design-philosophy
  prompts, brand-spec template, anti-AI-slop checklist, 5-dim self-
  critique, "5 schools × 20 designers" direction picker. Patterns
  paraphrased into Open Design's `apps/daemon/src/prompts/discovery.ts`
  and `directions.ts`. No source text vendored here.
