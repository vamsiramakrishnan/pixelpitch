export type ContextItemKind =
  | 'skill'
  | 'design-system'
  | 'directive'
  | 'craft'
  | 'file'
  | 'cli-procedure';

export type ContextAttachmentTier =
  | 'always'
  | 'auto'
  | 'agent-requested'
  | 'manual';

export interface ContextSearchResult {
  kind: ContextItemKind;
  id: string;
  title: string;
  summary: string;
  score: number;
  source?: string;
  tier?: ContextAttachmentTier;
  metadata?: Record<string, unknown>;
}

export interface ContextStackItem extends ContextSearchResult {
  reason: string;
  loaded: boolean;
  tokenEstimate?: number;
}

export interface ContextResolveRequest {
  projectId?: string | null;
  message: string;
  skillId?: string | null;
  skillIds?: string[];
  designSystemId?: string | null;
  designSystemIds?: string[];
  craftIds?: string[];
  directiveIds?: string[];
  attachments?: string[];
}

export interface ContextResolveResponse {
  stack: ContextStackItem[];
  trace: string[];
  baseSkillId: string | null;
  designSystemId: string | null;
  craftIds: string[];
  directiveIds: string[];
  promptPreview?: string;
}

export interface ContextSearchResponse {
  results: ContextSearchResult[];
}
