/**
 * Wave-2 IR helpers: normalize the deprecated single-shadow slot to the new
 * `shadows: BoxShadow[]` array, and compute tight bounding boxes for typed
 * SVG paths.
 *
 * Component crews that consume IR nodes should call `normalizeShadows(node)`
 * instead of reading `.shadow` / `.shadows` directly — it papers over the
 * v1→v2 migration and returns a single `BoxShadow[]`.
 */

import type { Bbox, BoxShadow, PathCommand } from './schema';

/**
 * A node-shaped object that may carry either the v1 single shadow slot,
 * the v2 multi-shadow array, or both. Intentionally structural so this
 * works for `TextNode`, `ShapeNode`, `PathShapeNode`, and any future
 * shadow-bearing node kind without forcing an import-time coupling.
 */
export interface ShadowBearingNode {
  shadow?: BoxShadow;
  shadows?: BoxShadow[];
}

/**
 * Resolve the effective shadow stack on a node:
 *   - if `shadows` is set, return it (wins over `shadow`)
 *   - else if the deprecated `shadow` is set, return `[shadow]`
 *   - else return `[]`
 *
 * Component code should treat the result as the authoritative list of
 * shadow layers and never read the raw fields.
 */
export function normalizeShadows(node: ShadowBearingNode): BoxShadow[] {
  if (node.shadows !== undefined) return node.shadows;
  if (node.shadow !== undefined) return [node.shadow];
  return [];
}

/**
 * Tight axis-aligned bounding box for a typed SVG path. Walks every command
 * endpoint and every Bezier control point; for elliptical arcs (`A`), uses
 * a conservative bound that includes the endpoint plus an `rx`/`ry` halo
 * around it (sufficient for layout — true arc bounds need parametric
 * extrema solved per command, which the Python compiler handles natively).
 *
 * Throws on an empty `commands` array (the Zod schema already requires
 * `min(1)`, so this is a sanity check on direct callers).
 */
export function pathBbox(commands: PathCommand[]): Bbox {
  if (commands.length === 0) {
    throw new Error('pathBbox: commands must contain at least one command');
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const considerPoint = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const cmd of commands) {
    switch (cmd.op) {
      case 'M':
      case 'L':
      case 'Q':
      case 'C':
        // Endpoint always counts.
        considerPoint(cmd.x, cmd.y);
        // Quadratic / cubic control points expand the bounding box.
        if (cmd.op === 'Q' || cmd.op === 'C') {
          considerPoint(cmd.x1, cmd.y1);
        }
        if (cmd.op === 'C') {
          considerPoint(cmd.x2, cmd.y2);
        }
        break;
      case 'A': {
        // Conservative bound: endpoint plus an rx/ry halo. Real arc
        // extrema would need parametric solving (Python side handles it).
        const rx = Math.abs(cmd.rx);
        const ry = Math.abs(cmd.ry);
        considerPoint(cmd.x - rx, cmd.y - ry);
        considerPoint(cmd.x + rx, cmd.y + ry);
        break;
      }
      case 'Z':
        // Close subpath — no new geometry.
        break;
    }
  }

  // If the only command was a Z (impossible per schema, but guard anyway),
  // fall back to a degenerate bbox at the origin.
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}
