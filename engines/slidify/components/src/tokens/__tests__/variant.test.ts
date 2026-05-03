/**
 * Unit tests for the CVA-style variant() helper (Wave-2 / Crew F2).
 */

import { describe, expect, it } from 'vitest';
import { variant } from '../variant';

describe('variant()', () => {
  it('returns base when no variants are selected and no defaults defined', () => {
    const v = variant({
      base: { borderRadiusPx: 8 },
      variants: {
        intent: {
          primary: { fill: 'A' },
          secondary: { fill: 'B' },
        },
      },
    });
    expect(v()).toEqual({ borderRadiusPx: 8 });
  });

  it('applies defaultVariants when no selection is supplied', () => {
    const v = variant({
      base: { borderRadiusPx: 8 },
      variants: {
        intent: {
          primary: { fill: 'A' },
          secondary: { fill: 'B' },
        },
      },
      defaultVariants: { intent: 'primary' },
    });
    expect(v()).toEqual({ borderRadiusPx: 8, fill: 'A' });
  });

  it('selected variants override defaults', () => {
    const v = variant({
      variants: {
        intent: {
          primary: { fill: 'A' },
          secondary: { fill: 'B' },
        },
      },
      defaultVariants: { intent: 'primary' },
    });
    expect(v({ intent: 'secondary' })).toEqual({ fill: 'B' });
  });

  it('merges multiple variant axes', () => {
    const v = variant({
      base: { borderRadiusPx: 8 },
      variants: {
        intent: {
          primary:   { fill: 'A' },
          secondary: { fill: 'B' },
        },
        size: {
          sm: { padding: 4 },
          md: { padding: 8 },
          lg: { padding: 12 },
        },
      },
      defaultVariants: { intent: 'primary', size: 'md' },
    });
    expect(v({ size: 'lg' })).toEqual({
      borderRadiusPx: 8, fill: 'A', padding: 12,
    });
  });

  it('later layers override earlier layers when keys collide', () => {
    const v = variant({
      base: { foo: 'base' },
      variants: {
        a: { x: { foo: 'fromA' } },
        b: { x: { foo: 'fromB' } },
      },
      defaultVariants: { a: 'x', b: 'x' },
    });
    // Object.keys iteration order on `variants` follows insertion order; b wins.
    expect(v()).toEqual({ foo: 'fromB' });
  });

  it('shallow-merge — does not deep-merge nested objects', () => {
    const v = variant({
      base: { style: { color: 'red', size: 12 } },
      variants: {
        intent: {
          primary: { style: { color: 'blue' } },
        },
      },
      defaultVariants: { intent: 'primary' },
    });
    // The whole `style` object is replaced; size: 12 is lost.
    expect(v()).toEqual({ style: { color: 'blue' } });
  });

  it('unknown variant value is silently skipped', () => {
    const v = variant({
      variants: {
        intent: {
          primary: { fill: 'A' },
        },
      },
    });
    // @ts-expect-error 'bogus' is not assignable to keyof intent.
    expect(v({ intent: 'bogus' })).toEqual({});
  });
});
