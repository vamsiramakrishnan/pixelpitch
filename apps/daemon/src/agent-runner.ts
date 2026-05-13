import { spawn, type ChildProcess } from 'node:child_process';

import { createCommandInvocation } from '@pixelpitch/platform';

import { attachAcpSession } from './acp.js';
import { attachPiRpcSession } from './pi-rpc.js';
import { createClaudeStreamHandler } from './claude-stream.js';
import { createCopilotStreamHandler } from './copilot-stream.js';
import { createJsonEventStreamHandler } from './json-event-stream.js';
import { createQoderStreamHandler } from './qoder-stream.js';

export interface AgentDefinitionLike {
  id: string;
  streamFormat?: string;
  eventParser?: string;
  promptViaStdin?: boolean;
}

export type AgentRunnerSend = (event: string, payload: unknown) => void;

export interface SpawnAgentProcessInput {
  agentId: string;
  def: AgentDefinitionLike;
  resolvedBin: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  cwd?: string | null;
  prompt: string;
  send: AgentRunnerSend;
  createExecutionErrorPayload: (message: string) => unknown;
}

export interface SpawnAgentProcessResult {
  child: ChildProcess;
}

export function spawnAgentProcess(
  input: SpawnAgentProcessInput,
): SpawnAgentProcessResult {
  const stdinMode =
    input.def.promptViaStdin || input.def.streamFormat === 'acp-json-rpc'
      ? 'pipe'
      : 'ignore';
  const invocation = createCommandInvocation({
    command: input.resolvedBin,
    args: input.args,
    env: input.env,
  });
  const child = spawn(invocation.command, invocation.args, {
    env: input.env,
    stdio: [stdinMode, 'pipe', 'pipe'],
    cwd: input.cwd || undefined,
    shell: false,
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
  });

  if (input.def.promptViaStdin && child.stdin && input.def.streamFormat !== 'pi-rpc') {
    child.stdin.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') {
        input.send(
          'error',
          input.createExecutionErrorPayload(`stdin: ${err.message}`),
        );
      }
    });
    child.stdin.end(input.prompt, 'utf8');
  }

  return { child };
}

export interface AttachAgentOutputHandlersInput {
  child: ChildProcess;
  def: AgentDefinitionLike;
  prompt: string;
  cwd: string;
  model?: string | null;
  send: AgentRunnerSend;
}

export interface AttachAgentOutputHandlersResult {
  acpSession: { hasFatalError?: () => boolean } | null;
}

export function attachAgentOutputHandlers(
  input: AttachAgentOutputHandlersInput,
): AttachAgentOutputHandlersResult {
  const { child, def, prompt, cwd, model, send } = input;
  let acpSession: { hasFatalError?: () => boolean } | null = null;

  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');

  if (def.streamFormat === 'claude-stream-json') {
    const claude = createClaudeStreamHandler((ev: unknown) => send('agent', ev));
    child.stdout?.on('data', (chunk: string) => claude.feed(chunk));
    child.on('close', () => claude.flush());
  } else if (def.streamFormat === 'copilot-stream-json') {
    const copilot = createCopilotStreamHandler((ev: unknown) => send('agent', ev));
    child.stdout?.on('data', (chunk: string) => copilot.feed(chunk));
    child.on('close', () => copilot.flush());
  } else if (def.streamFormat === 'qoder-stream-json') {
    const qoder = createQoderStreamHandler((ev: unknown) => send('agent', ev));
    child.stdout?.on('data', (chunk: string) => qoder.feed(chunk));
    child.on('close', () => qoder.flush());
  } else if (def.streamFormat === 'pi-rpc') {
    acpSession = attachPiRpcSession({
      child,
      prompt,
      cwd,
      model: model ?? null,
      send,
    });
  } else if (def.streamFormat === 'acp-json-rpc') {
    acpSession = attachAcpSession({
      child,
      prompt,
      cwd,
      model: model ?? null,
      send,
    });
  } else if (def.streamFormat === 'json-event-stream') {
    const handler = createJsonEventStreamHandler(
      def.eventParser || def.id,
      (ev: unknown) => send('agent', ev),
    );
    child.stdout?.on('data', (chunk: string) => handler.feed(chunk));
    child.on('close', () => handler.flush());
  } else {
    child.stdout?.on('data', (chunk: string) => send('stdout', { chunk }));
  }
  child.stderr?.on('data', (chunk: string) => send('stderr', { chunk }));

  return { acpSession };
}
