import type { ConnectionTestProtocol } from './connectionTest.js';
import type { AgentModelOption } from './registry.js';

export type ProviderModelsKind =
  | 'success'
  | 'auth_failed'
  | 'forbidden'
  | 'invalid_base_url'
  | 'rate_limited'
  | 'upstream_unavailable'
  | 'timeout'
  | 'no_models'
  | 'unsupported_protocol'
  | 'unknown';

export interface ProviderModelsRequest {
  protocol: ConnectionTestProtocol;
  baseUrl: string;
  apiKey?: string;
}

export type ProviderModelOption = AgentModelOption;

export interface ProviderModelsResponse {
  ok: boolean;
  kind: ProviderModelsKind;
  latencyMs: number;
  models?: ProviderModelOption[];
  status?: number;
  detail?: string;
}
