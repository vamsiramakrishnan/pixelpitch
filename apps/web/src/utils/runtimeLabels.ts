import { KNOWN_PROVIDERS } from '../state/config';
import type { AppConfig } from '../types';

export function apiRuntimeLabel(config: AppConfig): string {
  const provider = selectedKnownProvider(config);
  if (provider) return provider.label;
  return (config.apiProtocol ?? 'anthropic') === 'openai'
    ? 'OpenAI-compatible API'
    : 'Anthropic-compatible API';
}

export function apiRuntimeDetail(config: AppConfig): string {
  const parts = [config.model?.trim(), safeHost(config.baseUrl)]
    .filter((part): part is string => Boolean(part));
  return parts.join(' · ') || apiRuntimeLabel(config);
}

export function apiRuntimeAgentId(config: AppConfig): string {
  const protocol = config.apiProtocol ?? 'anthropic';
  const provider = selectedKnownProvider(config);
  if (provider) {
    return `api:${provider.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  }
  return `api:${protocol}`;
}

function selectedKnownProvider(config: AppConfig) {
  return KNOWN_PROVIDERS.find((provider) =>
    provider.baseUrl === config.apiProviderBaseUrl ||
    provider.baseUrl === config.baseUrl,
  ) ?? null;
}

function safeHost(value: string): string | null {
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}
