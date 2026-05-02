/**
 * <DataDonut> — Tier-A primitive (`data.donut`).
 *
 * Donut/pie chart. Builds one PathShape per segment using `M` + `A` (arc)
 * commands so segments stay native (PPTX `<a:custGeom>` arc) instead of
 * rasterizing. Each segment is a separate path so colors can differ.
 *
 * Composition (z-order bottom → top):
 *   - `data.donut.segment-<i>`  PathShape per segment, with arc commands
 *   - `data.donut.hole`         Optional ShapeNode oval covering the inner
 *                               radius (only present when `innerRadiusFrac > 0`)
 *
 * F1 deps: PathShape (`A` command).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  PathCommand,
  PathShapeNode,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface DonutSegment {
  value: number;
  /** Solid color for this slice. */
  color?: Color;
  /** Optional label, exposed via metadata. */
  label?: string;
}

export interface DataDonutProps {
  bbox: Bbox;
  segments: DonutSegment[];
  /** Inner hole radius as fraction of outer radius. Default 0.6 (donut). */
  innerRadiusFrac?: number;
  /** Hole fill (matches slide bg). Default `tokens.palette('surface-1')`. */
  holeColor?: Color;
  /** Default segment color when `segments[i].color` is undefined. */
  defaultColor?: Color;
  /** Start angle in degrees, measured from 12-o'clock CW. Default -90 (top). */
  startAngleDeg?: number;
  children?: ReactNode;
}

interface ArcGeom {
  cx: number;
  cy: number;
  r: number;
  innerR: number;
}

function geom(bbox: Bbox, innerFrac: number): ArcGeom {
  const r = Math.min(bbox.w, bbox.h) / 2;
  return {
    cx: bbox.x + bbox.w / 2,
    cy: bbox.y + bbox.h / 2,
    r,
    innerR: r * innerFrac,
  };
}

function polar(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentCommands(
  cx: number,
  cy: number,
  r: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): PathCommand[] {
  const sweepDeg = endDeg - startDeg;
  const largeArc = sweepDeg > 180;
  const outerStart = polar(cx, cy, r, startDeg);
  const outerEnd = polar(cx, cy, r, endDeg);
  if (innerR <= 0) {
    return [
      { op: 'M', x: cx, y: cy },
      { op: 'L', x: outerStart.x, y: outerStart.y },
      { op: 'A', rx: r, ry: r, xAxisRotationDeg: 0, largeArc, sweep: true, x: outerEnd.x, y: outerEnd.y },
      { op: 'Z' },
    ];
  }
  const innerStart = polar(cx, cy, innerR, startDeg);
  const innerEnd = polar(cx, cy, innerR, endDeg);
  return [
    { op: 'M', x: outerStart.x, y: outerStart.y },
    { op: 'A', rx: r, ry: r, xAxisRotationDeg: 0, largeArc, sweep: true, x: outerEnd.x, y: outerEnd.y },
    { op: 'L', x: innerEnd.x, y: innerEnd.y },
    { op: 'A', rx: innerR, ry: innerR, xAxisRotationDeg: 0, largeArc, sweep: false, x: innerStart.x, y: innerStart.y },
    { op: 'Z' },
  ];
}

// ---------------------------------------------------------------------------
// React preview (uses SVG for previewability)
// ---------------------------------------------------------------------------

function svgArcPath(cmds: PathCommand[]): string {
  return cmds.map(c => {
    if (c.op === 'M' || c.op === 'L') return `${c.op} ${c.x} ${c.y}`;
    if (c.op === 'A') {
      return `A ${c.rx} ${c.ry} ${c.xAxisRotationDeg} ${c.largeArc ? 1 : 0} ${c.sweep ? 1 : 0} ${c.x} ${c.y}`;
    }
    if (c.op === 'Z') return 'Z';
    return '';
  }).join(' ');
}

export default function DataDonut(props: DataDonutProps): ReactNode {
  const t = defaultTokens;
  const innerFrac = props.innerRadiusFrac ?? 0.6;
  const startAngle = props.startAngleDeg ?? -90;
  const g = geom(props.bbox, innerFrac);
  const total = props.segments.reduce((s, x) => s + x.value, 0) || 1;
  const defaultColor = props.defaultColor ?? t.palette('accent');
  const hole = colorToCss(props.holeColor ?? t.palette('surface-1'));
  let cursor = startAngle;
  return (
    <div
      data-recipe-id="data.donut"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      <svg width={props.bbox.w} height={props.bbox.h} viewBox={`${props.bbox.x} ${props.bbox.y} ${props.bbox.w} ${props.bbox.h}`}>
        {props.segments.map((seg, i) => {
          const sweep = (seg.value / total) * 360;
          const cmds = segmentCommands(g.cx, g.cy, g.r, g.innerR, cursor, cursor + sweep);
          cursor += sweep;
          return (
            <path
              key={i}
              data-recipe-id={`data.donut.segment-${i + 1}`}
              d={svgArcPath(cmds)}
              fill={colorToCss(seg.color ?? defaultColor)}
            />
          );
        })}
        {innerFrac > 0 && (
          <circle data-recipe-id="data.donut.hole" cx={g.cx} cy={g.cy} r={g.innerR} fill={hole} />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataDonutToIR(
  props: DataDonutProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const innerFrac = props.innerRadiusFrac ?? 0.6;
  const startAngle = props.startAngleDeg ?? -90;
  const g = geom(props.bbox, innerFrac);
  const total = props.segments.reduce((s, x) => s + x.value, 0) || 1;
  const defaultColor = props.defaultColor ?? tokens.palette('accent');
  const holeColor = props.holeColor ?? tokens.palette('surface-1');

  const children: IRNode[] = [];
  let cursor = startAngle;
  props.segments.forEach((seg, i) => {
    const sweep = (seg.value / total) * 360;
    const segColor = seg.color ?? defaultColor;
    const cmds = segmentCommands(g.cx, g.cy, g.r, g.innerR, cursor, cursor + sweep);
    cursor += sweep;
    const path: PathShapeNode = {
      kind: 'path',
      recipeId: `data.donut.segment-${i + 1}`,
      bbox: { ...props.bbox },
      zOrder: i * 10,
      metadata: {
        role: 'donut-segment',
        index: i + 1,
        value: seg.value,
        label: seg.label ?? null,
        startDeg: cursor - sweep,
        sweepDeg: sweep,
      },
      commands: cmds,
      fill: { kind: 'solid', color: segColor },
      fillRule: 'nonzero',
      strokeWidthPx: 0,
      strokeLinecap: 'butt',
      strokeLinejoin: 'miter',
    };
    children.push(path);
  });

  if (innerFrac > 0) {
    const hole: ShapeNode = {
      kind: 'shape',
      recipeId: 'data.donut.hole',
      bbox: {
        x: g.cx - g.innerR,
        y: g.cy - g.innerR,
        w: g.innerR * 2,
        h: g.innerR * 2,
      },
      zOrder: props.segments.length * 10,
      metadata: { role: 'donut-hole' },
      shape: 'oval',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: holeColor },
    };
    children.push(hole);
  }

  return {
    kind: 'group',
    recipeId: 'data.donut',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.donut',
      axis: 'data',
      segmentCount: props.segments.length,
      innerRadiusFrac: innerFrac,
      startAngleDeg: startAngle,
    },
    children,
  };
}
