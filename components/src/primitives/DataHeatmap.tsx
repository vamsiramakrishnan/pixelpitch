/**
 * <DataHeatmap> — Tier-A primitive (`data.heatmap`).
 *
 * A 2-D grid of cells colored on a continuous scale — the GitHub
 * "contribution graph" pattern. Backs `data.mini-heatmap`. Each cell
 * resolves to its own ShapeNode (rounded-rect) so the matcher can
 * reverse-engineer the cluster.
 *
 * Composition (z-order bottom → top):
 *   - `data.heatmap.cell-<r>-<c>`  ShapeNode per cell
 *
 * F1 deps: none (rect grid).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface DataHeatmapProps {
  bbox: Bbox;
  /** `cells[r][c]` — value in 0..1 (clamped). Ragged rows are padded right. */
  cells: number[][];
  /** [low, high] color stops. Defaults to `[ink-3 alpha 0.05, accent]`. */
  colorScale?: [Color, Color];
  /** Inter-cell gap, px. Default `2`. */
  gapPx?: number;
  /** Cell corner radius, px. Default `2`. */
  cornerPx?: number;
}

function lerpAlpha(low: Color, high: Color, t: number): Color {
  // Linear interpolation between two `Color` values. The Python compiler
  // doesn't accept arbitrary CSS, so we resolve at IR-emit time to a
  // single `{hex, alpha}` per cell.
  const tt = Math.max(0, Math.min(1, t));
  const aHex = typeof low === 'string' ? low : low.hex;
  const bHex = typeof high === 'string' ? high : high.hex;
  const aAlpha = typeof low === 'string' ? 1 : (low.alpha ?? 1);
  const bAlpha = typeof high === 'string' ? 1 : (high.alpha ?? 1);
  const ar = parseInt(aHex.slice(1, 3), 16), ag = parseInt(aHex.slice(3, 5), 16), ab = parseInt(aHex.slice(5, 7), 16);
  const br = parseInt(bHex.slice(1, 3), 16), bg = parseInt(bHex.slice(3, 5), 16), bb = parseInt(bHex.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * tt);
  const g = Math.round(ag + (bg - ag) * tt);
  const b = Math.round(ab + (bb - ab) * tt);
  const alpha = aAlpha + (bAlpha - aAlpha) * tt;
  const hh = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
  return { hex: hh, alpha };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DataHeatmap(props: DataHeatmapProps): ReactNode {
  const t = defaultTokens;
  const cols = Math.max(0, ...props.cells.map(r => r.length));
  const rows = props.cells.length;
  const gap = props.gapPx ?? 2;
  const corner = props.cornerPx ?? 2;
  const scale: [Color, Color] = props.colorScale ?? [t.palette('ink-3', 0.05), t.palette('accent')];
  return (
    <div
      data-recipe-id="data.heatmap"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap,
      }}
    >
      {props.cells.flatMap((row, r) =>
        row.map((value, c) => {
          const color = lerpAlpha(scale[0], scale[1], value);
          return (
            <div
              key={`${r}-${c}`}
              data-recipe-id={`data.heatmap.cell-${r + 1}-${c + 1}`}
              style={{
                background: colorToCss(color),
                borderRadius: corner,
              }}
            />
          );
        }),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataHeatmapToIR(
  props: DataHeatmapProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const rows = props.cells.length;
  const cols = Math.max(0, ...props.cells.map(r => r.length));
  const gap = props.gapPx ?? 2;
  const corner = props.cornerPx ?? 2;
  const scale: [Color, Color] = props.colorScale ?? [tokens.palette('ink-3', 0.05), tokens.palette('accent')];

  const cellW = cols > 0 ? (props.bbox.w - gap * (cols - 1)) / cols : 0;
  const cellH = rows > 0 ? (props.bbox.h - gap * (rows - 1)) / rows : 0;

  const children: ShapeNode[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < (props.cells[r]?.length ?? 0); c += 1) {
      const value = props.cells[r]?.[c] ?? 0;
      const color = lerpAlpha(scale[0], scale[1], value);
      children.push({
        kind: 'shape',
        recipeId: `data.heatmap.cell-${r + 1}-${c + 1}`,
        bbox: {
          x: props.bbox.x + c * (cellW + gap),
          y: props.bbox.y + r * (cellH + gap),
          w: cellW,
          h: cellH,
        },
        zOrder: r * cols * 10 + c * 10,
        metadata: { role: 'heatmap-cell', row: r, col: c, value },
        shape: 'rounded-rect',
        borderRadiusPx: corner,
        fill: { kind: 'solid', color },
      });
    }
  }

  return {
    kind: 'group',
    recipeId: 'data.heatmap',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.heatmap',
      axis: 'data',
      rows,
      cols,
      gapPx: gap,
      cornerPx: corner,
    },
    children,
  };
}
