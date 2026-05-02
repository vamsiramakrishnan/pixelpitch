/**
 * <DataTable> — Tier-A primitive (`data.table`).
 *
 * Header + body table with optional zebra striping, vertical column dividers,
 * horizontal row dividers, and per-column alignment.
 *
 * Composition (z-order bottom → top):
 *   - `data.table.zebra-<i>`      Optional ShapeNode rect per body row (alt rows)
 *   - `data.table.h-divider-<i>`  PathShape line under header + between rows
 *   - `data.table.v-divider-<i>`  Optional PathShape line between columns
 *   - `data.table.header-<i>`     TextNode per column header
 *   - `data.table.cell-<r>-<c>`   TextNode per body cell
 *
 * F1 deps: PathShape (for dividers).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  PathShapeNode,
  ShapeNode,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type CellAlign = 'left' | 'center' | 'right';

export interface DataTableProps {
  bbox: Bbox;
  headers: string[];
  rows: string[][];
  /** Per-column alignment. Default `'left'`. */
  align?: CellAlign[];
  /** Zebra alternating row tint. Default `true`. */
  zebra?: boolean;
  /** Vertical column dividers. Default `false`. */
  withVerticalDividers?: boolean;
  /** Horizontal row dividers (under header always; between rows when true). Default `false`. */
  withRowDividers?: boolean;
  /** Header background tint. Default `tokens.palette('surface-2')`. */
  headerBgColor?: Color;
  /** Zebra row tint. Default `tokens.palette('surface-2', 0.4)`. */
  zebraColor?: Color;
  /** Divider color. Default `tokens.palette('divider', 0.4)`. */
  dividerColor?: Color;
  children?: ReactNode;
}

const HEADER_PAD = 12;
const CELL_PAD = 12;

function colWidth(bbox: Bbox, cols: number): number {
  return cols > 0 ? bbox.w / cols : 0;
}

