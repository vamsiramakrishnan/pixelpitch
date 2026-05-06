#!/usr/bin/env bun
/**
 * Master batch runner for design system preview enrichment.
 * Splits 151 systems into batches, runs each sequentially,
 * reports progress, and writes a summary report.
 *
 * Usage:
 *   bun scripts/enrich-batch-runner.ts
 *   bun scripts/enrich-batch-runner.ts --batch-size 10
 *   bun scripts/enrich-batch-runner.ts --start-from 3   # resume from batch 3
 *   bun scripts/enrich-batch-runner.ts --cards type_specimen,color_palette
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const CONTENT_DIR = path.join(import.meta.dir, '..', 'content', 'design-systems');
const REPORT_PATH = path.join(import.meta.dir, '..', '.tmp', 'enrich-report.json');

const args = process.argv.slice(2);
const batchSize = parseInt(
  args.find((a) => a.startsWith('--batch-size='))?.split('=')[1]
  ?? (args.includes('--batch-size') ? args[args.indexOf('--batch-size') + 1] : '10')
) || 10;
const startFrom = parseInt(
  args.find((a) => a.startsWith('--start-from='))?.split('=')[1]
  ?? (args.includes('--start-from') ? args[args.indexOf('--start-from') + 1] : '1')
) || 1;
const cardsArg = args.find((a) => a.startsWith('--cards='))?.split('=')[1]
  ?? (args.includes('--cards') ? args[args.indexOf('--cards') + 1] : null);
const concurrency = args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '3';
const force = args.includes('--force');

interface BatchResult {
  batch: number;
  ids: string[];
  generated: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

interface Report {
  startedAt: string;
  completedAt?: string;
  totalSystems: number;
  batchSize: number;
  batches: BatchResult[];
  summary: {
    totalGenerated: number;
    totalFailed: number;
    totalSkipped: number;
    totalDurationMs: number;
  };
}

async function discoverSystems(): Promise<string[]> {
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
    .map((e) => e.name)
    .sort();
}

function runBatch(ids: string[], cardsFlag: string | null): { generated: number; failed: number; errors: string[] } {
  const idsStr = ids.join(',');
  let cmd = `bun scripts/enrich-design-system-previews.ts --ids ${idsStr} --concurrency ${concurrency}`;
  if (cardsFlag) cmd += ` --cards ${cardsFlag}`;
  if (force) cmd += ' --force';

  try {
    const output = execSync(cmd, {
      cwd: path.join(import.meta.dir, '..'),
      encoding: 'utf-8',
      timeout: 5 * 60 * 1000, // 5 min per batch
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const genMatch = output.match(/(\d+) generated/);
    const failMatch = output.match(/(\d+) failed/);
    const generated = parseInt(genMatch?.[1] ?? '0');
    const failed = parseInt(failMatch?.[1] ?? '0');

    const errors: string[] = [];
    const errorSection = output.split('Errors:\n')[1];
    if (errorSection) {
      errors.push(...errorSection.trim().split('\n').map((l) => l.trim()).filter(Boolean));
    }

    return { generated, failed, errors };
  } catch (e: any) {
    const stderr = e.stderr?.toString() ?? '';
    const stdout = e.stdout?.toString() ?? '';
    return {
      generated: 0,
      failed: ids.length * 5,
      errors: [`Batch crashed: ${stderr || stdout || e.message}`],
    };
  }
}

async function saveReport(report: Report) {
  const dir = path.dirname(REPORT_PATH);
  try { await stat(dir); } catch { await import('node:fs/promises').then((f) => f.mkdir(dir, { recursive: true })); }
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
}

async function main() {
  const allSystems = await discoverSystems();
  const totalBatches = Math.ceil(allSystems.length / batchSize);

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Design System Preview Enrichment — Batch Runner    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Systems:     ${allSystems.length}`);
  console.log(`  Batch size:  ${batchSize}`);
  console.log(`  Batches:     ${totalBatches}`);
  console.log(`  Start from:  batch ${startFrom}`);
  console.log(`  Concurrency: ${concurrency} per batch`);
  console.log(`  Cards:       ${cardsArg ?? 'all 5'}`);
  console.log(`  Force:       ${force}`);
  console.log('');

  const report: Report = {
    startedAt: new Date().toISOString(),
    totalSystems: allSystems.length,
    batchSize,
    batches: [],
    summary: { totalGenerated: 0, totalFailed: 0, totalSkipped: 0, totalDurationMs: 0 },
  };

  for (let i = 0; i < totalBatches; i++) {
    const batchNum = i + 1;
    if (batchNum < startFrom) continue;

    const batchIds = allSystems.slice(i * batchSize, (i + 1) * batchSize);
    const pct = Math.round((batchNum / totalBatches) * 100);

    console.log(`── Batch ${batchNum}/${totalBatches} (${pct}%) ─── ${batchIds.length} systems ──`);
    console.log(`   ${batchIds.join(', ')}`);

    const t0 = Date.now();
    const result = runBatch(batchIds, cardsArg);
    const durationMs = Date.now() - t0;

    const batchResult: BatchResult = {
      batch: batchNum,
      ids: batchIds,
      generated: result.generated,
      failed: result.failed,
      errors: result.errors,
      durationMs,
    };
    report.batches.push(batchResult);
    report.summary.totalGenerated += result.generated;
    report.summary.totalFailed += result.failed;
    report.summary.totalDurationMs += durationMs;

    const status = result.failed === 0 ? '✓' : `✗ ${result.failed} failed`;
    console.log(`   ${status} | ${result.generated} generated | ${(durationMs / 1000).toFixed(1)}s`);

    if (result.errors.length > 0) {
      for (const err of result.errors.slice(0, 3)) {
        console.log(`   ⚠ ${err}`);
      }
    }
    console.log('');

    // Save progress after each batch
    await saveReport(report);

    // Brief pause between batches to avoid rate limits
    if (batchNum < totalBatches) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  report.completedAt = new Date().toISOString();
  report.summary.totalSkipped = (allSystems.length * (cardsArg ? cardsArg.split(',').length : 5))
    - report.summary.totalGenerated - report.summary.totalFailed;
  await saveReport(report);

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  DONE                                               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Generated: ${report.summary.totalGenerated}`);
  console.log(`  Failed:    ${report.summary.totalFailed}`);
  console.log(`  Skipped:   ${report.summary.totalSkipped}`);
  console.log(`  Duration:  ${(report.summary.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(`  Report:    ${REPORT_PATH}`);

  if (report.summary.totalFailed > 0) {
    console.log('');
    console.log('  Failed systems:');
    for (const batch of report.batches) {
      for (const err of batch.errors) {
        console.log(`    ${err}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
