/**
 * Codegen: atoms.yaml -> Tier-B recipe TSX + JSON Schema + drift-lock.
 *
 * CONTRACT-v2 §C — single source of truth is `slidify/patterns/data/atoms.yaml`.
 * This script reads every row that carries a `renderer:` block and emits:
 *
 *   1. `components/src/recipes/<Component>.tsx`   — one per Tier-B atom
 *      Each file: default-export React preview, named-export `*ToIR(props, tokens)`,
 *      stamps `recipeId: '<atom-id>'` per CONTRACT-v2 §A.5.
 *
 *   2. `components/src/recipes/index.ts`           — re-exports
 *
 *   3. `components/atoms.schema.json`              — JSON Schema for LLM payloads
 *
 *   4. `components/atoms.lock.json`                — drift-detection stamp
 *
 * Tier-A atoms (`renderer.tier === 'A'`) are NOT generated — they live in
 * `components/src/primitives/` hand-written. Codegen verifies the file exists.
 *
 * Modes:
 *   `tsx scripts/codegen-atoms.ts`         — write all artifacts
 *   `tsx scripts/codegen-atoms.ts --check` — regenerate in-memory and diff
 *                                            against committed files; exit
 *                                            non-zero on drift.
 *
 * Run via `npm run codegen-atoms` / `npm run codegen-atoms-check`.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const SCRIPTS_DIR = dirname(__filename);
const COMPONENTS_DIR = resolve(SCRIPTS_DIR, '..');
const REPO_ROOT = resolve(COMPONENTS_DIR, '..');

const ATOMS_YAML = join(REPO_ROOT, 'slidify', 'patterns', 'data', 'atoms.yaml');
const PRIMITIVES_DIR = join(COMPONENTS_DIR, 'src', 'primitives');
const RECIPES_DIR = join(COMPONENTS_DIR, 'src', 'recipes');
const RECIPES_INDEX = join(RECIPES_DIR, 'index.ts');
const LOCK_FILE = join(COMPONENTS_DIR, 'atoms.lock.json');
const SCHEMA_FILE = join(COMPONENTS_DIR, 'atoms.schema.json');

// ---------------------------------------------------------------------------
// Schema types (mirrors atoms.SCHEMA.md §`renderer.props`)
// ---------------------------------------------------------------------------

type AtomTier = 'A' | 'B';
type AtomAxis = string;

interface PropEntry {
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
  values?: string[];           // for enum
  items?: string;              // for array (item type)
  min?: number;
  max?: number;
}

interface ComposesEntry {
  atom: string;
  props?: Record<string, unknown>;
}

interface RendererBlock {
  component: string;
  tier: AtomTier;
  primitive?: string;
  composes?: ComposesEntry[];
  version: string;
  props?: Record<string, PropEntry>;
}

interface AtomRow {
  id: string;
  priority: number;
  match?: { 'anchor.data_atom_id'?: string | string[]; 'anchor.data_atom_namespace'?: string };
  emit?: { kind?: string; metadata?: Record<string, unknown> };
  tag?: string;
  renderer?: RendererBlock;
  fixture?: { sample_html?: string; expected_recipe_id?: string };
}

interface Manifest {
  patterns: AtomRow[];
}

// ---------------------------------------------------------------------------
// Primitive map (Tier-A atom-id -> primitive PascalCase + camelCase IR helper)
// Hand-rolled because primitives index.ts uses one-off names.
// ---------------------------------------------------------------------------

interface PrimitiveSpec {
  /** Name as exported from `components/src/primitives/index.ts`. */
  component: string;
  /** Filename (without `.tsx`) in `components/src/primitives/`. */
  file: string;
  /** Named export of the IR helper (camelCase + 'ToIR'). */
  irHelper: string;
}

