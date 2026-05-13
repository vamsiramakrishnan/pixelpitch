#!/usr/bin/env node
// @ts-nocheck
import { startServer } from './server.js';
import { runMcpStdio } from './mcp.js';
import { runConnectorsToolCli } from './tools-connectors-cli.js';
import { runDelegateToolCli } from './tools-delegate-cli.js';
import { runLiveArtifactsToolCli } from './tools-live-artifacts-cli.js';

const argv = process.argv.slice(2);

// ---- Subcommand router ----------------------------------------------------
//
// `od` is two CLIs glued together:
//   - default mode: starts the daemon + opens the web UI.
//   - `pixelpitch media …`: a thin client that POSTs to the running daemon. This
//     is what the code agent invokes from inside a chat to actually
//     produce image / video / audio bytes (the unifying contract).
//
// We dispatch on the first positional argument so flags like --port keep
// working unchanged. Subcommand routing is keyword-based; flags are
// parsed inside each handler.

// Flags accepted by `pixelpitch media generate`. Whitelisted so a hallucinated
// `--length 5` from the LLM fails fast instead of silently no-op'ing
// while we route a bogus body to the daemon.
//
// Hoisted to the top of the module *before* the subcommand dispatch
// below: top-level `await SUBCOMMAND_MAP[first](rest)` runs runMedia
// synchronously during module evaluation, and runMedia references these
// `const` Sets — leaving them at the bottom of the file would hit the
// TDZ ("Cannot access 'MEDIA_GENERATE_STRING_FLAGS' before
// initialization") and crash every `pixelpitch media …` invocation.
const MEDIA_GENERATE_STRING_FLAGS = new Set([
  'project',
  'surface',
  'model',
  'prompt',
  'output',
  'aspect',
  'length',
  'duration',
  'voice',
  'audio-kind',
  'composition-dir',
  'image',
  'daemon-url',
]);
const MEDIA_GENERATE_BOOLEAN_FLAGS = new Set([
  'help',
  'h',
]);
const MCP_STRING_FLAGS = new Set(['daemon-url']);
const MCP_BOOLEAN_FLAGS = new Set(['help', 'h']);
const DIRECTIVES_STRING_FLAGS = new Set(['query', 'limit', 'format', 'daemon-url']);
const DIRECTIVES_BOOLEAN_FLAGS = new Set(['help', 'h']);
const CATALOG_SEARCH_STRING_FLAGS = new Set(['query', 'limit', 'format', 'daemon-url']);
const CATALOG_SEARCH_BOOLEAN_FLAGS = new Set(['help', 'h']);

const SUBCOMMAND_MAP = {
  media: runMedia,
  mcp: runMcp,
  tools: runTools,
};

const first = argv.find((a) => !a.startsWith('-'));
if (first && SUBCOMMAND_MAP[first]) {
  const idx = argv.indexOf(first);
  const rest = [...argv.slice(0, idx), ...argv.slice(idx + 1)];
  await SUBCOMMAND_MAP[first](rest);
  process.exit(0);
}

// Default: daemon mode.
let port = Number(process.env.PIXELPITCH_PORT) || 17456;
let host = process.env.PIXELPITCH_BIND_HOST || '127.0.0.1';
let open = true;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '-p' || a === '--port') {
    port = Number(argv[++i]);
  } else if (a === '--host') {
    host = argv[++i];
  } else if (a === '--no-open') {
    open = false;
  } else if (a === '-h' || a === '--help') {
    printRootHelp();
    process.exit(0);
  }
}

startServer({ port, host }).then(url => {
  console.log(`[od] listening on ${url}`);
  if (open) {
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'start'
      : 'xdg-open';
    import('node:child_process').then(({ spawn }) => {
      spawn(opener, [url], { detached: true, stdio: 'ignore' }).unref();
    });
  }
});

