#!/usr/bin/env node
/**
 * Extract Tailwind 4's theme tokens into the JSON shape slidify consumes.
 *
 * Tailwind 4 is CSS-first: tokens live in `theme.css` as `@theme { --foo: ... }`
 * declarations. We parse that file directly, convert OKLCH colors to sRGB hex,
 * and map token namespaces (`--color-*`, `--radius-*`, `--text-*`, …) to the
 * Tailwind utility-class names slidify recognizes (`bg-red-500`, `rounded-xl`,
 * `text-4xl`, …).
 *
 * Usage:
 *   node extract-tailwind.js > ../../engines/slidify/slidify/patterns/data/tailwind.json
 */

const fs = require('fs');
const path = require('path');
const culori = require('culori');

const TWPKG = path.join(__dirname, 'node_modules/tailwindcss');
const TW_VERSION = require(path.join(TWPKG, 'package.json')).version;
const THEME_CSS = fs.readFileSync(path.join(TWPKG, 'theme.css'), 'utf-8');

// Pull every `--var: value;` declaration out of the @theme block(s).
function parseTokens(css) {
  const out = {};
  const decl = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = decl.exec(css)) !== null) {
    out[`--${m[1]}`] = m[2].trim().replace(/\s+/g, ' ');
  }
  return out;
}

const tokens = parseTokens(THEME_CSS);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toHex(value) {
  // OKLCH / hsl / rgb / hex → 6-hex
  try {
    const parsed = culori.parse(value);
    if (!parsed) return null;
    const hex = culori.formatHex(parsed);
    return hex ? hex.toLowerCase() : null;
  } catch {
    return null;
  }
}

function pxOf(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s.endsWith('rem')) return Math.round(parseFloat(s) * 16);
  if (s.endsWith('px')) return parseFloat(s);
  if (s.endsWith('em')) return Math.round(parseFloat(s) * 16);
  if (/^[\d.]+$/.test(s)) return parseFloat(s);
  return null;
}

function bareFloat(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s.endsWith('em')) return parseFloat(s);
  if (/^-?[\d.]+$/.test(s)) return parseFloat(s);
  return null;
}

// ---------------------------------------------------------------------------
// Colors:  --color-{family}-{shade}  (or  --color-{name}  for white/black/etc)
// ---------------------------------------------------------------------------

const colors = {};
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--color-')) continue;
  const name = k.slice('--color-'.length);
  const hex = toHex(v);
  if (hex !== null) colors[name] = hex;
  else if (v === 'transparent') colors[name] = 'transparent';
}
// Always include white, black, transparent (Tailwind always provides these).
colors['white'] = '#ffffff';
colors['black'] = '#000000';
colors['transparent'] = 'transparent';

// ---------------------------------------------------------------------------
// Border radius:  --radius-{size}
// ---------------------------------------------------------------------------

const border_radius = {};
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--radius-')) continue;
  const size = k.slice('--radius-'.length);
  const px = pxOf(v);
  if (px === null) continue;
  border_radius[`rounded-${size}`] = `${px}px`;
}
// Tailwind 4 emits `rounded` (no suffix) → uses --radius? Actually `rounded` in
// Tailwind 4 maps to `var(--radius-sm)` by default. Encode the alias.
if (border_radius['rounded-sm']) {
  border_radius['rounded'] = border_radius['rounded-sm'];
}
border_radius['rounded-none'] = '0px';
border_radius['rounded-full'] = '9999px';

// ---------------------------------------------------------------------------
// Box shadow: --shadow-{size}
// ---------------------------------------------------------------------------

const shadow = {};
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--shadow-')) continue;
  const size = k.slice('--shadow-'.length);
  shadow[`shadow-${size}`] = v;
}
shadow['shadow-none'] = 'none';
if (shadow['shadow-sm']) shadow['shadow'] = shadow['shadow-sm'];

// ---------------------------------------------------------------------------
// Font size: --text-{size} (paired with --text-{size}--line-height)
// ---------------------------------------------------------------------------

const font_size = {};
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--text-')) continue;
  // Skip the line-height pair entries; we'll merge below.
  if (k.endsWith('--line-height')) continue;
  const size = k.slice('--text-'.length);
  const size_px = pxOf(v);
  const lhRaw = tokens[`--text-${size}--line-height`];
  let line_height_px = null;
  if (lhRaw) {
    const numeric = bareFloat(lhRaw);
    line_height_px = numeric !== null ? numeric : pxOf(lhRaw);
  }
  if (size_px !== null) {
    font_size[`text-${size}`] = { size_px, line_height_px };
  }
}

