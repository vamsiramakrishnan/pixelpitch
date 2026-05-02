/**
 * <DataGauge> — Tier-A primitive (`data.gauge`).
 *
 * A half-arc / radial-gauge widget. Two PathShape arcs: one full-sweep
 * "track" (muted) and one partial-sweep "value" arc (accent). The sweep
 * angle is computed from `value / max`. Backs the legacy `data.gauge`
 * atom and is reusable for KPI cards.
 *
 * Composition (z-order bottom → top):
 *   - `data.gauge.track`  PathShape (full arc, low-contrast)
 *   - `data.gauge.value`  PathShape (sweep proportional to value, accent)
 *
 * F1 deps: PathShape `A` command.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  PathCommand,
  PathShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface DataGaugeProps {
  bbox: Bbox;
  /** Current reading. Clamped to [0, max]. Optional — defaults to 0. */
  value?: number;
  /** Domain max. Default `100`. */
  max?: number;
  /** Color of the value arc. Default `tokens.palette('accent')`. */
  color?: Color;
  /** Color of the track arc. Default `tokens.palette('ink-3', 0.18)`. */
  trackColor?: Color;
  /** Total angular span in degrees (e.g. `180` = half-arc). Default `180`. */
  sweepDeg?: number;
  /** Stroke thickness, px. Default `8`. */
  thicknessPx?: number;
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcCommands(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): PathCommand[] {
  const sweep = endDeg - startDeg;
  if (Math.abs(sweep) < 0.001) return [];
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = Math.abs(sweep) > 180;
  return [
    { op: 'M', x: start.x, y: start.y },
    { op: 'A', rx: r, ry: r, xAxisRotationDeg: 0, largeArc, sweep: sweep > 0, x: end.x, y: end.y },
  ];
}

function svgPath(cmds: PathCommand[]): string {
  return cmds.map(c => {
    if (c.op === 'M' || c.op === 'L') return `${c.op} ${c.x} ${c.y}`;
    if (c.op === 'A') return `A ${c.rx} ${c.ry} ${c.xAxisRotationDeg} ${c.largeArc ? 1 : 0} ${c.sweep ? 1 : 0} ${c.x} ${c.y}`;
    return '';
  }).join(' ');
}

interface Geom {
  cx: number;
  cy: number;
  r: number;
  startDeg: number;
  valueDeg: number;
  endDeg: number;
}

function geom(props: DataGaugeProps): Geom {
  const sweep = props.sweepDeg ?? 180;
  const thickness = props.thicknessPx ?? 8;
  const startDeg = -90 - sweep / 2;
  const endDeg = -90 + sweep / 2;
  const max = props.max ?? 100;
  const v = Math.max(0, Math.min(max, props.value ?? 0));
  const valueDeg = startDeg + (v / max) * sweep;
  const cx = props.bbox.x + props.bbox.w / 2;
  const cy = props.bbox.y + props.bbox.h - thickness;
  const r = Math.min(props.bbox.w / 2 - thickness, props.bbox.h - thickness);
  return { cx, cy, r, startDeg, valueDeg, endDeg };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DataGauge(props: DataGaugeProps): ReactNode {
  const t = defaultTokens;
  const g = geom(props);
  const thickness = props.thicknessPx ?? 8;
  const trackColor = colorToCss(props.trackColor ?? t.palette('ink-3', 0.18));
  const valueColor = colorToCss(props.color ?? t.palette('accent'));
  const trackD = svgPath(arcCommands(g.cx, g.cy, g.r, g.startDeg, g.endDeg));
  const valueD = svgPath(arcCommands(g.cx, g.cy, g.r, g.startDeg, g.valueDeg));
  return (
    <div
      data-recipe-id="data.gauge"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      <svg
        width={props.bbox.w}
        height={props.bbox.h}
        viewBox={`${props.bbox.x} ${props.bbox.y} ${props.bbox.w} ${props.bbox.h}`}
      >
        <path d={trackD} stroke={trackColor} strokeWidth={thickness} fill="none" strokeLinecap="round" />
        <path d={valueD} stroke={valueColor} strokeWidth={thickness} fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataGaugeToIR(
  props: DataGaugeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const g = geom(props);
  const thickness = props.thicknessPx ?? 8;
  const trackColor = props.trackColor ?? tokens.palette('ink-3', 0.18);
  const valueColor = props.color ?? tokens.palette('accent');

  const track: PathShapeNode = {
    kind: 'path',
    recipeId: 'data.gauge.track',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'gauge-track' },
    commands: arcCommands(g.cx, g.cy, g.r, g.startDeg, g.endDeg),
    fillRule: 'nonzero',
    strokeWidthPx: thickness,
    strokeColor: trackColor,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  const value: PathShapeNode = {
    kind: 'path',
    recipeId: 'data.gauge.value',
    bbox: { ...props.bbox },
    zOrder: 10,
    metadata: { role: 'gauge-value', value: props.value ?? 0, max: props.max ?? 100 },
    commands: arcCommands(g.cx, g.cy, g.r, g.startDeg, g.valueDeg),
    fillRule: 'nonzero',
    strokeWidthPx: thickness,
    strokeColor: valueColor,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  return {
    kind: 'group',
    recipeId: 'data.gauge',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.gauge',
      axis: 'data',
      value: props.value ?? 0,
      max: props.max ?? 100,
      sweepDeg: props.sweepDeg ?? 180,
      thicknessPx: thickness,
    },
    children: [track, value],
  };
}
