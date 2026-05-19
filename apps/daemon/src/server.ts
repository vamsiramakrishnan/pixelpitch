// @ts-nocheck
import type { DesktopExportPdfInput, DesktopExportPdfResult } from '@pixelpitch/sidecar-proto';
import express from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import { execFile } from 'node:child_process';
import { composeSystemPrompt, listPromptDirectives, searchPromptDirectives } from '@pixelpitch/contracts';
import {
  detectAgents,
  getAgentDef,
  isKnownModel,
  resolveAgentBin,
  sanitizeCustomModel,
} from './agents.js';
import { listSkills, searchSkills } from './skills.js';
import { listCodexPets, readCodexPetSpritesheet } from './codex-pets.js';
import { syncCommunityPets } from './community-pets-sync.js';
import { listDesignSystems, readDesignSystem, readDesignSystemTokens, listDesignSystemPreviews } from './design-systems.js';
import { resolveTurnContext, searchContextRegistry } from './context-resolver.js';
import { createAgentRunService } from './agent-run-service.js';
import { loadCritiqueConfigFromEnv } from './critique/config.js';
import { reconcileStaleRuns } from './critique/persistence.js';
import { createRunRegistry } from './critique/run-registry.js';
import { handleCritiqueInterrupt } from './critique/interrupt-handler.js';
import { handleCritiqueArtifact } from './critique/artifact-handler.js';
import { RoutineService } from './routines.js';
import { registerRoutineRoutes, routineDbRowToContract } from './routine-routes.js';
import { renderDesignSystemPreview } from './design-system-preview.js';
import { renderDesignSystemShowcase } from './design-system-showcase.js';
import { createChatRunService } from './runs.js';
import { importClaudeDesignZip } from './claude-design-import.js';
import { listPromptTemplates, readPromptTemplate } from './prompt-templates.js';
import { buildDocumentPreview } from './document-preview.js';
import { lintArtifact, renderFindingsForAgent } from './lint-artifact.js';
import { listCraftSections, loadCraftSections, searchCraftSections } from './craft.js';
import {
  buildSpecialistPlannerPrompt,
  parseSpecialistPlannerOutput,
  planSpecialistWorkflow,
} from './specialist-router.js';
import { generateMedia } from './media.js';
import { PptxExportError, runPptxExport } from './pptx-export.js';
import { buildDesktopPdfExportInput } from './pdf-export.js';
import {
  AUDIO_DURATIONS_SEC,
  AUDIO_MODELS_BY_KIND,
  IMAGE_MODELS,
  MEDIA_ASPECTS,
  MEDIA_PROVIDERS,
  VIDEO_LENGTHS_SEC,
  VIDEO_MODELS,
} from './media-models.js';
import { readMaskedConfig, writeConfig } from './media-config.js';
import {
  composeMemoryBody,
  deleteMemoryEntry,
  extractFromMessage,
  listMemoryEntries,
  maskMemoryExtractionConfig,
  memoryDir,
  memoryEvents,
  readMemoryConfig,
  readMemoryEntry,
  readMemoryIndex,
  upsertMemoryEntry,
  writeMemoryConfig,
  writeMemoryIndex,
} from './memory.js';
import { listProviderModels } from './providerModels.js';
import { readAppConfig, writeAppConfig } from './app-config.js';
import { OrbitService, formatLocalProjectTimestamp, renderOrbitTemplateSystemPrompt } from './orbit.js';
import {
  MCP_TEMPLATES,
  isManagedProjectCwd,
  readMcpConfig,
  writeClaudeMcpConfigForCwd,
  writeMcpConfig,
} from './mcp-config.js';
import { buildMcpInstallPayload } from './mcp-install-info.js';
import {
  applyHtmlEditOperations,
  HtmlEditOperationError,
} from './html-edit-ops.js';
import {
  buildProjectArchive,
  decodeMultipartFilename,
  deleteProjectFile,
  detectEntryFile,
  ensureProject,
  listFiles,
  projectDir,
  readProjectFile,
  removeProjectDir,
  sanitizeName,
  searchProjectFiles,
  writeProjectFile,
} from './projects.js';
import { validateLinkedDirs } from './linked-dirs.js';
import { buildWindowsFolderDialogCommand, parseFolderDialogStdout } from './native-folder-dialog.js';
import { subscribe as subscribeFileEvents } from './project-watchers.js';

function uniqueStrings(values) {
  const out = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
}

function openNativeFolderDialog() {
  return new Promise((resolve) => {
    const platform = process.platform;
    if (platform === 'darwin') {
      execFile(
        'osascript',
        ['-e', 'POSIX path of (choose folder with prompt "Select a code folder to link")'],
        { timeout: 120_000 },
        (err, stdout) => {
          if (err) return resolve(null);
          const selected = stdout.trim().replace(/\/$/, '');
          resolve(selected || null);
        },
      );
      return;
    }
    if (platform === 'linux') {
      execFile(
        'zenity',
        ['--file-selection', '--directory', '--title=Select a code folder to link'],
        { timeout: 120_000 },
        (err, stdout) => {
          if (err) return resolve(null);
          const selected = stdout.trim();
          resolve(selected || null);
        },
      );
      return;
    }
    if (platform === 'win32') {
      const command = buildWindowsFolderDialogCommand();
      execFile(command.command, command.args, { timeout: 120_000 }, (err, stdout) => {
        resolve(parseFolderDialogStdout(err, stdout));
      });
      return;
    }
    resolve(null);
  });
}

function renderAutomaticContextDiscoveryBlock({
  activeSkillIds,
  activeCraftIds,
  activeDirectiveIds,
  skillMatches,
  craftMatches,
  directiveMatches,
  inferredSkillIds,
}) {
  const lines = [];
  const candidateSkillMatches = Array.isArray(skillMatches)
    ? skillMatches.filter((match) => !activeSkillIds.includes(match.skill?.id)).slice(0, 4)
    : [];
  const candidateCraftMatches = Array.isArray(craftMatches)
    ? craftMatches.filter((match) => !activeCraftIds.includes(match.section?.id)).slice(0, 4)
    : [];
  const candidateDirectiveMatches = Array.isArray(directiveMatches)
    ? directiveMatches.filter((match) => !activeDirectiveIds.includes(match.directive?.id)).slice(0, 4)
    : [];

  if (
    inferredSkillIds.length === 0 &&
    activeCraftIds.length === 0 &&
    activeDirectiveIds.length === 0 &&
    candidateSkillMatches.length === 0 &&
    candidateCraftMatches.length === 0 &&
    candidateDirectiveMatches.length === 0
  ) {
    return '';
  }

  lines.push('## Automatic context discovery');
  lines.push('');
  lines.push('Pixelpitch searched skills, prompt directives, and craft rules from the user request. Explicit @ mentions and the project active skill/design system still win. Treat inferred matches as awareness and quality guidance; do not announce search mechanics unless it affects a decision.');
  lines.push('');

  if (inferredSkillIds.length > 0) {
    lines.push(`Inferred base skill because this project had no active skill: ${inferredSkillIds.map((id) => `\`${id}\``).join(', ')}.`);
    lines.push('Follow the inferred skill body as the active workflow unless the user asks for a different artifact type.');
    lines.push('');
  }

  if (activeDirectiveIds.length > 0) {
    lines.push(`Auto-applied directive overlays: ${activeDirectiveIds.map((id) => `\`${id}\``).join(', ')}.`);
    lines.push('Directive overlays can shape atmosphere, hierarchy, materiality, motion, imagery, and fallback tokens. They never replace an active DESIGN.md.');
    lines.push('');
  }

  if (activeCraftIds.length > 0) {
    lines.push(`Auto-loaded craft rules: ${activeCraftIds.map((id) => `\`${id}\``).join(', ')}.`);
    lines.push('');
  }

  if (candidateSkillMatches.length > 0) {
    lines.push('Nearby skill candidates available if the task pivots:');
    for (const match of candidateSkillMatches) {
      const skill = match.skill;
      const cliHint = Array.isArray(skill.cliProcedures) && skill.cliProcedures.length > 0
        ? `; ${skill.cliProcedures.length} CLI procedure${skill.cliProcedures.length === 1 ? '' : 's'} available`
        : '';
      lines.push(`- \`${skill.id}\` (${skill.mode}${cliHint}): ${skill.description || skill.name} [score ${match.score}]`);
    }
    lines.push('');
  }

  if (candidateDirectiveMatches.length > 0) {
    lines.push('Nearby directive candidates:');
    for (const match of candidateDirectiveMatches) {
      const directive = match.directive;
      lines.push(`- \`${directive.id}\`: ${directive.title} — ${directive.summary} [score ${match.score}]`);
    }
    lines.push('');
  }

  if (candidateCraftMatches.length > 0) {
    lines.push('Nearby craft candidates:');
    for (const match of candidateCraftMatches) {
      const section = match.section;
      lines.push(`- \`${section.id}\`: ${section.title} — ${section.summary} [score ${match.score}]`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

function renderContextTraceForAgent(resolved) {
  if (!resolved || !Array.isArray(resolved.stack)) return '';
  const loaded = resolved.stack.filter((item) => item.loaded);
  const nearby = resolved.stack.filter((item) => !item.loaded).slice(0, 6);
  if (loaded.length === 0 && nearby.length === 0 && (!resolved.trace || resolved.trace.length === 0)) return '';
  const lines = ['## Context loaded by Pixelpitch', ''];
  for (const item of loaded) {
    lines.push(`- ${item.kind} \`${item.id}\`: ${item.reason}`);
    if (item.source) lines.push(`  source: ${item.source}`);
  }
  if (nearby.length > 0) {
    lines.push('', 'Nearby context candidates, not loaded unless useful:');
    for (const item of nearby) {
      lines.push(`- ${item.kind} \`${item.id}\` [score ${item.score}]: ${item.summary}`);
    }
  }
  if (Array.isArray(resolved.trace) && resolved.trace.length > 0) {
    lines.push('', 'Resolution trace:');
    for (const item of resolved.trace) lines.push(`- ${item}`);
  }
  return lines.join('\n');
}
import { validateArtifactManifestInput } from './artifact-manifest.js';
import { readCurrentAppVersionInfo } from './app-version.js';
import {
  createLiveArtifact,
  deleteLiveArtifact,
  ensureLiveArtifactPreview,
  getLiveArtifact,
  LiveArtifactRefreshLockError,
  LiveArtifactStoreValidationError,
  listLiveArtifactRefreshLogEntries,
  listLiveArtifacts,
  readLiveArtifactCode,
  recoverStaleLiveArtifactRefreshes,
  updateLiveArtifact,
} from './live-artifacts/store.js';
import { LiveArtifactRefreshUnavailableError, refreshLiveArtifact } from './live-artifacts/refresh-service.js';
import { LiveArtifactRefreshAbortError } from './live-artifacts/refresh.js';
import { toolTokenRegistry } from './tool-tokens.js';
import { registerConnectorRoutes } from './connectors/routes.js';
import {
  configureConnectorCredentialStore,
  ConnectorServiceError,
  deleteConnectorCredentialsByProvider,
  FileConnectorCredentialStore,
} from './connectors/service.js';
import {
  configureComposioConfigStore,
  readPublicComposioConfig,
  writeComposioConfig,
} from './connectors/composio-config.js';
import {
  deleteConversation,
  deletePreviewComment,
  deleteProject as dbDeleteProject,
  deleteTemplate,
  getConversation,
  getDeployment,
  getDeploymentById,
  getProject,
  getTemplate,
  getLatestRoutineRun,
  insertRoutineRun,
  insertConversation,
  insertProject,
  insertTemplate,
  listRoutines,
  listProjectsAwaitingInput,
  listConversations,
  listDeployments,
  listLatestProjectRunStatuses,
  listMessages,
  listPreviewComments,
  listProjects,
  listTabs,
  listTemplates,
  openDatabase,
  setTabs,
  updateConversation,
  updatePreviewCommentStatus,
  updateProject,
  updateRoutineRun,
  upsertDeployment,
  upsertMessage,
  upsertPreviewComment,
} from './db.js';
import {
  buildDeployFileSet,
  checkDeploymentUrl,
  CLOUD_RUN_PROVIDER_ID,
  DeployError,
  deployToCloudRun,
  prepareDeployPreflight,
  publicDeployConfig,
  readCloudRunConfig,
  writeCloudRunConfig,
} from './deploy.js';

/** @typedef {import('@pixelpitch/contracts').ApiErrorCode} ApiErrorCode */
/** @typedef {import('@pixelpitch/contracts').ApiError} ApiError */
/** @typedef {import('@pixelpitch/contracts').ApiErrorResponse} ApiErrorResponse */
/** @typedef {import('@pixelpitch/contracts').ChatRequest} ChatRequest */
/** @typedef {import('@pixelpitch/contracts').ChatSseEvent} ChatSseEvent */
/** @typedef {import('@pixelpitch/contracts').ProxyStreamRequest} ProxyStreamRequest */
/** @typedef {import('@pixelpitch/contracts').ProxySseEvent} ProxySseEvent */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function resolveProjectRoot(moduleDir: string): string {
  const base = path.basename(moduleDir);
  const daemonDir =
    base === 'dist' || base === 'src' ? path.dirname(moduleDir) : moduleDir;
  return path.resolve(daemonDir, '../..');
}

const PROJECT_ROOT = resolveProjectRoot(__dirname);
const RESOURCE_ROOT_ENV = 'PIXELPITCH_RESOURCE_ROOT';

export function normalizeCommentAttachments(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null;
      const filePath = cleanString(raw.filePath);
      const elementId = cleanString(raw.elementId);
      const selector = cleanString(raw.selector);
      const label = cleanString(raw.label);
      const comment = cleanString(raw.comment);
      if (!filePath || !elementId || !selector || !comment) return null;
      return {
        id: cleanString(raw.id) || `comment-${index + 1}`,
        order: Number.isFinite(raw.order)
          ? Math.max(1, Math.round(raw.order))
          : index + 1,
        filePath,
        elementId,
        selector,
        label,
        comment,
        currentText: compactString(raw.currentText, 160),
        pagePosition: normalizeAttachmentPosition(raw.pagePosition),
        htmlHint: compactString(raw.htmlHint, 180),
        screenshotPath: compactString(raw.screenshotPath, 260),
        sourcePath: compactString(raw.sourcePath, 260),
        sourceLine: positiveIntegerOrNull(raw.sourceLine),
        sourceColumn: positiveIntegerOrNull(raw.sourceColumn),
        sourceSnippet: compactMultilineString(raw.sourceSnippet, 900),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

export function renderCommentAttachmentHint(commentAttachments) {
  if (!commentAttachments.length) return '';
  const lines = [
    '',
    '',
    '<attached-preview-comments>',
    'Scope: edit the target element by default. Use the smallest necessary parent wrapper only if the target cannot satisfy the comment. Preserve stable ids and unrelated siblings.',
  ];
  for (const item of commentAttachments) {
    lines.push(
      '',
      `${item.order}. ${item.elementId}`,
      `file: ${item.filePath}`,
      `selector: ${item.selector}`,
      `label: ${item.label || '(unlabeled)'}`,
      `position: ${formatAttachmentPosition(item.pagePosition)}`,
      item.sourcePath && item.sourceLine
        ? `source: ${item.sourcePath}:${item.sourceLine}${item.sourceColumn ? `:${item.sourceColumn}` : ''}`
        : `source: ${item.filePath}`,
      item.sourceSnippet ? `sourceSnippet:\n${item.sourceSnippet}` : 'sourceSnippet: (not located)',
      item.screenshotPath ? `visual: ${item.screenshotPath}` : 'visual: (not captured)',
      `currentText: ${item.currentText || '(empty)'}`,
      `htmlHint: ${item.htmlHint || '(none)'}`,
      `comment: ${item.comment}`,
    );
  }
  lines.push('</attached-preview-comments>');
  return lines.join('\n');
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sendBufferWithRange(req, res, file) {
  const size = file.buffer.length;
  const range = req.headers.range;
  res.setHeader('Accept-Ranges', 'bytes');
  res.type(file.mime);
  if (typeof range !== 'string' || !range.startsWith('bytes=')) {
    res.setHeader('Content-Length', String(size));
    res.send(file.buffer);
    return;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) {
    res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
    return;
  }
  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
    return;
  }
  end = Math.min(end, size - 1);
  res.status(206);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
  res.setHeader('Content-Length', String(end - start + 1));
  res.send(file.buffer.subarray(start, end + 1));
}

function compactString(value, max) {
  const text = cleanString(value).replace(/\s+/g, ' ');
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function compactMultilineString(value, max) {
  const text = typeof value === 'string' ? value.replace(/\n{4,}/g, '\n\n\n').trim() : '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function positiveIntegerOrNull(value) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function normalizeAttachmentPosition(input) {
  const value = input && typeof input === 'object' ? input : {};
  return {
    x: finiteAttachmentNumber(value.x),
    y: finiteAttachmentNumber(value.y),
    width: finiteAttachmentNumber(value.width),
    height: finiteAttachmentNumber(value.height),
  };
}

function finiteAttachmentNumber(value) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function formatAttachmentPosition(position) {
  return `x=${position.x}, y=${position.y}, width=${position.width}, height=${position.height}`;
}

function isPathWithin(base, target) {
  const relativePath = path.relative(path.resolve(base), path.resolve(target));
  return (
    relativePath === '' ||
    (relativePath.length > 0 &&
      !relativePath.startsWith('..') &&
      !path.isAbsolute(relativePath))
  );
}

function resolveProcessResourcesPath() {
  if (
    typeof process.resourcesPath === 'string' &&
    process.resourcesPath.length > 0
  ) {
    return process.resourcesPath;
  }

  // Packaged daemon sidecars run under the bundled Node binary rather than the
  // Electron root process, so `process.resourcesPath` is unavailable there.
  // Infer the macOS app Resources directory from that bundled Node path.
  const resourcesMarker = `${path.sep}Contents${path.sep}Resources${path.sep}`;
  const markerIndex = process.execPath.indexOf(resourcesMarker);
  if (markerIndex !== -1) {
    return process.execPath.slice(0, markerIndex + resourcesMarker.length - 1);
  }

  const normalizedExecPath = process.execPath.toLowerCase();
  const windowsResourceBinMarker =
    `${path.sep}resources${path.sep}pixelpitch${path.sep}bin${path.sep}`.toLowerCase();
  const windowsMarkerIndex = normalizedExecPath.indexOf(
    windowsResourceBinMarker,
  );
  if (windowsMarkerIndex !== -1) {
    return process.execPath.slice(
      0,
      windowsMarkerIndex + `${path.sep}resources`.length,
    );
  }

  return null;
}

export function resolveDaemonResourceRoot({
  configured = process.env[RESOURCE_ROOT_ENV],
  safeBases = [PROJECT_ROOT, resolveProcessResourcesPath()],
} = {}) {
  if (!configured || configured.length === 0) return null;

  const resolved = path.resolve(configured);
  const normalizedSafeBases = safeBases
    .filter((base) => typeof base === 'string' && base.length > 0)
    .map((base) => path.resolve(base));

  if (!normalizedSafeBases.some((base) => isPathWithin(base, resolved))) {
    throw new Error(
      `${RESOURCE_ROOT_ENV} must be under the workspace root or app resources path`,
    );
  }

  return resolved;
}

function resolveDaemonResourceDir(resourceRoot, segment, fallback) {
  return resourceRoot ? path.join(resourceRoot, segment) : fallback;
}

const DAEMON_RESOURCE_ROOT = resolveDaemonResourceRoot();
// Built web app lives in `out/` — that's where Next.js writes the static
// export configured in next.config.ts. The folder name used to be `dist/`
// when this project shipped with Vite; the daemon serves whatever the
// frontend toolchain emits, no further config needed.
const STATIC_DIR = path.join(PROJECT_ROOT, 'apps', 'web', 'out');
const PIXELPITCH_BIN = path.join(PROJECT_ROOT, 'apps', 'daemon', 'dist', 'cli.js');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content');
const SKILLS_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'skills',
  path.join(CONTENT_DIR, 'skills'),
);
const DESIGN_SYSTEMS_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'design-systems',
  path.join(CONTENT_DIR, 'design-systems'),
);
const CRAFT_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'craft',
  path.join(CONTENT_DIR, 'craft'),
);
const FRAMES_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'frames',
  path.join(CONTENT_DIR, 'assets', 'frames'),
);
// Curated pets baked into the repo via `scripts/bake-community-pets.ts`.
// `listCodexPets` scans this in addition to `~/.codex/pets/` so the
// "Recently hatched" grid is non-empty out-of-the-box and users do not
// need to hit the "Download community pets" button to try a few pets.
const BUNDLED_PETS_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'community-pets',
  path.join(CONTENT_DIR, 'assets', 'community-pets'),
);
const PROMPT_TEMPLATES_DIR = resolveDaemonResourceDir(
  DAEMON_RESOURCE_ROOT,
  'prompt-templates',
  path.join(CONTENT_DIR, 'prompt-templates'),
);
const RUNTIME_DATA_DIR = process.env.PIXELPITCH_DATA_DIR
  ? path.resolve(PROJECT_ROOT, process.env.PIXELPITCH_DATA_DIR)
  : path.join(PROJECT_ROOT, '.pixelpitch');
const RUNTIME_DATA_DIR_CANONICAL = (() => {
  try {
    return fs.realpathSync.native(RUNTIME_DATA_DIR);
  } catch {
    return path.resolve(RUNTIME_DATA_DIR);
  }
})();
const ARTIFACTS_DIR = path.join(RUNTIME_DATA_DIR, 'artifacts');
const PROJECTS_DIR = path.join(RUNTIME_DATA_DIR, 'projects');
fs.mkdirSync(PROJECTS_DIR, { recursive: true });

export const SSE_KEEPALIVE_INTERVAL_MS = 25_000;

export function normalizeProjectDisplayStatus(status) {
  return status === 'starting' || status === 'queued' ? 'running' : status;
}

export function composeProjectDisplayStatus(
  baseStatus,
  awaitingInputProjects,
  projectId,
) {
  if (
    baseStatus.value === 'succeeded' &&
    awaitingInputProjects.has(projectId)
  ) {
    return { ...baseStatus, value: 'awaiting_input' };
  }
  return {
    ...baseStatus,
    value: normalizeProjectDisplayStatus(baseStatus.value),
  };
}

/**
 * @param {ApiErrorCode} code
 * @param {string} message
 * @param {Omit<ApiError, 'code' | 'message'>} [init]
 * @returns {ApiError}
 */
export function createCompatApiError(code, message, init = {}) {
  return { code, message, ...init };
}

/**
 * @param {ApiErrorCode} code
 * @param {string} message
 * @param {Omit<ApiError, 'code' | 'message'>} [init]
 * @returns {ApiErrorResponse}
 */
export function createCompatApiErrorResponse(code, message, init = {}) {
  return { error: createCompatApiError(code, message, init) };
}

/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {ApiErrorCode} code
 * @param {string} message
 * @param {Omit<ApiError, 'code' | 'message'>} [init]
 */
function sendApiError(res, status, code, message, init = {}) {
  return res
    .status(status)
    .json(createCompatApiErrorResponse(code, message, init));
}

// Filename slug for the Content-Disposition header on archive downloads.
// Browsers reject quotes and control bytes; we keep Unicode letters/digits
// so a project name with non-ASCII characters (e.g. "café-design")
// survives instead of becoming a row of underscores.
function sanitizeArchiveFilename(raw) {
  const cleaned = String(raw ?? '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned;
}

function transcriptTimestamp(value) {
  const ts = Number(value);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  try {
    return new Date(ts).toISOString();
  } catch {
    return null;
  }
}

function transcriptRoleLabel(role) {
  if (role === 'assistant') return 'Assistant';
  if (role === 'user') return 'User';
  if (role === 'system') return 'System';
  return String(role || 'Message');
}

function summarizeTranscriptList(items, label, readItem) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const lines = [`${label}:`];
  for (const item of items) {
    const text = readItem(item);
    if (text) lines.push(`- ${text}`);
  }
  return lines.length > 1 ? lines : [];
}

export function buildConversationTranscriptPayload(project, conversation, messages) {
  return {
    version: 1,
    exportedAt: Date.now(),
    project: {
      id: project.id,
      name: project.name,
    },
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      agentId: message.agentId,
      agentName: message.agentName,
      runId: message.runId,
      runStatus: message.runStatus,
      attachments: message.attachments ?? [],
      commentAttachments: message.commentAttachments ?? [],
      producedFiles: message.producedFiles ?? [],
      createdAt: message.createdAt,
      startedAt: message.startedAt,
      endedAt: message.endedAt,
    })),
  };
}

