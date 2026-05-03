/**
 * Shared types for slidify components.
 *
 * Every component exports two things:
 *   1. A React component (default export) for browser preview.
 *   2. A `toIR(props)` named export that produces a typed IR node.
 *
 * The IR-emit path is what the Python backend consumes; the React component
 * is purely for in-browser preview / iframe embedding.
 */

import type { Node } from '../ir/schema';

export type IREmitter<P> = (props: P) => Node;

export interface ComponentSpec<P> {
  recipeId: string;
  toIR: IREmitter<P>;
}