/** Map Tier-A primitive atom id -> primitive component metadata. */
const PRIMITIVE_MAP: Record<string, PrimitiveSpec> = {
  'frame.bento':        { component: 'FrameBento',        file: 'FrameBento',        irHelper: 'frameBentoToIR' },
  'frame.split':        { component: 'FrameSplit',        file: 'FrameSplit',        irHelper: 'frameSplitToIR' },
  'frame.three-up':     { component: 'FrameThreeUp',      file: 'FrameThreeUp',      irHelper: 'frameThreeUpToIR' },
  'frame.letterbox':    { component: 'FrameLetterbox',    file: 'FrameLetterbox',    irHelper: 'frameLetterboxToIR' },
  'frame.section':      { component: 'FrameSection',      file: 'FrameSection',      irHelper: 'frameSectionToIR' },
  'frame.safe-area':    { component: 'FrameSafeArea',     file: 'FrameSafeArea',     irHelper: 'frameSafeAreaToIR' },
  'slot.heading':       { component: 'SlotHeading',       file: 'SlotHeading',       irHelper: 'slotHeadingToIR' },
  'slot.eyebrow':       { component: 'SlotEyebrow',       file: 'SlotEyebrow',       irHelper: 'slotEyebrowToIR' },
  'slot.caption':       { component: 'SlotCaption',       file: 'SlotCaption',       irHelper: 'slotCaptionToIR' },
  'slot.numeral':       { component: 'SlotNumeral',       file: 'SlotNumeral',       irHelper: 'slotNumeralToIR' },
  'slot.quote':         { component: 'SlotQuote',         file: 'SlotQuote',         irHelper: 'slotQuoteToIR' },
  'slot.list':          { component: 'SlotList',          file: 'SlotList',          irHelper: 'slotListToIR' },
  'slot.code':          { component: 'SlotCode',          file: 'SlotCode',          irHelper: 'slotCodeToIR' },
  'data.sparkline':     { component: 'DataSparkline',     file: 'DataSparkline',     irHelper: 'dataSparklineToIR' },
  'data.bar':           { component: 'DataBar',           file: 'DataBar',           irHelper: 'dataBarToIR' },
  'data.donut':         { component: 'DataDonut',         file: 'DataDonut',         irHelper: 'dataDonutToIR' },
  'data.kpi-row':       { component: 'DataKpiRow',        file: 'DataKpiRow',        irHelper: 'dataKpiRowToIR' },
  'data.table':         { component: 'DataTable',         file: 'DataTable',         irHelper: 'dataTableToIR' },
  'diagram.connector':  { component: 'DiagramConnector',  file: 'DiagramConnector',  irHelper: 'diagramConnectorToIR' },
  'diagram.timeline':   { component: 'DiagramTimeline',   file: 'DiagramTimeline',   irHelper: 'diagramTimelineToIR' },
  'chrome.escape-hatch': { component: 'EscapeHatch',      file: 'EscapeHatch',       irHelper: 'escapeHatchToIR' },

  // M3.5 — prop-compatible primitives that replace ghost-delegations.
  'surface.shape-fill':    { component: 'SurfaceShapeFill',    file: 'SurfaceShapeFill',    irHelper: 'surfaceShapeFillToIR' },
  'surface.pattern-tile':  { component: 'SurfacePatternTile',  file: 'SurfacePatternTile',  irHelper: 'surfacePatternTileToIR' },
  'surface.radial-blob':   { component: 'SurfaceRadialBlob',   file: 'SurfaceRadialBlob',   irHelper: 'surfaceRadialBlobToIR' },
  'surface.linear-fade':   { component: 'SurfaceLinearFade',   file: 'SurfaceLinearFade',   irHelper: 'surfaceLinearFadeToIR' },
  'decoration.shape-preset': { component: 'DecorationShapePreset', file: 'DecorationShapePreset', irHelper: 'decorationShapePresetToIR' },
  'decoration.line-stroke':  { component: 'DecorationLineStroke',  file: 'DecorationLineStroke',  irHelper: 'decorationLineStrokeToIR' },
  'data.delta-badge':      { component: 'DataDeltaBadge',      file: 'DataDeltaBadge',      irHelper: 'dataDeltaBadgeToIR' },
  'data.heatmap':          { component: 'DataHeatmap',          file: 'DataHeatmap',          irHelper: 'dataHeatmapToIR' },
  'data.gauge':            { component: 'DataGauge',            file: 'DataGauge',            irHelper: 'dataGaugeToIR' },
  'diagram.flow-step':     { component: 'DiagramFlowStep',     file: 'DiagramFlowStep',     irHelper: 'diagramFlowStepToIR' },
  'chrome.window-frame':   { component: 'ChromeWindowFrame',   file: 'ChromeWindowFrame',   irHelper: 'chromeWindowFrameToIR' },
  'chrome.device-frame':   { component: 'ChromeDeviceFrame',   file: 'ChromeDeviceFrame',   irHelper: 'chromeDeviceFrameToIR' },
  'annotation.leader-line': { component: 'AnnotationLeaderLine', file: 'AnnotationLeaderLine', irHelper: 'annotationLeaderLineToIR' },
  'annotation.badge':      { component: 'AnnotationBadge',      file: 'AnnotationBadge',      irHelper: 'annotationBadgeToIR' },
};

/**
 * Per-primitive prop forwarding table.
 *
 * Entries are atoms.yaml-style prop names that the primitive's IR helper
 * understands directly (so codegen forwards them verbatim). Anything not
 * listed here gets dropped into recipe metadata only — it doesn't reach
 * the primitive. `bbox` is always forwarded; we don't list it here.
 *
 * Used by `renderRecipeFile` to emit honest delegations: if a recipe
 * row's prop set intersects this list, the generated TSX threads those
 * props into the primitive call instead of stripping to bbox.
 */
const PRIMITIVE_PROPS_FORWARD: Record<string, readonly string[]> = {
  'surface.shape-fill':      ['fill', 'shape', 'radiusPx', 'border', 'shadows'],
  'surface.pattern-tile':    ['pattern', 'fgColor', 'bgColor', 'tilePx', 'featurePx', 'angleDeg'],
  'surface.radial-blob':     ['color', 'cx', 'cy', 'intensity', 'shape'],
  'surface.linear-fade':     ['color', 'direction', 'opacity', 'fadePct'],
  'decoration.shape-preset': ['preset', 'fill', 'stroke'],
  'decoration.line-stroke':  ['orientation', 'color', 'dash', 'thicknessPx'],
  'data.delta-badge':        ['value', 'direction', 'size', 'tone'],
  'data.heatmap':            ['cells', 'colorScale', 'gapPx', 'cornerPx'],
  'data.gauge':              ['value', 'max', 'color', 'trackColor', 'sweepDeg', 'thicknessPx'],
  'diagram.flow-step':       ['n', 'label', 'accent', 'shape'],
  'chrome.window-frame':     ['chrome', 'url', 'body', 'theme'],
  'chrome.device-frame':     ['device', 'screenshotSrc', 'notch'],
  'annotation.leader-line':  ['from', 'to', 'head', 'tail', 'dashed', 'color', 'thicknessPx'],
  'annotation.badge':        ['label', 'kind', 'tone', 'rotateDeg'],
};

/**
 * Per-atom constant-prop injection.
 *
 * For atoms whose id encodes a primitive-required discriminator (e.g.,
 * `ui.browser-mac` always passes `chrome: 'mac'` to chrome.window-frame;
 * `dec.brace-left` always passes `preset: 'brace-left'` to
 * decoration.shape-preset), codegen injects these constants alongside
 * the forwarded props. The recipe interface stays minimal — these constants
 * are NOT surfaced to the LLM caller, which keeps atoms.yaml's `props:`
 * block focused on user-facing knobs only.
 *
 * Keys are atom ids. Values are JS expressions (rendered as-is into the
 * primitive call), keyed by primitive-prop name.
 */
