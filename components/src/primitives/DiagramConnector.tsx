/**
 * <DiagramConnector> — Tier-A primitive (`diagram.connector`).
 *
 * A directional path between two anchor points with an optional arrowhead.
 * Three routing kinds:
 *   - `'straight'`     — single line (M + L)
 *   - `'orthogonal'`   — manhattan two-segment (M + L + L), via a midpoint
 *                        on the dominant axis
 *   - `'curved'`       — cubic Bezier (M + C) with control points offset
 *                        on the dominant axis by 50% of the span
 *
 * Composition (z-order bottom → top):
 *   - Single PathShapeNode, `recipeId: 'diagram.connector'`
 *
 * Stroke color/width and arrowhead size flow through props. Tokens supply
 * defaults (`tokens.palette('ink-3')`, `2px`).
 *
 * F1 deps: PathShape, Arrowhead.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  PathCommand,
  PathShapeNode,
  Arrowhead,
  ArrowheadSize,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type ConnectorKind = 'straight' | 'orthogonal' | 'curved';

export interface DiagramConnectorProps {
  /** Optional bbox — when provided, from/to default to its left/right midpoints. */
  bbox?: Bbox;
  /** Start anchor. Optional when `bbox` is set. */
  from?: { x: number; y: number };
  /** End anchor. Optional when `bbox` is set. */
  to?: { x: number; y: number };
  /** Routing style. Default `'straight'`. */
  kind?: ConnectorKind;
  /** Stroke color. Default `tokens.palette('ink-3')`. */
  strokeColor?: Color;
  /** Stroke width px. Default 2. */
  strokeWidthPx?: number;
  /** Dash pattern. Default solid. */
  strokeDasharray?: number[];
  /** Arrowhead at the start anchor. Default `none`. */
  markerStart?: Arrowhead;
  /** Arrowhead at the end anchor. Default `{ kind: 'arrow', size: 'md' }`. */
  markerEnd?: Arrowhead;
  /** Convenience: when set and `markerEnd` is undefined, arrowhead at end with this size. */
  arrowSize?: ArrowheadSize;
  children?: ReactNode;
}

function buildCommands(
  from: { x: number; y: number },
  to: { x: number; y: number },
  kind: ConnectorKind,
): PathCommand[] {
  if (kind === 'straight') {
    return [
      { op: 'M', x: from.x, y: from.y },
      { op: 'L', x: to.x, y: to.y },
    ];
  }
  if (kind === 'orthogonal') {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    if (dx >= dy) {
      const midX = (from.x + to.x) / 2;
      return [
        { op: 'M', x: from.x, y: from.y },
        { op: 'L', x: midX, y: from.y },
        { op: 'L', x: midX, y: to.y },
        { op: 'L', x: to.x, y: to.y },
      ];
    }
    const midY = (from.y + to.y) / 2;
    return [
      { op: 'M', x: from.x, y: from.y },
      { op: 'L', x: from.x, y: midY },
      { op: 'L', x: to.x, y: midY },
      { op: 'L', x: to.x, y: to.y },
    ];
  }
  // curved — cubic Bezier with controls offset 50% along dominant axis
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [
      { op: 'M', x: from.x, y: from.y },
      {
        op: 'C',
        x1: from.x + dx * 0.5, y1: from.y,
        x2: to.x - dx * 0.5,   y2: to.y,
        x: to.x, y: to.y,
      },
    ];
  }
  return [
    { op: 'M', x: from.x, y: from.y },
    {
      op: 'C',
      x1: from.x, y1: from.y + dy * 0.5,
      x2: to.x,   y2: to.y - dy * 0.5,
      x: to.x, y: to.y,
    },
  ];
}

function commandsBbox(cmds: PathCommand[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cmds) {
    const points: { x: number; y: number }[] = [];
    if (c.op === 'M' || c.op === 'L') points.push({ x: c.x, y: c.y });
    if (c.op === 'C') {
      points.push({ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }, { x: c.x, y: c.y });
    }
    if (c.op === 'Q') points.push({ x: c.x1, y: c.y1 }, { x: c.x, y: c.y });
    if (c.op === 'A') points.push({ x: c.x, y: c.y });
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

function resolveAnchors(props: DiagramConnectorProps): {
  from: { x: number; y: number };
  to: { x: number; y: number };
} {
  if (props.from && props.to) return { from: props.from, to: props.to };
  if (props.bbox) {
    const midY = props.bbox.y + props.bbox.h / 2;
    return {
      from: props.from ?? { x: props.bbox.x, y: midY },
      to: props.to ?? { x: props.bbox.x + props.bbox.w, y: midY },
    };
  }
  return {
    from: props.from ?? { x: 0, y: 0 },
    to: props.to ?? { x: 100, y: 0 },
  };
}

export default function DiagramConnector(props: DiagramConnectorProps): ReactNode {
  const t = defaultTokens;
  const stroke = colorToCss(props.strokeColor ?? t.palette('ink-3'));
  const sw = props.strokeWidthPx ?? 2;
  const kind = props.kind ?? 'straight';
  const { from, to } = resolveAnchors(props);
  const cmds = buildCommands(from, to, kind);
  const bbox = commandsBbox(cmds);
  const dash = props.strokeDasharray?.join(' ');
  // SVG path string in absolute coords
  const d = cmds.map(c => {
    if (c.op === 'M' || c.op === 'L') return `${c.op} ${c.x} ${c.y}`;
    if (c.op === 'C') return `C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`;
    if (c.op === 'Q') return `Q ${c.x1} ${c.y1} ${c.x} ${c.y}`;
    if (c.op === 'Z') return 'Z';
    return '';
  }).join(' ');
  const showEnd = (props.markerEnd?.kind ?? 'arrow') !== 'none';
  return (
    <div
      data-recipe-id="diagram.connector"
      style={{
        position: 'absolute',
        left: bbox.x - 12,
        top: bbox.y - 12,
        width: bbox.w + 24,
        height: bbox.h + 24,
        pointerEvents: 'none',
      }}
    >
      <svg width={bbox.w + 24} height={bbox.h + 24} viewBox={`${bbox.x - 12} ${bbox.y - 12} ${bbox.w + 24} ${bbox.h + 24}`}>
        <defs>
          {showEnd && (
            <marker id="arrow-end" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill={stroke} />
            </marker>
          )}
        </defs>
        <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={dash} markerEnd={showEnd ? 'url(#arrow-end)' : undefined} />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function diagramConnectorToIR(
  props: DiagramConnectorProps,
  tokens: TokensApi = defaultTokens,
): PathShapeNode {
  const stroke = props.strokeColor ?? tokens.palette('ink-3');
  const sw = props.strokeWidthPx ?? 2;
  const kind = props.kind ?? 'straight';
  const { from, to } = resolveAnchors(props);
  const cmds = buildCommands(from, to, kind);
  const bbox = commandsBbox(cmds);

  const markerEnd: Arrowhead = props.markerEnd ?? {
    kind: 'arrow',
    size: props.arrowSize ?? 'md',
  };
  const markerStart: Arrowhead = props.markerStart ?? { kind: 'none', size: 'md' };

  return {
    kind: 'path',
    recipeId: 'diagram.connector',
    bbox,
    zOrder: 0,
    metadata: {
      role: 'diagram.connector',
      axis: 'diagram',
      kind,
      from,
      to,
    },
    commands: cmds,
    fillRule: 'nonzero',
    strokeWidthPx: sw,
    strokeColor: stroke,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...(props.strokeDasharray ? { strokeDasharray: props.strokeDasharray } : {}),
    markerStart,
    markerEnd,
  };
}
