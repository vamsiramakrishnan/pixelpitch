export type ConnectionTestProtocol = 'anthropic' | 'openai' | 'ollama';

export interface ProviderTestRequest {
  kind: 'provider';
  protocol: ConnectionTestProtocol;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export interface AgentTestRequest {
  kind: 'agent';
  agentId?: string | null;
}

export type ConnectionTestRequest = ProviderTestRequest | AgentTestRequest;

export interface ConnectionTestResponse {
  ok: boolean;
  kind: 'provider' | 'agent';
  message: string;
  status?: number;
  details?: string;
}

export function normalizeConnectionTestProtocol(value: unknown): ConnectionTestProtocol {
  if (value === 'openai' || value === 'ollama') return value;
  return 'anthropic';
}

export function validateExternalApiBaseUrl(value: unknown): { ok: true; url: URL } | { ok: false; error: string } {
  const baseUrl = String(value ?? '').trim();
  if (!baseUrl) return { ok: false, error: 'Base URL is required.' };
  let parsed: URL;
  try {
    parsed = new URL(baseUrl.replace(/\/+$/, ''));
  } catch {
    return { ok: false, error: 'Invalid baseUrl' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, error: 'Only http/https allowed' };
  }
  return { ok: true, url: parsed };
}