function printRootHelp() {
  console.log(`Usage:
  pixelpitch [--port <n>] [--host <addr>] [--no-open]
      Start the local daemon and open the web UI.

  pixelpitch media generate --surface <image|video|audio> --model <id> [opts]
      Generate a media artifact and write it into the active project.
      Designed to be invoked by a code agent — picks up PIXELPITCH_DAEMON_URL
      and PIXELPITCH_PROJECT_ID from the env that the daemon injected on spawn.

  pixelpitch mcp [--daemon-url <url>]
      Run a stdio MCP server that proxies read-only tool calls to a
      running Pixelpitch daemon. Wire it into a coding agent in another
      repo to pull project files without exporting a zip.

  pixelpitch tools connectors list
  pixelpitch tools connectors inspect --connector <id> --tool <name>
  pixelpitch tools connectors execute --connector <id> --tool <name> --input input.json
  pixelpitch tools delegate send --task <task>
  pixelpitch tools delegate workflow --request <request>
      Invoke connected read-only connector tools from an agent run using
      PIXELPITCH_DAEMON_URL and PIXELPITCH_TOOL_TOKEN.

  pixelpitch tools live-artifacts <create|list|update|refresh> [options]
      Manage live artifacts through daemon wrapper commands using
      PIXELPITCH_DAEMON_URL and PIXELPITCH_TOOL_TOKEN.

Options:
  --port <n>       Port to listen on (default: 17456, env: PIXELPITCH_PORT).
  --host <addr>    Interface address to bind to (default: 127.0.0.1, env: PIXELPITCH_BIND_HOST).
                   Set to a specific IP (e.g. a Tailscale address) to restrict access
                   to that interface only.
  --no-open        Do not open the browser after start.

What the daemon does:
  * scans PATH for installed code-agent CLIs (claude, codex, devin, gemini, opencode, cursor-agent, ...)
  * serves the chat UI at http://<host>:<port>
  * proxies messages (text + images) to the selected agent via child-process spawn
  * exposes /api/projects/:id/media/generate — the unified image/video/audio
    dispatcher that the agent calls via \`pixelpitch media generate\`.`);
}

async function runMcp(args) {
  const flags = parseFlags(args, {
    string: MCP_STRING_FLAGS,
    boolean: MCP_BOOLEAN_FLAGS,
  });
  if (flags.help || flags.h) {
    printMcpHelp();
    return;
  }
  const daemonUrl =
    flags['daemon-url'] ||
    process.env.PIXELPITCH_DAEMON_URL ||
    `http://127.0.0.1:${Number(process.env.PIXELPITCH_PORT) || 17456}`;
  await runMcpStdio({ daemonUrl });
}

function printMcpHelp() {
  console.log(`Usage:
  pixelpitch mcp [--daemon-url <url>]

Options:
  --daemon-url <url>  Pixelpitch daemon URL (default: PIXELPITCH_DAEMON_URL or http://127.0.0.1:17456).

Tools:
  list_projects, get_active_context, get_project, list_files, get_file,
  get_artifact, search_files.`);
}

async function runTools(args) {
  const sub = args.find((a) => !a.startsWith('-')) || '';
  if (sub === 'help' || sub === '-h' || sub === '--help' || sub === '') {
    printToolsHelp();
    return;
  }
  const idx = args.indexOf(sub);
  const subArgs = [...args.slice(0, idx), ...args.slice(idx + 1)];
  if (sub === 'connectors') {
    const result = await runConnectorsToolCli(subArgs);
    if (result.exitCode) process.exit(result.exitCode);
    return;
  }
  if (sub === 'live-artifacts') {
    const result = await runLiveArtifactsToolCli(subArgs);
    if (result.exitCode) process.exit(result.exitCode);
    return;
  }
  if (sub === 'delegate') {
    const result = await runDelegateToolCli(subArgs);
    if (result.exitCode) process.exit(result.exitCode);
    return;
  }
  if (sub === 'directives') {
    await runDirectivesToolCli(subArgs);
    return;
  }
  if (sub === 'skills') {
    await runCatalogSearchToolCli('skills', subArgs);
    return;
  }
  if (sub === 'craft') {
    await runCatalogSearchToolCli('craft', subArgs);
    return;
  }
  if (sub === 'context') {
    await runContextToolCli(subArgs);
    return;
  }
  console.error(`unknown subcommand: pixelpitch tools ${sub}`);
  printToolsHelp();
  process.exit(1);
}

