/**
 * Unit tests for `_helpers.ts` — the shared loader / props-synth / native-
 * area-ratio utilities consumed by M5's contract + matrix tests.
 *
 * Coverage:
 *   - loadAtomManifest: parses atoms.yaml, returns rows with stable ids
 *   - rowsWithFixture: filters to fixture-bearing rows
 *   - tierBRecipeRows: filters to renderer.tier === 'B'
 *   - synthesizeProps: bbox always present, defaults honored, required
 *     props synthesized, optional props with no default skipped
 *   - nativeAreaRatio: leaf-area sum, raster exclusion, escape-hatch metadata
 *   - stableStringify: keys sorted, deterministic output
 */

import { describe, expect, test } from 'vitest';

import {
  ATOMS_YAML_PATH,
  DEFAULT_BBOX,
  atomIdOf,
  loadAtomManifest,
  nativeAreaRatio,
  rowsWithFixture,
  rowsWithRenderer,
  stableStringify,
  synthesizeProps,
  tierBRecipeRows,
  type AtomRow,
  type PropEntry,
} from './_helpers';

import type { GroupNodeT } from '../../ir/schema';

// ---------------------------------------------------------------------------
// loadAtomManifest + filters
// ---------------------------------------------------------------------------

describe('loadAtomManifest', () => {
  test('points at slidify/patterns/data/atoms.yaml', () => {
    expect(ATOMS_YAML_PATH).toMatch(/slidify\/patterns\/data\/atoms\.yaml$/);
  });

  test('parses without error and returns >100 rows', () => {
    const rows = loadAtomManifest();
    expect(rows.length).toBeGreaterThan(100);
  });

  test('every row has a stable string id', () => {
    const rows = loadAtomManifest();
    const seen = new Set<string>();
    for (const r of rows) {
      expect(typeof r.id).toBe('string');
      expect(seen.has(r.id), `duplicate row id ${r.id}`).toBe(false);
      seen.add(r.id);
    }
  });
});

describe('rowsWithRenderer / rowsWithFixture / tierBRecipeRows', () => {
  const rows = loadAtomManifest();

  test('rowsWithRenderer is a non-empty subset', () => {
    const r = rowsWithRenderer(rows);
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(rows.length);
    for (const row of r) expect(row.renderer).toBeDefined();
  });

  test('rowsWithFixture is a non-empty subset and all carry expected_recipe_id', () => {
    const r = rowsWithFixture(rows);
    expect(r.length).toBeGreaterThan(0);
    for (const row of r) {
      expect(row.fixture?.sample_html).toBeTruthy();
      expect(row.fixture?.expected_recipe_id).toBeTruthy();
    }
  });

  test('tierBRecipeRows excludes Tier-A and tagless rows', () => {
    const r = tierBRecipeRows(rows);
    expect(r.length).toBeGreaterThan(0);
    for (const row of r) expect(row.renderer?.tier).toBe('B');
  });

  test('atomIdOf returns the dotted user-facing id', () => {
    const row: AtomRow = {
      id: 'atom-bg-aurora-band',
      priority: 52,
      match: { 'anchor.data_atom_id': 'bg.aurora-band' },
    };
    expect(atomIdOf(row)).toBe('bg.aurora-band');
  });

  test('atomIdOf falls back to the first list entry', () => {
    const row: AtomRow = {
      id: 'atom-type-stroke',
      priority: 58,
      match: { 'anchor.data_atom_id': ['type.stroke', 'type.stroke-thick'] },
    };
    expect(atomIdOf(row)).toBe('type.stroke');
  });
});

// ---------------------------------------------------------------------------
// synthesizeProps
// ---------------------------------------------------------------------------