export function renderConversationTranscriptMarkdown(payload) {
  const title = payload.conversation.title || 'Untitled conversation';
  const lines = [
    `# ${title}`,
    '',
    `Project: ${payload.project.name} (${payload.project.id})`,
    `Conversation: ${payload.conversation.id}`,
    `Exported: ${transcriptTimestamp(payload.exportedAt) ?? 'unknown'}`,
  ];
  const created = transcriptTimestamp(payload.conversation.createdAt);
  const updated = transcriptTimestamp(payload.conversation.updatedAt);
  if (created) lines.push(`Created: ${created}`);
  if (updated) lines.push(`Updated: ${updated}`);
  lines.push('');

  for (const message of payload.messages) {
    const messageTime = transcriptTimestamp(message.createdAt || message.startedAt);
    const heading = [`## ${transcriptRoleLabel(message.role)}`];
    if (message.agentName) heading.push(`(${message.agentName})`);
    if (messageTime) heading.push(`- ${messageTime}`);
    lines.push(heading.join(' '), '');
    lines.push(String(message.content || '').trim() || '(empty)');

    const attachments = summarizeTranscriptList(
      message.attachments,
      'Attachments',
      (item) => item?.name || item?.fileName || item?.path || '',
    );
    const comments = summarizeTranscriptList(
      message.commentAttachments,
      'Preview comments',
      (item) => {
        const target = item?.elementId || item?.label || item?.selector || '';
        const comment = item?.comment || '';
        return [target, comment].filter(Boolean).join(': ');
      },
    );
    const produced = summarizeTranscriptList(
      message.producedFiles,
      'Produced files',
      (item) => item?.name || item?.path || '',
    );
    const meta = [...attachments, ...comments, ...produced];
    if (meta.length) lines.push('', ...meta);
    lines.push('');
  }

  return `${lines.join('\n').replace(/\n{4,}/g, '\n\n\n').trim()}\n`;
}

/**
 * @param {ApiErrorCode} code
 * @param {string} message
 * @param {Omit<ApiError, 'code' | 'message'>} [init]
 */
function createSseErrorPayload(code, message, init = {}) {
  return { message, error: createCompatApiError(code, message, init) };
}

async function applyProjectEditOperations(projectId, ownerFileName, operations, metadata = null) {
  const owner = await readProjectFile(PROJECTS_DIR, projectId, ownerFileName, metadata);
  const ownerSource = owner.buffer.toString('utf8');
  const sourceCache = new Map([[owner.name, ownerSource]]);
  const changed = new Map();
  const applied = [];

  for (const operation of operations) {
    const candidates = await projectEditCandidateNames(projectId, owner.name, ownerSource, operation, metadata);
    let match = null;
    let lastTargetError = null;

    for (const candidateName of candidates) {
      let source = sourceCache.get(candidateName);
      if (source == null) {
        try {
          const file = await readProjectFile(PROJECTS_DIR, projectId, candidateName, metadata);
          source = file.buffer.toString('utf8');
          sourceCache.set(file.name, source);
        } catch {
          continue;
        }
      }

      try {
        const result = applyHtmlEditOperations(source, [operation]);
        sourceCache.set(candidateName, result.source);
        changed.set(candidateName, result.source);
        applied.push(...result.applied.map((item) => ({ ...item, fileName: candidateName })));
        match = candidateName;
        break;
      } catch (err) {
        if (err instanceof HtmlEditOperationError && err.message === 'target element not found') {
          lastTargetError = err;
          continue;
        }
        throw err;
      }
    }

    if (!match) {
      if (lastTargetError) throw lastTargetError;
      throw new HtmlEditOperationError('target element not found', {
        selector: operation?.target?.selector,
        elementId: operation?.target?.elementId,
      });
    }
  }

  for (const [fileName, source] of changed.entries()) {
    await writeProjectFile(
      PROJECTS_DIR,
      projectId,
      fileName,
      Buffer.from(source, 'utf8'),
      { metadata },
    );
  }

  return applied;
}

async function projectEditCandidateNames(projectId, ownerName, ownerSource, operation, metadata = null) {
  const names = uniqueStrings([
    ownerName,
    ...relativeHtmlAssetRefs(ownerName, ownerSource),
  ]);

  const target = operation?.target ?? {};
  const needle = compactString(target.currentText || target.elementId || target.label || '', 80);
  if (!needle) return names;
  const files = await listFiles(PROJECTS_DIR, projectId, { metadata });
  const searchable = files
    .filter((file) => /\.(?:html?|jsx?|tsx?)$/i.test(file.name))
    .filter((file) => file.size <= 500_000)
    .map((file) => file.name);
  return uniqueStrings([...names, ...searchable]);
}

function relativeHtmlAssetRefs(ownerName, source) {
  const out = [];
  const tagRe = /<(?:script|link)\b[^>]*(?:src|href)\s*=\s*(['"])([\s\S]*?)\1[^>]*>/gi;
  let match;
  while ((match = tagRe.exec(String(source || '')))) {
    const resolved = resolveProjectRelativePath(ownerName, match[2]);
    if (resolved) out.push(resolved);
  }
  return out;
}

function resolveProjectRelativePath(ownerName, assetRef) {
  if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/i.test(String(assetRef || ''))) return null;
  try {
    const url = new URL(String(assetRef || ''), `https://pixelpitch.local/${baseDirForProjectPath(ownerName)}`);
    if (url.origin !== 'https://pixelpitch.local') return null;
    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

function baseDirForProjectPath(fileName) {
  const idx = String(fileName || '').lastIndexOf('/');
  return idx >= 0 ? String(fileName).slice(0, idx + 1) : '';
}

const UPLOAD_DIR = path.join(os.tmpdir(), 'od-uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      file.originalname = decodeMultipartFilename(file.originalname);
      const safe = sanitizeName(file.originalname);
      cb(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`,
      );
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const importUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      file.originalname = decodeMultipartFilename(file.originalname);
      const safe = sanitizeName(file.originalname);
      cb(
        null,
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`,
      );
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Project-scoped multi-file upload. Lands files directly in the project
// folder (flat — same shape FileWorkspace expects), so the composer's
// pasted/dropped/picked images become referenceable filenames the agent
// can Read or @-mention without any cross-folder gymnastics.
const projectUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, _file, cb) => {
      try {
        const dir = await ensureProject(PROJECTS_DIR, req.params.id);
        cb(null, dir);
      } catch (err) {
        cb(err, '');
      }
    },
    filename: (_req, file, cb) => {
      // multer@1 hands us latin1-decoded multipart filenames; restore the
      // original UTF-8 so the response (and the on-disk name) preserves
      // non-ASCII characters instead of mangling them. Then run the
      // shared sanitiser and prepend a base36 timestamp so multiple
      // uploads with the same original name don't clobber each other.
      file.originalname = decodeMultipartFilename(file.originalname);
      const safe = sanitizeName(file.originalname);
      cb(null, `${Date.now().toString(36)}-${safe}`);
    },
  }),
  limits: { fileSize: 200 * 1024 * 1024 },  // 200MB — covers the largest design assets we expect (PPTX/PDF/raw images)
});

function handleProjectUpload(req, res, next) {
  projectUpload.array('files', 12)(req, res, (err) => {
    if (err) {
      return sendMulterError(res, err);
    }
    next();
  });
}

function sendMulterError(res, err) {
  if (err instanceof multer.MulterError) {
    const code = err.code || 'UPLOAD_ERROR';
    const statusByCode = {
      LIMIT_FILE_SIZE: 413,
      LIMIT_FILE_COUNT: 400,
      LIMIT_UNEXPECTED_FILE: 400,
      LIMIT_PART_COUNT: 400,
      LIMIT_FIELD_KEY: 400,
      LIMIT_FIELD_VALUE: 400,
      LIMIT_FIELD_COUNT: 400,
    };
    const errorByCode = {
      LIMIT_FILE_SIZE: 'file too large',
      LIMIT_FILE_COUNT: 'too many files',
      LIMIT_UNEXPECTED_FILE: 'unexpected file field',
      LIMIT_PART_COUNT: 'too many form parts',
      LIMIT_FIELD_KEY: 'field name too long',
      LIMIT_FIELD_VALUE: 'field value too long',
      LIMIT_FIELD_COUNT: 'too many form fields',
    };
    const status = statusByCode[code] ?? 400;
    const message = errorByCode[code] ?? 'upload failed';
    return sendApiError(
      res,
      status,
      code === 'LIMIT_FILE_SIZE' ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
      message,
      { details: { legacyCode: code } },
    );
  }

  if (err) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', 'upload failed');
  }

  return sendApiError(res, 500, 'INTERNAL_ERROR', 'upload failed');
}

const mediaTasks = new Map();
const TASK_TTL_AFTER_DONE_MS = 10 * 60 * 1000;

function createMediaTask(taskId, projectId, info = {}) {
  const task = {
    id: taskId,
    projectId,
    status: 'queued',
    surface: info.surface,
    model: info.model,
    progress: [],
    file: null,
    error: null,
    startedAt: Date.now(),
    endedAt: null,
    waiters: new Set(),
  };
  mediaTasks.set(taskId, task);
  return task;
}

function appendTaskProgress(task, line) {
  task.progress.push(line);
  notifyTaskWaiters(task);
}

function notifyTaskWaiters(task) {
  const wakers = Array.from(task.waiters);
  for (const w of wakers) {
    try {
      w();
    } catch {
      // Never let one bad waiter block the rest.
    }
  }
  if (
    (task.status === 'done' || task.status === 'failed') &&
    !task._gcScheduled
  ) {
    task._gcScheduled = true;
    setTimeout(() => {
      if (task.waiters.size === 0) mediaTasks.delete(task.id);
    }, TASK_TTL_AFTER_DONE_MS).unref?.();
  }
}

export function createSseResponse(
  res,
  { keepAliveIntervalMs = SSE_KEEPALIVE_INTERVAL_MS } = {},
) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const canWrite = () => !res.destroyed && !res.writableEnded;
  const writeKeepAlive = () => {
    if (canWrite()) {
      res.write(': keepalive\n\n');
      return true;
    }
    return false;
  };

  let heartbeat = null;
  if (keepAliveIntervalMs > 0) {
    heartbeat = setInterval(writeKeepAlive, keepAliveIntervalMs);
    heartbeat.unref?.();
  }

  const cleanup = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);

  return {
    /** @param {ChatSseEvent['event'] | ProxySseEvent['event'] | string} event */
    send(event, data, id = null) {
      if (!canWrite()) return false;
      if (id !== null && id !== undefined) res.write(`id: ${id}\n`);
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    },
    writeKeepAlive,
    cleanup,
    end() {
      cleanup();
      if (canWrite()) {
        res.end();
      }
    },
  };
}

export type DesktopPdfExporter = (input: DesktopExportPdfInput) => Promise<DesktopExportPdfResult>;

export interface StartServerOptions {
  desktopPdfExporter?: DesktopPdfExporter | null;
  host?: string;
  port?: number;
  returnServer?: boolean;
}

