#!/usr/bin/env bun
/**
 * Generate editorial-quality preview HTML files for each design system
 * using Claude Haiku. Each preview is tailored to the brand using the
 * system's DESIGN.md + tokens.json.
 *
 * Usage:
 *   bun scripts/enrich-design-system-previews.ts
 *   bun scripts/enrich-design-system-previews.ts --ids claude,stripe
 *   bun scripts/enrich-design-system-previews.ts --cards type_specimen,spacing_and_rules
 *   bun scripts/enrich-design-system-previews.ts --concurrency 5
 */

import AnthropicVertex from '@anthropic-ai/vertex-sdk';
import { readdir, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';

const CONTENT_DIR = path.join(import.meta.dir, '..', 'content', 'design-systems');

const PREVIEW_CARDS = [
  'type_specimen',
  'color_palette',
  'components',
  'spacing_and_rules',
  'brand_motifs',
] as const;

type CardName = typeof PREVIEW_CARDS[number];

// ── CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const force = args.includes('--force');
const idsArg = args.find((a) => a.startsWith('--ids='))?.split('=')[1]
  ?? (args.includes('--ids') ? args[args.indexOf('--ids') + 1] : null);
const cardsArg = args.find((a) => a.startsWith('--cards='))?.split('=')[1]
  ?? (args.includes('--cards') ? args[args.indexOf('--cards') + 1] : null);
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1]
  ?? (args.includes('--concurrency') ? args[args.indexOf('--concurrency') + 1] : null);

const filterIds = idsArg ? new Set(idsArg.split(',').map((s) => s.trim())) : null;
const filterCards = cardsArg
  ? new Set(cardsArg.split(',').map((s) => s.trim()) as CardName[])
  : new Set(PREVIEW_CARDS);
const concurrency = parseInt(concurrencyArg ?? '5') || 5;
const model = 'claude-haiku-4-5';

const client = new AnthropicVertex({
  projectId: process.env.ANTHROPIC_VERTEX_PROJECT_ID ?? 'vital-octagon-19612',
  region: process.env.CLOUD_ML_REGION ?? 'global',
});

// ── Gold-standard examples (D&A Force Multipliers) ───────────────────
async function loadGoldStandard(card: CardName): Promise<string> {
  const daDir = path.join(CONTENT_DIR, 'da-force-multipliers');

  // Check if D&A has a hand-crafted preview
  const previewPath = path.join(daDir, 'preview', `${card}.html`);
  try {
    return await readFile(previewPath, 'utf-8');
  } catch {
    return '';
  }
}

// ── Card-specific system prompts ─────────────────────────────────────
function systemPromptFor(card: CardName, goldHtml: string): string {
  const base = `You generate self-contained HTML preview pages for design systems. Each page should be editorial-quality — like a Bloomberg Businessweek specimen sheet, not a generic UI docs page.

CRITICAL RULES:
- Output ONLY the HTML. No markdown fences, no explanation, just <!doctype html>...</html>
- Use <link rel="stylesheet" href="../colors_and_type.css"> to load the system's CSS tokens
- Use CSS custom properties (--paper, --ink, --slate, --signal, --bone, --font-display, --font-body, --font-mono, --radius-*, --s-*) from colors_and_type.css
- The page must work when opened directly from the design system directory
- Make it visually stunning — generous whitespace, editorial typography, hairline rules
- Write sample text that matches the brand's voice and industry (not lorem ipsum)
- Include a stage-head header with a punchy 2-line editorial headline and metadata`;

  const cardInstructions: Record<CardName, string> = {
    type_specimen: `Generate a TYPE SPECIMEN page. Show every level of the type ramp with:
- Left column: role label (e.g. "Hero · 96 / 0.95"), font name, weight, and tracking in mono uppercase
- Right column: actual rendered sample text at that size/weight/font
- Use the system's actual fonts via --font-display, --font-body, --font-mono CSS vars
- Include a drop cap demo at the bottom if the display font is a serif
- Sample text should be editorial sentences relevant to the brand (not pangrams)
- Stage head headline should reference the system's typography (e.g. "Four faces. Four jobs." for a 4-font system, or "One family. Every voice." for a single-font system)`,

    color_palette: `Generate a COLOR PALETTE page. Show every color token as a swatch card:
- Each swatch: large color chip, CSS var name, hex value, contrast ratio vs paper, WCAG level
- Group into "Core Palette" (paper, ink, slate, signal, bone) and "Extended Palette"
- Include a "Rule of One" or color usage demo showing proper accent usage
- Include a WCAG compliance summary at the bottom
- Stage head headline about the palette philosophy`,

    components: `Generate a COMPONENTS page showing the system's component patterns:
- Buttons: primary (signal bg), secondary (ink border), ghost (text + underline)
- Cards: standard bordered, elevated with shadow (if the system uses shadows)
- Input fields: text input with focus ring demo
- Badges/tags: status pills in signal/success/danger colors
- All styled purely via CSS custom properties
- Stage head headline about the component vocabulary`,

    spacing_and_rules: `Generate a SPACING & RULES page:
- Spacing scale: visual horizontal bars for each --s-* token, with role label and px value
- Rule weights: rendered CSS rules showing each depth level (quiet, hairline, bold, display)
- Border radius: visual demo boxes showing each --radius-* value
- Grid visualization if the system specifies a grid
- Stage head headline about the spacing philosophy (e.g. "Eight pixels. One ruler.")`,

    brand_motifs: `Generate a BRAND MOTIFS page:
- Key characteristics section with the brand's signature moves
- Do's and Don'ts in a two-column layout with visual anti-pattern demos
- Color harmony strip showing the core tokens together
- Typography pairing demo (display + body fonts as a lockup)
- Stage head headline about the brand's DNA`,
  };

  let prompt = base + '\n\n' + cardInstructions[card];

  if (goldHtml) {
    prompt += `\n\nHere is a GOLD STANDARD example of this page type from the D&A Force Multipliers system. Match this level of editorial quality, visual polish, and specificity — but adapt the content, colors, typography, and voice to the target system:\n\n${goldHtml}`;
  }

  return prompt;
}

