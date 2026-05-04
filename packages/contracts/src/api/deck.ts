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

const PHASE_ORDER: Record<DeckPhase, number> = {
  narrative: 0,
  structure: 1,
  generating: 2,
  ready: 3,
  exporting: 4,
};

const ALLOWED_TRANSITIONS: Record<DeckPhase, DeckPhase[]> = {
  narrative: ['structure', 'generating'],
  structure: ['generating'],
  generating: ['ready'],
  ready: ['exporting', 'generating'],
  exporting: ['ready'],
};

export function validatePhaseTransition(
  plan: DeckPlan,
  nextPhase: DeckPhase,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const allowed = ALLOWED_TRANSITIONS[plan.phase];
  if (!allowed?.includes(nextPhase)) {
    errors.push(`Cannot transition from ${plan.phase} to ${nextPhase}. Allowed: ${allowed?.join(', ') ?? 'none'}`);
  }

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

  return { valid: errors.length === 0, errors };
}

export function validatePlanUpdate(
  current: DeckPlan,
  incoming: Partial<DeckPlan>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (incoming.slides !== undefined && current.slides.length > 0 && incoming.slides.length === 0) {
    errors.push('Cannot drop all slides from a plan that already has slides. Use individual slide status updates instead.');
  }

  if (incoming.phase && incoming.phase !== current.phase) {
    const phaseResult = validatePhaseTransition(current, incoming.phase);
    if (!phaseResult.valid) errors.push(...phaseResult.errors);
  }

  if (incoming.phase === 'narrative' && current.phase !== 'narrative' && current.slides.length > 0) {
    errors.push('Cannot revert to narrative phase when slides already exist. The plan would lose its slide manifest.');
  }

  return { valid: errors.length === 0, errors };
}
