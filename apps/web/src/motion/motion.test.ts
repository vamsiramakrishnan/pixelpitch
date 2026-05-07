import { describe, expect, it } from 'vitest';
import { springs } from './springs';
import { variants } from './variants';
import { instantTransition, safeTransition, skipVariants } from './reduced-motion';

describe('springs', () => {
  it('exports snappy, gentle, and bouncy configs', () => {
    expect(springs.snappy).toMatchObject({
      type: 'spring',
      stiffness: expect.any(Number),
      damping: expect.any(Number),
    });
    expect(springs.gentle).toMatchObject({
      type: 'spring',
      stiffness: expect.any(Number),
      damping: expect.any(Number),
    });
    expect(springs.bouncy).toMatchObject({
      type: 'spring',
      stiffness: expect.any(Number),
      damping: expect.any(Number),
    });
  });

  it('snappy is stiffer than gentle', () => {
    expect(springs.snappy.stiffness).toBeGreaterThan(springs.gentle.stiffness);
  });
});

describe('variants', () => {
  it('fadeUp has initial and animate states', () => {
    expect(variants.fadeUp.initial).toMatchObject({ opacity: 0, y: expect.any(Number) });
    expect(variants.fadeUp.animate).toMatchObject({ opacity: 1, y: 0 });
  });

  it('fadeIn has initial and animate states', () => {
    expect(variants.fadeIn.initial).toMatchObject({ opacity: 0 });
    expect(variants.fadeIn.animate).toMatchObject({ opacity: 1 });
  });

  it('scaleIn has initial and animate states', () => {
    expect(variants.scaleIn.initial).toMatchObject({ opacity: 0, scale: expect.any(Number) });
    expect(variants.scaleIn.animate).toMatchObject({ opacity: 1, scale: 1 });
  });

  it('staggerParent has staggerChildren in animate.transition', () => {
    const anim = variants.staggerParent.animate as { transition: { staggerChildren: number } };
    expect(anim.transition.staggerChildren).toBeGreaterThan(0);
  });

  it('all variants include exit states', () => {
    expect(variants.fadeUp.exit).toBeDefined();
    expect(variants.fadeIn.exit).toBeDefined();
    expect(variants.scaleIn.exit).toBeDefined();
  });
});

describe('reduced-motion helpers', () => {
  it('instantTransition returns duration 0', () => {
    expect(instantTransition).toMatchObject({ duration: 0 });
  });

  it('safeTransition returns instant when reduced', () => {
    const original = { type: 'spring' as const, stiffness: 500 };
    expect(safeTransition(original, true)).toMatchObject({ duration: 0 });
    expect(safeTransition(original, false)).toMatchObject({ type: 'spring' });
  });

  it('skipVariants resolves to visible, no motion', () => {
    expect(skipVariants.initial).toMatchObject({ opacity: 1 });
    expect(skipVariants.animate).toMatchObject({ opacity: 1 });
    expect(skipVariants.exit).toMatchObject({ opacity: 0 });
  });
});
