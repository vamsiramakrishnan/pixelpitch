/**
 * Atelier-v2 smoke tests.
 *
 * Five assertions over `buildAtelierDeck()`:
 *   1. 14 slides exactly.
 *   2. Full Deck zod-schema parses end-to-end (post-M3.6 every recipe
 *      emits a structurally-valid IR, so we no longer need to skip the
 *      deep-parse).
 *   3. Zero fallback placeholder nodes — every slide composes via real
 *      recipe IR.
 *   4. Slide 14 carries an `EscapeHatch` raster with a non-empty
 *      cssPayload and a recognizable intent.
 *   5. Every slide composes at least one node.
 */

import { describe, expect, it } from 'vitest';

import { Deck as DeckSchema } from '../../../components/src/ir/schema';
import { buildAtelierDeck } from '../deck';

describe('atelier deck', () => {
  const deck = buildAtelierDeck();

  it('has 14 slides', () => {
    expect(deck.slides).toHaveLength(14);
  });

  it('passes full Deck zod validation (deep-parses every recipe subtree)', () => {
    // M3.6 unblocked this: every Tier-B recipe emits a structurally-valid
    // IR with sensible defaults under bbox-only forwarding, so the entire
    // deck round-trips through `Deck.safeParse` cleanly.
    const result = DeckSchema.safeParse(deck);
    if (!result.success) {
      // Surface the first failure path so debugging doesn't require
      // wading through 14 slides × N node trees.
      const issue = result.error.issues[0];
      throw new Error(
        `Deck.safeParse failed: ${issue?.path.join('.')} — ${issue?.message}`,
      );
    }
    expect(result.success).toBe(true);
  });

  it('emits zero fallback placeholder nodes', () => {
    let fallbackCount = 0;
    const visit = (node: unknown): void => {
      const n = node as {
        kind?: string;
        metadata?: { fallback?: unknown };
        children?: unknown[];
      };
      if (n.metadata?.fallback === true) fallbackCount += 1;
      if (n.kind === 'group' && Array.isArray(n.children)) {
        for (const c of n.children) visit(c);
      }
    };
    for (const slide of deck.slides) {
      for (const node of slide.nodes) visit(node);
    }
    expect(fallbackCount).toBe(0);
  });

  it('slide 14 contains an EscapeHatch with non-empty cssPayload', () => {
    const last = deck.slides[13]!;
    const escape = last.nodes.find(
      (n) =>
        n.kind === 'raster' &&
        (n.metadata as { role?: unknown } | undefined)?.role === 'escape-hatch',
    );
    expect(escape).toBeDefined();
    const meta = escape!.metadata as Record<string, unknown>;
    expect(typeof meta.cssPayload).toBe('string');
    expect((meta.cssPayload as string).length).toBeGreaterThan(20);
    expect(meta.intent).toBe('conic-gradient-corner-decoration');
  });

  it('every slide composes ≥1 node', () => {
    for (const slide of deck.slides) {
      expect(slide.nodes.length).toBeGreaterThan(0);
    }
  });
});
