/**
 * <AnnotationBadge> — Tier-A primitive (`annotation.badge`).
 *
 * A pill / stamp / sticker that overlays a slide with a short label.
 * Three flavors:
 *   - `pill`   — small rounded pill in tone color
 *   - `stamp`  — bordered, rotated rubber-stamp look (DRAFT / NEW / INTERNAL)
 *   - `sticker`— pop-art sticker with bold border + drop shadow
 *
 * Backs `anno.stamp-*`, `anno.sticker`, `surf.tape-band`, `type.eyebrow-tape`.
 *
 * Composition (z-order bottom → top):
 *   - `annotation.badge.bg`     ShapeNode (rounded-rect or skewed rect)
 *   - `annotation.badge.label`  TextNode (the label)
 *
 * F1 deps: optional rotation surfaced via metadata (rendered in PPTX as
 * `<a:xfrm rot=>`); border + multi-shadow on the bg rect.
 */

import type { ReactNode } from 'react';
import type {
  Bbox,
  BoxShadow,
  Color,
  GroupNodeT,
  ShapeNode,
  TextNode,
} from '../ir/schema';
import { tokens as defaultTokens, type TokensApi } from '../tokens';
import { colorToCss } from './_shared';

export type BadgeKind = 'pill' | 'stamp' | 'sticker';
export type BadgeTone = 'info' | 'success' | 'warn' | 'danger' | 'neutral';

export interface AnnotationBadgeProps {
  bbox: Bbox;
  /** Label text. Optional — defaults to ''. */
  label?: string;
  /** Synonym for `label` — atoms.yaml uses `body` for some recipes. */
  body?: string;
  /** Visual variant. Default `'pill'`. */
  kind?: BadgeKind;
  /** Tone — drives bg + text + border. Default `'info'`. */
  tone?: BadgeTone;
  /** Rotation, degrees CW. Honored on stamps + stickers; ignored on pills. */
  rotateDeg?: number;
}

interface Tones {
  bg: Color;
  text: Color;
  border: Color;
}

function tonePalette(tokens: TokensApi, tone: BadgeTone): Tones {
  if (tone === 'success') return { bg: tokens.palette('success', 0.16), text: tokens.palette('success'), border: tokens.palette('success') };
  if (tone === 'warn')    return { bg: tokens.palette('warn', 0.16),    text: tokens.palette('warn'),    border: tokens.palette('warn') };
  if (tone === 'danger')  return { bg: tokens.palette('danger', 0.16),  text: tokens.palette('danger'),  border: tokens.palette('danger') };
  if (tone === 'neutral') return { bg: tokens.palette('ink-3', 0.14),   text: tokens.palette('ink-2'),   border: tokens.palette('ink-3') };
  return                       { bg: tokens.palette('info', 0.16),    text: tokens.palette('info'),    border: tokens.palette('info') };
}

// ---------------------------------------------------------------------------
// React preview
// ---------------------------------------------------------------------------

export default function AnnotationBadge(props: AnnotationBadgeProps): ReactNode {
  const t = defaultTokens;
  const kind = props.kind ?? 'pill';
  const labelText = props.label ?? props.body ?? '';
  const tone = props.tone ?? 'info';
  const palette = tonePalette(t, tone);
  const rotation = props.rotateDeg ?? 0;
  const isPill = kind === 'pill';
  const isStamp = kind === 'stamp';
  const isSticker = kind === 'sticker';
  return (
    <div
      data-recipe-id="annotation.badge"
      data-kind={kind}
      style={{
        position: 'absolute',
        left: props.bbox.x,
        top: props.bbox.y,
        width: props.bbox.w,
        height: props.bbox.h,
        background: colorToCss(palette.bg),
        color: colorToCss(palette.text),
        border: isStamp || isSticker
          ? `2px solid ${colorToCss(palette.border)}`
          : 'none',
        borderRadius: isPill ? 9999 : isSticker ? 12 : 4,
        transform: isPill ? undefined : `rotate(${rotation}deg)`,
        transformOrigin: 'center',
        boxShadow: isSticker ? `2px 4px 0 ${colorToCss(palette.border)}` : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: isPill ? 600 : 700,
        fontSize: isPill ? 12 : 14,
        textTransform: isStamp ? 'uppercase' : undefined,
        letterSpacing: isStamp ? '0.08em' : undefined,
        boxSizing: 'border-box',
      }}
    >
      {labelText}
    </div>
  );
}

// ---------------------------------------------------------------------------
// IR emitter
// ---------------------------------------------------------------------------

export function annotationBadgeToIR(
  props: AnnotationBadgeProps,
  tokens: TokensApi = defaultTokens,
): GroupNodeT {
  const kind: BadgeKind = props.kind ?? 'pill';
  const labelText = props.label ?? props.body ?? '';
  const tone = props.tone ?? 'info';
  const palette = tonePalette(tokens, tone);
  const rotation = props.rotateDeg ?? 0;
  const isPill = kind === 'pill';
  const isStamp = kind === 'stamp';
  const isSticker = kind === 'sticker';

  const radiusPx = isPill ? 9999 : isSticker ? 12 : 4;

  const stickerShadow: BoxShadow[] | undefined = isSticker
    ? [{ offsetX: 2, offsetY: 4, blur: 0, spread: 0, color: palette.border, inset: false }]
    : undefined;

  const bg: ShapeNode = {
    kind: 'shape',
    recipeId: 'annotation.badge.bg',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: { role: 'annotation-badge-bg', kind, tone, rotateDeg: rotation },
    shape: 'rounded-rect',
    borderRadiusPx: radiusPx,
    fill: { kind: 'solid', color: palette.bg },
    ...(isStamp || isSticker ? { border: { width: 2, color: palette.border, style: 'solid' } } : {}),
    ...(stickerShadow ? { shadows: stickerShadow } : {}),
  };

  const label: TextNode = {
    kind: 'text',
    recipeId: 'annotation.badge.label',
    bbox: { ...props.bbox },
    zOrder: 10,
    metadata: { role: 'annotation-badge-label', label: labelText },
    paragraphs: [{
      runs: [{
        text: isStamp ? labelText.toUpperCase() : labelText,
        fontSizePx: isPill ? 12 : 14,
        fontWeight: isPill ? 600 : 700,
        fontFamily: tokens.fonts.sans,
        color: palette.text,
        italic: false,
        underline: false,
      }],
      align: 'center',
    }],
  };

  return {
    kind: 'group',
    recipeId: 'annotation.badge',
    bbox: { ...props.bbox },
    zOrder: 0,
    metadata: {
      role: 'annotation.badge',
      axis: 'annotation',
      kind,
      tone,
      rotateDeg: rotation,
      label: labelText,
    },
    children: [bg, label],
  };
}
