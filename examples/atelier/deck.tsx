/**
 * Atelier-v2 — 14-slide showcase deck.
 *
 * Composes Tier-B recipes (codegen-emitted from atoms.yaml) plus a few
 * Tier-A primitives directly. Most slides are a single recipe in a
 * SLIDE_BBOX; slides 6 and 13 hand-compose primitives, and slide 14
 * pairs `comp.closing-cta` with the metered `EscapeHatch` primitive.
 *
 * Per the M7-redux brief, many comp.* recipes still throw at runtime
 * (see EMIT_THROWS_OVERRIDES in components/src/__tests__/preset-matrix/
 * matrix.test.ts). `safeRecipe()` swallows the throw and substitutes a
 * recipe-id-stamped placeholder GroupNode so the deck builds end-to-end
 * regardless. When primitive prop schemas consolidate (post-M3.5), the
 * fallbacks fall away naturally.
 */

import type {
  Bbox,
  Deck,
  GroupNodeT,
  Node,
  Slide as SlideIR,
} from '../../components/src/ir/schema';

import {
  bgAuroraCornersToIR,
  bgDotLatticeFineToIR,
  bgLineGridToIR,
  bgSpotlightTightToIR,
  compAgendaTocToIR,
  compAnnotatedScreenshotToIR,
  compBentoMixedToIR,
  compBigStatHeroToIR,
  compClosingCtaToIR,
  compHeroInvestorToIR,
  compQuoteEditorialToIR,
  compRoadmapQuarterlyToIR,
  compSectionDividerMeshToIR,
  compTeamGridToIR,
  compThreeUpStatsToIR,
  decSectionDividerToIR,
} from '../../components/src/recipes';

import {
  dataBarToIR,
  dataDonutToIR,
  dataKpiRowToIR,
  dataSparklineToIR,
} from '../../components/src/primitives';
// EscapeHatch isn't re-exported from the primitives barrel yet; import direct.
import { escapeHatchToIR } from '../../components/src/primitives/EscapeHatch';

const SLIDE_BBOX: Bbox = { x: 0, y: 0, w: 1280, h: 720 };
const BG = '#070710';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run a recipe emitter; on throw, return a placeholder GroupNode so the
 * deck still builds. The placeholder carries `metadata.fallback: true`
 * and the truncated error so report.json can surface the failure rate.
 */
function safeRecipe(
  fn: () => GroupNodeT,
  recipeId: string,
  bbox: Bbox,
): GroupNodeT {
  try {
    return fn();
  } catch (e) {
    return {
      kind: 'group',
      recipeId,
      bbox,
      zOrder: 0,
      metadata: {
        role: recipeId,
        fallback: true,
        error: String(e).slice(0, 120),
      },
      children: [],
    };
  }
}

/** Wrap a single recipe emission in a Slide. */
function singleAtomSlide(
  index: number,
  node: Node,
  notes = '',
): SlideIR {
  return {
    index,
    bbox: SLIDE_BBOX,
    background: { kind: 'solid', color: BG },
    nodes: [node],
    notes,
  };
}

// ---------------------------------------------------------------------------
// Slide 6 — bespoke data-viz composition
// ---------------------------------------------------------------------------

function buildDataVizSlide(): SlideIR {
  // 4-up data canvas: donut (top-left), horizontal bars (top-right),
  // KPI row (bottom span), sparkline (mid right).
  const donut = dataDonutToIR({
    bbox: { x: 80, y: 80, w: 280, h: 280 },
    segments: [
      { value: 42, color: '#a78bfa' },
      { value: 28, color: '#60a5fa' },
      { value: 18, color: '#f472b6' },
      { value: 12, color: '#34d399' },
    ],
    innerRadiusFrac: 0.62,
  });
  const bars = dataBarToIR({
    bbox: { x: 420, y: 80, w: 380, h: 280 },
    values: [62, 81, 47, 93, 71, 58, 84],
    orientation: 'horizontal',
    color: '#a78bfa',
    radiusPx: 4,
  });
  const sparkline = dataSparklineToIR({
    bbox: { x: 860, y: 140, w: 340, h: 160 },
    values: [4, 6, 5, 8, 7, 11, 9, 14, 12, 17, 16, 21],
    strokeColor: '#60a5fa',
    fillUnder: true,
    withLastMarker: true,
  });
  const kpi = dataKpiRowToIR({
    bbox: { x: 80, y: 440, w: 1120, h: 200 },
    cells: [
      { label: 'MRR', value: '$2.4M', delta: '+18%' },
      { label: 'Net retention', value: '127%', delta: '+4 pts' },
      { label: 'Logos shipped', value: '241', delta: '+62' },
      { label: 'P95 latency', value: '94 ms', delta: '-11 ms' },
    ],
    withDividers: true,
  });
  return {
    index: 6,
    bbox: SLIDE_BBOX,
    background: { kind: 'solid', color: BG },
    nodes: [donut, bars, sparkline, kpi],
    notes: 'Custom data-viz slide: donut + bar-set-h + sparkline + kpi-row primitives.',
  };
}

