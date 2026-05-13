import type {
  AgentInfo,
  ApplyElementEditsRequest,
  ApplyElementEditsResponse,
  AppVersionInfo,
  AppVersionResponse,
  AppConfig,
  ChatAttachment,
  CodexPetSummary,
  CodexPetsResponse,
  ContextResolveRequest,
  ContextResolveResponse,
  ContextSearchResponse,
  SyncCommunityPetsRequest,
  SyncCommunityPetsResponse,
  PreviewComment,
  PreviewCommentStatus,
  PreviewCommentUpsertRequest,
  DeployConfigResponse,
  DeployProjectFileResponse,
  DesignSystemDetail,
  DesignSystemSummary,
  LiveArtifact,
  LiveArtifactRefreshLogEntry,
  LiveArtifactSummary,
  ProjectDeploymentsResponse,
  PromptTemplateDetail,
  PromptTemplateSummary,
  ProjectFile,
  SkillDetail,
  SkillSummary,
  UpdateDeployConfigRequest,
} from '../types';
import type { ArtifactManifest } from '../artifacts/types';

export async function fetchAgents(): Promise<AgentInfo[]> {
  try {
    const resp = await fetch('/api/agents');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { agents: AgentInfo[] };
    return json.agents ?? [];
  } catch {
    return [];
  }
}

export interface ExecutionTestResult {
  ok: boolean;
  mode: 'daemon' | 'api';
  message: string;
  status?: number;
  details?: string;
}

export async function testExecutionConfig(
  config: Pick<AppConfig, 'mode' | 'agentId' | 'apiProtocol' | 'apiKey' | 'baseUrl' | 'model'>,
): Promise<ExecutionTestResult> {
  const resp = await fetch('/api/execution/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!resp.ok) {
    const payload = (await resp.json().catch(() => null)) as
      | { error?: { message?: string } | string; message?: string }
      | null;
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : payload?.error?.message || payload?.message || `Connection test failed (${resp.status})`;
    throw new Error(message);
  }
  return (await resp.json()) as ExecutionTestResult;
}

export async function fetchSkills(): Promise<SkillSummary[]> {
  try {
    const resp = await fetch('/api/skills');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { skills: SkillSummary[] };
    return json.skills ?? [];
  } catch {
    return [];
  }
}

// Pets packaged by the Codex `hatch-pet` skill — surfaced so the web
// pet settings can offer one-click adoption right after the agent run
// finishes. Returns an empty list (not an error) when the registry
// folder is missing so the "Recently hatched" UI can simply render an
// empty state.
export async function fetchCodexPets(): Promise<CodexPetsResponse> {
  try {
    const resp = await fetch('/api/codex-pets');
    if (!resp.ok) return { pets: [], rootDir: '' };
    return (await resp.json()) as CodexPetsResponse;
  } catch {
    return { pets: [], rootDir: '' };
  }
}

// One-click trigger for the daemon-side port of `sync-community-pets`.
// Always resolves with a summary (even when the daemon errored) so the
// caller can render a status line without having to wrap in try/catch
// on every keystroke.
export async function syncCommunityPets(
  input?: SyncCommunityPetsRequest,
): Promise<SyncCommunityPetsResponse & { error?: string }> {
  try {
    const resp = await fetch('/api/codex-pets/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input ?? {}),
    });
    if (!resp.ok) {
      const payload = (await resp.json().catch(() => null)) as
        | { error?: string }
        | null;
      return {
        wrote: 0,
        skipped: 0,
        failed: 0,
        total: 0,
        rootDir: '',
        errors: [],
        error: payload?.error ?? `Sync failed (${resp.status})`,
      };
    }
    return (await resp.json()) as SyncCommunityPetsResponse;
  } catch (err) {
    return {
      wrote: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      rootDir: '',
      errors: [],
      error: err instanceof Error ? err.message : 'Sync request failed',
    };
  }
}

export function codexPetSpritesheetUrl(pet: CodexPetSummary): string {
  // The daemon stamps an absolute path-prefix in `spritesheetUrl`; if
  // that prefix is empty (default), it is already a same-origin path
  // we can hand to <img src> or fetch() as-is.
  return pet.spritesheetUrl;
}

export async function fetchSkill(id: string): Promise<SkillDetail | null> {
  try {
    const resp = await fetch(`/api/skills/${encodeURIComponent(id)}`);
    if (!resp.ok) return null;
    return (await resp.json()) as SkillDetail;
  } catch {
    return null;
  }
}

