#!/usr/bin/env bun
/**
 * Generate multi-file design system assets from DESIGN.md files.
 *
 * Pipeline per system:
 *   DESIGN.md → [regex extraction] → tokens.json
 *                                   → colors_and_type.css
 *                                   → SKILL.md
 *                                   → preview/*.html (copied from _templates/)
 *
 * Usage:
 *   bun scripts/generate-design-system-assets.ts
 *   bun scripts/generate-design-system-assets.ts --ids claude,stripe
 *   bun scripts/generate-design-system-assets.ts --force
 *   bun scripts/generate-design-system-assets.ts --dry-run
 */

import { readdir, readFile, writeFile, stat, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import type { DesignSystemTokens } from '../packages/contracts/src/api/design-system-tokens.js';

const CONTENT_DIR = path.join(import.meta.dir, '..', 'content', 'design-systems');
const TEMPLATES_DIR = path.join(CONTENT_DIR, '_templates');

const TEMPLATE_FILES = [
  'color_palette.html',
  'type_specimen.html',
  'components.html',
  'spacing_and_rules.html',
  'brand_motifs.html',
];

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const idsArg = args.find((a) => a.startsWith('--ids='))?.split('=')[1]
  ?? (args.includes('--ids') ? args[args.indexOf('--ids') + 1] : null);
const filterIds = idsArg ? new Set(idsArg.split(',').map((s) => s.trim())) : null;

// ── Color extraction ─────────────────────────────────────────────────
function extractAllColors(raw: string): Array<{ name: string; hex: string; context: string }> {
  const colors: Array<{ name: string; hex: string; context: string }> = [];
  const seen = new Set<string>();

  const reB = /\*\*([A-Za-z][A-Za-z0-9 /&()+_'-]{1,50}?)\*\*\s*\(?\s*[`']?(#[0-9a-fA-F]{6})\b/g;
  let m: RegExpExecArray | null;
  while ((m = reB.exec(raw)) !== null) {
    const name = m[1].trim();
    const hex = m[2].toLowerCase();
    const key = hex;
    if (seen.has(key)) continue;
    seen.add(key);
    const lineIdx = raw.lastIndexOf('\n', m.index);
    const lineEnd = raw.indexOf('\n', m.index);
    const context = raw.slice(lineIdx + 1, lineEnd === -1 ? undefined : lineEnd).trim();
    colors.push({ name, hex, context });
  }
  return colors;
}

function mapToSemanticRoles(
  colors: Array<{ name: string; hex: string; context: string }>,
): DesignSystemTokens['colors'] {
  function luminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lin = (c: number) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function pick(hints: string[]): string | null {
    for (const h of hints) {
      const found = colors.find((c) => c.name.toLowerCase().includes(h) || c.context.toLowerCase().includes(h));
      if (found) return found.hex;
    }
    return null;
  }

  const paper = pick(['page background', 'background', 'canvas', 'paper', 'parchment']) ?? '#ffffff';
  const ink = pick(['primary text', 'near black', 'foreground', 'ink', 'heading text']) ?? '#111111';
  const slate = pick(['secondary body', 'olive gray', 'muted text', 'slate', 'secondary text', 'caption text', 'tertiary text']) ?? '#666666';
  const signal = pick(['brand cta', 'brand accent', 'accent', 'signal', 'brand primary', 'primary brand', 'cta', 'brand'])
    ?? colors.find((c) => {
      const l = luminance(c.hex);
      return l > 0.05 && l < 0.5;
    })?.hex
    ?? '#3b82f6';
  const bone = pick(['secondary surface', 'card surface', 'bone', 'ivory', 'subtle'])
    ?? colors.find((c) => {
      const l = luminance(c.hex);
      return l > 0.7 && l < 0.95 && c.hex !== paper;
    })?.hex
    ?? '#f5f5f5';
  const border = pick(['border', 'divider', 'rule', 'separator']) ?? '#e5e5e5';
  const surface = pick(['card', 'container', 'surface']) ?? bone;

  const coreHexes = new Set([paper, ink, slate, signal, bone, border, surface]);
  const extended: Record<string, string> = {};
  for (const c of colors) {
    if (!coreHexes.has(c.hex)) {
      const key = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (key && !extended[key]) extended[key] = c.hex;
    }
  }

  const semantic: DesignSystemTokens['colors']['semantic'] = {};
  const success = pick(['success', 'positive', 'green']);
  const warning = pick(['warning', 'caution', 'amber', 'yellow']);
  const danger = pick(['error', 'danger', 'destructive', 'red', 'crimson']);
  const info = pick(['info', 'information', 'blue']);
  if (success) semantic.success = success;
  if (warning) semantic.warning = warning;
  if (danger) semantic.danger = danger;
  if (info) semantic.info = info;

  return { paper, ink, slate, signal, bone, border, surface, extended, semantic };
}

// ── Typography extraction ────────────────────────────────────────────
function extractTypography(raw: string): DesignSystemTokens['typography'] {
  const section = extractSection(raw, '3');

  // Extract font families
  const fontLines = section.match(/\*\*(?:Headline|Display|Hero|Heading)\*\*.*?`([^`]+)`/i);
  const bodyLines = section.match(/\*\*(?:Body|UI|Text)\*\*.*?`([^`]+)`/i);
  const monoLines = section.match(/\*\*(?:Code|Mono|Monospace)\*\*.*?`([^`]+)`/i);

  const fontDisplay = fontLines?.[1] ?? 'system-ui, sans-serif';
  const fontBody = bodyLines?.[1] ?? fontDisplay;
  const fontMono = monoLines?.[1] ?? 'ui-monospace, monospace';

  // Parse hierarchy table — header-aware column mapping
  const ramp: DesignSystemTokens['typography']['ramp'] = [];
  const tableLines = section.split('\n').filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
  let colMap: Record<string, number> = {};
  let headerDone = false;

  for (const line of tableLines) {
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;

    // Detect header row
    if (!headerDone && cells[0].toLowerCase() === 'role') {
      cells.forEach((c, i) => { colMap[c.toLowerCase()] = i; });
      continue;
    }
    // Detect separator row
    if (cells.every((c) => /^[-:]+$/.test(c))) { headerDone = true; continue; }
    if (!headerDone && Object.keys(colMap).length === 0) continue;
    headerDone = true;

    const col = (name: string): string => {
      const idx = colMap[name];
      return idx !== undefined ? (cells[idx] ?? '') : '';
    };

    const role = col('role') || cells[0] || '';
    const font = col('font') || col('font family') || '';
    const sizeRaw = col('size') || col('font size') || cells[colMap['role'] !== undefined ? 1 : 2] || '';
    const weightRaw = col('weight') || col('font weight') || '';
    const lhRaw = col('line height') || col('line-height') || '';
    const lsRaw = col('letter spacing') || col('letter-spacing') || '';

    const sizeClean = sizeRaw.match(/(\d+(?:\.\d+)?px)/)?.[1];
    const weightClean = parseInt(weightRaw) || 400;
    const lhClean = lhRaw.match(/([\d.]+)/)?.[1] ?? '1.5';
    const lsClean = !lsRaw || lsRaw.trim() === 'normal' ? '0' : lsRaw.match(/([-\d.]+(?:em|px))/)?.[1] ?? '0';

    const fontLower = font.toLowerCase();
    let fontKey: 'display' | 'body' | 'mono' | 'ui' = 'body';
    if (fontLower.includes('mono') || fontLower.includes('code')) fontKey = 'mono';
    else if (fontLower.includes('display') || fontLower.includes('serif') || fontLower.includes('headline') || fontLower.includes(fontDisplay.split(',')[0].replace(/'/g, '').trim().toLowerCase())) fontKey = 'display';
    else if (fontLower.includes('ui') || fontLower.includes('sans') || fontLower.includes('geist')) fontKey = 'ui';

    // Infer fontKey from role name when font column is absent
    if (!font) {
      const roleLower = role.toLowerCase();
      if (roleLower.includes('hero') || roleLower.includes('display') || roleLower.includes('heading') || roleLower.includes('headline') || roleLower.includes('title')) fontKey = 'display';
      else if (roleLower.includes('code') || roleLower.includes('mono') || roleLower.includes('kicker') || roleLower.includes('badge') || roleLower.includes('meta')) fontKey = 'mono';
      else if (roleLower.includes('caption') || roleLower.includes('label') || roleLower.includes('overline') || roleLower.includes('nav') || roleLower.includes('button')) fontKey = 'ui';
    }

    if (sizeClean) {
      ramp.push({
        role: role.replace(/[*`]/g, '').trim(),
        fontKey,
        size: sizeClean,
        weight: weightClean,
        lineHeight: lhClean,
        letterSpacing: lsClean,
      });
    }
  }

  // Infer Google Fonts URL from font names
  const googleFontsUrl = inferGoogleFontsUrl(fontDisplay, fontBody, fontMono);

  return { fontDisplay, fontBody, fontMono, ramp, googleFontsUrl };
}

