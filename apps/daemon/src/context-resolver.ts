// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import {
  composeSystemPrompt,
  searchPromptDirectives,
  type ContextResolveResponse,
  type ContextSearchResult,
  type ContextStackItem,
} from '@pixelpitch/contracts';
import { listSkills, searchSkills } from './skills.js';
import { listCraftSections, loadCraftSections, searchCraftSections } from './craft.js';
import { listDesignSystems, readDesignSystem, searchDesignSystems } from './design-systems.js';

export async function searchContextRegistry({
  query,
  limit = 12,
  skillsDir,
  designSystemsDir,
  craftDir,
}) {
  const [skills, systems, craft, directives] = await Promise.all([
    searchSkills(skillsDir, query, limit),
    searchDesignSystems(designSystemsDir, query, limit),
    searchCraftSections(craftDir, query, limit),
    Promise.resolve(searchPromptDirectives(query, limit)),
  ]);
  const results = [
    ...skills.map((item): ContextSearchResult => ({
      kind: 'skill',
      id: item.skill.id,
      title: item.skill.name,
      summary: item.skill.description,
      score: item.score,
      source: `content/skills/${item.skill.id}/SKILL.md`,
      tier: 'agent-requested',
      metadata: {
        mode: item.skill.mode,
        surface: item.skill.surface,
        cliProcedures: item.skill.cliProcedures?.length ?? 0,
      },
    })),
    ...systems.map((item): ContextSearchResult => ({
      kind: 'design-system',
      id: item.designSystem.id,
      title: item.designSystem.title,
      summary: item.designSystem.summary,
      score: item.score,
      source: `content/design-systems/${item.designSystem.id}/DESIGN.md`,
      tier: 'auto',
      metadata: { category: item.designSystem.category },
    })),
    ...craft.map((item): ContextSearchResult => ({
      kind: 'craft',
      id: item.section.id,
      title: item.section.title,
      summary: item.section.summary,
      score: item.score,
      source: `content/craft/${item.section.path}`,
      tier: 'auto',
    })),
    ...directives.map((item): ContextSearchResult => ({
      kind: 'directive',
      id: item.directive.id,
      title: item.directive.title,
      summary: item.directive.summary,
      score: item.score,
      source: item.directive.source,
      tier: 'auto',
      metadata: { precedence: item.directive.composition.precedence },
    })),
  ];
  return results.sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind)).slice(0, limit);
}

