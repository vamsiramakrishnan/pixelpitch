/**
 * <DataBar> — Tier-A primitive (`data.bar`).
 *
 * Bar set, horizontal or vertical. Lays out N rounded-rect bars inside the
 * parent bbox, sized in proportion to each value over the series max
 * (`max` defaults to `Math.max(...values)`).
 *
 * Composition (z-order bottom → top):
 *   - `data.bar.bar-<i>`  ShapeNode rounded-rect, one per value
 *
 * Each bar carries `metadata.value` so the matcher round-trip can recover
 * the underlying datum.
 *
 * F1 deps: none. (Pure rect math.)
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  Node as IRNode,
  ShapeNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type BarOrientation = 'horizontal' | 'vertical';

export interface DataBarProps {
  bbox: Bbox;
  values: number[];
  /** Bar orientation. Default `'vertical'`. */
  orientation?: BarOrientation;
  /** Bar fill color. Default `tokens.palette('accent')`. */
  color?: Color;
  /** Series max for normalization. Default `Math.max(...values)`. */
  max?: number;
  /** Gap between bars in px. Default `tokens.slot('gutter-tight')`. */
  gapPx?: number;
  /** Bar corner radius. Default 4. */
  radiusPx?: number;
  /** Optional per-bar labels (used as metadata, not rendered). */
  labels?: string[];
  children?: ReactNode;
}

interface BarLayout {
  bbox: Bbox;
  value: number;
  index: number;
}

function layoutBars(
  values: number[],
  parent: Bbox,
  orientation: BarOrientation,
  gap: number,
  max: number,
): BarLayout[] {
  const n = values.length;
  if (n === 0) return [];
  if (orientation === 'vertical') {
    const totalGap = gap * (n - 1);
    const barW = (parent.w - totalGap) / n;
    return values.map((v, i) => {
      const h = Math.max(0, (v / max) * parent.h);
      return {
        bbox: { x: parent.x + i * (barW + gap), y: parent.y + parent.h - h, w: barW, h },
        value: v,
        index: i,
      };
    });
  }
  const totalGap = gap * (n - 1);
  const barH = (parent.h - totalGap) / n;
  return values.map((v, i) => {
    const w = Math.max(0, (v / max) * parent.w);
    return {
      bbox: { x: parent.x, y: parent.y + i * (barH + gap), w, h: barH },
      value: v,
      index: i,
    };
  });
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DataBar(props: DataBarProps): ReactNode {
  const t = defaultTokens;
  const orient = props.orientation ?? 'vertical';
  const color = colorToCss(props.color ?? t.palette('accent'));
  const gap = props.gapPx ?? t.slot('gutter-tight');
  const max = props.max ?? (props.values.length ? Math.max(...props.values) : 1);
  const r = props.radiusPx ?? 4;
  const bars = layoutBars(props.values, props.bbox, orient, gap, max);
  return (
    <div
      data-recipe-id="data.bar"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      {bars.map(b => (
        <div
          key={b.index}
          data-recipe-id={`data.bar.bar-${b.index + 1}`}
          style={{
            position: 'absolute',
            left: b.bbox.x - props.bbox.x,
            top: b.bbox.y - props.bbox.y,
            width: b.bbox.w,
            height: b.bbox.h,
            background: color,
            borderRadius: r,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function dataBarToIR(
  props: DataBarProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const orient = props.orientation ?? 'vertical';
  const color = props.color ?? tokens.palette('accent');
  const gap = props.gapPx ?? tokens.slot('gutter-tight');
  const max = props.max ?? (props.values.length ? Math.max(...props.values) : 1);
  const radius = props.radiusPx ?? 4;
  const bars = layoutBars(props.values, props.bbox, orient, gap, max);

  const children: IRNode[] = bars.map(b => {
    const node: ShapeNode = {
      kind: 'shape',
      recipeId: `data.bar.bar-${b.index + 1}`,
      bbox: b.bbox,
      zOrder: b.index * 10,
      metadata: {
        role: 'data-bar',
        index: b.index,
        value: b.value,
        label: props.labels?.[b.index] ?? null,
      },
      shape: 'rounded-rect',
      borderRadiusPx: radius,
      fill: { kind: 'solid', color },
    };
    return node;
  });

  return {
    kind: 'group',
    recipeId: 'data.bar',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'data.bar',
      axis: 'data',
      orientation: orient,
      barCount: bars.length,
      max,
    },
    children,
  };
}
