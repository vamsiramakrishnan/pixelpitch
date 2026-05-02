/**
 * Shared helpers for the M5 contract + preset-matrix tests.
 *
 * - {@link loadAtomManifest}: parses `slidify/patterns/data/atoms.yaml`.
 * - {@link synthesizeProps}: turns a row's `renderer.props` schema into a
 *   plausible defaults bag (bbox + per-prop defaults).
 * - {@link nativeAreaRatio}: walks an IR tree and returns the fraction of the
 *   root bbox area covered by native (non-RasterNode) descendants, with the
 *   `chrome.escape-hatch` raster atom and any `excludeFromNativeRatio`-flagged
 *   nodes skipped per CONTRACT-v2 §9.5.
 *
 * Shared between `atom-emit.test.ts`, `matrix.test.ts`, and the unit tests in
 * `_helpers.test.ts`. Strict TS, no `any`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';

import type { Bbox, Node as IRNode, GroupNodeT } from '../../ir/schema';

// ---------------------------------------------------------------------------
// atoms.yaml schema (mirrors atoms.SCHEMA.md / codegen-atoms.ts)
// ---------------------------------------------------------------------------

export type AtomTier = 'A' | 'B';

export interface PropEntry {
  type:
    | 'bbox'
    | 'color'
    | 'fill'
    | 'gradient'
    | 'string'
    | 'number'
    | 'boolean'
    | 'enum'
    | 'array'
    | 'object';
  required?: boolean;
  default?: unknown;
  values?: string[];
  items?: string;
  min?: number;
  max?: number;
}

export interface ComposesEntry {
  atom: string;
  props?: Record<string, unknown>;
}

export interface RendererBlock {
  component: string;
  tier: AtomTier;
  primitive?: string;
  composes?: ComposesEntry[];
  version: string;
  props?: Record<string, PropEntry>;
}

export interface FixtureBlock {
  sample_html?: string;
  expected_recipe_id?: string;
}

export interface AtomRow {
  id: string;
  priority: number;
  match?: {
    'anchor.data_atom_id'?: string | string[];
    'anchor.data_atom_namespace'?: string;
  };
  emit?: { kind?: string; metadata?: Record<string, unknown> };
  tag?: string;
  renderer?: RendererBlock;
  fixture?: FixtureBlock;
}

interface ManifestFile {
  patterns?: AtomRow[];
}

const __filename = fileURLToPath(import.meta.url);
const TESTS_DIR = dirname(__filename);
const COMPONENTS_DIR = resolve(TESTS_DIR, '..', '..', '..');
const REPO_ROOT = resolve(COMPONENTS_DIR, '..');

export const ATOMS_YAML_PATH = resolve(
  REPO_ROOT,
  'slidify',
  'patterns',
  'data',
  'atoms.yaml',
);

/** Parse atoms.yaml and return all rows. Throws if the file is missing. */
export function loadAtomManifest(path: string = ATOMS_YAML_PATH): AtomRow[] {
  if (!existsSync(path)) {
    throw new Error(`atoms.yaml not found at ${path}`);
  }
  const text = readFileSync(path, 'utf-8');
  const doc = yaml.load(text) as ManifestFile | null;
  return doc?.patterns ?? [];
}

/** Return the user-facing dotted atom id, e.g. `bg.aurora-band`. */
export function atomIdOf(row: AtomRow): string | undefined {
  const id = row.match?.['anchor.data_atom_id'];
  if (typeof id === 'string') return id;
  if (Array.isArray(id) && id.length > 0) return id[0];
  return undefined;
}

/** Subset of rows that ship a `renderer:` block. Tier-A + Tier-B both included. */
export function rowsWithRenderer(rows: AtomRow[]): AtomRow[] {
  return rows.filter(r => r.renderer !== undefined);
}

/** Subset of rows that are emitted as Tier-B recipes (not primitives). */
export function tierBRecipeRows(rows: AtomRow[]): AtomRow[] {
  return rows.filter(r => r.renderer?.tier === 'B');
}

/** Subset of rows with a fixture block AND an `expected_recipe_id`. */
export function rowsWithFixture(rows: AtomRow[]): AtomRow[] {
  return rows.filter(
    r =>
      r.fixture?.sample_html !== undefined &&
      r.fixture.sample_html.trim() !== '' &&
      r.fixture.expected_recipe_id !== undefined,
  );
}

// ---------------------------------------------------------------------------
// Props synthesis: row.renderer.props → plausible defaults bag.
// ---------------------------------------------------------------------------

/** Default bbox for synthesized props: 600×200, mid-slide. */
export const DEFAULT_BBOX: Bbox = { x: 100, y: 100, w: 600, h: 200 };

/** Sample synthesized values per prop type. Stable across runs. */
const SAMPLE_STRING = 'Sample';
const SAMPLE_NUMBER = 1;