// ---------------------------------------------------------------------------
// Slide 13 — surfaces showcase
// ---------------------------------------------------------------------------

function buildSurfacesSlide(): SlideIR {
  // Layered backgrounds: aurora corners (full), dot lattice (left half),
  // line grid (right half), spotlight (center), section divider strip.
  const left: Bbox = { x: 0, y: 0, w: 640, h: 720 };
  const right: Bbox = { x: 640, y: 0, w: 640, h: 720 };
  const center: Bbox = { x: 440, y: 200, w: 400, h: 320 };
  const stripe: Bbox = { x: 0, y: 348, w: 1280, h: 24 };
  const aurora = safeRecipe(
    () => bgAuroraCornersToIR({ bbox: SLIDE_BBOX }),
    'bg.aurora-corners',
    SLIDE_BBOX,
  );
  const dots = safeRecipe(
    () => bgDotLatticeFineToIR({ bbox: left }),
    'bg.dot-lattice-fine',
    left,
  );
  const grid = safeRecipe(
    () => bgLineGridToIR({ bbox: right }),
    'bg.line-grid',
    right,
  );
  const spot = safeRecipe(
    () => bgSpotlightTightToIR({ bbox: center }),
    'bg.spotlight-tight',
    center,
  );
  const divider = safeRecipe(
    () => decSectionDividerToIR({ bbox: stripe }),
    'dec.section-divider',
    stripe,
  );
  return {
    index: 13,
    bbox: SLIDE_BBOX,
    background: { kind: 'solid', color: BG },
    nodes: [aurora, dots, grid, spot, divider],
    notes: 'Surfaces showcase: aurora-corners + dot-lattice-fine + line-grid + spotlight-tight + section-divider.',
  };
}

// ---------------------------------------------------------------------------
// Slide 14 — closing CTA + EscapeHatch
// ---------------------------------------------------------------------------

function buildClosingSlide(): SlideIR {
  const cta = safeRecipe(
    () =>
      compClosingCtaToIR({
        bbox: SLIDE_BBOX,
        headline: 'Ready to compile your next deck?',
        cta: 'Get the slidify CLI',
      }),
    'comp.closing-cta',
    SLIDE_BBOX,
  );
  // ~5% of slide area (160x100 = 16,000 / 921,600 ≈ 1.7% — well under
  // budget; the demo just needs a non-empty escape, not a large one).
  const escape = escapeHatchToIR({
    bbox: { x: 1100, y: 600, w: 160, h: 100 },
    cssPayload:
      'background: conic-gradient(from 45deg, #a78bfa, #f472b6, #60a5fa, #34d399, #a78bfa); border-radius: 12px;',
    intent: 'conic-gradient-corner-decoration',
    attempted: 'bg.aurora-corners',
  });
  return {
    index: 14,
    bbox: SLIDE_BBOX,
    background: { kind: 'solid', color: BG },
    nodes: [cta, escape],
    notes:
      'Demonstrates EscapeHatch metering for a treatment (conic-gradient) no atom expresses.',
  };
}

// ---------------------------------------------------------------------------
// Top-level deck
// ---------------------------------------------------------------------------

