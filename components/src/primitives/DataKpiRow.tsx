/**
 * <DataKpiRow> — Tier-A primitive (`data.kpi-row`).
 *
 * N tabular metric blocks laid out as equal-width columns, each rendering
 * a small `eyebrow` label, a `numeral-md` value, and an optional `caption`
 * delta. Internally rendered (no `childrenIR`) so the tabular alignment is
 * authoritative.
 *
 * Composition (z-order bottom → top, per cell):
 *   - `data.kpi-row.cell-<n>.label`  TextNode (eyebrow)
 *   - `data.kpi-row.cell-<n>.value`  TextNode (numeral-md)
 *   - `data.kpi-row.cell-<n>.delta`  Optional TextNode (caption)
 *
 * Optional vertical dividers between cells (PathShape lines) when
 * `withDividers: true`.
 *
 * F1 deps: PathShape (only when `withDividers`).
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  PathShapeNode,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export interface KpiCell {
  label: string;
  value: string;
  delta?: string;
  /** Tint for the delta line. Default `tokens.palette('success')`. */
  deltaColor?: Color;
}

export interface DataKpiRowProps {
  bbox: Bbox;
  /** KPI cells. Optional — defaults to []. Synonym: `kpis`. */
  cells?: KpiCell[];
  /** Synonym for `cells` — atoms.yaml uses `kpis` for some recipes. */
  kpis?: KpiCell[];
  /** Render hairline dividers between cells. Default `false`. */
  withDividers?: boolean;
  /** Divider color. Default `tokens.palette('divider', 0.4)`. */
  dividerColor?: Color;
  /** Per-row gap. Default `tokens.slot('gutter')`. */
  gapPx?: number;
  children?: ReactNode;
}

