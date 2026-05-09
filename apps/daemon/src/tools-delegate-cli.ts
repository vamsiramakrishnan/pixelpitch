import { readFile } from 'node:fs/promises';
import path from 'node:path';

type JsonObject = Record<string, unknown>;

interface ToolCliResult {
  exitCode: number;
}

interface ParsedOptions {
  command: string | undefined;
  task?: string;
  request?: string;
  inputPath?: string;
  agentId?: string;
  model?: string;
  reasoning?: string;
  timeoutMs?: number;
  planner?: boolean;
  format: 'compact' | 'json';
  help: boolean;
}

const DELEGATE_USAGE = `Usage:
  pixelpitch tools delegate send --task <task> [--agent <id>] [--format compact]
  pixelpitch tools delegate workflow --request <request> [--agent <id>] [--no-planner] [--format compact]
  pixelpitch tools delegate send --input task.json [--format compact]

Input JSON shape:
  {"task":"Audit the current deck for contrast issues","agentId":"codex","timeoutMs":600000}

Environment:
  PIXELPITCH_NODE_BIN     Node-compatible runtime for agent wrapper invocations
  PIXELPITCH_BIN          Pixelpitch CLI script for agent wrapper invocations
  PIXELPITCH_DAEMON_URL   Daemon base URL injected into agent runs
  PIXELPITCH_TOOL_TOKEN   Bearer token injected into agent runs

Agent runtime invocation:
  "$PIXELPITCH_NODE_BIN" "$PIXELPITCH_BIN" tools delegate send --task "Audit the current artifact for accessibility risks"
  "$PIXELPITCH_NODE_BIN" "$PIXELPITCH_BIN" tools delegate workflow --request "Research, build, and review the current landing page"
`;

function writeJson(value: unknown, stream: NodeJS.WriteStream = process.stdout): void {
  stream.write(`${JSON.stringify(value)}\n`);
}

function fail(message: string, details?: unknown): ToolCliResult {
  writeJson({ ok: false, error: { message, ...(details === undefined ? {} : { details }) } }, process.stderr);
  return { exitCode: 1 };
}

function parseOptions(args: string[]): ParsedOptions | { error: string } {
  const [command, ...rest] = args;
  const options: ParsedOptions = {
    command: command === '-h' || command === '--help' ? undefined : command,
    format: 'compact',
    help: command === '-h' || command === '--help',
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--task') {
      const value = rest[++index];
      if (!value) return { error: '--task requires text' };
      options.task = value;
    } else if (arg === '--request') {
      const value = rest[++index];
      if (!value) return { error: '--request requires text' };
      options.request = value;
    } else if (arg === '--input') {
      const value = rest[++index];
      if (!value) return { error: '--input requires a file path' };
      options.inputPath = value;
    } else if (arg === '--agent') {
      const value = rest[++index];
      if (!value) return { error: '--agent requires an agent id' };
      options.agentId = value;
    } else if (arg === '--model') {
      const value = rest[++index];
      if (!value) return { error: '--model requires a model id' };
      options.model = value;
    } else if (arg === '--reasoning') {
      const value = rest[++index];
      if (!value) return { error: '--reasoning requires a value' };
      options.reasoning = value;
    } else if (arg === '--timeout-ms') {
      const value = Number(rest[++index]);
      if (!Number.isFinite(value) || value <= 0) return { error: '--timeout-ms requires a positive number' };
      options.timeoutMs = value;
    } else if (arg === '--planner') {
      options.planner = true;
    } else if (arg === '--no-planner') {
      options.planner = false;
    } else if (arg === '--format') {
      const value = rest[++index];
      if (value !== 'compact' && value !== 'json') return { error: '--format must be compact or json' };
      options.format = value;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else {
      return { error: `unknown option: ${arg}` };
    }
  }

  return options;
}

function daemonUrl(): URL | { error: string } {
  const rawUrl = process.env.PIXELPITCH_DAEMON_URL;
  if (!rawUrl) return { error: 'PIXELPITCH_DAEMON_URL is required' };
  try {
    const url = new URL(rawUrl);
    url.pathname = url.pathname.replace(/\/+$/u, '');
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return { error: 'PIXELPITCH_DAEMON_URL must be a valid URL' };
  }
}