function printToolsHelp() {
  console.log(`Usage:
  pixelpitch tools connectors list [--format compact|json]
  pixelpitch tools connectors inspect --connector <id> --tool <name> [--format compact|json]
  pixelpitch tools connectors execute --connector <id> --tool <name> --input input.json [--format compact|json]
  pixelpitch tools delegate send --task <task> [--agent <id>] [--format compact|json]
  pixelpitch tools delegate workflow --request <request> [--agent <id>] [--no-planner] [--format compact|json]
  pixelpitch tools skills search --query <text> [--limit <n>] [--format compact|json]
  pixelpitch tools context search --query <text> [--limit <n>] [--format compact|json]
  pixelpitch tools context resolve --message <text> [--project <id>] [--include-prompt] [--format compact|json]
  pixelpitch tools directives search --query <text> [--limit <n>] [--format compact|json]
  pixelpitch tools craft search --query <text> [--limit <n>] [--format compact|json]
  pixelpitch tools live-artifacts create --input artifact.json
  pixelpitch tools live-artifacts list [--format compact|json]
  pixelpitch tools live-artifacts refresh --artifact-id <id>
  pixelpitch tools live-artifacts update --artifact-id <id> --input artifact.json

Environment:
  PIXELPITCH_DAEMON_URL  Daemon base URL injected into agent runs.
  PIXELPITCH_TOOL_TOKEN  Bearer token injected into agent runs.`);
}

