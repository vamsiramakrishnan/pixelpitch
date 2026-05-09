#!/usr/bin/env node
// Integrity check for the shared media model registry.
//
// The source of truth is now packages/contracts/src/media-models.ts. The web
// and daemon files are intentionally thin re-exports so the old app-local
// import paths keep working without reintroducing drift.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'packages', 'contracts', 'src', 'media-models.ts');
const APP_REEXPORTS = [
  path.join(ROOT, 'apps', 'web', 'src', 'media', 'models.ts'),
  path.join(ROOT, 'apps', 'daemon', 'src', 'media-models.ts'),
];

function fail(msg) {
  process.stderr.write(`verify-media-models: ${msg}\n`);
  process.exit(1);
}

function parseError(msg) {
  process.stderr.write(`verify-media-models: ${msg}\n`);
  process.exit(2);
}

function read(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (err) {
    parseError(`could not read ${file}: ${err.message}`);
  }
}

function extractIds(source, name) {
  const re = new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\];`, 'm');
  const m = source.match(re);
  if (!m) return null;
  return [...m[1].matchAll(/\bid:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function extractAudioIds(source) {
  const re = /export const AUDIO_MODELS_BY_KIND[^=]*=\s*\{([\s\S]*?)\n\};/m;
  const m = source.match(re);
  if (!m) return null;
  const body = m[1];
  const out = {};
  for (const kind of ['music', 'speech', 'sfx']) {
    const km = body.match(new RegExp(`${kind}\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'm'));
    if (!km) return null;
    out[kind] = [...km[1].matchAll(/\bid:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  }
  return out;
}

function extractNumberArray(source, name) {
  const re = new RegExp(`export const ${name}[^=]*=\\s*\\[([^\\]]*)\\]`, 'm');
  const m = source.match(re);
  if (!m) return null;
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function dedupCheck(label, ids) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`duplicate id "${id}" in ${label}`);
    seen.add(id);
  }
  if (ids.length === 0) fail(`${label} is empty`);
}

const registry = read(REGISTRY_PATH);
const image = extractIds(registry, 'IMAGE_MODELS');
const video = extractIds(registry, 'VIDEO_MODELS');
const audio = extractAudioIds(registry);
const lengths = extractNumberArray(registry, 'VIDEO_LENGTHS_SEC');
const durations = extractNumberArray(registry, 'AUDIO_DURATIONS_SEC');

if (!image || !video || !audio || !lengths || !durations) {
  parseError('failed to parse shared registry');
}

dedupCheck('IMAGE_MODELS', image);
dedupCheck('VIDEO_MODELS', video);
for (const kind of ['music', 'speech', 'sfx']) {
  dedupCheck(`AUDIO_MODELS_BY_KIND.${kind}`, audio[kind]);
}
if (lengths.length === 0) fail('VIDEO_LENGTHS_SEC is empty');
if (durations.length === 0) fail('AUDIO_DURATIONS_SEC is empty');

for (const file of APP_REEXPORTS) {
  const source = read(file);
  if (source.includes('export const IMAGE_MODELS') || source.includes('export const VIDEO_MODELS')) {
    fail(`${path.relative(ROOT, file)} defines a local media registry; import from @pixelpitch/contracts instead`);
  }
  if (!source.includes('@pixelpitch/contracts')) {
    fail(`${path.relative(ROOT, file)} does not re-export from @pixelpitch/contracts`);
  }
}

process.stdout.write('verify-media-models: OK (shared registry + app re-exports)\n');