export async function startServer({ port = 17456, host = process.env.PIXELPITCH_BIND_HOST || '127.0.0.1', returnServer = false, desktopPdfExporter = null }: StartServerOptions = {}) {
  let resolvedPort = port;
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  const db = openDatabase(PROJECT_ROOT, { dataDir: RUNTIME_DATA_DIR });
  let activeContext = null;
  const ACTIVE_CONTEXT_TTL_MS = 5 * 60 * 1000;
  const activeChatAgentEventSinks = new Map();
  const activeProjectEventSinks = new Map();
  const critiqueCfg = loadCritiqueConfigFromEnv();
  const critiqueWarnedAdapters = new Set();
  const critiqueRunRegistry = createRunRegistry();
  const orbitService = new OrbitService(RUNTIME_DATA_DIR);
  configureConnectorCredentialStore(new FileConnectorCredentialStore(RUNTIME_DATA_DIR));
  configureComposioConfigStore(RUNTIME_DATA_DIR);

  const reconciledStaleRuns = reconcileStaleRuns(db, {
    staleAfterMs: critiqueCfg.totalTimeoutMs,
  });
  if (reconciledStaleRuns > 0) {
    console.warn(`[critique] reconcileStaleRuns flipped ${reconciledStaleRuns} stale running row(s) to interrupted`);
  }

  void recoverStaleLiveArtifactRefreshes({ projectsRoot: PROJECTS_DIR }).catch((err) => {
    console.warn('[live-artifacts] stale refresh recovery failed:', err?.message || err);
  });

  readAppConfig(RUNTIME_DATA_DIR)
    .then((config) => orbitService.configure(config.orbit))
    .catch((err) => console.warn('[orbit] config load failed:', err?.message || err));

  function emitChatAgentEvent(runId, payload) {
    const sink = activeChatAgentEventSinks.get(runId);
    if (!sink) return false;
    return sink(payload);
  }

  function emitProjectLiveArtifactEvent(projectId, payload) {
    const sinks = activeProjectEventSinks.get(projectId);
    if (!sinks) return false;
    let emitted = false;
    for (const sink of sinks) {
      emitted = sink(payload) || emitted;
    }
    return emitted;
  }

  function emitLiveArtifactEvent(grant, action, artifact) {
    if (!artifact?.id) return false;
    const payload = {
      type: 'live_artifact',
      action,
      projectId: artifact.projectId ?? grant.projectId,
      artifactId: artifact.id,
      title: artifact.title ?? artifact.id,
      refreshStatus: artifact.refreshStatus,
    };
    let emitted = emitProjectLiveArtifactEvent(payload.projectId, payload);
    if (grant?.runId) emitted = emitChatAgentEvent(grant.runId, payload) || emitted;
    return emitted;
  }

  function emitLiveArtifactRefreshEvent(grant, payload) {
    if (!payload?.artifactId) return false;
    const event = {
      type: 'live_artifact_refresh',
      projectId: grant.projectId,
      ...payload,
    };
    let emitted = emitProjectLiveArtifactEvent(grant.projectId, event);
    if (grant?.runId) emitted = emitChatAgentEvent(grant.runId, event) || emitted;
    return emitted;
  }

  function normalizeLocalAuthority(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || /[\s/@]/.test(trimmed) || trimmed.includes(',')) return null;
    try {
      const parsed = new URL(`http://${trimmed}`);
      const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
      if (!hostname || parsed.username || parsed.password || parsed.pathname !== '/') return null;
      return { hostname, port: parsed.port };
    } catch {
      return null;
    }
  }

  function isLoopbackHostname(hostname) {
    const normalized = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    if (normalized === 'localhost') return true;
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    if (net.isIP(normalized) === 4) return normalized === '127.0.0.1' || normalized.startsWith('127.');
    return false;
  }

  function isLoopbackPeerAddress(address) {
    if (typeof address !== 'string') return false;
    const normalized = address.trim().toLowerCase().replace(/^\[|\]$/g, '');
    if (!normalized) return false;
    if (normalized.startsWith('::ffff:')) return isLoopbackPeerAddress(normalized.slice('::ffff:'.length));
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    if (net.isIP(normalized) === 4) return normalized === '127.0.0.1' || normalized.startsWith('127.');
    return false;
  }

  function localOriginFromHeader(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'null' || trimmed.includes(',')) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      if (parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
      if (!isLoopbackHostname(parsed.hostname)) return null;
      return parsed.origin;
    } catch {
      return null;
    }
  }

  function validateLocalDaemonRequest(req) {
    if (!isLoopbackPeerAddress(req.socket?.remoteAddress)) {
      return { ok: false, message: 'request peer must be a loopback address', details: { peer: 'remoteAddress' } };
    }
    const host = normalizeLocalAuthority(req.get('host'));
    if (!host || !isLoopbackHostname(host.hostname)) {
      return { ok: false, message: 'request host must be a loopback daemon address', details: { header: 'host' } };
    }
    const originHeader = req.get('origin');
    if (originHeader !== undefined && !localOriginFromHeader(originHeader)) {
      return { ok: false, message: 'request origin must be a loopback daemon origin', details: { header: 'origin' } };
    }
    return { ok: true, origin: localOriginFromHeader(originHeader) };
  }

  function requireLocalDaemonRequest(req, res, next) {
    const validation = validateLocalDaemonRequest(req);
    if (!validation.ok) {
      return sendApiError(res, 403, 'FORBIDDEN', validation.message, validation.details ? { details: validation.details } : {});
    }
    res.setHeader('Vary', 'Origin');
    if (validation.origin) {
      res.setHeader('Access-Control-Allow-Origin', validation.origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    next();
  }

  function readBearerToken(req) {
    const header = req.headers.authorization;
    if (typeof header !== 'string') return null;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match ? match[1] : null;
  }

  function authorizeToolRequest(req, res, operation) {
    const endpoint = req.path;
    const validation = toolTokenRegistry.validate(readBearerToken(req), {
      endpoint,
      operation,
    });
    if (!validation.ok) {
      const status =
        validation.code === 'TOOL_ENDPOINT_DENIED' || validation.code === 'TOOL_OPERATION_DENIED'
          ? 403
          : 401;
      sendApiError(res, status, validation.code, validation.message, {
        details: { endpoint, operation },
      });
      return null;
    }
    return validation.grant;
  }

  function requestProjectOverride(candidate, grantedProjectId) {
    return typeof candidate === 'string' && candidate.length > 0 && candidate !== grantedProjectId;
  }

  function requestRunOverride(candidate, grantedRunId) {
    return typeof candidate === 'string' && candidate.length > 0 && candidate !== grantedRunId;
  }

  function sendLiveArtifactRouteError(res, err) {
    if (err instanceof LiveArtifactStoreValidationError) {
      return sendApiError(res, 400, 'LIVE_ARTIFACT_INVALID', err.message, {
        details: { kind: 'validation', issues: err.issues },
      });
    }
    if (err instanceof LiveArtifactRefreshUnavailableError) {
      return sendApiError(res, 400, 'LIVE_ARTIFACT_REFRESH_UNAVAILABLE', err.message);
    }
    if (err instanceof LiveArtifactRefreshLockError) {
      return sendApiError(res, 409, 'LIVE_ARTIFACT_REFRESH_LOCKED', err.message);
    }
    if (err instanceof LiveArtifactRefreshAbortError) {
      return sendApiError(res, 408, 'LIVE_ARTIFACT_REFRESH_ABORTED', err.message, {
        details: { kind: err.kind, timeoutMs: err.timeoutMs, step: err.step },
      });
    }
    if (err instanceof ConnectorServiceError) {
      return sendApiError(res, err.status, err.code, err.message, err.details === undefined ? {} : { details: err.details });
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found/i.test(msg)) return sendApiError(res, 404, 'NOT_FOUND', msg);
    sendApiError(res, 400, 'BAD_REQUEST', msg);
  }

  function setLiveArtifactPreviewHeaders(res) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'none'",
        "base-uri 'none'",
        "script-src 'none'",
        "object-src 'none'",
        "connect-src 'none'",
        "form-action 'none'",
        "frame-ancestors 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "style-src 'unsafe-inline'",
        'sandbox allow-same-origin',
      ].join('; '),
    );
  }

  function setLiveArtifactCodeHeaders(res) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
  }

  if (process.env.PIXELPITCH_CODEX_DISABLE_PLUGINS === '1') {
    console.log('[od] Codex plugins disabled via PIXELPITCH_CODEX_DISABLE_PLUGINS=1');
  }

  // Warm agent-capability probes (e.g. whether the installed Claude Code
  // build advertises --include-partial-messages) so the first /api/chat
  // hits a populated cache even if /api/agents hasn't been called yet.
  void detectAgents().catch(() => {});

  if (fs.existsSync(STATIC_DIR)) {
    app.use(express.static(STATIC_DIR));
  }

  app.get('/api/health', async (_req, res) => {
    const versionInfo = await readCurrentAppVersionInfo();
    res.json({ ok: true, version: versionInfo.version });
  });

  async function readinessPayload() {
    const versionInfo = await readCurrentAppVersionInfo();
    const checks = {
      database: 'ok',
      projectsDir: 'ok',
      resources: 'ok',
    };
    const details = {};

    try {
      db.prepare('SELECT 1').get();
    } catch (err) {
      checks.database = 'error';
      details.database = err instanceof Error ? err.message : String(err);
    }

    try {
      fs.mkdirSync(path.join(RUNTIME_DATA_DIR, 'projects'), { recursive: true });
      fs.accessSync(RUNTIME_DATA_DIR, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
      checks.projectsDir = 'error';
      details.projectsDir = err instanceof Error ? err.message : String(err);
    }

    try {
      await Promise.all([listSkills(), listDesignSystems()]);
    } catch (err) {
      checks.resources = 'error';
      details.resources = err instanceof Error ? err.message : String(err);
    }

    const ok = Object.values(checks).every((value) => value === 'ok');
    return {
      ok,
      status: ok ? 'ok' : 'degraded',
      version: versionInfo.version,
      checks,
      ...(Object.keys(details).length > 0 ? { details } : {}),
    };
  }

  app.get('/api/readyz', async (_req, res) => {
    const payload = await readinessPayload();
    res.status(payload.ok ? 200 : 503).json(payload);
  });

  app.get('/api/healthz', async (_req, res) => {
    const payload = await readinessPayload();
    res.status(payload.ok ? 200 : 503).json(payload);
  });

  app.get('/api/version', async (_req, res) => {
    const version = await readCurrentAppVersionInfo();
    res.json({ version });
  });

  // ---- Projects (DB-backed) -------------------------------------------------

  app.get('/api/projects', (_req, res) => {
    try {
      const latestRunStatuses = listLatestProjectRunStatuses(db);
      const awaitingInputProjects = listProjectsAwaitingInput(db);
      const activeRunStatuses = new Map();
      for (const run of design.runs.list()) {
        if (!run.projectId) continue;
        const runStatus = projectStatusFromRun(run);
        if (design.runs.isTerminal(run.status)) {
          const existing = latestRunStatuses.get(run.projectId);
          if (!existing || run.updatedAt > (existing.updatedAt ?? 0)) {
            latestRunStatuses.set(run.projectId, runStatus);
          }
        } else {
          const existing = activeRunStatuses.get(run.projectId);
          if (!existing || run.updatedAt > (existing.updatedAt ?? 0)) {
            activeRunStatuses.set(run.projectId, runStatus);
          }
        }
      }
      /** @type {import('@pixelpitch/contracts').ProjectsResponse} */
      const body = {
        projects: listProjects(db).map((project) => ({
          ...project,
          status: composeProjectDisplayStatus(
            activeRunStatuses.get(project.id) ??
              latestRunStatuses.get(project.id) ?? { value: 'not_started' },
            awaitingInputProjects,
            project.id,
          ),
        })),
      };
      res.json(body);
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', String(err));
    }
  });

  function projectStatusFromRun(run) {
    return {
      value: normalizeProjectDisplayStatus(run.status),
      updatedAt: run.updatedAt,
      runId: run.id,
    };
  }

  app.post('/api/projects', async (req, res) => {
    try {
      const { id, name, skillId, designSystemId, pendingPrompt, metadata } =
        req.body || {};
      if (typeof id !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(id)) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'invalid project id');
      }
      if (typeof name !== 'string' || !name.trim()) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'name required');
      }
      const now = Date.now();
      const project = insertProject(db, {
        id,
        name: name.trim(),
        skillId: skillId ?? null,
        designSystemId: designSystemId ?? null,
        pendingPrompt: pendingPrompt || null,
        metadata: metadata && typeof metadata === 'object' ? metadata : null,
        createdAt: now,
        updatedAt: now,
      });
      // Seed a default conversation so the UI always has somewhere to write.
      const cid = randomId();
      insertConversation(db, {
        id: cid,
        projectId: id,
        title: null,
        createdAt: now,
        updatedAt: now,
      });
      // For "from template" projects, seed the chosen template's snapshot
      // HTML into the new project folder so the agent can Read/edit files
      // on disk (the system prompt also embeds them, but a real on-disk
      // copy lets the agent treat them as the project's working state).
      if (
        metadata &&
        typeof metadata === 'object' &&
        metadata.kind === 'template' &&
        typeof metadata.templateId === 'string'
      ) {
        const tpl = getTemplate(db, metadata.templateId);
        if (tpl && Array.isArray(tpl.files) && tpl.files.length > 0) {
          await ensureProject(PROJECTS_DIR, id);
          for (const f of tpl.files) {
            if (
              !f ||
              typeof f.name !== 'string' ||
              typeof f.content !== 'string'
            ) {
              continue;
            }
            try {
              await writeProjectFile(
                PROJECTS_DIR,
                id,
                f.name,
                Buffer.from(f.content, 'utf8'),
              );
            } catch {
              // Skip individual file failures — the template snapshot is
              // best-effort; the agent still has the embedded copy.
            }
          }
        }
      }
      /** @type {import('@pixelpitch/contracts').CreateProjectResponse} */
      const body = { project, conversationId: cid };
      res.json(body);
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err));
    }
  });

  app.post(
    '/api/import/claude-design',
    importUpload.single('file'),
    async (req, res) => {
      try {
        if (!req.file)
          return res.status(400).json({ error: 'zip file required' });
        const originalName =
          req.file.originalname || 'Claude Design export.zip';
        if (!/\.zip$/i.test(originalName)) {
          fs.promises.unlink(req.file.path).catch(() => {});
          return res.status(400).json({ error: 'expected a .zip file' });
        }
        const id = randomId();
        const now = Date.now();
        const baseName =
          originalName.replace(/\.zip$/i, '').trim() || 'Claude Design import';
        const imported = await importClaudeDesignZip(
          req.file.path,
          projectDir(PROJECTS_DIR, id),
        );
        fs.promises.unlink(req.file.path).catch(() => {});

        const project = insertProject(db, {
          id,
          name: baseName,
          skillId: null,
          designSystemId: null,
          pendingPrompt: `Imported from Claude Design ZIP: ${originalName}. Continue editing ${imported.entryFile}.`,
          metadata: {
            kind: 'prototype',
            importedFrom: 'claude-design',
            entryFile: imported.entryFile,
            sourceFileName: originalName,
          },
          createdAt: now,
          updatedAt: now,
        });
        const cid = randomId();
        insertConversation(db, {
          id: cid,
          projectId: id,
          title: 'Imported Claude Design project',
          createdAt: now,
          updatedAt: now,
        });
        setTabs(db, id, [imported.entryFile], imported.entryFile);
        res.json({
          project,
          conversationId: cid,
          entryFile: imported.entryFile,
          files: imported.files,
        });
      } catch (err) {
        if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
        res.status(400).json({ error: String(err) });
      }
    },
  );

  app.post('/api/import/folder', async (req, res) => {
    try {
      const { baseDir, name, skillId, designSystemId } = req.body || {};
      if (typeof baseDir !== 'string' || !baseDir.trim()) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'baseDir required');
      }
      const trimmedInput = baseDir.trim();
      if (!path.isAbsolute(path.normalize(trimmedInput))) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'baseDir must be absolute');
      }

      let normalizedPath;
      try {
        normalizedPath = await fs.promises.realpath(trimmedInput);
      } catch {
        return sendApiError(res, 400, 'BAD_REQUEST', 'folder not found');
      }
      let dirStat;
      try {
        dirStat = await fs.promises.lstat(normalizedPath);
      } catch {
        return sendApiError(res, 400, 'BAD_REQUEST', 'folder not found');
      }
      if (!dirStat.isDirectory()) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'path must be a directory');
      }
      if (
        normalizedPath === RUNTIME_DATA_DIR_CANONICAL ||
        normalizedPath.startsWith(RUNTIME_DATA_DIR_CANONICAL + path.sep)
      ) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'cannot import the data directory');
      }

      const id = randomId();
      const now = Date.now();
      const projectName =
        typeof name === 'string' && name.trim()
          ? name.trim()
          : path.basename(normalizedPath);
      const entryFile = await detectEntryFile(normalizedPath);
      const project = insertProject(db, {
        id,
        name: projectName,
        skillId: skillId ?? null,
        designSystemId: designSystemId ?? null,
        pendingPrompt: null,
        metadata: {
          kind: 'prototype',
          baseDir: normalizedPath,
          importedFrom: 'folder',
          entryFile,
        },
        createdAt: now,
        updatedAt: now,
      });
      const cid = randomId();
      insertConversation(db, {
        id: cid,
        projectId: id,
        title: `Imported from ${projectName}`,
        createdAt: now,
        updatedAt: now,
      });
      if (entryFile) setTabs(db, id, [entryFile], entryFile);
      res.json({ project, conversationId: cid, entryFile });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = getProject(db, req.params.id);
    if (!project)
      return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
    /** @type {import('@pixelpitch/contracts').ProjectResponse} */
    const body = { project };
    res.json(body);
  });

  app.patch('/api/projects/:id', (req, res) => {
    try {
      const patch = req.body || {};
      if (patch.metadata && typeof patch.metadata === 'object') {
        const existing = getProject(db, req.params.id);
        const existingMeta = existing?.metadata;
        if (existingMeta?.baseDir) {
          if ('baseDir' in patch.metadata && patch.metadata.baseDir !== existingMeta.baseDir) {
            return sendApiError(
              res,
              400,
              'BAD_REQUEST',
              'baseDir is immutable after import; use a new import to change it',
            );
          }
          patch.metadata = {
            ...patch.metadata,
            baseDir: existingMeta.baseDir,
            ...(existingMeta.importedFrom === 'folder' ? { importedFrom: 'folder' } : {}),
          };
        } else if ('baseDir' in patch.metadata) {
          return sendApiError(
            res,
            400,
            'BAD_REQUEST',
            'baseDir can only be set via POST /api/import/folder',
          );
        }
      }
      if (patch.metadata?.linkedDirs) {
        const validated = validateLinkedDirs(patch.metadata.linkedDirs);
        if (validated.error) {
          return sendApiError(res, 400, 'INVALID_LINKED_DIR', validated.error);
        }
        patch.metadata.linkedDirs = validated.dirs;
      }
      const project = updateProject(db, req.params.id, patch);
      if (!project)
        return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      /** @type {import('@pixelpitch/contracts').ProjectResponse} */
      const body = { project };
      res.json(body);
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err));
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      dbDeleteProject(db, req.params.id);
      await removeProjectDir(PROJECTS_DIR, req.params.id).catch(() => {});
      /** @type {import('@pixelpitch/contracts').OkResponse} */
      const body = { ok: true };
      res.json(body);
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err));
    }
  });

  app.get('/api/projects/:id/events', (req, res) => {
    const project = getProject(db, req.params.id);
    if (!project) {
      return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
    }
    try {
      const sse = createSseResponse(res);
      const projectEventSink = (payload) => sse.send(payload.type, payload);
      const fileSubscription = subscribeFileEvents(
        PROJECTS_DIR,
        req.params.id,
        (payload) => sse.send(payload.type, { ...payload, projectId: req.params.id }),
        { metadata: project.metadata },
      );
      let sinks = activeProjectEventSinks.get(req.params.id);
      if (!sinks) {
        sinks = new Set();
        activeProjectEventSinks.set(req.params.id, sinks);
      }
      sinks.add(projectEventSink);
      sse.send('ready', { projectId: req.params.id });
      const cleanup = () => {
        void fileSubscription.unsubscribe();
        const currentSinks = activeProjectEventSinks.get(req.params.id);
        currentSinks?.delete(projectEventSink);
        if (currentSinks?.size === 0) activeProjectEventSinks.delete(req.params.id);
      };
      res.on('close', cleanup);
      res.on('finish', cleanup);
    } catch (err) {
      if (!res.headersSent) sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.post('/api/dialog/open-folder', async (req, res) => {
    try {
      const selectedPath = await openNativeFolderDialog();
      res.json({ path: selectedPath });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  // ---- Conversations --------------------------------------------------------

  app.get('/api/projects/:id/conversations', (req, res) => {
    if (!getProject(db, req.params.id)) {
      return res.status(404).json({ error: 'project not found' });
    }
    res.json({ conversations: listConversations(db, req.params.id) });
  });

  app.post('/api/projects/:id/conversations', (req, res) => {
    if (!getProject(db, req.params.id)) {
      return res.status(404).json({ error: 'project not found' });
    }
    const { title } = req.body || {};
    const now = Date.now();
    const conv = insertConversation(db, {
      id: randomId(),
      projectId: req.params.id,
      title: typeof title === 'string' ? title.trim() || null : null,
      createdAt: now,
      updatedAt: now,
    });
    res.json({ conversation: conv });
  });

  app.patch('/api/projects/:id/conversations/:cid', (req, res) => {
    const conv = getConversation(db, req.params.cid);
    if (!conv || conv.projectId !== req.params.id) {
      return res.status(404).json({ error: 'not found' });
    }
    const updated = updateConversation(db, req.params.cid, req.body || {});
    res.json({ conversation: updated });
  });

  app.delete('/api/projects/:id/conversations/:cid', (req, res) => {
    const conv = getConversation(db, req.params.cid);
    if (!conv || conv.projectId !== req.params.id) {
      return res.status(404).json({ error: 'not found' });
    }
    deleteConversation(db, req.params.cid);
    res.json({ ok: true });
  });

  app.get('/api/projects/:id/conversations/:cid/transcript', (req, res) => {
    const project = getProject(db, req.params.id);
    const conv = getConversation(db, req.params.cid);
    if (!project || !conv || conv.projectId !== req.params.id) {
      return res.status(404).json({ error: 'conversation not found' });
    }

    const format = String(req.query?.format || 'markdown').toLowerCase();
    if (!['markdown', 'md', 'json'].includes(format)) {
      return res.status(400).json({ error: 'format must be markdown or json' });
    }

    const payload = buildConversationTranscriptPayload(
      project,
      conv,
      listMessages(db, req.params.cid),
    );
    const baseSlug =
      sanitizeArchiveFilename(conv.title || project.name || conv.id) ||
      'conversation-transcript';
    const ext = format === 'json' ? 'json' : 'md';
    const filename = `${baseSlug}-transcript.${ext}`;
    const asciiFallback =
      filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_') ||
      `conversation-transcript.${ext}`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(`${JSON.stringify(payload, null, 2)}\n`);
      return;
    }

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.send(renderConversationTranscriptMarkdown(payload));
  });

  // ---- Messages -------------------------------------------------------------

  app.get('/api/projects/:id/conversations/:cid/messages', (req, res) => {
    const conv = getConversation(db, req.params.cid);
    if (!conv || conv.projectId !== req.params.id) {
      return res.status(404).json({ error: 'conversation not found' });
    }
    res.json({ messages: listMessages(db, req.params.cid) });
  });

  app.put('/api/projects/:id/conversations/:cid/messages/:mid', (req, res) => {
    const conv = getConversation(db, req.params.cid);
    if (!conv || conv.projectId !== req.params.id) {
      return res.status(404).json({ error: 'conversation not found' });
    }
    const m = req.body || {};
    if (m.id && m.id !== req.params.mid) {
      return res.status(400).json({ error: 'id mismatch' });
    }
    const saved = upsertMessage(db, req.params.cid, {
      ...m,
      id: req.params.mid,
    });
    // Bump the parent project's updatedAt so the project list re-orders.
    updateProject(db, req.params.id, {});
    res.json({ message: saved });
  });

  // ---- Preview comments ----------------------------------------------------

  app.get('/api/projects/:id/conversations/:cid/comments', (req, res) => {
    const conv = getConversation(db, req.params.cid);
    if (!conv || conv.projectId !== req.params.id) {
      return res.status(404).json({ error: 'conversation not found' });
    }
    res.json({
      comments: listPreviewComments(db, req.params.id, req.params.cid),
    });
  });

  app.post('/api/projects/:id/conversations/:cid/comments', (req, res) => {
    const conv = getConversation(db, req.params.cid);
    if (!conv || conv.projectId !== req.params.id) {
      return res.status(404).json({ error: 'conversation not found' });
    }
    try {
      const comment = upsertPreviewComment(
        db,
        req.params.id,
        req.params.cid,
        req.body || {},
      );
      updateProject(db, req.params.id, {});
      res.json({ comment });
    } catch (err) {
      res.status(400).json({ error: String(err?.message || err) });
    }
  });

  app.patch(
    '/api/projects/:id/conversations/:cid/comments/:commentId',
    (req, res) => {
      const conv = getConversation(db, req.params.cid);
      if (!conv || conv.projectId !== req.params.id) {
        return res.status(404).json({ error: 'conversation not found' });
      }
      try {
        const comment = updatePreviewCommentStatus(
          db,
          req.params.id,
          req.params.cid,
          req.params.commentId,
          req.body?.status,
        );
        if (!comment)
          return res.status(404).json({ error: 'comment not found' });
        updateProject(db, req.params.id, {});
        res.json({ comment });
      } catch (err) {
        res.status(400).json({ error: String(err?.message || err) });
      }
    },
  );

  app.delete(
    '/api/projects/:id/conversations/:cid/comments/:commentId',
    (req, res) => {
      const conv = getConversation(db, req.params.cid);
      if (!conv || conv.projectId !== req.params.id) {
        return res.status(404).json({ error: 'conversation not found' });
      }
      const ok = deletePreviewComment(
        db,
        req.params.id,
        req.params.cid,
        req.params.commentId,
      );
      if (!ok) return res.status(404).json({ error: 'comment not found' });
      updateProject(db, req.params.id, {});
      res.json({ ok: true });
    },
  );

  // ---- Tabs -----------------------------------------------------------------

  app.get('/api/projects/:id/tabs', (req, res) => {
    if (!getProject(db, req.params.id)) {
      return res.status(404).json({ error: 'project not found' });
    }
    res.json(listTabs(db, req.params.id));
  });

  app.put('/api/projects/:id/tabs', (req, res) => {
    if (!getProject(db, req.params.id)) {
      return res.status(404).json({ error: 'project not found' });
    }
    const { tabs = [], active = null } = req.body || {};
    if (!Array.isArray(tabs) || !tabs.every((t) => typeof t === 'string')) {
      return res.status(400).json({ error: 'tabs must be string[]' });
    }
    const result = setTabs(
      db,
      req.params.id,
      tabs,
      typeof active === 'string' ? active : null,
    );
    activeContext = {
      projectId: req.params.id,
      fileName: typeof result.active === 'string' ? result.active : null,
      ts: Date.now(),
    };
    res.json(result);
  });

  app.post('/api/active', (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    const body = req.body || {};
    if (body.active === false) {
      activeContext = null;
      return res.json({ active: false });
    }
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    if (!projectId || !getProject(db, projectId)) {
      return sendApiError(res, 400, 'BAD_REQUEST', 'valid projectId is required');
    }
    const fileName =
      typeof body.fileName === 'string' && body.fileName.length > 0
        ? body.fileName
        : null;
    activeContext = { projectId, fileName, ts: Date.now() };
    res.json({ active: true, ...activeContext });
  });

  app.get('/api/active', (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    if (!activeContext || Date.now() - activeContext.ts > ACTIVE_CONTEXT_TTL_MS) {
      activeContext = null;
      return res.json({ active: false });
    }
    const project = getProject(db, activeContext.projectId);
    if (!project) {
      activeContext = null;
      return res.json({ active: false });
    }
    res.json({
      active: true,
      projectId: activeContext.projectId,
      projectName: project.name ?? null,
      fileName: activeContext.fileName,
      ageMs: Date.now() - activeContext.ts,
    });
  });

  // ---- Templates ----------------------------------------------------------
  // User-saved snapshots of a project's HTML files. Surfaced in the
  // "From template" tab of the new-project panel so a user can spin up
  // a fresh project pre-seeded with another project's design as a
  // starting point. Created via the project's Share menu (snapshots
  // every .html file in the project folder at the moment of save).

  app.get('/api/templates', (_req, res) => {
    res.json({ templates: listTemplates(db) });
  });

  app.get('/api/templates/:id', (req, res) => {
    const t = getTemplate(db, req.params.id);
    if (!t) return res.status(404).json({ error: 'not found' });
    res.json({ template: t });
  });

  app.post('/api/templates', async (req, res) => {
    try {
      const { name, description, sourceProjectId } = req.body || {};
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'name required' });
      }
      if (typeof sourceProjectId !== 'string') {
        return res.status(400).json({ error: 'sourceProjectId required' });
      }
      if (!getProject(db, sourceProjectId)) {
        return res.status(404).json({ error: 'source project not found' });
      }
      // Snapshot every HTML / sketch / text file in the source project.
      // We deliberately skip binary uploads — templates are about the
      // generated design, not the user's reference imagery.
      const files = await listFiles(PROJECTS_DIR, sourceProjectId);
      const snapshot = [];
      for (const f of files) {
        if (f.kind !== 'html' && f.kind !== 'text' && f.kind !== 'code')
          continue;
        const entry = await readProjectFile(
          PROJECTS_DIR,
          sourceProjectId,
          f.name,
        );
        if (entry && Buffer.isBuffer(entry.buffer)) {
          snapshot.push({
            name: f.name,
            content: entry.buffer.toString('utf8'),
          });
        }
      }
      const t = insertTemplate(db, {
        id: randomId(),
        name: name.trim(),
        description: typeof description === 'string' ? description : null,
        sourceProjectId,
        files: snapshot,
        createdAt: Date.now(),
      });
      res.json({ template: t });
    } catch (err) {
      res.status(400).json({ error: String(err) });
    }
  });

  app.delete('/api/templates/:id', (req, res) => {
    deleteTemplate(db, req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/agents', async (_req, res) => {
    try {
      const list = await detectAgents();
      res.json({ agents: list });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/skills', async (_req, res) => {
    try {
      const skills = await listSkills(SKILLS_DIR);
      // Strip full body + on-disk dir from the listing — frontend fetches the
      // body via /api/skills/:id when needed (keeps the listing payload small).
      res.json({
        skills: skills.map(({ body, dir: _dir, ...rest }) => ({
          ...rest,
          hasBody: typeof body === 'string' && body.length > 0,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/skills/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const limit = Number.isFinite(Number(req.query.limit))
        ? Math.max(1, Math.min(25, Number(req.query.limit)))
        : 8;
      res.json({ skills: await searchSkills(SKILLS_DIR, q, limit) });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/skills/:id', async (req, res) => {
    try {
      const skills = await listSkills(SKILLS_DIR);
      const skill = skills.find((s) => s.id === req.params.id);
      if (!skill) return res.status(404).json({ error: 'skill not found' });
      const { dir: _dir, ...serializable } = skill;
      res.json(serializable);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/craft', async (req, res) => {
    try {
      const limit = Number.isFinite(Number(req.query.limit))
        ? Math.max(1, Math.min(50, Number(req.query.limit)))
        : 50;
      res.json({ craft: (await listCraftSections(CRAFT_DIR)).slice(0, limit) });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/craft/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const limit = Number.isFinite(Number(req.query.limit))
        ? Math.max(1, Math.min(25, Number(req.query.limit)))
        : 8;
      res.json({ craft: await searchCraftSections(CRAFT_DIR, q, limit) });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/directives', (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const limit = Number.isFinite(Number(req.query.limit))
        ? Math.max(1, Math.min(25, Number(req.query.limit)))
        : 12;
      if (q.trim()) {
        res.json({ directives: searchPromptDirectives(q, limit) });
        return;
      }
      res.json({ directives: listPromptDirectives().slice(0, limit) });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/context/search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const limit = Number.isFinite(Number(req.query.limit))
        ? Math.max(1, Math.min(50, Number(req.query.limit)))
        : 12;
      res.json({
        results: await searchContextRegistry({
          query: q,
          limit,
          skillsDir: SKILLS_DIR,
          designSystemsDir: DESIGN_SYSTEMS_DIR,
          craftDir: CRAFT_DIR,
        }),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/context/resolve', async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const project =
        typeof body.projectId === 'string' && body.projectId
          ? getProject(db, body.projectId)
          : null;
      const metadata = project?.metadata;
      const template =
        metadata?.kind === 'template' && typeof metadata.templateId === 'string'
          ? (getTemplate(db, metadata.templateId) ?? undefined)
          : undefined;
      const resolved = await resolveTurnContext({
        project,
        message: typeof body.message === 'string' ? body.message : '',
        skillId: body.skillId,
        skillIds: Array.isArray(body.skillIds) ? body.skillIds : [],
        designSystemId: body.designSystemId,
        designSystemIds: Array.isArray(body.designSystemIds) ? body.designSystemIds : [],
        craftIds: Array.isArray(body.craftIds) ? body.craftIds : [],
        directiveIds: Array.isArray(body.directiveIds) ? body.directiveIds : [],
        metadata,
        template,
        skillsDir: SKILLS_DIR,
        designSystemsDir: DESIGN_SYSTEMS_DIR,
        craftDir: CRAFT_DIR,
        includePrompt: Boolean(body.includePrompt),
      });
      const { prompt: _prompt, ...serializable } = resolved;
      res.json(serializable);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Codex hatch-pet registry — pets packaged by the upstream `hatch-pet`
  // skill under `${CODEX_HOME:-$HOME/.codex}/pets/`. Surfaced so the web
  // pet settings can offer one-click adoption of recently-hatched pets.
  app.get('/api/codex-pets', async (_req, res) => {
    try {
      const result = await listCodexPets({
        baseUrl: '',
        bundledRoot: BUNDLED_PETS_DIR,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // One-click community sync. Hits the Codex Pet Share + j20 Hatchery
  // catalogs and drops every pet into `${CODEX_HOME:-$HOME/.codex}/pets/`
  // so `GET /api/codex-pets` (and the web Pet settings) pick them up
  // immediately. The body is intentionally tiny — we keep the heavier
  // tuning knobs (`--limit`, `--concurrency`) on the CLI script and
  // only surface `force` + `source` here.
  app.post('/api/codex-pets/sync', async (req, res) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const sourceRaw = typeof body.source === 'string' ? body.source : 'all';
      const source =
        sourceRaw === 'petshare' || sourceRaw === 'hatchery'
          ? sourceRaw
          : 'all';
      const result = await syncCommunityPets({
        source,
        force: Boolean(body.force),
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: String((err && err.message) || err) });
    }
  });

  app.get('/api/codex-pets/:id/spritesheet', async (req, res) => {
    try {
      const sheet = await readCodexPetSpritesheet(req.params.id, {
        bundledRoot: BUNDLED_PETS_DIR,
      });
      if (!sheet) {
        return res
          .status(404)
          .type('text/plain')
          .send('codex pet spritesheet not found');
      }
      const mime =
        sheet.ext === 'webp'
          ? 'image/webp'
          : sheet.ext === 'gif'
            ? 'image/gif'
            : 'image/png';
      res.type(mime);
      // Same-origin callers (the web app proxies `/api/*` through to
      // the daemon, so PetSettings adoption fetches arrive same-origin)
      // do not need any CORS header here. We only echo
      // `Access-Control-Allow-Origin` for sandboxed iframes / data:
      // URIs (Origin: null) which need it to draw the bytes onto a
      // canvas without tainting. Local pet bytes should not be exposed
      // to arbitrary third-party origins via a wildcard ACAO.
      if (req.headers.origin === 'null') {
        res.setHeader('Access-Control-Allow-Origin', 'null');
      }
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(sheet.absPath);
    } catch (err) {
      res.status(500).type('text/plain').send(String(err));
    }
  });

  app.get('/api/design-systems', async (_req, res) => {
    try {
      const systems = await listDesignSystems(DESIGN_SYSTEMS_DIR);
      res.json({
        designSystems: systems.map(({ body, ...rest }) => rest),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/design-systems/:id', async (req, res) => {
    try {
      const body = await readDesignSystem(DESIGN_SYSTEMS_DIR, req.params.id);
      if (body === null)
        return res.status(404).json({ error: 'design system not found' });
      res.json({ id: req.params.id, body });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Serve tokens.css (colors_and_type.css) for a design system
  app.get('/api/design-systems/:id/tokens.css', async (req, res) => {
    const cssPath = path.join(DESIGN_SYSTEMS_DIR, req.params.id, 'colors_and_type.css');
    try {
      const css = await fs.promises.readFile(cssPath, 'utf-8');
      res.type('text/css').send(css);
    } catch { res.status(404).json({ error: 'No tokens.css for this design system' }); }
  });

  // Serve structured tokens JSON
  app.get('/api/design-systems/:id/tokens.json', async (req, res) => {
    const tokens = await readDesignSystemTokens(DESIGN_SYSTEMS_DIR, req.params.id);
    if (!tokens) return res.status(404).json({ error: 'No tokens.json for this design system' });
    res.json(tokens);
  });

  // List available preview cards
  app.get('/api/design-systems/:id/previews', async (req, res) => {
    const previews = await listDesignSystemPreviews(DESIGN_SYSTEMS_DIR, req.params.id);
    res.json({ previews });
  });

  // Serve a specific preview card with inlined CSS
  app.get('/api/design-systems/:id/preview/:card', async (req, res) => {
    const card = req.params.card;
    if (!/^[a-z0-9_-]+\.html$/i.test(card)) return res.status(400).json({ error: 'Invalid card name' });
    const systemDir = path.join(DESIGN_SYSTEMS_DIR, req.params.id);
    const htmlPath = path.join(systemDir, 'preview', card);
    const cssPath = path.join(systemDir, 'colors_and_type.css');
    const tokensPath = path.join(systemDir, 'tokens.json');
    try {
      let html = await fs.promises.readFile(htmlPath, 'utf-8');
      // Inline CSS so it works in srcDoc iframes (no base URL for relative paths)
      try {
        const css = await fs.promises.readFile(cssPath, 'utf-8');
        html = html.replace(
          /<link\s+rel=["']stylesheet["']\s+href=["']\.\.\/colors_and_type\.css["']\s*\/?>/gi,
          `<style>\n${css}\n</style>`
        );
      } catch { /* CSS not found */ }
      // Inline tokens.json as a global so fetch('../tokens.json') isn't needed
      try {
        const tokens = await fs.promises.readFile(tokensPath, 'utf-8');
        const tokensScript = `<script>window.__DESIGN_TOKENS__ = ${tokens};</script>`;
        html = html.replace('</head>', `${tokensScript}\n</head>`);
      } catch { /* tokens.json not found */ }
      res.type('text/html').send(html);
    } catch { res.status(404).json({ error: 'Preview card not found' }); }
  });

  app.get('/api/prompt-templates', async (_req, res) => {
    try {
      const templates = await listPromptTemplates(PROMPT_TEMPLATES_DIR);
      res.json({
        promptTemplates: templates.map(({ prompt: _prompt, ...rest }) => rest),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/prompt-templates/:surface/:id', async (req, res) => {
    try {
      const tpl = await readPromptTemplate(
        PROMPT_TEMPLATES_DIR,
        req.params.surface,
        req.params.id,
      );
      if (!tpl)
        return res.status(404).json({ error: 'prompt template not found' });
      res.json({ promptTemplate: tpl });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Showcase HTML for a design system — palette swatches, typography
  // samples, sample components, and the full DESIGN.md rendered as prose.
  // Built at request time from the on-disk DESIGN.md so any update to the
  // file shows up on the next view, no rebuild needed.
  app.get('/api/design-systems/:id/preview', async (req, res) => {
    try {
      const body = await readDesignSystem(DESIGN_SYSTEMS_DIR, req.params.id);
      if (body === null)
        return res.status(404).type('text/plain').send('not found');
      const html = renderDesignSystemPreview(req.params.id, body);
      res.type('text/html').send(html);
    } catch (err) {
      res.status(500).type('text/plain').send(String(err));
    }
  });

  // Marketing-style showcase derived from the same DESIGN.md — full landing
  // page parameterised by the system's tokens. Same lazy-render strategy as
  // /preview: built at request time, no caching.
  app.get('/api/design-systems/:id/showcase', async (req, res) => {
    try {
      const body = await readDesignSystem(DESIGN_SYSTEMS_DIR, req.params.id);
      if (body === null)
        return res.status(404).type('text/plain').send('not found');
      const html = renderDesignSystemShowcase(req.params.id, body);
      res.type('text/html').send(html);
    } catch (err) {
      res.status(500).type('text/plain').send(String(err));
    }
  });

  // Pre-built example HTML for a skill — what a typical artifact from this
  // skill looks like. Lets users browse skills without running an agent.
  //
  // The skill's `id` (from SKILL.md frontmatter `name`) can differ from its
  // on-disk folder name (e.g. id `magazine-web-ppt` lives in `skills/guizang-ppt/`),
  // so we resolve the actual directory via listSkills() rather than guessing.
  //
  // Resolution order:
  //   1. <skillDir>/example.html — fully-baked static example (preferred)
  //   2. <skillDir>/assets/template.html  +
  //      <skillDir>/assets/example-slides.html — assemble at request time
  //      by replacing the `<!-- SLIDES_HERE -->` marker with the snippet
  //      and patching the placeholder <title>. Lets a skill ship one
  //      canonical seed plus a small content fragment, so the example
  //      never drifts from the seed.
  //   3. <skillDir>/assets/template.html — raw template, no content slides
  //   4. <skillDir>/assets/index.html — generic fallback
  app.get('/api/skills/:id/example', async (req, res) => {
    try {
      const skills = await listSkills(SKILLS_DIR);
      const skill = skills.find((s) => s.id === req.params.id);
      if (!skill) {
        return res.status(404).type('text/plain').send('skill not found');
      }

      const baked = path.join(skill.dir, 'example.html');
      if (fs.existsSync(baked)) {
        return res.type('text/html').sendFile(baked);
      }

      const tpl = path.join(skill.dir, 'assets', 'template.html');
      const slides = path.join(skill.dir, 'assets', 'example-slides.html');
      if (fs.existsSync(tpl) && fs.existsSync(slides)) {
        try {
          const tplHtml = await fs.promises.readFile(tpl, 'utf8');
          const slidesHtml = await fs.promises.readFile(slides, 'utf8');
          const assembled = assembleExample(tplHtml, slidesHtml, skill.name);
          return res.type('text/html').send(assembled);
        } catch {
          // Fall through to raw template on read failure.
        }
      }
      if (fs.existsSync(tpl)) {
        return res.type('text/html').sendFile(tpl);
      }
      const idx = path.join(skill.dir, 'assets', 'index.html');
      if (fs.existsSync(idx)) {
        return res.type('text/html').sendFile(idx);
      }
      res
        .status(404)
        .type('text/plain')
        .send(
          'no example.html, assets/template.html, or assets/index.html for this skill',
        );
    } catch (err) {
      res.status(500).type('text/plain').send(String(err));
    }
  });

  app.post('/api/upload', upload.array('images', 8), (req, res) => {
    const files = (req.files || []).map((f) => ({
      name: f.originalname,
      path: f.path,
      size: f.size,
    }));
    res.json({ files });
  });

  // Persist a generated artifact (HTML) to disk so the user can re-open it
  // in their browser or hand it off. Returns the on-disk path + a served URL.
  // The body is also passed through the anti-slop linter; findings are
  // returned alongside the path so the UI can render a P0/P1 badge and the
  // chat layer can splice them into a system reminder for the agent.
  app.post('/api/artifacts/save', (req, res) => {
    try {
      const { identifier, title, html } = req.body || {};
      if (typeof html !== 'string' || html.length === 0) {
        return res.status(400).json({ error: 'html required' });
      }
      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
      const slug = sanitizeSlug(identifier || title || 'artifact');
      const dir = path.join(ARTIFACTS_DIR, `${stamp}-${slug}`);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, 'index.html');
      fs.writeFileSync(file, html, 'utf8');
      const findings = lintArtifact(html);
      res.json({
        path: file,
        url: `/artifacts/${path.basename(dir)}/index.html`,
        lint: findings,
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // Standalone lint endpoint — POST raw HTML, get findings back.
  // The chat layer uses this to lint streamed-in artifacts without writing
  // them to disk first, so a P0 issue can be surfaced before save.
  app.post('/api/artifacts/lint', (req, res) => {
    try {
      const { html } = req.body || {};
      if (typeof html !== 'string' || html.length === 0) {
        return res.status(400).json({ error: 'html required' });
      }
      const findings = lintArtifact(html);
      res.json({
        findings,
        agentMessage: renderFindingsForAgent(findings),
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/live-artifacts', async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (!projectId) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'projectId query parameter is required');
      }
      const artifacts = await listLiveArtifacts({ projectsRoot: PROJECTS_DIR, projectId });
      res.json({ artifacts });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.options('/api/live-artifacts/:artifactId/preview', requireLocalDaemonRequest, (_req, res) => {
    res.status(204).end();
  });

  app.get('/api/live-artifacts/:artifactId/preview', requireLocalDaemonRequest, async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (!projectId) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'projectId query parameter is required');
      }
      const variant = typeof req.query.variant === 'string' ? req.query.variant : 'rendered';
      if (variant === 'template' || variant === 'rendered-source') {
        const html = await readLiveArtifactCode({
          projectsRoot: PROJECTS_DIR,
          projectId,
          artifactId: req.params.artifactId,
          variant: variant === 'template' ? 'template' : 'rendered',
        });
        setLiveArtifactCodeHeaders(res);
        return res.status(200).send(html);
      }
      if (variant !== 'rendered') {
        return sendApiError(res, 400, 'BAD_REQUEST', 'variant must be rendered, template, or rendered-source');
      }
      const record = await ensureLiveArtifactPreview({
        projectsRoot: PROJECTS_DIR,
        projectId,
        artifactId: req.params.artifactId,
      });
      setLiveArtifactPreviewHeaders(res);
      res.status(200).send(record.html);
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.get('/api/live-artifacts/:artifactId', async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (!projectId) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'projectId query parameter is required');
      }
      const record = await getLiveArtifact({
        projectsRoot: PROJECTS_DIR,
        projectId,
        artifactId: req.params.artifactId,
      });
      res.json({ artifact: record.artifact });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.get('/api/live-artifacts/:artifactId/refreshes', async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (!projectId) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'projectId query parameter is required');
      }
      const refreshes = await listLiveArtifactRefreshLogEntries({
        projectsRoot: PROJECTS_DIR,
        projectId,
        artifactId: req.params.artifactId,
      });
      res.json({ refreshes });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.post('/api/tools/live-artifacts/create', async (req, res) => {
    try {
      const toolGrant = authorizeToolRequest(req, res, 'live-artifacts:create');
      if (!toolGrant) return;
      const { projectId, input, templateHtml, provenanceJson, createdByRunId } = req.body || {};
      if (requestProjectOverride(projectId, toolGrant.projectId)) {
        return sendApiError(res, 403, 'FORBIDDEN', 'projectId is derived from the tool token', {
          details: { suppliedProjectId: projectId },
        });
      }
      if (requestRunOverride(createdByRunId, toolGrant.runId)) {
        return sendApiError(res, 403, 'FORBIDDEN', 'createdByRunId is derived from the tool token', {
          details: { suppliedRunId: createdByRunId },
        });
      }
      const record = await createLiveArtifact({
        projectsRoot: PROJECTS_DIR,
        projectId: toolGrant.projectId,
        input: input ?? {},
        templateHtml,
        provenanceJson,
        createdByRunId: toolGrant.runId,
      });
      emitLiveArtifactEvent(toolGrant, 'created', record.artifact);
      res.json({ artifact: record.artifact });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.get('/api/tools/live-artifacts/list', async (req, res) => {
    try {
      const toolGrant = authorizeToolRequest(req, res, 'live-artifacts:list');
      if (!toolGrant) return;
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (requestProjectOverride(projectId, toolGrant.projectId)) {
        return sendApiError(res, 403, 'FORBIDDEN', 'projectId is derived from the tool token', {
          details: { suppliedProjectId: projectId },
        });
      }
      const artifacts = await listLiveArtifacts({ projectsRoot: PROJECTS_DIR, projectId: toolGrant.projectId });
      res.json({ artifacts });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.post('/api/tools/live-artifacts/update', async (req, res) => {
    try {
      const toolGrant = authorizeToolRequest(req, res, 'live-artifacts:update');
      if (!toolGrant) return;
      const { projectId, artifactId, input, templateHtml, provenanceJson } = req.body || {};
      if (requestProjectOverride(projectId, toolGrant.projectId)) {
        return sendApiError(res, 403, 'FORBIDDEN', 'projectId is derived from the tool token', {
          details: { suppliedProjectId: projectId },
        });
      }
      if (typeof artifactId !== 'string' || artifactId.length === 0) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'artifactId is required');
      }
      const record = await updateLiveArtifact({
        projectsRoot: PROJECTS_DIR,
        projectId: toolGrant.projectId,
        artifactId,
        input: input ?? {},
        templateHtml,
        provenanceJson,
      });
      emitLiveArtifactEvent(toolGrant, 'updated', record.artifact);
      res.json({ artifact: record.artifact });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.post('/api/tools/live-artifacts/refresh', async (req, res) => {
    try {
      const toolGrant = authorizeToolRequest(req, res, 'live-artifacts:refresh');
      if (!toolGrant) return;
      const { projectId, artifactId } = req.body || {};
      if (requestProjectOverride(projectId, toolGrant.projectId)) {
        return sendApiError(res, 403, 'FORBIDDEN', 'projectId is derived from the tool token', {
          details: { suppliedProjectId: projectId },
        });
      }
      if (typeof artifactId !== 'string' || artifactId.length === 0) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'artifactId is required');
      }
      let result;
      try {
        result = await refreshLiveArtifact({
          projectsRoot: PROJECTS_DIR,
          projectId: toolGrant.projectId,
          artifactId,
          onStarted: ({ refreshId }) => {
            emitLiveArtifactRefreshEvent(toolGrant, { phase: 'started', artifactId, refreshId });
          },
        });
      } catch (refreshErr) {
        emitLiveArtifactRefreshEvent(toolGrant, {
          phase: 'failed',
          artifactId,
          error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        });
        throw refreshErr;
      }
      emitLiveArtifactRefreshEvent(toolGrant, {
        phase: 'succeeded',
        artifactId,
        refreshId: result.refresh.id,
        title: result.artifact.title,
        refreshedSourceCount: result.refresh.refreshedSourceCount,
      });
      res.json(result);
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.patch('/api/live-artifacts/:artifactId', async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (!projectId) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'projectId query parameter is required');
      }
      const record = await updateLiveArtifact({
        projectsRoot: PROJECTS_DIR,
        projectId,
        artifactId: req.params.artifactId,
        input: req.body ?? {},
      });
      emitLiveArtifactEvent({ projectId }, 'updated', record.artifact);
      res.json({ artifact: record.artifact });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.delete('/api/live-artifacts/:artifactId', async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (!projectId) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'projectId query parameter is required');
      }
      const existing = await getLiveArtifact({
        projectsRoot: PROJECTS_DIR,
        projectId,
        artifactId: req.params.artifactId,
      });
      await deleteLiveArtifact({
        projectsRoot: PROJECTS_DIR,
        projectId,
        artifactId: req.params.artifactId,
      });
      updateProject(db, projectId, {});
      emitLiveArtifactEvent({ projectId }, 'deleted', existing.artifact);
      res.json({ ok: true });
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.options('/api/live-artifacts/:artifactId/refresh', requireLocalDaemonRequest, (_req, res) => {
    res.status(204).end();
  });

  app.post('/api/live-artifacts/:artifactId/refresh', requireLocalDaemonRequest, async (req, res) => {
    try {
      const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (!projectId) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'projectId query parameter is required');
      }
      let result;
      try {
        result = await refreshLiveArtifact({
          projectsRoot: PROJECTS_DIR,
          projectId,
          artifactId: req.params.artifactId,
          onStarted: ({ refreshId }) => {
            emitLiveArtifactRefreshEvent({ projectId }, { phase: 'started', artifactId: req.params.artifactId, refreshId });
          },
        });
      } catch (refreshErr) {
        emitLiveArtifactRefreshEvent({ projectId }, {
          phase: 'failed',
          artifactId: req.params.artifactId,
          error: refreshErr instanceof Error ? refreshErr.message : String(refreshErr),
        });
        throw refreshErr;
      }
      emitLiveArtifactRefreshEvent({ projectId }, {
        phase: 'succeeded',
        artifactId: req.params.artifactId,
        refreshId: result.refresh.id,
        title: result.artifact.title,
        refreshedSourceCount: result.refresh.refreshedSourceCount,
      });
      res.json(result);
    } catch (err) {
      sendLiveArtifactRouteError(res, err);
    }
  });

  app.use('/artifacts', express.static(ARTIFACTS_DIR));

  // ---- Deploy --------------------------------------------------------------

  app.get('/api/deploy/config', async (_req, res) => {
    try {
      /** @type {import('@pixelpitch/contracts').DeployConfigResponse} */
      const body = publicDeployConfig(await readCloudRunConfig());
      res.json(body);
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', String(err?.message || err));
    }
  });

  app.put('/api/deploy/config', async (req, res) => {
    try {
      /** @type {import('@pixelpitch/contracts').DeployConfigResponse} */
      const body = await writeCloudRunConfig(req.body || {});
      res.json(body);
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.get('/api/projects/:id/deployments', (req, res) => {
    try {
      /** @type {import('@pixelpitch/contracts').ProjectDeploymentsResponse} */
      const body = { deployments: listDeployments(db, req.params.id) };
      res.json(body);
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.post('/api/projects/:id/deploy', async (req, res) => {
    try {
      const { fileName, providerId = CLOUD_RUN_PROVIDER_ID } = req.body || {};
      if (providerId !== CLOUD_RUN_PROVIDER_ID) {
        return sendApiError(
          res,
          400,
          'BAD_REQUEST',
          'unsupported deploy provider',
        );
      }
      if (typeof fileName !== 'string' || !fileName.trim()) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'fileName required');
      }

      const prior = getDeployment(db, req.params.id, fileName, providerId);
      const files = await buildDeployFileSet(
        PROJECTS_DIR,
        req.params.id,
        fileName,
      );
      const result = await deployToCloudRun({
        config: await readCloudRunConfig(),
        files,
        projectId: req.params.id,
      });
      const now = Date.now();
      /** @type {import('@pixelpitch/contracts').DeployProjectFileResponse} */
      const body = upsertDeployment(db, {
        id: prior?.id ?? randomUUID(),
        projectId: req.params.id,
        fileName,
        providerId,
        url: result.url,
        deploymentId: result.deploymentId,
        deploymentCount: (prior?.deploymentCount ?? 0) + 1,
        target: 'preview',
        status: result.status,
        statusMessage: result.statusMessage,
        reachableAt: result.reachableAt,
        createdAt: prior?.createdAt ?? now,
        updatedAt: now,
      });
      res.json(body);
    } catch (err) {
      const status = err instanceof DeployError ? err.status : 400;
      const init =
        err instanceof DeployError && err.details
          ? { details: err.details }
          : {};
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err?.message || err),
        init,
      );
    }
  });

  app.post('/api/projects/:id/deploy/preflight', async (req, res) => {
    try {
      const { fileName, providerId = CLOUD_RUN_PROVIDER_ID } = req.body || {};
      if (providerId !== CLOUD_RUN_PROVIDER_ID) {
        return sendApiError(
          res,
          400,
          'BAD_REQUEST',
          'unsupported deploy provider',
        );
      }
      if (typeof fileName !== 'string' || !fileName.trim()) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'fileName required');
      }
      /** @type {import('@pixelpitch/contracts').DeployPreflightResponse} */
      const body = await prepareDeployPreflight(
        PROJECTS_DIR,
        req.params.id,
        fileName,
      );
      res.json(body);
    } catch (err) {
      // DeployError is a known/expected outcome (validation, missing file).
      // Anything else points at a bug or an unexpected runtime state, so
      // surface it in the daemon log without leaking internals to the
      // client which still gets a generic 400.
      if (!(err instanceof DeployError)) {
        console.error('[deploy/preflight]', err);
      }
      const status = err instanceof DeployError ? err.status : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err?.message || err),
      );
    }
  });

  app.post(
    '/api/projects/:id/deployments/:deploymentId/check-link',
    async (req, res) => {
      try {
        const existing = getDeploymentById(
          db,
          req.params.id,
          req.params.deploymentId,
        );
        if (!existing) {
          return sendApiError(
            res,
            404,
            'FILE_NOT_FOUND',
            'deployment not found',
          );
        }
        const result = await checkDeploymentUrl(existing.url);
        const now = Date.now();
        /** @type {import('@pixelpitch/contracts').CheckDeploymentLinkResponse} */
        const body = upsertDeployment(db, {
          ...existing,
          status: result.reachable ? 'ready' : result.status || 'link-delayed',
          statusMessage: result.reachable
            ? 'Public link is ready.'
            : result.statusMessage ||
              'Cloud Run is still preparing the public link.',
          reachableAt: result.reachable ? now : existing.reachableAt,
          updatedAt: now,
        });
        res.json(body);
      } catch (err) {
        sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
      }
    },
  );

  // Shared device frames (iPhone, Android, iPad, MacBook, browser chrome).
  // Skills can compose multi-screen / multi-device layouts by pointing at
  // these files via `<iframe src="/frames/iphone-15-pro.html?screen=...">`.
  // No mtime-based caching — frames are static and small.
  app.use('/frames', express.static(FRAMES_DIR));

  // Project files. Each project owns a flat folder under .pixelpitch/projects/<id>/
  // containing every file the user has uploaded, pasted, sketched, or that
  // the agent has generated. Names are sanitized; paths are confined to the
  // project's own folder (see apps/daemon/src/projects.ts).
  app.get('/api/projects/:id/files', async (req, res) => {
    try {
      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      const since = Number(req.query?.since);
      const files = await listFiles(PROJECTS_DIR, req.params.id, {
        metadata: project.metadata,
        since: Number.isFinite(since) ? since : undefined,
      });
      /** @type {import('@pixelpitch/contracts').ProjectFilesResponse} */
      const body = { files };
      res.json(body);
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err));
    }
  });

  app.get('/api/projects/:id/search', async (req, res) => {
    try {
      const query = String(req.query.q ?? '');
      if (!query) {
        sendApiError(res, 400, 'BAD_REQUEST', 'q query parameter is required');
        return;
      }
      const pattern = req.query.pattern ? String(req.query.pattern) : null;
      const max = Math.min(Number(req.query.max) || 200, 1000);
      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      const matches = await searchProjectFiles(PROJECTS_DIR, req.params.id, query, {
        metadata: project.metadata,
        pattern,
        max,
      });
      res.json({ query, matches });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err));
    }
  });

  app.post('/api/projects/:id/edit-ops/apply', async (req, res) => {
    try {
      const project = getProject(db, req.params.id);
      if (!project) {
        return sendApiError(res, 404, 'FILE_NOT_FOUND', 'project not found');
      }
      const operations = Array.isArray(req.body?.operations)
        ? req.body.operations
        : [];
      if (operations.length === 0) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'operations required');
      }
      if (operations.length > 100) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'too many edit operations');
      }

      const byFile = new Map();
      for (const operation of operations) {
        const fileName = operation?.target?.fileName;
        if (typeof fileName !== 'string' || !fileName.trim()) {
          return sendApiError(res, 400, 'BAD_REQUEST', 'operation target.fileName required');
        }
        const list = byFile.get(fileName) ?? [];
        list.push(operation);
        byFile.set(fileName, list);
      }

      const applied = [];
      for (const [fileName, fileOperations] of byFile.entries()) {
        if (!/\.html?$/i.test(fileName)) {
          return sendApiError(res, 400, 'BAD_REQUEST', 'deterministic edit ops currently support HTML files only');
        }
        const edited = await applyProjectEditOperations(req.params.id, fileName, fileOperations, project.metadata);
        applied.push(...edited);
      }

      updateProject(db, req.params.id, {});
      /** @type {import('@pixelpitch/contracts').ApplyElementEditsResponse} */
      const body = { ok: true, applied };
      res.json(body);
    } catch (err) {
      if (err instanceof HtmlEditOperationError) {
        return sendApiError(res, 400, 'BAD_REQUEST', err.message, err.details ? { details: err.details } : undefined);
      }
      const status = err && err.code === 'ENOENT' ? 404 : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err?.message || err),
      );
    }
  });

  // Streams a ZIP of the project's on-disk tree so the "Download as .zip"
  // share menu can hand the user the actual files they uploaded — e.g. the
  // imported `ui-design/` folder — instead of a one-file snapshot of the
  // rendered HTML. `root` scopes the archive to a subdirectory; without
  // it, the whole project is packed.
  app.get('/api/projects/:id/archive', async (req, res) => {
    try {
      const root = typeof req.query?.root === 'string' ? req.query.root : '';
      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      const fallbackName = project?.name || req.params.id;
      const { buffer, baseName } = await buildProjectArchive(
        PROJECTS_DIR,
        req.params.id,
        root,
        project.metadata,
        fallbackName,
      );
      const fileSlug = sanitizeArchiveFilename(baseName || fallbackName) || 'project';
      const filename = `${fileSlug}.zip`;
      // RFC 5987 dance: legacy `filename=` carries an ASCII fallback, while
      // `filename*=UTF-8''…` lets modern browsers pick up project names
      // with non-ASCII characters (accents, CJK, etc.) without mojibake.
      const asciiFallback =
        filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_') || 'project.zip';
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );
      res.send(buffer);
    } catch (err) {
      const code = err && err.code;
      const status = code === 'ENOENT' || code === 'ENOTDIR' ? 404 : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err?.message || err),
      );
    }
  });

  app.post('/api/projects/:id/export/pptx', async (req, res) => {
    try {
      const { fileName } = req.body || {};
      if (typeof fileName !== 'string' || !fileName.trim()) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'fileName required');
      }
      if (!/\.html?$/i.test(fileName)) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'only HTML files can be exported to PPTX');
      }

      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      await ensureProject(PROJECTS_DIR, req.params.id, project.metadata);
      const dir = await ensureProject(PROJECTS_DIR, req.params.id, project.metadata);
      const input = await readProjectFile(PROJECTS_DIR, req.params.id, fileName, project.metadata);
      const inputPath = path.join(dir, input.path || fileName);
      if (!isPathWithin(dir, inputPath)) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'file path escapes project');
      }

      const sourceBase = path.basename(fileName).replace(/\.html?$/i, '') || 'deck';
      const outputName = sanitizeName(`${sourceBase}.pptx`);
      const outputPath = path.join(dir, outputName);
      const reportName = sanitizeName(`${sourceBase}.slidify-report.json`);
      const reportPath = path.join(dir, reportName);
      const result = await runPptxExport({
        inputPath,
        outputPath,
        projectRoot: PROJECT_ROOT,
        reportPath,
        skillsDir: SKILLS_DIR,
      });

      const file = await writeProjectFile(
        PROJECTS_DIR,
        req.params.id,
        outputName,
        await fs.promises.readFile(outputPath),
        { metadata: project.metadata },
      );
      /** @type {import('@pixelpitch/contracts').ProjectFileResponse & { audit: { ok: boolean; output: string }; report: unknown }} */
      const body = { file, audit: result.audit, report: result.report };
      res.json(body);
    } catch (err) {
      if (err instanceof PptxExportError) {
        return sendApiError(
          res,
          500,
          'INTERNAL_ERROR',
          err.message,
          { details: { code: err.code, stderr: err.stderr.slice(-4000), stdout: err.stdout.slice(-4000) } },
        );
      }
      const status = err && err.code === 'ENOENT' ? 404 : 500;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'INTERNAL_ERROR',
        String(err?.message || err),
      );
    }
  });

  // Preflight for the raw file route. Current artifact fetches are simple GETs
  // (no preflight needed), but an explicit handler future-proofs the route if
  // artifacts ever add custom request headers.
  app.options('/api/projects/:id/raw/*', (req, res) => {
    if (req.headers.origin === 'null') {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
    }
    res.sendStatus(204);
  });

  app.get('/api/projects/:id/raw/*', async (req, res) => {
    try {
      const relPath = req.params[0];
      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      const file = await readProjectFile(PROJECTS_DIR, req.params.id, relPath, project.metadata);
      // PreviewModal loads artifact HTML via srcdoc, giving the iframe Origin: "null".
      // data: URIs, file://, and some sandboxed iframes also send null — all are
      // local-only callers, so this is safe. Real cross-origin sites send a real
      // origin and remain blocked by the browser's same-origin policy.
      if (req.headers.origin === 'null') {
        res.header('Access-Control-Allow-Origin', '*');
      }
      sendBufferWithRange(req, res, file);
    } catch (err) {
      const status = err && err.code === 'ENOENT' ? 404 : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err),
      );
    }
  });

  app.post('/api/projects/:id/export/pdf', async (req, res) => {
    if (typeof desktopPdfExporter !== 'function') {
      return sendApiError(
        res,
        501,
        'UPSTREAM_UNAVAILABLE',
        'desktop PDF export is only available in the desktop runtime',
      );
    }
    try {
      const { fileName, title, deck } = req.body || {};
      if (typeof fileName !== 'string' || fileName.length === 0) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'fileName required');
      }
      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      const input = await buildDesktopPdfExportInput({
        daemonUrl: `http://127.0.0.1:${resolvedPort}`,
        deck: deck === true,
        fileName,
        metadata: project.metadata,
        projectId: req.params.id,
        projectsRoot: PROJECTS_DIR,
        title: typeof title === 'string' ? title : undefined,
      });
      const result = await desktopPdfExporter(input);
      res.json(result);
    } catch (err) {
      const status = err && err.code === 'ENOENT' ? 404 : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err?.message || err),
      );
    }
  });

  app.delete('/api/projects/:id/raw/*', async (req, res) => {
    try {
      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      await deleteProjectFile(PROJECTS_DIR, req.params.id, req.params[0], project.metadata);
      /** @type {import('@pixelpitch/contracts').DeleteProjectFileResponse} */
      const body = { ok: true };
      res.json(body);
    } catch (err) {
      const status = err && err.code === 'ENOENT' ? 404 : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err),
      );
    }
  });

  app.get('/api/projects/:id/files/:name/preview', async (req, res) => {
    try {
      const file = await readProjectFile(
        PROJECTS_DIR,
        req.params.id,
        req.params.name,
        getProject(db, req.params.id)?.metadata,
      );
      const preview = await buildDocumentPreview(file);
      res.json(preview);
    } catch (err) {
      const status =
        err && err.statusCode
          ? err.statusCode
          : err && err.code === 'ENOENT'
            ? 404
            : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        err?.message || 'preview unavailable',
      );
    }
  });

  app.get('/api/projects/:id/files/:name', async (req, res) => {
    try {
      const file = await readProjectFile(
        PROJECTS_DIR,
        req.params.id,
        req.params.name,
        getProject(db, req.params.id)?.metadata,
      );
      sendBufferWithRange(req, res, file);
    } catch (err) {
      const status = err && err.code === 'ENOENT' ? 404 : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err),
      );
    }
  });

  // Two ways to upload: multipart for binary files (images), and JSON
  // {name, content, encoding} for sketches and pasted text. The frontend
  // uses both depending on the file source.
  app.post(
    '/api/projects/:id/files',
    (req, res, next) => {
      upload.single('file')(req, res, (err) => {
        if (err) return sendMulterError(res, err);
        next();
      });
    },
    async (req, res) => {
      try {
        const project = getProject(db, req.params.id);
        if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
        await ensureProject(PROJECTS_DIR, req.params.id, project.metadata);
        if (req.file) {
          const buf = await fs.promises.readFile(req.file.path);
          const desiredName = sanitizeName(
            req.body?.name || req.file.originalname,
          );
          const meta = await writeProjectFile(
            PROJECTS_DIR,
            req.params.id,
            desiredName,
            buf,
            { metadata: project.metadata },
          );
          fs.promises.unlink(req.file.path).catch(() => {});
          /** @type {import('@pixelpitch/contracts').ProjectFileResponse} */
          const body = { file: meta };
          return res.json(body);
        }
        const { name, content, encoding, artifactManifest } = req.body || {};
        if (typeof name !== 'string' || typeof content !== 'string') {
          return sendApiError(
            res,
            400,
            'BAD_REQUEST',
            'name and content required',
          );
        }
        if (artifactManifest !== undefined && artifactManifest !== null) {
          const validated = validateArtifactManifestInput(
            artifactManifest,
            name,
          );
          if (!validated.ok) {
            return sendApiError(
              res,
              400,
              'BAD_REQUEST',
              `invalid artifactManifest: ${validated.error}`,
            );
          }
        }
        const buf =
          encoding === 'base64'
            ? Buffer.from(content, 'base64')
            : Buffer.from(content, 'utf8');
        const meta = await writeProjectFile(
          PROJECTS_DIR,
          req.params.id,
          name,
          buf,
          {
            artifactManifest,
            metadata: project.metadata,
          },
        );
        /** @type {import('@pixelpitch/contracts').ProjectFileResponse} */
        const body = { file: meta };
        res.json(body);
      } catch (err) {
        sendApiError(res, 500, 'INTERNAL_ERROR', 'upload failed');
      }
    },
  );

  app.delete('/api/projects/:id/files/:name', async (req, res) => {
    try {
      const project = getProject(db, req.params.id);
      if (!project) return sendApiError(res, 404, 'PROJECT_NOT_FOUND', 'not found');
      await deleteProjectFile(PROJECTS_DIR, req.params.id, req.params.name, project.metadata);
      /** @type {import('@pixelpitch/contracts').DeleteProjectFileResponse} */
      const body = { ok: true };
      res.json(body);
    } catch (err) {
      const status = err && err.code === 'ENOENT' ? 404 : 400;
      sendApiError(
        res,
        status,
        status === 404 ? 'FILE_NOT_FOUND' : 'BAD_REQUEST',
        String(err),
      );
    }
  });

  app.get('/api/media/models', (_req, res) => {
    res.json({
      providers: MEDIA_PROVIDERS,
      image: IMAGE_MODELS,
      video: VIDEO_MODELS,
      audio: AUDIO_MODELS_BY_KIND,
      aspects: MEDIA_ASPECTS,
      videoLengthsSec: VIDEO_LENGTHS_SEC,
      audioDurationsSec: AUDIO_DURATIONS_SEC,
    });
  });

  app.get('/api/media/config', async (_req, res) => {
    try {
      const cfg = await readMaskedConfig(RUNTIME_DATA_DIR);
      res.json(cfg);
    } catch (err) {
      res
        .status(500)
        .json({ error: String(err && err.message ? err.message : err) });
    }
  });

  app.put('/api/media/config', async (req, res) => {
    try {
      const cfg = await writeConfig(RUNTIME_DATA_DIR, req.body);
      res.json(cfg);
    } catch (err) {
      const status = typeof err?.status === 'number' ? err.status : 400;
      res
        .status(status)
        .json({ error: String(err && err.message ? err.message : err) });
    }
  });

  app.get('/api/connectors/composio/config', (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    try {
      res.json(readPublicComposioConfig());
    } catch (err) {
      res.status(500).json({ error: String(err && err.message ? err.message : err) });
    }
  });

  app.put('/api/connectors/composio/config', (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    try {
      const cfg = writeComposioConfig(req.body);
      deleteConnectorCredentialsByProvider('composio');
      res.json(cfg);
    } catch (err) {
      res.status(400).json({ error: String(err && err.message ? err.message : err) });
    }
  });

  registerConnectorRoutes(app, {
    sendApiError,
    authorizeToolRequest,
    projectsRoot: PROJECTS_DIR,
    requireLocalDaemonRequest,
  });

  app.get('/api/app-config', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    try {
      const config = await readAppConfig(RUNTIME_DATA_DIR);
      res.json({ config });
    } catch (err) {
      res
        .status(500)
        .json({ error: String(err && err.message ? err.message : err) });
    }
  });

  app.put('/api/app-config', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    try {
      const config = await writeAppConfig(RUNTIME_DATA_DIR, req.body);
      orbitService.configure(config.orbit);
      res.json({ config });
    } catch (err) {
      res
        .status(500)
        .json({ error: String(err && err.message ? err.message : err) });
    }
  });

  app.get('/api/memory', async (req, res) => {
    try {
      const [config, index, entries] = await Promise.all([
        readMemoryConfig(RUNTIME_DATA_DIR),
        readMemoryIndex(RUNTIME_DATA_DIR),
        listMemoryEntries(RUNTIME_DATA_DIR),
      ]);
      res.json({
        enabled: config.enabled,
        rootDir: memoryDir(RUNTIME_DATA_DIR),
        index,
        entries,
        extraction: maskMemoryExtractionConfig(config.extraction),
      });
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', String(err?.message || err));
    }
  });

  app.get('/api/memory/system-prompt', async (req, res) => {
    try {
      res.json({ body: await composeMemoryBody(RUNTIME_DATA_DIR) });
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', String(err?.message || err));
    }
  });

  app.get('/api/memory/events', (req, res) => {
    const sse = createSseResponse(res);
    const onChange = (event) => sse.send('memory', event);
    memoryEvents.on('change', onChange);
    res.on('close', () => {
      memoryEvents.off('change', onChange);
      sse.cleanup();
    });
  });

  app.post('/api/memory/extract', async (req, res) => {
    try {
      const changed = await extractFromMessage(RUNTIME_DATA_DIR, cleanString(req.body?.userMessage));
      res.json({ changed, attemptedLLM: false });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.put('/api/memory/index', async (req, res) => {
    try {
      await writeMemoryIndex(RUNTIME_DATA_DIR, cleanString(req.body?.index));
      res.json({ ok: true });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.patch('/api/memory/config', async (req, res) => {
    try {
      res.json(await writeMemoryConfig(RUNTIME_DATA_DIR, req.body || {}));
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.post('/api/memory', async (req, res) => {
    try {
      const entry = await upsertMemoryEntry(RUNTIME_DATA_DIR, req.body || {});
      res.json({ entry });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.get('/api/memory/:id', async (req, res) => {
    const entry = await readMemoryEntry(RUNTIME_DATA_DIR, req.params.id);
    if (!entry) return sendApiError(res, 404, 'NOT_FOUND', 'memory entry not found');
    res.json({ entry });
  });

  app.put('/api/memory/:id', async (req, res) => {
    try {
      const entry = await upsertMemoryEntry(RUNTIME_DATA_DIR, {
        ...(req.body || {}),
        id: req.params.id,
      });
      res.json({ entry });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.delete('/api/memory/:id', async (req, res) => {
    try {
      await deleteMemoryEntry(RUNTIME_DATA_DIR, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.get('/api/mcp/servers', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    try {
      const config = await readMcpConfig(RUNTIME_DATA_DIR);
      res.json({ servers: config.servers, templates: MCP_TEMPLATES });
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', String(err?.message || err));
    }
  });

  app.put('/api/mcp/servers', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    try {
      const config = await writeMcpConfig(RUNTIME_DATA_DIR, req.body || {});
      res.json({ servers: config.servers, templates: MCP_TEMPLATES });
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.get('/api/mcp/install-info', (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    const cliPath = PIXELPITCH_BIN;
    const execPath = process.execPath;
    res.json(buildMcpInstallPayload({
      cliPath,
      cliExists: fs.existsSync(cliPath),
      execPath,
      nodeExists: fs.existsSync(execPath),
      port: resolvedPort,
      platform: process.platform,
      dataDir: RUNTIME_DATA_DIR,
      electronAsNode: process.env.ELECTRON_RUN_AS_NODE === '1',
    }));
  });

  app.get('/api/mcp/oauth/status', (_req, res) => {
    res.json({ connected: false });
  });

  app.post('/api/mcp/oauth/start', (_req, res) => {
    sendApiError(res, 501, 'UPSTREAM_UNAVAILABLE', 'MCP OAuth flow is not configured in this runtime');
  });

  app.post('/api/mcp/oauth/disconnect', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/projects/:id/media/generate', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({
        error:
          'cross-origin request rejected: media generation is restricted to the local UI / CLI',
      });
    }

    try {
      const projectId = req.params.id;
      const project = getProject(db, projectId);
      if (!project) return res.status(404).json({ error: 'project not found' });

      const taskId = randomUUID();
      const task = createMediaTask(taskId, projectId, {
        surface: req.body?.surface,
        model: req.body?.model,
      });
      console.error(
        `[task ${taskId.slice(0, 8)}] queued model=${req.body?.model} ` +
          `surface=${req.body?.surface} ` +
          `image=${req.body?.image ? 'yes' : 'no'} ` +
          `compositionDir=${req.body?.compositionDir ? 'yes' : 'no'}`,
      );

      task.status = 'running';
      generateMedia({
        projectRoot: PROJECT_ROOT,
        dataDir: RUNTIME_DATA_DIR,
        projectsRoot: PROJECTS_DIR,
        projectId,
        surface: req.body?.surface,
        model: req.body?.model,
        prompt: req.body?.prompt,
        output: req.body?.output,
        aspect: req.body?.aspect,
        length:
          typeof req.body?.length === 'number' ? req.body.length : undefined,
        duration:
          typeof req.body?.duration === 'number'
            ? req.body.duration
            : undefined,
        voice: req.body?.voice,
        audioKind: req.body?.audioKind,
        compositionDir: req.body?.compositionDir,
        image: req.body?.image,
        onProgress: (line) => appendTaskProgress(task, line),
      })
        .then((meta) => {
          task.status = 'done';
          task.file = meta;
          task.endedAt = Date.now();
          notifyTaskWaiters(task);
          console.error(
            `[task ${taskId.slice(0, 8)}] done size=${meta?.size} mime=${meta?.mime} ` +
              `elapsed=${Math.round((task.endedAt - task.startedAt) / 1000)}s`,
          );
        })
        .catch((err) => {
          task.status = 'failed';
          task.error = {
            message: String(err && err.message ? err.message : err),
            status: typeof err?.status === 'number' ? err.status : 400,
            code: err?.code,
          };
          task.endedAt = Date.now();
          notifyTaskWaiters(task);
          console.error(
            `[task ${taskId.slice(0, 8)}] failed status=${task.error.status} ` +
              `message=${(task.error.message || '').slice(0, 240)}`,
          );
        });

      res.status(202).json({
        taskId,
        status: task.status,
        startedAt: task.startedAt,
      });
    } catch (err) {
      const status = typeof err?.status === 'number' ? err.status : 400;
      const code = err?.code;
      const body = { error: String(err && err.message ? err.message : err) };
      if (code) body.code = code;
      res.status(status).json(body);
    }
  });

  app.post('/api/media/tasks/:id/wait', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    const taskId = req.params.id;
    const task = mediaTasks.get(taskId);
    if (!task) return res.status(404).json({ error: 'task not found' });

    const since = Number.isFinite(req.body?.since) ? Number(req.body.since) : 0;
    const requestedTimeout = Number.isFinite(req.body?.timeoutMs)
      ? Number(req.body.timeoutMs)
      : 25_000;
    const timeoutMs = Math.min(Math.max(requestedTimeout, 0), 25_000);

    const respond = () => {
      if (res.writableEnded) return;
      const snapshot = {
        taskId,
        status: task.status,
        startedAt: task.startedAt,
        endedAt: task.endedAt,
        progress: task.progress.slice(since),
        nextSince: task.progress.length,
      };
      if (task.status === 'done') snapshot.file = task.file;
      if (task.status === 'failed') snapshot.error = task.error;
      res.json(snapshot);
    };

    if (
      task.status === 'done' ||
      task.status === 'failed' ||
      task.progress.length > since
    ) {
      return respond();
    }

    let resolved = false;
    const wake = () => {
      if (resolved) return;
      resolved = true;
      task.waiters.delete(wake);
      clearTimeout(timer);
      respond();
    };
    task.waiters.add(wake);
    const timer = setTimeout(wake, timeoutMs);
    res.on('close', wake);
  });

  app.get('/api/projects/:id/media/tasks', (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    const projectId = req.params.id;
    const includeDone =
      req.query.includeDone === '1' || req.query.includeDone === 'true';
    const tasks = [];
    for (const t of mediaTasks.values()) {
      if (t.projectId !== projectId) continue;
      const isTerminal = t.status === 'done' || t.status === 'failed';
      if (isTerminal && !includeDone) continue;
      tasks.push({
        taskId: t.id,
        status: t.status,
        startedAt: t.startedAt,
        endedAt: t.endedAt,
        elapsed: Math.round(((t.endedAt ?? Date.now()) - t.startedAt) / 1000),
        surface: t.surface,
        model: t.model,
        progress: t.progress.slice(-3),
        progressCount: t.progress.length,
        ...(t.status === 'done' ? { file: t.file } : {}),
        ...(t.status === 'failed' ? { error: t.error } : {}),
      });
    }
    tasks.sort((a, b) => b.startedAt - a.startedAt);
    res.json({ tasks });
  });

  // Multi-file upload that the chat composer uses for paste/drop/picker.
  // Files land flat in the project folder; the response carries the same
  // metadata as listFiles so the client can stage them as ChatAttachments
  // without a separate refetch.
  app.post(
    '/api/projects/:id/upload',
    handleProjectUpload,
    async (req, res) => {
      try {
        const incoming = Array.isArray(req.files) ? req.files : [];
        const out = [];
        for (const f of incoming) {
          try {
            const stat = await fs.promises.stat(f.path);
            out.push({
              name: f.filename,
              path: f.filename,
              size: stat.size,
              mtime: stat.mtimeMs,
              originalName: f.originalname,
            });
          } catch {
            // skip files that vanished mid-flight
          }
        }
        /** @type {import('@pixelpitch/contracts').UploadProjectFilesResponse} */
        const body = { files: out };
        res.json(body);
      } catch (err) {
        sendApiError(res, 500, 'INTERNAL_ERROR', 'upload failed');
      }
    },
  );

  const design = {
    runs: createChatRunService({ createSseResponse, createSseErrorPayload }),
  };
  const parallelCritiqueEnabled =
    ['1', 'true', 'yes'].includes(
      String(process.env.PIXELPITCH_CRITIQUE_PARALLEL_ENABLED ?? '').trim().toLowerCase(),
    );
  const composeCritiquePanelPrompt = ({
    role,
    round,
    prompt,
    cwd,
    cfg,
    runtimeToolPrompt,
  }) => [
    '# Pixelpitch Critique Theater panelist',
    '',
    'You are a real child agent in a parallel critique panel, not a simulated persona.',
    `Panel role: ${role}`,
    `Round: ${round}`,
    `Score scale: 0-${cfg.scoreScale}`,
    `Ship threshold: ${cfg.scoreThreshold}`,
    cwd ? `Project directory to inspect: ${cwd}` : '',
    runtimeToolPrompt ? `\n${runtimeToolPrompt}` : '',
    '',
    'Review independently from your assigned role. Use project files and runtime tools when they help you verify the artifact. Do not modify files.',
    '',
    'Return ONLY a JSON object with this exact shape:',
    '{"role":"critic","score":8,"dimensions":[{"name":"Hierarchy","score":8,"note":"Short note."}],"mustFix":["Specific blocker."]}',
    '',
    'Use your assigned role in the JSON role field. Keep notes short and actionable. Put only true blockers in mustFix.',
    '',
    '# Artifact/request to review',
    '',
    prompt,
  ].filter(Boolean).join('\n');
  const agentRunService = createAgentRunService({
    runs: design.runs,
    toolTokenRegistry,
    daemonUrl: `http://127.0.0.1:${resolvedPort}`,
    pixelpitchBin: PIXELPITCH_BIN,
    projectRoot: PROJECT_ROOT,
    artifactsDir: ARTIFACTS_DIR,
    db,
    critiqueCfg,
    parallelCritiqueEnabled,
    critiqueRunRegistry,
    critiqueWarnedAdapters,
    createSseErrorPayload,
    composeCritiquePanelPrompt,
    registerChatAgentEventSink(runId, sink) {
      activeChatAgentEventSinks.set(runId, sink);
    },
    unregisterChatAgentEventSink(runId) {
      activeChatAgentEventSinks.delete(runId);
    },
  });

  const composeDaemonSystemPrompt = async ({
    projectId,
    skillId,
    skillIds,
    designSystemId,
    designSystemIds,
    craftIds,
    directiveIds,
    message,
  }) => {
    const project =
      typeof projectId === 'string' && projectId
        ? getProject(db, projectId)
        : null;
    const metadata = project?.metadata;
    const template =
      metadata?.kind === 'template' && typeof metadata.templateId === 'string'
        ? (getTemplate(db, metadata.templateId) ?? undefined)
        : undefined;
    const resolved = await resolveTurnContext({
      project,
      message,
      skillId,
      skillIds,
      designSystemId,
      designSystemIds,
      craftIds,
      directiveIds,
      metadata,
      template,
      skillsDir: SKILLS_DIR,
      designSystemsDir: DESIGN_SYSTEMS_DIR,
      craftDir: CRAFT_DIR,
      includePrompt: true,
    });
    const memoryBody = await composeMemoryBody(RUNTIME_DATA_DIR);
    return [
      memoryBody ? `# Memory\n\n${memoryBody}` : '',
      resolved.prompt,
      renderContextTraceForAgent(resolved),
    ].filter(Boolean).join('\n\n---\n\n');
  };

  const startChatRun = async (chatBody, run) => {
    /** @type {Partial<ChatRequest> & { imagePaths?: string[] }} */
    chatBody = chatBody || {};
    const {
      agentId,
      message,
      systemPrompt,
      imagePaths = [],
      projectId,
      conversationId,
      assistantMessageId,
      clientRequestId,
      skillId,
      skillIds = [],
      designSystemId,
      designSystemIds = [],
      craftIds = [],
      directiveIds = [],
      attachments = [],
      commentAttachments = [],
      model,
      reasoning,
    } = chatBody;
    if (typeof projectId === 'string' && projectId) run.projectId = projectId;
    if (typeof conversationId === 'string' && conversationId)
      run.conversationId = conversationId;
    if (typeof assistantMessageId === 'string' && assistantMessageId)
      run.assistantMessageId = assistantMessageId;
    if (typeof clientRequestId === 'string' && clientRequestId)
      run.clientRequestId = clientRequestId;
    if (typeof agentId === 'string' && agentId) run.agentId = agentId;
    const def = getAgentDef(agentId);
    if (!def)
      return design.runs.fail(
        run,
        'AGENT_UNAVAILABLE',
        `unknown agent: ${agentId}`,
      );
    if (!def.bin)
      return design.runs.fail(run, 'AGENT_UNAVAILABLE', 'agent has no binary');
    const safeCommentAttachments =
      normalizeCommentAttachments(commentAttachments);
    if (
      (typeof message !== 'string' || !message.trim()) &&
      safeCommentAttachments.length === 0
    ) {
      return design.runs.fail(run, 'BAD_REQUEST', 'message required');
    }
    if (run.cancelRequested || design.runs.isTerminal(run.status)) return;
    const runId = run.id;

    // Resolve the project working directory (creating the folder if it
    // doesn't exist yet). Without one we don't pass cwd to spawn — the
    // agent then runs in whatever inherited dir, which still lets API
    // mode work but loses file-tool addressability.
    let cwd = null;
    let existingProjectFiles = [];
    let projectRecord = null;
    if (typeof projectId === 'string' && projectId) {
      try {
        projectRecord = getProject(db, projectId);
        cwd = await ensureProject(PROJECTS_DIR, projectId, projectRecord?.metadata);
        existingProjectFiles = await listFiles(PROJECTS_DIR, projectId, {
          metadata: projectRecord?.metadata,
        });
      } catch {
        cwd = null;
      }
    }
    if (run.cancelRequested || design.runs.isTerminal(run.status)) return;

    if (cwd && isManagedProjectCwd(cwd, PROJECTS_DIR)) {
      try {
        const mcpConfig = await readMcpConfig(RUNTIME_DATA_DIR);
        await writeClaudeMcpConfigForCwd(cwd, mcpConfig.servers);
      } catch (err) {
        console.warn('[mcp] failed to write project .mcp.json:', err?.message || err);
      }
    }

    // Sanitise supplied image paths: must live under UPLOAD_DIR.
    let safeImages = imagePaths.filter((p) => {
      const resolved = path.resolve(p);
      return (
        resolved.startsWith(UPLOAD_DIR + path.sep) && fs.existsSync(resolved)
      );
    });

    // Project-scoped attachments: project-relative paths inside cwd. Each
    // is run through the same path-traversal guard the file CRUD endpoints
    // use, then existence-checked. Whatever survives shows up as an
    // explicit list at the bottom of the user message so the agent knows
    // to Read it.
    const safeAttachments = cwd
      ? (Array.isArray(attachments) ? attachments : [])
          .filter((p) => typeof p === 'string' && p.length > 0)
          .filter((p) => {
            try {
              const abs = path.resolve(cwd, p);
              return (
                (abs === cwd || abs.startsWith(cwd + path.sep)) &&
                fs.existsSync(abs)
              );
            } catch {
              return false;
            }
          })
      : [];
    if (cwd && safeCommentAttachments.length > 0) {
      const commentImages = safeCommentAttachments
        .map((item) => item.screenshotPath)
        .filter((p) => typeof p === 'string' && p.length > 0)
        .map((p) => {
          try {
            const abs = path.resolve(cwd, p);
            return (abs === cwd || abs.startsWith(cwd + path.sep)) && fs.existsSync(abs) ? abs : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      safeImages = Array.from(new Set([...safeImages, ...commentImages]));
    }

    // Local code agents don't accept a separate "system" channel the way the
    // Messages API does — we fold the skill + design-system prompt into the
    // user message. The <artifact> wrapping instruction comes from
    // systemPrompt. We also stitch in the cwd hint so the agent knows
    // where its file tools should write, and the attachment list so it
    // doesn't have to guess what the user just dropped in.
    // Also ship the current file listing so the agent can pick a unique
    // filename instead of clobbering a previous artifact.
    const filesListBlock = existingProjectFiles.length
      ? `\nFiles already in this folder (do NOT overwrite unless the user asks; pick a fresh, descriptive name for new artifacts):\n${existingProjectFiles
          .map((f) => `- ${f.name}`)
          .join('\n')}`
      : '\nThis folder is empty. Choose a clear, descriptive filename for whatever you create.';
    const cwdHint = cwd
      ? `\n\nYour working directory: ${cwd}\nWrite project files relative to it (e.g. \`index.html\`, \`assets/x.png\`). The user can browse those files in real time.${filesListBlock}`
      : '';
    const linkedDirs = (() => {
      if (!Array.isArray(projectRecord?.metadata?.linkedDirs)) return [];
      const validated = validateLinkedDirs(projectRecord.metadata.linkedDirs);
      return validated.error ? [] : validated.dirs;
    })();
    const linkedDirsHint = linkedDirs.length
      ? `\n\nLinked code folders (read-only reference code the user wants you to see):\n${linkedDirs
          .map((dir) => `- \`${dir}\``)
          .join('\n')}`
      : '';
    const attachmentHint = safeAttachments.length
      ? `\n\nAttached project files: ${safeAttachments.map((p) => `\`${p}\``).join(', ')}${
          safeAttachments.some((p) => /\.(?:html?|jsx?|tsx?|css)$/i.test(p))
            ? '\nFor HTML/deck/code entry files, read the complete referenced artifact bundle before reasoning or editing; the entry file may only be a shell that imports slides, CSS, and assets. Prefer Pixelpitch get_artifact/include=auto or equivalent over a single-file read.'
            : ''
        }`
      : '';
    const send = (event, data) => design.runs.emit(run, event, data);
    const toolContext = agentRunService.createToolContext({
      runId,
      projectId,
      cwd,
      send,
    });
    const runtimeToolPrompt = toolContext.runtimeToolPrompt;
    const commentHint = renderCommentAttachmentHint(safeCommentAttachments);
    await extractFromMessage(RUNTIME_DATA_DIR, message);
    const daemonSystemPrompt = await composeDaemonSystemPrompt({
      projectId,
      skillId,
      skillIds,
      designSystemId,
      designSystemIds,
      craftIds,
      directiveIds,
      message,
    });
    const instructionPrompt = [daemonSystemPrompt, runtimeToolPrompt, systemPrompt]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join('\n\n---\n\n');
    const composed = [
      instructionPrompt
        ? `# Instructions (read first)\n\n${instructionPrompt}${cwdHint}${linkedDirsHint}\n\n---\n`
        : cwdHint
          ? `# Instructions${cwdHint}${linkedDirsHint}\n\n---\n`
          : linkedDirsHint
            ? `# Instructions${linkedDirsHint}\n\n---\n`
            : '',
      `# User request\n\n${message || '(No extra typed instruction.)'}${attachmentHint}${commentHint}`,
      safeImages.length
        ? `\n\n${safeImages.map((p) => `@${p}`).join(' ')}`
        : '',
    ].join('');

    // Skill seeds (`skills/<id>/assets/template.html`) and design-system
    // specs (`design-systems/<id>/DESIGN.md`) live outside the project cwd.
    // The composed system prompt asks the agent to Read them via absolute
    // paths in the skill-root preamble — without an explicit allowlist,
    // Claude Code blocks those reads (issue #6: "no permission to read
    // skills template"). We surface both roots so any agent that honours
    // `--add-dir` can resolve those side files.
    const extraAllowedDirs = [SKILLS_DIR, DESIGN_SYSTEMS_DIR].filter((d) =>
      fs.existsSync(d),
    );
    // Per-agent model + reasoning the user picked in the model menu.
    // Trust the value when it matches the most recent /api/agents listing
    // (live or fallback). Otherwise allow it through if it passes a
    // permissive sanitizer — that's the path for user-typed custom model
    // ids the CLI's listing didn't surface yet.
    const safeModel =
      typeof model === 'string'
        ? isKnownModel(def, model)
          ? model
          : sanitizeCustomModel(model)
        : null;
    const safeReasoning =
      typeof reasoning === 'string' && Array.isArray(def.reasoningOptions)
        ? (def.reasoningOptions.find((r) => r.id === reasoning)?.id ?? null)
        : null;
    const agentOptions = { model: safeModel, reasoning: safeReasoning };

    const resolvedBin = resolveAgentBin(agentId);

    // If detection can't find the binary, surface a friendly SSE error
    // pointing at /api/agents instead of silently falling back to
    // spawn(def.bin) — that fallback re-introduces the exact ENOENT symptom
    // from issue #10.
    if (!resolvedBin) {
      toolContext.cleanup('child_exit');
      design.runs.emit(
        run,
        'error',
        createSseErrorPayload(
          'AGENT_UNAVAILABLE',
          `Agent "${def.name}" (\`${def.bin}\`) is not installed or not on PATH. ` +
            'Install it and refresh the agent list (GET /api/agents) before retrying.',
          { retryable: true },
        ),
      );
      return design.runs.finish(run, 'failed', 1, null);
    }

    const args = def.buildArgs(
      composed,
      safeImages,
      extraAllowedDirs,
      agentOptions,
      { cwd },
    );
    return agentRunService.startPreparedAgentRun({
      run,
      runId,
      agentId,
      def,
      resolvedBin,
      args,
      prompt: composed,
      cwd,
      projectId,
      conversationId,
      safeModel,
      safeReasoning,
      toolContext,
    });
  };

  app.post('/api/tools/delegation/send', async (req, res) => {
    try {
      const toolGrant = authorizeToolRequest(req, res, 'delegation:send');
      if (!toolGrant) return;
      const task = typeof req.body?.task === 'string' ? req.body.task.trim() : '';
      if (!task) return sendApiError(res, 400, 'BAD_REQUEST', 'task required');
      if (task.length > 12000) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'task is too long');
      }

      const parentRun = design.runs.get(toolGrant.runId);
      if (!parentRun) return sendApiError(res, 404, 'NOT_FOUND', 'parent run not found');
      if (design.runs.isTerminal(parentRun.status)) {
        return sendApiError(res, 409, 'BAD_REQUEST', 'parent run is already complete');
      }

      const requestedAgentId =
        typeof req.body?.agentId === 'string' && req.body.agentId.trim()
          ? req.body.agentId.trim()
          : parentRun.agentId;
      const def = getAgentDef(requestedAgentId);
      if (!def) return sendApiError(res, 400, 'AGENT_UNAVAILABLE', `unknown agent: ${requestedAgentId}`);
      if (!def.bin) return sendApiError(res, 400, 'AGENT_UNAVAILABLE', 'agent has no binary');
      if ((def.streamFormat ?? 'plain') !== 'plain') {
        return sendApiError(
          res,
          400,
          'BAD_REQUEST',
          `delegation currently requires a plain-stream adapter, got ${def.streamFormat}`,
        );
      }
      const resolvedBin = resolveAgentBin(requestedAgentId);
      if (!resolvedBin) {
        return sendApiError(
          res,
          400,
          'AGENT_UNAVAILABLE',
          `Agent "${def.name}" (\`${def.bin}\`) is not installed or not on PATH.`,
          { retryable: true },
        );
      }

      const cwd = await ensureProject(PROJECTS_DIR, toolGrant.projectId);
      const safeModel =
        typeof req.body?.model === 'string'
          ? isKnownModel(def, req.body.model)
            ? req.body.model
            : sanitizeCustomModel(req.body.model)
          : null;
      const safeReasoning =
        typeof req.body?.reasoning === 'string' && Array.isArray(def.reasoningOptions)
          ? (def.reasoningOptions.find((r) => r.id === req.body.reasoning)?.id ?? null)
          : null;
      const timeoutMs = Math.max(
        1000,
        Math.min(Number(req.body?.timeoutMs) || 10 * 60 * 1000, 30 * 60 * 1000),
      );
      const parentSend = (event, data) => design.runs.emit(parentRun, event, data);
      const result = await agentRunService.sendDelegatedTask({
        parentRun,
        parentSend,
        agentId: requestedAgentId,
        def,
        resolvedBin,
        cwd,
        projectId: toolGrant.projectId,
        conversationId: parentRun.conversationId,
        safeModel,
        safeReasoning,
        task,
        timeoutMs,
      });
      res.json({ ok: result.status === 'succeeded', ...result });
    } catch (err) {
      sendApiError(
        res,
        400,
        'BAD_REQUEST',
        err instanceof Error ? err.message : String(err),
      );
    }
  });

  app.post('/api/tools/delegation/workflow', async (req, res) => {
    try {
      const toolGrant = authorizeToolRequest(req, res, 'delegation:workflow');
      if (!toolGrant) return;
      const request = typeof req.body?.request === 'string' ? req.body.request.trim() : '';
      if (!request) return sendApiError(res, 400, 'BAD_REQUEST', 'request required');
      if (request.length > 16000) {
        return sendApiError(res, 400, 'BAD_REQUEST', 'request is too long');
      }

      const parentRun = design.runs.get(toolGrant.runId);
      if (!parentRun) return sendApiError(res, 404, 'NOT_FOUND', 'parent run not found');
      if (design.runs.isTerminal(parentRun.status)) {
        return sendApiError(res, 409, 'BAD_REQUEST', 'parent run is already complete');
      }

      const requestedAgentId =
        typeof req.body?.agentId === 'string' && req.body.agentId.trim()
          ? req.body.agentId.trim()
          : parentRun.agentId;
      const def = getAgentDef(requestedAgentId);
      if (!def) return sendApiError(res, 400, 'AGENT_UNAVAILABLE', `unknown agent: ${requestedAgentId}`);
      if (!def.bin) return sendApiError(res, 400, 'AGENT_UNAVAILABLE', 'agent has no binary');
      if ((def.streamFormat ?? 'plain') !== 'plain') {
        return sendApiError(
          res,
          400,
          'BAD_REQUEST',
          `delegation workflow currently requires a plain-stream adapter, got ${def.streamFormat}`,
        );
      }
      const resolvedBin = resolveAgentBin(requestedAgentId);
      if (!resolvedBin) {
        return sendApiError(
          res,
          400,
          'AGENT_UNAVAILABLE',
          `Agent "${def.name}" (\`${def.bin}\`) is not installed or not on PATH.`,
          { retryable: true },
        );
      }

      const cwd = await ensureProject(PROJECTS_DIR, toolGrant.projectId);
      const safeModel =
        typeof req.body?.model === 'string'
          ? isKnownModel(def, req.body.model)
            ? req.body.model
            : sanitizeCustomModel(req.body.model)
          : null;
      const safeReasoning =
        typeof req.body?.reasoning === 'string' && Array.isArray(def.reasoningOptions)
          ? (def.reasoningOptions.find((r) => r.id === req.body.reasoning)?.id ?? null)
          : null;
      const timeoutMs = Math.max(
        1000,
        Math.min(Number(req.body?.timeoutMs) || 10 * 60 * 1000, 30 * 60 * 1000),
      );
      const parentSend = (event, data) => design.runs.emit(parentRun, event, data);
      const usePlanner = req.body?.planner !== false;
      let plan = planSpecialistWorkflow(request);
      let planner = { used: false, status: 'skipped', error: null };
      if (usePlanner) {
        const workflowId = `planner-${Date.now().toString(36)}`;
        parentSend('agent', {
          type: 'delegation_workflow',
          workflowId,
          event: 'planner_started',
          status: 'running',
        });
        const plannerResult = await agentRunService.sendDelegatedTask({
          parentRun,
          parentSend,
          agentId: requestedAgentId,
          def,
          resolvedBin,
          cwd,
          projectId: toolGrant.projectId,
          conversationId: parentRun.conversationId,
          safeModel,
          safeReasoning,
          task: buildSpecialistPlannerPrompt(request),
          timeoutMs: Math.min(timeoutMs, 5 * 60 * 1000),
        });
        try {
          if (plannerResult.status !== 'succeeded') {
            throw new Error(`planner exited with status ${plannerResult.status}`);
          }
          plan = parseSpecialistPlannerOutput(plannerResult.stdout, request);
          planner = { used: true, status: 'succeeded', error: null };
          parentSend('agent', {
            type: 'delegation_workflow',
            workflowId,
            event: 'planner_succeeded',
            status: 'succeeded',
            taskCount: plan.tasks.length,
            tasks: plan.tasks.map((task) => ({
              id: task.id,
              title: task.title,
              specialist: task.specialist,
              dependsOn: task.dependsOn ?? [],
            })),
          });
        } catch (err) {
          planner = {
            used: true,
            status: 'fallback',
            error: err instanceof Error ? err.message : String(err),
          };
          parentSend('agent', {
            type: 'delegation_workflow',
            workflowId,
            event: 'planner_fallback',
            status: 'fallback',
            detail: planner.error,
          });
        }
      }
      const result = await agentRunService.runSpecialistWorkflow({
        parentRun,
        parentSend,
        agentId: requestedAgentId,
        def,
        resolvedBin,
        cwd,
        projectId: toolGrant.projectId,
        conversationId: parentRun.conversationId,
        safeModel,
        safeReasoning,
        plan,
        timeoutMs,
      });
      res.json({ ok: result.status === 'succeeded', planner, ...result });
    } catch (err) {
      sendApiError(
        res,
        400,
        'BAD_REQUEST',
        err instanceof Error ? err.message : String(err),
      );
    }
  });

  orbitService.setTemplateResolver(async (skillId) => {
    const skills = await listSkills(SKILLS_DIR);
    const skill = skills.find((item) => item.id === skillId);
    if (!skill || skill.scenario !== 'orbit') return null;
    return {
      id: skill.id,
      name: skill.name,
      examplePrompt: skill.examplePrompt || '',
      dir: skill.dir,
      body: skill.body || '',
      designSystemRequired: skill.designSystemRequired !== false,
    };
  });

  orbitService.setRunHandler(async ({
    trigger,
    startedAt,
    prompt,
    systemPrompt,
    template,
  }) => {
    const config = await readAppConfig(RUNTIME_DATA_DIR);
    const availableAgents = detectAgents();
    const configuredAgent = typeof config.agentId === 'string' && config.agentId
      ? availableAgents.find((agent) => agent.id === config.agentId && agent.available)
      : null;
    const fallbackAgent = availableAgents.find((agent) => agent.available);
    const agent = configuredAgent ?? fallbackAgent;
    if (!agent) {
      throw new Error('No available agent is configured for Orbit. Choose an agent in Settings first.');
    }

    const projectId = `orbit-${randomUUID()}`;
    const conversationId = `orbit-conv-${randomUUID()}`;
    const assistantMessageId = `orbit-assistant-${randomUUID()}`;
    const now = Date.now();
    const project = insertProject(db, {
      id: projectId,
      name: `Orbit · ${formatLocalProjectTimestamp(startedAt)}`,
      skillId: template?.id ?? 'live-artifact',
      designSystemId: config.designSystemId ?? null,
      pendingPrompt: prompt,
      metadata: { kind: 'orbit', trigger },
      createdAt: now,
      updatedAt: now,
    });
    insertConversation(db, {
      id: conversationId,
      projectId,
      title: 'Orbit daily digest',
      createdAt: now,
      updatedAt: now,
    });

    const run = design.runs.create({
      projectId,
      conversationId,
      assistantMessageId,
      agentId: agent.id,
      clientRequestId: `orbit-${trigger}-${randomUUID()}`,
    });
    const body = {
      agentId: agent.id,
      conversationId,
      designSystemId: project.designSystemId,
      message: prompt,
      projectId,
      skillId: template?.id ?? project.skillId,
      systemPrompt: [systemPrompt, renderOrbitTemplateSystemPrompt(template)]
        .map((part) => (typeof part === 'string' ? part.trim() : ''))
        .filter(Boolean)
        .join('\n\n'),
    };
    design.runs.start(run, () => startChatRun(body, run));

    return {
      projectId,
      agentRunId: run.id,
      completion: design.runs.wait(run).then((status) => ({
        agentRunId: run.id,
        status: status.status,
        summary: `Orbit run ${status.status}.`,
      })),
    };
  });

  const routineService = new RoutineService({
    list: () => listRoutines(db).map((row) => routineDbRowToContract(row, null)),
    insertRun: (run) => {
      insertRoutineRun(db, {
        routineId: run.routineId,
        id: run.id,
        trigger: run.trigger,
        status: run.status,
        projectId: run.projectId,
        conversationId: run.conversationId,
        agentRunId: run.agentRunId,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        summary: run.summary,
        error: run.error,
      });
    },
    updateRun: (id, patch) => updateRoutineRun(db, id, patch),
    getLatestRun: (routineId) => getLatestRoutineRun(db, routineId),
  });

  routineService.setRunHandler(async ({ routine, trigger, startedAt }) => {
    const config = await readAppConfig(RUNTIME_DATA_DIR);
    let agentId = routine.agentId
      || (typeof config.agentId === 'string' && config.agentId ? config.agentId : null);
    if (!agentId) {
      const agents = detectAgents(config.agentCliEnv ?? {});
      agentId = agents.find((agent) => agent.available)?.id ?? null;
    }
    if (!agentId) {
      throw new Error('No available agent is configured. Choose an agent in Settings first.');
    }

    const now = startedAt;
    const stamp = formatLocalProjectTimestamp(new Date(now).toISOString());
    let projectId;
    let projectName;
    if (routine.target.mode === 'reuse') {
      const project = getProject(db, routine.target.projectId);
      if (!project) throw new Error(`Routine target project ${routine.target.projectId} not found`);
      projectId = project.id;
      projectName = project.name;
    } else {
      projectId = `routine-${randomUUID()}`;
      projectName = `${routine.name} · ${stamp}`;
      insertProject(db, {
        id: projectId,
        name: projectName,
        skillId: routine.skillId ?? null,
        designSystemId: config.designSystemId ?? null,
        pendingPrompt: null,
        metadata: { kind: 'other', intent: 'routine', routineId: routine.id, trigger },
        createdAt: now,
        updatedAt: now,
      });
    }

    const conversationId = `routine-conv-${randomUUID()}`;
    const conversationTitle = routine.target.mode === 'reuse'
      ? `${routine.name} · ${stamp}`
      : projectName;
    insertConversation(db, {
      id: conversationId,
      projectId,
      title: conversationTitle,
      createdAt: now,
      updatedAt: now,
    });

    const assistantMessageId = `routine-assistant-${randomUUID()}`;
    const run = design.runs.create({
      projectId,
      conversationId,
      assistantMessageId,
      clientRequestId: `routine-${trigger}-${randomUUID()}`,
      agentId,
    });
    upsertMessage(db, conversationId, {
      id: `routine-user-${run.id}`,
      role: 'user',
      content: routine.prompt,
    });
    upsertMessage(db, conversationId, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agentId,
      agentName: getAgentDef(agentId)?.name ?? agentId,
      runId: run.id,
      runStatus: 'queued',
      startedAt: now,
    });

    const modelPrefs = config.agentModels?.[agentId] ?? {};
    design.runs.start(run, () => startChatRun({
      agentId,
      projectId,
      conversationId: run.conversationId,
      assistantMessageId: run.assistantMessageId,
      clientRequestId: run.clientRequestId,
      skillId: routine.skillId ?? null,
      designSystemId: config.designSystemId ?? null,
      model: modelPrefs.model ?? null,
      reasoning: modelPrefs.reasoning ?? null,
      message: routine.prompt,
      systemPrompt: [
        `You are running an unattended scheduled routine named "${routine.name}".`,
        'Do not ask follow-up questions, do not emit <question-form>, and do not wait for user input. Pick reasonable defaults and finish the task.',
      ].join('\n'),
    }, run));

    const completion = (async () => {
      const finalStatus = await design.runs.wait(run);
      db.prepare(`UPDATE messages SET run_status = ?, ended_at = ? WHERE id = ?`)
        .run(finalStatus.status, Date.now(), assistantMessageId);
      return {
        status: finalStatus.status,
        summary: `Routine "${routine.name}" ${finalStatus.status}.`,
      };
    })();

    return { projectId, conversationId, agentRunId: run.id, completion };
  });
  routineService.start();

  registerRoutineRoutes(app, { db, routineService });

  app.get('/api/orbit/status', async (_req, res) => {
    try {
      res.json(await orbitService.status());
    } catch (err) {
      sendApiError(res, 500, 'INTERNAL_ERROR', String(err?.message || err));
    }
  });

  app.post('/api/orbit/run', async (_req, res) => {
    try {
      res.json(await orbitService.start('manual'));
    } catch (err) {
      sendApiError(res, 400, 'BAD_REQUEST', String(err?.message || err));
    }
  });

  app.post('/api/runs', (req, res) => {
    const run = design.runs.create(req.body || {});
    /** @type {import('@pixelpitch/contracts').ChatRunCreateResponse} */
    const body = { runId: run.id };
    res.status(202).json(body);
    design.runs.start(run, () => startChatRun(req.body || {}, run));
  });

  app.get('/api/runs', (req, res) => {
    const { projectId, conversationId, status } = req.query;
    const runs = design.runs.list({ projectId, conversationId, status });
    /** @type {import('@pixelpitch/contracts').ChatRunListResponse} */
    const body = { runs: runs.map(design.runs.statusBody) };
    res.json(body);
  });

  app.get('/api/runs/:id', (req, res) => {
    const run = design.runs.get(req.params.id);
    if (!run) return sendApiError(res, 404, 'NOT_FOUND', 'run not found');
    res.json(design.runs.statusBody(run));
  });

  app.get('/api/runs/:id/events', (req, res) => {
    const run = design.runs.get(req.params.id);
    if (!run) return sendApiError(res, 404, 'NOT_FOUND', 'run not found');
    design.runs.stream(run, req, res);
  });

  app.post('/api/runs/:id/cancel', (req, res) => {
    const run = design.runs.get(req.params.id);
    if (!run) return sendApiError(res, 404, 'NOT_FOUND', 'run not found');
    agentRunService.cancelChildren(req.params.id);
    design.runs.cancel(run);
    /** @type {import('@pixelpitch/contracts').ChatRunCancelResponse} */
    const body = { ok: true };
    res.json(body);
  });

  app.post(
    '/api/projects/:projectId/critique/:runId/interrupt',
    handleCritiqueInterrupt(db, critiqueRunRegistry),
  );

  app.get(
    '/api/projects/:projectId/critique/:runId/artifact',
    handleCritiqueArtifact(db, {
      artifactsRoot: ARTIFACTS_DIR,
      responseCapBytes: critiqueCfg.parserMaxBlockBytes,
    }),
  );

  app.post('/api/chat', (req, res) => {
    const run = design.runs.create();
    design.runs.stream(run, req, res);
    design.runs.start(run, () => startChatRun(req.body || {}, run));
  });

  // ---- API Proxy (SSE) for API-compatible endpoints ------------------------
  // Browser → daemon → external API. Avoids CORS issues with third-party
  // providers. This keeps BYOK setup zero-config for local users at the cost of
  // one local streaming hop through the daemon.

  const redactAuthTokens = (text) =>
    text.replace(/Bearer [A-Za-z0-9_\-.+/=]+/g, 'Bearer [REDACTED]');

  const validateExternalApiBaseUrl = (baseUrl) => {
    let parsed;
    try {
      parsed = new URL(baseUrl.replace(/\/+$/, ''));
    } catch {
      return { error: 'Invalid baseUrl' };
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: 'Only http/https allowed' };
    }
    if (
      ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname) ||
      parsed.hostname.startsWith('169.254.') ||
      parsed.hostname.startsWith('10.') ||
      /^192\.168\./.test(parsed.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)
    ) {
      return { error: 'Internal IPs blocked', forbidden: true };
    }
    return { parsed };
  };

  const apiEndpointForProtocol = (baseUrl, protocol) => {
    const clean = String(baseUrl || '').replace(/\/+$/, '');
    if (protocol === 'ollama') {
      return `${clean.replace(/\/api\/?$/, '')}/api/chat`;
    }
    if (protocol === 'openai') {
      return /\/v\d+$/.test(clean)
        ? `${clean}/chat/completions`
        : `${clean}/v1/chat/completions`;
    }
    return /\/v\d+$/.test(clean)
      ? `${clean}/messages`
      : `${clean}/v1/messages`;
  };

  async function testApiExecutionConfig(input) {
    const protocol = input?.apiProtocol === 'openai' || input?.apiProtocol === 'ollama'
      ? input.apiProtocol
      : 'anthropic';
    const baseUrl = cleanString(input?.baseUrl);
    const apiKey = cleanString(input?.apiKey);
    const model = cleanString(input?.model);
    if (!baseUrl || !apiKey || !model) {
      return {
        ok: false,
        mode: 'api',
        message: 'API key, base URL, and model are required.',
      };
    }
    const validated = validateExternalApiBaseUrl(baseUrl);
    if (validated.error) {
      return {
        ok: false,
        mode: 'api',
        message: validated.error,
      };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const url = apiEndpointForProtocol(baseUrl, protocol);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: protocol === 'openai'
          ? {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            }
          : protocol === 'ollama'
            ? {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              }
          : {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
        body: JSON.stringify(protocol === 'openai'
          ? {
              model,
              messages: [{ role: 'user', content: 'Reply with ok.' }],
              max_tokens: 1,
              stream: false,
            }
          : protocol === 'ollama'
            ? {
                model,
                messages: [{ role: 'user', content: 'Reply with ok.' }],
                stream: false,
                options: { num_predict: 1 },
              }
          : {
              model,
              messages: [{ role: 'user', content: 'Reply with ok.' }],
              max_tokens: 1,
              stream: false,
            }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const details = redactAuthTokens((await response.text().catch(() => '')).slice(0, 500));
        return {
          ok: false,
          mode: 'api',
          status: response.status,
          message: `Upstream rejected the test request (${response.status}).`,
          details,
        };
      }
      return {
        ok: true,
        mode: 'api',
        status: response.status,
        message: `${protocol === 'openai' ? 'OpenAI-compatible' : protocol === 'ollama' ? 'Ollama-compatible' : 'Anthropic-compatible'} endpoint responded.`,
      };
    } catch (err) {
      return {
        ok: false,
        mode: 'api',
        message:
          err?.name === 'AbortError'
            ? 'Connection test timed out after 15 seconds.'
            : String(err?.message || err),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  app.post('/api/execution/test', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    const input = req.body || {};
    if (input.mode === 'daemon') {
      const agentId = cleanString(input.agentId);
      const found = detectAgents().find((agent) => agent.id === agentId);
      return res.json({
        ok: Boolean(found?.available),
        mode: 'daemon',
        message: found?.available
          ? `${found.name} is installed and reachable on PATH.`
          : agentId
            ? `Agent "${agentId}" is not installed or not on PATH.`
            : 'Select a local agent first.',
      });
    }
    res.json(await testApiExecutionConfig(input));
  });

  app.post('/api/provider-models', async (req, res) => {
    if (!isLocalSameOrigin(req, resolvedPort)) {
      return res.status(403).json({ error: 'cross-origin request rejected' });
    }
    const input = req.body || {};
    const protocol = input.protocol === 'openai' || input.protocol === 'ollama'
      ? input.protocol
      : 'anthropic';
    return res.json(await listProviderModels({
      protocol,
      baseUrl: cleanString(input.baseUrl),
      apiKey: cleanString(input.apiKey),
    }));
  });

  app.post('/api/proxy/anthropic/stream', async (req, res) => {
    /** @type {Partial<ProxyStreamRequest>} */
    const proxyBody = req.body || {};
    const { baseUrl, apiKey, model, systemPrompt, messages, maxTokens } =
      proxyBody;
    if (!baseUrl || !apiKey || !model) {
      return sendApiError(
        res,
        400,
        'BAD_REQUEST',
        'baseUrl, apiKey, and model are required',
      );
    }

    const validated = validateExternalApiBaseUrl(baseUrl);
    if (validated.error) {
      return sendApiError(
        res,
        validated.forbidden ? 403 : 400,
        validated.forbidden ? 'FORBIDDEN' : 'BAD_REQUEST',
        validated.error,
      );
    }

    const url = apiEndpointForProtocol(baseUrl, 'anthropic');
    console.log(
      `[proxy:anthropic] ${req.method} ${validated.parsed.hostname} model=${model}`,
    );

    const payload = {
      model,
      max_tokens:
        typeof maxTokens === 'number' && maxTokens > 0 ? maxTokens : 8192,
      messages: Array.isArray(messages) ? messages : [],
      stream: true,
    };
    if (typeof systemPrompt === 'string' && systemPrompt) {
      payload.system = systemPrompt;
    }

    const sse = createSseResponse(res);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[proxy:anthropic] upstream error: ${response.status} ${redactAuthTokens(errorText)}`,
        );
        sse.send('error', {
          message: `Upstream error: ${response.status}`,
          details: errorText,
        });
        return sse.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const event = line.slice(7).trim();
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine && dataLine.startsWith('data: ')) {
              try {
                const data = JSON.parse(dataLine.slice(6));
                sse.send(event, data);
              } catch (e) {
                // ignore parse errors for partial chunks
              }
            }
          }
        }
      }
      sse.end();
    } catch (err) {
      console.error(`[proxy:anthropic] internal error: ${err.message}`);
      sse.send('error', { message: err.message });
      sse.end();
    }
  });

  async function handleOpenAiProxyStream(req, res) {
    /** @type {Partial<ProxyStreamRequest>} */
    const proxyBody = req.body || {};
    const { baseUrl, apiKey, model, systemPrompt, messages, maxTokens } =
      proxyBody;
    if (!baseUrl || !apiKey || !model) {
      return sendApiError(
        res,
        400,
        'BAD_REQUEST',
        'baseUrl, apiKey, and model are required',
      );
    }

    const validated = validateExternalApiBaseUrl(baseUrl);
    if (validated.error) {
      return sendApiError(
        res,
        validated.forbidden ? 403 : 400,
        validated.forbidden ? 'FORBIDDEN' : 'BAD_REQUEST',
        validated.error,
      );
    }

    const url = apiEndpointForProtocol(baseUrl, 'openai');
    console.log(
      `[proxy:openai] ${req.method} ${validated.parsed.hostname} model=${model}`,
    );

    const payloadMessages = Array.isArray(messages) ? [...messages] : [];
    if (typeof systemPrompt === 'string' && systemPrompt) {
      payloadMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const payload = {
      model,
      messages: payloadMessages,
      max_tokens:
        typeof maxTokens === 'number' && maxTokens > 0 ? maxTokens : 8192,
      stream: true,
    };

    const sse = createSseResponse(res);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[proxy:openai] upstream error: ${response.status} ${redactAuthTokens(errorText)}`,
        );
        sse.send('error', {
          message: `Upstream error: ${response.status}`,
          details: errorText,
        });
        return sse.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              sse.send('message', data);
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      sse.end();
    } catch (err) {
      console.error(`[proxy:openai] internal error: ${err.message}`);
      sse.send('error', { message: err.message });
      sse.end();
    }
  }

  app.post('/api/proxy/openai/stream', handleOpenAiProxyStream);
  app.post('/api/proxy/stream', handleOpenAiProxyStream);

  app.post('/api/proxy/ollama/stream', async (req, res) => {
    /** @type {Partial<ProxyStreamRequest>} */
    const proxyBody = req.body || {};
    const { baseUrl, apiKey, model, systemPrompt, messages, maxTokens } =
      proxyBody;
    if (!baseUrl || !apiKey || !model) {
      return sendApiError(
        res,
        400,
        'BAD_REQUEST',
        'baseUrl, apiKey, and model are required',
      );
    }

    const validated = validateExternalApiBaseUrl(baseUrl);
    if (validated.error) {
      return sendApiError(
        res,
        validated.forbidden ? 403 : 400,
        validated.forbidden ? 'FORBIDDEN' : 'BAD_REQUEST',
        validated.error,
      );
    }

    const url = apiEndpointForProtocol(baseUrl, 'ollama');
    console.log(
      `[proxy:ollama] ${req.method} ${validated.parsed.hostname} model=${model}`,
    );

    const payloadMessages = Array.isArray(messages) ? [...messages] : [];
    if (typeof systemPrompt === 'string' && systemPrompt) {
      payloadMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const payload = {
      model,
      messages: payloadMessages,
      stream: true,
    };
    if (typeof maxTokens === 'number' && maxTokens > 0) {
      payload.options = { num_predict: maxTokens };
    }

    const sse = createSseResponse(res);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[proxy:ollama] upstream error: ${response.status} ${redactAuthTokens(errorText)}`,
        );
        sse.send('error', {
          message: `Upstream error: ${response.status}`,
          details: errorText,
        });
        return sse.end();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const delta = data?.message?.content;
            if (typeof delta === 'string' && delta) {
              sse.send('delta', { delta });
            }
            if (data?.done) {
              sse.send('end', {});
              return sse.end();
            }
          } catch {
            // Ignore partial JSON lines until the next chunk completes them.
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          const delta = data?.message?.content;
          if (typeof delta === 'string' && delta) {
            sse.send('delta', { delta });
          }
        } catch {
          // Ignore trailing partial content from an upstream disconnect.
        }
      }
      sse.send('end', {});
      sse.end();
    } catch (err) {
      console.error(`[proxy:ollama] internal error: ${err.message}`);
      sse.send('error', { message: err.message });
      sse.end();
    }
  });

  // Wait for `listen` to bind so callers always see the resolved URL —
  // critical when port=0 (ephemeral port) and when the embedding sidecar
  // needs to advertise the port to a parent process before any request
  // can flow. Three callers depend on this contract:
  //   - `apps/daemon/src/cli.ts`            → expects a `url` string
  //   - `apps/daemon/sidecar/server.ts`     → expects `{ url, server }`
  //   - `apps/daemon/tests/version-route.test.ts` → expects `{ url, server }`
  return await new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const address = server.address();
      // `address()` can in theory return `string | AddressInfo | null`. For
      // a TCP listener it's always `AddressInfo` with a `.port` — the guard
      // is belt-and-braces so an unexpected null never silently produces a
      // `http://127.0.0.1:0` URL that callers would then try to fetch.
      const boundPort =
        address && typeof address === 'object' ? address.port : null;
      if (!boundPort) {
        reject(
          new Error(
            `[od] daemon failed to resolve listening port (address=${JSON.stringify(address)})`,
          ),
        );
        return;
      }
      resolvedPort = boundPort;
      // When binding to all interfaces report localhost for local callers;
      // when binding to a specific address (e.g. a Tailscale IP) report that
      // address so remote callers and the sidecar use the correct URL.
      const reportHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
      const url = `http://${reportHost}:${resolvedPort}`;
      if (!returnServer) {
        console.log(`[od] daemon listening on ${url}`);
      }
      resolve(returnServer ? { url, server } : url);
    });
    // `app.listen` throws synchronously when the port is already in use on
    // some Node versions, but emits an `error` event on others (and for
    // EACCES / EADDRNOTAVAIL even on the same Node). Wire the event so the
    // returned Promise always settles instead of hanging forever.
    server.on('error', reject);
  });
}

function renderSkillCliOperatingProcedures(skill) {
  if (!Array.isArray(skill.cliProcedures) || skill.cliProcedures.length === 0) return '';
  const lines = [
    '## Skill CLI operating procedures',
    '',
    'This skill includes executable CLI procedures. Use them when they are the shortest reliable path, and reason over their outputs before editing or continuing. If several commands are listed, choose the one matching the task phase; do not run every command mechanically.',
    '',
  ];
  for (const [index, proc] of skill.cliProcedures.entries()) {
    lines.push(`### CLI ${index + 1}`);
    if (proc.when) lines.push(`When: ${proc.when}`);
    lines.push('Command pattern:');
    lines.push('```bash');
    lines.push(proc.command);
    lines.push('```');
    if (proc.customize) lines.push(`Customize: ${proc.customize}`);
    if (proc.output) lines.push(`Output contract: ${proc.output}`);
    lines.push('');
  }
  return `${lines.join('\n').trim()}\n\n`;
}

function randomId() {
  return randomUUID();
}

function sanitizeSlug(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function assembleExample(templateHtml, slidesHtml, title) {
  return templateHtml
    .replace('<!-- SLIDES_HERE -->', slidesHtml)
    .replace(
      /<title>.*?<\/title>/,
      `<title>${title} | Pixelpitch Example</title>`,
    );
}

export function isLocalSameOrigin(req, port) {
  const ports = [port];
  const webPort = Number(process.env.PIXELPITCH_WEB_PORT);
  if (webPort && webPort !== port) ports.push(webPort);

  const allowedHosts = new Set(
    ports.flatMap((p) => [`127.0.0.1:${p}`, `localhost:${p}`, `[::1]:${p}`]),
  );
  const allowedOrigins = new Set(
    ports.flatMap((p) => [
      `http://127.0.0.1:${p}`,
      `http://localhost:${p}`,
      `http://[::1]:${p}`,
    ]),
  );
  const host = String(req.headers.host || '');
  if (!allowedHosts.has(host)) return false;
  const origin = req.headers.origin;
  if (origin == null || origin === '') return true;
  if (req.method === 'GET' && isPortlessLoopbackOrigin(String(origin))) {
    return true;
  }
  if (isAllowedDevWebOrigin(String(origin))) return true;
  return allowedOrigins.has(String(origin));
}

export function isPortlessLoopbackOrigin(origin) {
  try {
    const parsed = new URL(String(origin));
    if (parsed.port) return false;
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

function isAllowedDevWebOrigin(origin) {
  try {
    const parsed = new URL(String(origin));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
    const configured = String(process.env.PIXELPITCH_ALLOWED_DEV_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (configured.includes(parsed.origin)) return true;
    if (hostname === 'cloudworkstations.dev' || hostname.endsWith('.cloudworkstations.dev')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