describe('synthesizeProps', () => {
  const baseRow: AtomRow = {
    id: 'atom-test',
    priority: 100,
    match: { 'anchor.data_atom_id': 'test.test' },
  };

  test('always sets bbox', () => {
    const props = synthesizeProps({
      ...baseRow,
      renderer: { component: 'X', tier: 'B', version: '1.0.0', props: {} },
    });
    expect(props['bbox']).toEqual(DEFAULT_BBOX);
  });

  test('honors caller-supplied bbox', () => {
    const custom = { x: 10, y: 20, w: 30, h: 40 };
    const props = synthesizeProps(
      { ...baseRow, renderer: { component: 'X', tier: 'B', version: '1.0.0', props: {} } },
      custom,
    );
    expect(props['bbox']).toEqual(custom);
  });

  test('synthesizes required string', () => {
    const schema: Record<string, PropEntry> = {
      headline: { type: 'string', required: true },
    };
    const props = synthesizeProps({
      ...baseRow,
      renderer: { component: 'X', tier: 'B', version: '1.0.0', props: schema },
    });
    expect(typeof props['headline']).toBe('string');
    expect((props['headline'] as string).length).toBeGreaterThan(0);
  });

  test('honors declared default values verbatim', () => {
    const schema: Record<string, PropEntry> = {
      cy:    { type: 'number', default: 0.2 },
      color: { type: 'color',  default: 'tokens.palette.accent-1' },
    };
    const props = synthesizeProps({
      ...baseRow,
      renderer: { component: 'X', tier: 'B', version: '1.0.0', props: schema },
    });
    expect(props['cy']).toBe(0.2);
    expect(props['color']).toBe('tokens.palette.accent-1');
  });

  test('skips optional props with no default', () => {
    const schema: Record<string, PropEntry> = {
      ribbon: { type: 'string' },                       // no required, no default
      label:  { type: 'string', required: true },
    };
    const props = synthesizeProps({
      ...baseRow,
      renderer: { component: 'X', tier: 'B', version: '1.0.0', props: schema },
    });
    expect(props['ribbon']).toBeUndefined();
    expect(props['label']).toBeDefined();
  });

  test('synthesizes enum first value when required', () => {
    const schema: Record<string, PropEntry> = {
      side: { type: 'enum', values: ['left', 'right', 'both'], required: true },
    };
    const props = synthesizeProps({
      ...baseRow,
      renderer: { component: 'X', tier: 'B', version: '1.0.0', props: schema },
    });
    expect(props['side']).toBe('left');
  });

  test('synthesizes numeric arrays for required array<number>', () => {
    const schema: Record<string, PropEntry> = {
      data: { type: 'array', items: 'number', required: true },
    };
    const props = synthesizeProps({
      ...baseRow,
      renderer: { component: 'X', tier: 'B', version: '1.0.0', props: schema },
    });
    expect(Array.isArray(props['data'])).toBe(true);
    expect((props['data'] as number[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// nativeAreaRatio
// ---------------------------------------------------------------------------

describe('nativeAreaRatio', () => {
  test('returns 1.0 when a single shape fully covers the bbox', () => {
    const root: GroupNodeT = {
      kind: 'group',
      recipeId: 'test',
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      zOrder: 0,
      metadata: {},
      children: [
        {
          kind: 'shape',
          recipeId: 'test.shape',
          bbox: { x: 0, y: 0, w: 100, h: 100 },
          zOrder: 0,
          metadata: {},
          shape: 'rect',
          borderRadiusPx: 0,
          fill: { kind: 'solid', color: '#ff0000' },
        },
      ],
    };
    const r = nativeAreaRatio(root);
    expect(r.ratio).toBe(1.0);
    expect(r.totalNodes).toBe(1);
    expect(r.rasterNodes).toBe(0);
    expect(r.nativeAreaPx2).toBe(10_000);
  });

  test('returns 0 for a hollow group with no leaf children', () => {
    const root: GroupNodeT = {
      kind: 'group',
      recipeId: 'hollow',
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      zOrder: 0,
      metadata: {},
      children: [],
    };
    expect(nativeAreaRatio(root).ratio).toBe(0);
  });

  test('group descendants do not double-count', () => {
    const root: GroupNodeT = {
      kind: 'group',
      recipeId: 'test',
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      zOrder: 0,
      metadata: {},
      children: [
        {
          kind: 'group',
          recipeId: 'inner',
          bbox: { x: 0, y: 0, w: 100, h: 100 },
          zOrder: 0,
          metadata: {},
          children: [
            {
              kind: 'shape',
              recipeId: 'leaf',
              bbox: { x: 0, y: 0, w: 50, h: 100 },
              zOrder: 0,
              metadata: {},
              shape: 'rect',
              borderRadiusPx: 0,
              fill: { kind: 'solid', color: '#000' },
            },
          ],
        },
      ],
    };
    const r = nativeAreaRatio(root);
    expect(r.ratio).toBe(0.5);
    expect(r.totalNodes).toBe(2);
  });

  test('escape-hatch raster is excluded from numerator', () => {
    const root: GroupNodeT = {
      kind: 'group',
      recipeId: 'test',
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      zOrder: 0,
      metadata: {},
      children: [
        {
          kind: 'raster',
          recipeId: 'chrome.escape-hatch',
          bbox: { x: 0, y: 0, w: 100, h: 100 },
          zOrder: 0,
          metadata: { role: 'escape-hatch', excludeFromNativeRatio: true },
          pngBase64: '',
        },
      ],
    };
    const r = nativeAreaRatio(root);
    expect(r.ratio).toBe(0);
    expect(r.rasterNodes).toBe(1);
  });

  test('non-escape raster counts as 1 raster but 0 native', () => {
    const root: GroupNodeT = {
      kind: 'group',
      recipeId: 'test',
      bbox: { x: 0, y: 0, w: 100, h: 100 },
      zOrder: 0,
      metadata: {},
      children: [
        {
          kind: 'raster',
          recipeId: 'someother.raster',
          bbox: { x: 0, y: 0, w: 100, h: 100 },
          zOrder: 0,
          metadata: {},
          pngBase64: '',
        },
      ],
    };
    const r = nativeAreaRatio(root);
    expect(r.rasterNodes).toBe(1);
    expect(r.ratio).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// stableStringify
// ---------------------------------------------------------------------------

describe('stableStringify', () => {
  test('sorts keys recursively', () => {
    const out = stableStringify({ b: 1, a: { d: 2, c: 3 } });
    expect(out).toBe('{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}');
  });

  test('preserves array order', () => {
    expect(stableStringify([3, 1, 2])).toBe('[\n  3,\n  1,\n  2\n]');
  });

  test('handles null + primitives', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify('x')).toBe('"x"');
  });
});
