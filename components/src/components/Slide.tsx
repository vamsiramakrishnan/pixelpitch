/**
 * <Slide> — root container. Children compile to IR nodes; Slide bundles
 * them into a Slide IR record with optional theme override and background.
 */

import type { ReactNode } from 'react';
import type { Bbox, Fill, Slide as SlideIR, Node } from '../ir/schema';

export interface SlideProps {
  index: number;
  background?: Fill;
  bbox?: Bbox;
  notes?: string;
  children?: ReactNode;
  /** Theme variant — controls default colors / fonts on a slide-by-slide basis. */
  theme?: 'light' | 'dark' | 'gradient-aurora' | 'gradient-sunset';
}

export const SLIDE_THEMES: Record<NonNullable<SlideProps['theme']>, Fill> = {
  'light':           { kind: 'solid', color: '#ffffff' },
  'dark':            { kind: 'solid', color: '#070710' },
  'gradient-aurora': {
    kind: 'radial-gradient', shape: 'ellipse', cx: 0.8, cy: 0.12,
    stops: [
      { color: '#1e1b4b', position: 0 },
      { color: '#0a0a14', position: 0.55 },
      { color: '#050510', position: 1 },
    ],
  },
  'gradient-sunset': {
    kind: 'linear-gradient', angleDeg: 135,
    stops: [
      { color: '#4338ca', position: 0 },
      { color: '#7c3aed', position: 0.35 },
      { color: '#db2777', position: 1 },
    ],
  },
};

export default function Slide(props: SlideProps) {
  // React component is for browser preview only. The actual emit happens
  // when Deck.toIR() walks children and dispatches each component's toIR.
  // Children are React nodes that may themselves be components — we don't
  // try to introspect them at render time; the IR pipeline does that
  // separately (see scripts/ir-emit.ts).
  const bg = props.background ?? SLIDE_THEMES[props.theme ?? 'dark'];
  const cssBg = fillToCssBackground(bg);
  return (
    <div
      data-slidify-slide={props.index}
      style={{
        position: 'relative',
        width: 1280,
        height: 720,
        background: cssBg,
        fontFamily: 'Inter, sans-serif',
        color: '#f5f5f7',
        overflow: 'hidden',
      }}
    >
      {props.children}
    </div>
  );
}

export function buildSlide(
  props: SlideProps,
  childNodes: Node[],
): SlideIR {
  return {
    index: props.index,
    bbox: props.bbox ?? { x: 0, y: 0, w: 1280, h: 720 },
    background: props.background ?? SLIDE_THEMES[props.theme ?? 'dark'],
    nodes: childNodes,
    notes: props.notes ?? '',
  };
}

// ---- Internal helpers --------------------------------------------------------

function fillToCssBackground(fill: Fill): string {
  if (fill.kind === 'none') return 'transparent';
  if (fill.kind === 'solid') return colorToCss(fill.color);
  if (fill.kind === 'linear-gradient') {
    const stops = fill.stops
      .map(s => `${colorToCss(s.color)} ${(s.position * 100).toFixed(1)}%`)
      .join(', ');
    return `linear-gradient(${fill.angleDeg}deg, ${stops})`;
  }
  if (fill.kind === 'radial-gradient') {
    const stops = fill.stops
      .map(s => `${colorToCss(s.color)} ${(s.position * 100).toFixed(1)}%`)
      .join(', ');
    return `radial-gradient(${fill.shape} at ${fill.cx * 100}% ${fill.cy * 100}%, ${stops})`;
  }
  // Wave-2: pattern fills are emitted natively by the Python compiler;
  // the HTML preview falls back to the foreground color so the slide is
  // still visible. Crews wanting a true CSS preview can swap this later.
  return colorToCss(fill.fgColor);
}

function colorToCss(c: { hex: string; alpha?: number } | string): string {
  if (typeof c === 'string') return c;
  if (c.alpha === undefined || c.alpha >= 0.999) return c.hex;
  // Convert #rrggbb + alpha → rgba()
  const r = parseInt(c.hex.slice(1, 3), 16);
  const g = parseInt(c.hex.slice(3, 5), 16);
  const b = parseInt(c.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${c.alpha})`;
}
