import type { Dict } from '../i18n/types';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

export interface SlashCommand {
  id: string;
  label: string;
  insert: string;
  descKey?: keyof Dict;
  descText?: string;
  argHint?: string;
  icon: 'sparkles' | 'eye' | 'sliders' | 'edit';
}

export function buildSlashCommands({
  petEnabled,
  t,
}: {
  petEnabled: boolean;
  t: TranslateFn;
}): SlashCommand[] {
  const list: SlashCommand[] = [];
  if (petEnabled) {
    list.push(
      {
        id: 'pet',
        label: '/pet',
        insert: '/pet ',
        descKey: 'pet.slashPet',
        icon: 'sparkles',
        argHint: 'wake | tuck | <petId>',
      },
      {
        id: 'pet-wake',
        label: '/pet wake',
        insert: '/pet wake',
        descKey: 'pet.slashPetWake',
        icon: 'eye',
      },
      {
        id: 'pet-tuck',
        label: '/pet tuck',
        insert: '/pet tuck',
        descKey: 'pet.slashPetTuck',
        icon: 'eye',
      },
      {
        id: 'hatch',
        label: '/hatch',
        insert: '/hatch ',
        descKey: 'pet.slashHatch',
        icon: 'sparkles',
        argHint: t('pet.slashHatchArg'),
      },
    );
  }
  list.push(
    {
      id: 'workflow',
      label: '/workflow',
      insert: '/workflow ',
      descText: 'Plan with specialist sub-runs, parallel tasks, and a final synthesis.',
      icon: 'sparkles',
      argHint: '<brief>',
    },
    {
      id: 'rewrite',
      label: '/rewrite',
      insert: '/rewrite ',
      descText: 'Sharpen the draft into a high-signal agent brief before work starts.',
      icon: 'edit',
      argHint: '<rough brief>',
    },
    {
      id: 'critique',
      label: '/critique',
      insert: '/critique ',
      descText: 'Review referenced context before changing it.',
      icon: 'eye',
      argHint: '@current | @file',
    },
    {
      id: 'restyle',
      label: '/restyle',
      insert: '/restyle ',
      descText: 'Apply a referenced design system or craft direction.',
      icon: 'sliders',
      argHint: '@design:<name>',
    },
  );
  return list;
}

export function expandHatchCommand(input: string): string | null {
  const m = /^\/hatch(?:\s+([\s\S]*))?$/i.exec(input.trim());
  if (!m) return null;
  const concept = m[1]?.trim() ?? '';
  const intro = concept
    ? `Hatch a Codex-compatible animated pet for me. Concept: ${concept}.`
    : 'Hatch a Codex-compatible animated pet for me.';
  return [
    intro,
    '',
    'Use the @hatch-pet skill end-to-end:',
    '1. Generate the base look with $imagegen.',
    '2. Generate every row strip (idle, running-right, waving, jumping, failed, waiting, running, review).',
    '3. Mirror running-left from running-right only when the design is symmetric.',
    '4. Run the deterministic scripts (extract / compose / validate / contact-sheet / videos).',
    '5. Package the result into ${CODEX_HOME:-$HOME/.codex}/pets/<pet-name>/ with pet.json + spritesheet.webp.',
    '',
    'When the spritesheet is saved, tell me the absolute path and the pet folder name. I will adopt it from Settings -> Pets -> Recently hatched.',
  ].join('\n');
}

export function expandComposerCommand(input: string): string | null {
  const trimmed = input.trim();
  const workflow = /^\/workflow(?:\s+([\s\S]*))?$/i.exec(trimmed);
  if (workflow) {
    return buildSpecialistWorkflowPrompt(
      workflow[1]?.trim() || 'Use the current conversation and project context.',
    );
  }
  const rewrite = /^\/rewrite(?:\s+([\s\S]*))?$/i.exec(trimmed);
  if (rewrite) {
    const rough = rewrite[1]?.trim() ?? '';
    return [
      'Rewrite this into a precise Pixelpitch agent brief, then execute it.',
      '',
      'Use a prompt-rewrite workflow before implementation:',
      '- infer the right interaction mode and output shape',
      '- preserve all user constraints and references',
      '- add missing context questions only if blocked',
      '- make the final working prompt concise, concrete, and action-oriented',
      '',
      rough ? `Rough brief:\n${rough}` : 'Rough brief: use the current conversation and attached context.',
    ].join('\n');
  }
  const critique = /^\/critique(?:\s+([\s\S]*))?$/i.exec(trimmed);
  if (critique) {
    const target = critique[1]?.trim() ?? '@current';
    return [
      `Critique ${target} before making changes.`,
      '',
      'Focus on interaction quality, mode fit, context gaps, visual hierarchy, responsive behavior, and concrete fixes. Then implement the highest-impact changes you can safely make.',
    ].join('\n');
  }
  const restyle = /^\/restyle(?:\s+([\s\S]*))?$/i.exec(trimmed);
  if (restyle) {
    const target = restyle[1]?.trim() ?? '@design:active';
    return [
      `Restyle the current artifact using ${target}.`,
      '',
      'Keep the structure intact unless the current layout blocks usability. Prioritize interaction clarity, readable hierarchy, and design-system consistency over decorative polish.',
    ].join('\n');
  }
  return null;
}

export function buildSpecialistWorkflowPrompt(brief: string): string {
  return [
    'Do not answer directly. Use the Pixelpitch delegation workflow tool now.',
    '',
    'Create a specialist DAG for this request. Run independent first-level tasks in parallel, then synthesize the child-agent results.',
    '',
    'Use these lanes when relevant:',
    '- Researcher: source-backed context, positioning, references, and story angle.',
    '- Data Analyst: inspect available project/data structure, metrics, comparisons, and chart opportunities.',
    '- Media Producer: visual system, imagery direction, asset prompts, and production risks.',
    '- Artifact Builder: concrete structure, implementation plan, or file-level edits.',
    '- Reviewer: quality, accessibility, correctness, and shipping risks.',
    '',
    'After the workflow finishes, include these sections:',
    '- Specialist results: what each child agent found or changed.',
    '- Workflow trace: dependency order and what ran in parallel.',
    '- Skills/context used: explicit skills, design systems, files, comments, or project context the run relied on. Say "none" if no explicit skill/context was used.',
    '- Weakest capabilities: the least reliable parts of the system for this request, including missing integrations, weak data, unavailable tools, UI gaps, or work that still depended on prompting instead of deterministic controls.',
    '- Final recommendation: what to do next.',
    '',
    `Request:\n${brief}`,
  ].join('\n');
}