export async function searchContext(query: string, limit = 12): Promise<ContextSearchResponse> {
  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const resp = await fetch(`/api/context/search?${params}`);
    if (!resp.ok) return { results: [] };
    return (await resp.json()) as ContextSearchResponse;
  } catch {
    return { results: [] };
  }
}

export async function resolveContext(input: ContextResolveRequest & { includePrompt?: boolean }): Promise<ContextResolveResponse | null> {
  try {
    const resp = await fetch('/api/context/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ContextResolveResponse;
  } catch {
    return null;
  }
}

export async function fetchDesignSystems(): Promise<DesignSystemSummary[]> {
  try {
    const resp = await fetch('/api/design-systems');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { designSystems: DesignSystemSummary[] };
    return json.designSystems ?? [];
  } catch {
    return [];
  }
}

export async function fetchDesignSystem(id: string): Promise<DesignSystemDetail | null> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}`);
    if (!resp.ok) return null;
    return (await resp.json()) as DesignSystemDetail;
  } catch {
    return null;
  }
}

export async function fetchPromptTemplates(): Promise<PromptTemplateSummary[]> {
  try {
    const resp = await fetch('/api/prompt-templates');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { promptTemplates: PromptTemplateSummary[] };
    return json.promptTemplates ?? [];
  } catch {
    return [];
  }
}

export async function fetchPromptTemplate(
  surface: 'image' | 'video',
  id: string,
): Promise<PromptTemplateDetail | null> {
  try {
    const resp = await fetch(
      `/api/prompt-templates/${encodeURIComponent(surface)}/${encodeURIComponent(id)}`,
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { promptTemplate: PromptTemplateDetail };
    return json.promptTemplate ?? null;
  } catch {
    return null;
  }
}

export async function daemonIsLive(): Promise<boolean> {
  try {
    const resp = await fetch('/api/health');
    return resp.ok;
  } catch {
    return false;
  }
}

function isAppVersionInfo(value: unknown): value is AppVersionInfo {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppVersionInfo>;
  return (
    typeof candidate.version === 'string' &&
    typeof candidate.channel === 'string' &&
    typeof candidate.packaged === 'boolean' &&
    typeof candidate.platform === 'string' &&
    typeof candidate.arch === 'string'
  );
}

export async function fetchAppVersionInfo(): Promise<AppVersionInfo | null> {
  try {
    const resp = await fetch('/api/version');
    if (!resp.ok) return null;
    const json = (await resp.json()) as Partial<AppVersionResponse>;
    return isAppVersionInfo(json.version) ? json.version : null;
  } catch {
    return null;
  }
}

export async function fetchSkillExample(id: string): Promise<string | null> {
  try {
    const resp = await fetch(`/api/skills/${encodeURIComponent(id)}/example`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

export async function fetchDeployConfig(): Promise<DeployConfigResponse | null> {
  try {
    const resp = await fetch('/api/deploy/config');
    if (!resp.ok) return null;
    return (await resp.json()) as DeployConfigResponse;
  } catch {
    return null;
  }
}

export async function updateDeployConfig(
  input: UpdateDeployConfigRequest,
): Promise<DeployConfigResponse | null> {
  try {
    const resp = await fetch('/api/deploy/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as DeployConfigResponse;
  } catch {
    return null;
  }
}

export async function fetchProjectDeployments(
  projectId: string,
): Promise<ProjectDeploymentsResponse['deployments']> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/deployments`);
    if (!resp.ok) return [];
    const json = (await resp.json()) as ProjectDeploymentsResponse;
    return json.deployments ?? [];
  } catch {
    return [];
  }
}

export async function deployProjectFile(
  projectId: string,
  fileName: string,
): Promise<DeployProjectFileResponse> {
  const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, providerId: 'cloud-run' }),
  });
  if (!resp.ok) {
    const payload = (await resp.json().catch(() => null)) as
      | { error?: { message?: string }; message?: string }
      | null;
    throw new Error(payload?.error?.message || payload?.message || `Deploy failed (${resp.status})`);
  }
  return (await resp.json()) as DeployProjectFileResponse;
}

export interface ExportProjectPptxResponse {
  file: ProjectFile;
  audit?: {
    ok: boolean;
    output: string;
  };
  report?: unknown;
}

