/**
 * Full IR snapshot for every existing *ToIR helper.
 *
 * Usage: tsx scripts/snapshot-all.ts > /tmp/snapshot-{before,after}.json
 *
 * Used during the F2 token migration to verify that switching to tokens
 * produces visually identical IR.
 */

import { titleToIR } from '../src/components/Title';
import { kickerToIR } from '../src/components/Kicker';
import { footerToIR } from '../src/components/Footer';
import { pillToIR } from '../src/components/Pill';
import { statCardWithDepthToIR } from '../src/components/StatCardWithDepth';
import { glassPanelToIR } from '../src/components/GlassPanel';
import { annotatedCalloutToIR } from '../src/components/AnnotatedCallout';
import { buildSlide } from '../src/components/Slide';

const out: Record<string, unknown> = {};

out['title.basic'] = titleToIR({
  size: 'lg',
  bbox: { x: 96, y: 200, w: 1080, h: 80 },
  children: 'Hello world',
});
out['title.runs'] = titleToIR({
  size: '2xl',
  bbox: { x: 96, y: 200, w: 1080, h: 200 },
  children: [
    { text: 'A compiler for ' },
    { text: 'presentations', color: '#c084fc' },
    { text: ', not a screenshot tool.' },
  ],
});
out['title.color'] = titleToIR({
  size: 'sm',
  color: '#10b981',
  align: 'center',
  bbox: { x: 0, y: 0, w: 800, h: 40 },
  children: 'tinted',
});

out['kicker.default'] = kickerToIR({
  children: 'Section eyebrow',
  bbox: { x: 96, y: 80, w: 600, h: 18 },
});
out['kicker.colored'] = kickerToIR({
  children: 'override',
  color: '#10b981',
});

out['footer.both'] = footerToIR({
  left: 'PIXELPITCH LABS',
  right: '01 / 12',
  bbox: { x: 96, y: 680, w: 1088, h: 18 },
});
out['footer.left-only'] = footerToIR({ left: 'PIXELPITCH' });
out['footer.right-only'] = footerToIR({ right: '12 / 12' });

out['pill.dot'] = pillToIR({
  children: 'shipping today',
  dotColor: '#34d399',
  bbox: { x: 96, y: 580, w: 180, h: 32 },
});
out['pill.no-dot'] = pillToIR({
  children: 'beta',
  bbox: { x: 0, y: 0, w: 100, h: 28 },
});
out['pill.colored'] = pillToIR({
  children: 'live',
  bgColor: { hex: '#10b981', alpha: 0.18 },
  borderColor: { hex: '#10b981', alpha: 0.3 },
  color: '#a7f3d0',
  bbox: { x: 0, y: 0, w: 120, h: 32 },
});

out['statCard.full'] = statCardWithDepthToIR({
  bbox: { x: 96, y: 200, w: 360, h: 220 },
  label: 'Native area',
  value: '87%',
  delta: '+29.4%',
  deltaColor: 'up',
  description: 'Up from 67% last quarter.',
});
out['statCard.minimal'] = statCardWithDepthToIR({
  bbox: { x: 0, y: 0, w: 280, h: 160 },
  label: 'Errors',
  value: '0',
});
out['statCard.down'] = statCardWithDepthToIR({
  bbox: { x: 0, y: 0, w: 280, h: 200 },
  label: 'Latency',
  value: '142ms',
  delta: '-12.3%',
  deltaColor: 'down',
});
out['statCard.custom'] = statCardWithDepthToIR({
  bbox: { x: 0, y: 0, w: 360, h: 200 },
  label: 'Foo',
  value: '99',
  bgColor: '#1a1a2e',
  accentColor: { hex: '#a78bfa', alpha: 0.5 },
});

out['glassPanel.default'] = glassPanelToIR({
  bbox: { x: 0, y: 0, w: 400, h: 200 },
});
out['glassPanel.with-children'] = glassPanelToIR({
  bbox: { x: 80, y: 120, w: 600, h: 360 },
  childrenIR: [
    pillToIR({
      children: 'live',
      dotColor: '#34d399',
      bbox: { x: 104, y: 144, w: 90, h: 28 },
    }),
  ],
});
out['glassPanel.custom'] = glassPanelToIR({
  bbox: { x: 0, y: 0, w: 600, h: 360 },
  tint: { hex: '#ffffff', alpha: 0.12 },
  borderRadiusPx: 32,
  rimColor: { hex: '#ffffff', alpha: 0.25 },
});

out['callout.left'] = annotatedCalloutToIR({
  bbox: { x: 200, y: 200, w: 280, h: 120 },
  label: 'INSIGHT',
  body: 'Native area jumped 29 points after the gradient densifier landed.',
  pointerSide: 'left',
  pointerOffsetPct: 0.5,
  pointerLengthPx: 28,
});
out['callout.top'] = annotatedCalloutToIR({
  bbox: { x: 100, y: 300, w: 220, h: 100 },
  body: 'Quick note.',
  pointerSide: 'top',
  pointerOffsetPct: 0.25,
});
out['callout.bottom-custom'] = annotatedCalloutToIR({
  bbox: { x: 0, y: 0, w: 200, h: 80 },
  body: 'Heads-up.',
  pointerSide: 'bottom',
  bgColor: '#0a0a0f',
  textColor: '#fbbf24',
});

out['slide.dark'] = buildSlide(
  { index: 0, theme: 'dark' },
  [titleToIR({ children: 'X', bbox: { x: 0, y: 0, w: 100, h: 50 } })],
);
out['slide.aurora'] = buildSlide(
  { index: 1, theme: 'gradient-aurora' },
  [],
);

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
