/**
 * <DiagramTimeline> — Tier-A primitive (`diagram.timeline`).
 *
 * Horizontal rail with N tick lines and N stacked label/date pairs. Common
 * substrate for `comp.roadmap-quarterly`, product launch chronologies,
 * timeline diagrams.
 *
 * Composition (z-order bottom → top):
 *   - `diagram.timeline.rail`           PathShape horizontal line
 *   - `diagram.timeline.tick-<i>`       PathShape short vertical line per event
 *   - `diagram.timeline.dot-<i>`        ShapeNode oval at the rail intersection
 *   - `diagram.timeline.label-<i>`      TextNode (eyebrow) for the title
 *   - `diagram.timeline.date-<i>`       TextNode (caption) for the date
 *
 * F1 deps: PathShape (rail + ticks).
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

export interface TimelineEvent {
  /** 0..1 position along the rail (left → right). */
  at: number;
  date: string;
  label: string;
}

export interface DiagramTimelineProps {
  bbox: Bbox;
  events: TimelineEvent[];
  /** Rail color. Default `tokens.palette('divider', 0.5)`. */
  railColor?: Color;
  /** Tick + dot color. Default `tokens.palette('accent')`. */
  accentColor?: Color;
  /** Where on the bbox the rail sits (0..1). Default 0.5. */
  railY?: number;
  children?: ReactNode;
}

