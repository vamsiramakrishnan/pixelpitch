export type ContextMentionKind =
  | 'skill'
  | 'design'
  | 'craft'
  | 'directive'
  | 'selection'
  | 'action'
  | 'file';

export interface ContextMention {
  raw: string;
  kind: ContextMentionKind;
  id: string;
  normalized: string;
}

export interface ParsedContextMentions {
  hasMentions: boolean;
  mentions: ContextMention[];
  skillIds: string[];
  designSystemIds: string[];
  craftIds: string[];
  directiveIds: string[];
  actionIds: string[];
  fileRefs: string[];
  selectionRefs: string[];
}

const TRAILING_PUNCTUATION_RE = /[),.;!?]+$/g;

export function parseContextMentions(input: string): ParsedContextMentions {
  const mentions: ContextMention[] = [];
  const out: ParsedContextMentions = {
    hasMentions: false,
    mentions,
    skillIds: [],
    designSystemIds: [],
    craftIds: [],
    directiveIds: [],
    actionIds: [],
    fileRefs: [],
    selectionRefs: [],
  };

  const pushUnique = (list: string[], value: string) => {
    if (value && !list.includes(value)) list.push(value);
  };

  for (const match of input.matchAll(/@([^\s]+)/g)) {
    const rawToken = match[1]?.replace(TRAILING_PUNCTUATION_RE, '') ?? '';
    if (!rawToken) continue;
    const parsed = parseMentionToken(rawToken);
    mentions.push(parsed);
    if (parsed.kind === 'skill') pushUnique(out.skillIds, parsed.id);
    else if (parsed.kind === 'design') pushUnique(out.designSystemIds, parsed.id);
    else if (parsed.kind === 'craft') pushUnique(out.craftIds, parsed.id);
    else if (parsed.kind === 'directive') pushUnique(out.directiveIds, parsed.id);
    else if (parsed.kind === 'action') pushUnique(out.actionIds, parsed.id);
    else if (parsed.kind === 'selection') pushUnique(out.selectionRefs, parsed.id);
    else pushUnique(out.fileRefs, parsed.id);
  }

  out.hasMentions = mentions.length > 0;
  return out;
}

function parseMentionToken(raw: string): ContextMention {
  const typed = raw.match(/^([a-z][a-z0-9-]*):(.*)$/i);
  if (typed) {
    const prefix = typed[1]!.toLowerCase();
    const value = typed[2]!.trim();
    if (prefix === 'skill') return mention(raw, 'skill', value);
    if (prefix === 'design' || prefix === 'design-system') return mention(raw, 'design', value);
    if (prefix === 'craft') return mention(raw, 'craft', value);
    if (prefix === 'directive') return mention(raw, 'directive', value);
    if (prefix === 'slide') return mention(raw, 'selection', `slide:${value}`);
    if (prefix === 'file') return mention(raw, 'file', value);
  }

  if (raw === 'selection' || raw === 'current' || raw.startsWith('slide:')) {
    return mention(raw, 'selection', raw);
  }
  if (raw === 'rewrite-prompt') return mention(raw, 'action', raw);
  return mention(raw, 'file', raw);
}

function mention(raw: string, kind: ContextMentionKind, id: string): ContextMention {
  return {
    raw,
    kind,
    id,
    normalized: `${kind}:${id}`,
  };
}
