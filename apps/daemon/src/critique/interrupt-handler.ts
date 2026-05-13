import type { Request, Response } from 'express';
import type Database from 'better-sqlite3';
import {
  getCritiqueRun,
  markRunInterruptedRecovery,
  type CritiqueRunStatus,
} from './persistence.js';
import type { RunRegistry } from './run-registry.js';

export function handleCritiqueInterrupt(
  db: Database.Database,
  registry: RunRegistry,
): (req: Request, res: Response) => void {
  return function critiqueInterruptHandler(req: Request, res: Response): void {
    const projectId =
      typeof req.params['projectId'] === 'string'
        ? req.params['projectId'].trim()
        : '';
    const runId =
      typeof req.params['runId'] === 'string'
        ? req.params['runId'].trim()
        : '';

    if (!projectId || !runId) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'projectId and runId are required' },
      });
      return;
    }

    const row = getCritiqueRun(db, runId);
    if (!row || row.projectId !== projectId) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'critique run not found' },
      });
      return;
    }

    const liveStatus = row.status as CritiqueRunStatus | 'running';
    if (liveStatus === 'interrupted') {
      res.status(202).json({ runId, accepted: true, prevStatus: 'interrupted' });
      return;
    }

    if (liveStatus !== 'running') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: `run is already in terminal status: ${row.status}`,
          currentStatus: row.status,
        },
      });
      return;
    }

    const aborted = registry.interrupt(projectId, runId, 'user_requested');
    if (!aborted) {
      const recovered = markRunInterruptedRecovery(db, runId, 'no_live_handle');
      res.status(202).json({
        runId,
        accepted: true,
        prevStatus: 'running',
        recovered: true,
        ...(recovered ? {} : { recoveryFailed: true }),
      });
      return;
    }

    res.status(202).json({ runId, accepted: true, prevStatus: 'running' });
  };
}