export function buildAtelierDeck(): Deck {
  const slides: SlideIR[] = [
    // 1. Hero
    singleAtomSlide(
      1,
      safeRecipe(
        () =>
          compHeroInvestorToIR({
            bbox: SLIDE_BBOX,
            eyebrow: 'Q2 2026',
            headline: 'Slidify',
            lede: 'A compiler for presentations.',
          }),
        'comp.hero-investor',
        SLIDE_BBOX,
      ),
      'Hero — investor variant.',
    ),
    // 2. Agenda
    singleAtomSlide(
      2,
      safeRecipe(
        () =>
          compAgendaTocToIR({
            bbox: SLIDE_BBOX,
            items: [
              { num: '01', title: 'Foundations' },
              { num: '02', title: 'Numbers that move' },
              { num: '03', title: 'Roadmap' },
              { num: '04', title: 'Product surface' },
              { num: '05', title: 'Voices' },
              { num: '06', title: 'The team' },
            ],
          }),
        'comp.agenda-toc',
        SLIDE_BBOX,
      ),
      'Agenda / table of contents.',
    ),
    // 3. Section divider
    singleAtomSlide(
      3,
      safeRecipe(
        () =>
          compSectionDividerMeshToIR({
            bbox: SLIDE_BBOX,
            chapter: '01',
            title: 'Foundations',
          }),
        'comp.section-divider-mesh',
        SLIDE_BBOX,
      ),
      'Chapter divider with mesh background.',
    ),
    // 4. Big stat
    singleAtomSlide(
      4,
      safeRecipe(
        () =>
          compBigStatHeroToIR({
            bbox: SLIDE_BBOX,
            eyebrow: 'Native-area ratio',
            value: '87',
            unit: '%',
            headline: 'of every deck compiles native, no raster',
            delta: '+29% vs Wave-1',
          }),
        'comp.big-stat-hero',
        SLIDE_BBOX,
      ),
      'Hero stat — single number.',
    ),
    // 5. Three-up stats
    singleAtomSlide(
      5,
      safeRecipe(
        () =>
          compThreeUpStatsToIR({
            bbox: SLIDE_BBOX,
            eyebrow: 'By the numbers',
            headline: 'Atelier-v2 telemetry',
            kpis: [
              { label: 'Atoms shipped', value: '96' },
              { label: 'Recipes', value: '14' },
              { label: 'Escape rate', value: '<5%' },
            ],
          }),
        'comp.three-up-stats',
        SLIDE_BBOX,
      ),
      'Three-up KPI strip.',
    ),
    // 6. Bespoke data viz
    buildDataVizSlide(),
    // 7. Roadmap
    singleAtomSlide(
      7,
      safeRecipe(
        () =>
          compRoadmapQuarterlyToIR({
            bbox: SLIDE_BBOX,
            eyebrow: '2026 plan of record',
            quarters: [
              { q: 'Q1', items: ['Atoms.yaml lock', 'Codegen pass'] },
              { q: 'Q2', items: ['Atelier-v2', 'Preset matrix'] },
              { q: 'Q3', items: ['PPTX round-trip', 'Harvest'] },
              { q: 'Q4', items: ['PDF backend', 'Keynote'] },
            ],
          }),
        'comp.roadmap-quarterly',
        SLIDE_BBOX,
      ),
      'Quarterly roadmap.',
    ),
    // 8. Bento mixed
    singleAtomSlide(
      8,
      safeRecipe(
        () =>
          compBentoMixedToIR({
            bbox: SLIDE_BBOX,
            cells: [
              { kind: 'stat', label: 'Compile time', value: '1.2s' },
              { kind: 'stat', label: 'Round-trip', value: '99.4%' },
              { kind: 'quote', text: 'It just compiled.' },
              { kind: 'image', src: '' },
              { kind: 'spark', values: [3, 5, 4, 7, 9] },
              { kind: 'kpi', label: 'Decks shipped', value: '241' },
            ],
          }),
        'comp.bento-mixed',
        SLIDE_BBOX,
      ),
      'Mixed bento grid.',
    ),
    // 9. Annotated screenshot
    singleAtomSlide(
      9,
      safeRecipe(
        () =>
          compAnnotatedScreenshotToIR({
            bbox: SLIDE_BBOX,
            url: 'app.slidify.io/dashboard',
            screenshot: '',
            annotations: [
              { x: 0.2, y: 0.3, label: 'Native area ratio panel' },
              { x: 0.6, y: 0.5, label: 'Per-recipe heat strip' },
              { x: 0.8, y: 0.8, label: 'Escape-hatch ledger' },
            ],
          }),
        'comp.annotated-screenshot',
        SLIDE_BBOX,
      ),
      'Annotated product shot.',
    ),
    // 10. Editorial quote
    singleAtomSlide(
      10,
      safeRecipe(
        () =>
          compQuoteEditorialToIR({
            bbox: SLIDE_BBOX,
            quote:
              'A deck that survives both copy edits and a board download — without raster fallback.',
            attribution: 'Anonymous design partner',
          }),
        'comp.quote-editorial',
        SLIDE_BBOX,
      ),
      'Editorial pull quote.',
    ),
    // 11. Roadmap (second variant — repurposed per spec)
    singleAtomSlide(
      11,
      safeRecipe(
        () =>
          compRoadmapQuarterlyToIR({
            bbox: SLIDE_BBOX,
            eyebrow: 'Platform milestones',
            quarters: [
              { q: 'Q1', items: ['Tier-A primitives stable'] },
              { q: 'Q2', items: ['Tier-B recipes complete'] },
              { q: 'Q3', items: ['Harvester GA'] },
              { q: 'Q4', items: ['Atelier-v3'] },
            ],
          }),
        'comp.roadmap-quarterly',
        SLIDE_BBOX,
      ),
      'Roadmap variant — platform milestones.',
    ),
    // 12. Team grid
    singleAtomSlide(
      12,
      safeRecipe(
        () =>
          compTeamGridToIR({
            bbox: SLIDE_BBOX,
            headline: 'The team',
            members: [
              { name: 'Avery K.', role: 'IR & compiler' },
              { name: 'Bo M.', role: 'Primitives' },
              { name: 'Cyn R.', role: 'Recipes' },
              { name: 'Dev S.', role: 'Harvester' },
              { name: 'Eli T.', role: 'PPTX backend' },
              { name: 'Fia W.', role: 'Design system' },
            ],
          }),
        'comp.team-grid',
        SLIDE_BBOX,
      ),
      'Six-up team grid.',
    ),
    // 13. Bespoke surfaces showcase
    buildSurfacesSlide(),
    // 14. Closing + escape hatch
    buildClosingSlide(),
  ];

  return {
    version: 2,
    theme: {
      name: 'atelier',
      bgColor: BG,
      fgColor: '#f5f5f7',
      accent: '#a78bfa',
      fontFamily: 'Inter, sans-serif',
    },
    slides,
  };
}
