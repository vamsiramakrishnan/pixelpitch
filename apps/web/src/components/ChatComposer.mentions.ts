import type {
  ChatAttachment,
  ChatCommentAttachment,
  DesignSystemSummary,
  ProjectFile,
  SkillSummary,
} from '../types';

export type MentionKind = 'file' | 'skill' | 'design' | 'craft' | 'action';

export interface MentionItem {
  id: string;
  kind: MentionKind;
  token: string;
  title: string;
  subtitle: string;
  icon: 'file' | 'image' | 'sparkles' | 'sun-moon' | 'tweaks' | 'edit' | 'comment' | 'present';
  file?: ProjectFile;
  skill?: SkillSummary;
  designSystem?: DesignSystemSummary;
}

const CRAFT_MENTION_ITEMS: MentionItem[] = [
  {
    id: 'craft:typography',
    kind: 'craft',
    token: 'craft:typography',
    title: 'Typography craft',
    subtitle: 'Type scale, rhythm, fit, and readable hierarchy',
    icon: 'tweaks',
  },
  {
    id: 'craft:color',
    kind: 'craft',
    token: 'craft:color',
    title: 'Color craft',
    subtitle: 'Palette roles, restraint, contrast, and accent usage',
    icon: 'tweaks',
  },
  {
    id: 'craft:anti-ai-slop',
    kind: 'craft',
    token: 'craft:anti-ai-slop',
    title: 'Anti-slop craft',
    subtitle: 'Avoid generic gradients, fragile spacing, and prompt-default tells',
    icon: 'tweaks',
  },
];

const ACTION_MENTION_ITEMS: MentionItem[] = [
  {
    id: 'action:rewrite-prompt',
    kind: 'action',
    token: 'rewrite-prompt',
    title: 'Rewrite prompt first',
    subtitle: 'Ask the agent to sharpen the brief before implementing',
    icon: 'edit',
  },
  {
    id: 'action:current-selection',
    kind: 'action',
    token: 'selection',
    title: 'Current selection',
    subtitle: 'Use the active preview/comment target when one is staged',
    icon: 'comment',
  },
  {
    id: 'action:current-slide',
    kind: 'action',
    token: 'slide:current',
    title: 'Current slide',
    subtitle: 'Target the dynamically rendered active deck slide',
    icon: 'present',
  },
];

export function buildMentionItems({
  projectFiles,
  skills,
  designSystems,
}: {
  projectFiles: ProjectFile[];
  skills: SkillSummary[];
  designSystems: DesignSystemSummary[];
}): MentionItem[] {
  const fileItems: MentionItem[] = projectFiles
    .filter((f) => f.type === undefined || f.type === 'file')
    .map((file) => {
      const key = file.path ?? file.name;
      return {
        id: `file:${key}`,
        kind: 'file',
        token: key,
        title: key,
        subtitle: file.size != null ? prettySize(file.size) : 'Project file',
        icon: looksLikeImage(key) ? 'image' : 'file',
        file,
      };
    });
  const skillItems: MentionItem[] = skills.map((skill) => ({
    id: `skill:${skill.id}`,
    kind: 'skill',
    token: `skill:${skill.id}`,
    title: skill.name,
    subtitle: [skill.mode, skill.description].filter(Boolean).join(' · '),
    icon: 'sparkles',
    skill,
  }));
  const designItems: MentionItem[] = designSystems.map((designSystem) => ({
    id: `design:${designSystem.id}`,
    kind: 'design',
    token: `design:${designSystem.id}`,
    title: designSystem.title,
    subtitle: designSystem.summary || designSystem.category,
    icon: 'sun-moon',
    designSystem,
  }));
  return [...ACTION_MENTION_ITEMS, ...skillItems, ...designItems, ...CRAFT_MENTION_ITEMS, ...fileItems];
}

