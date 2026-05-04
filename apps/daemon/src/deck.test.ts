import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { DeckManager } from './deck';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const TMP_DIR = join(process.cwd(), 'tmp-test-deck');

describe('DeckManager', () => {
  beforeEach(async () => {
    await mkdir(join(TMP_DIR, 'deck', 'slides'), { recursive: true });
    const plan = {
      version: 1,
      phase: 'ready',
      slides: [{ id: '1', file: 'slides/1.html', status: 'ready' }],
      slidify: { lastExport: null, fidelityIssues: [] }
    };
    await writeFile(join(TMP_DIR, 'deck', 'deck-plan.json'), JSON.stringify(plan));
    await writeFile(join(TMP_DIR, 'deck', 'slides', '1.html'), '<h1>Slide 1</h1>');
  });

  afterEach(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  it('getPlan: should throw 404 if plan is missing', async () => {
    const manager = new DeckManager(TMP_DIR);
    await rm(join(TMP_DIR, 'deck', 'deck-plan.json'));
    await expect(manager.getPlan()).rejects.toMatchObject({ status: 404 });
  });

  it('getPlan: should return parsed JSON when file exists', async () => {
    const manager = new DeckManager(TMP_DIR);
    const plan = await manager.getPlan();
    expect(plan.phase).toBe('ready');
    expect(plan.slides[0].file).toBe('slides/1.html');
    expect(plan.slides[0].status).toBe('ready');
  });

  it('updatePlan: should write plan to disk', async () => {
    const manager = new DeckManager(TMP_DIR);
    const plan = await manager.getPlan();
    plan.phase = 'exporting';
    await manager.updatePlan(plan);
    
    const content = await readFile(join(TMP_DIR, 'deck', 'deck-plan.json'), 'utf-8');
    const saved = JSON.parse(content);
    expect(saved.phase).toBe('exporting');
  });

  it('assemble: should stitch slides into deck.html with correct structure', async () => {
    const manager = new DeckManager(TMP_DIR);
    const result = await manager.assemble();
    
    expect(result.success).toBe(true);
    expect(result.slideCount).toBe(1);
    
    const html = await readFile(join(TMP_DIR, 'deck', 'deck.html'), 'utf-8');
    expect(html).toContain('<body class="deck-runtime">');
    expect(html).toContain('<div class="deck-stage">');
    expect(html).toContain('<section class="slide" data-slide-id="1">');
    expect(html).toContain('<h1>Slide 1</h1>');
  });

  it('assemble: should throw 422 if slide fragment is missing', async () => {
    const manager = new DeckManager(TMP_DIR);
    await rm(join(TMP_DIR, 'deck', 'slides', '1.html'));
    await expect(manager.assemble()).rejects.toMatchObject({ status: 422 });
  });

  it('assemble: should handle empty slides array gracefully', async () => {
    const manager = new DeckManager(TMP_DIR);
    const plan = await manager.getPlan();
    plan.slides = [];
    await manager.updatePlan(plan);
    
    const result = await manager.assemble();
    expect(result.success).toBe(true);
    expect(result.slideCount).toBe(0);
    
    const html = await readFile(join(TMP_DIR, 'deck', 'deck.html'), 'utf-8');
    expect(html).toContain('<div class="deck-stage">');
    expect(html).not.toContain('<section class="slide"');
  });
});
