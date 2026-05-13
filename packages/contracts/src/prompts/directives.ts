import { DESIGN_DIRECTIONS } from './directions.js';
import type { DesignDirection } from './directions/types.js';

export type PromptDirectiveKind = 'visual-direction';

export interface PromptDirective {
  id: string;
  kind: PromptDirectiveKind;
  title: string;
  summary: string;
  tags: string[];
  source: string;
  /**
   * How this directive composes with brand systems. This is intentionally
   * explicit because directives are searched like skills, but they are not
   * allowed to supersede a selected DESIGN.md.
   */
  composition: {
    authority: 'fallback' | 'overlay';
    precedence: string;
  };
  payload: DesignDirection;
}

export interface PromptDirectiveSearchResult {
  directive: PromptDirective;
  score: number;
  matched: string[];
}

export function listPromptDirectives(): PromptDirective[] {
  return DESIGN_DIRECTIONS.map(directionToDirective);
}

export function findPromptDirective(id: string): PromptDirective | undefined {
  const needle = id.trim();
  return listPromptDirectives().find((directive) => directive.id === needle);
}

export function searchPromptDirectives(query: string, limit = 8): PromptDirectiveSearchResult[] {
  const terms = tokenize(query);
  const all = listPromptDirectives();
  if (terms.length === 0) {
    return all.slice(0, limit).map((directive, index) => ({
      directive,
      score: Math.max(1, all.length - index),
      matched: [],
    }));
  }
  return all
    .map((directive) => scoreDirective(directive, terms))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.directive.id.localeCompare(b.directive.id))
    .slice(0, limit);
}

export interface RenderPromptDirectiveBlockOptions {
  /** True when a content/design-systems DESIGN.md is already active. */
  hasDesignSystem?: boolean;
}

export function renderPromptDirectiveBlock(
  ids: string[],
  options: RenderPromptDirectiveBlockOptions = {},
): string {
  const directives = ids
    .map((id) => findPromptDirective(id))
    .filter((directive): directive is PromptDirective => Boolean(directive));
  if (directives.length === 0) return '';
  const lines = [
    '## Selected prompt directives',
    '',
    options.hasDesignSystem
      ? 'The user or system selected these directive packages. An active DESIGN.md is also present, so DESIGN.md token values, component rules, and brand constraints win. Use directives only as craft overlays: atmosphere, hierarchy, materiality, motion, imagery, and interaction behavior.'
      : 'The user or system selected these directive packages. No active DESIGN.md is present, so directive palettes and font stacks may be used as fallback visual-system tokens.',
    '',
  ];
  for (const directive of directives) {
    const d = directive.payload;
    lines.push(`### ${directive.title} \`(${directive.id})\``);
    lines.push('');
    lines.push(d.mood);
    lines.push('');
    lines.push(`Tags: ${directive.tags.join(', ')}`);
    lines.push(`References: ${d.references.join(', ')}`);
    lines.push('');
    if (options.hasDesignSystem) {
      lines.push('Token policy: do not replace active DESIGN.md tokens. Treat the direction palette and font stacks as mood references only.');
      lines.push('');
    } else {
      lines.push('Fallback tokens when no DESIGN.md is active:');
      lines.push('');
      lines.push('```css');
      lines.push(':root {');
      lines.push(`  --bg:      ${d.palette.bg};`);
      lines.push(`  --surface: ${d.palette.surface};`);
      lines.push(`  --fg:      ${d.palette.fg};`);
      lines.push(`  --muted:   ${d.palette.muted};`);
      lines.push(`  --border:  ${d.palette.border};`);
      lines.push(`  --accent:  ${d.palette.accent};`);
      lines.push(`  --font-display: ${d.displayFont};`);
      lines.push(`  --font-body:    ${d.bodyFont};`);
      if (d.monoFont) lines.push(`  --font-mono:    ${d.monoFont};`);
      lines.push('}');
      lines.push('```');
      lines.push('');
    }
    lines.push('Posture:');
    for (const item of d.posture) lines.push(`- ${item}`);
    if (d.materiality?.length) {
      lines.push('Materiality / depth:');
      for (const item of d.materiality) lines.push(`- ${item}`);
    }
    if (d.motion?.length) {
      lines.push('Motion / interaction:');
      for (const item of d.motion) lines.push(`- ${item}`);
    }
    if (d.imagery?.length) {
      lines.push('Imagery:');
      for (const item of d.imagery) lines.push(`- ${item}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function directionToDirective(direction: DesignDirection): PromptDirective {
  return {
    id: `direction:${direction.id}`,
    kind: 'visual-direction',
    title: direction.label,
    summary: direction.mood,
    tags: directionTags(direction),
    source: 'packages/contracts/src/prompts/directions.ts',
    composition: {
      authority: 'overlay',
      precedence:
        'DESIGN.md wins for tokens/components; directive supplies searchable craft intent and fallback tokens only when no design system is active.',
    },
    payload: direction,
  };
}

function directionTags(direction: DesignDirection): string[] {
  const text = [
    direction.id,
    direction.label,
    direction.mood,
    ...direction.references,
    ...direction.posture,
    ...(direction.materiality ?? []),
    ...(direction.motion ?? []),
    ...(direction.imagery ?? []),
  ].join(' ');
  const tags = new Set<string>();
  for (const token of tokenize(text)) {
    if (token.length >= 4) tags.add(token);
  }
  return Array.from(tags).slice(0, 18);
}

function scoreDirective(directive: PromptDirective, terms: string[]): PromptDirectiveSearchResult {
  const fields = [
    ['id', directive.id, 8],
    ['title', directive.title, 7],
    ['summary', directive.summary, 4],
    ['tags', directive.tags.join(' '), 5],
    ['references', directive.payload.references.join(' '), 4],
    ['posture', directive.payload.posture.join(' '), 3],
    ['materiality', directive.payload.materiality?.join(' ') ?? '', 3],
    ['motion', directive.payload.motion?.join(' ') ?? '', 3],
    ['imagery', directive.payload.imagery?.join(' ') ?? '', 3],
  ] as const;
  let score = 0;
  const matched = new Set<string>();
  for (const term of terms) {
    for (const [field, value, weight] of fields) {
      if (tokenize(value).some((token) => token === term || token.includes(term) || term.includes(token))) {
        score += weight;
        matched.add(field);
      }
    }
  }
  return { directive, score, matched: Array.from(matched) };
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}
