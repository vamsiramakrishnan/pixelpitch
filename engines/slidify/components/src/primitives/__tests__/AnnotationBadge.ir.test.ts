import { describe, expect, it } from 'vitest';
import { annotationBadgeToIR } from '../AnnotationBadge';
import { DEFAULT_TOKENS, getTokensFromBundle } from '../../tokens';

describe('annotationBadgeToIR', () => {
  const tokens = getTokensFromBundle(DEFAULT_TOKENS, 'cozy');

  it('emits a snapshot-stable info pill', () => {
    expect(annotationBadgeToIR({
      bbox: { x: 0, y: 0, w: 64, h: 24 },
      label: 'NEW',
      kind: 'pill',
      tone: 'info',
    }, tokens)).toMatchSnapshot();
  });

  it('uppercases stamp labels', () => {
    const ir = annotationBadgeToIR({
      bbox: { x: 0, y: 0, w: 80, h: 40 },
      label: 'draft',
      kind: 'stamp',
      tone: 'danger',
      rotateDeg: -8,
    }, tokens);
    const label = ir.children[1];
    if (label?.kind === 'text') {
      expect(label.paragraphs[0]?.runs[0]?.text).toBe('DRAFT');
    } else {
      throw new Error('expected text label');
    }
  });

  it('attaches a sticker drop shadow on kind=sticker', () => {
    const ir = annotationBadgeToIR({
      bbox: { x: 0, y: 0, w: 100, h: 36 },
      label: 'WOW',
      kind: 'sticker',
    }, tokens);
    const bg = ir.children[0];
    if (bg?.kind === 'shape') {
      expect(bg.shadows?.length).toBe(1);
    } else {
      throw new Error('expected bg shape');
    }
  });

  it('stamps recipeId equal to the atom id', () => {
    const ir = annotationBadgeToIR({ bbox: { x: 0, y: 0, w: 60, h: 24 }, label: 'x', kind: 'pill' }, tokens);
    expect(ir.recipeId).toBe('annotation.badge');
  });
});
