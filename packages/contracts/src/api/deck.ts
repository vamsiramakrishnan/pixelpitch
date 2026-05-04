export const DECK_PLAN_VERSION = 1;

export type DeckPhase = 'narrative' | 'structure' | 'generating' | 'ready' | 'exporting';

export interface DeckComposition {
  frameworkId: string;
  themeId: string;
  format: '16:9' | '3:4' | 'A4';
  runtime: string;
  designSystemId: string | null;
}

export interface DeckInterview {
  history: Array<{
    questionId: string;
    question: string;
    answer: string;
    timestamp: string;
  }>;
  pendingQuestionId?: string;
}

export type DeckBeatType = 'context' | 'problem' | 'solution' | 'evidence' | 'how' | 'plan' | 'ask' | 'custom';
export type DeckEvidenceType = 'stat' | 'chart' | 'diagram' | 'quote' | 'screenshot' | 'table' | 'none';

export interface DeckBeat {
  id: string;
  type: DeckBeatType;
  label: string;
  summary: string;
  evidenceType?: DeckEvidenceType;
  dataPoints?: string[];
}

export type DeckSlideStatus = 'pending' | 'generating' | 'ready' | 'needs-evidence' | 'needs-data' | 'fixed';

export interface DeckSlide {
  id: string;
  beatId: string;
  type: string;
  title: string;
  file: string;
  status: DeckSlideStatus;
  speakerNotes: string;
  qualityIssues?: string[];
}

export interface FidelityIssue {
  slideId: string;
  issue: 'rasterized' | 'overflow' | 'font-missing' | 'layout-drift';
  detail: string;
  severity: 'info' | 'warning' | 'error';
}

export interface DeckExportState {
  lastExport: string | null;
  fidelityIssues: FidelityIssue[];
  exportPath?: string;
}

export interface DeckPlan {
  version: typeof DECK_PLAN_VERSION;
  phase: DeckPhase;
  title: string;
  audience: string;
  tone: string;
  keyMessage: string;
  composition: DeckComposition;
  interview: DeckInterview;
  narrative: { beats: DeckBeat[] };
  slides: DeckSlide[];
  slidify: DeckExportState;
}

export interface DeckAssembleResponse {
  success: boolean;
  outputPath: string;
  slideCount: number;
}

export interface DeckExportRequest {
  target: 'pptx' | 'pdf';
  includeFidelityReport: boolean;
}

export interface DeckExportResponse {
  success: boolean;
  pptxPath: string;
  fidelityReport: FidelityIssue[];
}

export interface DeckPlanUpdateRequest {
  phase?: DeckPhase;
  title?: string;
  audience?: string;
  tone?: string;
  keyMessage?: string;
  composition?: Partial<DeckComposition>;
  interview?: Partial<DeckInterview>;
  narrative?: { beats?: DeckBeat[] };
  slides?: DeckSlide[];
}

export interface ChatMessageScope {
  type: 'slide';
  id: string;
}

export function validatePhaseTransition(
  plan: DeckPlan,
  nextPhase: DeckPhase,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (nextPhase === 'structure') {
    if (!plan.title) errors.push('Title is required');
    if (!plan.audience) errors.push('Audience is required');
    if (!plan.keyMessage) errors.push('Key message is required');
  }

  if (nextPhase === 'generating') {
    if (plan.narrative.beats.length === 0) errors.push('At least one narrative beat is required');
    const hasAction = plan.narrative.beats.some((b) => b.type === 'ask' || b.type === 'plan');
    if (!hasAction) errors.push('Narrative must contain an "ask" or "plan" beat');
  }

  if (nextPhase === 'ready') {
    const incomplete = plan.slides.filter((s) => s.status !== 'ready' && s.status !== 'fixed');
    if (incomplete.length > 0) {
      errors.push(`Incomplete slides: ${incomplete.map((s) => s.id).join(', ')}`);
    }
  }

  if (plan.phase === 'narrative' && nextPhase === 'ready') {
    errors.push('Cannot jump from narrative to ready');
  }

  return { valid: errors.length === 0, errors };
}
