import { describe, expect, it } from 'vitest';

import {
  TaskDagError,
  planSlideCreationLevels,
  planTaskDagLevels,
} from '../src/task-dag.js';

describe('planTaskDagLevels', () => {
  it('groups independent tasks into the same execution level', () => {
    const levels = planTaskDagLevels([
      { id: 'research' },
      { id: 'outline', dependsOn: ['research'] },
      { id: 'chart', dependsOn: ['research'] },
      { id: 'merge', dependsOn: ['outline', 'chart'] },
    ]);

    expect(levels.map((level) => level.nodes.map((node) => node.id))).toEqual([
      ['research'],
      ['outline', 'chart'],
      ['merge'],
    ]);
  });

  it('deduplicates repeated dependency declarations', () => {
    const levels = planTaskDagLevels([
      { id: 1 },
      { id: 2, dependsOn: [1, 1, 1] },
    ]);

    expect(levels.map((level) => level.nodes.map((node) => node.id))).toEqual([
      [1],
      [2],
    ]);
  });

  it('rejects duplicate task ids', () => {
    expect(() => planTaskDagLevels([{ id: 'a' }, { id: 'a' }])).toThrowError(
      new TaskDagError('duplicate task id', 'DUPLICATE_TASK_ID', { id: 'a' }),
    );
  });

  it('rejects dependencies that are not in the task set', () => {
    expect(() =>
      planTaskDagLevels([{ id: 'a', dependsOn: ['missing'] }]),
    ).toThrowError(/unknown task/);
  });

  it('rejects cycles', () => {
    expect(() =>
      planTaskDagLevels([
        { id: 'a', dependsOn: ['b'] },
        { id: 'b', dependsOn: ['a'] },
      ]),
    ).toThrowError(/cycle/);
  });
});

describe('planSlideCreationLevels', () => {
  it('adds template creation dependencies for reused in-batch templates', () => {
    const levels = planSlideCreationLevels([
      { id: 'slide-1', page: 1, templateKey: 'title', templateStatus: 'new' },
      { id: 'slide-2', page: 2, templateKey: 'cards', templateStatus: 'new' },
      { id: 'slide-3', page: 3, templateKey: 'cards', templateStatus: 'existing' },
      { id: 'slide-4', page: 4, templateKey: 'quote', templateStatus: 'new' },
    ]);

    expect(levels.map((level) => level.nodes.map((node) => node.page))).toEqual([
      [1, 2, 4],
      [3],
    ]);
  });

  it('combines explicit content dependencies with template dependencies', () => {
    const levels = planSlideCreationLevels([
      { id: 'slide-1', page: 1, templateKey: 'flow', templateStatus: 'new' },
      { id: 'slide-2', page: 2, templateKey: 'flow', templateStatus: 'existing' },
      { id: 'slide-3', page: 3, dependsOn: ['slide-2'] },
    ]);

    expect(levels.map((level) => level.nodes.map((node) => node.page))).toEqual([
      [1],
      [2],
      [3],
    ]);
  });
});