export async function resolveTurnContext({
  project,
  message,
  skillId,
  skillIds = [],
  designSystemId,
  designSystemIds = [],
  craftIds = [],
  directiveIds = [],
  metadata,
  template,
  skillsDir,
  designSystemsDir,
  craftDir,
  includePrompt = true,
}): Promise<ContextResolveResponse & { prompt?: string }> {
  const trace = [];
  const stack: ContextStackItem[] = [];
  const promptForDiscovery = typeof message === 'string' ? message : '';
  const explicitSkillIds = uniqueStrings([
    ...(Array.isArray(skillIds) ? skillIds : []),
    typeof skillId === 'string' && skillId ? skillId : null,
  ]);
  const projectSkillId = project?.skillId ?? null;
  const baseSkillIds = uniqueStrings([...explicitSkillIds, projectSkillId]);
  trace.push(
    baseSkillIds.length > 0
      ? `Base skill resolved from ${explicitSkillIds.length > 0 ? 'explicit request' : 'project.skillId'}: ${baseSkillIds.join(', ')}.`
      : 'No explicit or project base skill was set; skill search may infer one.',
  );

  const [autoSkillMatches, autoDirectiveMatches, autoCraftMatches] = promptForDiscovery.trim()
    ? await Promise.all([
        searchSkills(skillsDir, promptForDiscovery, 5),
        Promise.resolve(searchPromptDirectives(promptForDiscovery, 5)),
        searchCraftSections(craftDir, promptForDiscovery, 5),
      ])
    : [[], [], []];

  const inferredSkillIds =
    baseSkillIds.length === 0 && autoSkillMatches[0]?.score >= 8
      ? [autoSkillMatches[0].skill.id]
      : [];
  if (inferredSkillIds.length > 0) {
    trace.push(`Inferred base skill from prompt: ${inferredSkillIds.join(', ')}.`);
  }
  const selectedSkillIds = uniqueStrings([...baseSkillIds, ...inferredSkillIds]);

  const effectiveDesignSystemIds = uniqueStrings([
    ...(Array.isArray(designSystemIds) ? designSystemIds : []),
    typeof designSystemId === 'string' && designSystemId ? designSystemId : null,
    project?.designSystemId,
  ]);
  if (effectiveDesignSystemIds.length > 0) {
    trace.push(`Design system resolved as brand authority: ${effectiveDesignSystemIds.join(', ')}.`);
  }

  const effectiveDirectiveIds = uniqueStrings([
    ...(Array.isArray(directiveIds) ? directiveIds : []),
    ...autoDirectiveMatches
      .filter((match) => match.score >= 6)
      .slice(0, 2)
      .map((match) => match.directive.id),
  ]);
  if (effectiveDirectiveIds.length > 0) {
    trace.push(`Directive overlays selected: ${effectiveDirectiveIds.join(', ')}.`);
  }

  let skillBody;
  let skillName;
  let skillMode;
  let skillCraftRequires = [];
  if (selectedSkillIds.length > 0) {
    const allSkills = await listSkills(skillsDir);
    const selectedSkills = selectedSkillIds
      .map((id) => allSkills.find((s) => s.id === id))
      .filter(Boolean);
    if (selectedSkills.length > 0) {
      skillBody = selectedSkills
        .map((skill) => `# Skill: ${skill.name} (${skill.id})\n\n${renderSkillCliOperatingProcedures(skill)}${skill.body}`)
        .join('\n\n---\n\n');
      skillName = selectedSkills.map((skill) => skill.name).join(' + ');
      skillMode = selectedSkills[0]?.mode;
      skillCraftRequires = uniqueStrings(
        selectedSkills.flatMap((skill) =>
          Array.isArray(skill.craftRequires) ? skill.craftRequires : [],
        ),
      );
      for (const skill of selectedSkills) {
        pushStack(stack, {
          kind: 'skill',
          id: skill.id,
          title: skill.name,
          summary: skill.description,
          score: selectedSkillIds.includes(skill.id) ? 100 : 0,
          source: `content/skills/${skill.id}/SKILL.md`,
          tier: 'always',
          reason: selectedSkillIds.includes(projectSkillId)
            ? 'Loaded as the project base skill workflow.'
            : 'Loaded as an explicit or inferred workflow skill.',
          loaded: true,
          metadata: {
            mode: skill.mode,
            cliProcedures: skill.cliProcedures?.length ?? 0,
          },
        });
        if (Array.isArray(skill.cliProcedures)) {
          for (const [index, proc] of skill.cliProcedures.entries()) {
            pushStack(stack, {
              kind: 'cli-procedure',
              id: `${skill.id}:cli:${index + 1}`,
              title: proc.command,
              summary: proc.when || 'Executable procedure declared or inferred from the skill.',
              score: 100,
              source: `content/skills/${skill.id}/SKILL.md`,
              tier: 'agent-requested',
              reason: 'Available because the active skill exposes a CLI operating procedure.',
              loaded: true,
              metadata: {
                customize: proc.customize,
                output: proc.output,
              },
            });
          }
        }
      }
    }
  }

  const effectiveCraftIds = uniqueStrings([
    ...skillCraftRequires,
    ...(Array.isArray(craftIds) ? craftIds : []),
    ...autoCraftMatches
      .filter((match) => match.score >= 8)
      .slice(0, 2)
      .map((match) => match.section.id),
  ]);

  let craftBody;
  let craftSections;
  if (effectiveCraftIds.length > 0) {
    const loaded = await loadCraftSections(craftDir, effectiveCraftIds);
    if (loaded.body) {
      craftBody = loaded.body;
      craftSections = loaded.sections;
      const sections = await listCraftSections(craftDir);
      for (const id of loaded.sections) {
        const section = sections.find((item) => item.id === id);
        pushStack(stack, {
          kind: 'craft',
          id,
          title: section?.title ?? id,
          summary: section?.summary ?? '',
          score: 100,
          source: `content/craft/${id}.md`,
          tier: skillCraftRequires.includes(id) ? 'auto' : 'manual',
          reason: skillCraftRequires.includes(id)
            ? 'Loaded because the base skill requires this craft rule.'
            : 'Loaded from explicit mention or automatic prompt match.',
          loaded: true,
        });
      }
    }
  }

  let designSystemBody;
  let designSystemTitle;
  let designSystemCss;
  if (effectiveDesignSystemIds.length > 0) {
    const systems = await listDesignSystems(designSystemsDir);
    const loadedSystems = [];
    for (const id of effectiveDesignSystemIds) {
      const body = await readDesignSystem(designSystemsDir, id);
      if (!body) continue;
      const summary = systems.find((s) => s.id === id);
      loadedSystems.push({ id, title: summary?.title ?? id, body, summary });
      pushStack(stack, {
        kind: 'design-system',
        id,
        title: summary?.title ?? id,
        summary: summary?.summary ?? '',
        score: 100,
        source: `content/design-systems/${id}/DESIGN.md`,
        tier: 'always',
        reason: 'Loaded as brand authority. Tokens/components override directive fallback tokens.',
        loaded: true,
        metadata: { category: summary?.category },
      });
    }
    if (loadedSystems.length > 0) {
      designSystemTitle = loadedSystems.map((system) => system.title).join(' + ');
      designSystemBody = loadedSystems
        .map((system, index) =>
          index === 0
            ? `# Primary design system: ${system.title} (${system.id})\n\n${system.body}`
            : `# Inspiration design system: ${system.title} (${system.id})\n\n${system.body}`,
        )
        .join('\n\n---\n\n');
    }
    try {
      const cssPath = path.join(designSystemsDir, effectiveDesignSystemIds[0], 'colors_and_type.css');
      designSystemCss = await fs.promises.readFile(cssPath, 'utf-8');
    } catch {
      // Optional CSS tokens.
    }
  }

  for (const directiveId of effectiveDirectiveIds) {
    const match = autoDirectiveMatches.find((item) => item.directive.id === directiveId);
    pushStack(stack, {
      kind: 'directive',
      id: directiveId,
      title: match?.directive.title ?? directiveId,
      summary: match?.directive.summary ?? 'Prompt directive overlay.',
      score: match?.score ?? 100,
      source: match?.directive.source ?? 'packages/contracts/src/prompts/directives.ts',
      tier: Array.isArray(directiveIds) && directiveIds.includes(directiveId) ? 'manual' : 'auto',
      reason: 'Loaded as aesthetic/craft overlay. It cannot override active DESIGN.md tokens.',
      loaded: true,
    });
  }

  for (const match of autoSkillMatches) {
    if (selectedSkillIds.includes(match.skill.id)) continue;
    pushStack(stack, {
      kind: 'skill',
      id: match.skill.id,
      title: match.skill.name,
      summary: match.skill.description,
      score: match.score,
      source: `content/skills/${match.skill.id}/SKILL.md`,
      tier: 'agent-requested',
      reason: 'Nearby workflow candidate. Available if the task pivots; not injected as active workflow.',
      loaded: false,
      metadata: {
        mode: match.skill.mode,
        cliProcedures: match.skill.cliProcedures?.length ?? 0,
      },
    });
  }

  const prompt = includePrompt
    ? composeSystemPrompt({
        skillBody,
        skillName,
        skillMode,
        designSystemBody,
        designSystemTitle,
        designSystemCss,
        craftBody,
        craftSections,
        directiveIds: effectiveDirectiveIds,
        metadata,
        template,
      })
    : undefined;

  return {
    stack,
    trace,
    baseSkillId: selectedSkillIds[0] ?? null,
    designSystemId: effectiveDesignSystemIds[0] ?? null,
    craftIds: craftSections ?? [],
    directiveIds: effectiveDirectiveIds,
    promptPreview: prompt ? prompt.slice(0, 4000) : undefined,
    prompt,
  };
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

function pushStack(stack: ContextStackItem[], item: ContextStackItem) {
  if (stack.some((existing) => existing.kind === item.kind && existing.id === item.id)) return;
  stack.push({
    ...item,
    tokenEstimate: Math.max(1, Math.ceil(`${item.title}\n${item.summary}`.length / 4)),
  });
}

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
