/**
 * @slidify/components — token React context (Wave-2 / Crew F2).
 *
 * Provides the React-tree distribution mechanism for the token helper.
 * Per CONTRACT §2.1: components must work both inside React rendering
 * (preview) and in pure-IR pipelines (no React tree). React context is the
 * preview-side delivery; IR-side delivery happens via the `tokens` argument
 * on each `*ToIR(props, tokens?)` emitter.
 */

import { createContext, useContext, type ReactNode } from 'react';
import {
  DEFAULT_TOKENS,
  getTokensFromBundle,
  tokens as defaultTokens,
  type DensityMode,
  type TokenBundle,
  type TokensApi,
} from './tokens';

// Re-export for convenience so callers don't need a second import.
export { getTokensFromBundle };

/**
 * The React context — value is a fully-built {@link TokensApi}, NOT a raw
 * bundle. Consumers should not unwrap.
 */
const TokensContext = createContext<TokensApi>(defaultTokens);

/**
 * Props for {@link TokenProvider}. Provide either a built helper directly via
 * `value`, OR a static bundle + density and let the provider synthesize one.
 */
export interface TokenProviderProps {
  /**
   * A pre-built helper. If supplied, takes precedence over `bundle` /
   * `density`.
   */
  value?: TokensApi;
  /** Static bundle to wrap. Defaults to {@link DEFAULT_TOKENS}. */
  bundle?: TokenBundle;
  /** Density mode applied when synthesizing from `bundle`. */
  density?: DensityMode;
  children?: ReactNode;
}

/**
 * Wraps children in the token context. Use one per slide — `<Slide>` does
 * this automatically, so most callers won't reach for this directly.
 */
export function TokenProvider(props: TokenProviderProps) {
  const value =
    props.value
    ?? getTokensFromBundle(props.bundle ?? DEFAULT_TOKENS, props.density ?? 'cozy');
  return <TokensContext.Provider value={value}>{props.children}</TokensContext.Provider>;
}

/**
 * Hook: returns the active {@link TokensApi}. If called outside any
 * `<TokenProvider>`, returns the default helper bound to {@link DEFAULT_TOKENS}.
 */
export function useTokens(): TokensApi {
  return useContext(TokensContext);
}