function rowHeight(bbox: Bbox, headerH: number, rowCount: number): number {
  return rowCount > 0 ? (bbox.h - headerH) / rowCount : 0;
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DataTable(props: DataTableProps): ReactNode {
  const t = defaultTokens;
  const body = t.type('body');
  const eyebrow = t.type('eyebrow');
  const headerColor = colorToCss(t.palette('ink-2'));
  const cellColor = colorToCss(t.palette('ink-1'));
  const headerBg = colorToCss(props.headerBgColor ?? t.palette('surface-2'));
  const zebraColor = colorToCss(props.zebraColor ?? t.palette('surface-2', 0.4));
  const dividerColor = colorToCss(props.dividerColor ?? t.palette('divider', 0.4));
  const headerH = eyebrow.sizePx + HEADER_PAD * 2;
  const align = props.align ?? props.headers.map(() => 'left' as CellAlign);
  return (
    <div
      data-recipe-id="data.table"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', height: headerH, background: headerBg, borderBottom: `1px solid ${dividerColor}` }}>
        {props.headers.map((h, c) => (
          <div
            key={c}
            data-recipe-id={`data.table.header-${c + 1}`}
            style={{
              flex: 1,
              padding: HEADER_PAD,
              fontFamily: eyebrow.family,
              fontSize: eyebrow.sizePx,
              fontWeight: eyebrow.weight,
              letterSpacing: `${eyebrow.trackingEm}em`,
              textTransform: 'uppercase',
              color: headerColor,
              textAlign: align[c] ?? 'left',
              borderRight:
                props.withVerticalDividers && c < props.headers.length - 1
                  ? `1px solid ${dividerColor}`
                  : undefined,
            }}
          >
            {h}
          </div>
        ))}
      </div>
      {props.rows.map((row, r) => (
        <div
          key={r}
          style={{
            display: 'flex',
            flex: 1,
            background: props.zebra && r % 2 === 1 ? zebraColor : 'transparent',
            borderBottom: props.withRowDividers && r < props.rows.length - 1 ? `1px solid ${dividerColor}` : undefined,
          }}
        >
          {row.map((cell, c) => (
            <div
              key={c}
              data-recipe-id={`data.table.cell-${r + 1}-${c + 1}`}
              style={{
                flex: 1,
                padding: CELL_PAD,
                fontFamily: body.family,
                fontSize: body.sizePx,
                fontWeight: body.weight,
                color: cellColor,
                textAlign: align[c] ?? 'left',
                borderRight:
                  props.withVerticalDividers && c < row.length - 1
                    ? `1px solid ${dividerColor}`
                    : undefined,
              }}
            >
              {cell}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataTableToIR(
  props: DataTableProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const body = tokens.type('body');
  const eyebrow = tokens.type('eyebrow');
  const headerColor = tokens.palette('ink-2');
  const cellColor = tokens.palette('ink-1');
  const headerBgColor = props.headerBgColor ?? tokens.palette('surface-2');
  const zebraColor = props.zebraColor ?? tokens.palette('surface-2', 0.4);
  const dividerColor = props.dividerColor ?? tokens.palette('divider', 0.4);

  const cols = props.headers.length;
  const rowCount = props.rows.length;
  const align = props.align ?? props.headers.map(() => 'left' as CellAlign);
  const headerH = eyebrow.sizePx + HEADER_PAD * 2;
  const cw = colWidth(props.bbox, cols);
  const rh = rowHeight(props.bbox, headerH, rowCount);

  const children: IRNode[] = [];

  // Header background
  const headerBg: ShapeNode = {
    kind: 'shape',
    recipeId: 'data.table.header-bg',
    bbox: { x: props.bbox.x, y: props.bbox.y, w: props.bbox.w, h: headerH },
    zOrder: 0,
    metadata: { role: 'table-header-bg' },
    shape: 'rect',
    borderRadiusPx: 0,
    fill: { kind: 'solid', color: headerBgColor },
  };
  children.push(headerBg);

  // Zebra rows
  if (props.zebra) {
    for (let r = 1; r < rowCount; r += 2) {
      const zebra: ShapeNode = {
        kind: 'shape',
        recipeId: `data.table.zebra-${r + 1}`,
        bbox: {
          x: props.bbox.x,
          y: props.bbox.y + headerH + r * rh,
          w: props.bbox.w,
          h: rh,
        },
        zOrder: 5,
        metadata: { role: 'table-zebra', row: r + 1 },
        shape: 'rect',
        borderRadiusPx: 0,
        fill: { kind: 'solid', color: zebraColor },
      };
      children.push(zebra);
    }
  }

  // Header divider (always under header)
  {
    const y = props.bbox.y + headerH;
    const div: PathShapeNode = {
      kind: 'path',
      recipeId: 'data.table.h-divider-0',
      bbox: { x: props.bbox.x, y: y - 0.5, w: props.bbox.w, h: 1 },
      zOrder: 10,
      metadata: { role: 'table-h-divider', kind: 'header' },
      commands: [
        { op: 'M', x: props.bbox.x, y },
        { op: 'L', x: props.bbox.x + props.bbox.w, y },
      ],
      fillRule: 'nonzero',
      strokeWidthPx: 1,
      strokeColor: dividerColor,
      strokeLinecap: 'butt',
      strokeLinejoin: 'miter',
    };
    children.push(div);
  }

  // Row dividers
  if (props.withRowDividers) {
    for (let r = 1; r < rowCount; r++) {
      const y = props.bbox.y + headerH + r * rh;
      const div: PathShapeNode = {
        kind: 'path',
        recipeId: `data.table.h-divider-${r}`,
        bbox: { x: props.bbox.x, y: y - 0.5, w: props.bbox.w, h: 1 },
        zOrder: 10 + r,
        metadata: { role: 'table-h-divider', row: r },
        commands: [
          { op: 'M', x: props.bbox.x, y },
          { op: 'L', x: props.bbox.x + props.bbox.w, y },
        ],
        fillRule: 'nonzero',
        strokeWidthPx: 1,
        strokeColor: dividerColor,
        strokeLinecap: 'butt',
        strokeLinejoin: 'miter',
      };
      children.push(div);
    }
  }

  // Vertical dividers
  if (props.withVerticalDividers) {
    for (let c = 1; c < cols; c++) {
      const x = props.bbox.x + c * cw;
      const div: PathShapeNode = {
        kind: 'path',
        recipeId: `data.table.v-divider-${c}`,
        bbox: { x: x - 0.5, y: props.bbox.y, w: 1, h: props.bbox.h },
        zOrder: 20 + c,
        metadata: { role: 'table-v-divider', col: c },
        commands: [
          { op: 'M', x, y: props.bbox.y },
          { op: 'L', x, y: props.bbox.y + props.bbox.h },
        ],
        fillRule: 'nonzero',
        strokeWidthPx: 1,
        strokeColor: dividerColor,
        strokeLinecap: 'butt',
        strokeLinejoin: 'miter',
      };
      children.push(div);
    }
  }

  // Headers
  props.headers.forEach((h, c) => {
    const cellBbox: Bbox = {
      x: props.bbox.x + c * cw + HEADER_PAD,
      y: props.bbox.y + HEADER_PAD,
      w: Math.max(0, cw - HEADER_PAD * 2),
      h: Math.max(0, headerH - HEADER_PAD * 2),
    };
    const node: TextNode = {
      kind: 'text',
      recipeId: `data.table.header-${c + 1}`,
      bbox: cellBbox,
      zOrder: 30 + c,
      metadata: { role: 'table-header', col: c + 1 },
      paragraphs: [
        {
          runs: [
            {
              text: h.toUpperCase(),
              fontSizePx: eyebrow.sizePx,
              fontWeight: eyebrow.weight,
              fontFamily: eyebrow.family,
              color: headerColor,
              italic: false,
              underline: false,
            },
          ],
          align: align[c] ?? 'left',
        },
      ],
    };
    children.push(node);
  });

  // Cells
  props.rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      const cellBbox: Bbox = {
        x: props.bbox.x + c * cw + CELL_PAD,
        y: props.bbox.y + headerH + r * rh + CELL_PAD,
        w: Math.max(0, cw - CELL_PAD * 2),
        h: Math.max(0, rh - CELL_PAD * 2),
      };
      const node: TextNode = {
        kind: 'text',
        recipeId: `data.table.cell-${r + 1}-${c + 1}`,
        bbox: cellBbox,
        zOrder: 100 + r * 10 + c,
        metadata: { role: 'table-cell', row: r + 1, col: c + 1 },
        paragraphs: [
          {
            runs: [
              {
                text: cell,
                fontSizePx: body.sizePx,
                fontWeight: body.weight,
                fontFamily: body.family,
                color: cellColor,
                italic: false,
                underline: false,
              },
            ],
            align: align[c] ?? 'left',
          },
        ],
      };
      children.push(node);
    });
  });

  return {
    kind: 'group',
    recipeId: 'data.table',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.table',
      axis: 'data',
      columns: cols,
      rows: rowCount,
      zebra: !!props.zebra,
      withVerticalDividers: !!props.withVerticalDividers,
      withRowDividers: !!props.withRowDividers,
    },
    children,
  };
}