function inferGoogleFontsUrl(...faces: string[]): string | undefined {
  const googleFontMap: Record<string, string> = {
    'inter': 'Inter:wght@400;500;600;700',
    'roboto': 'Roboto:wght@400;500;700',
    'roboto flex': 'Roboto+Flex:wght@400;500;700',
    'source serif 4': 'Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700',
    'fraunces': 'Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700',
    'geist': 'Geist:wght@400;500;600;700',
    'jetbrains mono': 'JetBrains+Mono:wght@400;500;700',
    'ibm plex sans': 'IBM+Plex+Sans:wght@400;500;600;700',
    'ibm plex mono': 'IBM+Plex+Mono:wght@400;500;700',
    'noto sans': 'Noto+Sans:wght@400;500;700',
    'space grotesk': 'Space+Grotesk:wght@400;500;700',
    'space mono': 'Space+Mono:wght@400;700',
    'playfair display': 'Playfair+Display:wght@400;500;600;700',
    'dm sans': 'DM+Sans:wght@400;500;700',
    'plus jakarta sans': 'Plus+Jakarta+Sans:wght@400;500;600;700',
    'manrope': 'Manrope:wght@400;500;600;700',
    'work sans': 'Work+Sans:wght@400;500;600;700',
    'nunito sans': 'Nunito+Sans:wght@400;500;600;700',
    'fira sans': 'Fira+Sans:wght@400;500;600;700',
    'open sans': 'Open+Sans:wght@400;500;600;700',
    'lato': 'Lato:wght@400;700',
    'poppins': 'Poppins:wght@400;500;600;700',
    'montserrat': 'Montserrat:wght@400;500;600;700',
    'raleway': 'Raleway:wght@400;500;600;700',
  };

  const families: string[] = [];
  for (const face of faces) {
    const primary = face.split(',')[0].replace(/'/g, '').trim().toLowerCase();
    const mapped = googleFontMap[primary];
    if (mapped && !families.includes(mapped)) families.push(mapped);
  }

  if (families.length === 0) return undefined;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}

// ── Spacing extraction ───────────────────────────────────────────────
function extractSpacing(raw: string): DesignSystemTokens['spacing'] {
  const section = extractSection(raw, '5');
  const baseMatch = section.match(/base\s*(?:unit)?[:=]\s*(\d+)\s*px/i);
  const base = baseMatch ? parseInt(baseMatch[1]) : 8;

  const scale: Record<string, string> = {};
  const scaleRegex = /(\d+)\s*px/g;
  const scaleSection = section.match(/scale[:=]?\s*([\d\s,px;]+)/i)?.[1];
  if (scaleSection) {
    let m: RegExpExecArray | null;
    let idx = 1;
    while ((m = scaleRegex.exec(scaleSection)) !== null) {
      scale[`s-${idx}`] = `${m[1]}px`;
      idx++;
    }
  }

  if (Object.keys(scale).length === 0) {
    const defaults = [4, 8, 16, 24, 32, 48, 64, 96];
    defaults.forEach((v, i) => { scale[`s-${i + 1}`] = `${v}px`; });
  }

  return { base, scale };
}

// ── Radii extraction ─────────────────────────────────────────────────
function extractRadii(raw: string): DesignSystemTokens['radii'] {
  const section = extractSection(raw, '5');
  const defaults = { none: '0', sm: '4px', md: '8px', lg: '16px', full: '999px' };

  function findRadius(hints: string[]): string | null {
    for (const h of hints) {
      const m = section.match(new RegExp(`${h}[^\\n]*?(\\d+)\\s*px`, 'i'));
      if (m) return `${m[1]}px`;
    }
    return null;
  }

  return {
    none: '0',
    sm: findRadius(['sharp', 'subtle', 'small', '4px']) ?? defaults.sm,
    md: findRadius(['comfort', 'standard', 'medium', '8px', 'default']) ?? defaults.md,
    lg: findRadius(['generous', 'large', '16px', '12px']) ?? defaults.lg,
    full: findRadius(['maximum', 'pill', 'full', '999']) ?? defaults.full,
  };
}

// ── Depth extraction ─────────────────────────────────────────────────
function extractDepth(raw: string): DesignSystemTokens['depth'] {
  const section = extractSection(raw, '6');
  const depth: DesignSystemTokens['depth'] = [];

  const tableRegex = /\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/g;
  let m: RegExpExecArray | null;
  let level = 0;
  while ((m = tableRegex.exec(section)) !== null) {
    const [, name, treatment, use] = m;
    if (name.trim().toLowerCase().includes('level') || name.includes('---')) continue;
    if (/^-+$/.test(name.trim())) continue;
    depth.push({
      level: level++,
      name: name.trim().replace(/[*`]/g, ''),
      treatment: treatment.trim().replace(/[*`]/g, ''),
    });
  }

  if (depth.length === 0) {
    depth.push(
      { level: 0, name: 'Flat', treatment: 'none' },
      { level: 1, name: 'Border', treatment: '1px solid var(--border)' },
      { level: 2, name: 'Elevated', treatment: '0 2px 8px rgba(0,0,0,0.08)' },
    );
  }

  return depth;
}

// ── Component extraction ─────────────────────────────────────────────
function extractComponents(raw: string, radii: DesignSystemTokens['radii']): DesignSystemTokens['components'] {
  const section = extractSection(raw, '4');

  function findValue(hints: string[], fallback: string): string {
    for (const h of hints) {
      const m = section.match(new RegExp(`${h}[^\\n]*?(\\d+)\\s*px`, 'i'));
      if (m) return `${m[1]}px`;
    }
    return fallback;
  }

  return {
    buttonRadius: findValue(['button.*radius', 'radius.*button'], radii.md),
    buttonPaddingBlock: findValue(['button.*padding.*vertical', 'padding.*block'], '10px'),
    buttonPaddingInline: findValue(['button.*padding.*horizontal', 'padding.*inline'], '20px'),
    cardRadius: findValue(['card.*radius', 'radius.*card', 'container.*radius'], radii.md),
    cardBorder: '1px solid var(--border)',
    cardShadow: section.includes('shadow') && !section.match(/no\s*shadow/i)
      ? '0 2px 8px rgba(0,0,0,0.08)'
      : 'none',
  };
}

// ── Meta extraction ──────────────────────────────────────────────────
function extractMeta(raw: string, id: string): DesignSystemTokens['meta'] {
  const titleMatch = /^#\s+(.+?)\s*$/m.exec(raw);
  const title = titleMatch?.[1]
    ?.replace(/^Design System (Inspired by|for)\s+/i, '')
    .trim() ?? id;
  const category = /^>\s*Category:\s*(.+?)\s*$/im.exec(raw)?.[1] ?? 'Uncategorized';
  const summaryLines = raw.split(/\r?\n/);
  const h1Idx = summaryLines.findIndex((l) => /^#\s+/.test(l));
  const afterH1 = h1Idx >= 0 ? summaryLines.slice(h1Idx + 1) : [];
  const nextH = afterH1.findIndex((l) => /^#{1,6}\s+/.test(l));
  const window = (nextH === -1 ? afterH1 : afterH1.slice(0, nextH))
    .join('\n').replace(/^>\s*Category:.*$/gim, '').replace(/^>\s*/gm, '').trim();
  const summary = window.split(/\n\n/)[0]?.slice(0, 240) ?? '';
  const surfaceMatch = /^>\s*Surface:\s*(.+?)\s*$/im.exec(raw);
  const surface = (['web', 'image', 'video', 'audio'] as const).includes(
    surfaceMatch?.[1]?.trim().toLowerCase() as any,
  )
    ? (surfaceMatch![1].trim().toLowerCase() as 'web' | 'image' | 'video' | 'audio')
    : 'web';

  return { id, title, category, summary, surface };
}

// ── Section helpers ──────────────────────────────────────────────────
function extractSection(raw: string, num: string): string {
  const re = new RegExp(`## ${num}\\..*?\\n([\\s\\S]*?)(?=\\n## \\d|$)`);
  return re.exec(raw)?.[1] ?? '';
}

// ── Full extraction pipeline ─────────────────────────────────────────
function extractTokens(raw: string, id: string): DesignSystemTokens {
  const allColors = extractAllColors(raw);
  const colors = mapToSemanticRoles(allColors);
  const typography = extractTypography(raw);
  const spacing = extractSpacing(raw);
  const radii = extractRadii(raw);
  const depth = extractDepth(raw);
  const components = extractComponents(raw, radii);
  const meta = extractMeta(raw, id);

  return {
    version: 1,
    meta,
    colors,
    typography,
    spacing,
    radii,
    depth,
    components,
  };
}

// ── CSS generation ───────────────────────────────────────────────────
function generateCss(tokens: DesignSystemTokens): string {
  const lines: string[] = [];
  lines.push(`/* ${tokens.meta.title} — Design System Tokens */`);
  lines.push(`/* Auto-generated from DESIGN.md — do not hand-edit */`);
  lines.push('');

  if (tokens.typography.googleFontsUrl) {
    lines.push(`@import url('${tokens.typography.googleFontsUrl}');`);
    lines.push('');
  }

  lines.push(':root {');

  // Colors
  lines.push('  /* ── Colors ── */');
  lines.push(`  --paper:   ${tokens.colors.paper};`);
  lines.push(`  --ink:     ${tokens.colors.ink};`);
  lines.push(`  --slate:   ${tokens.colors.slate};`);
  lines.push(`  --signal:  ${tokens.colors.signal};`);
  lines.push(`  --bone:    ${tokens.colors.bone};`);
  lines.push(`  --border:  ${tokens.colors.border};`);
  lines.push(`  --surface: ${tokens.colors.surface};`);

  if (Object.keys(tokens.colors.extended).length > 0) {
    lines.push('');
    lines.push('  /* Extended palette */');
    for (const [name, hex] of Object.entries(tokens.colors.extended)) {
      lines.push(`  --color-${name}: ${hex};`);
    }
  }

  const { semantic } = tokens.colors;
  if (semantic.success || semantic.warning || semantic.danger || semantic.info) {
    lines.push('');
    lines.push('  /* Semantic */');
    if (semantic.success) lines.push(`  --success: ${semantic.success};`);
    if (semantic.warning) lines.push(`  --warning: ${semantic.warning};`);
    if (semantic.danger) lines.push(`  --danger:  ${semantic.danger};`);
    if (semantic.info) lines.push(`  --info:    ${semantic.info};`);
  }

  // Semantic aliases
  lines.push('');
  lines.push('  /* Semantic aliases */');
  lines.push('  --canvas:     var(--paper);');
  lines.push('  --text:       var(--ink);');
  lines.push('  --text-muted: var(--slate);');
  lines.push('  --accent:     var(--signal);');

  // Typography
  lines.push('');
  lines.push('  /* ── Typography ── */');
  lines.push(`  --font-display: ${tokens.typography.fontDisplay};`);
  lines.push(`  --font-body:    ${tokens.typography.fontBody};`);
  lines.push(`  --font-mono:    ${tokens.typography.fontMono};`);
  if (tokens.typography.fontUi) {
    lines.push(`  --font-ui:      ${tokens.typography.fontUi};`);
  }

  if (tokens.typography.ramp.length > 0) {
    lines.push('');
    lines.push('  /* Type ramp */');
    for (const entry of tokens.typography.ramp) {
      const slug = entry.role.toLowerCase().replace(/[\s/]+/g, '-').replace(/[^a-z0-9-]/g, '');
      lines.push(`  --t-${slug}: ${entry.size};`);
    }
  }

  // Spacing
  lines.push('');
  lines.push('  /* ── Spacing ── */');
  for (const [name, value] of Object.entries(tokens.spacing.scale)) {
    lines.push(`  --${name}: ${value};`);
  }

  // Radii
  lines.push('');
  lines.push('  /* ── Radii ── */');
  lines.push(`  --radius-none: ${tokens.radii.none};`);
  lines.push(`  --radius-sm:   ${tokens.radii.sm};`);
  lines.push(`  --radius-md:   ${tokens.radii.md};`);
  lines.push(`  --radius-lg:   ${tokens.radii.lg};`);
  lines.push(`  --radius-full: ${tokens.radii.full};`);

  // Components
  lines.push('');
  lines.push('  /* ── Components ── */');
  lines.push(`  --button-radius:  ${tokens.components.buttonRadius};`);
  lines.push(`  --button-py:      ${tokens.components.buttonPaddingBlock};`);
  lines.push(`  --button-px:      ${tokens.components.buttonPaddingInline};`);
  lines.push(`  --card-radius:    ${tokens.components.cardRadius};`);
  lines.push(`  --card-border:    ${tokens.components.cardBorder};`);
  lines.push(`  --card-shadow:    ${tokens.components.cardShadow};`);

  // Motion
  if (tokens.motion) {
    lines.push('');
    lines.push('  /* ── Motion ── */');
    lines.push(`  --duration: ${tokens.motion.duration};`);
    lines.push(`  --easing:   ${tokens.motion.easing};`);
  }

  lines.push('}');
  lines.push('');

  // Base reset
  lines.push('html, body {');
  lines.push('  background: var(--canvas);');
  lines.push('  color: var(--text);');
  lines.push('  font-family: var(--font-body);');
  lines.push('  margin: 0;');
  lines.push('  -webkit-font-smoothing: antialiased;');
  lines.push('}');
  lines.push('');
  lines.push('* { box-sizing: border-box; }');
  lines.push('');

  return lines.join('\n');
}

// ── SKILL.md generation ──────────────────────────────────────────────
function generateSkillMd(tokens: DesignSystemTokens, designMd: string): string {
  const { meta, colors } = tokens;
  const dosSection = extractSection(designMd, '7');
  const doItems = dosSection.match(/^-\s+.+$/gm)?.slice(0, 8).map((l) => l.trim()) ?? [];

  return `# SKILL — ${meta.title}

> When designing any artifact under the **${meta.title}** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| \`--paper\` | \`${colors.paper}\` | Canvas / background |
| \`--ink\` | \`${colors.ink}\` | Primary text |
| \`--slate\` | \`${colors.slate}\` | Secondary / muted text |
| \`--signal\` | \`${colors.signal}\` | Accent / brand |
| \`--bone\` | \`${colors.bone}\` | Secondary surface |

## Typography
- **Display**: \`${tokens.typography.fontDisplay}\`
- **Body**: \`${tokens.typography.fontBody}\`
- **Mono**: \`${tokens.typography.fontMono}\`

## Always
- Import \`colors_and_type.css\`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: \`--paper\`, \`--ink\`, \`--slate\`, \`--signal\`, \`--bone\`.
${doItems.slice(0, 5).join('\n')}

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
${doItems.slice(5).join('\n')}

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
`;
}

// ── Main pipeline ────────────────────────────────────────────────────
async function processSystem(dir: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const designPath = path.join(dir, 'DESIGN.md');
  const tokensPath = path.join(dir, 'tokens.json');

  try {
    const raw = await readFile(designPath, 'utf-8');

    // Skip if tokens.json exists and DESIGN.md hasn't changed (unless --force)
    if (!force) {
      try {
        const [designStat, tokensStat] = await Promise.all([
          stat(designPath),
          stat(tokensPath),
        ]);
        if (tokensStat.mtimeMs > designStat.mtimeMs) {
          return { ok: true };
        }
      } catch { /* tokens.json doesn't exist, proceed */ }
    }

    const tokens = extractTokens(raw, id);
    const css = generateCss(tokens);
    const skill = generateSkillMd(tokens, raw);

    if (dryRun) {
      console.log(`  [dry-run] ${id}: ${Object.keys(tokens.colors.extended).length + 7} colors, ${tokens.typography.ramp.length} type ramp entries`);
      return { ok: true };
    }

    // Write tokens.json
    await writeFile(tokensPath, JSON.stringify(tokens, null, 2) + '\n');

    // Write colors_and_type.css
    await writeFile(path.join(dir, 'colors_and_type.css'), css);

    // Write SKILL.md
    await writeFile(path.join(dir, 'SKILL.md'), skill);

    // Copy preview templates
    const previewDir = path.join(dir, 'preview');
    await mkdir(previewDir, { recursive: true });
    for (const tmpl of TEMPLATE_FILES) {
      const src = path.join(TEMPLATES_DIR, tmpl);
      const dst = path.join(previewDir, tmpl);
      try {
        await copyFile(src, dst);
      } catch {
        // Template doesn't exist yet — skip silently
      }
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log('Design System Asset Generator');
  console.log(`Source: ${CONTENT_DIR}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : force ? 'force' : 'incremental'}`);
  console.log('');

  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  const systems = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .filter((e) => !filterIds || filterIds.has(e.name))
    .map((e) => e.name)
    .sort();

  console.log(`Found ${systems.length} design systems`);
  console.log('');

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const id of systems) {
    const dir = path.join(CONTENT_DIR, id);
    const designPath = path.join(dir, 'DESIGN.md');
    try {
      await stat(designPath);
    } catch {
      skipped++;
      continue;
    }

    const result = await processSystem(dir, id);
    if (result.ok) {
      ok++;
      if (!dryRun) process.stdout.write('.');
    } else {
      failed++;
      errors.push({ id, error: result.error ?? 'unknown' });
      process.stdout.write('x');
    }
  }

  console.log('');
  console.log('');
  console.log(`Done: ${ok} generated, ${skipped} skipped, ${failed} failed`);

  if (errors.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const { id, error } of errors) {
      console.log(`  ${id}: ${error}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