export function filterMentionItems(items: MentionItem[], query: string): MentionItem[] {
  return items
    .map((item) => ({ item, score: scoreMention(item, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map(({ item }) => item);
}

export function looksLikeImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(name);
}

export function scoreMention(item: MentionItem, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) {
    if (item.kind === 'action') return 95;
    if (item.kind === 'skill') return 90;
    if (item.kind === 'design') return 84;
    if (item.kind === 'craft') return 78;
    return 50;
  }
  const haystack = [
    item.token,
    item.title,
    item.subtitle,
    item.kind,
    item.skill?.triggers?.join(' '),
    item.skill?.mode,
    item.designSystem?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (haystack.includes(q)) {
    const prefixBonus = item.token.toLowerCase().startsWith(q) || item.title.toLowerCase().startsWith(q) ? 30 : 0;
    const kindBonus = item.kind === 'skill' ? 18 : item.kind === 'design' ? 12 : item.kind === 'action' ? 10 : 0;
    return 50 + prefixBonus + kindBonus;
  }
  const chars = q.split('');
  let cursor = 0;
  for (const ch of chars) {
    const found = haystack.indexOf(ch, cursor);
    if (found === -1) return 0;
    cursor = found + 1;
  }
  return 18;
}

export function groupMentionItems(items: MentionItem[]): Array<{
  kind: MentionKind;
  items: Array<{ item: MentionItem; index: number }>;
}> {
  const order: MentionKind[] = ['action', 'skill', 'design', 'craft', 'file'];
  return order
    .map((kind) => ({
      kind,
      items: items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.kind === kind),
    }))
    .filter((group) => group.items.length > 0);
}

export function mentionKindLabel(kind: MentionKind): string {
  if (kind === 'action') return 'Targets & actions';
  if (kind === 'skill') return 'Discovered skills';
  if (kind === 'design') return 'Design systems';
  if (kind === 'craft') return 'Craft rules';
  return 'Project files';
}

export function resolveContextItems(
  draft: string,
  mentionItems: MentionItem[],
  staged: ChatAttachment[],
  commentAttachments: ChatCommentAttachment[],
): MentionItem[] {
  const byToken = new Map(mentionItems.map((item) => [item.token, item]));
  const out: MentionItem[] = [];
  const push = (item: MentionItem) => {
    if (!out.some((existing) => existing.kind === item.kind && existing.token === item.token)) {
      out.push(item);
    }
  };
  for (const match of draft.matchAll(/@([^\s]+)/g)) {
    const token = match[1]!.replace(/[),.;:!?]+$/g, '');
    const found = byToken.get(token);
    if (found) {
      push(found);
    } else {
      push({
        id: `file:${token}`,
        kind: token === 'selection' || token === 'current' || token.startsWith('slide:') ? 'action' : 'file',
        token,
        title: token,
        subtitle: token.startsWith('slide:')
          ? 'Rendered slide target'
          : token === 'selection' || token === 'current'
            ? 'Rendered selection target'
            : 'Project reference',
        icon: token.startsWith('slide:') ? 'present' : token === 'selection' || token === 'current' ? 'comment' : 'file',
      });
    }
  }
  for (const attachment of staged) {
    const found = byToken.get(attachment.path);
    push(found ?? {
      id: `file:${attachment.path}`,
      kind: 'file',
      token: attachment.path,
      title: attachment.name,
      subtitle: 'Staged attachment',
      icon: attachment.kind === 'image' ? 'image' : 'file',
    });
  }
  if (commentAttachments.length > 0) {
    push({
      id: 'action:selection',
      kind: 'action',
      token: 'selection',
      title: `${commentAttachments.length} selected target${commentAttachments.length === 1 ? '' : 's'}`,
      subtitle: 'Attached rendered element context',
      icon: 'comment',
    });
  }
  return out;
}

export function removeMentionToken(draft: string, token: string): string {
  const escaped = escapeRegExp(token);
  return draft.replace(new RegExp(`(^|\\s)@${escaped}(?=\\s|$)`, 'g'), ' ').replace(/\s{2,}/g, ' ').trimStart();
}

export function contextHelp(item: MentionItem): string {
  if (item.kind === 'skill') return 'Agent receives this skill workflow and treats it as an explicit capability reference.';
  if (item.kind === 'design') return 'Agent receives this design system as style direction; multiple systems compose as primary plus inspiration.';
  if (item.kind === 'craft') return 'Agent applies this craft rule-set as a quality bar across the generated asset.';
  if (item.kind === 'action' && item.token.startsWith('slide:')) return 'Agent targets the dynamically rendered deck slide or matching saved slide context.';
  if (item.kind === 'action') return 'Agent targets the rendered element/selection context staged from edit or comment mode.';
  return 'Agent receives this project reference and can read it from the project workspace.';
}

export function contextDetailRows(
  item: MentionItem,
  commentAttachments: ChatCommentAttachment[],
): Array<[string, string]> {
  if (item.kind === 'skill' && item.skill) {
    return [
      ['Mode', item.skill.mode],
      ['Surface', item.skill.surface ?? 'web'],
      ['Triggers', item.skill.triggers.length > 0 ? item.skill.triggers.join(', ') : 'None declared'],
      ['Requires design', item.skill.designSystemRequired ? 'Yes' : 'No'],
    ];
  }
  if (item.kind === 'design' && item.designSystem) {
    return [
      ['Category', item.designSystem.category],
      ['Surface', item.designSystem.surface ?? 'web'],
      ['Swatches', item.designSystem.swatches?.length ? item.designSystem.swatches.join(', ') : 'None declared'],
      ['Summary', item.designSystem.summary || 'No summary'],
    ];
  }
  if (item.kind === 'file') {
    return [
      ['Path', item.token],
      ['Size', item.file?.size != null ? prettySize(item.file.size) : 'Unknown until read'],
      ['Kind', looksLikeImage(item.token) ? 'Image reference' : 'Project file'],
    ];
  }
  if (item.kind === 'craft') {
    return [
      ['Rule set', item.token.replace(/^craft:/, '')],
      ['Applies as', 'Quality bar on top of active design systems'],
    ];
  }
  if (item.kind === 'action') {
    const selection = commentAttachments.length > 0
      ? commentAttachments.map((attachment) => `${attachment.elementId}: ${attachment.comment}`).join(' | ')
      : item.token.startsWith('slide:')
        ? 'Current rendered slide'
        : 'No rendered target attached yet';
    return [
      ['Target', selection],
      ['Token', `@${item.token}`],
    ];
  }
  return [['Token', `@${item.token}`]];
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