export async function exportProjectFileAsPptx(
  projectId: string,
  fileName: string,
): Promise<ExportProjectPptxResponse> {
  const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/export/pptx`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName }),
  });
  if (!resp.ok) {
    const payload = (await resp.json().catch(() => null)) as
      | { error?: { message?: string; details?: { stderr?: string } }; message?: string }
      | null;
    const stderr = payload?.error?.details?.stderr?.trim();
    const message = payload?.error?.message || payload?.message || `PPTX export failed (${resp.status})`;
    throw new Error(stderr ? `${message}\n${stderr}` : message);
  }
  return (await resp.json()) as ExportProjectPptxResponse;
}

function filenameFromDisposition(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1] || '') || fallback;
    } catch {
      return fallback;
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(value);
  return quoted?.[1] || fallback;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function exportConversationTranscript(
  projectId: string,
  conversationId: string,
  format: 'markdown' | 'json' = 'markdown',
): Promise<void> {
  const resp = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}/transcript?format=${encodeURIComponent(format)}`,
  );
  if (!resp.ok) {
    const payload = (await resp.json().catch(() => null)) as
      | { error?: { message?: string } | string; message?: string }
      | null;
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : payload?.error?.message || payload?.message || `Transcript export failed (${resp.status})`;
    throw new Error(message);
  }
  const blob = await resp.blob();
  const filename = filenameFromDisposition(
    resp.headers.get('Content-Disposition'),
    format === 'json' ? 'conversation-transcript.json' : 'conversation-transcript.md',
  );
  triggerBlobDownload(blob, filename);
}

export async function applyElementEdits(
  projectId: string,
  request: ApplyElementEditsRequest,
): Promise<ApplyElementEditsResponse> {
  const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/edit-ops/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!resp.ok) {
    const payload = (await resp.json().catch(() => null)) as
      | { error?: { message?: string }; message?: string }
      | null;
    throw new Error(payload?.error?.message || payload?.message || `Edit operation failed (${resp.status})`);
  }
  return (await resp.json()) as ApplyElementEditsResponse;
}

export async function checkDeploymentLink(
  projectId: string,
  deploymentId: string,
): Promise<DeployProjectFileResponse> {
  const resp = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/check-link`,
    { method: 'POST' },
  );
  if (!resp.ok) {
    const payload = (await resp.json().catch(() => null)) as
      | { error?: { message?: string }; message?: string }
      | null;
    throw new Error(payload?.error?.message || payload?.message || `Link check failed (${resp.status})`);
  }
  return (await resp.json()) as DeployProjectFileResponse;
}

// Project files — all paths are scoped under .pixelpitch/projects/<id>/ on disk.

export async function fetchProjectFiles(projectId: string): Promise<ProjectFile[]> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`);
    if (!resp.ok) return [];
    const json = (await resp.json()) as { files: ProjectFile[] };
    return json.files ?? [];
  } catch {
    return [];
  }
}

export function projectFileUrl(projectId: string, name: string): string {
  return projectRawUrl(projectId, name);
}

export interface ProjectFilePreviewSection {
  title: string;
  lines: string[];
}

export interface ProjectFilePreview {
  kind: 'pdf' | 'document' | 'presentation' | 'spreadsheet';
  title: string;
  sections: ProjectFilePreviewSection[];
}

export async function fetchProjectFilePreview(
  projectId: string,
  name: string,
): Promise<ProjectFilePreview | null> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/files/${encodeURIComponent(name)}/preview`,
    );
    if (!resp.ok) return null;
    return (await resp.json()) as ProjectFilePreview;
  } catch {
    return null;
  }
}

export async function fetchProjectFileText(
  projectId: string,
  name: string,
  options?: { cache?: RequestCache; cacheBustKey?: string | number },
): Promise<string | null> {
  const url = projectFileUrl(projectId, name);
  const cacheBustKey = options?.cacheBustKey;
  const requestUrl =
    cacheBustKey == null
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}cacheBust=${encodeURIComponent(String(cacheBustKey))}`;
  const init: RequestInit = {};
  if (options?.cache) init.cache = options.cache;

  try {
    const resp = await fetch(requestUrl, init);
    if (!resp.ok) {
      console.warn('[fetchProjectFileText] failed:', {
        name,
        projectId,
        status: resp.status,
        statusText: resp.statusText,
        url: requestUrl,
      });
      return null;
    }
    return await resp.text();
  } catch (err) {
    console.warn('[fetchProjectFileText] failed:', {
      error: err,
      name,
      projectId,
      url: requestUrl,
    });
    return null;
  }
}

