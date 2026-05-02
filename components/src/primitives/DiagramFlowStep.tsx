/**
 * <DiagramFlowStep> — Tier-A primitive (`diagram.flow-step`).
 *
 * One step in a stepper / roadmap / numbered flow: a numeral inside a
 * circle or pill, with a caption to the right. Reusable by `ui.stepper`,
 * `comp.roadmap-quarterly`, and any "1. discover → 2. design → 3. ship"
 * narrative slide.
 *
 * Composition (z-order bottom → top):
 *   - `diagram.flow-step.dot`    ShapeNode (oval / pill) tinted by accent
 *   - `diagram.flow-step.numeral` TextNode (the step number)
 *   - `diagram.flow-step.label`  TextNode (the description)
 *
 * F1 deps: none.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  Color,
  GroupNodeT,
  ShapeNode,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type FlowStepShape = 'circle' | 'pill';

export interface DiagramFlowStepProps {
  bbox: Bbox;
  /** Numeral or short tag (e.g., `1`, `'Q1'`). */
  n: number | string;
  /** Step caption. */
  label: string;
  /** Accent color for the dot fill. Default `tokens.palette('accent')`. */
  accent?: Color;
  /** Dot shape. Default `'circle'`. */
  shape?: FlowStepShape;
}

const DOT_DIAM = 36;

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function DiagramFlowStep(props: DiagramFlowStepProps): ReactNode {
  const t = defaultTokens;
  const accent = colorToCss(props.accent ?? t.palette('accent'));
  const ink = colorToCss(t.palette('ink-1'));
  const inkInverse = colorToCss(t.palette('ink-inverse'));
  const shape = props.shape ?? 'circle';
  const dotW = shape === 'pill' ? DOT_DIAM * 1.5 : DOT_DIAM;
  return (
    <div
      data-recipe-id="diagram.flow-step"
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        data-recipe-id="diagram.flow-step.dot"
        style={{
          width: dotW,
          height: DOT_DIAM,
          background: accent,
          color: inkInverse,
          borderRadius: 9999,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {props.n}
      </div>
      <div
        data-recipe-id="diagram.flow-step.label"
        style={{
          color: ink,
          fontSize: 14,
        }}
      >
        {props.label}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function diagramFlowStepToIR(
  props: DiagramFlowStepProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const accent = props.accent ?? tokens.palette('accent');
  const ink = tokens.palette('ink-1');
  const inkInverse = tokens.palette('ink-inverse');
  const shape = props.shape ?? 'circle';
  const dotW = shape === 'pill' ? DOT_DIAM * 1.5 : DOT_DIAM;
  const dotBbox: Bbox = {
    x: props.bbox.x,
    y: props.bbox.y + (props.bbox.h - DOT_DIAM) / 2,
    w: dotW,
    h: DOT_DIAM,
  };
  const labelBbox: Bbox = {
    x: props.bbox.x + dotW + 12,
    y: props.bbox.y,
    w: Math.max(0, props.bbox.w - dotW - 12),
    h: props.bbox.h,
  };

  const dot: ShapeNode = {
    kind: 'shape',
    recipeId: 'diagram.flow-step.dot',
    bbox: dotBbox,
    zOrder: 0,
    metadata: { role: 'flow-step-dot', shape, n: props.n },
    shape: shape === 'pill' ? 'rounded-rect' : 'oval',
    borderRadiusPx: 9999,
    fill: { kind: 'solid', color: accent },
  };

  const numeral: TextNode = {
    kind: 'text',
    recipeId: 'diagram.flow-step.numeral',
    bbox: dotBbox,
    zOrder: 10,
    metadata: { role: 'flow-step-numeral' },
    paragraphs: [{
      runs: [{
        text: String(props.n),
        fontSizePx: 14,
        fontWeight: 700,
        fontFamily: tokens.fonts.sans,
        color: inkInverse,
        italic: false,
        underline: false,
      }],
      align: 'center',
    }],
  };

  const label: TextNode = {
    kind: 'text',
    recipeId: 'diagram.flow-step.label',
    bbox: labelBbox,
    zOrder: 10,
    metadata: { role: 'flow-step-label' },
    paragraphs: [{
      runs: [{
        text: props.label,
        fontSizePx: 14,
        fontWeight: 500,
        fontFamily: tokens.fonts.sans,
        color: ink,
        italic: false,
        underline: false,
      }],
      align: 'left',
    }],
  };

  return {
    kind: 'group',
    recipeId: 'diagram.flow-step',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'diagram.flow-step',
      axis: 'diagram',
      n: props.n,
      shape,
    },
    children: [dot, numeral, label],
  };
}
