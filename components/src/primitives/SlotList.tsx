/**
 * <SlotList> — Tier-A primitive (`slot.list`).
 *
 * Ordered or unordered list slot. Renders one row per item, with the marker
 * laid out in a leading column and the label in a wider trailing column.
 *
 * Marker variants:
 *   - `'bullet'`    — small filled circle (ShapeNode oval)
 *   - `'check'`     — checkmark glyph drawn via PathShapeNode (F1: PathShape)
 *   - `'numbered'`  — `1.` `2.` … numerals
 *   - `'dash'`      — em dash glyph
 *
 * Composition (z-order bottom → top, per item):
 *   - `slot.list.marker-<i>`  ShapeNode | PathShapeNode | TextNode
 *   - `slot.list.label-<i>`   TextNode (body register by default)
 *
 * F1 deps: PathShape (for checks).
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

export type ListMarker = 'bullet' | 'check' | 'numbered' | 'dash';

export interface SlotListProps {
  bbox: Bbox;
  /** List items. Optional — defaults to []. */
  items?: string[];
  /** Marker style. Default `'bullet'`. */
  marker?: ListMarker;
  /** Item text color. Default `tokens.palette('ink-1')`. */
  color?: Color;
  /** Marker tint. Default `tokens.palette('accent')` for checks/numbered, `'ink-3'` for bullet/dash. */
  markerColor?: Color;
  /** Vertical gap between items. Default 12. */
  rowGapPx?: number;
  /** Marker column width. Default 32. */
  markerWidthPx?: number;
  children?: ReactNode;
}

const MARKER_GAP = 12;

function defaultMarkerColor(marker: ListMarker, tokens: TokensApi): Color {
  if (marker === 'check' || marker === 'numbered') return tokens.palette('accent');
  return tokens.palette('ink-3');
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function SlotList(props: SlotListProps): ReactNode {
  const t = defaultTokens;
  const body = t.type('body');
  const marker = props.marker ?? 'bullet';
  const color = colorToCss(props.color ?? t.palette('ink-1'));
  const markColor = colorToCss(props.markerColor ?? defaultMarkerColor(marker, t));
  const markerW = props.markerWidthPx ?? 32;
  const gap = props.rowGapPx ?? 12;
  return (
    <div
      data-recipe-id="slot.list"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        fontFamily: body.family,
        fontSize: body.sizePx,
        fontWeight: body.weight,
        lineHeight: body.leadingEm,
        color,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {(props.items ?? []).map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: MARKER_GAP }}>
          <div
            data-recipe-id={`slot.list.marker-${i + 1}`}
            style={{
              width: markerW,
              flex: '0 0 auto',
              color: markColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {marker === 'numbered' && `${i + 1}.`}
            {marker === 'bullet' && '•'}
            {marker === 'check' && '✓'}
            {marker === 'dash' && '—'}
          </div>
          <div data-recipe-id={`slot.list.label-${i + 1}`} style={{ flex: 1 }}>{item}</div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

function buildCheckPath(cx: number, cy: number, size: number): PathShapeNode {
  // V-shape checkmark: down-right then up-right.
  const half = size / 2;
  return {
    kind: 'path',
    recipeId: 'slot.list.marker-check-glyph',
    bbox: { x: cx - half, y: cy - half, w: size, h: size },
    zOrder: 0,
    metadata: {},
    commands: [
      { op: 'M', x: cx - half * 0.7, y: cy },
      { op: 'L', x: cx - half * 0.15, y: cy + half * 0.6 },
      { op: 'L', x: cx + half * 0.7, y: cy - half * 0.4 },
    ],
    fillRule: 'nonzero',
    strokeWidthPx: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
}

export function slotListToIR(
  props: SlotListProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const body = tokens.type('body');
  const marker = props.marker ?? 'bullet';
  const color = props.color ?? tokens.palette('ink-1');
  const markColor = props.markerColor ?? defaultMarkerColor(marker, tokens);
  const markerW = props.markerWidthPx ?? 32;
  const rowGap = props.rowGapPx ?? 12;

  const items = props.items ?? [];
  const itemCount = Math.max(1, items.length);
  const totalGap = rowGap * (itemCount - 1);
  const rowH = (props.bbox.h - totalGap) / itemCount;

  const children: IRNode[] = [];

  items.forEach((label, i) => {
    const rowY = props.bbox.y + i * (rowH + rowGap);
    const markerBbox: Bbox = { x: props.bbox.x, y: rowY, w: markerW, h: rowH };
    const labelBbox: Bbox = {
      x: props.bbox.x + markerW + MARKER_GAP,
      y: rowY,
      w: Math.max(0, props.bbox.w - markerW - MARKER_GAP),
      h: rowH,
    };

    let markerNode: IRNode;
    if (marker === 'check') {
      const cx = markerBbox.x + markerBbox.w - 8;
      const cy = markerBbox.y + markerBbox.h / 2;
      const path = buildCheckPath(cx, cy, 14);
      markerNode = {
        ...path,
        recipeId: `slot.list.marker-${i + 1}`,
        metadata: { role: 'list-marker', kind: 'check', index: i + 1 },
        strokeColor: markColor,
        zOrder: i * 20,
      };
    } else if (marker === 'bullet') {
      const oval: ShapeNode = {
        kind: 'shape',
        recipeId: `slot.list.marker-${i + 1}`,
        bbox: {
          x: markerBbox.x + markerBbox.w - 14,
          y: markerBbox.y + markerBbox.h / 2 - 4,
          w: 8,
          h: 8,
        },
        zOrder: i * 20,
        metadata: { role: 'list-marker', kind: 'bullet', index: i + 1 },
        shape: 'oval',
        borderRadiusPx: 0,
        fill: { kind: 'solid', color: markColor },
      };
      markerNode = oval;
    } else {
      // numbered + dash both render as small text glyph
      const glyph = marker === 'numbered' ? `${i + 1}.` : '—';
      const text: TextNode = {
        kind: 'text',
        recipeId: `slot.list.marker-${i + 1}`,
        bbox: markerBbox,
        zOrder: i * 20,
        metadata: { role: 'list-marker', kind: marker, index: i + 1 },
        paragraphs: [
          {
            runs: [
              {
                text: glyph,
                fontSizePx: body.sizePx,
                fontWeight: 600,
                fontFamily: body.family,
                color: markColor,
                italic: false,
                underline: false,
              },
            ],
            align: 'right',
          },
        ],
      };
      markerNode = text;
    }
    children.push(markerNode);

    const labelNode: TextNode = {
      kind: 'text',
      recipeId: `slot.list.label-${i + 1}`,
      bbox: labelBbox,
      zOrder: i * 20 + 10,
      metadata: { role: 'list-label', index: i + 1 },
      paragraphs: [
        {
          runs: [
            {
              text: label,
              fontSizePx: body.sizePx,
              fontWeight: body.weight,
              fontFamily: body.family,
              color,
              italic: false,
              underline: false,
            },
          ],
          align: 'left',
        },
      ],
    };
    children.push(labelNode);
  });

  return {
    kind: 'group',
    recipeId: 'slot.list',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'slot.list', axis: 'slot', marker, count: items.length },
    children,
  };
}
