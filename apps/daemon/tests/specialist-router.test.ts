import { describe, expect, it } from 'vitest';

import {
  parseSpecialistPlannerOutput,
  planSpecialistWorkflow,
} from '../src/specialist-router.js';

describe('planSpecialistWorkflow', () => {
  it('routes research, build, and review requests into dependent levels', () => {
    const plan = planSpecialistWorkflow(
      'Research competitors, build a landing page, and review it for accessibility.',
    );

    expect(plan.tasks.map((task) => task.specialist)).toContain('researcher');
    expect(plan.tasks.map((task) => task.specialist)).toContain('artifact-builder');
    expect(plan.tasks.map((task) => task.specialist)).toContain('reviewer');
    const builder = plan.tasks.find((task) => task.specialist === 'artifact-builder');
    const reviewer = plan.tasks.find((task) => task.specialist === 'reviewer');
    expect(builder?.dependsOn).toContain('researcher');
    expect(reviewer?.dependsOn).toContain('artifact-builder');
    expect(plan.levels.map((level) => level.taskIds)).toEqual([
      ['researcher'],
      ['artifact-builder'],
      ['reviewer'],
    ]);
  });

  it('fans independent source tasks into the same first level', () => {
    const plan = planSpecialistWorkflow(
      'Research the market, analyze CSV metrics, generate visual asset direction, then build the deck.',
    );

    expect(plan.levels[0]?.taskIds).toEqual(['researcher', 'data-analyst', 'media-producer']);
    expect(plan.levels[1]?.taskIds).toContain('artifact-builder');
  });
});

describe('parseSpecialistPlannerOutput', () => {
  it('validates structured planner JSON and derives DAG levels', () => {
    const plan = parseSpecialistPlannerOutput(JSON.stringify({
      tasks: [
        {
          id: 'research',
          specialist: 'researcher',
          title: 'Research',
          task: 'Find source material.',
        },
        {
          id: 'build',
          specialist: 'artifact-builder',
          title: 'Build',
          task: 'Build the page.',
          dependsOn: ['research'],
        },
      ],
    }), 'Build a page');

    expect(plan.tasks.map((task) => task.id)).toEqual(['research', 'build']);
    expect(plan.levels.map((level) => level.taskIds)).toEqual([
      ['research'],
      ['build'],
    ]);
  });

  it('rejects unknown specialists', () => {
    expect(() => parseSpecialistPlannerOutput(JSON.stringify({
      tasks: [{ id: 'x', specialist: 'wizard', task: 'Do magic.' }],
    }))).toThrow(/invalid specialist/);
  });
});
