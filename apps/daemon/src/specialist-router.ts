import { planTaskDagLevels } from './task-dag.js';

export type SpecialistId =
  | 'researcher'
  | 'artifact-builder'
  | 'data-analyst'
  | 'media-producer'
  | 'reviewer';

export interface SpecialistProfile {
  id: SpecialistId;
  label: string;
  description: string;
  promptPrefix: string;
}

export interface SpecialistTaskNode {
  id: string;
  specialist: SpecialistId;
  title: string;
  task: string;
  dependsOn?: string[];
}

export interface SpecialistWorkflowPlan {
  mode: 'single' | 'parallel' | 'dag';
  tasks: SpecialistTaskNode[];
  levels: Array<{ level: number; taskIds: string[] }>;
}

export const SPECIALIST_PROFILES: Record<SpecialistId, SpecialistProfile> = {
  researcher: {
    id: 'researcher',
    label: 'Researcher',
    description: 'Gathers source-backed context, facts, and reference material.',
    promptPrefix: 'Act as a researcher. Ground claims in available project files and cite uncertainty clearly.',
  },
  'artifact-builder': {
    id: 'artifact-builder',
    label: 'Artifact Builder',
    description: 'Creates and edits user-facing project files.',
    promptPrefix: 'Act as an artifact builder. Produce concrete file-level recommendations or edits.',
  },
  'data-analyst': {
    id: 'data-analyst',
    label: 'Data Analyst',
    description: 'Analyzes structured data, metrics, and chart-ready insights.',
    promptPrefix: 'Act as a data analyst. Inspect data shape, calculations, and chart opportunities.',
  },
  'media-producer': {
    id: 'media-producer',
    label: 'Media Producer',
    description: 'Plans image, video, audio, and asset generation.',
    promptPrefix: 'Act as a media producer. Focus on visual/media asset needs, prompts, and production risks.',
  },
  reviewer: {
    id: 'reviewer',
    label: 'Reviewer',
    description: 'Reviews quality, correctness, accessibility, and shipping risks.',
    promptPrefix: 'Act as a reviewer. Be concrete about defects, validation, and must-fix items.',
  },
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'build',
  'create',
  'for',
  'from',
  'in',
  'it',
  'make',
  'of',
  'on',
  'the',
  'this',
  'to',
  'with',
]);

function includesAny(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'task';
}

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .slice(0, 12);
}

function taskFor(specialist: SpecialistId, request: string): SpecialistTaskNode {
  const profile = SPECIALIST_PROFILES[specialist];
  return {
    id: specialist,
    specialist,
    title: profile.label,
    task: [
      profile.promptPrefix,
      '',
      'Original request:',
      request,
      '',
      'Return a concise result for the parent agent. Include findings, changed files if you edited anything, validation performed, and remaining risks.',
    ].join('\n'),
  };
}

function isSpecialistId(value: unknown): value is SpecialistId {
  return typeof value === 'string' && value in SPECIALIST_PROFILES;
}

function extractJsonObject(text: string): unknown {
  const raw = String(text || '').trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidate = fenced?.[1] ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  if (!candidate || candidate.trim() === '') throw new Error('planner did not return a JSON object');
  return JSON.parse(candidate);
}

export function validateSpecialistWorkflowPlan(value: unknown, request = ''): SpecialistWorkflowPlan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('planner result must be a JSON object');
  }
  const input = value as Record<string, unknown>;
  const rawTasks = Array.isArray(input.tasks) ? input.tasks : [];
  if (rawTasks.length === 0) throw new Error('planner result must include at least one task');
  if (rawTasks.length > 8) throw new Error('planner result cannot include more than 8 tasks');

  const tasks = rawTasks.map((raw, index): SpecialistTaskNode => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error(`task ${index + 1} must be an object`);
    }
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === 'string' && record.id.trim()
      ? slug(record.id)
      : `task-${index + 1}`;
    if (!isSpecialistId(record.specialist)) {
      throw new Error(`task ${id} has invalid specialist`);
    }
    const title = typeof record.title === 'string' && record.title.trim()
      ? record.title.trim().slice(0, 80)
      : SPECIALIST_PROFILES[record.specialist].label;
    const body = typeof record.task === 'string' && record.task.trim()
      ? record.task.trim()
      : typeof record.description === 'string'
        ? record.description.trim()
        : '';
    if (!body) throw new Error(`task ${id} is missing task text`);
    const dependsOn = Array.isArray(record.dependsOn)
      ? record.dependsOn.map((dep) => slug(String(dep))).filter(Boolean)
      : [];
    const profile = SPECIALIST_PROFILES[record.specialist];
    return {
      id,
      specialist: record.specialist,
      title,
      task: [
        profile.promptPrefix,
        '',
        body.slice(0, 6000),
        '',
        request ? `Original request:\n${request}` : '',
        '',
        'Return a concise result for the parent agent. Include findings, changed files if you edited anything, validation performed, and remaining risks.',
      ].filter(Boolean).join('\n'),
      dependsOn,
    };
  });

  const levels = planTaskDagLevels(tasks).map((level) => ({
    level: level.level,
    taskIds: level.nodes.map((task) => task.id),
  }));
  const maxLevelWidth = Math.max(...levels.map((level) => level.taskIds.length), 1);
  return {
    mode: tasks.length === 1 ? 'single' : maxLevelWidth > 1 ? 'dag' : 'parallel',
    tasks,
    levels,
  };
}

