import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';

import type { OrbitConfigPrefs } from './app-config.js';

interface OrbitRunSummary {
  id?: string;
  startedAt?: string;
  completedAt: string;
  trigger?: 'manual' | 'scheduled';
  templateSkillId?: string | null;
  connectorsChecked: number;
  connectorsSucceeded: number;
  connectorsFailed: number;
  connectorsSkipped: number;
  artifactId?: string | null;
  artifactProjectId?: string | null;
  agentRunId?: string | null;
  markdown: string;
}

interface OrbitStatusResponse {
  running?: boolean;
  nextRunAt?: string | null;
  lastRun?: OrbitRunSummary | null;
  lastRunsByTemplate?: Record<string, OrbitRunSummary>;
}

export interface OrbitConnectorRunResult {
  connectorId: string;
  connectorName: string;
  accountLabel?: string;
  toolName?: string;
  toolTitle?: string;
  status: 'succeeded' | 'skipped' | 'failed';
  summary: string;
  error?: string;
}

export interface OrbitActivitySummary extends OrbitRunSummary {
  id: string;
  startedAt: string;
  completedAt: string;
  trigger: 'manual' | 'scheduled';
  results: OrbitConnectorRunResult[];
}

export interface OrbitAgentRunResult {
  agentRunId: string;
  status: 'succeeded' | 'failed' | 'canceled';
  artifactId?: string;
  artifactProjectId?: string;
  summary?: string;
}

export interface OrbitRunHandlerStart {
  projectId: string;
  agentRunId: string;
  completion: Promise<OrbitAgentRunResult>;
}

export interface OrbitTemplateSelection {
  id: string;
  name: string;
  examplePrompt: string;
  dir: string;
  body: string;
  designSystemRequired: boolean;
}

export type OrbitRunHandler = (request: {
  runId: string;
  trigger: 'manual' | 'scheduled';
  startedAt: string;
  prompt: string;
  systemPrompt: string;
  template: OrbitTemplateSelection | null;
}) => Promise<OrbitRunHandlerStart>;

export type OrbitTemplateResolver = (skillId: string) => Promise<OrbitTemplateSelection | null>;

export interface OrbitStatus extends OrbitStatusResponse {
  config: OrbitConfigPrefs;
  running: boolean;
  nextRunAt: string | null;
  lastRun: OrbitActivitySummary | null;
  lastRunsByTemplate: Record<string, OrbitActivitySummary>;
}

export const DEFAULT_ORBIT_CONFIG: OrbitConfigPrefs = {
  enabled: false,
  time: '08:00',
  templateSkillId: 'orbit-general',
};

const SUMMARY_FILE = 'activity-summary.json';