// ---------------------------------------------------------------------------
// Font weight, tracking, leading, opacity
// ---------------------------------------------------------------------------

const font_weight = {};
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--font-weight-')) continue;
  const w = k.slice('--font-weight-'.length);
  font_weight[`font-${w}`] = parseInt(v, 10);
}

const tracking = {};
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--tracking-')) continue;
  const name = k.slice('--tracking-'.length);
  const f = bareFloat(v);
  if (f !== null) tracking[`tracking-${name}`] = f;
}

const leading = {};
for (const [k, v] of Object.entries(tokens)) {
  if (!k.startsWith('--leading-')) continue;
  const name = k.slice('--leading-'.length);
  const f = bareFloat(v);
  if (f !== null) leading[`leading-${name}`] = f;
}

const opacity = {};
// Tailwind 4 doesn't ship discrete opacity tokens by default; emit the
// canonical 0..100 step set used by the bg-{color}/{n} alpha syntax.
for (let i = 0; i <= 100; i += 5) {
  opacity[`opacity-${i}`] = i / 100;
}

// ---------------------------------------------------------------------------
// Spacing scale: in Tailwind 4 there's a single `--spacing: 0.25rem` token
// and `p-N` resolves to `calc(var(--spacing) * N)`. We materialize the integer
// values 0..96 plus the half-steps the docs document.
// ---------------------------------------------------------------------------

const spacing_unit = pxOf(tokens['--spacing'] || '0.25rem') ?? 4;
const spacing_px = { '0': 0, 'px': 1 };
const fractional = ['0.5', '1.5', '2.5', '3.5'];
for (const f of fractional) {
  spacing_px[f] = Math.round(parseFloat(f) * spacing_unit);
}
const integers = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40,
  44, 48, 52, 56, 60, 64, 72, 80, 96,
];
for (const i of integers) spacing_px[String(i)] = i * spacing_unit;

// ---------------------------------------------------------------------------
// Gradient direction (Tailwind 4 still uses the same bg-gradient-to-* names)
// ---------------------------------------------------------------------------
const gradient_direction = {
  'bg-gradient-to-t':  0,
  'bg-gradient-to-tr': 45,
  'bg-gradient-to-r':  90,
  'bg-gradient-to-br': 135,
  'bg-gradient-to-b':  180,
  'bg-gradient-to-bl': 225,
  'bg-gradient-to-l':  270,
  'bg-gradient-to-tl': 315,
};

// ---------------------------------------------------------------------------
// "Must raster" tokens: derived from blur / backdrop-blur / mix-blend / filters.
// ---------------------------------------------------------------------------
const rasterize_only = new Set();
for (const k of Object.keys(tokens)) {
  if (k.startsWith('--blur-')) {
    rasterize_only.add(`blur-${k.slice('--blur-'.length)}`);
  }
}
for (const name of [
  'blur',
  'backdrop-blur', 'backdrop-blur-sm', 'backdrop-blur', 'backdrop-blur-md',
  'backdrop-blur-lg', 'backdrop-blur-xl', 'backdrop-blur-2xl', 'backdrop-blur-3xl',
  'mix-blend-multiply', 'mix-blend-screen', 'mix-blend-overlay',
  'mix-blend-difference', 'mix-blend-exclusion', 'mix-blend-color-burn',
  'mix-blend-color-dodge', 'mix-blend-hard-light', 'mix-blend-soft-light',
  'filter', 'saturate-0', 'grayscale', 'invert', 'sepia',
]) {
  rasterize_only.add(name);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const out = {
  version: `tailwind-${TW_VERSION}`,
  comment:
    'Auto-generated from tailwindcss/theme.css via tools/pattern-gen/extract-tailwind.js. Do not hand-edit; run `make patterns` (or `node tools/pattern-gen/extract-tailwind.js`) to regenerate.',
  colors,
  border_radius,
  shadow,
  font_size,
  font_weight,
  tracking,
  leading,
  spacing_px,
  gradient_direction,
  opacity,
  rasterize_only: [...rasterize_only].sort(),
};

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