// ── Generate one preview card ────────────────────────────────────────
async function generateCard(
  systemId: string,
  card: CardName,
  designMd: string,
  tokensJson: string,
  css: string,
  goldHtml: string,
): Promise<string> {
  const systemPrompt = systemPromptFor(card, goldHtml);

  const userPrompt = `Generate the ${card.replace(/_/g, ' ')} preview page for this design system.

SYSTEM ID: ${systemId}

DESIGN.MD (key sections):
${condenseDesignMd(designMd, card)}

TOKENS.JSON:
${tokensJson}

CSS CUSTOM PROPERTIES (colors_and_type.css):
${css}

Generate the complete HTML page now. Output ONLY the HTML, starting with <!doctype html>.`;

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  // Strip markdown fences if present
  return text.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();
}

function condenseDesignMd(raw: string, card: CardName): string {
  // Extract relevant sections based on card type
  const sectionMap: Record<CardName, string[]> = {
    type_specimen: ['1', '3'],
    color_palette: ['1', '2'],
    components: ['1', '4'],
    spacing_and_rules: ['1', '5', '6'],
    brand_motifs: ['1', '7'],
  };

  const sections = sectionMap[card];
  const lines = raw.split('\n');
  const result: string[] = [];

  // Always include the header (title + category)
  const headerEnd = lines.findIndex((l, i) => i > 0 && /^## \d/.test(l));
  result.push(...lines.slice(0, Math.min(headerEnd, 10)));

  for (const num of sections) {
    const startIdx = lines.findIndex((l) => new RegExp(`^## ${num}\\.`).test(l));
    if (startIdx === -1) continue;
    const endIdx = lines.findIndex((l, i) => i > startIdx && /^## \d/.test(l));
    const sectionLines = lines.slice(startIdx, endIdx === -1 ? undefined : endIdx);
    result.push('', ...sectionLines.slice(0, 80)); // Cap at 80 lines per section
  }

  return result.join('\n').slice(0, 6000); // Cap total at 6K chars
}

// ── Concurrency limiter ──────────────────────────────────────────────
async function pLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task().then((r) => { results.push(r); });
    executing.add(p);
    const cleanup = p.finally(() => executing.delete(p));
    if (executing.size >= limit) await Promise.race(executing);
  }

  await Promise.all(executing);
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log('Design System Preview Enrichment (Haiku)');
  console.log(`Model: ${model}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Cards: ${[...filterCards].join(', ')}`);
  console.log('');

  // Pre-load gold standard examples
  const goldStandards: Record<string, string> = {};
  for (const card of PREVIEW_CARDS) {
    if (filterCards.has(card)) {
      goldStandards[card] = await loadGoldStandard(card);
    }
  }

  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  const systems = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .filter((e) => !filterIds || filterIds.has(e.name))
    .map((e) => e.name)
    .sort();

  console.log(`Found ${systems.length} design systems`);
  console.log('');

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ id: string; card: string; error: string }> = [];

  const tasks: Array<() => Promise<void>> = [];

  for (const id of systems) {
    const dir = path.join(CONTENT_DIR, id);
    const designPath = path.join(dir, 'DESIGN.md');
    const tokensPath = path.join(dir, 'tokens.json');
    const cssPath = path.join(dir, 'colors_and_type.css');

    let designMd: string, tokensJson: string, css: string;
    try {
      [designMd, tokensJson, css] = await Promise.all([
        readFile(designPath, 'utf-8'),
        readFile(tokensPath, 'utf-8'),
        readFile(cssPath, 'utf-8'),
      ]);
    } catch {
      skipped++;
      continue;
    }

    for (const card of PREVIEW_CARDS) {
      if (!filterCards.has(card)) continue;

      const outputPath = path.join(dir, 'preview', `${card}.html`);

      // Skip if already enriched (unless --force)
      if (!force) {
        try {
          const s = await stat(outputPath);
          // Skip if file is >5KB (likely already enriched, not a template copy)
          if (s.size > 5000) { skipped++; continue; }
        } catch { /* doesn't exist, generate it */ }
      }

      tasks.push(async () => {
        try {
          const html = await generateCard(id, card, designMd, tokensJson, css, goldStandards[card]);
          await mkdir(path.join(dir, 'preview'), { recursive: true });
          await writeFile(outputPath, html);
          generated++;
          process.stdout.write('.');
        } catch (e: any) {
          failed++;
          errors.push({ id, card, error: e.message });
          process.stdout.write('x');
        }
      });
    }
  }

  console.log(`Queued ${tasks.length} generation tasks`);
  console.log('');

  await pLimit(tasks, concurrency);

  console.log('');
  console.log('');
  console.log(`Done: ${generated} generated, ${skipped} skipped, ${failed} failed`);

  if (errors.length > 0) {
    console.log('');
    console.log('Errors:');
    for (const { id, card, error } of errors.slice(0, 20)) {
      console.log(`  ${id}/${card}: ${error}`);
    }
    if (errors.length > 20) console.log(`  ... and ${errors.length - 20} more`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
