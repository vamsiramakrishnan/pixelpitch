/**
 * @slidify/components — CVA-style variant helper (Wave-2 / Crew F2).
 *
 * Tiny implementation per CONTRACT §2.9. **Not** a re-export of upstream `cva`;
 * we ship zero new runtime deps.
 *
 * Unlike `cva`, this helper does not produce CSS class strings — it produces
 * **prop merge** objects. Crews use the returned object to spread/override
 * defaults inside a `*ToIR(props, tokens)` call.
 *
 * @example
 *   const buttonVariant = variant({
 *     base: { borderRadiusPx: 8 },
 *     variants: {
 *       intent: {
 *         primary:   { fill: { kind: 'solid', color: '#635BFF' } },
 *         secondary: { fill: { kind: 'solid', color: '#0a2540' } },
 *       },
 *       size: {
 *         sm: { padding: 8 },
 *         md: { padding: 12 },
 *         lg: { padding: 16 },
 *       },
 *     },
 *     defaultVariants: { intent: 'primary', size: 'md' },
 *   });
 *
 *   buttonVariant({ intent: 'secondary' });
 *   // -> { borderRadiusPx: 8, fill: { ... }, padding: 12 }
 */

/**
 * Configuration object for {@link variant}. `TVariants` is `Record<axis,
 * Record<value, props-patch>>`.
 */
export interface VariantConfig<
  TVariants extends Record<string, Record<string, object>>,
> {
  /** Always-applied prop patch. Merged first. */
  base?: object;
  /** Variant axes. Each axis is a record of value -> prop patch. */
  variants: TVariants;
  /** Per-axis default value applied when the consumer omits that axis. */
  defaultVariants?: { [K in keyof TVariants]?: keyof TVariants[K] };
}

/**
 * The selection signature: a partial map from axis name to a value of that
 * axis. Omitted axes fall back to `defaultVariants` (or, failing that, no
 * patch).
 */
export type VariantSelection<
  TVariants extends Record<string, Record<string, object>>,
> = { [K in keyof TVariants]?: keyof TVariants[K] };

/**
 * Build a variant resolver. The returned function takes an optional selection
 * and returns the merged prop patch (`base + defaults + selected`, shallow).
 *
 * Merge order matters when the same prop is defined at multiple layers:
 * later layers win. Object values are NOT deep-merged — replace whole.
 */
export function variant<T extends Record<string, Record<string, object>>>(
  cfg: VariantConfig<T>,
): (selected?: VariantSelection<T>) => Record<string, unknown> {
  const { base = {}, variants, defaultVariants = {} as VariantSelection<T> } = cfg;

  return (selected?: VariantSelection<T>) => {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    const sel: VariantSelection<T> = { ...defaultVariants, ...(selected ?? {}) };

    for (const axisKey of Object.keys(variants) as (keyof T)[]) {
      const chosen = sel[axisKey];
      if (chosen === undefined) continue;
      const axis = variants[axisKey];
      if (axis === undefined) continue;
      const patch = axis[chosen as string];
      if (patch === undefined) continue; // unknown value — silently skip
      Object.assign(out, patch as Record<string, unknown>);
    }
    return out;
  };
}
