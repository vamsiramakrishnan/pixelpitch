/**
 * Wave-2 schema tests for the IR extensions (Crew F1).
 *
 * Coverage:
 *   - Round-trip parse for every new variant (PathCommand op, PathShapeNode,
 *     PatternFill, ClipPath both kinds, onPath, mask both kinds, every new
 *     shape preset, multi-shadow array).
 *   - Backward-compat: a v1 IR document with `shadow:` (singular) still
 *     validates.
 *   - Discriminated-union failure cases (e.g., PathCommand op='M' missing
 *     `x` rejects).
 */

import { describe, expect, it } from 'vitest';

import {
  Arrowhead,
  ArrowheadKind,
  ArrowheadSize,
  ClipPath,
  Deck,
  Fill,
  Node,
  PathCommand,
  PathShapeNode,
  PatternFill,
  PictureNode,
  ShapeNode,
  Slide,
  TextNode,
} from '../schema';
import { normalizeShadows, pathBbox } from '../normalize';

// ---------------------------------------------------------------------------
// PathCommand discriminated union
// ---------------------------------------------------------------------------

describe('PathCommand', () => {
  it('round-trips every op', () => {
    const samples = [
      { op: 'M', x: 1, y: 2 },
      { op: 'L', x: 3, y: 4 },
      { op: 'C', x1: 5, y1: 6, x2: 7, y2: 8, x: 9, y: 10 },
      { op: 'Q', x1: 11, y1: 12, x: 13, y: 14 },
      {
        op: 'A',
        rx: 15,
        ry: 16,
        xAxisRotationDeg: 17,
        largeArc: true,
        sweep: false,
        x: 18,
        y: 19,
      },
      { op: 'Z' },
    ] as const;
    for (const cmd of samples) {
      const parsed = PathCommand.parse(cmd);
      expect(parsed.op).toBe(cmd.op);
    }
  });

  it("applies defaults for the 'A' arc command", () => {
    const parsed = PathCommand.parse({ op: 'A', rx: 10, ry: 10, x: 50, y: 50 });
    if (parsed.op !== 'A') throw new Error('discriminator narrowed wrong');
    expect(parsed.xAxisRotationDeg).toBe(0);
    expect(parsed.largeArc).toBe(false);
    expect(parsed.sweep).toBe(true);
  });

  it("rejects op='M' missing required fields", () => {
    const r = PathCommand.safeParse({ op: 'M', x: 1 });
    expect(r.success).toBe(false);
  });

  it("rejects op='C' missing a control point coordinate", () => {
    const r = PathCommand.safeParse({
      op: 'C',
      x1: 1, y1: 2,
      x2: 3,
      x: 5, y: 6,
    });
    expect(r.success).toBe(false);
  });

  it('rejects unknown ops', () => {
    const r = PathCommand.safeParse({ op: 'X', x: 0, y: 0 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Arrowhead
// ---------------------------------------------------------------------------

describe('Arrowhead', () => {
  it('round-trips all kinds and sizes', () => {
    const kinds = ['none', 'arrow', 'dot', 'diamond', 'bar'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;
    for (const kind of kinds) expect(ArrowheadKind.parse(kind)).toBe(kind);
    for (const size of sizes) expect(ArrowheadSize.parse(size)).toBe(size);
  });

  it('applies defaults', () => {
    const a = Arrowhead.parse({});
    expect(a.kind).toBe('none');
    expect(a.size).toBe('md');
  });
});

// ---------------------------------------------------------------------------
// PathShapeNode
// ---------------------------------------------------------------------------

describe('PathShapeNode', () => {
  it('round-trips a stroke-only sparkline path', () => {
    const node = {
      kind: 'path',
      recipeId: 'sparkline',
      bbox: { x: 0, y: 0, w: 100, h: 40 },
      zOrder: 10,
      metadata: { role: 'sparkline-line' },
      commands: [
        { op: 'M', x: 0, y: 20 },
        { op: 'L', x: 50, y: 5 },
        { op: 'L', x: 100, y: 35 },
      ],
      strokeWidthPx: 2,
      strokeColor: '#a78bfa',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    };
    const parsed = PathShapeNode.parse(node);
    expect(parsed.commands).toHaveLength(3);
    expect(parsed.fill).toBeUndefined();
    expect(parsed.fillRule).toBe('nonzero');
    expect(parsed.strokeLinecap).toBe('round');
  });

  it('round-trips a connector with arrowhead markers', () => {
    const node = {
      kind: 'path',
      recipeId: 'connector',
      bbox: { x: 100, y: 100, w: 200, h: 0 },
      zOrder: 0,
      metadata: {},
      commands: [
        { op: 'M', x: 100, y: 100 },
        { op: 'L', x: 300, y: 100 },
      ],
      strokeWidthPx: 1.5,
      strokeColor: { hex: '#ffffff', alpha: 0.6 },
      strokeDasharray: [4, 2],
      markerStart: { kind: 'dot', size: 'sm' },
      markerEnd: { kind: 'arrow', size: 'md' },
    };
    const parsed = PathShapeNode.parse(node);
    expect(parsed.markerEnd?.kind).toBe('arrow');
    expect(parsed.markerStart?.kind).toBe('dot');
    expect(parsed.strokeDasharray).toEqual([4, 2]);
  });

  it('round-trips a filled donut segment via arc commands', () => {
    const node = {
      kind: 'path',
      recipeId: 'donut.segment',
      bbox: { x: 0, y: 0, w: 200, h: 200 },
      zOrder: 5,
      metadata: {},
      commands: [
        { op: 'M', x: 100, y: 0 },
        {
          op: 'A',
          rx: 100,
          ry: 100,
          xAxisRotationDeg: 0,
          largeArc: false,
          sweep: true,
          x: 200,
          y: 100,
        },
        { op: 'L', x: 100, y: 100 },
        { op: 'Z' },
      ],
      fill: { kind: 'solid', color: '#10b981' },
      fillRule: 'evenodd',
    };
    const parsed = PathShapeNode.parse(node);
    expect(parsed.fillRule).toBe('evenodd');
    expect(parsed.fill?.kind).toBe('solid');
  });

  it('parses through the top-level Node validator', () => {
    const parsed = Node.parse({
      kind: 'path',
      recipeId: 'p',
      zOrder: 0,
      metadata: {},
      commands: [{ op: 'M', x: 0, y: 0 }, { op: 'Z' }],
    });
    expect(parsed.kind).toBe('path');
  });
});

// ---------------------------------------------------------------------------
// PatternFill (and Fill discriminated union extension)
// ---------------------------------------------------------------------------

describe('PatternFill', () => {
  it('round-trips every preset pattern', () => {
    const patterns = [
      'dots',
      'lines-h',
      'lines-v',
      'lines-grid',
      'diagonal',
      'crosshatch',
    ] as const;
    for (const pattern of patterns) {
      const parsed = PatternFill.parse({
        kind: 'pattern',
        pattern,
        fgColor: '#ffffff',
      });
      expect(parsed.pattern).toBe(pattern);
      expect(parsed.tileWidthPx).toBe(16);
      expect(parsed.tileHeightPx).toBe(16);
      expect(parsed.featureSizePx).toBe(1);
      expect(parsed.angleDeg).toBe(0);
    }
  });

  it('round-trips through the Fill union', () => {
    const fill = Fill.parse({
      kind: 'pattern',
      pattern: 'dots',
      fgColor: { hex: '#a78bfa', alpha: 0.4 },
      bgColor: '#070710',
      tileWidthPx: 24,
      tileHeightPx: 24,
      featureSizePx: 1.5,
      angleDeg: 45,
    });
    if (fill.kind !== 'pattern') throw new Error('discriminator narrowed wrong');
    expect(fill.pattern).toBe('dots');
    expect(fill.tileWidthPx).toBe(24);
  });

  it('rejects tile sizes below 2', () => {
    const r = PatternFill.safeParse({
      kind: 'pattern',
      pattern: 'dots',
      fgColor: '#ffffff',
      tileWidthPx: 1,
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ClipPath
// ---------------------------------------------------------------------------

describe('ClipPath', () => {
  it('round-trips rounded-rect clip', () => {
    const parsed = ClipPath.parse({ kind: 'rounded-rect', radiusPx: 16 });
    if (parsed.kind !== 'rounded-rect') throw new Error('discriminator narrowed wrong');
    expect(parsed.radiusPx).toBe(16);
    expect(parsed.insetPx).toBe(0);
  });

  it('round-trips path clip with commands', () => {
    const parsed = ClipPath.parse({
      kind: 'path',
      commands: [
        { op: 'M', x: 0, y: 0 },
        { op: 'L', x: 100, y: 0 },
        { op: 'L', x: 100, y: 100 },
        { op: 'Z' },
      ],
      fillRule: 'evenodd',
    });
    if (parsed.kind !== 'path') throw new Error('discriminator narrowed wrong');
    expect(parsed.commands).toHaveLength(4);
    expect(parsed.fillRule).toBe('evenodd');
  });

  it('attaches to every node kind via the NodeBase clipPath slot', () => {
    const clip = { kind: 'rounded-rect', radiusPx: 8 } as const;

    const text = TextNode.parse({
      kind: 'text',
      recipeId: 't',
      zOrder: 0,
      metadata: {},
      paragraphs: [{ runs: [{ text: 'hello' }] }],
      clipPath: clip,
    });
    expect(text.clipPath?.kind).toBe('rounded-rect');

    const shape = ShapeNode.parse({
      kind: 'shape',
      recipeId: 's',
      zOrder: 0,
      metadata: {},
      shape: 'rect',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: '#000000' },
      clipPath: clip,
    });
    expect(shape.clipPath?.kind).toBe('rounded-rect');

    const picture = PictureNode.parse({
      kind: 'picture',
      recipeId: 'p',
      zOrder: 0,
      metadata: {},
      src: 'data:image/png;base64,AAA',
      clipPath: clip,
    });
    expect(picture.clipPath?.kind).toBe('rounded-rect');

    const path = PathShapeNode.parse({
      kind: 'path',
      recipeId: 'pp',
      zOrder: 0,
      metadata: {},
      commands: [{ op: 'M', x: 0, y: 0 }],
      clipPath: clip,
    });
    expect(path.clipPath?.kind).toBe('rounded-rect');

    const group = Node.parse({
      kind: 'group',
      recipeId: 'g',
      zOrder: 0,
      metadata: {},
      clipPath: clip,
      children: [],
    });
    expect(group.kind).toBe('group');
    if (group.kind !== 'group') throw new Error('narrowed wrong');
    expect(group.clipPath?.kind).toBe('rounded-rect');
  });
});

// ---------------------------------------------------------------------------
// onPath on TextNode
// ---------------------------------------------------------------------------

describe('TextNode.onPath', () => {
  it('round-trips a text-on-path payload', () => {
    const parsed = TextNode.parse({
      kind: 'text',
      recipeId: 'curved',
      zOrder: 0,
      metadata: {},
      paragraphs: [{ runs: [{ text: 'around the rim' }] }],
      onPath: {
        commands: [
          { op: 'M', x: 0, y: 100 },
          {
            op: 'A',
            rx: 100,
            ry: 100,
            xAxisRotationDeg: 0,
            largeArc: false,
            sweep: true,
            x: 200,
            y: 100,
          },
        ],
        align: 'middle',
      },
    });
    expect(parsed.onPath?.align).toBe('middle');
    expect(parsed.onPath?.preserveOrientation).toBe(false);
    expect(parsed.onPath?.commands).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// PictureNode.mask
// ---------------------------------------------------------------------------

describe('PictureNode.mask', () => {
  it('round-trips a linear-gradient mask', () => {
    const parsed = PictureNode.parse({
      kind: 'picture',
      recipeId: 'p',
      zOrder: 0,
      metadata: {},
      src: 'https://example.com/a.png',
      mask: {
        kind: 'linear-gradient',
        angleDeg: 90,
        stops: [
          { alpha: 0, position: 0 },
          { alpha: 1, position: 0.5 },
          { alpha: 0, position: 1 },
        ],
      },
    });
    if (parsed.mask?.kind !== 'linear-gradient') throw new Error('narrowed wrong');
    expect(parsed.mask.stops).toHaveLength(3);
  });

  it('round-trips a radial-gradient mask', () => {
    const parsed = PictureNode.parse({
      kind: 'picture',
      recipeId: 'p',
      zOrder: 0,
      metadata: {},
      src: 'data:image/png;base64,AAA',
      mask: {
        kind: 'radial-gradient',
        cx: 0.3,
        cy: 0.7,
        stops: [
          { alpha: 1, position: 0 },
          { alpha: 0, position: 1 },
        ],
      },
    });
    if (parsed.mask?.kind !== 'radial-gradient') throw new Error('narrowed wrong');
    expect(parsed.mask.cx).toBe(0.3);
    expect(parsed.mask.cy).toBe(0.7);
  });

  it('rejects a mask with fewer than 2 stops', () => {
    const r = PictureNode.safeParse({
      kind: 'picture',
      recipeId: 'p',
      zOrder: 0,
      metadata: {},
      src: 'x.png',
      mask: {
        kind: 'linear-gradient',
        stops: [{ alpha: 1, position: 0 }],
      },
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Extended ShapeNode.shape enum and callout-bubble fields
// ---------------------------------------------------------------------------

describe('ShapeNode preset shapes', () => {
  const NEW_PRESETS = [
    'triangle', 'right-triangle',
    'pentagon', 'hexagon', 'octagon',
    'parallelogram', 'trapezoid',
    'chevron', 'chevron-left',
    'callout-bubble',
    'brace-left', 'brace-right', 'brace-top', 'brace-bottom',
    'plus', 'star-5', 'star-6',
    'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down',
  ] as const;

  it('round-trips every Wave-2 preset shape', () => {
    for (const preset of NEW_PRESETS) {
      const parsed = ShapeNode.parse({
        kind: 'shape',
        recipeId: 's',
        zOrder: 0,
        metadata: {},
        shape: preset,
        borderRadiusPx: 0,
        fill: { kind: 'solid', color: '#000000' },
      });
      expect(parsed.shape).toBe(preset);
    }
  });

  it('preserves existing presets (rect, rounded-rect, oval, line)', () => {
    for (const preset of ['rect', 'rounded-rect', 'oval', 'line'] as const) {
      const parsed = ShapeNode.parse({
        kind: 'shape',
        recipeId: 's',
        zOrder: 0,
        metadata: {},
        shape: preset,
        borderRadiusPx: 0,
        fill: { kind: 'solid', color: '#000000' },
      });
      expect(parsed.shape).toBe(preset);
    }
  });

  it('round-trips callout-bubble pointer fields', () => {
    const parsed = ShapeNode.parse({
      kind: 'shape',
      recipeId: 'callout',
      zOrder: 0,
      metadata: {},
      shape: 'callout-bubble',
      borderRadiusPx: 12,
      fill: { kind: 'solid', color: '#070710' },
      calloutPointerSide: 'left',
      calloutPointerOffset: 0.25,
      calloutPointerLengthPx: 18,
    });
    expect(parsed.calloutPointerSide).toBe('left');
    expect(parsed.calloutPointerOffset).toBe(0.25);
    expect(parsed.calloutPointerLengthPx).toBe(18);
  });

  it('rejects pointer offset outside [0, 1]', () => {
    const r = ShapeNode.safeParse({
      kind: 'shape',
      recipeId: 'callout',
      zOrder: 0,
      metadata: {},
      shape: 'callout-bubble',
      borderRadiusPx: 0,
      fill: { kind: 'solid', color: '#000000' },
      calloutPointerOffset: 1.5,
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Multi-shadow array (and backward-compat with single `shadow`)
// ---------------------------------------------------------------------------

describe('multi-shadow', () => {
  const SHADOW_A = {
    offsetX: 0,
    offsetY: 4,
    blur: 12,
    spread: 0,
    color: { hex: '#000000', alpha: 0.2 },
    inset: false,
  };
  const SHADOW_B = {
    offsetX: 0,
    offsetY: 24,
    blur: 48,
    spread: 0,
    color: { hex: '#000000', alpha: 0.4 },
    inset: false,
  };

  it('accepts shadows[] on TextNode and ShapeNode', () => {
    const text = TextNode.parse({
      kind: 'text',
      recipeId: 't',
      zOrder: 0,
      metadata: {},
      paragraphs: [{ runs: [{ text: 'hi' }] }],
      shadows: [SHADOW_A, SHADOW_B],
    });
    expect(text.shadows).toHaveLength(2);

    const shape = ShapeNode.parse({
      kind: 'shape',
      recipeId: 's',
      zOrder: 0,
      metadata: {},
      shape: 'rounded-rect',
      borderRadiusPx: 16,
      fill: { kind: 'solid', color: '#0e0e1a' },
      shadows: [SHADOW_A, SHADOW_B],
    });
    expect(shape.shadows).toHaveLength(2);
  });

  it('caps shadows at 4', () => {
    const r = ShapeNode.safeParse({
      kind: 'shape',
      recipeId: 's',
      zOrder: 0,
      metadata: {},
      shape: 'rounded-rect',
      borderRadiusPx: 16,
      fill: { kind: 'solid', color: '#000000' },
      shadows: [SHADOW_A, SHADOW_A, SHADOW_A, SHADOW_A, SHADOW_A],
    });
    expect(r.success).toBe(false);
  });

  it('keeps the deprecated `shadow` slot validating (v1 backward-compat)', () => {
    const text = TextNode.parse({
      kind: 'text',
      recipeId: 't',
      zOrder: 0,
      metadata: {},
      paragraphs: [{ runs: [{ text: 'hi' }] }],
      shadow: SHADOW_A,
    });
    expect(text.shadow).toBeDefined();
    expect(text.shadows).toBeUndefined();
  });

  it('normalizeShadows: shadows wins over shadow', () => {
    expect(normalizeShadows({ shadows: [SHADOW_A, SHADOW_B], shadow: SHADOW_A })).toEqual([
      SHADOW_A,
      SHADOW_B,
    ]);
  });

  it('normalizeShadows: falls back to [shadow] when only the v1 slot is set', () => {
    expect(normalizeShadows({ shadow: SHADOW_A })).toEqual([SHADOW_A]);
  });

  it('normalizeShadows: returns [] when neither is set', () => {
    expect(normalizeShadows({})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pathBbox helper
// ---------------------------------------------------------------------------

describe('pathBbox', () => {
  it('walks endpoints for M/L commands', () => {
    const bb = pathBbox([
      { op: 'M', x: 10, y: 20 },
      { op: 'L', x: 50, y: 5 },
      { op: 'L', x: 100, y: 80 },
    ]);
    expect(bb).toEqual({ x: 10, y: 5, w: 90, h: 75 });
  });

  it('includes Q control points', () => {
    const bb = pathBbox([
      { op: 'M', x: 0, y: 0 },
      { op: 'Q', x1: 50, y1: 200, x: 100, y: 0 },
    ]);
    expect(bb).toEqual({ x: 0, y: 0, w: 100, h: 200 });
  });

  it('includes both C control points', () => {
    const bb = pathBbox([
      { op: 'M', x: 0, y: 0 },
      { op: 'C', x1: -10, y1: 50, x2: 110, y2: 50, x: 100, y: 0 },
    ]);
    expect(bb).toEqual({ x: -10, y: 0, w: 120, h: 50 });
  });

  it('expands by rx/ry around an arc endpoint', () => {
    const bb = pathBbox([
      { op: 'M', x: 50, y: 50 },
      {
        op: 'A',
        rx: 20,
        ry: 30,
        xAxisRotationDeg: 0,
        largeArc: false,
        sweep: true,
        x: 100,
        y: 100,
      },
    ]);
    expect(bb.x).toBe(50);
    expect(bb.y).toBe(50);
    expect(bb.w).toBe(70);   // 100+20 - 50
    expect(bb.h).toBe(80);   // 100+30 - 50
  });

  it('Z does not contribute geometry', () => {
    const bb = pathBbox([
      { op: 'M', x: 0, y: 0 },
      { op: 'L', x: 10, y: 10 },
      { op: 'Z' },
    ]);
    expect(bb).toEqual({ x: 0, y: 0, w: 10, h: 10 });
  });

  it('throws on empty input', () => {
    expect(() => pathBbox([])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Deck version backward compatibility
// ---------------------------------------------------------------------------

describe('Deck.version', () => {
  it('defaults to 2 in Wave-2', () => {
    const deck = Deck.parse({ slides: [] });
    expect(deck.version).toBe(2);
  });

  it('still accepts version: 1 (v1 backward-compat)', () => {
    const deck = Deck.parse({ version: 1, slides: [] });
    expect(deck.version).toBe(1);
  });

  it('accepts version: 2 explicitly', () => {
    const deck = Deck.parse({ version: 2, slides: [] });
    expect(deck.version).toBe(2);
  });

  it('rejects unknown versions', () => {
    const r = Deck.safeParse({ version: 3, slides: [] });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: a v1 IR document still validates
// ---------------------------------------------------------------------------

describe('v1 backward compatibility', () => {
  it('parses a pre-Wave-2 deck with single `shadow` slot and no new fields', () => {
    const v1Deck = {
      version: 1,
      theme: {},
      slides: [
        {
          index: 0,
          nodes: [
            {
              kind: 'shape',
              recipeId: 'card',
              bbox: { x: 0, y: 0, w: 100, h: 100 },
              zOrder: 0,
              metadata: {},
              shape: 'rounded-rect',
              borderRadiusPx: 8,
              fill: { kind: 'solid', color: '#0e0e1a' },
              shadow: {
                offsetX: 0,
                offsetY: 4,
                blur: 12,
                spread: 0,
                color: { hex: '#000000', alpha: 0.3 },
                inset: false,
              },
            },
            {
              kind: 'text',
              recipeId: 'label',
              bbox: { x: 0, y: 0, w: 100, h: 24 },
              zOrder: 1,
              metadata: {},
              paragraphs: [
                { runs: [{ text: 'hello' }] },
              ],
            },
          ],
        },
      ],
    };
    const parsed = Deck.parse(v1Deck);
    expect(parsed.version).toBe(1);
    expect(parsed.slides).toHaveLength(1);
    const slide = parsed.slides[0];
    if (!slide) throw new Error('missing slide');
    expect(slide.nodes).toHaveLength(2);
  });

  it('parses a v2 deck mixing path nodes and pattern fills', () => {
    const v2Deck = {
      version: 2,
      slides: [
        {
          index: 0,
          background: {
            kind: 'pattern',
            pattern: 'dots',
            fgColor: { hex: '#ffffff', alpha: 0.05 },
          },
          nodes: [
            {
              kind: 'path',
              recipeId: 'sparkline',
              bbox: { x: 100, y: 100, w: 200, h: 60 },
              zOrder: 10,
              metadata: {},
              commands: [
                { op: 'M', x: 100, y: 130 },
                { op: 'L', x: 200, y: 110 },
                { op: 'L', x: 300, y: 150 },
              ],
              strokeWidthPx: 2,
              strokeColor: '#a78bfa',
              markerEnd: { kind: 'arrow', size: 'sm' },
            },
            {
              kind: 'shape',
              recipeId: 'callout',
              bbox: { x: 400, y: 200, w: 200, h: 80 },
              zOrder: 20,
              metadata: {},
              shape: 'callout-bubble',
              borderRadiusPx: 12,
              fill: { kind: 'solid', color: '#16162a' },
              calloutPointerSide: 'bottom',
              calloutPointerOffset: 0.5,
              calloutPointerLengthPx: 24,
            },
          ],
        },
      ],
    };
    const parsed = Slide.parse(v2Deck.slides[0]);
    expect(parsed.background.kind).toBe('pattern');
    expect(parsed.nodes).toHaveLength(2);
  });
});
