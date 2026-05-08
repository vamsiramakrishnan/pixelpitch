// @ts-nocheck
import path from 'node:path';

import { spawnEnvForAgent } from './agents.js';
import { runOrchestrator } from './critique/orchestrator.js';
import { runParallelReviewRound } from './critique/parallel-orchestrator.js';
import {
  CHAT_TOOL_ENDPOINTS,
  CHAT_TOOL_OPERATIONS,
} from './tool-tokens.js';
import {
  attachAgentOutputHandlers,
  spawnAgentProcess,
} from './agent-runner.js';

export function createAgentRuntimeToolPrompt(daemonUrl, grant) {
  if (!grant) return '';
  return [
    '## Pixelpitch runtime tools',
    '',
    'You can create and update Live Artifacts for this project through the local daemon.',
    `Daemon URL: ${daemonUrl}`,
    'Use the bearer token from `PIXELPITCH_TOOL_TOKEN`; do not print or persist it.',
    '',
    'Endpoints:',
    '- POST /api/tools/live-artifacts/create',
    '- GET /api/tools/live-artifacts/list',
    '- POST /api/tools/live-artifacts/update',
    '- POST /api/tools/live-artifacts/refresh',
    '- GET /api/tools/connectors/list',
    '- POST /api/tools/connectors/inspect',
    '- POST /api/tools/connectors/execute',
    '',
    'Connector tools are limited to connected, auto-approved read-only tools. Use list for a compact index, inspect for the full schema of one tool, then execute with validated JSON input. Prefer the CLI wrapper when available:',
    '- `"$PIXELPITCH_NODE_BIN" "$PIXELPITCH_BIN" tools connectors list --format compact`',
    '- `"$PIXELPITCH_NODE_BIN" "$PIXELPITCH_BIN" tools connectors inspect --connector <id> --tool <name> --format compact`',
    '- `"$PIXELPITCH_NODE_BIN" "$PIXELPITCH_BIN" tools connectors execute --connector <id> --tool <name> --input input.json`',
    '',
    'Prefer Live Artifacts for dashboards, reports, scorecards, and refreshable views where the data and preview should stay structured.',
  ].join('\n');
}

