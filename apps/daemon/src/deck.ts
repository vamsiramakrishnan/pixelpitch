import { join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { 
  DeckPlan, 
  DeckAssembleResponse, 
  DeckExportRequest, 
  DeckExportResponse,
  FidelityIssue
} from '@pixelpitch/contracts';

const execAsync = promisify(exec);

export class DeckManager {
  constructor(private projectPath: string) {}

  private get planPath() {
    return join(this.projectPath, 'deck', 'deck-plan.json');
  }

  async getPlan(): Promise<DeckPlan> {
    if (!existsSync(this.planPath)) {
      const err = new Error('Deck plan not found');
      (err as any).status = 404;
      throw err;
    }
    const content = await readFile(this.planPath, 'utf-8');
    return JSON.parse(content);
  }

  async updatePlan(plan: DeckPlan): Promise<void> {
    await writeFile(this.planPath, JSON.stringify(plan, null, 2));
  }

  async assemble(): Promise<DeckAssembleResponse> {
    const plan = await this.getPlan();
    
    let slidesHtml = '';
    for (const slide of plan.slides) {
      const fragmentPath = join(this.projectPath, 'deck', slide.file);
      if (!existsSync(fragmentPath)) {
        const err = new Error(`Missing slide fragment: ${slide.file}`);
        (err as any).status = 422;
        throw err;
      }
      const fragment = await readFile(fragmentPath, 'utf-8');
      slidesHtml += `\n<section class="slide" data-slide-id="${slide.id}">\n${fragment}\n</section>\n`;
    }

    const template = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="framework.css">
  <link rel="stylesheet" href="theme.css">
  <script src="framework.js" defer></script>
</head>
<body class="deck-runtime">
  <div class="deck-shell">
    <div class="deck-stage">
      ${slidesHtml}
    </div>
  </div>
</body>
</html>`;

    const outputPath = join(this.projectPath, 'deck', 'deck.html');
    await writeFile(outputPath, template);

    return {
      success: true,
      outputPath: 'deck/deck.html',
      slideCount: plan.slides.length
    };
  }

  async export(request: DeckExportRequest): Promise<DeckExportResponse> {
    await this.assemble();
    const deckHtml = join(this.projectPath, 'deck', 'deck.html');
    const outputPptx = join(this.projectPath, 'deck', 'deck.pptx');

    let stdout: string;
    try {
      // slidify is a Python CLI installed via uv, invoked as: slidify convert deck.html --output deck.pptx --json
      const result = await execAsync(`slidify convert ${deckHtml} --output ${outputPptx} --json`);
      stdout = result.stdout;
    } catch (err) {
      const error = new Error('Slidify export failed. Ensure `slidify` is installed via `uv`.');
      (error as any).status = 500;
      (error as any).details = (err as any).stderr || (err as any).message;
      throw error;
    }
    
    const fidelityReport: FidelityIssue[] = [];
    try {
      const report = JSON.parse(stdout);
      // slidify ConversionResult uses fidelity_reports (not slides)
      // each FidelityReport has: slide_index, failing_units[{decision_kind, reason}]
      const reports = report.fidelity_reports ?? report.slides ?? [];
      if (Array.isArray(reports)) {
        for (const entry of reports) {
          const units = entry.failing_units ?? entry.issues ?? [];
          const slideId = entry.slide_id ?? entry.id ?? `slide-${entry.slide_index ?? entry.index}`;
          const kind = entry.decision_kind ?? entry.strategy;
          if (kind === 'raster' || kind === 'preserve_raster' || units.length > 0) {
            const firstUnit = units[0];
            const issueType =
              kind === 'raster' || kind === 'preserve_raster'
                ? 'rasterized' as const
                : (firstUnit?.type ?? 'layout-drift') as FidelityIssue['issue'];
            fidelityReport.push({
              slideId,
              issue: issueType,
              detail: firstUnit?.reason ?? firstUnit?.message ?? `Slide converted via ${kind}`,
              severity: kind === 'raster' || kind === 'preserve_raster' ? 'warning' : 'info',
            });
          }
        }
      }
    } catch {
      // slidify didn't produce parseable JSON — fidelity report stays empty
    }

    const plan = await this.getPlan();
    plan.slidify = {
      lastExport: new Date().toISOString(),
      fidelityIssues: fidelityReport,
      exportPath: 'deck/deck.pptx'
    };
    await this.updatePlan(plan);

    return {
      success: true,
      pptxPath: 'deck/deck.pptx',
      fidelityReport
    };
  }
}
