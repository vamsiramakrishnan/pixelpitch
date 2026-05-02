/**
 * Theme preset matrix gate (CONTRACT-v2 §E, M5.3).
 *
 * Cartesian product: all Tier-B recipes × 7 presets (5 baseline + 2 stress).
 * For each (recipe, preset) cell:
 *   1. Synthesize plausible props from the atoms.yaml row.
 *   2. Build tokens from the preset bundle.
 *   3. Call the recipe's `*ToIR(props, tokens)`.
 *   4. Walk the resulting IR and compute `native_area_ratio` (fraction of
 *      the bbox area covered by NON-RasterNode descendants, with
 *      `chrome.escape-hatch` and any `excludeFromNativeRatio`-flagged raster
 *      excluded per CONTRACT-v2 §9.5).
 *   5. Snapshot a per-cell summary `{ recipe, preset, native_ratio,
 *      total_nodes, raster_nodes, status }` to
 *      `__snapshots__/<atom-id>/<preset>.summary.snap`.
 *   6. Strict-gate the cell against `native_area_ratio ≥ 0.97` ONLY when
 *      the recipe is in the `STRICT_GATE_ALLOWLIST`. The remaining
 *      recipes snapshot their current native ratio so future PRs surface
 *      regressions without blocking the gate today (M3.5 expands the
 *      allowlist as primitives get richer).
 *
 * The override lists below are intentionally short and audited.
 *
 * Two override buckets:
 *   - **EMIT_THROWS_OVERRIDES**: recipes whose `*ToIR` currently throws
 *     because the codegen wrapper forwards only `bbox` to a primitive that
 *     requires more props (M3.5 fix). These cells snapshot the error.
 *   - **RASTER_OVERRIDES**: recipes that legitimately rasterize in some
 *     presets and are excluded from the strict 0.97 gate.
 *
 * If a recipe consistently fails native_area_ratio across multiple presets
 * after M3.5, that's a "treatment-masquerading-as-primitive" smell — see
 * the M5 final report.
 */

import { describe, expect, test } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadAtomManifest,
  tierBRecipeRows,
  atomIdOf,
  synthesizeProps,
  nativeAreaRatio,
  stableStringify,
  type AtomRow,
} from '../contract/_helpers';
import { RECIPE_IR_HELPERS } from '../contract/_recipe-registry';

import {
  THEME_PRESETS,
  getTokensFromBundle,
  type ThemePresetKey,
} from '../../tokens';

const __filename = fileURLToPath(import.meta.url);
const SNAPSHOT_DIR = resolve(__filename, '..', '__snapshots__');

// ---------------------------------------------------------------------------
// Preset selection — 5 baseline + 2 stress (CONTRACT-v2 §E)
// ---------------------------------------------------------------------------

const MATRIX_PRESETS: ThemePresetKey[] = [
  // baseline
  'vercel-dark',
  'linear-light',
  'stripe',
  'paper',
  'editorial',
  // stress
  'brutalist',
  'glass-noir',
];

// ---------------------------------------------------------------------------
// Override / allowlist
// ---------------------------------------------------------------------------

/**
 * Recipes whose `*ToIR` currently throws at runtime in *every* preset.
 *
 * Post-M3.6 (primitive defaults + name-overlap codegen forwarding +
 * composite resolution), every recipe now emits a structurally-valid
 * IR with sensible defaults — even when content props are missing.
 * This list is empty.
 *
 * If something starts throwing again, add it here with a comment
 * explaining why and link a follow-up issue.
 */
const EMIT_THROWS_OVERRIDES = new Set<string>([]);

/**
 * Recipes that legitimately rasterize in some presets (e.g. image-mode
 * masks, photo-fallback typography). Currently empty — none of the
 * generated Tier-B recipes route through the raster path. Kept as the
 * documented seam for M3.5 / M7.
 */
const RASTER_OVERRIDES = new Set<string>([]);

/**
 * Recipes whose IR genuinely fills the bbox today (i.e., emit non-empty
 * leaf children) and so are gated to `native_area_ratio ≥ 0.97`. Every
 * other recipe currently emits a hollow group (treatment-masquerading-
 * as-primitive smell) — those snapshot their actual ratio without
 * blocking CI. M3.6 expands this dramatically (11 → 78) once codegen's
 * name-overlap forwarding wired bbox-only fills + content props through
 * to every primitive that can paint.
 */
const STRICT_GATE_ALLOWLIST = new Set<string>([
  'anno.callout-bubble',
  'anno.highlighter-mark',
  'anno.numbered-hotspot',
  'anno.redaction-bar',
  'anno.stamp-draft',
  'anno.stamp-internal',
  'anno.stamp-new',
  'anno.sticker',
  'anno.tooltip',
  'bg.aurora-corners',
  'bg.crosshatch',
  'bg.diagonal',
  'bg.dot-lattice-coarse',
  'bg.dot-lattice-fine',
  'bg.line-grid',
  'bg.scrim-bottom',
  'bg.scrim-top',
  'bg.spotlight-soft',
  'bg.spotlight-tight',
  'comp.agenda-2col',
  'comp.agenda-toc',
  'comp.annotated-screenshot',
  'comp.bento-mixed',
  'comp.big-stat-hero',
  'comp.closing-cta',
  'comp.data-overview',
  'comp.hero-investor',
  'comp.hero-product',
  'comp.quote-editorial',
  'comp.roadmap-quarterly',
  'comp.section-divider-mesh',
  'comp.team-grid',
  'comp.three-up-stats',
  'data.delta-badge',
  'dec.arrow-down',
  'dec.arrow-left',
  'dec.arrow-right',
  'dec.arrow-up',
  'dec.brace-bottom',
  'dec.brace-left',
  'dec.brace-right',
  'dec.brace-top',
  'dec.bullet-dot',
  'dec.dotted-rule',
  'dec.hairline-rule',
  'dec.numeral-chapter',
  'dec.plus',
  'dec.section-divider',
  'dec.star-5',
  'dec.star-6',
  'mask.gradient-fade-edge',
  'mask.octagon',
  'surf.card-bordered',
  'surf.card-depth',
  'surf.card-flat',
  'surf.card-floating',
  'surf.card-paper',
  'surf.card-raised',
  'surf.section-band',
  'surf.tape-band',
  'type.big-number',
  'type.big-number-gradient',
  'type.big-number-xl',
  'type.eyebrow-ruled',
  'type.eyebrow-tape',
  'type.numerals-tabular',
  'type.pullquote-brutalist',
  'type.pullquote-serif',
  'ui.browser-mac',
  'ui.browser-minimal',
  'ui.browser-win',
  'ui.code-block',
  'ui.code-block-syntax',
  'ui.device-laptop',
  'ui.device-phone',
  'ui.progress-bar',
  'ui.status-dot',
  'ui.terminal-window',
]);