export function createAgentRunService({
  runs,
  toolTokenRegistry,
  daemonUrl,
  pixelpitchBin,
  projectRoot,
  artifactsDir,
  db,
  critiqueCfg,
  critiqueWarnedAdapters,
  createSseErrorPayload,
  registerChatAgentEventSink,
  unregisterChatAgentEventSink,
  parallelCritiqueEnabled = false,
  composeCritiquePanelPrompt = null,
}) {
  const activeChildRunsByParentRunId = new Map();

  function rememberChild(parentRunId, childRunId) {
    if (!parentRunId || !childRunId) return;
    const children = activeChildRunsByParentRunId.get(parentRunId) ?? new Set();
    children.add(childRunId);
    activeChildRunsByParentRunId.set(parentRunId, children);
  }

  function forgetChild(parentRunId, childRunId) {
    if (!parentRunId || !childRunId) return;
    const children = activeChildRunsByParentRunId.get(parentRunId);
    if (!children) return;
    children.delete(childRunId);
    if (children.size === 0) activeChildRunsByParentRunId.delete(parentRunId);
  }

  function cancelChildren(parentRunId) {
    const children = activeChildRunsByParentRunId.get(parentRunId);
    if (!children) return 0;
    let canceled = 0;
    for (const childRunId of [...children]) {
      const childRun = runs.get(childRunId);
      if (!childRun || runs.isTerminal(childRun.status)) continue;
      runs.cancel(childRun);
      canceled += 1;
    }
    return canceled;
  }

  function createToolContext({
    runId,
    projectId,
    cwd,
    send,
    parentRunId = null,
    parentSend = null,
  }) {
    const grant =
      cwd && typeof projectId === 'string' && projectId
        ? toolTokenRegistry.mint({
            runId,
            projectId,
            allowedEndpoints: CHAT_TOOL_ENDPOINTS,
            allowedOperations: CHAT_TOOL_OPERATIONS,
          })
        : null;
    let revoked = false;
    let sinkRegistered = false;

    const revoke = (reason = 'manual') => {
      if (revoked || !grant) return;
      revoked = true;
      toolTokenRegistry.revokeToken(grant.token, reason);
    };

    const unregister = () => {
      if (!sinkRegistered || !grant?.runId) return;
      sinkRegistered = false;
      unregisterChatAgentEventSink(grant.runId);
    };

    if (grant?.runId) {
      registerChatAgentEventSink(grant.runId, (payload) => {
        send('agent', payload);
        if (parentSend && parentRunId && parentRunId !== grant.runId) {
          parentSend('agent', payload);
        }
        return true;
      });
      sinkRegistered = true;
    }

    return {
      grant,
      runtimeToolPrompt: createAgentRuntimeToolPrompt(daemonUrl, grant),
      env: {
        PIXELPITCH_NODE_BIN: process.execPath,
        PIXELPITCH_BIN: pixelpitchBin,
        PIXELPITCH_DAEMON_URL: daemonUrl,
        ...(grant ? { PIXELPITCH_TOOL_TOKEN: grant.token } : {}),
        ...(typeof projectId === 'string' && projectId && cwd
          ? {
              PIXELPITCH_PROJECT_ID: projectId,
              PIXELPITCH_PROJECT_DIR: cwd,
            }
          : {}),
      },
      revoke,
      unregister,
      cleanup(reason = 'child_exit') {
        revoke(reason);
        unregister();
      },
    };
  }

  function parseReviewerJson(text, role) {
    const trimmed = String(text || '').trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`reviewer ${role} did not return a JSON object`);
    }
    const parsed = JSON.parse(trimmed.slice(start, end + 1));
    const score = Number(parsed.score);
    if (!Number.isFinite(score)) {
      throw new Error(`reviewer ${role} returned an invalid score`);
    }
    const dimensions = Array.isArray(parsed.dimensions)
      ? parsed.dimensions
          .map((dim) => ({
            name: String(dim?.name ?? '').trim(),
            score: Number(dim?.score),
            note: String(dim?.note ?? '').trim(),
          }))
          .filter((dim) => dim.name && Number.isFinite(dim.score))
      : [];
    const mustFix = Array.isArray(parsed.mustFix)
      ? parsed.mustFix.map((item) => String(item).trim()).filter(Boolean)
      : [];
    return {
      role,
      score,
      dimensions,
      mustFix,
    };
  }

  function buildReviewerPrompt({
    role,
    round,
    prompt,
    cwd,
    cfg,
    runtimeToolPrompt = '',
  }) {
    if (typeof composeCritiquePanelPrompt === 'function') {
      return composeCritiquePanelPrompt({
        role,
        round,
        prompt,
        cwd,
        cfg,
        runtimeToolPrompt,
      });
    }
    return [
      '# Pixelpitch parallel critique reviewer',
      '',
      `You are the ${role} reviewer for Critique Theater round ${round}.`,
      `Score on a 0-${cfg.scoreScale} scale. The ship threshold is ${cfg.scoreThreshold}.`,
      cwd ? `Project directory to inspect: ${cwd}` : '',
      runtimeToolPrompt ? `\n${runtimeToolPrompt}` : '',
      '',
      'Return ONLY a JSON object with this exact shape:',
      '{"role":"critic","score":8,"dimensions":[{"name":"Hierarchy","score":8,"note":"Short note."}],"mustFix":["Specific blocker."]}',
      '',
      'Use your assigned role in the JSON role field. Keep notes short and actionable. Put only true blockers in mustFix.',
      '',
      '# Artifact/request to review',
      '',
      prompt,
    ].filter(Boolean).join('\n');
  }

  async function spawnReviewerSubRun({
    parentRun,
    parentSend,
    agentId,
    def,
    resolvedBin,
    cwd,
    projectId,
    conversationId,
    safeModel,
    safeReasoning,
    ctx,
    cfg,
  }) {
    const childRun = runs.create({ projectId, conversationId, agentId });
    const childSend = (event, data) => {
      runs.emit(childRun, event, data);
      if (event === 'start' || event === 'end' || event === 'error') {
        parentSend('agent', {
          type: 'critique_subrun',
          runId: parentRun.id,
          childRunId: childRun.id,
          role: ctx.role,
          event,
          data,
        });
      }
    };
    const toolContext = createToolContext({
      runId: childRun.id,
      projectId,
      cwd,
      send: childSend,
      parentRunId: parentRun.id,
      parentSend,
    });
    const reviewerPrompt = buildReviewerPrompt({
      role: ctx.role,
      round: ctx.round,
      prompt: ctx.prompt,
      cwd,
      cfg,
      runtimeToolPrompt: toolContext.runtimeToolPrompt,
    });
    const args = def.buildArgs(
      reviewerPrompt,
      [],
      [],
      { model: safeModel, reasoning: safeReasoning },
      { cwd },
    );
    rememberChild(parentRun.id, childRun.id);
    childRun.status = 'running';
    childRun.updatedAt = Date.now();
    childSend('start', {
      runId: childRun.id,
      parentRunId: parentRun.id,
      runKind: 'critique-reviewer',
      agentId,
      bin: resolvedBin,
      streamFormat: def.streamFormat ?? 'plain',
      projectId: typeof projectId === 'string' ? projectId : null,
      cwd,
      model: safeModel,
      reasoning: safeReasoning,
      role: ctx.role,
    });

    const output = [];
    const stderrOutput = [];
    let child;
    try {
      const env = spawnEnvForAgent(agentId, {
        ...process.env,
        ...(toolContext?.env ?? {}),
      });
      child = spawnAgentProcess({
        agentId,
        def,
        resolvedBin,
        args,
        env,
        cwd,
        prompt: reviewerPrompt,
        send: childSend,
        createExecutionErrorPayload: (message) =>
          createSseErrorPayload('AGENT_EXECUTION_FAILED', message),
      }).child;
      childRun.child = child;
    } catch (err) {
      toolContext.cleanup('child_exit');
      forgetChild(parentRun.id, childRun.id);
      childSend('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', `spawn failed: ${err.message}`));
      runs.finish(childRun, 'failed', 1, null);
      throw err;
    }

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    const stdoutDone = new Promise((resolve) => {
      if (!child.stdout) return resolve(undefined);
      child.stdout.on('data', (chunk) => {
        const text = String(chunk);
        output.push(text);
        childSend('stdout', { chunk: text });
      });
      child.stdout.on('end', resolve);
      child.stdout.resume();
    });
    const stderrDone = new Promise((resolve) => {
      if (!child.stderr) return resolve(undefined);
      child.stderr.on('data', (chunk) => {
        const text = String(chunk);
        stderrOutput.push(text);
        childSend('stderr', { chunk: text });
      });
      child.stderr.on('end', resolve);
      child.stderr.resume();
    });

    return await new Promise((resolve, reject) => {
      child.on('error', (err) => {
        toolContext.cleanup('child_exit');
        forgetChild(parentRun.id, childRun.id);
        childSend('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err.message));
        runs.finish(childRun, 'failed', 1, null);
        reject(err);
      });
      child.on('close', async (code, signal) => {
        await Promise.allSettled([stdoutDone, stderrDone]);
        toolContext.cleanup('child_exit');
        forgetChild(parentRun.id, childRun.id);
        const status = childRun.cancelRequested
          ? 'canceled'
          : code === 0
            ? 'succeeded'
            : 'failed';
        runs.finish(childRun, status, code, signal);
        if (status !== 'succeeded') {
          const stderrText = stderrOutput.join('').trim();
          reject(new Error(
            `reviewer ${ctx.role} exited with status ${status}` +
              (stderrText ? `: ${stderrText.slice(0, 500)}` : ''),
          ));
          return;
        }
        try {
          resolve(parseReviewerJson(output.join(''), ctx.role));
        } catch (err) {
          const stdoutText = output.join('').trim();
          const stderrText = stderrOutput.join('').trim();
          reject(new Error(
            `${err instanceof Error ? err.message : String(err)}` +
              (stdoutText ? `; stdout: ${stdoutText.slice(0, 500)}` : '; stdout was empty') +
              (stderrText ? `; stderr: ${stderrText.slice(0, 500)}` : ''),
          ));
        }
      });
    });
  }

  async function startPreparedAgentRun({
    run,
    runId,
    parentRunId = null,
    agentId,
    def,
    resolvedBin,
    args,
    prompt,
    cwd,
    projectId,
    conversationId,
    safeModel,
    safeReasoning,
    toolContext,
  }) {
    const send = (event, data) => runs.emit(run, event, data);
    if (parentRunId) rememberChild(parentRunId, run.id);

    const cleanup = (reason = 'child_exit') => {
      toolContext?.cleanup?.(reason);
      if (parentRunId) forgetChild(parentRunId, run.id);
    };

    if (run.cancelRequested || runs.isTerminal(run.status)) {
      cleanup('child_exit');
      return;
    }

    run.status = 'running';
    run.updatedAt = Date.now();
    send('start', {
      runId,
      parentRunId,
      runKind: parentRunId ? 'subrun' : 'chat',
      agentId,
      bin: resolvedBin,
      streamFormat: def.streamFormat ?? 'plain',
      projectId: typeof projectId === 'string' ? projectId : null,
      cwd,
      model: safeModel,
      reasoning: safeReasoning,
    });

    if (critiqueCfg.enabled && parallelCritiqueEnabled) {
      const adapterStreamFormat = def.streamFormat ?? 'plain';
      if (adapterStreamFormat !== 'plain') {
        cleanup('child_exit');
        send('agent', {
          event: 'critique.degraded',
          data: {
            runId,
            reason: 'adapter_unsupported',
            adapter: adapterStreamFormat,
          },
        });
        send('error', createSseErrorPayload(
          'AGENT_EXECUTION_FAILED',
          `parallel critique requires a plain-stream adapter, got ${adapterStreamFormat}`,
        ));
        return runs.finish(run, 'failed', 1, null);
      }
      try {
        const critiqueProjectKey =
          typeof projectId === 'string' && projectId ? projectId : runId;
        const critiqueArtifactDir = path.join(artifactsDir, critiqueProjectKey, runId);
        const orchestratorResult = await runParallelReviewRound({
          runId,
          projectId: typeof projectId === 'string' ? projectId : runId,
          conversationId: typeof conversationId === 'string' ? conversationId : null,
          artifactId: runId,
          artifactDir: critiqueArtifactDir,
          adapter: typeof agentId === 'string' ? agentId : 'unknown',
          cfg: critiqueCfg,
          db,
          bus: { emit: (event) => send('agent', event) },
          prompt,
          spawnReviewer: (ctx) => spawnReviewerSubRun({
            parentRun: run,
            parentSend: send,
            agentId,
            def,
            resolvedBin,
            cwd,
            projectId,
            conversationId,
            safeModel,
            safeReasoning,
            ctx,
            cfg: critiqueCfg,
          }),
        });
        cleanup('child_exit');
        const succeeded =
          orchestratorResult.status === 'shipped' ||
          orchestratorResult.status === 'below_threshold';
        if (run.cancelRequested) {
          runs.finish(run, 'canceled', 1, null);
        } else if (succeeded) {
          runs.finish(run, 'succeeded', 0, null);
        } else {
          runs.finish(run, 'failed', 1, null);
        }
      } catch (err) {
        cleanup('child_exit');
        send('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err instanceof Error ? err.message : String(err)));
        runs.finish(run, 'failed', 1, null);
      }
      return;
    }

    let child;
    let acpSession = null;
    try {
      const env = spawnEnvForAgent(agentId, {
        ...process.env,
        ...(toolContext?.env ?? {}),
      });
      const spawned = spawnAgentProcess({
        agentId,
        def,
        resolvedBin,
        args,
        env,
        cwd,
        prompt,
        send,
        createExecutionErrorPayload: (message) =>
          createSseErrorPayload('AGENT_EXECUTION_FAILED', message),
      });
      child = spawned.child;
      run.child = child;
    } catch (err) {
      cleanup('child_exit');
      runs.emit(
        run,
        'error',
        createSseErrorPayload(
          'AGENT_EXECUTION_FAILED',
          `spawn failed: ${err.message}`,
        ),
      );
      return runs.finish(run, 'failed', 1, null);
    }

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');

    if (critiqueCfg.enabled) {
      const adapterStreamFormat = def.streamFormat ?? 'plain';
      if (adapterStreamFormat !== 'plain') {
        if (!critiqueWarnedAdapters.has(adapterStreamFormat)) {
          critiqueWarnedAdapters.add(adapterStreamFormat);
          console.warn(`[critique] adapter format=${adapterStreamFormat} is not plain-stream; skipping orchestrator and falling through to legacy generation`);
        }
      } else {
        const critiqueRunId = run.id;
        const critiqueProjectKey =
          typeof projectId === 'string' && projectId ? projectId : critiqueRunId;
        const critiqueArtifactDir = path.join(artifactsDir, critiqueProjectKey, critiqueRunId);
        const stdoutIterable = (async function* () {
          for await (const chunk of child.stdout) yield String(chunk);
        })();
        child.stderr?.on('data', (chunk) => send('stderr', { chunk }));
        child.on('error', (err) => {
          cleanup('child_exit');
          send('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err.message));
        });
        const childExitPromise = new Promise((resolve) => {
          child.once('close', (code, signal) => resolve({ code, signal }));
        });
        try {
          const orchestratorResult = await runOrchestrator({
            runId: critiqueRunId,
            projectId: typeof projectId === 'string' ? projectId : critiqueRunId,
            conversationId: typeof conversationId === 'string' ? conversationId : null,
            artifactId: critiqueRunId,
            artifactDir: critiqueArtifactDir,
            adapter: typeof agentId === 'string' ? agentId : 'unknown',
            cfg: critiqueCfg,
            db,
            bus: { emit: (event) => send('agent', event) },
            stdout: stdoutIterable,
            child,
            childExitPromise,
          });
          cleanup('child_exit');
          const succeeded =
            orchestratorResult.status === 'shipped' ||
            orchestratorResult.status === 'below_threshold';
          if (run.cancelRequested) {
            runs.finish(run, 'canceled', 1, null);
          } else if (succeeded) {
            runs.finish(run, 'succeeded', 0, null);
          } else {
            runs.finish(run, 'failed', 1, null);
          }
        } catch (err) {
          cleanup('child_exit');
          send('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err instanceof Error ? err.message : String(err)));
          runs.finish(run, 'failed', 1, null);
        }
        return;
      }
    }

    const attached = attachAgentOutputHandlers({
      child,
      def,
      prompt,
      cwd: cwd || projectRoot,
      model: safeModel,
      send,
    });
    acpSession = attached.acpSession;

    child.on('error', (err) => {
      cleanup('child_exit');
      send('error', createSseErrorPayload('AGENT_EXECUTION_FAILED', err.message));
      runs.finish(run, 'failed', 1, null);
    });
    child.on('close', (code, signal) => {
      cleanup('child_exit');
      if (acpSession?.hasFatalError()) {
        return runs.finish(run, 'failed', code ?? 1, signal ?? null);
      }
      const status = run.cancelRequested
        ? 'canceled'
        : code === 0
          ? 'succeeded'
          : 'failed';
      runs.finish(run, status, code, signal);
    });
  }

  return {
    createToolContext,
    startPreparedAgentRun,
    cancelChildren,
  };
}