export function parseSpecialistPlannerOutput(text: string, request = ''): SpecialistWorkflowPlan {
  return validateSpecialistWorkflowPlan(extractJsonObject(text), request);
}

export function buildSpecialistPlannerPrompt(request: string): string {
  return [
    '# Pixelpitch specialist workflow planner',
    '',
    'Create a dependency-aware DAG for the request. Return ONLY JSON. No markdown.',
    '',
    'Available specialists:',
    ...Object.values(SPECIALIST_PROFILES).map((profile) =>
      `- ${profile.id}: ${profile.description}`,
    ),
    '',
    'Schema:',
    '{"tasks":[{"id":"research","specialist":"researcher","title":"Research","task":"Concrete bounded task","dependsOn":[]}]}',
    '',
    'Rules:',
    '- Use 1-6 tasks unless the request truly needs more.',
    '- Independent tasks should have empty dependsOn so Pixelpitch can run them in parallel.',
    '- Artifact Builder should usually depend on research/data/media tasks.',
    '- Reviewer should usually depend on artifact-builder or all upstream tasks.',
    '- Task ids must be short kebab-case strings.',
    '',
    '# User request',
    request,
  ].join('\n');
}

export function planSpecialistWorkflow(request: string): SpecialistWorkflowPlan {
  const raw = String(request || '').trim();
  if (!raw) {
    throw new Error('request required');
  }
  const text = raw.toLowerCase();
  const selected = new Set<SpecialistId>();

  if (includesAny(text, ['research', 'source', 'market', 'latest', 'competitor', 'benchmark'])) {
    selected.add('researcher');
  }
  if (includesAny(text, ['data', 'csv', 'metric', 'analytics', 'chart', 'dashboard', 'kpi'])) {
    selected.add('data-analyst');
  }
  if (includesAny(text, ['image', 'video', 'audio', 'asset', 'visual', 'illustration', 'photo'])) {
    selected.add('media-producer');
  }
  if (includesAny(text, ['review', 'audit', 'qa', 'test', 'accessibility', 'contrast', 'bug', 'risk'])) {
    selected.add('reviewer');
  }
  if (includesAny(text, ['build', 'create', 'implement', 'edit', 'fix', 'deck', 'slide', 'app', 'page', 'ui', 'artifact'])) {
    selected.add('artifact-builder');
  }

  if (selected.size === 0) selected.add('artifact-builder');
  if (raw.length > 260 && selected.size === 1) selected.add('reviewer');

  const ordered = ([
    'researcher',
    'data-analyst',
    'media-producer',
    'artifact-builder',
    'reviewer',
  ] as SpecialistId[]).filter((id) => selected.has(id));

  const tasks = ordered.map((id) => taskFor(id, raw));
  const hasBuilder = tasks.some((task) => task.specialist === 'artifact-builder');
  const hasReviewer = tasks.some((task) => task.specialist === 'reviewer');
  const builder = tasks.find((task) => task.specialist === 'artifact-builder');

  for (const task of tasks) {
    const deps = new Set(task.dependsOn ?? []);
    if (task.specialist === 'artifact-builder') {
      for (const upstream of tasks) {
        if (
          upstream.specialist === 'researcher' ||
          upstream.specialist === 'data-analyst' ||
          upstream.specialist === 'media-producer'
        ) {
          deps.add(upstream.id);
        }
      }
    }
    if (task.specialist === 'reviewer') {
      if (hasBuilder && builder) deps.add(builder.id);
      else {
        for (const upstream of tasks) {
          if (upstream.id !== task.id) deps.add(upstream.id);
        }
      }
    }
    task.dependsOn = [...deps];
  }

  if (!hasReviewer && (hasBuilder || tasks.length > 1)) {
    tasks.push({
      ...taskFor('reviewer', raw),
      id: `review-${slug(keywords(raw).join('-'))}`,
      dependsOn: hasBuilder && builder ? [builder.id] : tasks.map((task) => task.id),
    });
  }

  const levels = planTaskDagLevels(tasks).map((level) => ({
    level: level.level,
    taskIds: level.nodes.map((task) => task.id),
  }));

  const maxLevelWidth = Math.max(...levels.map((level) => level.taskIds.length), 1);
  return {
    mode: tasks.length === 1 ? 'single' : maxLevelWidth > 1 ? 'dag' : 'parallel',
    tasks,
    levels,
  };
}