async function runContextToolCli(args) {
  const sub = args.find((a) => !a.startsWith('-')) || '';
  if (sub === 'help' || sub === '-h' || sub === '--help' || sub === '') {
    printContextHelp();
    return;
  }
  if (sub !== 'search' && sub !== 'resolve') {
    console.error(`unknown subcommand: pixelpitch tools context ${sub}`);
    printContextHelp();
    process.exit(1);
  }
  const idx = args.indexOf(sub);
  const subArgs = [...args.slice(0, idx), ...args.slice(idx + 1)];
  let flags;
  try {
    flags = parseFlags(subArgs, {
      string: new Set(['query', 'limit', 'format', 'daemon-url', 'message', 'project']),
      boolean: new Set(['help', 'h', 'include-prompt']),
    });
  } catch (err) {
    console.error(err.message);
    printContextHelp();
    process.exit(2);
  }
  if (flags.help || flags.h) {
    printContextHelp();
    return;
  }
  const daemonUrl = flags['daemon-url'] || process.env.PIXELPITCH_DAEMON_URL || 'http://127.0.0.1:17456';
  let resp;
  try {
    if (sub === 'search') {
      if (!flags.query) {
        console.error('--query required for context search');
        process.exit(2);
      }
      const params = new URLSearchParams({ q: flags.query });
      if (flags.limit) params.set('limit', flags.limit);
      resp = await fetch(`${daemonUrl.replace(/\/$/, '')}/api/context/search?${params}`);
    } else {
      if (!flags.message) {
        console.error('--message required for context resolve');
        process.exit(2);
      }
      resp = await fetch(`${daemonUrl.replace(/\/$/, '')}/api/context/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: flags.project || process.env.PIXELPITCH_PROJECT_ID || null,
          message: flags.message,
          includePrompt: Boolean(flags['include-prompt']),
        }),
      });
    }
  } catch (err) {
    surfaceFetchError(err, daemonUrl);
    process.exit(3);
  }
  if (!resp.ok) {
    console.error(`daemon ${resp.status}: ${await resp.text()}`);
    process.exit(4);
  }
  const body = await resp.json();
  if (flags.format === 'json') {
    console.log(JSON.stringify(body, null, 2));
    return;
  }
  const items = Array.isArray(body.results) ? body.results : Array.isArray(body.stack) ? body.stack : [];
  for (const item of items) {
    const status = item.loaded === false ? 'candidate' : item.loaded === true ? 'loaded' : item.kind;
    const score = typeof item.score === 'number' ? ` score=${item.score}` : '';
    console.log(`${item.kind} ${item.id} (${status})${score}`);
    if (item.reason) console.log(`  ${item.reason}`);
    if (item.summary) console.log(`  ${item.summary}`);
    if (item.source) console.log(`  ${item.source}`);
  }
  if (Array.isArray(body.trace) && body.trace.length > 0) {
    console.log('\nTrace:');
    for (const line of body.trace) console.log(`  - ${line}`);
  }
}

function printContextHelp() {
  console.log(`Usage:
  pixelpitch tools context search --query <text> [--limit <n>] [--format compact|json]
  pixelpitch tools context resolve --message <text> [--project <id>] [--include-prompt] [--format compact|json]

Context search returns mixed skills, design systems, directives, and craft rules. Context resolve shows the exact stack Pixelpitch would load for a chat turn.`);
}

async function runCatalogSearchToolCli(kind, args) {
  const sub = args.find((a) => !a.startsWith('-')) || '';
  if (sub === 'help' || sub === '-h' || sub === '--help' || sub === '') {
    printCatalogSearchHelp(kind);
    return;
  }
  if (sub !== 'search' && sub !== 'list') {
    console.error(`unknown subcommand: pixelpitch tools ${kind} ${sub}`);
    printCatalogSearchHelp(kind);
    process.exit(1);
  }
  const idx = args.indexOf(sub);
  const subArgs = [...args.slice(0, idx), ...args.slice(idx + 1)];
  let flags;
  try {
    flags = parseFlags(subArgs, {
      string: CATALOG_SEARCH_STRING_FLAGS,
      boolean: CATALOG_SEARCH_BOOLEAN_FLAGS,
    });
  } catch (err) {
    console.error(err.message);
    printCatalogSearchHelp(kind);
    process.exit(2);
  }
  if (flags.help || flags.h) {
    printCatalogSearchHelp(kind);
    return;
  }
  const daemonUrl = flags['daemon-url'] || process.env.PIXELPITCH_DAEMON_URL || 'http://127.0.0.1:17456';
  const params = new URLSearchParams();
  if (sub === 'search') {
    if (!flags.query) {
      console.error(`--query required for ${kind} search`);
      process.exit(2);
    }
    params.set('q', flags.query);
  }
  if (flags.limit) params.set('limit', flags.limit);
  const path = sub === 'search' ? `/api/${kind}/search` : `/api/${kind}`;
  const url = `${daemonUrl.replace(/\/$/, '')}${path}${params.toString() ? `?${params}` : ''}`;
  let resp;
  try {
    resp = await fetch(url);
  } catch (err) {
    surfaceFetchError(err, daemonUrl);
    process.exit(3);
  }
  if (!resp.ok) {
    console.error(`daemon ${resp.status}: ${await resp.text()}`);
    process.exit(4);
  }
  const body = await resp.json();
  if (flags.format === 'json') {
    console.log(JSON.stringify(body, null, 2));
    return;
  }
  const items = Array.isArray(body[kind]) ? body[kind] : [];
  for (const item of items) {
    const record = item.skill || item.section || item;
    const score = typeof item.score === 'number' ? ` score=${item.score}` : '';
    console.log(`${record.id}${score}`);
    console.log(`  ${record.name || record.title || ''}`);
    if (record.description || record.summary) console.log(`  ${record.description || record.summary}`);
    if (Array.isArray(record.cliProcedures) && record.cliProcedures.length > 0) {
      console.log(`  CLI procedures: ${record.cliProcedures.length}`);
      for (const proc of record.cliProcedures.slice(0, 3)) console.log(`    ${proc.command}`);
    }
  }
}

function printCatalogSearchHelp(kind) {
  console.log(`Usage:
  pixelpitch tools ${kind} list [--limit <n>] [--format compact|json]
  pixelpitch tools ${kind} search --query <text> [--limit <n>] [--format compact|json]

Use this from an agent run to discover composable ${kind} context before deciding which capability, procedure, or quality rule to apply.`);
}

async function runDirectivesToolCli(args) {
  const sub = args.find((a) => !a.startsWith('-')) || '';
  if (sub === 'help' || sub === '-h' || sub === '--help' || sub === '') {
    printDirectivesHelp();
    return;
  }
  if (sub !== 'search' && sub !== 'list') {
    console.error(`unknown subcommand: pixelpitch tools directives ${sub}`);
    printDirectivesHelp();
    process.exit(1);
  }
  const idx = args.indexOf(sub);
  const subArgs = [...args.slice(0, idx), ...args.slice(idx + 1)];
  let flags;
  try {
    flags = parseFlags(subArgs, {
      string: DIRECTIVES_STRING_FLAGS,
      boolean: DIRECTIVES_BOOLEAN_FLAGS,
    });
  } catch (err) {
    console.error(err.message);
    printDirectivesHelp();
    process.exit(2);
  }
  if (flags.help || flags.h) {
    printDirectivesHelp();
    return;
  }
  const daemonUrl = flags['daemon-url'] || process.env.PIXELPITCH_DAEMON_URL || 'http://127.0.0.1:17456';
  const params = new URLSearchParams();
  if (sub === 'search') {
    if (!flags.query) {
      console.error('--query required for directives search');
      process.exit(2);
    }
    params.set('q', flags.query);
  }
  if (flags.limit) params.set('limit', flags.limit);
  const url = `${daemonUrl.replace(/\/$/, '')}/api/directives${params.toString() ? `?${params}` : ''}`;
  let resp;
  try {
    resp = await fetch(url);
  } catch (err) {
    surfaceFetchError(err, daemonUrl);
    process.exit(3);
  }
  if (!resp.ok) {
    console.error(`daemon ${resp.status}: ${await resp.text()}`);
    process.exit(4);
  }
  const body = await resp.json();
  if (flags.format === 'json') {
    console.log(JSON.stringify(body, null, 2));
    return;
  }
  const items = Array.isArray(body.directives) ? body.directives : [];
  for (const item of items) {
    const directive = item.directive || item;
    const score = typeof item.score === 'number' ? ` score=${item.score}` : '';
    console.log(`${directive.id}${score}`);
    console.log(`  ${directive.title}`);
    console.log(`  ${directive.summary}`);
    if (directive.composition?.precedence) console.log(`  ${directive.composition.precedence}`);
  }
}

function printDirectivesHelp() {
  console.log(`Usage:
  pixelpitch tools directives list [--limit <n>] [--format compact|json]
  pixelpitch tools directives search --query <text> [--limit <n>] [--format compact|json]

Directives are searchable craft overlays. Active DESIGN.md systems remain authoritative for brand tokens and component rules.`);
}

// ---------------------------------------------------------------------------
// Subcommand: pixelpitch media …
// ---------------------------------------------------------------------------

async function runMedia(args) {
  const sub = args.find((a) => !a.startsWith('-')) || '';
  if (sub === 'help' || sub === '-h' || sub === '--help' || sub === '') {
    printMediaHelp();
    return;
  }
  if (sub !== 'generate' && sub !== 'wait') {
    console.error(`unknown subcommand: pixelpitch media ${sub}`);
    printMediaHelp();
    process.exit(1);
  }

  const idx = args.indexOf(sub);
  const subArgs = [...args.slice(0, idx), ...args.slice(idx + 1)];
  if (sub === 'wait') return runMediaWait(subArgs);
  return runMediaGenerate(subArgs);
}

async function runMediaGenerate(rawArgs) {
  let flags;
  try {
    flags = parseFlags(rawArgs, {
      string: MEDIA_GENERATE_STRING_FLAGS,
      boolean: MEDIA_GENERATE_BOOLEAN_FLAGS,
    });
  } catch (err) {
    console.error(err.message);
    printMediaHelp();
    process.exit(2);
  }

  const daemonUrl = flags['daemon-url'] || process.env.PIXELPITCH_DAEMON_URL || 'http://127.0.0.1:17456';
  const projectId = flags.project || process.env.PIXELPITCH_PROJECT_ID;
  if (!projectId) {
    console.error(
      'project id required. Pass --project <id> or set PIXELPITCH_PROJECT_ID. The daemon injects this when it spawns the code agent.',
    );
    process.exit(2);
  }

  const surface = flags.surface;
  if (!surface || !['image', 'video', 'audio'].includes(surface)) {
    console.error('--surface must be one of: image | video | audio');
    process.exit(2);
  }
  if (!flags.model) {
    console.error('--model required (see http://<daemon>/api/media/models)');
    process.exit(2);
  }

  const body = {
    surface,
    model: flags.model,
    prompt: flags.prompt,
    output: flags.output,
    aspect: flags.aspect,
    voice: flags.voice,
    audioKind: flags['audio-kind'],
    compositionDir: flags['composition-dir'],
    image: flags.image,
  };
  if (flags.length != null) body.length = Number(flags.length);
  if (flags.duration != null) body.duration = Number(flags.duration);

  const url = `${daemonUrl.replace(/\/$/, '')}/api/projects/${encodeURIComponent(projectId)}/media/generate`;
  let resp;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    surfaceFetchError(err, daemonUrl);
    process.exit(3);
  }
  if (!resp.ok) {
    const text = await resp.text();
    console.error(`daemon ${resp.status}: ${text}`);
    process.exit(4);
  }
  const accepted = await resp.json();
  const { taskId } = accepted;
  if (!taskId) {
    console.error('daemon did not return a taskId');
    process.exit(4);
  }
  console.error(`task ${taskId} queued (${accepted.status || 'queued'})`);
  await pollUntilDoneOrBudget(daemonUrl, taskId, 0);
}

async function runMediaWait(rawArgs) {
  const taskId = rawArgs.find((a) => a && !a.startsWith('--'));
  if (!taskId) {
    console.error('usage: pixelpitch media wait <taskId> [--since <n>] [--daemon-url <url>]');
    process.exit(2);
  }
  const flagsOnly = rawArgs.filter((a) => a !== taskId);
  let flags;
  try {
    flags = parseFlags(flagsOnly, {
      string: new Set(['since', 'daemon-url']),
      boolean: new Set(['help', 'h']),
    });
  } catch (err) {
    console.error(err.message);
    printMediaHelp();
    process.exit(2);
  }
  const daemonUrl =
    flags['daemon-url'] || process.env.PIXELPITCH_DAEMON_URL || 'http://127.0.0.1:17456';
  const since = Number.isFinite(Number(flags.since))
    ? Number(flags.since)
    : 0;
  await pollUntilDoneOrBudget(daemonUrl, taskId, since);
}

async function pollUntilDoneOrBudget(daemonUrl, taskId, sinceStart) {
  const totalBudgetMs = 25_000;
  const perCallTimeoutMs = 4_000;
  const startedAt = Date.now();
  const url = `${daemonUrl.replace(/\/$/, '')}/api/media/tasks/${encodeURIComponent(taskId)}/wait`;

  let since = Number.isFinite(sinceStart) ? sinceStart : 0;
  let lastSnapshot = null;

  while (Date.now() - startedAt < totalBudgetMs) {
    const remaining = totalBudgetMs - (Date.now() - startedAt);
    const callTimeout = Math.max(500, Math.min(perCallTimeoutMs, remaining));
    let resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ since, timeoutMs: callTimeout }),
      });
    } catch (err) {
      surfaceFetchError(err, daemonUrl);
      process.exit(3);
    }
    if (resp.status === 404) {
      console.error(`task ${taskId} not found (expired or never queued)`);
      process.exit(4);
    }
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`daemon ${resp.status}: ${text}`);
      process.exit(4);
    }
    let snap;
    try {
      snap = await resp.json();
    } catch {
      console.error('daemon returned non-JSON for /wait');
      process.exit(4);
    }
    lastSnapshot = snap;
    if (Array.isArray(snap.progress)) {
      for (const line of snap.progress) {
        process.stderr.write(line + '\n');
        process.stdout.write(`# ${line}\n`);
      }
    }
    if (typeof snap.nextSince === 'number') since = snap.nextSince;

    if (snap.status === 'done') {
      const file = snap.file || {};
      const warnings = Array.isArray(file.warnings) ? file.warnings : [];
      for (const w of warnings) {
        if (typeof w === 'string' && w) console.error(`WARN: ${w}`);
      }
      if (file.providerError) {
        const provider = file.providerId || 'provider';
        console.error(
          `WARN: ${provider} call failed — wrote stub fallback (${file.size} bytes) to ${file.name}`,
        );
        console.error(`WARN: reason: ${file.providerError}`);
        console.error(
          'WARN: surface this verbatim to the user. Do NOT claim the stub is the final result.',
        );
      }
      process.stdout.write(JSON.stringify({ file }) + '\n');
      process.exit(file.providerError ? 5 : 0);
    }
    if (snap.status === 'failed') {
      const msg = snap.error?.message || 'task failed';
      console.error(`task failed: ${msg}`);
      process.stdout.write(
        JSON.stringify({ taskId, status: 'failed', error: snap.error || {} }) + '\n',
      );
      process.exit(snap.error?.status || 5);
    }
  }

  const handoff = {
    taskId,
    status: lastSnapshot?.status || 'running',
    nextSince: since,
    elapsed: Math.round((Date.now() - startedAt) / 1000),
  };
  process.stdout.write(JSON.stringify(handoff) + '\n');
  process.stderr.write(
    `task ${taskId} still running after ${handoff.elapsed}s. ` +
      `Run \`pixelpitch media wait ${taskId} --since ${since}\` to continue ` +
      `(exit code 2 = still running).\n`,
  );
  process.exit(2);
}