const ATOM_CONSTANT_PROPS: Record<string, Record<string, string>> = {
  // chrome.window-frame variants
  'ui.browser-mac':      { chrome: "'mac'" },
  'ui.browser-win':      { chrome: "'win'" },
  'ui.browser-minimal':  { chrome: "'minimal'" },
  'ui.terminal-window':  { chrome: "'terminal'" },

  // chrome.device-frame variants
  'ui.device-phone':     { device: "'phone'" },
  'ui.device-laptop':    { device: "'laptop'" },

  // decoration.shape-preset — atom id IS the preset name (after the namespace).
  'dec.brace-left':      { preset: "'brace-left'" },
  'dec.brace-right':     { preset: "'brace-right'" },
  'dec.brace-top':       { preset: "'brace-top'" },
  'dec.brace-bottom':    { preset: "'brace-bottom'" },
  'dec.plus':            { preset: "'plus'" },
  'dec.star-5':          { preset: "'star-5'" },
  'dec.star-6':          { preset: "'star-6'" },
  'dec.arrow-right':     { preset: "'arrow-right'" },
  'dec.arrow-left':      { preset: "'arrow-left'" },
  'dec.arrow-up':        { preset: "'arrow-up'" },
  'dec.arrow-down':      { preset: "'arrow-down'" },
  'mask.octagon':        { preset: "'octagon'" },

  // surface.linear-fade — atom id encodes which side fades.
  'bg.scrim-bottom':     { direction: "'bottom'" },
  'bg.scrim-top':        { direction: "'top'" },

  // surface.pattern-tile — atom id encodes the pattern variant.
  'bg.dot-lattice-fine':   { pattern: "'dots'", tilePx: '12', featurePx: '1' },
  'bg.dot-lattice-coarse': { pattern: "'dots'", tilePx: '24', featurePx: '1.5' },
  'bg.line-grid':          { pattern: "'lines-grid'" },
  'bg.crosshatch':         { pattern: "'crosshatch'" },
  'bg.diagonal':           { pattern: "'diagonal'" },

  // decoration.line-stroke — atom id picks dash style.
  'dec.hairline-rule':   { dash: "'solid'" },
  'dec.dotted-rule':     { dash: "'dotted'" },

  // annotation.badge variants
  'anno.stamp-draft':    { kind: "'stamp'", tone: "'danger'", label: "'DRAFT'" },
  'anno.stamp-new':      { kind: "'stamp'", tone: "'success'", label: "'NEW'" },
  'anno.stamp-internal': { kind: "'stamp'", tone: "'warn'", label: "'INTERNAL'" },
  'anno.sticker':        { kind: "'sticker'" },
  'anno.callout-bubble': { kind: "'pill'" },
  'surf.tape-band':      { kind: "'sticker'" },
};

// ---------------------------------------------------------------------------
// Helpers: name conversion + props rendering
// ---------------------------------------------------------------------------

