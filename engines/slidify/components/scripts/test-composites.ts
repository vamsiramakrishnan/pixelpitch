/**
 * Composite-component smoke test.
 *
 * Calls each *toIR emitter with sample props, then validates the result
 * against the GroupNode zod schema (round-tripping through Node.parse so the
 * recursive validator is exercised). Exits non-zero on any schema failure.
 *
 * Run: tsx scripts/test-composites.ts
 */

import { GroupNode, Node as NodeSchema, type GroupNodeT } from '../src/ir/schema';
import { statCardWithDepthToIR } from '../src/components/StatCardWithDepth';
import { glassPanelToIR } from '../src/components/GlassPanel';
import { annotatedCalloutToIR } from '../src/components/AnnotatedCallout';
import { pillToIR } from '../src/components/Pill';

interface Case {
  name: string;
  build: () => GroupNodeT;
}

const CASES: Case[] = [
  {
    name: 'StatCardWithDepth (full props)',
    build: () =>
      statCardWithDepthToIR({
        bbox: { x: 96, y: 200, w: 360, h: 220 },
        label: 'Native area',
        value: '87%',
        delta: '+29.4%',
        deltaColor: 'up',
        description: 'Up from 67% last quarter.',
        bgColor: '#1a1a2e',
        accentColor: { hex: '#a78bfa', alpha: 0.5 },
      }),
  },
  {
    name: 'StatCardWithDepth (minimal)',
    build: () =>
      statCardWithDepthToIR({
        bbox: { x: 0, y: 0, w: 280, h: 160 },
        label: 'Errors',
        value: '0',
      }),
  },
  {
    name: 'StatCardWithDepth (down delta)',
    build: () =>
      statCardWithDepthToIR({
        bbox: { x: 0, y: 0, w: 280, h: 200 },
        label: 'Latency',
        value: '142ms',
        delta: '-12.3%',
        deltaColor: 'down',
      }),
  },
  {
    name: 'GlassPanel (with childrenIR)',
    build: () =>
      glassPanelToIR({
        bbox: { x: 80, y: 120, w: 600, h: 360 },
        tint: { hex: '#ffffff', alpha: 0.08 },
        borderRadiusPx: 24,
        rimColor: { hex: '#ffffff', alpha: 0.2 },
        childrenIR: [
          pillToIR({
            children: 'live',
            dotColor: '#34d399',
            bbox: { x: 104, y: 144, w: 90, h: 28 },
          }),
        ],
      }),
  },
  {
    name: 'GlassPanel (no children)',
    build: () =>
      glassPanelToIR({
        bbox: { x: 0, y: 0, w: 400, h: 200 },
      }),
  },
  {
    name: 'AnnotatedCallout (left pointer, full props)',
    build: () =>
      annotatedCalloutToIR({
        bbox: { x: 200, y: 200, w: 280, h: 120 },
        label: 'INSIGHT',
        body: 'Native area jumped 29 points after the gradient densifier landed.',
        pointerSide: 'left',
        pointerOffsetPct: 0.5,
        pointerLengthPx: 28,
      }),
  },
  {
    name: 'AnnotatedCallout (top pointer, no label)',
    build: () =>
      annotatedCalloutToIR({
        bbox: { x: 100, y: 300, w: 220, h: 100 },
        body: 'Quick note.',
        pointerSide: 'top',
        pointerOffsetPct: 0.25,
      }),
  },
  {
    name: 'AnnotatedCallout (bottom + custom colors)',
    build: () =>
      annotatedCalloutToIR({
        bbox: { x: 0, y: 0, w: 200, h: 80 },
        body: 'Heads-up.',
        pointerSide: 'bottom',
        bgColor: '#0a0a0f',
        textColor: '#fbbf24',
      }),
  },
];

let failures = 0;
for (const c of CASES) {
  try {
    const built = c.build();
    // Round-trip: serialize → parse via the discriminated Node validator.
    // This exercises the recursive GroupNode schema (children: Node[]).
    const json = JSON.parse(JSON.stringify(built));
    const parsedAsGroup = GroupNode.parse(json);
    if (parsedAsGroup.kind !== 'group') {
      throw new Error(`expected kind=group, got kind=${String(parsedAsGroup.kind)}`);
    }
    const parsedAsNode = NodeSchema.parse(json);
    if (parsedAsNode.kind !== 'group') {
      throw new Error(`Node.parse returned kind=${String(parsedAsNode.kind)}`);
    }
    process.stdout.write(`ok   ${c.name} (${parsedAsGroup.children.length} children)\n`);
  } catch (err) {
    failures += 1;
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(`FAIL ${c.name}\n     ${msg}\n`);
  }
}

if (failures > 0) {
  process.stderr.write(`\n${failures} composite smoke-test case(s) failed.\n`);
  process.exit(1);
}

process.stdout.write(`\nAll ${CASES.length} composite cases passed.\n`);
