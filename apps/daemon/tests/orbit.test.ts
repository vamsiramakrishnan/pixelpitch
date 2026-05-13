import path from 'node:path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

import {
  buildOrbitPrompt,
  buildOrbitSystemPrompt,
  OrbitService,
  renderOrbitTemplateSystemPrompt,
  type OrbitRunHandler,
} from '../src/orbit.js';

describe('Orbit prompts', () => {
  it('keeps the visible prompt concise and puts connector mechanics in the system prompt', () => {
    const now = new Date('2026-05-06T15:32:52.361Z');
    const prompt = buildOrbitPrompt(now);
    const systemPrompt = buildOrbitSystemPrompt(now);

    expect(prompt).toContain("Create today's Orbit daily digest as a Live Artifact.");
    expect(prompt).not.toContain('DAILY DIGEST CONNECTOR CURATION');
    expect(systemPrompt).toContain('DAILY DIGEST CONNECTOR CURATION IS REQUIRED WHEN SUPPORTED');
  });

  it('renders selected template guidance', () => {
    const rendered = renderOrbitTemplateSystemPrompt({
      id: 'orbit-general',
      name: 'orbit-general',
      examplePrompt: 'Make a digest.',
      dir: path.join('/repo', 'skills', 'orbit-general'),
      body: 'Use this exact dashboard structure.',
      designSystemRequired: false,
    });

    expect(rendered).toContain('Selected Orbit template skill');
    expect(rendered).toContain('Do not apply the workspace design system');
    expect(rendered).toContain('Use this exact dashboard structure.');
  });
});

describe('OrbitService', () => {
  it('passes prompts to the run handler and records a completed summary', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'pixelpitch-orbit-'));
    try {
      const service = new OrbitService(dataDir);
      const captured: { request?: Parameters<OrbitRunHandler>[0] } = {};
      service.setRunHandler(async (request) => {
        captured.request = request;
        return {
          projectId: 'project-1',
          agentRunId: 'run-1',
          completion: Promise.resolve({ agentRunId: 'run-1', status: 'succeeded' }),
        };
      });

      await service.start('manual');
      let status = await service.status();
      for (let i = 0; i < 10 && !status.lastRun; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        status = await service.status();
      }

      expect(captured.request?.prompt).toContain("Create today's Orbit daily digest");
      expect(captured.request?.systemPrompt).toContain('live-artifact');
      expect(status.lastRun).toMatchObject({
        agentRunId: 'run-1',
        connectorsChecked: 1,
        connectorsSucceeded: 1,
      });
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it('treats malformed summary JSON as missing state', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'pixelpitch-orbit-'));
    try {
      await mkdir(path.join(dataDir, 'orbit'), { recursive: true });
      await writeFile(path.join(dataDir, 'orbit', 'activity-summary.json'), '{nope', 'utf8');

      await expect(new OrbitService(dataDir).status()).resolves.toMatchObject({
        lastRun: null,
      });
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
