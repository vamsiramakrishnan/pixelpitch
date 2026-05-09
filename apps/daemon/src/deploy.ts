// @ts-nocheck
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { readProjectFile, validateProjectPath } from './projects.js';

export const CLOUD_RUN_PROVIDER_ID = 'cloud-run';
export const VERCEL_PROVIDER_ID = CLOUD_RUN_PROVIDER_ID;

const execFileAsync = promisify(execFile);
const DEFAULT_CLOUD_RUN_REGION = 'us-central1';
const CLOUD_RUN_DEPLOY_TIMEOUT_MS = 15 * 60 * 1000;
const CLOUD_RUN_AUTH_MESSAGE =
  'Cloud Run service is not public. Enable unauthenticated access or configure IAM before sharing this link.';

export class DeployError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = 'DeployError';
    this.status = status;
    this.details = details;
  }
}

export function deployConfigPath() {
  const base = process.env.PIXELPITCH_USER_STATE_DIR || path.join(os.homedir(), '.pixelpitch');
  return path.join(base, 'cloud-run.json');
}

export async function readCloudRunConfig() {
  try {
    const raw = await readFile(deployConfigPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : '',
      region: typeof parsed.region === 'string' ? parsed.region : DEFAULT_CLOUD_RUN_REGION,
      serviceName: typeof parsed.serviceName === 'string' ? parsed.serviceName : '',
      allowUnauthenticated: parsed.allowUnauthenticated !== false,
    };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return {
        projectId: '',
        region: DEFAULT_CLOUD_RUN_REGION,
        serviceName: '',
        allowUnauthenticated: true,
      };
    }
    throw err;
  }
}

export async function writeCloudRunConfig(input) {
  const current = await readCloudRunConfig();
  const next = {
    projectId: typeof input?.projectId === 'string' ? input.projectId.trim() : current.projectId,
    region: normalizeCloudRunRegion(
      typeof input?.region === 'string' ? input.region : current.region,
    ),
    serviceName: normalizeCloudRunServiceName(
      typeof input?.serviceName === 'string' ? input.serviceName : current.serviceName,
    ),
    allowUnauthenticated:
      typeof input?.allowUnauthenticated === 'boolean'
        ? input.allowUnauthenticated
        : current.allowUnauthenticated !== false,
  };
  const file = deployConfigPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Best effort on filesystems that do not support chmod.
  }
  return publicDeployConfig(next);
}

export function publicDeployConfig(config) {
  return {
    providerId: CLOUD_RUN_PROVIDER_ID,
    configured: Boolean(config?.projectId && config?.region && config?.serviceName),
    projectId: config?.projectId || '',
    region: config?.region || DEFAULT_CLOUD_RUN_REGION,
    serviceName: config?.serviceName || '',
    allowUnauthenticated: config?.allowUnauthenticated !== false,
    target: 'preview',
  };
}

export const readVercelConfig = readCloudRunConfig;
export const writeVercelConfig = writeCloudRunConfig;