export async function fetchPreviewComments(
  projectId: string,
  conversationId: string,
): Promise<PreviewComment[]> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}/comments`,
    );
    if (!resp.ok) return [];
    const json = (await resp.json()) as { comments: PreviewComment[] };
    return json.comments ?? [];
  } catch {
    return [];
  }
}

export async function upsertPreviewComment(
  projectId: string,
  conversationId: string,
  input: PreviewCommentUpsertRequest,
): Promise<PreviewComment | null> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { comment: PreviewComment };
    return json.comment ?? null;
  } catch {
    return null;
  }
}

export async function patchPreviewCommentStatus(
  projectId: string,
  conversationId: string,
  commentId: string,
  status: PreviewCommentStatus,
): Promise<PreviewComment | null> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { comment: PreviewComment };
    return json.comment ?? null;
  } catch {
    return null;
  }
}

export async function deletePreviewComment(
  projectId: string,
  conversationId: string,
  commentId: string,
): Promise<boolean> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' },
    );
    return resp.ok;
  } catch {
    return false;
  }
}

export async function writeProjectTextFile(
  projectId: string,
  name: string,
  content: string,
  options?: { artifactManifest?: ArtifactManifest },
): Promise<ProjectFile | null> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content, artifactManifest: options?.artifactManifest }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { file: ProjectFile };
    return json.file;
  } catch {
    return null;
  }
}

export async function writeProjectBase64File(
  projectId: string,
  name: string,
  base64: string,
): Promise<ProjectFile | null> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content: base64, encoding: 'base64' }),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { file: ProjectFile };
    return json.file;
  } catch {
    return null;
  }
}

export async function uploadProjectFile(
  projectId: string,
  file: File,
  desiredName?: string,
): Promise<ProjectFile | null> {
  try {
    const form = new FormData();
    form.append('file', file);
    if (desiredName) form.append('name', desiredName);
    const resp = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { file: ProjectFile };
    return json.file;
  } catch {
    return null;
  }
}

// Multi-file project upload used by the chat composer's paste / drop /
// picker. Each file lands flat in the project folder; the response is
// reshaped into ChatAttachments so the composer can stage them without a
// follow-up listFiles round-trip.
const PROJECT_UPLOAD_BATCH_SIZE = 12;

export interface ProjectUploadFailure {
  name: string;
  code?: string;
  error?: string;
}

export interface UploadProjectFilesResult {
  uploaded: ChatAttachment[];
  failed: ProjectUploadFailure[];
  error?: string;
}

export async function uploadProjectFiles(
  projectId: string,
  files: File[],
): Promise<UploadProjectFilesResult> {
  if (files.length === 0) return { uploaded: [], failed: [] };

  const uploaded: ChatAttachment[] = [];
  const failed: ProjectUploadFailure[] = [];
  let error: string | undefined;

  for (let i = 0; i < files.length; i += PROJECT_UPLOAD_BATCH_SIZE) {
    const batch = files.slice(i, i + PROJECT_UPLOAD_BATCH_SIZE);
    const remaining = files.slice(i + PROJECT_UPLOAD_BATCH_SIZE);
    const form = new FormData();
    for (const f of batch) form.append('files', f);

    try {
      const resp = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/upload`,
        { method: 'POST', body: form },
      );

      if (!resp.ok) {
        const payload = (await resp.json().catch(() => null)) as
          | { code?: string; error?: string }
          | null;
        error = payload?.error ?? `upload failed (${resp.status})`;
        for (const f of batch) {
          failed.push({ name: f.name, code: payload?.code, error: error });
        }
        for (const f of remaining) {
          failed.push({ name: f.name, code: payload?.code, error: error });
        }
        break;
      }

      const json = (await resp.json()) as {
        files: { name: string; path: string; size?: number; originalName?: string }[];
      };
      const responseFiles = json.files ?? [];
      uploaded.push(
        ...responseFiles.map((f) => ({
          path: f.path,
          name: f.originalName ?? f.name,
          kind: looksLikeImage(f.name) ? ('image' as const) : ('file' as const),
          size: f.size,
        })),
      );
      // Server preserves request order; any dropped files are unmatched at the batch tail.
      if (responseFiles.length < batch.length) {
        error ??= 'some files could not be stored';
        for (const f of batch.slice(responseFiles.length)) {
          failed.push({
            name: f.name,
            error: error ?? 'some files could not be stored',
          });
        }
      }
    } catch {
      error = 'upload request failed';
      for (const f of batch) {
        failed.push({ name: f.name, error });
      }
      for (const f of remaining) {
        failed.push({ name: f.name, error });
      }
      break;
    }
  }

  return { uploaded, failed, error };
}

