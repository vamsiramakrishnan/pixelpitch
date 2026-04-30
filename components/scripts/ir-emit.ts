/**
 * Emit a sample Slide IR JSON for a hero slide. Used as a smoke test that
 * the toIR helpers compose into a valid Deck.
 *
 * Run: tsx scripts/ir-emit.ts > /tmp/hero.deck.json
 */

import { Deck, type Slide as SlideIR } from '../src/ir/schema';
import { kickerToIR } from '../src/components/Kicker';
import { titleToIR } from '../src/components/Title';
import { footerToIR } from '../src/components/Footer';
import { pillToIR } from '../src/components/Pill';
import { buildSlide, SLIDE_THEMES } from '../src/components/Slide';

// A single hero slide built by composing component IR emitters.
const heroSlide: SlideIR = buildSlide(
  { index: 0, theme: 'gradient-aurora' },
  [
    kickerToIR({ children: 'Q2 2026 · Investor Update', bbox: { x: 96, y: 80, w: 600, h: 18 } }),
    titleToIR({
      size: '2xl',
      bbox: { x: 96, y: 220, w: 1080, h: 220 },
      children: [
        { text: 'A compiler for ' },
        { text: 'presentations', color: '#c084fc' },
        { text: ', not a screenshot tool.' },
      ],
    }),
    pillToIR({
      children: 'shipping today',
      dotColor: '#34d399',
      bbox: { x: 96, y: 580, w: 180, h: 32 },
    }),
    footerToIR({
      left: 'PIXELPITCH LABS',
      right: '01 / 12',
      bbox: { x: 96, y: 680, w: 1088, h: 18 },
    }),
  ],
);

const deck = Deck.parse({
  version: 1,
  theme: { name: 'aurora', bgColor: '#070710', fgColor: '#f5f5f7', accent: '#a78bfa', fontFamily: 'Inter, sans-serif' },
  slides: [heroSlide],
});

process.stdout.write(JSON.stringify(deck, null, 2) + '\n');
