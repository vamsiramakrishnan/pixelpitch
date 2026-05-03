# @pixelpitch/hyperframes-types

HyperFrames slide-runtime type contracts: the `HfProtocol` page contract,
the frame data model (timeline elements, keyframes, compositions, variables),
the registry-item schema, and the GSAP/HTML parsers that resolve relative
timing (`data-start="prev + 2"`) into absolute frame indices.

Pixelpitch consumes these so a single HTML artifact can render to PPTX
(via `slidify`) **or** to MP4 (via the upstream HyperFrames engine), with
`window.__hf = { duration, seek, media, transitions }` as the shared
contract.

## Origin

Vendored verbatim from
[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
at commit `4760afd3fcb11274979d5a39c58fda818d76c0d9`.

| Pixelpitch path | Upstream path |
|---|---|
| `src/core.types.ts` | `packages/core/src/core.types.ts` |
| `src/runtime-types.ts` | `packages/core/src/runtime/types.ts` |
| `src/adapter-types.ts` | `packages/core/src/adapters/types.ts` |
| `src/engine-types.ts` | `packages/engine/src/types.ts` |
| `src/html-parser.ts` | `packages/core/src/parsers/htmlParser.ts` |
| `src/gsapParser.ts` | `packages/core/src/parsers/gsapParser.ts` |
| `schemas/registry-item.json` | `packages/core/schemas/registry-item.json` |

The only edit applied is path-relative: import paths in `html-parser.ts` and
`gsapParser.ts` were rewritten from `../core.types` to `./core.types` so the
files resolve in their flattened location.

## License

Apache 2.0 — see [`LICENSE`](./LICENSE) (verbatim from upstream) and
[`NOTICE`](./NOTICE) (upstream `CREDITS.md`).

## Updating

To re-vendor from a newer upstream commit:

1. Update upstream commit SHA in this README.
2. Re-copy each file in the table above.
3. Re-apply the import-path edits (`../core.types` → `./core.types`).
4. Re-run `bun run --filter @pixelpitch/hyperframes-types typecheck`.