// Walk the entry HTML and any referenced CSS, producing the full set of
// files that would be uploaded for a deploy along with the lists of
// missing and invalid references. Does not throw on a partial result so
// callers can distinguish between "ready to ship" and "ready except for
// these specific issues" without parsing an error string.
export async function buildDeployFilePlan(projectsRoot, projectId, entryName, options = {}) {
  const entryPath = validateProjectPath(entryName);
  if (!/\.html?$/i.test(entryPath)) {
    throw new DeployError('Only HTML files can be deployed.', 400);
  }

  const entry = await readProjectFile(projectsRoot, projectId, entryPath);
  const html = entry.buffer.toString('utf8');
  const entryBase = path.posix.dirname(entryPath);
  const deployHtml = injectDeployHookScript(
    rewriteEntryHtmlReferences(html, entryBase),
    options.hookScriptUrl ?? process.env.PIXELPITCH_DEPLOY_HOOK_SCRIPT_URL,
  );
  const files = new Map();
  files.set('index.html', {
    file: 'index.html',
    data: Buffer.from(deployHtml, 'utf8'),
    contentType: entry.mime,
    sourcePath: entryPath,
  });

  const visited = new Set([entryPath]);
  const missing = [];
  const invalid = [];
  const pending = extractHtmlReferences(html).map((ref) => ({
    ref,
    base: entryBase,
  }));

  // Inline `<style>` blocks and `style="..."` attributes can reference
  // background images, custom fonts, and stylesheets via @import. They
  // are resolved relative to the entry HTML, same as src/href.
  for (const ref of extractInlineCssReferences(html)) {
    pending.push({ ref, base: entryBase });
  }

  for (const manifestRef of entry.artifactManifest?.supportingFiles ?? []) {
    pending.push({ ref: manifestRef, base: entryBase });
  }

  while (pending.length > 0) {
    const item = pending.shift();
    const resolved = resolveReferencedPath(item.ref, item.base);
    if (!resolved) continue;
    let safePath;
    try {
      safePath = validateProjectPath(resolved);
    } catch {
      invalid.push(item.ref);
      continue;
    }
    if (safePath === entryPath || visited.has(safePath)) continue;
    visited.add(safePath);

    let projectFile;
    try {
      projectFile = await readProjectFile(projectsRoot, projectId, safePath);
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        missing.push(safePath);
        continue;
      }
      invalid.push(safePath);
      continue;
    }

    files.set(safePath, {
      file: safePath,
      data: projectFile.buffer,
      contentType: projectFile.mime,
      sourcePath: safePath,
    });

    if (/\.css$/i.test(safePath)) {
      const cssBase = path.posix.dirname(safePath);
      for (const ref of extractCssReferences(projectFile.buffer.toString('utf8'))) {
        pending.push({ ref, base: cssBase });
      }
    }
  }

  return {
    entryPath,
    html,
    files: Array.from(files.values()),
    missing,
    invalid,
  };
}

export async function buildDeployFileSet(projectsRoot, projectId, entryName, options = {}) {
  const plan = await buildDeployFilePlan(projectsRoot, projectId, entryName, options);
  if (plan.missing.length || plan.invalid.length) {
    const parts = [];
    if (plan.missing.length) parts.push(`missing: ${plan.missing.join(', ')}`);
    if (plan.invalid.length) parts.push(`invalid: ${plan.invalid.join(', ')}`);
    throw new DeployError(`Could not deploy referenced files (${parts.join('; ')}).`, 400, {
      missing: plan.missing,
      invalid: plan.invalid,
    });
  }
  return plan.files;
}