function surfaceFetchError(err, daemonUrl) {
  const cause = err && typeof err === 'object' ? err.cause : null;
  const code =
    cause && typeof cause === 'object' && typeof cause.code === 'string'
      ? cause.code
      : null;
  const causeMsg =
    cause && typeof cause === 'object' && typeof cause.message === 'string'
      ? cause.message
      : '';
  let detail = err && err.message ? err.message : String(err);
  if (code) detail = `${code}${causeMsg ? ` — ${causeMsg}` : ''}`;
  else if (causeMsg) detail = causeMsg;
  console.error(`failed to reach daemon at ${daemonUrl}: ${detail}`);
  if (code === 'EPERM' || code === 'ENETUNREACH') {
    console.error(
      'hint: outbound connect was denied by a sandbox. If you launched ' +
        'this command from a code agent, check the agent\'s sandbox / ' +
        'network policy. The OD daemon itself is unaffected — it can be ' +
        'reached from a regular shell.',
    );
  }
}

function parseFlags(argv, opts = {}) {
  const stringFlags = opts.string instanceof Set ? opts.string : new Set();
  const booleanFlags = opts.boolean instanceof Set ? opts.boolean : new Set();
  const knownFlags = new Set([...stringFlags, ...booleanFlags]);
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a || !a.startsWith('--')) {
      throw new Error(`unexpected positional argument: ${a}`);
    }
    const eq = a.indexOf('=');
    const key = eq >= 0 ? a.slice(2, eq) : a.slice(2);
    if (knownFlags.size > 0 && !knownFlags.has(key)) {
      throw new Error(
        `unknown flag: --${key}. Run with --help for the list of accepted flags.`,
      );
    }
    if (eq >= 0) {
      out[key] = a.slice(eq + 1);
      continue;
    }
    if (booleanFlags.has(key)) {
      out[key] = true;
      continue;
    }
    if (stringFlags.has(key)) {
      const next = argv[i + 1];
      if (next == null) {
        throw new Error(`flag --${key} requires a value`);
      }
      out[key] = next;
      i++;
      continue;
    }
    const next = argv[i + 1];
    if (next != null && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function printMediaHelp() {
  console.log(`Usage: pixelpitch media generate --surface <image|video|audio> --model <id> [opts]

Required:
  --surface  image | video | audio
  --model    Model id from /api/media/models (e.g. gpt-image-2, seedance-2, suno-v5).
  --project  Project id. Auto-resolved from PIXELPITCH_PROJECT_ID when invoked by the daemon.

Common options:
  --prompt "<text>"         Generation prompt.
  --output <filename>       File to write under the project. Auto-named if omitted.
  --aspect 1:1|16:9|9:16|4:3|3:4
  --length <seconds>        Video length.
  --duration <seconds>      Audio duration.
  --voice <voice-id>        Speech / TTS voice.
  --audio-kind music|speech|sfx
  --composition-dir <path>  hyperframes-html only — project-relative path
                            to the dir containing hyperframes.json /
                            meta.json / index.html. The daemon runs
                            \`npx hyperframes render\` against it.
  --image <path>            Project-relative path to a reference image
                            (image-to-video for Seedance i2v models, or
                            future image-edit endpoints). Daemon reads
                            the file from the project, base64-encodes
                            it, and forwards it to the upstream API.
  --daemon-url http://127.0.0.1:17456

Output: a single line of JSON: {"file": { name, size, kind, mime, ... }}.

Skills should call this and then reference the returned filename in their
artifact / message body. The daemon writes the bytes into the project's
files folder so the FileViewer can preview them immediately.`);
}