/** Lower-camelCase a PascalCase identifier. */
function camelCase(pascal: string): string {
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Resolve a row's user-facing dotted atom id from its `match` block. */
function atomIdOf(row: AtomRow): string | undefined {
  const id = row.match?.['anchor.data_atom_id'];
  if (typeof id === 'string') return id;
  if (Array.isArray(id) && id.length > 0) return id[0];
  return undefined;
}

/**
 * Map a YAML prop entry to its TypeScript type literal.
 * Returns the rendered type expression as a string suitable for splicing
 * into `interface Props { name: <here>; }`.
 */
function tsTypeForProp(p: PropEntry): string {
  switch (p.type) {
    case 'bbox':     return 'Bbox';
    case 'color':    return 'Color';
    case 'fill':     return 'Fill';
    case 'gradient': return 'LinearGradient';
    case 'string':   return 'string';
    case 'number':   return 'number';
    case 'boolean':  return 'boolean';
    case 'enum': {
      const vs = (p.values ?? []).map(v => `'${v}'`).join(' | ');
      return vs || 'string';
    }
    case 'array': {
      const item = p.items;
      if (item === 'number')  return 'number[]';
      if (item === 'string')  return 'string[]';
      if (item === 'boolean') return 'boolean[]';
      return 'unknown[]';
    }
    case 'object':   return 'Record<string, unknown>';
    default:         return 'unknown';
  }
}

/**
 * Map a YAML prop entry to its JSON Schema definition.
 */
function jsonSchemaForProp(p: PropEntry): Record<string, unknown> {
  switch (p.type) {
    case 'bbox':
      return {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
        required: ['x', 'y', 'w', 'h'],
        additionalProperties: false,
      };
    case 'color':
      return {
        oneOf: [
          { type: 'string', pattern: '^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$' },
          {
            type: 'object',
            properties: {
              hex:   { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
              alpha: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['hex'],
            additionalProperties: false,
          },
          // Token-reference strings ('tokens.palette.accent')
          { type: 'string', pattern: '^tokens\\.[a-zA-Z0-9_.\\-]+$' },
        ],
      };
    case 'fill':
      return { type: ['string', 'object'], description: 'IR Fill or token reference' };
    case 'gradient':
      return { type: ['string', 'object'], description: 'IR LinearGradient or token reference' };
    case 'string': {
      const out: Record<string, unknown> = { type: 'string' };
      return out;
    }
    case 'number': {
      const out: Record<string, unknown> = { type: 'number' };
      if (typeof p.min === 'number') out.minimum = p.min;
      if (typeof p.max === 'number') out.maximum = p.max;
      return out;
    }
    case 'boolean': return { type: 'boolean' };
    case 'enum':    return { type: 'string', enum: p.values ?? [] };
    case 'array': {
      const item = p.items;
      if (item === 'number')  return { type: 'array', items: { type: 'number' } };
      if (item === 'string')  return { type: 'array', items: { type: 'string' } };
      if (item === 'boolean') return { type: 'array', items: { type: 'boolean' } };
      return { type: 'array' };
    }
    case 'object':  return { type: 'object', additionalProperties: true };
    default:        return {};
  }
}

interface IrImportSet {
  /** Symbols imported as `type` from `../ir/schema`. */
  schema: Set<string>;
  /** Symbols imported as `type` from `../tokens` (e.g. `LinearGradient`). */
  tokens: Set<string>;
}

/**
 * Set of TypeScript symbols this atom needs and where to import them from.
 * - `Bbox`, `Color`, `Fill`, `GroupNodeT` live in `ir/schema.ts` as type aliases.
 * - `LinearGradient` exists in `ir/schema.ts` only as a zod runtime, so we
 *   pull the type alias from `tokens/` instead.
 */
function collectIrImports(props: Record<string, PropEntry> | undefined): IrImportSet {
  const out: IrImportSet = {
    schema: new Set<string>(['GroupNodeT']),
    tokens: new Set<string>(),
  };
  if (!props) return out;
  for (const p of Object.values(props)) {
    switch (p.type) {
      case 'bbox':     out.schema.add('Bbox'); break;
      case 'color':    out.schema.add('Color'); break;
      case 'fill':     out.schema.add('Fill'); break;
      case 'gradient': out.tokens.add('LinearGradient'); break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// File-emission helpers
// ---------------------------------------------------------------------------

const HEADER = [
  '// AUTO-GENERATED from slidify/patterns/data/atoms.yaml.',
  "// DO NOT EDIT — edit atoms.yaml + run `npm run codegen-atoms` instead.",
  '',
].join('\n');

interface GeneratedRecipe {
  /** Dotted atom id (e.g. `bg.aurora-band`). */
  atomId: string;
  /** PascalCase component name. */
  component: string;
  /** Lower-camelCase IR helper name. */
  irHelper: string;
  /** Renderer version string. */
  version: string;
  /** Source row id (e.g. `atom-bg-aurora-band`). */
  rowId: string;
  /** Whether this is a composite (composes other atoms). */
  composite: boolean;
}

/**
 * Render one Tier-B TSX file. Returns the (filename, body) tuple.
 */
function renderRecipeFile(
  row: AtomRow,
  recipesByAtomId: Map<string, GeneratedRecipe>,
): { filename: string; body: string; recipe: GeneratedRecipe } {
  const r = row.renderer!;
  const atomId = atomIdOf(row);
  if (!atomId) throw new Error(`Row ${row.id} has renderer but no match.anchor.data_atom_id`);

  const props = r.props ?? {};
  const irImports = collectIrImports(props);
  const schemaTypes = [...irImports.schema].sort();
  const tokensTypes = [...irImports.tokens].sort();
  const irImportLine = `import type { ${schemaTypes.join(', ')} } from '../ir/schema';`;
  const tokensTypeImportLine = tokensTypes.length > 0
    ? `import type { ${tokensTypes.join(', ')} } from '../tokens';`
    : '';

  // Props interface
  const propLines: string[] = [];
  for (const [name, spec] of Object.entries(props)) {
    const required = spec.required === true;
    const t = tsTypeForProp(spec);
    propLines.push(`  ${name}${required ? '' : '?'}: ${t};`);
  }
  const propsInterface = propLines.length > 0
    ? `export interface ${r.component}Props {\n${propLines.join('\n')}\n}`
    : `export interface ${r.component}Props {}`;

  const cc = camelCase(r.component);
  const compositeMode = !!r.composes && r.composes.length > 0;

  let body: string;

  if (compositeMode) {
    // Composite recipe: children are IR of composed atoms.
    // Resolution order for each composed atom id:
    //   (a) another Tier-B recipe in this run    → import & call its *ToIR
    //   (b) a Tier-A primitive (PRIMITIVE_MAP)   → import & call primitive *ToIR
    //   (c) legacy atom row without renderer     → placeholder GroupNode child
    //       (lets the composite still emit; the matcher sees the legacy atom
    //        id in the IR and can resolve it server-side.)
    const composes = r.composes!;

    type Resolved =
      | { kind: 'recipe';      entry: ComposesEntry; recipe: GeneratedRecipe }
      | { kind: 'primitive';   entry: ComposesEntry; primitive: PrimitiveSpec; atomId: string }
      | { kind: 'placeholder'; entry: ComposesEntry; atomId: string };

    const resolved: Resolved[] = composes.map(c => {
      const r0 = recipesByAtomId.get(c.atom);
      if (r0) return { kind: 'recipe', entry: c, recipe: r0 };
      const prim = PRIMITIVE_MAP[c.atom];
      if (prim) return { kind: 'primitive', entry: c, primitive: prim, atomId: c.atom };
      return { kind: 'placeholder', entry: c, atomId: c.atom };
    });

    // Imports: one per unique composed-atom IR helper (from recipes/ or primitives/).
    const recipeImports = new Set<string>();
    const primitiveImports = new Set<string>();
    for (const r0 of resolved) {
      if (r0.kind === 'recipe' && r0.recipe.atomId !== atomId) {
        recipeImports.add(`import { ${r0.recipe.irHelper} } from './${r0.recipe.component}';`);
      } else if (r0.kind === 'primitive') {
        primitiveImports.add(
          `import { ${r0.primitive.irHelper} } from '../primitives/${r0.primitive.file}';`,
        );
      }
    }

    // Children IR construction.
    const childrenLines: string[] = [];
    resolved.forEach((r0, i) => {
      const inlineProps = r0.entry.props ?? {};
      const hasBboxOverride = inlineProps.bbox !== undefined;
      const bboxExpr = hasBboxOverride ? jsonStringify(inlineProps.bbox) : 'props.bbox';
      const propsObj: string[] = [];
      propsObj.push(`bbox: ${bboxExpr}`);
      for (const [k, v] of Object.entries(inlineProps)) {
        if (k === 'bbox') continue;
        propsObj.push(`${jsKeyOf(k)}: ${jsonStringify(v)}`);
      }
      const propsLit = `{ ${propsObj.join(', ')} }`;
      if (r0.kind === 'recipe') {
        childrenLines.push(`    { ...${r0.recipe.irHelper}(${propsLit} as never, tokens), zOrder: ${i * 10} },`);
      } else if (r0.kind === 'primitive') {
        // Primitive *ToIR helpers accept their own prop type — pass only bbox,
        // which every primitive accepts. Other inline props are ignored at the
        // primitive level (composite YAML rows tend to override visual knobs
        // that only Tier-B recipes consume).
        childrenLines.push(`    { ...${r0.primitive.irHelper}({ bbox: ${bboxExpr} } as Parameters<typeof ${r0.primitive.irHelper}>[0], tokens), recipeId: '${r0.atomId}', zOrder: ${i * 10} },`);
      } else {
        // Placeholder: legacy atom row without a renderer. Emit a
        // structurally-valid GroupNode whose recipeId matches the legacy id.
        childrenLines.push(`    { kind: 'group' as const, recipeId: '${r0.atomId}', bbox: ${bboxExpr}, zOrder: ${i * 10}, metadata: { role: '${r0.atomId}', placeholder: true }, children: [] },`);
      }
    });

    const importLines = new Set<string>([...recipeImports, ...primitiveImports]);

    body = [
      HEADER,
      ...[
        "import type { ReactNode } from 'react';",
        irImportLine,
        tokensTypeImportLine,
        "import { tokens as defaultTokens, type TokensApi } from '../tokens';",
        ...[...importLines].sort(),
      ].filter(Boolean),
      '',
      `export const ${r.component}Version = '${r.version}';`,
      '',
      propsInterface,
      '',
      `export default function ${r.component}(_props: ${r.component}Props): ReactNode {`,
      `  // Composite atoms render as a flat HTML preview shell. The IR emitter`,
      `  // is the authoritative composition; this preview surfaces the recipeId`,
      `  // for designers eyeballing the deck.`,
      `  return (`,
      `    <div`,
      `      data-recipe-id="${atomId}"`,
      `      data-composite="true"`,
      `      style={{`,
      `        position: 'absolute',`,
      `        left: _props.bbox.x,`,
      `        top: _props.bbox.y,`,
      `        width: _props.bbox.w,`,
      `        height: _props.bbox.h,`,
      `      }}`,
      `    />`,
      `  );`,
      `}`,
      '',
      `export function ${cc}ToIR(`,
      `  props: ${r.component}Props,`,
      `  tokens: TokensApi = defaultTokens,`,
      `): GroupNodeT {`,
      `  return {`,
      `    kind: 'group',`,
      `    recipeId: '${atomId}',`,
      `    bbox: { ...props.bbox },`,
      `    zOrder: 0,`,
      `    metadata: {`,
      `      role: '${atomId}',`,
      `      axis: '${axisOf(atomId)}',`,
      `      composite: true,`,
      `      version: '${r.version}',`,
      `    },`,
      `    children: [`,
      ...childrenLines,
      `    ],`,
      `  };`,
      `}`,
      '',
    ].join('\n');
  } else {
    // Tier-B with a primitive: thin wrapper that delegates IR composition to
    // the primitive's `*ToIR` helper but stamps the atom id as recipeId.
    const prim = PRIMITIVE_MAP[r.primitive ?? ''];
    if (!prim) {
      throw new Error(
        `Row ${row.id} (atom ${atomId}) renderer.primitive='${r.primitive}' has no matching primitive in PRIMITIVE_MAP.`,
      );
    }

    // Avoid name collisions when the recipe component name == primitive name
    // (e.g. `data.donut` -> `DataDonut` while the primitive is also `DataDonut`).
    const collide = prim.component === r.component;
    const primAlias = collide ? `_Primitive${prim.component}` : prim.component;
    const primIrAlias = collide ? `_primitive_${prim.irHelper}` : prim.irHelper;
    const primImport = collide
      ? `import { default as ${primAlias}, ${prim.irHelper} as ${primIrAlias} } from '../primitives/${prim.file}';`
      : `import ${primAlias}, { ${primIrAlias} } from '../primitives/${prim.file}';`;

    // Compute the forwarded prop set: the intersection of the recipe's
    // declared props and the primitive's known prop list. Unknown extras stay
    // on the recipe interface but get dropped into IR metadata only.
    const forwardWhitelist = PRIMITIVE_PROPS_FORWARD[r.primitive ?? ''] ?? [];
    const recipePropNames = Object.keys(props);
    const forwardedProps = forwardWhitelist.filter(p => recipePropNames.includes(p));
    const droppedProps = recipePropNames.filter(p => p !== 'bbox' && !forwardedProps.includes(p));

    // Constant primitive props injected from the atom-id (e.g., `ui.browser-mac`
    // injects `chrome: 'mac'`). These don't appear on the recipe interface —
    // they're determined by the atom row itself.
    const constantProps = ATOM_CONSTANT_PROPS[atomId] ?? {};
    // If a constant prop name collides with a forwarded prop, the forwarded
    // (caller-supplied) value wins; otherwise the constant fills the gap.
    const constantEntries = Object.entries(constantProps).filter(([k]) => !forwardedProps.includes(k));

    // Render the primitive args object literal: bbox + every forwarded prop +
    // any atom-id-derived constants. JS spread drops undefineds at runtime,
    // so a flat shape is the cleanest surface.
    const primArgsParts = [
      'bbox: props.bbox',
      ...forwardedProps.map(p => `${p}: props.${p}`),
      ...constantEntries.map(([k, v]) => `${k}: ${v}`),
    ];
    const primArgsLiteral = `{ ${primArgsParts.join(', ')} }`;

    // Recipe-level metadata stamps every dropped prop verbatim so the
    // matcher / IR-consumer still sees the user's intent even when the
    // primitive doesn't natively consume it.
    const metadataExtra = droppedProps.length > 0
      ? droppedProps.map(p => `      ${jsKeyOf(p)}: props.${p} ?? undefined,`).join('\n') + '\n'
      : '';

    const importLines = [
      "import type { ComponentProps, ReactNode } from 'react';",
      irImportLine,
      tokensTypeImportLine,
      "import { tokens as defaultTokens, type TokensApi } from '../tokens';",
      primImport,
    ].filter(Boolean);

    body = [
      HEADER,
      ...importLines,
      '',
      `export const ${r.component}Version = '${r.version}';`,
      '',
      propsInterface,
      '',
      `export default function ${r.component}(props: ${r.component}Props): ReactNode {`,
      `  // Codegen renders Tier-B recipes as a stable, recipe-id-stamped wrapper`,
      `  // around the underlying primitive. Visual fidelity comes from the`,
      `  // primitive; this wrapper exists so the IR carries the atom id.`,
      `  return (`,
      `    <div data-recipe-id="${atomId}" data-recipe-version="${r.version}">`,
      `      <${primAlias} {...(${primArgsLiteral} as unknown as ComponentProps<typeof ${primAlias}>)} />`,
      `    </div>`,
      `  );`,
      `}`,
      '',
      `export function ${cc}ToIR(`,
      `  props: ${r.component}Props,`,
      `  tokens: TokensApi = defaultTokens,`,
      `): GroupNodeT {`,
      `  // Delegate visual composition to the primitive, then re-stamp recipeId`,
      `  // to the user-facing atom id (CONTRACT-v2 §A.5). Forwarded props are`,
      `  // the intersection of recipe props and the primitive's known prop set;`,
      `  // unrecognized recipe props ride along inside metadata so reverse-mapping`,
      `  // can still recover them.`,
      `  const primitiveArgs = ${primArgsLiteral} as unknown as Parameters<typeof ${primIrAlias}>[0];`,
      `  const inner = ${primIrAlias}(primitiveArgs, tokens);`,
      `  return {`,
      `    kind: 'group',`,
      `    recipeId: '${atomId}',`,
      `    bbox: { ...props.bbox },`,
      `    zOrder: 0,`,
      `    metadata: {`,
      `      role: '${atomId}',`,
      `      axis: '${axisOf(atomId)}',`,
      `      primitive: '${r.primitive}',`,
      `      version: '${r.version}',`,
      metadataExtra +
      `    },`,
      `    children: [{ ...inner, zOrder: 0 }],`,
      `  };`,
      `}`,
      '',
    ].join('\n');
  }

  const recipe: GeneratedRecipe = {
    atomId,
    component: r.component,
    irHelper: cc + 'ToIR',
    version: r.version,
    rowId: row.id,
    composite: compositeMode,
  };
  return { filename: `${r.component}.tsx`, body, recipe };
}

/** Extract the axis (`bg`, `surf`, ...) from an atom id (`bg.aurora-band`). */
function axisOf(atomId: string): string {
  const idx = atomId.indexOf('.');
  return idx > 0 ? atomId.slice(0, idx) : atomId;
}

/** Render a JS literal for a JSON-shaped value. Strings are double-quoted. */
function jsonStringify(v: unknown): string {
  return JSON.stringify(v);
}

/** Either `JSON.stringify(v)` or the string `undefined`. */
function literalOrUndefined(v: unknown): string {
  return v === undefined ? 'undefined' : jsonStringify(v);
}

/** Quote a JS object key only if it isn't a valid identifier. */
function jsKeyOf(k: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
}

// ---------------------------------------------------------------------------
// index.ts and metadata files
// ---------------------------------------------------------------------------

function renderIndexFile(recipes: GeneratedRecipe[]): string {
  const lines: string[] = [HEADER];
  lines.push('// Re-exports for every codegen-emitted Tier-B recipe.');
  lines.push('// Atelier-v2 (M7) imports from `@slidify/components/recipes/*` via this barrel.');
  lines.push('');
  for (const r of recipes) {
    lines.push(
      `export { default as ${r.component}, ${r.irHelper}, ${r.component}Version } from './${r.component}';`,
    );
    lines.push(`export type { ${r.component}Props } from './${r.component}';`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderJsonSchema(rows: AtomRow[]): Record<string, unknown> {
  const definitions: Record<string, unknown> = {};
  const oneOf: Array<Record<string, unknown>> = [];

  for (const row of rows) {
    const r = row.renderer;
    if (!r) continue;
    if (r.tier !== 'B') continue;
    const atomId = atomIdOf(row);
    if (!atomId) continue;

    const propsSpec = r.props ?? {};
    const propsSchema: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [name, p] of Object.entries(propsSpec)) {
      propsSchema[name] = jsonSchemaForProp(p);
      if (p.required === true) required.push(name);
    }
    const def: Record<string, unknown> = {
      type: 'object',
      properties: {
        atom:    { const: atomId },
        version: { type: 'string', const: r.version },
        props: {
          type: 'object',
          properties: propsSchema,
          required,
          additionalProperties: false,
        },
      },
      required: ['atom', 'props'],
      additionalProperties: false,
    };
    definitions[atomId] = def;
    oneOf.push({ $ref: `#/definitions/${atomId}` });
  }

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: 'https://slidify.dev/atoms.schema.json',
    title: 'Slidify atom catalog (Tier-B recipes)',
    description:
      'Validates an LLM-side atom payload of the form { atom, version?, props }. ' +
      'One entry per Tier-B atom row in slidify/patterns/data/atoms.yaml.',
    oneOf,
    definitions,
  };
}

interface LockEntry {
  rowId: string;
  atomId: string;
  component: string;
  tier: AtomTier;
  version: string;
  composite: boolean;
}

interface LockFile {
  /** Schema version of THIS lock file (not the atom data). */
  lockVersion: 1;
  /** SHA-256 of atoms.yaml at codegen time. */
  atomsYamlSha256: string;
  /** Total entries (Tier-A + Tier-B with renderer blocks). */
  totalAtoms: number;
  /** Tier-B count (== generated TSX count). */
  generatedRecipes: number;
  /** Tier-A count (verified-not-generated). */
  primitivesVerified: number;
  /** Per-atom stamp. Sorted by atomId for stable diffs. */
  atoms: LockEntry[];
}

function buildLockFile(
  yamlSha: string,
  rows: AtomRow[],
  generated: GeneratedRecipe[],
  tierAVerified: number,
): LockFile {
  const atoms: LockEntry[] = [];
  for (const row of rows) {
    const r = row.renderer;
    if (!r) continue;
    const atomId = atomIdOf(row);
    if (!atomId) continue;
    atoms.push({
      rowId: row.id,
      atomId,
      component: r.component,
      tier: r.tier,
      version: r.version,
      composite: r.tier === 'B' && Array.isArray(r.composes) && r.composes.length > 0,
    });
  }
  atoms.sort((a, b) => a.atomId.localeCompare(b.atomId));
  return {
    lockVersion: 1,
    atomsYamlSha256: yamlSha,
    totalAtoms: atoms.length,
    generatedRecipes: generated.length,
    primitivesVerified: tierAVerified,
    atoms,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface BuildResult {
  rows: AtomRow[];
  recipes: GeneratedRecipe[];
  files: Map<string, string>;            // path -> body
  lock: LockFile;
  schema: Record<string, unknown>;
  yamlSha: string;
  warnings: string[];
}

function loadManifest(): { rows: AtomRow[]; sha: string; raw: string } {
  if (!existsSync(ATOMS_YAML)) {
    throw new Error(`atoms.yaml not found at ${ATOMS_YAML}`);
  }
  const raw = readFileSync(ATOMS_YAML, 'utf-8');
  const sha = createHash('sha256').update(raw).digest('hex');
  const parsed = yaml.load(raw) as Manifest;
  if (!parsed || !Array.isArray(parsed.patterns)) {
    throw new Error("atoms.yaml: missing top-level 'patterns:' list");
  }
  return { rows: parsed.patterns, sha, raw };
}

function build(): BuildResult {
  const { rows, sha } = loadManifest();
  const warnings: string[] = [];

  // 1. Validate Tier-A atoms reference existing primitive files.
  let tierAVerified = 0;
  for (const row of rows) {
    const r = row.renderer;
    if (!r || r.tier !== 'A') continue;
    const aid = atomIdOf(row);
    if (!aid) {
      warnings.push(`Tier-A row ${row.id} has no anchor.data_atom_id`);
      continue;
    }
    const prim = PRIMITIVE_MAP[aid];
    if (!prim) {
      warnings.push(`Tier-A atom ${aid} (${row.id}) is not in PRIMITIVE_MAP — skipping verification`);
      continue;
    }
    const file = join(PRIMITIVES_DIR, `${prim.file}.tsx`);
    if (!existsSync(file)) {
      throw new Error(`Tier-A primitive '${aid}' expects ${file} to exist (atoms.yaml row ${row.id}).`);
    }
    tierAVerified += 1;
  }

  // 2. Pre-index Tier-B recipes by atom id (for composite child resolution).
  const recipesByAtomId = new Map<string, GeneratedRecipe>();
  for (const row of rows) {
    const r = row.renderer;
    if (!r || r.tier !== 'B') continue;
    const aid = atomIdOf(row);
    if (!aid) continue;
    recipesByAtomId.set(aid, {
      atomId: aid,
      component: r.component,
      irHelper: camelCase(r.component) + 'ToIR',
      version: r.version,
      rowId: row.id,
      composite: Array.isArray(r.composes) && r.composes.length > 0,
    });
  }

  // 3. Render each Tier-B file.
  const files = new Map<string, string>();
  const recipes: GeneratedRecipe[] = [];
  for (const row of rows) {
    const r = row.renderer;
    if (!r || r.tier !== 'B') continue;
    const aid = atomIdOf(row);
    if (!aid) {
      warnings.push(`Tier-B row ${row.id} skipped — no anchor.data_atom_id`);
      continue;
    }
    try {
      const { filename, body, recipe } = renderRecipeFile(row, recipesByAtomId);
      files.set(join(RECIPES_DIR, filename), body);
      recipes.push(recipe);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(`Failed to render ${row.id}: ${msg}`);
    }
  }

  // 4. Index file.
  recipes.sort((a, b) => a.component.localeCompare(b.component));
  files.set(RECIPES_INDEX, renderIndexFile(recipes));

  // 5. Lock + schema.
  const lock = buildLockFile(sha, rows, recipes, tierAVerified);
  const schema = renderJsonSchema(rows);

  return { rows, recipes, files, lock, schema, yamlSha: sha, warnings };
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function writeAll(result: BuildResult): { changed: number; written: string[] } {
  ensureDir(RECIPES_DIR);

  // Wipe old generated files (but only AUTO-GENERATED ones) to detect deletions.
  const stalePaths: string[] = [];
  if (existsSync(RECIPES_DIR)) {
    for (const f of readdirSync(RECIPES_DIR)) {
      const full = join(RECIPES_DIR, f);
      if (!statSync(full).isFile()) continue;
      if (!result.files.has(full)) stalePaths.push(full);
    }
  }
  for (const p of stalePaths) {
    const body = readFileSync(p, 'utf-8');
    if (body.startsWith('// AUTO-GENERATED')) {
      rmSync(p);
    }
  }

  const written: string[] = [];
  let changed = 0;
  for (const [path, body] of result.files) {
    const cur = existsSync(path) ? readFileSync(path, 'utf-8') : null;
    if (cur !== body) {
      writeFileSync(path, body);
      changed += 1;
    }
    written.push(path);
  }

  const lockBody = JSON.stringify(result.lock, null, 2) + '\n';
  if (!existsSync(LOCK_FILE) || readFileSync(LOCK_FILE, 'utf-8') !== lockBody) {
    writeFileSync(LOCK_FILE, lockBody);
    changed += 1;
  }
  written.push(LOCK_FILE);

  const schemaBody = JSON.stringify(result.schema, null, 2) + '\n';
  if (!existsSync(SCHEMA_FILE) || readFileSync(SCHEMA_FILE, 'utf-8') !== schemaBody) {
    writeFileSync(SCHEMA_FILE, schemaBody);
    changed += 1;
  }
  written.push(SCHEMA_FILE);

  return { changed, written };
}

interface DriftReport {
  drifted: boolean;
  details: string[];
}

function checkDrift(result: BuildResult): DriftReport {
  const details: string[] = [];

  // 1. Lock file drift.
  const expectedLock = JSON.stringify(result.lock, null, 2) + '\n';
  const actualLock = existsSync(LOCK_FILE) ? readFileSync(LOCK_FILE, 'utf-8') : '<missing>';
  if (actualLock !== expectedLock) {
    details.push(`atoms.lock.json out of date (re-run \`npm run codegen-atoms\`)`);
    if (actualLock === '<missing>') {
      details.push('  reason: file does not exist');
    } else {
      // Identify a meaningful subset of the diff: yamlSha mismatch is the
      // most informative single line.
      try {
        const a = JSON.parse(actualLock);
        if (a.atomsYamlSha256 !== result.yamlSha) {
          details.push(`  reason: atoms.yaml SHA changed (${a.atomsYamlSha256.slice(0, 12)}… → ${result.yamlSha.slice(0, 12)}…)`);
        } else if (a.generatedRecipes !== result.lock.generatedRecipes) {
          details.push(`  reason: generated count drifted (${a.generatedRecipes} → ${result.lock.generatedRecipes})`);
        } else {
          details.push('  reason: per-atom stamp mismatch (likely renderer.version or component name change)');
        }
      } catch {
        details.push('  reason: existing lock file is unparseable');
      }
    }
  }

  // 2. Schema drift.
  const expectedSchema = JSON.stringify(result.schema, null, 2) + '\n';
  const actualSchema = existsSync(SCHEMA_FILE) ? readFileSync(SCHEMA_FILE, 'utf-8') : '<missing>';
  if (actualSchema !== expectedSchema) {
    details.push(`atoms.schema.json out of date`);
  }

  // 3. TSX file drift — for every expected file, compare body byte-stable.
  for (const [path, body] of result.files) {
    const cur = existsSync(path) ? readFileSync(path, 'utf-8') : '<missing>';
    if (cur !== body) {
      const rel = path.replace(REPO_ROOT + '/', '');
      details.push(`${rel} drifted`);
    }
  }

  // 4. Stale TSX files (committed but no longer in manifest).
  if (existsSync(RECIPES_DIR)) {
    for (const f of readdirSync(RECIPES_DIR)) {
      const full = join(RECIPES_DIR, f);
      if (!statSync(full).isFile()) continue;
      if (result.files.has(full)) continue;
      const body = readFileSync(full, 'utf-8');
      if (body.startsWith('// AUTO-GENERATED')) {
        const rel = full.replace(REPO_ROOT + '/', '');
        details.push(`${rel} is stale (no matching atom row)`);
      }
    }
  }

  return { drifted: details.length > 0, details };
}

function main(): number {
  const argv = process.argv.slice(2);
  const checkMode = argv.includes('--check');

  const result = build();

  if (result.warnings.length > 0) {
    process.stderr.write(`codegen-atoms: ${result.warnings.length} warning(s)\n`);
    for (const w of result.warnings) process.stderr.write(`  - ${w}\n`);
  }

  if (checkMode) {
    const drift = checkDrift(result);
    if (drift.drifted) {
      process.stderr.write('codegen-atoms --check: DRIFT DETECTED\n');
      for (const d of drift.details) process.stderr.write(`  - ${d}\n`);
      process.stderr.write('\nFix: run `npm run codegen-atoms` and commit the result.\n');
      return 1;
    }
    process.stdout.write(`codegen-atoms --check: OK (${result.recipes.length} recipes, sha=${result.yamlSha.slice(0, 12)}…)\n`);
    return 0;
  }

  const { changed, written } = writeAll(result);
  process.stdout.write(
    `codegen-atoms: wrote ${written.length} file(s), ${changed} changed.\n` +
      `  Tier-B recipes: ${result.recipes.length}\n` +
      `  Tier-A primitives verified: ${result.lock.primitivesVerified}\n` +
      `  atoms.yaml sha: ${result.yamlSha.slice(0, 12)}…\n`,
  );
  return 0;
}

// Allow being imported by tests; auto-run only when invoked as a script.
const isMainModule = process.argv[1] === __filename;
if (isMainModule) {
  process.exit(main());
}

export {
  build,
  buildLockFile,
  checkDrift,
  loadManifest,
  PRIMITIVE_MAP,
  PRIMITIVE_PROPS_FORWARD,
  renderRecipeFile,
  renderIndexFile,
  renderJsonSchema,
  writeAll,
  RECIPES_DIR,
  LOCK_FILE,
  SCHEMA_FILE,
  ATOMS_YAML,
};
export type { AtomRow, BuildResult, GeneratedRecipe, LockFile, RendererBlock, PropEntry };
