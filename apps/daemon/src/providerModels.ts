import type {
  ConnectionTestProtocol,
  ProviderModelOption,
  ProviderModelsRequest,
  ProviderModelsResponse,
} from '@pixelpitch/contracts';
import { validateExternalApiBaseUrl } from '@pixelpitch/contracts';

type ProviderModelsInput = ProviderModelsRequest & { signal?: AbortSignal };

const PROVIDER_MODELS_TIMEOUT_MS = 12_000;

function appendVersionedApiPath(baseUrl: string, suffix: string): string {
  const url = new URL(baseUrl);
  const pathname = url.pathname.replace(/\/+$/, '');
  url.pathname = /\/v\d+(\/|$)/.test(pathname)
    ? `${pathname}${suffix}`
    : `${pathname}/v1${suffix}`;
  return url.toString();
}

function statusToKind(status: number): ProviderModelsResponse['kind'] {
  if (status === 401) return 'auth_failed';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'invalid_base_url';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'upstream_unavailable';
  return 'unknown';
}

function redact(value: string, secrets: Array<string | undefined>): string {
  let out = value;
  for (const secret of secrets) {
    if (!secret) continue;
    const trimmed = secret.trim();
    if (trimmed) out = out.split(trimmed).join('[redacted]');
  }
  return out;
}

function extractProviderErrorDetail(data: unknown, rawText: string): string {
  const obj = data && typeof data === 'object' ? data : null;
  const error = obj ? (obj as { error?: unknown }).error : null;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  const message = obj ? (obj as { message?: unknown }).message : null;
  if (typeof message === 'string' && message.trim()) return message;
  return rawText.trim().slice(0, 240);
}

function networkErrorToKind(err: unknown): ProviderModelsResponse['kind'] {
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'timeout';
    const code = (err as { cause?: { code?: string } }).cause?.code;
    if (
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'ECONNREFUSED' ||
      code === 'ECONNRESET' ||
      code === 'ETIMEDOUT' ||
      code === 'EHOSTUNREACH' ||
      code === 'ENETUNREACH' ||
      code === 'CERT_HAS_EXPIRED' ||
      code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
    ) {
      return 'invalid_base_url';
    }
  }
  return 'unknown';
}

function uniqueModels(models: ProviderModelOption[]): ProviderModelOption[] {
  const seen = new Set<string>();
  const out: ProviderModelOption[] = [];
  for (const model of models) {
    const id = model.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label: model.label.trim() || id });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

function extractOpenAiModels(data: unknown): ProviderModelOption[] {
  const items = (data as { data?: unknown }).data;
  if (!Array.isArray(items)) return [];
  return uniqueModels(
    items
      .map((item) => (item as { id?: unknown })?.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
      .map((id) => ({ id, label: id })),
  );
}

function extractAnthropicModels(data: unknown): ProviderModelOption[] {
  const items = (data as { data?: unknown }).data;
  if (!Array.isArray(items)) return [];
  return uniqueModels(
    items
      .map((item) => {
        const obj = item && typeof item === 'object'
          ? item as { id?: unknown; display_name?: unknown; displayName?: unknown }
          : null;
        const id = typeof obj?.id === 'string' ? obj.id : '';
        const label =
          typeof obj?.display_name === 'string'
            ? obj.display_name
            : typeof obj?.displayName === 'string'
              ? obj.displayName
              : id;
        return id ? { id, label } : null;
      })
      .filter((item): item is ProviderModelOption => item != null),
  );
}

function extractOllamaModels(data: unknown): ProviderModelOption[] {
  const items = (data as { models?: unknown }).models;
  if (!Array.isArray(items)) return [];
  return uniqueModels(
    items
      .map((item) => {
        const obj = item && typeof item === 'object'
          ? item as { name?: unknown; model?: unknown }
          : null;
        const id =
          typeof obj?.name === 'string'
            ? obj.name
            : typeof obj?.model === 'string'
              ? obj.model
              : '';
        return id ? { id, label: id } : null;
      })
      .filter((item): item is ProviderModelOption => item != null),
  );
}

function providerModelsUrl(protocol: ConnectionTestProtocol, baseUrl: string): string {
  if (protocol === 'openai') return appendVersionedApiPath(baseUrl, '/models');
  if (protocol === 'anthropic') {
    const url = new URL(appendVersionedApiPath(baseUrl, '/models'));
    url.searchParams.set('limit', '1000');
    return url.toString();
  }
  if (protocol === 'ollama') {
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/api/tags`;
    return url.toString();
  }
  throw new Error(`Unsupported protocol: ${protocol}`);
}

function providerModelsHeaders(
  protocol: ConnectionTestProtocol,
  apiKey: string,
): Record<string, string> {
  if (protocol === 'openai' || protocol === 'ollama') {
    return apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  }
  if (protocol === 'anthropic') {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    };
  }
  return {};
}

function extractModels(protocol: ConnectionTestProtocol, data: unknown): ProviderModelOption[] {
  if (protocol === 'openai') return extractOpenAiModels(data);
  if (protocol === 'anthropic') return extractAnthropicModels(data);
  if (protocol === 'ollama') return extractOllamaModels(data);
  return [];
}

export async function listProviderModels(
  input: ProviderModelsInput,
): Promise<ProviderModelsResponse> {
  const start = Date.now();
  if (!['anthropic', 'openai', 'ollama'].includes(input.protocol)) {
    return {
      ok: false,
      kind: 'unsupported_protocol',
      latencyMs: Date.now() - start,
      detail: `Provider model discovery is not supported for ${input.protocol}.`,
    };
  }

  const validated = validateExternalApiBaseUrl(input.baseUrl);
  if (!validated.ok) {
    return {
      ok: false,
      kind: 'invalid_base_url',
      latencyMs: Date.now() - start,
      detail: validated.error,
    };
  }

  let url: string;
  try {
    url = providerModelsUrl(input.protocol, validated.url.toString());
  } catch (err) {
    return {
      ok: false,
      kind: 'unsupported_protocol',
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const apiKey = input.apiKey ?? '';
  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  if (input.signal?.aborted) {
    controller.abort();
  } else {
    input.signal?.addEventListener('abort', abortFromParent, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), PROVIDER_MODELS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: providerModelsHeaders(input.protocol, apiKey),
      signal: controller.signal,
      redirect: 'error',
    });
    const latencyMs = Date.now() - start;
    const rawText = await response.text();
    let data: unknown = {};
    let parseError: string | undefined;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
    }

    if (!response.ok) {
      const detail = parseError
        ? rawText.trim().slice(0, 240) || parseError
        : extractProviderErrorDetail(data, rawText);
      return {
        ok: false,
        kind: statusToKind(response.status),
        latencyMs,
        status: response.status,
        detail: redact(detail, [apiKey]),
      };
    }

    if (parseError) {
      return {
        ok: false,
        kind: 'unknown',
        latencyMs,
        status: response.status,
        detail: redact(parseError, [apiKey]),
      };
    }

    const models = extractModels(input.protocol, data);
    if (models.length === 0) {
      return {
        ok: false,
        kind: 'no_models',
        latencyMs,
        status: response.status,
        detail: 'Provider returned no usable text-generation models.',
      };
    }
    return {
      ok: true,
      kind: 'success',
      latencyMs,
      status: response.status,
      models,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const kind = networkErrorToKind(err);
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      kind,
      latencyMs,
      detail: redact(message, [apiKey]),
    };
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener('abort', abortFromParent);
  }
}
