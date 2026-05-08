import type Database from 'better-sqlite3';
import type {
  CritiqueConfig,
  PanelEvent,
  PanelistRole,
} from '@pixelpitch/contracts/critique';
import { panelEventToSse } from '@pixelpitch/contracts/critique';
import type { CritiqueSseBus, OrchestratorResult } from './orchestrator.js';
import {
  computeComposite,
  decideRound,
  type RoleScores,
} from './scoreboard.js';
import {
  insertCritiqueRun,
  updateCritiqueRun,
  type CritiqueRunRow,
} from './persistence.js';
import { writeTranscript } from './transcript.js';

export interface ReviewerDimension {
  name: string;
  score: number;
  note: string;
}

export interface ParallelReviewerResult {
  role: PanelistRole;
  score: number;
  dimensions?: readonly ReviewerDimension[];
  mustFix?: readonly string[];
}

export interface ParallelReviewerContext {
  runId: string;
  projectId: string;
  artifactId: string;
  adapter: string;
  round: number;
  role: PanelistRole;
  prompt: string;
}

export type SpawnParallelReviewer = (
  ctx: ParallelReviewerContext,
) => Promise<ParallelReviewerResult>;

export interface ParallelOrchestratorParams {
  runId: string;
  projectId: string;
  conversationId: string | null;
  artifactId: string;
  artifactDir: string;
  adapter: string;
  cfg: CritiqueConfig;
  db: Database.Database;
  bus: CritiqueSseBus;
  prompt: string;
  spawnReviewer: SpawnParallelReviewer;
}

interface RoleTask {
  role: PanelistRole;
  run: () => Promise<void>;
}

function clampScore(value: number, cfg: CritiqueConfig): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(cfg.scoreScale, value));
}

function emitPanelEvent(
  bus: CritiqueSseBus,
  events: PanelEvent[],
  event: PanelEvent,
): void {
  events.push(event);
  bus.emit(panelEventToSse(event));
}

async function runWithConcurrency(tasks: readonly RoleTask[], limit: number): Promise<void> {
  const concurrency = Math.max(1, Math.floor(limit));
  let next = 0;
  let firstError: unknown;
  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    async () => {
      while (next < tasks.length) {
        const task = tasks[next++];
        if (!task) continue;
        try {
          await task.run();
        } catch (error) {
          firstError ??= error;
        }
      }
    },
  );
  await Promise.all(workers);
  if (firstError !== undefined) {
    throw firstError;
  }
}

export async function runParallelReviewRound(
  params: ParallelOrchestratorParams,
): Promise<OrchestratorResult> {
  const {
    runId,
    projectId,
    conversationId,
    artifactId,
    artifactDir,
    adapter,
    cfg,
    db,
    bus,
    prompt,
    spawnReviewer,
  } = params;

  if (!Number.isFinite(cfg.maxConcurrentRuns) || cfg.maxConcurrentRuns < 1) {
    throw new RangeError(`runParallelReviewRound: cfg.maxConcurrentRuns must be positive, got ${cfg.maxConcurrentRuns}`);
  }

  insertCritiqueRun(db, {
    id: runId,
    projectId,
    conversationId,
    status: 'running',
    protocolVersion: cfg.protocolVersion,
  });

  const events: PanelEvent[] = [];
  const scores: RoleScores = {};
  let mustFix = 0;
  let transcriptPath: string | null = null;
  let finalStatus: CritiqueRunRow['status'] = 'failed';
  let finalComposite: number | null = null;
  const round = 1;

  emitPanelEvent(bus, events, {
    type: 'run_started',
    runId,
    protocolVersion: cfg.protocolVersion,
    cast: cfg.cast,
    maxRounds: cfg.maxRounds,
    threshold: cfg.scoreThreshold,
    scale: cfg.scoreScale,
  });

  const tasks: RoleTask[] = cfg.cast.map((role) => ({
    role,
    run: async () => {
      emitPanelEvent(bus, events, { type: 'panelist_open', runId, round, role });
      const result = await spawnReviewer({
        runId,
        projectId,
        artifactId,
        adapter,
        round,
        role,
        prompt,
      });
      const resultRole = result.role === role ? result.role : role;
      for (const dim of result.dimensions ?? []) {
        emitPanelEvent(bus, events, {
          type: 'panelist_dim',
          runId,
          round,
          role: resultRole,
          dimName: dim.name,
          dimScore: clampScore(dim.score, cfg),
          dimNote: dim.note,
        });
      }
      for (const text of result.mustFix ?? []) {
        mustFix += 1;
        emitPanelEvent(bus, events, {
          type: 'panelist_must_fix',
          runId,
          round,
          role: resultRole,
          text,
        });
      }
      const score = clampScore(result.score, cfg);
      scores[resultRole] = score;
      emitPanelEvent(bus, events, {
        type: 'panelist_close',
        runId,
        round,
        role: resultRole,
        score,
      });
    },
  }));

  try {
    await runWithConcurrency(tasks, cfg.maxConcurrentRuns);
    const composite = computeComposite(scores, cfg.weights);
    const decision = decideRound(composite, mustFix, cfg);
    finalStatus = decision === 'ship' ? 'shipped' : 'below_threshold';
    finalComposite = composite;
    emitPanelEvent(bus, events, {
      type: 'round_end',
      runId,
      round,
      composite,
      mustFix,
      decision,
      reason: decision === 'ship'
        ? 'Parallel reviewers reached threshold with no must-fix items.'
        : 'Parallel reviewers did not reach the ship threshold.',
    });
    emitPanelEvent(bus, events, {
      type: 'ship',
      runId,
      round,
      composite,
      status: finalStatus,
      artifactRef: { projectId, artifactId },
      summary: finalStatus === 'shipped'
        ? 'Parallel review shipped the artifact.'
        : 'Parallel review completed below threshold.',
    });
  } catch {
    finalStatus = 'failed';
    finalComposite = null;
    emitPanelEvent(bus, events, {
      type: 'failed',
      runId,
      cause: 'orchestrator_internal',
    });
  }

  try {
    const transcript = await writeTranscript(artifactDir, events);
    transcriptPath = transcript.path;
  } catch {
    transcriptPath = null;
  }

  const rounds = finalComposite === null
    ? []
    : [{
        n: round,
        composite: finalComposite,
        mustFix,
        decision: decideRound(finalComposite, mustFix, cfg),
      }];

  updateCritiqueRun(db, runId, {
    status: finalStatus,
    score: finalComposite,
    rounds,
    transcriptPath,
    artifactPath: null,
  });

  return {
    status: finalStatus,
    composite: finalComposite,
    rounds,
    transcriptPath,
    artifactPath: null,
  };
}