// Stable URL that serves a project file with its original mime — for
// thumbnails in the staged-attachment chips and for any preview iframe
// that needs to point at the live file (not a srcDoc).
export function projectRawUrl(projectId: string, filePath: string): string {
  // Encode each path segment individually so a slash inside the file
  // path stays a path separator, not %2F.
  const safePath = filePath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `/api/projects/${encodeURIComponent(projectId)}/raw/${safePath}`;
}

function looksLikeImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(name);
}

export async function deleteProjectFile(
  projectId: string,
  name: string,
): Promise<boolean> {
  try {
    const resp = await fetch(
      projectRawUrl(projectId, name),
      { method: 'DELETE' },
    );
    return resp.ok;
  } catch {
    return false;
  }
}

export async function fetchDesignSystemPreview(id: string): Promise<string | null> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}/preview`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

export async function fetchDesignSystemPreviewCard(id: string, card: string): Promise<string | null> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}/preview/${encodeURIComponent(card)}`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

export async function fetchDesignSystemPreviews(id: string): Promise<string[]> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}/previews`);
    if (!resp.ok) return [];
    const json = (await resp.json()) as { previews: string[] };
    return json.previews ?? [];
  } catch {
    return [];
  }
}

export async function fetchDesignSystemShowcase(id: string): Promise<string | null> {
  try {
    const resp = await fetch(`/api/design-systems/${encodeURIComponent(id)}/showcase`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

export async function fetchLiveArtifacts(projectId: string): Promise<LiveArtifactSummary[]> {
  try {
    const qs = new URLSearchParams({ projectId });
    const resp = await fetch(`/api/live-artifacts?${qs.toString()}`);
    if (!resp.ok) return [];
    const json = (await resp.json()) as { artifacts?: LiveArtifactSummary[] };
    return json.artifacts ?? [];
  } catch {
    return [];
  }
}

export async function fetchLiveArtifact(projectId: string, artifactId: string): Promise<LiveArtifact | null> {
  try {
    const qs = new URLSearchParams({ projectId });
    const resp = await fetch(`/api/live-artifacts/${encodeURIComponent(artifactId)}?${qs.toString()}`);
    if (!resp.ok) return null;
    const json = (await resp.json()) as { artifact?: LiveArtifact };
    return json.artifact ?? null;
  } catch {
    return null;
  }
}

export async function refreshLiveArtifact(projectId: string, artifactId: string): Promise<LiveArtifact | null> {
  try {
    const qs = new URLSearchParams({ projectId });
    const resp = await fetch(`/api/live-artifacts/${encodeURIComponent(artifactId)}/refresh?${qs.toString()}`, {
      method: 'POST',
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { artifact?: LiveArtifact };
    return json.artifact ?? null;
  } catch {
    return null;
  }
}

export async function fetchLiveArtifactRefreshes(
  projectId: string,
  artifactId: string,
): Promise<LiveArtifactRefreshLogEntry[]> {
  try {
    const qs = new URLSearchParams({ projectId });
    const resp = await fetch(`/api/live-artifacts/${encodeURIComponent(artifactId)}/refreshes?${qs.toString()}`);
    if (!resp.ok) return [];
    const json = (await resp.json()) as { refreshes?: LiveArtifactRefreshLogEntry[] };
    return json.refreshes ?? [];
  } catch {
    return [];
  }
}

export async function deleteLiveArtifact(projectId: string, artifactId: string): Promise<boolean> {
  try {
    const qs = new URLSearchParams({ projectId });
    const resp = await fetch(`/api/live-artifacts/${encodeURIComponent(artifactId)}?${qs.toString()}`, {
      method: 'DELETE',
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export function liveArtifactPreviewUrl(projectId: string, artifactId: string): string {
  const qs = new URLSearchParams({ projectId });
  return `/api/live-artifacts/${encodeURIComponent(artifactId)}/preview?${qs.toString()}`;
}

export function liveArtifactCodeUrl(projectId: string, artifactId: string, variant: 'template' | 'rendered-source'): string {
  const qs = new URLSearchParams({ projectId, variant });
  return `/api/live-artifacts/${encodeURIComponent(artifactId)}/preview?${qs.toString()}`;
}