export function formatLocalProjectTimestamp(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function formatLocalOrbitPromptTimestamp(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const timeZoneName = new Intl.DateTimeFormat(undefined, { timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}${timeZoneName ? ` (${timeZoneName})` : ''}`;
}

function isValidOrbitTime(time: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return false;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function normalizeOrbitConfig(config: Partial<OrbitConfigPrefs> | undefined): OrbitConfigPrefs {
  const time = typeof config?.time === 'string' && isValidOrbitTime(config.time)
    ? config.time
    : DEFAULT_ORBIT_CONFIG.time ?? '08:00';
  const hasTemplateSkillId = config !== undefined && 'templateSkillId' in config;
  return {
    enabled: Boolean(config?.enabled),
    time,
    templateSkillId: !hasTemplateSkillId
      ? DEFAULT_ORBIT_CONFIG.templateSkillId ?? null
      : typeof config?.templateSkillId === 'string' && config.templateSkillId.trim()
        ? config.templateSkillId.trim()
        : null,
  };
}

function orbitDir(dataDir: string): string {
  return path.join(dataDir, 'orbit');
}

function summaryFile(dataDir: string): string {
  return path.join(orbitDir(dataDir), SUMMARY_FILE);
}

function isOrbitRunSummary(value: unknown): value is OrbitActivitySummary {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Partial<OrbitActivitySummary>;
  return (
    typeof obj.completedAt === 'string' &&
    typeof obj.connectorsChecked === 'number' &&
    typeof obj.connectorsSucceeded === 'number' &&
    typeof obj.connectorsFailed === 'number' &&
    typeof obj.connectorsSkipped === 'number' &&
    typeof obj.markdown === 'string'
  );
}

function normalizeSummaryStore(raw: unknown): {
  lastRun: OrbitActivitySummary | null;
  lastRunsByTemplate: Record<string, OrbitActivitySummary>;
} {
  if (isOrbitRunSummary(raw)) {
    const templateSkillId = typeof raw.templateSkillId === 'string' && raw.templateSkillId.trim()
      ? raw.templateSkillId.trim()
      : null;
    return {
      lastRun: raw,
      lastRunsByTemplate: templateSkillId ? { [templateSkillId]: { ...raw, templateSkillId } } : {},
    };
  }
  if (!raw || typeof raw !== 'object') return { lastRun: null, lastRunsByTemplate: {} };
  const obj = raw as { lastRun?: unknown; lastRunsByTemplate?: Record<string, unknown> };
  const lastRun = isOrbitRunSummary(obj.lastRun) ? obj.lastRun : null;
  const lastRunsByTemplate: Record<string, OrbitActivitySummary> = {};
  for (const [templateSkillId, summary] of Object.entries(obj.lastRunsByTemplate ?? {})) {
    if (templateSkillId && isOrbitRunSummary(summary)) {
      lastRunsByTemplate[templateSkillId] = { ...summary, templateSkillId };
    }
  }
  return { lastRun, lastRunsByTemplate };
}

async function readSummaryStore(dataDir: string): Promise<{
  lastRun: OrbitActivitySummary | null;
  lastRunsByTemplate: Record<string, OrbitActivitySummary>;
}> {
  try {
    const raw = await readFile(summaryFile(dataDir), 'utf8');
    return normalizeSummaryStore(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return { lastRun: null, lastRunsByTemplate: {} };
    }
    if (error instanceof SyntaxError) return { lastRun: null, lastRunsByTemplate: {} };
    throw error;
  }
}

async function writeLastSummary(dataDir: string, summary: OrbitActivitySummary): Promise<void> {
  const store = await readSummaryStore(dataDir);
  await mkdir(orbitDir(dataDir), { recursive: true });
  const target = summaryFile(dataDir);
  const tmp = `${target}.${randomBytes(4).toString('hex')}.tmp`;
  const templateSkillId = typeof summary.templateSkillId === 'string' && summary.templateSkillId.trim()
    ? summary.templateSkillId.trim()
    : null;
  const nextStore = {
    lastRun: summary,
    lastRunsByTemplate: templateSkillId
      ? { ...store.lastRunsByTemplate, [templateSkillId]: { ...summary, templateSkillId } }
      : store.lastRunsByTemplate,
  };
  await writeFile(tmp, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf8');
  await rename(tmp, target);
}

function nextDailyRunAt(time: string, now = new Date()): Date {
  const [hoursRaw, minutesRaw] = time.split(':');
  const next = new Date(now);
  next.setHours(Number(hoursRaw) || 8, Number(minutesRaw) || 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

function renderMarkdown(summary: Omit<OrbitActivitySummary, 'markdown'>): string {
  const lines = [
    '# Daily Orbit Activity Summary',
    '',
    `Generated: ${summary.completedAt}`,
    `Trigger: ${summary.trigger}`,
    '',
    `Checked ${summary.connectorsChecked} connector(s): ${summary.connectorsSucceeded} succeeded, ${summary.connectorsSkipped} skipped, ${summary.connectorsFailed} failed.`,
    '',
  ];
  for (const result of summary.results) {
    const title = result.accountLabel ? `${result.connectorName} (${result.accountLabel})` : result.connectorName;
    lines.push(`## ${title}`);
    lines.push(`- Status: ${result.status}`);
    lines.push(`- Summary: ${result.summary}`);
    if (result.error) lines.push(`- Error: ${result.error}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

export function buildOrbitPrompt(now = new Date(), template?: OrbitTemplateSelection | null): string {
  const end = formatLocalOrbitPromptTimestamp(now);
  const start = formatLocalOrbitPromptTimestamp(new Date(now.getTime() - 24 * 60 * 60_000));
  const lines = [
    'Create today\'s Orbit daily digest as a Live Artifact.',
    '',
    `Use my connected work data from ${start} through ${end}.`,
  ];
  if (template) lines.push('', `Use the selected Orbit template: ${template.name}.`);
  return lines.join('\n');
}

export function buildOrbitSystemPrompt(now = new Date(), template?: OrbitTemplateSelection | null): string {
  const end = now.toISOString();
  const start = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  const lines = [
    'Create a Live Artifact: a polished daily digest that helps a normal person understand what changed in their connected work data during the past 24 hours and what they should do next.',
    '',
    `Time window: ${start} through ${end}.`,
    '',
    'Work autonomously. Do not ask follow-up questions, do not emit a question form, and do not wait for user input. Use sensible defaults and proceed.',
    'DAILY DIGEST CONNECTOR CURATION IS REQUIRED WHEN SUPPORTED: first run `tools connectors list --use-case personal_daily_digest --format compact` with a 120s timeout, and if that curated list command is unsupported, rejected, times out, or returns no usable tools, fall back to the unfiltered read-only list via `tools connectors list --format compact`.',
    'Use the live-artifact skill to author and register exactly one compact daily digest artifact. Do not invent activity. Do not expose raw errors, credentials, internal tool names, schemas, or system mechanics in the user-facing artifact.',
  ];
  if (template) {
    const folder = path.basename(template.dir);
    lines.push(
      '',
      'Selected example template:',
      `- Skill id: ${template.id}`,
      `- Skill name: ${template.name}`,
      `- Staged root: .pixelpitch-skills/${folder}/`,
      '',
      `Before writing the artifact, read ".pixelpitch-skills/${folder}/SKILL.md" and, if present, ".pixelpitch-skills/${folder}/example.html". Follow that staged template's structure, layout, tokens, domain rules, and visual language as the source of truth.`,
      '',
      'Selected template example prompt:',
      '',
      template.examplePrompt.trim(),
    );
  }
  return lines.join('\n');
}

export function renderOrbitTemplateSystemPrompt(template: OrbitTemplateSelection | null): string {
  if (!template) return '';
  return [
    `## Selected Orbit template skill — ${template.name}`,
    '',
    'This Orbit run was explicitly steered with the selected template skill below. Treat it as authoritative for the artifact structure, visual language, tokens, layout, and domain-specific synthesis rules.',
    template.designSystemRequired
      ? 'If an active design system is also present, follow the selected template first for structure and interaction.'
      : 'This selected template opts out of external design-system injection. Do not apply the workspace design system or brand tokens.',
    '',
    template.body.trim(),
  ].join('\n');
}

export class OrbitService {
  private config: OrbitConfigPrefs = DEFAULT_ORBIT_CONFIG;
  private timer: NodeJS.Timeout | null = null;
  private nextRunAtValue: Date | null = null;
  private starting: Promise<{ projectId: string; agentRunId: string }> | null = null;
  private inflight: Promise<OrbitActivitySummary> | null = null;
  private inflightProjectId: string | null = null;
  private inflightAgentRunId: string | null = null;
  private runHandler: OrbitRunHandler | null = null;
  private templateResolver: OrbitTemplateResolver | null = null;

  constructor(private readonly dataDir: string) {}

  setRunHandler(handler: OrbitRunHandler): void {
    this.runHandler = handler;
  }

  setTemplateResolver(resolver: OrbitTemplateResolver): void {
    this.templateResolver = resolver;
  }

  configure(config: Partial<OrbitConfigPrefs> | undefined): void {
    this.config = normalizeOrbitConfig(config);
    this.reschedule();
  }

  async status(): Promise<OrbitStatus> {
    const summaryStore = await readSummaryStore(this.dataDir);
    return {
      config: this.config,
      running: this.starting !== null || this.inflight !== null,
      nextRunAt: this.nextRunAtValue?.toISOString() ?? null,
      lastRun: summaryStore.lastRun,
      lastRunsByTemplate: summaryStore.lastRunsByTemplate,
    };
  }

  async start(trigger: 'manual' | 'scheduled'): Promise<{ projectId: string; agentRunId: string }> {
    if (this.inflight && this.inflightProjectId && this.inflightAgentRunId) {
      return { projectId: this.inflightProjectId, agentRunId: this.inflightAgentRunId };
    }
    if (this.starting) return this.starting;
    if (!this.runHandler) throw new Error('Orbit agent runner is not configured');
    this.starting = this.startRun(trigger).finally(() => {
      this.starting = null;
    });
    return this.starting;
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.nextRunAtValue = null;
  }

  private async startRun(trigger: 'manual' | 'scheduled'): Promise<{ projectId: string; agentRunId: string }> {
    if (!this.runHandler) throw new Error('Orbit agent runner is not configured');
    const startedAt = new Date().toISOString();
    const runId = `orbit-${randomUUID()}`;
    const configuredTemplateSkillId = this.config.templateSkillId ?? null;
    const template = configuredTemplateSkillId && this.templateResolver
      ? await this.templateResolver(configuredTemplateSkillId).catch(() => null)
      : null;
    const now = new Date(startedAt);
    const handlerStart = await this.runHandler({
      runId,
      trigger,
      startedAt,
      prompt: buildOrbitPrompt(now, template),
      systemPrompt: buildOrbitSystemPrompt(now, template),
      template,
    });

    this.inflightProjectId = handlerStart.projectId;
    this.inflightAgentRunId = handlerStart.agentRunId;
    this.inflight = (async () => {
      try {
        const agentResult = await handlerStart.completion;
        const completedAt = new Date().toISOString();
        const connectorsSucceeded = agentResult.status === 'succeeded' ? 1 : 0;
        const connectorsFailed = agentResult.status === 'failed' ? 1 : 0;
        const connectorsSkipped = agentResult.status === 'canceled' ? 1 : 0;
        const base = {
          id: runId,
          startedAt,
          completedAt,
          trigger,
          templateSkillId: template?.id ?? configuredTemplateSkillId,
          connectorsChecked: connectorsSucceeded + connectorsFailed + connectorsSkipped,
          connectorsSucceeded,
          connectorsFailed,
          connectorsSkipped,
          agentRunId: agentResult.agentRunId,
          ...(agentResult.artifactId ? { artifactId: agentResult.artifactId } : {}),
          ...(agentResult.artifactProjectId ? { artifactProjectId: agentResult.artifactProjectId } : {}),
          results: [{
            connectorId: 'agent-runtime',
            connectorName: 'Orbit Agent',
            status: agentResult.status === 'succeeded' ? 'succeeded' : agentResult.status === 'failed' ? 'failed' : 'skipped',
            summary: agentResult.summary ?? `Agent run ${agentResult.status}.`,
          } satisfies OrbitConnectorRunResult],
        };
        const summary: OrbitActivitySummary = { ...base, markdown: renderMarkdown(base) };
        await writeLastSummary(this.dataDir, summary);
        return summary;
      } finally {
        this.inflight = null;
        this.inflightProjectId = null;
        this.inflightAgentRunId = null;
        this.reschedule();
      }
    })();
    this.inflight.catch((error) => console.warn('[orbit] Run failed:', error));

    return { projectId: handlerStart.projectId, agentRunId: handlerStart.agentRunId };
  }

  private reschedule(): void {
    this.stop();
    if (!this.config.enabled) return;
    const next = nextDailyRunAt(this.config.time ?? DEFAULT_ORBIT_CONFIG.time!);
    this.nextRunAtValue = next;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.nextRunAtValue = null;
      void this.start('scheduled').catch((error) => {
        console.warn('[orbit] Scheduled run failed:', error);
        if (!this.inflight) this.reschedule();
      });
    }, Math.max(0, next.getTime() - Date.now()));
    this.timer.unref?.();
  }
}