function defaultForProp(name: string, p: PropEntry): unknown {
  // Prefer the YAML-declared default when present and not a token reference;
  // token-reference strings are returned verbatim because the tokens API
  // resolves them at IR-emit time.
  if (p.default !== undefined) return p.default;
  switch (p.type) {
    case 'bbox':    return { ...DEFAULT_BBOX };
    case 'color':   return '#cccccc';
    case 'fill':    return { kind: 'solid', color: '#cccccc' };
    case 'gradient':
      return {
        kind: 'linear-gradient',
        angleDeg: 90,
        stops: [
          { color: '#000000', position: 0 },
          { color: '#ffffff', position: 1 },
        ],
      };
    case 'string': {
      // Heuristic: name-aware strings keep snapshots readable.
      if (/headline|title|heading/i.test(name)) return 'Headline';
      if (/eyebrow|kicker/i.test(name))         return 'EYEBROW';
      if (/caption|lede|body/i.test(name))      return 'Caption text';
      if (/quote/i.test(name))                  return 'A pithy quote.';
      if (/url|src|href/i.test(name))           return 'https://example.invalid/asset';
      return SAMPLE_STRING;
    }
    case 'number': {
      const fallback =
        p.min !== undefined && p.max !== undefined
          ? (p.min + p.max) / 2
          : SAMPLE_NUMBER;
      return fallback;
    }
    case 'boolean': return false;
    case 'enum': {
      const v = p.values ?? [];
      return v.length > 0 ? v[0] : 'default';
    }
    case 'array': {
      // Numeric arrays — small monotone sample. String / boolean arrays — empty.
      if (p.items === 'number') return [1, 2, 3, 4, 5];
      if (p.items === 'string') return ['a', 'b', 'c'];
      return [];
    }
    case 'object': {
      // Name-aware: synthesizer needs to satisfy primitive prop shapes.
      // Coord-like names get {x,y}; other objects stay {}.
      if (/^(from|to|anchor|leaderTo|origin|target|point)$/i.test(name)) {
        return { x: 200, y: 200 };
      }
      return {};
    }
    default:       return undefined;
  }
}

/**
 * Synthesize a plausible props bag for a row's renderer. Always includes
 * `bbox`. After M3.5's prop-forwarding fix, codegen forwards undefined
 * values too, which crash primitives that assume present values. So we
 * also synthesize OPTIONAL color/object props for primitives that need
 * them — name-aware.
 */
export function synthesizeProps(row: AtomRow, bbox: Bbox = DEFAULT_BBOX): Record<string, unknown> {
  const props: Record<string, unknown> = { bbox: { ...bbox } };
  const schema = row.renderer?.props ?? {};
  for (const [name, entry] of Object.entries(schema)) {
    if (name === 'bbox') {
      props['bbox'] = { ...bbox };
      continue;
    }
    // Synthesize required props, OR props with declared defaults, OR
    // optional color/object props (codegen forwards them; primitives
    // crash on undefined).
    const isOptionalForwarded =
      entry.type === 'color' || entry.type === 'object' || entry.type === 'fill';
    if (entry.required === true || entry.default !== undefined || isOptionalForwarded) {
      props[name] = defaultForProp(name, entry);
    }
  }
  return props;
}

// ---------------------------------------------------------------------------
// Native-area-ratio walker
// ---------------------------------------------------------------------------

export interface NativeRatioResult {
  /** Fraction of `root.bbox` area covered by non-raster descendants. */
  ratio: number;
  /** Total descendant nodes (including the root group itself). */
  totalNodes: number;
  /** RasterNode descendants (excluded from the native sum). */
  rasterNodes: number;
  /** Native-area sum, in slide-pixel² (no overlap dedup — naive sum). */
  nativeAreaPx2: number;
  /** Root bbox area, in slide-pixel². */
  rootAreaPx2: number;
}

function bboxArea(b: Bbox | undefined): number {
  if (!b) return 0;
  return Math.max(0, b.w) * Math.max(0, b.h);
}

interface NodeWithMaybeBbox {
  kind: string;
  bbox?: Bbox;
  metadata?: Record<string, unknown>;
  children?: IRNode[];
}

function isRasterExcluded(node: NodeWithMaybeBbox): boolean {
  if (node.kind !== 'raster') return false;
  // Honor explicit metadata flag set by EscapeHatch + NoiseTexture (per
  // CONTRACT-v1 §9.5 / CONTRACT-v2 §9.5).
  const md = (node.metadata ?? {}) as Record<string, unknown>;
  if (md['excludeFromNativeRatio'] === true) return true;
  if (typeof md['role'] === 'string' && md['role'] === 'escape-hatch') return true;
  return false;
}

/**
 * Walk an IR tree from `root` and compute native-area coverage relative to
 * `root.bbox`. Mirrors the Python `native_area_ratio` heuristic
 * (see `slidify/emitter.py`): naive bbox sum, no overlap dedup, raster excluded.
 *
 * The ratio is clamped to [0, 1.5] — recipes that legitimately stack many
 * children inside the same bbox can sum past 1.0; that's by design (the
 * Python emitter clamps to 1.0 too, but we keep the raw signal for tests).
 */
export function nativeAreaRatio(root: GroupNodeT): NativeRatioResult {
  const rootArea = bboxArea(root.bbox);
  let nativeSum = 0;
  let total = 0;
  let raster = 0;

  const visit = (node: IRNode | NodeWithMaybeBbox): void => {
    total += 1;
    const n = node as NodeWithMaybeBbox;
    if (n.kind === 'raster') {
      raster += 1;
      if (!isRasterExcluded(n)) {
        // Raster that isn't escape-hatch counts AGAINST native ratio: it's
        // present in the slide but doesn't add to the native numerator.
      }
      return;
    }
    if (n.kind === 'group') {
      // Group nodes don't add their own area — only their leaf descendants do
      // (otherwise nesting would multiply-count). Recurse only.
      for (const child of (n.children ?? [])) visit(child);
      return;
    }
    // Leaf native node: add its bbox area (or 0 if missing).
    nativeSum += bboxArea(n.bbox);
  };

  for (const child of root.children) visit(child);

  const ratio = rootArea > 0 ? nativeSum / rootArea : 0;
  return {
    ratio,
    totalNodes: total,
    rasterNodes: raster,
    nativeAreaPx2: nativeSum,
    rootAreaPx2: rootArea,
  };
}

// ---------------------------------------------------------------------------
// Snapshot serializer (pretty-printed JSON, sorted keys)
// ---------------------------------------------------------------------------

/** Stable JSON.stringify with keys sorted recursively. */
export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(value, sortReplacer, indent);
}

function sortReplacer(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}
