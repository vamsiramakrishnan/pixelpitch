/**
 * <FrameBento> — Tier-A primitive (`frame.bento`).
 *
 * Pure N×M grid layout. Partitions a parent bbox into `columns × rows` cells
 * separated by `gap` px (default `tokens.slot('gutter')`), then places each
 * caller-supplied `cells[i].childIR` into the rectangle that spans the
 * declared `(row, col)` origin and `(rowSpan, colSpan)` extent.
 *
 * Composition (z-order bottom → top):
 *   - `frame.bento`             Outer GroupNode (the grid itself; no chrome)
 *     - `frame.bento.cell-<n>`  One GroupNode wrapper per cell, holding the
 *                               caller's child IR positioned at the cell bbox.
 *
 * Cell wrappers carry `metadata.role: 'bento-cell'` plus `row`, `col`,
 * `rowSpan`, `colSpan` so reverse-mapping (PPTX → IR) and the matcher
 * fingerprint can recover the layout intent.
 *
 * F1 deps: `clipPath` (optional, surfaced through a per-cell prop). No path
 * geometry of its own.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  ClipPath,
  GroupNodeT,
  Node as IRNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';

export interface FrameBentoCell {
  /** 0-based row origin. */
  row: number;
  /** 0-based column origin. */
  col: number;
  /** Row span (default 1). */
  rowSpan?: number;
  /** Column span (default 1). */
  colSpan?: number;
  /** Optional caller IR placed inside this cell. */
  childIR?: IRNode;
  /** Optional clip applied to the cell wrapper group. */
  clipPath?: ClipPath;
  /** Optional metadata merged into the cell wrapper. */
  metadata?: Record<string, unknown>;
}

export interface FrameBentoProps {
  bbox: Bbox;
  /** Grid columns. Optional — defaults to 1. */
  columns?: number;
  /** Grid rows. Optional — defaults to 1. */
  rows?: number;
  /** Gap between cells. Defaults to `tokens.slot('gutter')`. */
  gap?: number;
  /** Cell list. Optional — defaults to []. */
  cells?: FrameBentoCell[];
  /** React preview content (renders cell outlines for visual debugging). */
  children?: ReactNode;
}

function cellBbox(
  parent: Bbox,
  cell: FrameBentoCell,
  cols: number,
  rows: number,
  gap: number,
): Bbox {
  const colSpan = cell.colSpan ?? 1;
  const rowSpan = cell.rowSpan ?? 1;
  const cellW = cols > 0 ? (parent.w - gap * (cols - 1)) / cols : 0;
  const cellH = rows > 0 ? (parent.h - gap * (rows - 1)) / rows : 0;
  return {
    x: parent.x + cell.col * (cellW + gap),
    y: parent.y + cell.row * (cellH + gap),
    w: cellW * colSpan + gap * (colSpan - 1),
    h: cellH * rowSpan + gap * (rowSpan - 1),
  };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function FrameBento(props: FrameBentoProps): ReactNode {
  const t = defaultTokens;
  const gap = props.gap ?? t.slot('gutter');
  return (
    <div
      data-recipe-id="frame.bento"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      {(props.cells ?? []).map((cell, i) => {
        const b = cellBbox(props.bbox, cell, props.columns ?? 1, props.rows ?? 1, gap);
        return (
          <div
            key={i}
            data-recipe-id={`frame.bento.cell-${i + 1}`}
            style={{
              position: 'absolute',
              left: b.x - props.bbox.x,
              top: b.y - props.bbox.y,
              width: b.w,
              height: b.h,
              outline: `1px dashed ${t.fonts.sans /* placeholder */ ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
              boxSizing: 'border-box',
            }}
          />
        );
      })}
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function frameBentoToIR(
  props: FrameBentoProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const gap = props.gap ?? tokens.slot('gutter');
  const columns = props.columns ?? 1;
  const rows = props.rows ?? 1;
  const cells = props.cells ?? [];
  const cellGroups: IRNode[] = cells.map((cell, i) => {
    const b = cellBbox(props.bbox, cell, columns, rows, gap);
    const inner: IRNode[] = cell.childIR
      ? [{ ...cell.childIR, bbox: cell.childIR.bbox ?? b }]
      : [];
    const wrapper: GroupNodeT = {
      kind: 'group',
      recipeId: `frame.bento.cell-${i + 1}`,
      bbox: b,
      zOrder: i * 10,
      metadata: {
        role: 'bento-cell',
        axis: 'frame',
        index: i,
        row: cell.row,
        col: cell.col,
        rowSpan: cell.rowSpan ?? 1,
        colSpan: cell.colSpan ?? 1,
        ...(cell.metadata ?? {}),
      },
      ...(cell.clipPath ? { clipPath: cell.clipPath } : {}),
      children: inner,
    };
    return wrapper;
  });

  return {
    kind: 'group',
    recipeId: 'frame.bento',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'frame.bento',
      axis: 'frame',
      columns,
      rows,
      gap,
      cellCount: cells.length,
    },
    children: cellGroups,
  };
}