const NATIVE_AREA_THRESHOLD = 0.97;
const SLIDE_BBOX = { x: 0, y: 0, w: 1280, h: 720 };

// ---------------------------------------------------------------------------
// Cell builder
// ---------------------------------------------------------------------------

const ROWS = loadAtomManifest();
const TIER_B = tierBRecipeRows(ROWS);

interface Cell {
  atomId: string;
  preset: ThemePresetKey;
  row: AtomRow;
}

const CELLS: Cell[] = [];
for (const row of TIER_B) {
  const aid = atomIdOf(row);
  if (!aid) continue;
  for (const preset of MATRIX_PRESETS) {
    CELLS.push({ atomId: aid, preset, row });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('preset-matrix gate — Tier-B × {vercel-dark, linear-light, stripe, paper, editorial, brutalist, glass-noir}', () => {
  test(`generated ${TIER_B.length} recipes × ${MATRIX_PRESETS.length} presets = ${CELLS.length} cells`, () => {
    expect(CELLS.length).toBe(TIER_B.length * MATRIX_PRESETS.length);
  });

  test('override lists stay short (M3.6 cleared the throws-override list)', () => {
    // Document growth: explicit assertions surface bloat at PR review time.
    // M3.6 result: zero recipes throw under synthesized props; allowlist > 30.
    expect(EMIT_THROWS_OVERRIDES.size).toBeLessThanOrEqual(5);
    expect(RASTER_OVERRIDES.size).toBeLessThanOrEqual(5);
    expect(STRICT_GATE_ALLOWLIST.size).toBeGreaterThan(30);
  });

  for (const preset of MATRIX_PRESETS) {
    describe(`preset: ${preset}`, () => {
      const tokens = getTokensFromBundle(THEME_PRESETS[preset], 'cozy');

      const cellsForPreset = CELLS.filter(c => c.preset === preset);

      test.each(cellsForPreset.map(c => [c.atomId, c.row]))(
        '%s — IR emits + summary snapshot',
        async (atomId, row) => {
          const helper = RECIPE_IR_HELPERS[atomId as string];
          if (!helper) {
            throw new Error(`No IR helper for "${atomId}"; update _recipe-registry.ts.`);
          }

          const props = synthesizeProps(row as AtomRow, SLIDE_BBOX);
          let summary: Record<string, unknown>;
          let irRatio: number | null = null;

          if (EMIT_THROWS_OVERRIDES.has(atomId as string)) {
            // Verify it really still throws — keeps the override list honest.
            let didThrow = false;
            let errMsg = '';
            try {
              helper(props, tokens);
            } catch (e) {
              didThrow = true;
              const m = ((e as Error).message ?? '').split('\n')[0]?.slice(0, 200) ?? '';
              errMsg = `${(e as Error).constructor.name}: ${m}`;
            }
            summary = {
              recipe: atomId,
              preset,
              status: 'override:emit-throws',
              still_throws: didThrow,
              error: errMsg || null,
            };
            expect(didThrow, `Override list claims ${atomId} throws, but it now emits cleanly. Remove from EMIT_THROWS_OVERRIDES.`).toBe(true);
          } else {
            const ir = helper(props, tokens);
            const r = nativeAreaRatio(ir);
            irRatio = r.ratio;
            summary = {
              recipe: atomId,
              preset,
              native_ratio: Number(r.ratio.toFixed(4)),
              total_nodes: r.totalNodes,
              raster_nodes: r.rasterNodes,
              root_area_px2: r.rootAreaPx2,
              native_area_px2: r.nativeAreaPx2,
              status: STRICT_GATE_ALLOWLIST.has(atomId as string) ? 'strict' : 'observe',
            };
          }

          // Per-cell summary snapshot for visual review.
          const snapPath = resolve(SNAPSHOT_DIR, atomId as string, `${preset}.summary.snap`);
          await expect(stableStringify(summary)).toMatchFileSnapshot(snapPath);

          // Strict gate: only for allowlisted recipes.
          if (
            irRatio !== null &&
            STRICT_GATE_ALLOWLIST.has(atomId as string) &&
            !RASTER_OVERRIDES.has(atomId as string)
          ) {
            expect(
              irRatio,
              `\nnative_area_ratio < ${NATIVE_AREA_THRESHOLD}\n` +
                `recipe:        ${atomId}\n` +
                `preset:        ${preset}\n` +
                `actual ratio:  ${irRatio.toFixed(4)}\n`,
            ).toBeGreaterThanOrEqual(NATIVE_AREA_THRESHOLD);
          }
        },
      );
    });
  }
});