function toolToken(): string | { error: string } {
  const token = process.env.PIXELPITCH_TOOL_TOKEN;
  if (!token) return { error: 'PIXELPITCH_TOOL_TOKEN is required' };
  return token;
}

function endpoint(baseUrl: URL, pathname: string): string {
  const url = new URL(baseUrl.toString());
  url.pathname = `${url.pathname}${pathname}`.replace(/\/+/gu, '/');
  return url.toString();
}

async function readJsonObject(filePath: string): Promise<JsonObject> {
  const resolved = path.resolve(filePath);
  const text = await readFile(resolved, 'utf8');
  const value = JSON.parse(text) as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${resolved} must contain a JSON object`);
  }
  return value as JsonObject;
}

async function requestJson(baseUrl: URL, token: string, pathname: string, body: JsonObject): Promise<{ status: number; body: unknown }> {
  const response = await fetch(endpoint(baseUrl, pathname), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = text;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = { message: text };
    }
  }
  return { status: response.status, body: parsed };
}

function normalizeError(body: unknown): unknown {
  if (!body || typeof body !== 'object') return { message: String(body ?? 'request failed') };
  const record = body as JsonObject;
  return record.error ?? record;
}

function compactDelegation(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as JsonObject;
  return {
    runId: record.runId,
    status: record.status,
    stdout: record.stdout,
    stderr: record.stderr,
  };
}

function compactWorkflow(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const record = body as JsonObject;
  const results = Array.isArray(record.results) ? record.results : [];
  return {
    workflowId: record.workflowId,
    status: record.status,
    plan: record.plan,
    planner: record.planner,
    results: results.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const result = item as JsonObject;
      return {
        taskId: result.taskId,
        title: result.title,
        specialist: result.specialist,
        status: result.status,
        runId: result.runId,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }),
  };
}

async function printApiResult(
  response: { status: number; body: unknown },
  compact: (body: unknown) => unknown,
): Promise<ToolCliResult> {
  if (response.status < 200 || response.status >= 300) {
    writeJson({ ok: false, status: response.status, error: normalizeError(response.body) }, process.stderr);
    return { exitCode: 1 };
  }
  const body = compact(response.body);
  writeJson(body && typeof body === 'object' && !Array.isArray(body) ? { ok: true, ...(body as JsonObject) } : { ok: true, result: body });
  return { exitCode: 0 };
}

export async function runDelegateToolCli(args: string[]): Promise<ToolCliResult> {
  const options = parseOptions(args);
  if ('error' in options) return fail(options.error);
  if (options.help || !options.command) {
    process.stdout.write(DELEGATE_USAGE);
    return { exitCode: options.command ? 0 : 1 };
  }
  if (options.command !== 'send' && options.command !== 'workflow') {
    return fail(`unknown delegate command: ${options.command}`);
  }

  const baseUrl = daemonUrl();
  if ('error' in baseUrl) return fail(baseUrl.error);
  const token = toolToken();
  if (typeof token !== 'string') return fail(token.error);

  try {
    const input = options.inputPath ? await readJsonObject(options.inputPath) : {};
    const body: JsonObject = {
      ...input,
      ...(options.task ? { task: options.task } : {}),
      ...(options.request ? { request: options.request } : {}),
      ...(options.agentId ? { agentId: options.agentId } : {}),
      ...(options.model ? { model: options.model } : {}),
      ...(options.reasoning ? { reasoning: options.reasoning } : {}),
      ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.planner === undefined ? {} : { planner: options.planner }),
    };
    if (options.command === 'send' && (typeof body.task !== 'string' || !body.task.trim())) {
      return fail('send requires --task <task> or an input JSON object with task');
    }
    if (options.command === 'workflow' && (typeof body.request !== 'string' || !body.request.trim())) {
      return fail('workflow requires --request <request> or an input JSON object with request');
    }
    const pathName = options.command === 'workflow'
      ? '/api/tools/delegation/workflow'
      : '/api/tools/delegation/send';
    return await printApiResult(
      await requestJson(baseUrl, token, pathName, body),
      options.format === 'compact'
        ? options.command === 'workflow'
          ? compactWorkflow
          : compactDelegation
        : (value) => value,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(message);
  }
}