const TICK_LEN = 12;
const DOT_R = 5;
const LABEL_H = 22;
const DATE_H = 18;

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DiagramTimeline(props: DiagramTimelineProps): ReactNode {
  const t = defaultTokens;
  const eyebrow = t.type('eyebrow');
  const caption = t.type('caption');
  const rail = colorToCss(props.railColor ?? t.palette('divider', 0.5));
  const accent = colorToCss(props.accentColor ?? t.palette('accent'));
  const railY = (props.railY ?? 0.5) * props.bbox.h;
  return (
    <div
      data-recipe-id="diagram.timeline"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
      }}
    >
      <div
        data-recipe-id="diagram.timeline.rail"
        style={{
          position: 'absolute',
          left: 0,
          top: railY,
          width: props.bbox.w,
          height: 1,
          background: rail,
        }}
      />
      {props.events.map((ev, i) => {
        const x = ev.at * props.bbox.w;
        return (
          <div key={i} style={{ position: 'absolute', left: 0, top: 0 }}>
            <div
              data-recipe-id={`diagram.timeline.tick-${i + 1}`}
              style={{
                position: 'absolute',
                left: x,
                top: railY - TICK_LEN / 2,
                width: 1,
                height: TICK_LEN,
                background: accent,
              }}
            />
            <div
              data-recipe-id={`diagram.timeline.dot-${i + 1}`}
              style={{
                position: 'absolute',
                left: x - DOT_R,
                top: railY - DOT_R,
                width: DOT_R * 2,
                height: DOT_R * 2,
                background: accent,
                borderRadius: '50%',
              }}
            />
            <div
              data-recipe-id={`diagram.timeline.date-${i + 1}`}
              style={{
                position: 'absolute',
                left: x - 60,
                top: railY + DOT_R + 8,
                width: 120,
                fontFamily: caption.family,
                fontSize: caption.sizePx,
                color: colorToCss(t.palette('ink-3')),
                textAlign: 'center',
              }}
            >
              {ev.date}
            </div>
            <div
              data-recipe-id={`diagram.timeline.label-${i + 1}`}
              style={{
                position: 'absolute',
                left: x - 80,
                top: railY + DOT_R + 8 + DATE_H + 4,
                width: 160,
                fontFamily: eyebrow.family,
                fontSize: eyebrow.sizePx,
                fontWeight: eyebrow.weight,
                letterSpacing: `${eyebrow.trackingEm}em`,
                textTransform: 'uppercase',
                color: colorToCss(t.palette('ink-1')),
                textAlign: 'center',
              }}
            >
              {ev.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function diagramTimelineToIR(
  props: DiagramTimelineProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const eyebrow = tokens.type('eyebrow');
  const caption = tokens.type('caption');
  const railColor = props.railColor ?? tokens.palette('divider', 0.5);
  const accentColor = props.accentColor ?? tokens.palette('accent');
  const labelColor = tokens.palette('ink-1');
  const dateColor = tokens.palette('ink-3');
  const railY = props.bbox.y + (props.railY ?? 0.5) * props.bbox.h;

  const children: IRNode[] = [];

  // Rail
  const rail: PathShapeNode = {
    kind: 'path',
    recipeId: 'diagram.timeline.rail',
    bbox: { x: props.bbox.x, y: railY - 0.5, w: props.bbox.w, h: 1 },
    zOrder: 0,
    metadata: { role: 'timeline-rail' },
    commands: [
      { op: 'M', x: props.bbox.x, y: railY },
      { op: 'L', x: props.bbox.x + props.bbox.w, y: railY },
    ],
    fillRule: 'nonzero',
    strokeWidthPx: 1,
    strokeColor: railColor,
    strokeLinecap: 'butt',
    strokeLinejoin: 'miter',
  };
  children.push(rail);

  // Events
  props.events.forEach((ev, i) => {
    const x = props.bbox.x + ev.at * props.bbox.w;

    const tick: PathShapeNode = {
      kind: 'path',
      recipeId: `diagram.timeline.tick-${i + 1}`,
      bbox: { x: x - 0.5, y: railY - TICK_LEN / 2, w: 1, h: TICK_LEN },
      zOrder: 10 + i * 5,
      metadata: { role: 'timeline-tick', index: i + 1 },
      commands: [
        { op: 'M', x, y: railY - TICK_LEN / 2 },
        { op: 'L', x, y: railY + TICK_LEN / 2 },
      ],
      fillRule: 'nonzero',
      strokeWidthPx: 1,
      strokeColor: accentColor,
      strokeLinecap: 'butt',
      strokeLinejoin: 'miter',
    };
    children.push(tick);

    const dot: ShapeNode = {
      kind: 'shape',
      recipeId: `diagram.timeline.dot-${i + 1}`,
      bbox: { x: x - DOT_R, y: railY - DOT_R, w: DOT_R * 2, h: DOT_R * 2 },
      zOrder: 11 + i * 5,
      metadata: { role: 'timeline-dot', index: i + 1 },
      shape: 'oval',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: accentColor },
    };
    children.push(dot);

    const date: TextNode = {
      kind: 'text',
      recipeId: `diagram.timeline.date-${i + 1}`,
      bbox: { x: x - 60, y: railY + DOT_R + 8, w: 120, h: DATE_H },
      zOrder: 12 + i * 5,
      metadata: { role: 'timeline-date', index: i + 1, value: ev.date },
      paragraphs: [
        {
          runs: [
            {
              text: ev.date,
              fontSizePx: caption.sizePx,
              fontWeight: caption.weight,
              fontFamily: caption.family,
              color: dateColor,
              italic: false,
              underline: false,
            },
          ],
          align: 'center',
        },
      ],
    };
    children.push(date);

    const label: TextNode = {
      kind: 'text',
      recipeId: `diagram.timeline.label-${i + 1}`,
      bbox: { x: x - 80, y: railY + DOT_R + 8 + DATE_H + 4, w: 160, h: LABEL_H },
      zOrder: 13 + i * 5,
      metadata: { role: 'timeline-label', index: i + 1, value: ev.label },
      paragraphs: [
        {
          runs: [
            {
              text: ev.label.toUpperCase(),
              fontSizePx: eyebrow.sizePx,
              fontWeight: eyebrow.weight,
              fontFamily: eyebrow.family,
              color: labelColor,
              italic: false,
              underline: false,
            },
          ],
          align: 'center',
        },
      ],
    };
    children.push(label);
  });

  return {
    kind: 'group',
    recipeId: 'diagram.timeline',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'diagram.timeline',
      axis: 'diagram',
      eventCount: props.events.length,
      railY: props.railY ?? 0.5,
    },
    children,
  };
}
