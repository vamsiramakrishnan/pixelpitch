/**
 * <DataSparkline> — Tier-A primitive (`data.sparkline`).
 *
 * Inline trend line. Builds a typed PathShape from the supplied `values`,
 * laid out edge-to-edge inside `bbox`. Optionally fills the area under the
 * curve and/or marks the last point with a small oval.
 *
 * Composition (z-order bottom → top):
 *   - `data.sparkline.area`        Optional PathShape with Z close + gradient
 *                                  fill under the curve
 *   - `data.sparkline.line`        PathShape stroke (M + L commands)
 *   - `data.sparkline.last-marker` Optional ShapeNode oval at last point
 *
 * F1 deps: PathShape (`M`, `L`, `Z` commands).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  Fill,
  GroupNodeT,
  Node as IRNode,
  PathCommand,
  PathShapeNode,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface DataSparklineProps {
  bbox: Bbox;
  /** Series values. Min length 2. */
  values: number[];
  /** Stroke color. Default `tokens.palette('accent')`. */
  strokeColor?: Color;
  /** Stroke width px. Default 2. */
  strokeWidthPx?: number;
  /** Fill the area under the line. Default `false`. */
  fillUnder?: boolean;
  /** Area fill — if omitted and `fillUnder` is true, a vertical accent fade. */
  areaFill?: Fill;
  /** Mark the last point with a small oval. Default `true`. */
  withLastMarker?: boolean;
  /** Last-marker radius. Default 4. */
  markerRadiusPx?: number;
  children?: ReactNode;
}

interface SparklinePoints {
  pts: { x: number; y: number }[];
  baselineY: number;
}

function buildPoints(values: number[], bbox: Bbox): SparklinePoints {
  const n = values.length;
  if (n < 2) {
    const cy = bbox.y + bbox.h / 2;
    return {
      pts: [
        { x: bbox.x, y: cy },
        { x: bbox.x + bbox.w, y: cy },
      ],
      baselineY: bbox.y + bbox.h,
    };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = bbox.w / (n - 1);
  const pts = values.map((v, i) => ({
    x: bbox.x + i * step,
    y: bbox.y + bbox.h - ((v - min) / range) * bbox.h,
  }));
  return { pts, baselineY: bbox.y + bbox.h };
}

function lineCommands(pts: { x: number; y: number }[]): PathCommand[] {
  if (pts.length === 0) return [];
  const out: PathCommand[] = [{ op: 'M', x: pts[0]!.x, y: pts[0]!.y }];
  for (let i = 1; i < pts.length; i++) {
    out.push({ op: 'L', x: pts[i]!.x, y: pts[i]!.y });
  }
  return out;
}

function areaCommands(pts: { x: number; y: number }[], baselineY: number): PathCommand[] {
  if (pts.length === 0) return [];
  const cmds = lineCommands(pts);
  cmds.push({ op: 'L', x: pts[pts.length - 1]!.x, y: baselineY });
  cmds.push({ op: 'L', x: pts[0]!.x, y: baselineY });
  cmds.push({ op: 'Z' });
  return cmds;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DataSparkline(props: DataSparklineProps): ReactNode {
  const t = defaultTokens;
  const stroke = colorToCss(props.strokeColor ?? t.palette('accent'));
  const sw = props.strokeWidthPx ?? 2;
  const { pts, baselineY } = buildPoints(props.values, props.bbox);
  const last = pts[pts.length - 1]!;
  const r = props.markerRadiusPx ?? 4;
  const showMarker = props.withLastMarker ?? true;
  const polyline = pts.map(p => `${p.x - props.bbox.x},${p.y - props.bbox.y}`).join(' ');
  const areaPoly = `${pts[0]!.x - props.bbox.x},${baselineY - props.bbox.y} ` +
    pts.map(p => `${p.x - props.bbox.x},${p.y - props.bbox.y}`).join(' ') +
    ` ${last.x - props.bbox.x},${baselineY - props.bbox.y}`;
  return (
    <div
      data-recipe-id="data.sparkline"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      <svg width={props.bbox.w} height={props.bbox.h} viewBox={`0 0 ${props.bbox.w} ${props.bbox.h}`}>
        {props.fillUnder && (
          <polygon data-recipe-id="data.sparkline.area" points={areaPoly} fill={stroke} fillOpacity={0.2} />
        )}
        <polyline data-recipe-id="data.sparkline.line" points={polyline} fill="none" stroke={stroke} strokeWidth={sw} />
        {showMarker && (
          <circle
            data-recipe-id="data.sparkline.last-marker"
            cx={last.x - props.bbox.x}
            cy={last.y - props.bbox.y}
            r={r}
            fill={stroke}
          />
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataSparklineToIR(
  props: DataSparklineProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const stroke = props.strokeColor ?? tokens.palette('accent');
  const sw = props.strokeWidthPx ?? 2;
  const { pts, baselineY } = buildPoints(props.values, props.bbox);
  const last = pts[pts.length - 1]!;
  const r = props.markerRadiusPx ?? 4;
  const showMarker = props.withLastMarker ?? true;

  const children: IRNode[] = [];

  if (props.fillUnder) {
    const fill: Fill = props.areaFill ?? {
      kind: 'linear-gradient',
      angleDeg: 180,
      stops: [
        { color: stroke, position: 0 },
        { color: { hex: typeof stroke === 'string' ? stroke : stroke.hex, alpha: 0 }, position: 1 },
      ],
    };
    const area: PathShapeNode = {
      kind: 'path',
      recipeId: 'data.sparkline.area',
      bbox: { ...props.bbox },
      zOrder: 0,
      metadata: { role: 'sparkline-area' },
      commands: areaCommands(pts, baselineY),
      fill,
      fillRule: 'nonzero',
      strokeWidthPx: 0,
      strokeLinecap: 'butt',
      strokeLinejoin: 'miter',
    };
    children.push(area);
  }

  const line: PathShapeNode = {
    kind: 'path',
    recipeId: 'data.sparkline.line',
    bbox: { ...props.bbox },
    zOrder: 10,
    metadata: { role: 'sparkline-line', samples: props.values.length },
    commands: lineCommands(pts),
    fillRule: 'nonzero',
    strokeWidthPx: sw,
    strokeColor: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  children.push(line);

  if (showMarker) {
    const marker: ShapeNode = {
      kind: 'shape',
      recipeId: 'data.sparkline.last-marker',
      bbox: { x: last.x - r, y: last.y - r, w: r * 2, h: r * 2 },
      zOrder: 20,
      metadata: { role: 'sparkline-last-marker' },
      shape: 'oval',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: stroke },
    };
    children.push(marker);
  }

  return {
    kind: 'group',
    recipeId: 'data.sparkline',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.sparkline',
      axis: 'data',
      sampleCount: props.values.length,
      fillUnder: !!props.fillUnder,
    },
    children,
  };
}