const LABEL_H = 22;
const DELTA_H = 22;

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DataKpiRow(props: DataKpiRowProps): ReactNode {
  const t = defaultTokens;
  const eyebrow = t.type('eyebrow');
  const numeral = t.type('numeral-md');
  const cap = t.type('caption');
  const gap = props.gapPx ?? t.slot('gutter');
  const labelColor = colorToCss(t.palette('ink-3'));
  const valueColor = colorToCss(t.palette('ink-1'));
  const dividerColor = colorToCss(props.dividerColor ?? t.palette('divider', 0.4));
  return (
    <div
      data-recipe-id="data.kpi-row"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        display: 'flex',
        gap,
      }}
    >
      {(props.cells ?? props.kpis ?? []).map((cell, i) => (
        <div
          key={i}
          data-recipe-id={`data.kpi-row.cell-${i + 1}`}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingRight:
              props.withDividers && i < (props.cells ?? props.kpis ?? []).length - 1 ? gap / 2 : 0,
            borderRight:
              props.withDividers && i < (props.cells ?? props.kpis ?? []).length - 1
                ? `1px solid ${dividerColor}`
                : undefined,
          }}
        >
          <div style={{
            fontFamily: eyebrow.family,
            fontSize: eyebrow.sizePx,
            fontWeight: eyebrow.weight,
            letterSpacing: `${eyebrow.trackingEm}em`,
            color: labelColor,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            {cell.label}
          </div>
          <div style={{
            fontFamily: numeral.family,
            fontSize: numeral.sizePx,
            fontWeight: numeral.weight,
            lineHeight: numeral.leadingEm,
            letterSpacing: `${numeral.trackingEm}em`,
            color: valueColor,
          }}>
            {cell.value}
          </div>
          {cell.delta && (
            <div style={{
              fontFamily: cap.family,
              fontSize: cap.sizePx,
              fontWeight: cap.weight,
              color: colorToCss(cell.deltaColor ?? t.palette('success')),
              marginTop: 8,
            }}>
              {cell.delta}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataKpiRowToIR(
  props: DataKpiRowProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const eyebrow = tokens.type('eyebrow');
  const numeral = tokens.type('numeral-md');
  const cap = tokens.type('caption');
  const labelColor = tokens.palette('ink-3');
  const valueColor = tokens.palette('ink-1');
  const dividerColor = props.dividerColor ?? tokens.palette('divider', 0.4);
  const gap = props.gapPx ?? tokens.slot('gutter');

  const cells = props.cells ?? props.kpis ?? [];
  const n = cells.length;
  const totalGap = gap * Math.max(0, n - 1);
  const cellW = n > 0 ? (props.bbox.w - totalGap) / n : 0;

  const children: IRNode[] = [];
  cells.forEach((cell, i) => {
    const cellX = props.bbox.x + i * (cellW + gap);
    const valueY = props.bbox.y + props.bbox.h - numeral.sizePx - (cell.delta ? DELTA_H + 8 : 0);
    const labelY = valueY - LABEL_H - 8;

    const label: TextNode = {
      kind: 'text',
      recipeId: `data.kpi-row.cell-${i + 1}.label`,
      bbox: { x: cellX, y: labelY, w: cellW, h: LABEL_H },
      zOrder: i * 30,
      metadata: { role: 'kpi-label', index: i + 1 },
      paragraphs: [
        {
          runs: [
            {
              text: cell.label.toUpperCase(),
              fontSizePx: eyebrow.sizePx,
              fontWeight: eyebrow.weight,
              fontFamily: eyebrow.family,
              color: labelColor,
              italic: false,
              underline: false,
            },
          ],
          align: 'left',
        },
      ],
    };

    const value: TextNode = {
      kind: 'text',
      recipeId: `data.kpi-row.cell-${i + 1}.value`,
      bbox: { x: cellX, y: valueY, w: cellW, h: numeral.sizePx },
      zOrder: i * 30 + 10,
      metadata: { role: 'kpi-value', index: i + 1 },
      paragraphs: [
        {
          runs: [
            {
              text: cell.value,
              fontSizePx: numeral.sizePx,
              fontWeight: numeral.weight,
              fontFamily: numeral.family,
              color: valueColor,
              italic: false,
              underline: false,
            },
          ],
          align: 'left',
        },
      ],
    };

    children.push(label, value);

    if (cell.delta) {
      const delta: TextNode = {
        kind: 'text',
        recipeId: `data.kpi-row.cell-${i + 1}.delta`,
        bbox: { x: cellX, y: valueY + numeral.sizePx + 8, w: cellW, h: DELTA_H },
        zOrder: i * 30 + 20,
        metadata: { role: 'kpi-delta', index: i + 1 },
        paragraphs: [
          {
            runs: [
              {
                text: cell.delta,
                fontSizePx: cap.sizePx,
                fontWeight: cap.weight,
                fontFamily: cap.family,
                color: cell.deltaColor ?? tokens.palette('success'),
                italic: false,
                underline: false,
              },
            ],
            align: 'left',
          },
        ],
      };
      children.push(delta);
    }

    if (props.withDividers && i < n - 1) {
      const divX = cellX + cellW + gap / 2;
      const div: PathShapeNode = {
        kind: 'path',
        recipeId: `data.kpi-row.divider-${i + 1}`,
        bbox: { x: divX, y: props.bbox.y, w: 1, h: props.bbox.h },
        zOrder: i * 30 + 25,
        metadata: { role: 'kpi-divider' },
        commands: [
          { op: 'M', x: divX, y: props.bbox.y },
          { op: 'L', x: divX, y: props.bbox.y + props.bbox.h },
        ],
        fillRule: 'nonzero',
        strokeWidthPx: 1,
        strokeColor: dividerColor,
        strokeLinecap: 'butt',
        strokeLinejoin: 'miter',
      };
      children.push(div);
    }
  });

  return {
    kind: 'group',
    recipeId: 'data.kpi-row',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.kpi-row',
      axis: 'data',
      cellCount: n,
      withDividers: !!props.withDividers,
    },
    children,
  };
}
