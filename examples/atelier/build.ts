/**
 * Atelier-v2 build script.
 *
 * Emits two artifacts:
 *   - `examples/atelier/deck.json`   — the IR Deck for the Python compiler.
 *   - `examples/atelier/report.json` — per-slide native_area_ratio +
 *     deck-wide escapeRate, computed in TS so we don't need to spawn
 *     the Python pipeline for the headline numbers.
 *
 * Native-area ratio (per CONTRACT-v1 §9.5): for each slide, the fraction
 * of the slide bbox covered by *native* nodes (anything whose recipe is
 * not flagged `excludeFromNativeRatio`). Escape-hatch rasters and
 * fallback placeholders are excluded from the numerator; the denominator
 * is always the full slide area.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Bbox, Node, Slide as SlideIR } from '../../components/src/ir/schema';
import { buildAtelierDeck } from './deck';

// ---------------------------------------------------------------------------
// Output paths (resolved relative to this file so we don't depend on cwd).
// ---------------------------------------------------------------------------

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DECK = resolve(HERE, 'deck.json');
const OUT_REPORT = resolve(HERE, 'report.json');

// ---------------------------------------------------------------------------
// Walker — sums native vs excluded vs fallback bbox area per slide.
// ---------------------------------------------------------------------------

interface SlideMetric {
  index: number;
  nodes: number;
  fallbackNodes: number;
  escapeNodes: number;
  nativeArea: number;
  excludedArea: number;
  slideArea: number;
  nativeAreaRatio: number;
  intents: string[];
}

function area(bbox: Bbox | undefined, fallback: Bbox): number {
  const b = bbox ?? fallback;
  return Math.max(0, b.w) * Math.max(0, b.h);
}

function walkSlide(slide: SlideIR): SlideMetric {
  const slideArea = area(slide.bbox, { x: 0, y: 0, w: 1280, h: 720 });
  let native = 0;
  let excluded = 0;
  let nodes = 0;
  let fallbackNodes = 0;
  let escapeNodes = 0;
  const intents: string[] = [];

  const visit = (n: Node, parentBbox: Bbox): void => {
    nodes += 1;
    const bbox = n.bbox ?? parentBbox;
    const meta = (n.metadata ?? {}) as Record<string, unknown>;
    const excludeFromRatio = meta.excludeFromNativeRatio === true;
    const isEscape = meta.role === 'escape-hatch';
    const isFallback = meta.fallback === true;
    if (isEscape) {
      escapeNodes += 1;
      const intent = typeof meta.intent === 'string' ? meta.intent : 'unknown';
      intents.push(intent);
    }
    if (isFallback) fallbackNodes += 1;

    const a = area(bbox, parentBbox);
    if (excludeFromRatio) {
      excluded += a;
    } else if (n.kind === 'group') {
      // Group itself doesn't add to native area — its children do.
    } else {
      native += a;
    }
    if (n.kind === 'group') {
      for (const child of n.children) visit(child, bbox);
    }
  };

  for (const n of slide.nodes) visit(n, slide.bbox);

  return {
    index: slide.index,
    nodes,
    fallbackNodes,
    escapeNodes,
    nativeArea: native,
    excludedArea: excluded,
    slideArea,
    nativeAreaRatio: slideArea > 0 ? Math.min(1, native / slideArea) : 0,
    intents,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const deck = buildAtelierDeck();
  mkdirSync(HERE, { recursive: true });
  writeFileSync(OUT_DECK, JSON.stringify(deck, null, 2));

  const perSlide = deck.slides.map(walkSlide);
  const totalSlideArea = perSlide.reduce((s, m) => s + m.slideArea, 0);
  const totalExcluded = perSlide.reduce((s, m) => s + m.excludedArea, 0);
  const escapeNodesTotal = perSlide.reduce((s, m) => s + m.escapeNodes, 0);
  const fallbackNodesTotal = perSlide.reduce((s, m) => s + m.fallbackNodes, 0);

  const byIntent: Record<string, { count: number; area: number }> = {};
  for (const slide of deck.slides) {
    for (const n of slide.nodes) {
      const meta = (n.metadata ?? {}) as Record<string, unknown>;
      if (meta.role !== 'escape-hatch') continue;
      const intent = typeof meta.intent === 'string' ? meta.intent : 'unknown';
      const a = area(n.bbox, slide.bbox);
      if (!byIntent[intent]) byIntent[intent] = { count: 0, area: 0 };
      byIntent[intent].count += 1;
      byIntent[intent].area += a;
    }
  }

  const report = {
    deck: 'atelier',
    slides: deck.slides.length,
    totals: {
      slideArea: totalSlideArea,
      excludedArea: totalExcluded,
      escapeNodes: escapeNodesTotal,
      fallbackNodes: fallbackNodesTotal,
    },
    escapeRate: {
      // Per CONTRACT-v1 §9.5: the deck-level escape-rate denominator is
      // the sum of all slide areas; the numerator is the bbox area of
      // every escape-hatch raster.
      value: totalSlideArea > 0 ? totalExcluded / totalSlideArea : 0,
      byIntent,
    },
    perSlide: perSlide.map((m) => ({
      index: m.index,
      nodes: m.nodes,
      fallbackNodes: m.fallbackNodes,
      escapeNodes: m.escapeNodes,
      nativeAreaRatio: Number(m.nativeAreaRatio.toFixed(4)),
      intents: m.intents,
    })),
  };
  writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2));

  const bytes = JSON.stringify(deck).length;
  // Single-line stdout summary: the parent agent / CI can grep for it.
  console.log(
    `atelier deck: ${deck.slides.length} slides, ${bytes} bytes, ` +
      `escapeRate=${report.escapeRate.value.toFixed(4)}, ` +
      `fallbackNodes=${fallbackNodesTotal}`,
  );
}

main();
