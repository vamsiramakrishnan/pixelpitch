/**
 * Unit tests for `scripts/codegen-atoms.ts` (CONTRACT-v2 §C / §M2).
 *
 * Covers:
 *  - atoms.yaml loads and parses cleanly
 *  - one TSX per Tier-B atom is emitted
 *  - Tier-A atoms are skipped (and verified to exist as primitive files)
 *  - composite atoms produce one child per `composes:` entry
 *  - lock file content matches generated output
 *  - drift detection: artificially mutate a generated file → `--check` fails
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  build,
  checkDrift,
  loadManifest,
  PRIMITIVE_MAP,
  RECIPES_DIR,
  LOCK_FILE,
  SCHEMA_FILE,
  ATOMS_YAML,
  type AtomRow,
} from '../codegen-atoms';

const __filename = fileURLToPath(import.meta.url);
const TESTS_DIR = dirname(__filename);
const COMPONENTS_DIR = resolve(TESTS_DIR, '..', '..');
const PRIMITIVES_DIR = join(COMPONENTS_DIR, 'src', 'primitives');

describe('codegen-atoms: manifest loader', () => {
  it('atoms.yaml exists and parses without error', () => {
    expect(existsSync(ATOMS_YAML)).toBe(true);
    const m = loadManifest();
    expect(m.rows.length).toBeGreaterThan(100);
    expect(m.sha).toMatch(/^[0-9a-f]{64}$/);
  });

  it('every row has a stable id', () => {
    const m = loadManifest();
    const ids = new Set<string>();
    for (const row of m.rows) {
      expect(typeof row.id).toBe('string');
      expect(ids.has(row.id), `duplicate row id: ${row.id}`).toBe(false);
      ids.add(row.id);
    }
  });
});

describe('codegen-atoms: build()', () => {
  const result = build();

  it('emits one TSX per Tier-B atom row', () => {
    const tierBRows = result.rows.filter(r => r.renderer?.tier === 'B');
    expect(result.recipes.length).toBe(tierBRows.length);
  });

  it('skips Tier-A atoms (does not emit a recipe TSX)', () => {
    const tierARows = result.rows.filter(r => r.renderer?.tier === 'A');
    for (const row of tierARows) {
      const comp = row.renderer!.component;
      expect(result.recipes.find(r => r.component === comp)).toBeUndefined();
    }
    expect(tierARows.length).toBeGreaterThan(0);    // sanity: at least one Tier-A in the manifest
  });

  it('verifies every Tier-A atom maps to an existing primitive file', () => {
    const tierARows = result.rows.filter(r => r.renderer?.tier === 'A');
    for (const row of tierARows) {
      const aid = row.match?.['anchor.data_atom_id'];
      const id = typeof aid === 'string' ? aid : Array.isArray(aid) ? aid[0] : undefined;
      if (!id) continue;
      const prim = PRIMITIVE_MAP[id];
      if (!prim) continue;       // not in PRIMITIVE_MAP — skipped (warned in build())
      const file = join(PRIMITIVES_DIR, `${prim.file}.tsx`);
      expect(existsSync(file), `primitive file missing: ${file}`).toBe(true);
    }
  });

  it('emits a recipes/index.ts barrel re-exporting every recipe', () => {
    const indexBody = result.files.get(join(RECIPES_DIR, 'index.ts'));
    expect(indexBody).toBeDefined();
    for (const r of result.recipes) {
      expect(indexBody, `${r.component} not re-exported`).toContain(`from './${r.component}'`);
      expect(indexBody, `${r.component}Props not exported`).toContain(`${r.component}Props`);
      expect(indexBody, `${r.irHelper} not exported`).toContain(r.irHelper);
    }
  });

  it('every generated TSX stamps recipeId equal to the user-facing atom id', () => {
    for (const recipe of result.recipes) {
      const path = join(RECIPES_DIR, `${recipe.component}.tsx`);
      const body = result.files.get(path);
      expect(body, `missing body for ${recipe.component}`).toBeDefined();
      expect(body).toContain(`recipeId: '${recipe.atomId}'`);
    }
  });

  it('every generated TSX carries the AUTO-GENERATED header', () => {
    for (const recipe of result.recipes) {
      const path = join(RECIPES_DIR, `${recipe.component}.tsx`);
      const body = result.files.get(path)!;
      expect(body.startsWith('// AUTO-GENERATED')).toBe(true);
    }
  });

  it('emits an atoms.lock.json whose content matches the generated set', () => {
    expect(result.lock.lockVersion).toBe(1);
    expect(result.lock.atomsYamlSha256).toBe(result.yamlSha);
    expect(result.lock.generatedRecipes).toBe(result.recipes.length);
    expect(result.lock.atoms.length).toBeGreaterThanOrEqual(result.recipes.length);
    // Each generated recipe appears in the lock atom list.
    for (const recipe of result.recipes) {
      const stamp = result.lock.atoms.find(a => a.atomId === recipe.atomId);
      expect(stamp, `lock missing atom ${recipe.atomId}`).toBeDefined();
      expect(stamp!.component).toBe(recipe.component);
      expect(stamp!.tier).toBe('B');
      expect(stamp!.version).toBe(recipe.version);
    }
  });

  it('emits an atoms.schema.json with one $defs entry per Tier-B atom', () => {
    expect(result.schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    const definitions = result.schema.definitions as Record<string, unknown>;
    for (const recipe of result.recipes) {
      expect(definitions[recipe.atomId], `schema missing ${recipe.atomId}`).toBeDefined();
    }
    expect(Array.isArray(result.schema.oneOf)).toBe(true);
  });
});

describe('codegen-atoms: composite atoms', () => {
  const result = build();

  function findRow(rowId: string): AtomRow | undefined {
    return result.rows.find(r => r.id === rowId);
  }

  it('every composite produces one child line per composes entry', () => {
    const composites = result.recipes.filter(r => r.composite);
    expect(composites.length).toBeGreaterThan(0);     // sanity

    for (const recipe of composites) {
      const row = findRow(recipe.rowId);
      expect(row).toBeDefined();
      const composes = row!.renderer!.composes ?? [];
      const path = join(RECIPES_DIR, `${recipe.component}.tsx`);
      const body = result.files.get(path)!;
      // Count `zOrder: N` markers inside the children: [...] block to verify
      // one child per composed entry. Slice from `children: [` to the closing
      // `]` so the parent group's `zOrder: 0` (above) isn't counted.
      const childrenStart = body.indexOf('children: [');
      expect(childrenStart, `${recipe.component} missing children block`).toBeGreaterThan(-1);
      const childrenSlice = body.slice(childrenStart);
      const childMatches = childrenSlice.match(/zOrder: \d+/g) ?? [];
      expect(childMatches.length).toBeGreaterThanOrEqual(composes.length);
      // Stronger: each child line carries an increasing zOrder (0, 10, 20, …).
      for (let i = 0; i < composes.length; i++) {
        const expectedZ = i * 10;
        expect(childrenSlice, `${recipe.component} missing zOrder ${expectedZ}`).toContain(`zOrder: ${expectedZ}`);
      }
    }
  });

  it('composite IR emitter wires each composed atom (recipe / primitive / placeholder)', () => {
    const composites = result.recipes.filter(r => r.composite);
    for (const recipe of composites) {
      const path = join(RECIPES_DIR, `${recipe.component}.tsx`);
      const body = result.files.get(path)!;
      const row = findRow(recipe.rowId)!;
      const composes = row.renderer!.composes ?? [];
      for (const c of composes) {
        // For each composed atom id, the body must reference it somehow:
        // either as a placeholder recipeId stamp or via a *ToIR call.
        expect(
          body.includes(`'${c.atom}'`) || body.toLowerCase().includes(c.atom.replace(/[.\-]/g, '').toLowerCase()),
          `${recipe.component} should reference composed atom ${c.atom}`,
        ).toBe(true);
      }
    }
  });
});

describe('codegen-atoms: drift detection', () => {
  it('reports OK when the on-disk artifacts match the build()', () => {
    // build() produces the same artifacts as the last `npm run codegen-atoms`.
    // Calling checkDrift() on it should report clean.
    const result = build();
    const drift = checkDrift(result);
    if (drift.drifted) {
      // Helpful diagnostic for the developer running tests locally.
      // eslint-disable-next-line no-console
      console.error('drift details:', drift.details);
    }
    expect(drift.drifted).toBe(false);
  });

  describe('mutate-and-restore', () => {
    let chosenPath: string;
    let originalBody: string;

    beforeAll(() => {
      const result = build();
      // Pick one recipe deterministically (alphabetically first).
      const sorted = [...result.recipes].sort((a, b) => a.component.localeCompare(b.component));
      const target = sorted[0];
      expect(target).toBeDefined();
      chosenPath = join(RECIPES_DIR, `${target.component}.tsx`);
      originalBody = readFileSync(chosenPath, 'utf-8');
      writeFileSync(chosenPath, originalBody + '\n// drift!\n');
    });

    afterAll(() => {
      if (chosenPath && originalBody) {
        writeFileSync(chosenPath, originalBody);
      }
    });

    it('detects an artificially-mutated generated file', () => {
      const result = build();
      const drift = checkDrift(result);
      expect(drift.drifted).toBe(true);
      // The drift report should call out the mutated file specifically.
      const mentioned = drift.details.some(d => d.includes(chosenPath.split('/').pop()!));
      expect(mentioned).toBe(true);
    });
  });
});

describe('codegen-atoms: artifacts on disk', () => {
  it('atoms.lock.json exists and is well-formed JSON', () => {
    expect(existsSync(LOCK_FILE)).toBe(true);
    const lock = JSON.parse(readFileSync(LOCK_FILE, 'utf-8'));
    expect(lock.lockVersion).toBe(1);
    expect(typeof lock.atomsYamlSha256).toBe('string');
    expect(Array.isArray(lock.atoms)).toBe(true);
  });

  it('atoms.schema.json exists and is well-formed JSON', () => {
    expect(existsSync(SCHEMA_FILE)).toBe(true);
    const schema = JSON.parse(readFileSync(SCHEMA_FILE, 'utf-8'));
    expect(schema.$schema).toBeDefined();
    expect(schema.definitions).toBeDefined();
  });

  it('every committed Tier-B TSX file is non-empty and starts with header', () => {
    const result = build();
    for (const recipe of result.recipes) {
      const path = join(RECIPES_DIR, `${recipe.component}.tsx`);
      expect(existsSync(path)).toBe(true);
      const stats = statSync(path);
      expect(stats.size).toBeGreaterThan(100);
      expect(readFileSync(path, 'utf-8').startsWith('// AUTO-GENERATED')).toBe(true);
    }
  });
});
