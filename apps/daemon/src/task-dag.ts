export type TaskDagId = string | number;

export interface TaskDagNode {
  id: TaskDagId;
  dependsOn?: readonly TaskDagId[] | null;
}

export interface TaskDagLevel<T extends TaskDagNode> {
  level: number;
  nodes: T[];
}

export class TaskDagError extends Error {
  constructor(
    message: string,
    readonly code: 'DUPLICATE_TASK_ID' | 'UNKNOWN_DEPENDENCY' | 'CYCLE',
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'TaskDagError';
  }
}

function keyFor(id: TaskDagId): string {
  return `${typeof id}:${String(id)}`;
}

export function planTaskDagLevels<T extends TaskDagNode>(
  nodes: readonly T[],
): TaskDagLevel<T>[] {
  const byKey = new Map<string, T>();
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    const key = keyFor(node.id);
    if (byKey.has(key)) {
      throw new TaskDagError('duplicate task id', 'DUPLICATE_TASK_ID', {
        id: node.id,
      });
    }
    byKey.set(key, node);
    indegree.set(key, 0);
    outgoing.set(key, []);
  }

  for (const node of nodes) {
    const nodeKey = keyFor(node.id);
    const seenDeps = new Set<string>();
    for (const dep of node.dependsOn ?? []) {
      const depKey = keyFor(dep);
      if (!byKey.has(depKey)) {
        throw new TaskDagError('task depends on an unknown task', 'UNKNOWN_DEPENDENCY', {
          id: node.id,
          dependency: dep,
        });
      }
      if (seenDeps.has(depKey)) continue;
      seenDeps.add(depKey);
      outgoing.get(depKey)?.push(nodeKey);
      indegree.set(nodeKey, (indegree.get(nodeKey) ?? 0) + 1);
    }
  }

  let ready = nodes
    .map((node) => keyFor(node.id))
    .filter((key) => (indegree.get(key) ?? 0) === 0);
  const processed = new Set<string>();
  const levels: TaskDagLevel<T>[] = [];

  while (ready.length > 0) {
    const levelKeys = ready;
    levels.push({
      level: levels.length,
      nodes: levelKeys.map((key) => byKey.get(key)).filter((node): node is T => Boolean(node)),
    });
    ready = [];

    for (const key of levelKeys) {
      processed.add(key);
      for (const childKey of outgoing.get(key) ?? []) {
        const nextIndegree = (indegree.get(childKey) ?? 0) - 1;
        indegree.set(childKey, nextIndegree);
        if (nextIndegree === 0) ready.push(childKey);
      }
    }
  }

  if (processed.size !== nodes.length) {
    const blocked = nodes
      .filter((node) => !processed.has(keyFor(node.id)))
      .map((node) => node.id);
    throw new TaskDagError('task dependency graph contains a cycle', 'CYCLE', {
      ids: blocked,
    });
  }

  return levels;
}

export interface SlideCreationPlanNode extends TaskDagNode {
  page: number;
  templateKey?: string | null;
  templateStatus?: 'new' | 'existing' | null;
}

export function planSlideCreationLevels<T extends SlideCreationPlanNode>(
  slides: readonly T[],
): TaskDagLevel<T>[] {
  const templateCreator = new Map<string, TaskDagId>();

  for (const slide of slides) {
    const key = slide.templateKey?.trim();
    if (key && slide.templateStatus === 'new' && !templateCreator.has(key)) {
      templateCreator.set(key, slide.id);
    }
  }

  const enriched = slides.map((slide) => {
    const deps = new Set<TaskDagId>(slide.dependsOn ?? []);
    const key = slide.templateKey?.trim();
    const creator = key ? templateCreator.get(key) : undefined;
    if (
      creator !== undefined &&
      creator !== slide.id &&
      slide.templateStatus === 'existing'
    ) {
      deps.add(creator);
    }
    return { ...slide, dependsOn: [...deps] };
  }) as T[];

  return planTaskDagLevels(enriched);
}
