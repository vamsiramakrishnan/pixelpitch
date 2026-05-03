# @slidify/components

Multi-target slide component library. Each component renders to HTML for
browser preview AND emits a typed IR node consumed by slidify's Python
backend (and, eventually, PDF / Google Slides / Keynote / Figma backends).

## Why this exists

The Python `slidify` converter renders arbitrary HTML and classifies regions
as native vs raster. It works, but it's a heuristic translator.

This package is the *generator-side* counterpart: a closed component
vocabulary that LLMs (v0, Cursor, Lovable, Anthropic SDK) can emit JSX over.
Every component has a known IR emit. The converter becomes a deterministic
compiler. **Native ratio is 100% by construction.**

```
                       ┌─→ HTML  backend  (browser preview)
                       ├─→ PPTX  backend  (slidify.compile_ir)
LLM → JSX → IR ────────┼─→ PDF   backend  (planned)
                       ├─→ Google Slides API
                       └─→ Keynote XML
```

## IR schema

The wire format. See `src/ir/schema.ts` for the full zod schema. Mirrored in
Python at `slidify/ir.py`.

## Components shipped (v0.1)

| Component | toIR helper       | Recipe |
| --------- | ----------------- | ------ |
| `<Slide>` | `buildSlide`      | (slide root) |
| `<Title>` | `titleToIR`       | `title` |
| `<Kicker>`| `kickerToIR`      | `kicker` |
| `<Footer>`| `footerToIR`      | `footer` |
| `<Pill>`  | `pillToIR`        | `pill` |

## Roundtrip

Every emitted shape carries a `slidify:recipeId` extension entry in the
PPTX. The reverse path (`slidify.import_pptx`, planned) reads these back to
reconstitute the IR — meaning edits in PowerPoint flow back to JSX.

## Build

```bash
npm install
npm run build         # tsup → dist/
npm run typecheck
npm run ir-emit       # smoke test: writes a hero deck IR JSON to stdout
```

## Smoke test (end-to-end)

```bash
npx tsx scripts/ir-emit.ts > /tmp/hero.deck.json
cd ..
uv run python -c "from slidify.compile_ir import compile_ir_file; compile_ir_file('/tmp/hero.deck.json', '/tmp/hero.pptx')"
```

Open `/tmp/hero.pptx` — every shape is editable in PowerPoint.
