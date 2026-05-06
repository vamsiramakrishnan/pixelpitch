import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createCommandInvocation } from '@pixelpitch/platform';

export interface CommandResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export interface PptxExportResult {
  audit: {
    ok: boolean;
    output: string;
  };
  report: unknown;
}

export class PptxExportError extends Error {
  code: number | null;
  stderr: string;
  stdout: string;

  constructor(message: string, result: CommandResult) {
    super(message);
    this.name = 'PptxExportError';
    this.code = result.code;
    this.stderr = result.stderr;
    this.stdout = result.stdout;
  }
}

export function buildSlidifyConvertInvocation(inputPath: string, outputPath: string, reportPath: string, env = process.env) {
  const bin = env.SLIDIFY_BIN?.trim() || 'uv';
  const convertArgs = [
    'convert',
    inputPath,
    outputPath,
    '--json',
    '--report-json',
    reportPath,
  ];
  return path.basename(bin).startsWith('uv')
    ? { command: bin, args: ['run', 'slidify', ...convertArgs] }
    : { command: bin, args: convertArgs };
}

export function buildPptxAuditInvocation(pptxPath: string, skillsDir: string, env = process.env) {
  const scriptPath = path.join(skillsDir, 'pptx-html-fidelity-audit', 'scripts', 'verify_layout.py');
  const bin = env.PIXELPITCH_PYTHON_BIN?.trim() || 'uv';
  return path.basename(bin).startsWith('uv')
    ? { command: bin, args: ['run', 'python', scriptPath, pptxPath] }
    : { command: bin, args: [scriptPath, pptxPath] };
}

export async function runPptxExport({
  inputPath,
  outputPath,
  projectRoot,
  reportPath,
  skillsDir,
  timeoutMs = 10 * 60_000,
}: {
  inputPath: string;
  outputPath: string;
  projectRoot: string;
  reportPath: string;
  skillsDir: string;
  timeoutMs?: number;
}): Promise<PptxExportResult> {
  const convertInvocation = buildSlidifyConvertInvocation(inputPath, outputPath, reportPath);
  const convert = await runCommandCapture(convertInvocation.command, convertInvocation.args, {
    cwd: projectRoot,
    timeoutMs,
  });
  if (convert.code !== 0) {
    throw new PptxExportError(`slidify convert failed with code ${convert.code}`, convert);
  }

  const report = await readJsonReport(reportPath, convert.stdout);
  const auditInvocation = buildPptxAuditInvocation(outputPath, skillsDir);
  const audit = await runCommandCapture(auditInvocation.command, auditInvocation.args, {
    cwd: projectRoot,
    timeoutMs,
  });

  return {
    audit: {
      ok: audit.code === 0,
      output: [audit.stdout.trim(), audit.stderr.trim()].filter(Boolean).join('\n'),
    },
    report,
  };
}

async function readJsonReport(reportPath: string, stdout: string): Promise<unknown> {
  const fromFile = await fs.readFile(reportPath, 'utf8').catch(() => '');
  for (const candidate of [fromFile, stdout]) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    try {
      return JSON.parse(trimmed);
    } catch {
      // Slidify may print progress before/after JSON on older builds.
      const open = trimmed.indexOf('{');
      const close = trimmed.lastIndexOf('}');
      if (open !== -1 && close > open) {
        try {
          return JSON.parse(trimmed.slice(open, close + 1));
        } catch {
          // Keep looking.
        }
      }
    }
  }
  return null;
}

async function runCommandCapture(
  command: string,
  args: string[],
  {
    cwd,
    env = process.env,
    timeoutMs,
  }: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs: number;
  },
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const invocation = createCommandInvocation({ command, args, env });
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      windowsVerbatimArguments: invocation.windowsVerbatimArguments,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      child.kill('SIGTERM');
      settled = true;
      resolve({
        code: null,
        signal: 'SIGTERM',
        stdout,
        stderr: `${stderr.trim()}\ncommand timed out after ${Math.round(timeoutMs / 1000)}s`.trim(),
      });
    }, timeoutMs);

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
  });
}
