/**
 * Atom recognition contract test (CONTRACT-v2 §D, M5.1).
 *
 * For every atom row that ships both a `renderer:` and a `fixture:` block,
 * pipe the fixture's `sample_html` through the slidify matcher CLI
 * (`uv run python -m slidify.patterns --classify-batch`) and assert the
 * recovered atom id matches the row's `expected_recipe_id`.
 *
 * This is the **recognition stability** half of the round-trip guard
 * (matcher → renderer → matcher). It catches:
 *   - atoms.yaml drift that breaks `data-atom` author-hint matching
 *   - schema-renames that desync `expected_recipe_id` from `match.anchor.data_atom_id`
 *   - matcher-loader regressions that drop atoms.yaml on the floor
 *
 * The matcher is deterministic for `data-atom`-tagged anchors, so this
 * test is fast (one batch subprocess invocation) and not brittle.
 */

import { beforeAll, describe, expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadAtomManifest,
  rowsWithFixture,
  atomIdOf,
  type AtomRow,
} from './_helpers';

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..');

interface MatcherResult {
  id?: string;
  atom_id: string | null;
  confidence: number;
  pattern_id?: string;
}

function classifyBatch(items: { id: string; html: string }[]): Map<string, MatcherResult> {
  const ndjson = items.map(i => JSON.stringify(i)).join('\n') + '\n';
  const proc = spawnSync(
    'uv',
    ['run', '--quiet', 'python', '-m', 'slidify.patterns', '--classify-batch'],
    {
      input: ndjson,
      encoding: 'utf-8',
      cwd: REPO_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (proc.error) {
    throw new Error(`spawn failed: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    throw new Error(
      `matcher CLI exited ${proc.status}\nstderr: ${proc.stderr ?? ''}\nstdout: ${proc.stdout?.slice(0, 400) ?? ''}`,
    );
  }
  const out = new Map<string, MatcherResult>();
  for (const line of (proc.stdout ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line) as MatcherResult;
    if (parsed.id !== undefined) out.set(parsed.id, parsed);
  }
  return out;
}

const ROWS = loadAtomManifest();
const FIXTURES: AtomRow[] = rowsWithFixture(ROWS).filter(r => r.renderer !== undefined);

let RESULTS: Map<string, MatcherResult>;

beforeAll(() => {
  RESULTS = classifyBatch(
    FIXTURES.map(row => ({ id: row.id, html: row.fixture?.sample_html ?? '' })),
  );
}, 90_000);

describe('atom recognition contract — fixture HTML round-trips through matcher', () => {
  test('manifest contains rows with both renderer and fixture blocks', () => {
    expect(FIXTURES.length).toBeGreaterThan(0);
  });

  // test.each over every fixture so failures localize to their atom row.
  test.each(FIXTURES.map(row => [row.fixture?.expected_recipe_id ?? atomIdOf(row) ?? row.id, row]))(
    'recognizes %s',
    (expected, row) => {
      const html = row.fixture?.sample_html ?? '';
      const result = RESULTS.get(row.id) ?? { atom_id: null, confidence: 0 };
      const detail = [
        `atom row id:    ${row.id}`,
        `expected:       ${expected}`,
        `actual:         ${result.atom_id ?? '<miss>'}`,
        `pattern_id:     ${result.pattern_id ?? '<none>'}`,
        `confidence:     ${result.confidence}`,
        `sample_html len:${html.length}`,
      ].join('\n');
      expect(
        result.atom_id,
        `\nAtom recognition mismatch:\n${detail}\n`,
      ).toBe(expected);
    },
  );
});
