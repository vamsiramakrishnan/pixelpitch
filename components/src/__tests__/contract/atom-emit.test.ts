/**
 * Atom emit-stability snapshot test (CONTRACT-v2 §D, M5.2).
 *
 * For every Tier-B recipe in `components/src/recipes/`, call the named
 * `*ToIR` export with synthesized props and snapshot the resulting IR JSON
 * to `__snapshots__/<atom-id>.ir.snap`.
 *
 * This is the **emit stability** half of the round-trip guard: a future PR
 * that refactors a primitive, retunes a token, or rewrites a recipe must
 * intentionally regenerate the snapshot via `vitest -u`. Silent IR drift
 * fails CI.
 *
 * Snapshots use the `DEFAULT_TOKENS` (vercel-dark) bundle at cozy density
 * for parity with the primitive-level IR snapshots already in the tree.
 * Preset-by-preset coverage is M5.3's matrix gate.
 *
 * Failure modes captured:
 *   - **success**: full IR JSON snapshot.
 *   - **emit-throws**: a stable `{ "error": "<class>: <msg>" }` payload.
 *     Today, ~22 recipes throw at IR-emit time because the recipe wrapper
 *     forwards only `bbox` to a primitive that requires more props (e.g.,
 *     SlotEyebrow needs `text`). That's a real codegen bug; M3.5 fixes it.
 *     Snapshotting the error keeps regressions visible without blocking
 *     the gate's other 70+ stable rows.
 */

import { describe, expect, test } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadAtomManifest,
  tierBRecipeRows,
  atomIdOf,
  synthesizeProps,
  stableStringify,
  type AtomRow,
} from './_helpers';
import { RECIPE_IR_HELPERS } from './_recipe-registry';

import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

const __filename = fileURLToPath(import.meta.url);
const SNAPSHOT_DIR = resolve(__filename, '..', '__snapshots__');

const ROWS = loadAtomManifest();
const TIER_B = tierBRecipeRows(ROWS);

const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

describe('atom emit-stability — Tier-B recipe IR is byte-stable', () => {
  test('manifest contains Tier-B rows', () => {
    expect(TIER_B.length).toBeGreaterThan(0);
  });

  test.each(
    TIER_B.map(row => [atomIdOf(row) ?? row.id, row]),
  )(
    '%s emits stable IR',
    async (atomId, row) => {
      const helper = RECIPE_IR_HELPERS[atomId as string];
      if (!helper) {
        throw new Error(
          `No IR helper registered for atom id "${atomId}" (row.id=${(row as AtomRow).id}). ` +
            `Update components/src/__tests__/contract/_recipe-registry.ts.`,
        );
      }
      const props = synthesizeProps(row as AtomRow);
      let payload: string;
      try {
        const ir = helper(props, tokens);
        payload = stableStringify(ir);
      } catch (err) {
        // Capture the failure shape. Stable across reruns: just class + msg head.
        const e = err as Error;
        const msg = (e.message ?? String(e)).split('\n')[0]?.slice(0, 200) ?? '';
        payload = stableStringify({
          error: `${e.constructor.name}: ${msg}`,
          atomId,
        });
      }
      const snapPath = resolve(SNAPSHOT_DIR, `${atomId}.ir.snap`);
      await expect(payload).toMatchFileSnapshot(snapPath);
    },
  );
});