export async function deployToCloudRun({ config, files, projectId }) {
  const normalized = normalizeCloudRunConfig(config);
  if (!normalized.projectId) {
    throw new DeployError('Google Cloud project ID is required.', 400);
  }
  if (!normalized.region) {
    throw new DeployError('Cloud Run region is required.', 400);
  }
  if (!normalized.serviceName) {
    throw new DeployError('Cloud Run service name is required.', 400);
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw new DeployError('No deployable files were found.', 400);
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), `pixelpitch-cloud-run-${projectId}-`));
  try {
    await writeCloudRunSourceBundle(workDir, files);
    const args = [
      'run',
      'deploy',
      normalized.serviceName,
      '--source',
      workDir,
      '--project',
      normalized.projectId,
      '--region',
      normalized.region,
      normalized.allowUnauthenticated ? '--allow-unauthenticated' : '--no-allow-unauthenticated',
      '--quiet',
      '--format=json',
    ];
    const { stdout } = await execFileAsync('gcloud', args, {
      timeout: CLOUD_RUN_DEPLOY_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8,
    });
    const deployed = parseCloudRunDeployOutput(stdout);
    const url = deployed.url || '';
    const link = await waitForReachableDeploymentUrl([url]);
    return {
      providerId: CLOUD_RUN_PROVIDER_ID,
      url: link.url || url,
      deploymentId: deployed.deploymentId || deployed.serviceName || normalized.serviceName,
      target: 'preview',
      status: link.status,
      statusMessage: link.statusMessage,
      reachableAt: link.reachableAt,
    };
  } catch (err) {
    throw cloudRunError(err);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export const deployToVercel = deployToCloudRun;

function normalizeCloudRunConfig(config) {
  return {
    projectId: typeof config?.projectId === 'string' ? config.projectId.trim() : '',
    region: normalizeCloudRunRegion(config?.region),
    serviceName: normalizeCloudRunServiceName(config?.serviceName),
    allowUnauthenticated: config?.allowUnauthenticated !== false,
  };
}

function normalizeCloudRunRegion(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return value || DEFAULT_CLOUD_RUN_REGION;
}

function normalizeCloudRunServiceName(raw) {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value) return '';
  return value
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

async function writeCloudRunSourceBundle(root, files) {
  for (const item of files) {
    const relative = validateCloudRunBundlePath(item.file);
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(item.data));
  }
  await writeFile(
    path.join(root, 'Dockerfile'),
    [
      'FROM nginx:1.27-alpine',
      'COPY . /usr/share/nginx/html',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(root, '.gcloudignore'),
    [
      '.git',
      '.DS_Store',
      '',
    ].join('\n'),
    'utf8',
  );
}

function validateCloudRunBundlePath(raw) {
  const relative = path.posix.normalize(String(raw || '').replace(/^\/+/, ''));
  if (!relative || relative === '.' || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new DeployError(`Invalid deploy file path: ${raw}`, 400);
  }
  return relative;
}

function parseCloudRunDeployOutput(stdout) {
  const text = String(stdout || '').trim();
  if (!text) return {};
  try {
    const json = JSON.parse(text);
    return {
      url: json?.status?.url || json?.status?.address?.url || json?.uri || '',
      serviceName: json?.metadata?.name || '',
      deploymentId: json?.metadata?.uid || json?.metadata?.name || '',
    };
  } catch {
    const match = text.match(/https:\/\/[^\s]+/i);
    return { url: match?.[0] || '' };
  }
}

function cloudRunError(err) {
  if (err instanceof DeployError) return err;
  const code = err?.code;
  if (code === 'ENOENT') {
    return new DeployError(
      'gcloud CLI is required to deploy to Cloud Run. Install Google Cloud CLI and run `gcloud auth login` plus `gcloud auth application-default login`.',
      400,
    );
  }
  const stderr = String(err?.stderr || '').trim();
  const stdout = String(err?.stdout || '').trim();
  const message = stderr || stdout || err?.message || String(err);
  return new DeployError(`Cloud Run deploy failed: ${message}`, 502, {
    code,
    stderr,
    stdout,
  });
}

export function extractHtmlReferences(html) {
  const refs = [];
  for (const tag of parseHtmlTags(html)) {
    const attrs = parseHtmlAttributes(tag.attrs);
    for (const name of ['src', 'poster']) {
      const value = attrs.get(name);
      if (value) refs.push(value);
    }
    const href = attrs.get('href');
    if (href && shouldCollectHref(tag.name, attrs)) refs.push(href);
    const srcset = attrs.get('srcset');
    if (srcset) {
      for (const part of srcset.split(',')) {
        const url = part.trim().split(/\s+/)[0];
        if (url) refs.push(url);
      }
    }
  }
  return refs;
}

// Character classes scope the lazy match so unclosed url(((( or
// `@import "foo` cannot trigger O(n^2) regex backtracking on
// attacker-controlled CSS. The tradeoff is that quoted urls
// containing literal `)` characters must be percent-encoded; CSS
// authors are already expected to do this in practice.
const CSS_URL_REGEX = /url\(\s*(['"]?)([^)]*?)\1\s*\)/gi;
const CSS_IMPORT_REGEX = /@import\s+(?:url\(\s*)?(['"])([^'"]*?)\1/gi;

export function extractCssReferences(css) {
  const refs = [];
  const urlRe = new RegExp(CSS_URL_REGEX.source, CSS_URL_REGEX.flags);
  let match;
  while ((match = urlRe.exec(css))) refs.push(match[2]);
  const importRe = new RegExp(CSS_IMPORT_REGEX.source, CSS_IMPORT_REGEX.flags);
  while ((match = importRe.exec(css))) refs.push(match[2]);
  return refs;
}

// Collect url() / @import references from inline `<style>` blocks and
// `style="..."` attributes. These bypass the external-stylesheet path
// (link rel=stylesheet -> .css file -> extractCssReferences) but still
// pull in real assets, e.g. background images and @font-face sources.
//
// Style-like text that lives inside `<script>` string literals or HTML
// comments is intentionally skipped, mirroring how extractHtmlReferences
// treats those raw-text regions.
export function extractInlineCssReferences(html) {
  const source = String(html);
  const refs = [];
  const skipRanges = htmlRawTextRanges(source);

  const styleBlockRe = /<style\b[^<>]*>([\s\S]*?)<\/style\s*>/gi;
  let block;
  while ((block = styleBlockRe.exec(source))) {
    if (isOffsetInRanges(block.index, skipRanges)) continue;
    refs.push(...extractCssReferences(block[1]));
  }

  for (const tag of parseHtmlTags(source)) {
    const attrs = parseHtmlAttributes(tag.attrs);
    const style = attrs.get('style');
    if (style) refs.push(...extractCssReferences(style));
  }

  return refs;
}

// Rewrite url() / @import references inside a CSS string so that paths
// resolved relative to `baseDir` survive the entry-HTML being moved to
// the deploy root. Mirrors `rewriteHtmlReference` for HTML attributes.
// Uses the same hardened character classes as `extractCssReferences` so
// extract and rewrite see the same set of references.
export function rewriteCssReferences(css, baseDir) {
  return String(css)
    .replace(CSS_URL_REGEX, (match, quote, value) => {
      if (!value) return match;
      const rewritten = rewriteHtmlReference(value, baseDir);
      return `url(${quote}${rewritten}${quote})`;
    })
    .replace(/(@import\s+)(['"])([^'"]*?)\2/gi, (_full, prefix, quote, value) => {
      const rewritten = rewriteHtmlReference(value, baseDir);
      return `${prefix}${quote}${rewritten}${quote}`;
    });
}

export function resolveReferencedPath(raw, baseDir) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed)) return null;
  if (trimmed.startsWith('//')) return null;
  const withoutHash = trimmed.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  if (!withoutQuery) return null;
  if (withoutQuery.startsWith('/')) return withoutQuery.slice(1);
  return path.posix.normalize(path.posix.join(baseDir || '.', withoutQuery));
}

export function rewriteEntryHtmlReferences(html, baseDir) {
  const source = String(html);
  // Compute raw-text ranges against the input first so the style-block
  // pre-pass can skip `<style>...</style>` text that lives inside a
  // `<script>` string literal or an HTML comment. Without this gate, a
  // template like `const tpl = '<style>...url("foo")...</style>'` would
  // get mutated, changing runtime JS behavior.
  const inputRawTextRanges = htmlRawTextRanges(source);
  const styleRewritten = source.replace(
    /(<style\b[^<>]*>)([\s\S]*?)(<\/style\s*>)/gi,
    (full, openTag, content, closeTag, offset) => {
      if (isOffsetInRanges(offset, inputRawTextRanges)) return full;
      return `${openTag}${rewriteCssReferences(content, baseDir)}${closeTag}`;
    },
  );
  // Re-derive raw-text ranges against the post-style HTML: rewriting can
  // shift offsets, and the tag-attribute pass below skips raw-text
  // regions by absolute offset. Two scans are intentional, deploy is
  // not a hot path and the cost is linear in document size.
  const rawTextRanges = htmlRawTextRanges(styleRewritten);
  return styleRewritten.replace(/<([A-Za-z][A-Za-z0-9:-]*)([^<>]*?)>/g, (tag, rawName, rawAttrs, offset) => {
    if (isOffsetInRanges(offset, rawTextRanges)) return tag;
    const tagName = String(rawName).toLowerCase();
    const attrs = parseHtmlAttributes(rawAttrs);
    return `<${rawName}${rewriteHtmlAttributes(rawAttrs, tagName, attrs, baseDir)}>`;
  });
}

// Soft thresholds chosen against static HTML deploy budgets and
// typical first-paint budgets. Per-asset is a usability hint, not a
// hard cap; bundle is a margin against pushing a large source bundle
// through Cloud Build from the local machine.
export const DEPLOY_PREFLIGHT_LARGE_ASSET_BYTES = 4 * 1024 * 1024;
export const DEPLOY_PREFLIGHT_LARGE_BUNDLE_BYTES = 75 * 1024 * 1024;
export const DEPLOY_PREFLIGHT_LARGE_HTML_BYTES = 1 * 1024 * 1024;

function isExternalUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed)) return true;
  if (trimmed.startsWith('//')) return true;
  return false;
}

function pushUnique(list, warning) {
  const key = `${warning.code}:${warning.path ?? ''}:${warning.url ?? ''}`;
  if (list.seen.has(key)) return;
  list.seen.add(key);
  list.warnings.push(warning);
}

// Walk the entry HTML once to gather signals that affect deployment
// quality without touching the network. Returns a structured warning
// list the UI can render verbatim.
//
// `entryPath` is used as the warning `path` for HTML-level findings so
// the UI can deep-link from a warning into the source file the author
// is actually editing. `files` carries deploy-relative paths (the entry
// HTML is always renamed to `index.html`) so per-asset warnings live in
// the deploy namespace.
/**
 * @param {{
 *   entryPath: string,
 *   html: string,
 *   files: any[],
 *   missing?: any[],
 *   invalid?: any[]
 * }} input
 * @returns {{ warnings: any[], totalBytes: number, totalFiles: number }}
 */
export function analyzeDeployPlan(input: {
  entryPath: string;
  html: string;
  files: any[];
  missing?: any[];
  invalid?: any[];
}): { warnings: any[]; totalBytes: number; totalFiles: number } {
  const { entryPath, html, files } = input;
  const missing = input.missing ?? [];
  const invalid = input.invalid ?? [];
  const acc: { warnings: any[]; seen: Set<string> } = { warnings: [], seen: new Set() };

  for (const ref of missing) {
    pushUnique(acc, {
      code: 'broken-reference',
      path: ref,
      message: `Referenced file is missing on disk: ${ref}`,
    });
  }
  for (const ref of invalid) {
    pushUnique(acc, {
      code: 'invalid-reference',
      path: ref,
      message: `Reference is not a valid project path: ${ref}`,
    });
  }

  let totalBytes = 0;
  let entrySize = 0;
  for (const f of files || []) {
    const size = f.data?.length ?? 0;
    totalBytes += size;
    if (f.file === 'index.html') entrySize = size;
    if (size > DEPLOY_PREFLIGHT_LARGE_ASSET_BYTES && f.file !== 'index.html') {
      pushUnique(acc, {
        code: 'large-asset',
        path: f.file,
        size,
        message: `Asset is ${formatMib(size)}, larger than ${formatMib(DEPLOY_PREFLIGHT_LARGE_ASSET_BYTES)}; consider compressing or hosting on a CDN.`,
      });
    }
  }

  if (entrySize > DEPLOY_PREFLIGHT_LARGE_HTML_BYTES) {
    pushUnique(acc, {
      // Report against the source entry path so the UI can deep-link
      // back to the file the author edits, not the deploy-renamed
      // `index.html` which does not exist in the project tree.
      code: 'large-html',
      path: entryPath,
      size: entrySize,
      message: `Entry HTML is ${formatMib(entrySize)}; large HTML inflates time-to-first-paint.`,
    });
  }
  if (totalBytes > DEPLOY_PREFLIGHT_LARGE_BUNDLE_BYTES) {
    pushUnique(acc, {
      code: 'large-bundle',
      size: totalBytes,
      message: `Bundle is ${formatMib(totalBytes)}; large Cloud Run source deploys are slow and can fail in Cloud Build.`,
    });
  }

  const source = String(html ?? '');
  // Anchor to the document prolog so a `<!doctype html>` substring that
  // happens to live inside a `<script>` template literal or a comment
  // is not treated as a real declaration. Per HTML5, the prolog may
  // begin with an optional BOM, then any number of HTML comments and
  // whitespace, then the doctype. Built via `new RegExp` so the BOM
  // appears as an explicit U+FEFF escape rather than a literal
  // zero-width character in the regex source.
  if (!new RegExp('^\\uFEFF?\\s*(?:<!--[\\s\\S]*?-->\\s*)*<!doctype\\s+html', 'i').test(source)) {
    pushUnique(acc, {
      code: 'no-doctype',
      path: entryPath,
      message: 'Entry HTML is missing `<!DOCTYPE html>`; browsers may render in quirks mode.',
    });
  }

  let hasViewport = false;
  for (const tag of parseHtmlTags(source)) {
    const attrs = parseHtmlAttributes(tag.attrs);
    if (
      tag.name === 'meta' &&
      String(attrs.get('name') || '').toLowerCase() === 'viewport'
    ) {
      hasViewport = true;
    }
    if (tag.name === 'script') {
      const src = attrs.get('src');
      if (isExternalUrl(src)) {
        pushUnique(acc, {
          code: 'external-script',
          path: entryPath,
          url: src,
          message: `External script will not be vendored into the deploy: ${src}`,
        });
      }
    }
    if (tag.name === 'link') {
      const rel = String(attrs.get('rel') || '').toLowerCase();
      const href = attrs.get('href');
      if (rel.split(/\s+/).includes('stylesheet') && isExternalUrl(href)) {
        pushUnique(acc, {
          code: 'external-stylesheet',
          path: entryPath,
          url: href,
          message: `External stylesheet will not be vendored into the deploy: ${href}`,
        });
      }
    }
  }
  if (!hasViewport) {
    pushUnique(acc, {
      code: 'no-viewport',
      path: entryPath,
      message: 'Entry HTML is missing `<meta name="viewport">`; mobile rendering will be off.',
    });
  }

  return { warnings: acc.warnings, totalBytes, totalFiles: (files || []).length };
}

function formatMib(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

// One-shot orchestrator: build the file plan, run the analyzer, and
// return the typed preflight payload exposed by the daemon.
export async function prepareDeployPreflight(projectsRoot, projectId, entryName, options = {}) {
  const plan = await buildDeployFilePlan(projectsRoot, projectId, entryName, options);
  const { warnings, totalBytes, totalFiles } = analyzeDeployPlan(plan);
  return {
    providerId: CLOUD_RUN_PROVIDER_ID,
    entry: plan.entryPath,
    files: plan.files.map((f) => ({
      path: f.file,
      size: f.data?.length ?? 0,
      mime: f.contentType || 'application/octet-stream',
      sourcePath: f.sourcePath,
    })),
    totalFiles,
    totalBytes,
    warnings,
  };
}

export function injectDeployHookScript(html, scriptUrl) {
  const normalized = normalizeDeployHookScriptUrl(scriptUrl);
  if (!normalized) return html;

  const tag =
    `<script src="${escapeHtmlAttribute(normalized)}" defer ` +
    'data-pixelpitch-deploy-hook="true" data-closeable="true"></script>';
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${tag}</body>`);
  }
  return `${html}${tag}`;
}

export function normalizeDeployHookScriptUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.toString();
  } catch {
    return '';
  }
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function rewriteSrcset(raw, baseDir) {
  return String(raw)
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return part;
      const pieces = trimmed.split(/\s+/);
      const nextUrl = rewriteHtmlReference(pieces[0], baseDir);
      return [nextUrl, ...pieces.slice(1)].join(' ');
    })
    .join(', ');
}

function parseHtmlTags(html) {
  const tags = [];
  const rawTextRanges = htmlRawTextRanges(html);
  const tagRe = /<([A-Za-z][A-Za-z0-9:-]*)([^<>]*?)>/g;
  let match;
  while ((match = tagRe.exec(String(html)))) {
    if (isOffsetInRanges(match.index, rawTextRanges)) continue;
    tags.push({
      name: String(match[1]).toLowerCase(),
      attrs: match[2] || '',
    });
  }
  return tags;
}

function htmlRawTextRanges(html) {
  const source = String(html);
  const ranges = [];

  const commentRe = /<!--[\s\S]*?-->/g;
  let match;
  while ((match = commentRe.exec(source))) {
    ranges.push([match.index, match.index + match[0].length]);
  }

  const rawTagRe = /<(script|style)\b[^<>]*>/gi;
  while ((match = rawTagRe.exec(source))) {
    const tagName = String(match[1]).toLowerCase();
    const contentStart = match.index + match[0].length;
    const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
    closeRe.lastIndex = contentStart;
    const close = closeRe.exec(source);
    const contentEnd = close ? close.index : source.length;
    if (contentEnd > contentStart) ranges.push([contentStart, contentEnd]);
    rawTagRe.lastIndex = close ? close.index + close[0].length : source.length;
  }

  return ranges;
}

function isOffsetInRanges(offset, ranges) {
  return ranges.some(([start, end]) => offset >= start && offset < end);
}

function parseHtmlAttributes(rawAttrs) {
  const attrs = new Map();
  const attrRe = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(String(rawAttrs)))) {
    attrs.set(String(match[1]).toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function rewriteHtmlAttributes(rawAttrs, tagName, attrs, baseDir) {
  const shouldRewriteHref = shouldCollectHref(tagName, attrs);
  return String(rawAttrs).replace(
    /([^\s"'<>/=]+)(\s*=\s*)("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g,
    (full, rawName, equals, rawValue, doubleQuoted, singleQuoted, unquoted) => {
      const name = String(rawName).toLowerCase();
      if (
        name !== 'src' &&
        name !== 'poster' &&
        name !== 'srcset' &&
        name !== 'href' &&
        name !== 'style'
      ) {
        return full;
      }
      if (name === 'href' && !shouldRewriteHref) return full;

      const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
      let nextValue;
      if (name === 'srcset') nextValue = rewriteSrcset(value, baseDir);
      else if (name === 'style') nextValue = rewriteCssReferences(value, baseDir);
      else nextValue = rewriteHtmlReference(value, baseDir);
      if (doubleQuoted !== undefined) return `${rawName}${equals}"${nextValue}"`;
      if (singleQuoted !== undefined) return `${rawName}${equals}'${nextValue}'`;
      return `${rawName}${equals}${nextValue}`;
    },
  );
}

function shouldCollectHref(tagName, attrs) {
  if (tagName !== 'link') return false;
  const rel = String(attrs.get('rel') || '').toLowerCase();
  if (!rel) return false;
  return rel.split(/\s+/).some((item) => (
    item === 'stylesheet' ||
    item === 'icon' ||
    item === 'apple-touch-icon' ||
    item === 'manifest' ||
    item === 'preload' ||
    item === 'modulepreload' ||
    item === 'prefetch'
  ));
}

function rewriteHtmlReference(raw, baseDir) {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('/') || trimmed.startsWith('#')) return raw;
  const resolved = resolveReferencedPath(raw, baseDir);
  if (!resolved) return raw;
  const suffix = referenceSuffix(trimmed);
  return `${resolved}${suffix}`;
}

function referenceSuffix(raw) {
  const queryIdx = raw.indexOf('?');
  const hashIdx = raw.indexOf('#');
  const suffixIdx =
    queryIdx === -1 ? hashIdx : hashIdx === -1 ? queryIdx : Math.min(queryIdx, hashIdx);
  return suffixIdx === -1 ? '' : raw.slice(suffixIdx);
}

async function pollVercelDeployment(config, id) {
  let last = null;
  for (let i = 0; i < 30; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, i < 5 ? 1000 : 2000));
    const resp = await fetch(
      `${VERCEL_API}/v13/deployments/${encodeURIComponent(id)}${vercelTeamQuery(config)}`,
      { headers: { Authorization: `Bearer ${config.token}` } },
    );
    const json = await readVercelJson(resp);
    if (!resp.ok) throw vercelError(json, resp.status);
    last = json;
    if (json.readyState === 'READY' || json.readyState === 'ERROR') return json;
  }
  return last;
}

export async function waitForReachableDeploymentUrl(
  urls,
  { timeoutMs = 60_000, intervalMs = 2_000 } = {},
) {
  const candidates = [...new Set((urls || []).map(normalizeDeploymentUrl).filter(Boolean))];
  const fallbackUrl = candidates[0] || '';
  if (!fallbackUrl) {
    return {
      status: 'link-delayed',
      url: '',
      statusMessage: 'Cloud Run did not return a public service URL.',
    };
  }

  const startedAt = Date.now();
  let lastMessage = '';
  while (Date.now() - startedAt <= timeoutMs) {
    for (const url of candidates) {
      const result = await checkDeploymentUrl(url);
      if (result.reachable) {
        return {
          status: 'ready',
          url,
          statusMessage: 'Public link is ready.',
          reachableAt: Date.now(),
        };
      }
      if (result.status === 'protected') {
        return {
          status: 'protected',
          url,
          statusMessage: result.statusMessage || CLOUD_RUN_AUTH_MESSAGE,
        };
      }
      lastMessage = result.statusMessage || lastMessage;
    }
    if (Date.now() - startedAt >= timeoutMs) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return {
    status: 'link-delayed',
    url: fallbackUrl,
    statusMessage:
      lastMessage || 'Cloud Run returned a service URL, but it is not reachable yet.',
  };
}

export async function checkDeploymentUrl(url, { timeoutMs = 8_000 } = {}) {
  const normalized = normalizeDeploymentUrl(url);
  if (!normalized) {
    return { reachable: false, statusMessage: 'Deployment URL is empty.' };
  }
  const head = await requestDeploymentUrl(normalized, 'HEAD', timeoutMs);
  if (head.reachable) return head;
  if (head.status === 'protected') return head;
  if (head.statusCode && (head.statusCode === 405 || head.statusCode === 403 || head.statusCode >= 400)) {
    const get = await requestDeploymentUrl(normalized, 'GET', timeoutMs);
    if (get.reachable) return get;
    if (get.status === 'protected') return get;
    return get.statusMessage ? get : head;
  }
  const get = await requestDeploymentUrl(normalized, 'GET', timeoutMs);
  return get.reachable ? get : (get.statusMessage ? get : head);
}

async function requestDeploymentUrl(url, method, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method,
      redirect: 'manual',
      signal: controller.signal,
    });
    if (resp.status >= 200 && resp.status < 400) {
      return { reachable: true, statusCode: resp.status };
    }
    const body = method === 'GET' || resp.status === 401 || resp.status === 403
      ? await resp.text().catch(() => '')
      : '';
    if (isProtectedDeploymentResponse(resp, body, url)) {
      return {
        reachable: false,
        status: 'protected',
        statusCode: resp.status,
        statusMessage: CLOUD_RUN_AUTH_MESSAGE,
      };
    }
    return {
      reachable: false,
      statusCode: resp.status,
      statusMessage: `Public link returned HTTP ${resp.status}.`,
    };
  } catch (err) {
    return {
      reachable: false,
      statusMessage: `Public link is not reachable yet: ${err?.message || String(err)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function isVercelProtectedResponse(resp, body = '') {
  const server = resp.headers?.get?.('server') || '';
  const setCookie = resp.headers?.get?.('set-cookie') || '';
  const text = String(body || '');
  return (
    /vercel/i.test(server) ||
    /_vercel_sso_nonce/i.test(setCookie) ||
    /Authentication Required/i.test(text) ||
    /Vercel Authentication/i.test(text) ||
    /vercel\.com\/sso-api/i.test(text)
  );
}

export function isProtectedDeploymentResponse(resp, body = '', url = '') {
  if (isVercelProtectedResponse(resp, body)) return true;
  if (resp?.status !== 401 && resp?.status !== 403) return false;
  const text = String(body || '');
  return (
    /\.run\.app(?:\/|$)/i.test(String(url || '')) ||
    /Cloud Run/i.test(text) ||
    /Your client does not have permission/i.test(text) ||
    /request was not authenticated/i.test(text)
  );
}

export function deploymentUrlCandidates(...responses) {
  const urls = [];
  for (const json of responses) {
    if (!json) continue;
    if (json.url) urls.push(json.url);
    for (const alias of json.alias ?? []) urls.push(alias);
    for (const alias of json.aliases ?? []) {
      if (typeof alias === 'string') urls.push(alias);
      else if (alias?.domain) urls.push(alias.domain);
      else if (alias?.url) urls.push(alias.url);
    }
  }
  return [...new Set(urls.map(normalizeDeploymentUrl).filter(Boolean))];
}

export function normalizeDeploymentUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function vercelTeamQuery(config) {
  const params = new URLSearchParams();
  if (config.teamId) params.set('teamId', config.teamId);
  else if (config.teamSlug) params.set('slug', config.teamSlug);
  const s = params.toString();
  return s ? `?${s}` : '';
}

async function readVercelJson(resp) {
  try {
    return await resp.json();
  } catch {
    return {};
  }
}

function vercelError(json, status) {
  const code = json?.error?.code;
  const message = json?.error?.message || json?.message || `Vercel request failed (${status}).`;
  if (code === 'forbidden' || /permission/i.test(message)) {
    return new DeployError("You don't have permission to create a project.", status, json);
  }
  return new DeployError(message, status, json);
}

function deploymentUrl(json) {
  const url = json?.url || json?.alias?.[0] || '';
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function safeVercelProjectName(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `od-${randomUUID().slice(0, 8)}`;
}
