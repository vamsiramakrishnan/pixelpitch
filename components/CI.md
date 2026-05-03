# `@slidify/components` — CI commands

Wave-2B-v2 / M5 ships three CI gates that lock renderer ↔ matcher consistency
and catch treatment-masquerading-as-primitive failures. There is no
`.github/workflows/` in this repo today; when one is added, it MUST run the
commands below in the order shown. Each command is also runnable locally.

## Pre-requisites

- `components/`: `npm install` (vitest, js-yaml, tsx, react, zod).
- Repo root: `uv sync` (the matcher CLI runs under `uv run python`).

## Gate 1 — Codegen drift (M2)

```bash
cd components
npm run codegen-atoms-check
```

Fails if `atoms.yaml` was edited without re-running `npm run codegen-atoms`.
Guards against: someone hand-edits a generated TSX, or adds a new atom row
without regenerating the recipes barrel + lock file.

## Gate 2 — Contract tests (M5.1 + M5.2)

```bash
cd components
npx vitest run src/__tests__/contract/
```

Two halves:

- **`atom-recognition.test.ts`** — for every atoms.yaml row with both a
  `renderer:` and `fixture:` block, pipes `fixture.sample_html` through
  `uv run python -m slidify.patterns --classify-batch` and asserts the
  matcher recovers `fixture.expected_recipe_id`.

  Failure means the matcher's `data-atom` author-hint plumbing broke OR
  someone desynced `expected_recipe_id` from `match.anchor.data_atom_id`.

- **`atom-emit.test.ts`** — for every Tier-B recipe in `src/recipes/`,
  calls the named `*ToIR` export with synthesized props and snapshots
  the resulting IR JSON to `__snapshots__/<atom-id>.ir.snap`.

  Failure means an unintended IR drift. Update via `npx vitest -u
  src/__tests__/contract/atom-emit.test.ts` after reviewing the diff.

- **`_helpers.test.ts`** — unit tests for the manifest loader, props
  synthesizer, and native-area-ratio walker that the other two tests
  consume.

## Gate 3 — Theme preset matrix (M5.3)

```bash
cd components
npx vitest run src/__tests__/preset-matrix/
```

Cartesian product: every Tier-B recipe × 7 theme presets (5 baseline +
2 stress). For each cell:

1. Synthesizes plausible props.
2. Calls `<recipe>ToIR(props, tokens)` with the preset's tokens.
3. Walks the IR and computes `native_area_ratio` (excluding
   `chrome.escape-hatch` and any `excludeFromNativeRatio`-flagged
   raster — CONTRACT-v2 §9.5).
4. Snapshots `{ recipe, preset, native_ratio, total_nodes,
   raster_nodes, status }` to `__snapshots__/<atom-id>/<preset>.summary.snap`.
5. Strict-asserts `native_area_ratio ≥ 0.97` only for recipes in the
   `STRICT_GATE_ALLOWLIST` (currently 11 rich-IR recipes; the rest are
   in observe-only mode pending M3.5 primitive expansion).

Failure means a recipe's IR drifted, or a previously-allowlisted
recipe regressed below the 0.97 threshold in some preset.

## Suggested GitHub Actions workflow

```yaml
# .github/workflows/components-ci.yml
name: components-ci

on:
  pull_request:
    paths:
      - 'components/**'
      - 'slidify/patterns/data/atoms.yaml'
      - 'slidify/patterns/matcher.py'
      - 'slidify/patterns/__main__.py'

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: components/package-lock.json
      - uses: astral-sh/setup-uv@v3
      - run: uv sync
      - run: cd components && npm ci
      - name: Codegen drift gate
        run: cd components && npm run codegen-atoms-check
      - name: Contract tests (recognition + emit + helpers)
        run: cd components && npx vitest run src/__tests__/contract/
      - name: Preset matrix gate
        run: cd components && npx vitest run src/__tests__/preset-matrix/
```

## Local quickstart

```bash
# From repo root:
uv sync && (cd components && npm install)

# Run everything (matches CI):
cd components
npm run codegen-atoms-check
npx vitest run src/__tests__/contract/ src/__tests__/preset-matrix/
```

## Updating snapshots

When intentional IR / token / primitive changes land:

```bash
cd components
npx vitest -u src/__tests__/contract/atom-emit.test.ts
npx vitest -u src/__tests__/preset-matrix/matrix.test.ts
```

Review the diffs in your PR; CI re-runs and asserts against the new
snapshots. The atom-recognition test does not use snapshots — it
re-derives the expected id from atoms.yaml on every run.
