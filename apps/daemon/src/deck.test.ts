import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { DeckManager } from './deck';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TMP_DIR = join(process.cwd(), 'tmp-test-deck');

describe('DeckManager', () => {
  beforeEach(async () => {
    await mkdir(join(TMP_DIR, 'deck', 'slides'), { recursive: true });
    await writeFile(join(TMP_DIR, 'deck', 'deck-plan.json'), JSON.stringify({
      version: 1,
      phase: 'ready',
      slides: [{ id: '1', file: 'slides/1.html' }],
      slidify: { lastExport: null, fidelityIssues: [] }
    }));
    await writeFile(join(TMP_DIR, 'deck', 'slides', '1.html'), '<h1>Slide 1</h1>');
  });

  afterEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it('assemble: should stitch slides into deck.html', async () => {
    const manager = new DeckManager(TMP_DIR);
    const result = await manager.assemble();
    expect(result.success).toBe(true);
    expect(result.slideCount).toBe(1);
    expect(existsSync(join(TMP_DIR, 'deck', 'deck.html'))).toBe(true);
  });

  it('assemble: should throw 422 if slide fragment is missing', async () => {
    const manager = new DeckManager(TMP_DIR);
    await rm(join(TMP_DIR, 'deck', 'slides', '1.html'));
    await expect(manager.assemble()).rejects.toMatchObject({ status: 422 });
  });

  it('getPlan: should throw 404 if plan is missing', async () => {
    const manager = new DeckManager(TMP_DIR);
    await rm(join(TMP_DIR, 'deck', 'deck-plan.json'));
    await expect(manager.getPlan()).rejects.toMatchObject({ status: 404 });
  });

  it('updatePlan: should write plan to disk', async () => {
    const manager = new DeckManager(TMP_DIR);
    const plan = await manager.getPlan();
    plan.title = 'Updated Title';
    await manager.updatePlan(plan);
    const updated = await manager.getPlan();
    expect(updated.title).toBe('Updated Title');
  });
});
