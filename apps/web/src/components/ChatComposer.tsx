import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from 'framer-motion';
import { springs } from '../motion';
import { useT } from '../i18n';
import type { Dict } from '../i18n/types';
import { projectRawUrl, uploadProjectFiles } from "../providers/registry";
import type {
  AppConfig,
  ChatAttachment,
  ChatCommentAttachment,
  DesignSystemSummary,
  ProjectFile,
  SkillSummary,
} from "../types";
import { Icon } from "./Icon";
import { BUILT_IN_PETS, CUSTOM_PET_ID, resolveActivePet } from "./pet/pets";

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

interface SlashCommand {
  id: string;
  // Visible label, e.g. `/hatch`. Shown in the popover row.
  label: string;
  // Text inserted into the draft when the user picks the entry. The
  // cursor is positioned at the end of `insert`, so a trailing space
  // is the difference between a "ready for argument" command and a
  // "submit immediately" one.
  insert: string;
  // i18n key of the short description shown next to the label.
  descKey?: keyof Dict;
  descText?: string;
  // Optional argument hint shown after the description.
  argHint?: string;
  // Icon glyph from the project Icon set.
  icon: 'sparkles' | 'eye' | 'sliders' | 'edit';
}

interface Props {
  projectId: string | null;
  projectFiles: ProjectFile[];
  skills?: SkillSummary[];
  designSystems?: DesignSystemSummary[];
  streaming: boolean;
  initialDraft?: string;
  // Lazy ensure — the composer calls this before its first upload, so the
  // project folder exists on disk before files land in it. Returns the
  // project id when ready.
  onEnsureProject: () => Promise<string | null>;
  commentAttachments?: ChatCommentAttachment[];
  onRemoveCommentAttachment?: (id: string) => void;
  onSend: (prompt: string, attachments: ChatAttachment[], commentAttachments: ChatCommentAttachment[]) => void;
  onStop: () => void;
  // Opens the global settings dialog (CLI / model / agent picker). The
  // composer's leading gear icon routes here so users can switch models
  // without leaving the chat.
  onOpenSettings?: () => void;
  // Optional pet wiring — when present, the composer renders a small
  // 🐾 button + popover so users can adopt / wake / tuck a pet without
  // leaving chat. Typing `/pet` (or `/pet wake|tuck|<id>`) is parsed
  // out of the draft and routed to the same handlers.
  petConfig?: AppConfig['pet'];
  onAdoptPet?: (petId: string) => void;
  onTogglePet?: () => void;
  onOpenPetSettings?: () => void;
}

type MentionKind = 'file' | 'skill' | 'design' | 'craft' | 'action';

interface MentionItem {
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

// Imperative handle so ancestors (e.g. example chips in ChatPane) can
// push text into the composer without owning its draft state.
export interface ChatComposerHandle {
  setDraft: (text: string) => void;
  appendToken: (token: string) => void;
  focus: () => void;
}

/**
 * The chat composer: textarea + paste/drop/attach buttons + @-mention
 * picker. Attachments are uploaded into the active project's folder so
 * the agent can reference them by relative path on its next turn.
 *
 * `@` typed at a word boundary opens a popover listing project files.
 * Selecting one inserts `@<path>` into the prompt and stages it as an
 * attachment so the daemon also includes it explicitly.
 */
export const ChatComposer = forwardRef<ChatComposerHandle, Props>(
  function ChatComposer(
    {
      projectId,
      projectFiles,
      skills = [],
      designSystems = [],
      streaming,
      initialDraft,
      onEnsureProject,
      commentAttachments = [],
      onRemoveCommentAttachment,
      onSend,
      onStop,
      onOpenSettings,
      petConfig,
      onAdoptPet,
      onTogglePet,
      onOpenPetSettings,
    },
    ref
  ) {
    const t = useT();
    const [draft, setDraft] = useState(initialDraft ?? "");
    const [staged, setStaged] = useState<ChatAttachment[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [mention, setMention] = useState<{
      q: string;
      cursor: number;
    } | null>(null);
    const [mentionIndex, setMentionIndex] = useState(0);
    const [slash, setSlash] = useState<{
      q: string;
      cursor: number;
    } | null>(null);
    const [slashIndex, setSlashIndex] = useState(0);
    const [inspectedContext, setInspectedContext] = useState<MentionItem | null>(null);
    const [rewritePreview, setRewritePreview] = useState<{
      original: string;
      rewritten: string;
    } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [petOpen, setPetOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const importMenuRef = useRef<HTMLDivElement | null>(null);
    const importTriggerRef = useRef<HTMLButtonElement | null>(null);
    const petMenuRef = useRef<HTMLDivElement | null>(null);
    const petTriggerRef = useRef<HTMLButtonElement | null>(null);
    const petEnabled = Boolean(onAdoptPet && onTogglePet);
    const stagedCommentIdsRef = useRef<Set<string>>(new Set());
    // initialDraft is only honored on the first non-empty value the parent
    // hands us. After we seed once, the composer is fully under user control
    // — re-renders that pass the same prompt back must not reseed. If the
    // initial useState above already consumed a non-empty initialDraft we
    // mark it seeded immediately, so an early clear by the user (typing or
    // backspace before the parent stops passing initialDraft) does not get
    // overwritten by the effect.
    const seededRef = useRef(Boolean(initialDraft));

    useEffect(() => {
      if (seededRef.current) return;
      if (initialDraft && initialDraft !== draft) {
        setDraft(initialDraft);
        seededRef.current = true;
      } else if (initialDraft === undefined) {
        seededRef.current = true;
      }
    }, [initialDraft, draft]);

    useEffect(() => {
      if (!importOpen) return;
      function onPointer(e: MouseEvent) {
        const target = e.target as Node;
        if (importMenuRef.current?.contains(target)) return;
        if (importTriggerRef.current?.contains(target)) return;
        setImportOpen(false);
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setImportOpen(false);
      }
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onPointer);
        document.removeEventListener("keydown", onKey);
      };
    }, [importOpen]);

    useEffect(() => {
      if (!petOpen) return;
      function onPointer(e: MouseEvent) {
        const target = e.target as Node;
        if (petMenuRef.current?.contains(target)) return;
        if (petTriggerRef.current?.contains(target)) return;
        setPetOpen(false);
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setPetOpen(false);
      }
      document.addEventListener("mousedown", onPointer);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onPointer);
        document.removeEventListener("keydown", onKey);
      };
    }, [petOpen]);

    useEffect(() => {
      const fresh = commentAttachments.filter(
        (attachment) => !stagedCommentIdsRef.current.has(attachment.id),
      );
      if (fresh.length === 0) return;
      for (const attachment of fresh) stagedCommentIdsRef.current.add(attachment.id);
      setDraft((current) => {
        if (/(^|\s)@(selection|current)(\s|$)/.test(current)) return current;
        const suffix = current.trim().length > 0 ? ' ' : '';
        return `${current}${suffix}@selection `;
      });
      requestAnimationFrame(() => textareaRef.current?.focus());
    }, [commentAttachments]);

    // Catalog of supported slash commands. Each entry shows up in the
    // popover when the user types `/` in the composer. The `insert`
    // value is what we drop into the draft when the user picks the
    // entry — usually the canonical command form with a trailing space
    // ready for an argument.
    const slashCommands = useMemo<SlashCommand[]>(() => {
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
    }, [petEnabled, t]);

    const filteredSlash = useMemo(() => {
      if (!slash) return [] as SlashCommand[];
      const q = slash.q.toLowerCase();
      if (!q) return slashCommands;
      return slashCommands.filter((c) => c.label.toLowerCase().includes(q));
    }, [slash, slashCommands]);

    function pickSlash(cmd: SlashCommand) {
      const ta = textareaRef.current;
      if (!ta || !slash) return;
      const before = draft.slice(0, slash.cursor);
      const after = draft.slice(slash.cursor);
      // Replace the in-flight `/<query>` token with the picked
      // command's canonical insertion text.
      const replaced = before.replace(/\/[^\s/]*$/, cmd.insert);
      const next = replaced + after;
      setDraft(next);
      setSlash(null);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = replaced.length;
        ta.setSelectionRange(pos, pos);
      });
    }

    // Expand a `/hatch <concept>` draft into the canonical hatch-pet
    // skill prompt before sending. Returns null when the draft is not a
    // hatch command so the caller can fall through to the regular
    // submit path.
    function expandHatchCommand(input: string): string | null {
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
        'When the spritesheet is saved, tell me the absolute path and the pet folder name. I will adopt it from Settings → Pets → Recently hatched.',
      ].join('\n');
    }

    function expandPromptRewriteCommand(input: string): string | null {
      const trimmed = input.trim();
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

    // Parse a `/pet [arg]` slash command out of the draft. Recognized
    // forms: `/pet` (toggle wake/tuck), `/pet wake`, `/pet tuck`,
    // `/pet adopt` (open settings), or `/pet <id>` to adopt a built-in
    // by id. The slash is stripped from the draft on a successful match
    // so the user does not accidentally send the command to the agent.
    function tryHandlePetSlash(): boolean {
      if (!petEnabled) return false;
      const trimmed = draft.trim();
      const match = /^\/pet(?:\s+(\S+))?$/i.exec(trimmed);
      if (!match) return false;
      const arg = match[1]?.toLowerCase();
      if (!arg || arg === 'toggle') {
        onTogglePet?.();
      } else if (arg === 'wake' || arg === 'show') {
        if (petConfig?.adopted) {
          if (!petConfig.enabled) onTogglePet?.();
        } else {
          onOpenPetSettings?.();
        }
      } else if (arg === 'tuck' || arg === 'hide') {
        if (petConfig?.enabled) onTogglePet?.();
      } else if (arg === 'adopt' || arg === 'settings' || arg === 'change') {
        onOpenPetSettings?.();
      } else if (arg === CUSTOM_PET_ID) {
        onAdoptPet?.(CUSTOM_PET_ID);
      } else {
        const pet = BUILT_IN_PETS.find((p) => p.id === arg);
        if (pet) {
          onAdoptPet?.(pet.id);
        } else {
          return false;
        }
      }
      setDraft('');
      return true;
    }

    useImperativeHandle(
      ref,
      () => ({
        setDraft: (text: string) => {
          setDraft(text);
          seededRef.current = true;
          requestAnimationFrame(() => {
            const ta = textareaRef.current;
            if (!ta) return;
            ta.focus();
            const pos = text.length;
            ta.setSelectionRange(pos, pos);
          });
        },
        appendToken: (token: string) => {
          if (/^(inspect|edit|draw|slide):/i.test(token) || token.includes('\n')) {
            setDraft((current) => {
              const spacer = current.trim().length > 0 && !current.endsWith('\n') ? '\n\n' : '';
              return `${current}${spacer}${token.trim()} `;
            });
            seededRef.current = true;
            requestAnimationFrame(() => textareaRef.current?.focus());
            return;
          }
          const normalized = token.startsWith('@') ? token.slice(1) : token;
          setDraft((current) => {
            if (new RegExp(`(^|\\s)@${escapeRegExp(normalized)}(?=\\s|$)`).test(current)) {
              return current;
            }
            const spacer = current.trim().length > 0 && !current.endsWith(' ') ? ' ' : '';
            return `${current}${spacer}@${normalized} `;
          });
          seededRef.current = true;
          requestAnimationFrame(() => textareaRef.current?.focus());
        },
        focus: () => {
          textareaRef.current?.focus();
        },
      }),
      []
    );

    function reset() {
      setDraft("");
      setStaged([]);
      setUploadError(null);
      setMention(null);
      setSlash(null);
      setInspectedContext(null);
      setRewritePreview(null);
    }

    async function ensureProject(): Promise<string | null> {
      if (projectId) return projectId;
      return onEnsureProject();
    }

    async function uploadFiles(files: File[]) {
      if (files.length === 0) return;
      const id = await ensureProject();
      if (!id) return;
      setUploading(true);
      setUploadError(null);
      try {
        const result = await uploadProjectFiles(id, files);
        if (result.uploaded.length > 0) {
          setStaged((s) => [...s, ...result.uploaded]);
        }
        if (result.failed.length > 0) {
          const failedCount = result.failed.length;
          const uploadedCount = result.uploaded.length;
          const detail = result.error ? ` (${result.error})` : '';
          setUploadError(
            uploadedCount > 0
              ? `Attached ${uploadedCount} file(s), but ${failedCount} failed${detail}.`
              : `Attachment upload failed for ${failedCount} file(s)${detail}.`,
          );
          console.warn('Some attachments failed to upload', result.failed);
        }
      } finally {
        setUploading(false);
      }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const files: File[] = [];
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void uploadFiles(files);
      }
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
      e.preventDefault();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length > 0) void uploadFiles(files);
    }

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      const value = e.target.value;
      const cursor = e.target.selectionStart;
      setDraft(value);
      // Detect a fresh @ at start or after whitespace; capture the typed
      // query up to the cursor.
      const before = value.slice(0, cursor);
      const m = /(^|\s)@([^\s@]*)$/.exec(before);
      if (m) {
        setMention({ q: m[2] ?? "", cursor });
        setMentionIndex(0);
      } else {
        setMention(null);
      }
      // Slash-command popover — open as soon as the draft starts with
      // `/` (and the cursor is still inside the bare command token, no
      // space yet). Closes once the user commits a space or moves past
      // the prefix.
      const slashMatch = /^\/([^\s/]*)$/.exec(before);
      if (slashMatch) {
        setSlash({ q: slashMatch[1] ?? '', cursor });
        setSlashIndex(0);
      } else {
        setSlash(null);
      }
    }

    function insertMention(item: MentionItem) {
      if (!mention) return;
      const ta = textareaRef.current;
      if (!ta) return;
      const token = item.token;
      const cursor = mention.cursor;
      const before = draft.slice(0, cursor);
      const after = draft.slice(cursor);
      const replaced = before.replace(/@([^\s@]*)$/, `@${token} `);
      const next = replaced + after;
      setDraft(next);
      setMention(null);
      if (item.kind === 'file' && !staged.some((s) => s.path === token)) {
        setStaged((s) => [
          ...s,
          {
            path: token,
            name: token.split("/").pop() || token,
            kind: looksLikeImage(token) ? "image" : "file",
          },
        ]);
      }
      requestAnimationFrame(() => {
        ta.focus();
        const pos = replaced.length;
        ta.setSelectionRange(pos, pos);
      });
    }

    function removeStaged(p: string) {
      setStaged((s) => s.filter((a) => a.path !== p));
    }

    async function submit() {
      const prompt = draft.trim();
      // Intercept `/pet …` before sending so the slash command never
      // hits the agent — it is a local UX hook, not a model prompt.
      if (tryHandlePetSlash()) return;
      // `/hatch <concept>` expands into the canonical hatch-pet skill
      // prompt and *is* sent to the agent — the agent runs the skill,
      // packages a Codex pet under `~/.codex/pets/`, and the user
      // adopts it from "Recently hatched" in pet settings afterwards.
      const hatched = expandHatchCommand(prompt);
      if (hatched) {
        if (streaming) return;
        onSend(hatched, staged, commentAttachments);
        reset();
        return;
      }
      const rewritten = expandPromptRewriteCommand(prompt);
      if (rewritten) {
        if (streaming) return;
        setRewritePreview({ original: prompt, rewritten });
        return;
      }
      if ((!prompt && commentAttachments.length === 0) || streaming) return;
      onSend(prompt, staged, commentAttachments);
      reset();
    }

    const mentionItems = useMemo(() => {
      const fileItems: MentionItem[] = projectFiles
        .filter((f) => f.type === undefined || f.type === "file")
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
    }, [projectFiles, skills, designSystems]);

    const filteredMentions = mention
      ? mentionItems
          .map((item) => ({ item, score: scoreMention(item, mention.q) }))
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 18)
          .map(({ item }) => item)
      : [];
    const resolvedContext = useMemo(
      () => resolveContextItems(draft, mentionItems, staged, commentAttachments),
      [draft, mentionItems, staged, commentAttachments],
    );

    useEffect(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = 'auto';
      const next = Math.min(220, Math.max(64, ta.scrollHeight));
      ta.style.height = `${next}px`;
    }, [draft, resolvedContext.length, rewritePreview]);

    return (
      <div
        className={`composer composer-surface${dragActive ? " drag-active" : ""}${streaming ? " streaming" : ""}`}
        data-testid="chat-composer"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div className="composer-shell">
          {commentAttachments.length > 0 ? (
            <div className="composer-editing-prefix" data-testid="composer-editing-prefix">
              <Icon name="comment" size={12} />
              <span>
                Editing {commentAttachments.length === 1
                  ? commentAttachments[0]!.elementId
                  : `${commentAttachments.length} selected elements`}
              </span>
            </div>
          ) : null}
          {resolvedContext.length > 0 ? (
            <ContextInspector
              items={resolvedContext}
              commentAttachments={commentAttachments}
              inspected={inspectedContext}
              onInspect={setInspectedContext}
              onClearInspect={() => setInspectedContext(null)}
              onRemove={(item) => {
                setDraft((current) => removeMentionToken(current, item.token));
                if (item.kind === 'file') removeStaged(item.token);
              }}
            />
          ) : null}
          {rewritePreview ? (
            <RewritePreview
              preview={rewritePreview}
              onUse={() => {
                if (streaming) return;
                onSend(rewritePreview.rewritten, staged, commentAttachments);
                reset();
              }}
              onEdit={() => {
                setDraft(rewritePreview.rewritten);
                setRewritePreview(null);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
              onOriginal={() => {
                if (streaming) return;
                onSend(rewritePreview.original.replace(/^\/rewrite\s*/i, ''), staged, commentAttachments);
                reset();
              }}
            />
          ) : null}
          {staged.length > 0 ? (
            <StagedAttachments
              attachments={staged}
              projectId={projectId}
              onRemove={removeStaged}
              t={t}
            />
          ) : null}
          {commentAttachments.length > 0 ? (
            <StagedCommentAttachments
              attachments={commentAttachments}
              onRemove={(id) => onRemoveCommentAttachment?.(id)}
              t={t}
            />
          ) : null}
          <div className="composer-input-wrap">
            <textarea
              ref={textareaRef}
              data-testid="chat-composer-input"
              value={draft}
              placeholder={t('chat.composerPlaceholder')}
              onChange={handleChange}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (slash && filteredSlash.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSlashIndex((i) => (i + 1) % filteredSlash.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSlashIndex(
                      (i) => (i - 1 + filteredSlash.length) % filteredSlash.length,
                    );
                    return;
                  }
                  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey)) {
                    e.preventDefault();
                    const safe = Math.min(slashIndex, filteredSlash.length - 1);
                    pickSlash(filteredSlash[safe]!);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSlash(null);
                    return;
                  }
                }
                if (mention && filteredMentions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setMentionIndex((i) => (i + 1) % filteredMentions.length);
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setMentionIndex(
                      (i) => (i - 1 + filteredMentions.length) % filteredMentions.length,
                    );
                    return;
                  }
                  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey)) {
                    e.preventDefault();
                    const safe = Math.min(mentionIndex, filteredMentions.length - 1);
                    insertMention(filteredMentions[safe]!);
                    return;
                  }
                }
                if (mention && e.key === "Escape") {
                  setMention(null);
                  setMentionIndex(0);
                  return;
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
            {mention && filteredMentions.length > 0 ? (
              <MentionPopover
                items={filteredMentions}
                activeIndex={Math.min(mentionIndex, filteredMentions.length - 1)}
                onPick={insertMention}
              />
            ) : null}
            {slash && filteredSlash.length > 0 ? (
              <SlashPopover
                commands={filteredSlash}
                activeIndex={Math.min(slashIndex, filteredSlash.length - 1)}
                onPick={pickSlash}
                onHover={(i) => setSlashIndex(i)}
                t={t}
              />
            ) : null}
          </div>
          <div className="composer-row">
            <input
              ref={fileInputRef}
              data-testid="chat-file-input"
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                void uploadFiles(files);
                e.target.value = "";
              }}
            />
            <button
              className="icon-btn"
              onClick={() => onOpenSettings?.()}
              title={t('chat.cliSettingsTitle')}
              aria-label={t('chat.cliSettingsAria')}
              disabled={!onOpenSettings}
            >
              <Icon name="sliders" size={15} />
            </button>
            <button
              className="icon-btn"
              data-testid="chat-attach"
              onClick={() => fileInputRef.current?.click()}
              title={t('chat.attachTitle')}
              disabled={uploading}
              aria-label={t('chat.attachAria')}
            >
              {uploading ? (
                <Icon name="spinner" size={15} />
              ) : (
                <Icon name="attach" size={15} />
              )}
            </button>
            <span className="composer-icon-divider" aria-hidden />
            <div className="composer-import-wrap">
              <button
                ref={importTriggerRef}
                type="button"
                className="composer-import"
                onClick={() => setImportOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={importOpen}
                title={t('chat.importTitle')}
              >
                <Icon name="import" size={13} />
                <span>{t('chat.importLabel')}</span>
                <Icon name="chevron-down" size={12} />
              </button>
              {importOpen ? (
                <div
                  ref={importMenuRef}
                  className="composer-import-menu"
                  role="menu"
                >
                  <ImportItem icon="upload" label={t('chat.importFig')} t={t} />
                  <ImportItem icon="link" label={t('chat.importGitHub')} t={t} />
                  <ImportItem icon="grid" label={t('chat.importWeb')} t={t} />
                  <ImportItem icon="folder" label={t('chat.importFolder')} t={t} />
                  <ImportItem
                    icon="sparkles"
                    label={t('chat.importSkills')}
                    t={t}
                  />
                  <ImportItem icon="file" label={t('chat.importProject')} t={t} />
                </div>
              ) : null}
            </div>
            {petEnabled ? (
              <div className="composer-pet-wrap">
                <button
                  ref={petTriggerRef}
                  type="button"
                  className={`composer-pet${petConfig?.adopted ? ' adopted' : ''}`}
                  onClick={() => setPetOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={petOpen}
                  title={t('pet.composerTitle')}
                >
                  <span className="composer-pet-glyph" aria-hidden>
                    {(() => {
                      const active = resolveActivePet(petConfig);
                      if (active) return active.glyph;
                      return '🐾';
                    })()}
                  </span>
                  <span className="composer-pet-label">
                    {petConfig?.adopted
                      ? petConfig.enabled
                        ? t('pet.tuck')
                        : t('pet.wake')
                      : t('pet.adopt')}
                  </span>
                  <Icon name="chevron-down" size={12} />
                </button>
                {petOpen ? (
                  <div
                    ref={petMenuRef}
                    className="composer-pet-menu"
                    role="menu"
                  >
                    <div className="composer-pet-menu-head">
                      <strong>{t('pet.composerMenuTitle')}</strong>
                      <span>{t('pet.composerMenuHint')}</span>
                    </div>
                    {petConfig?.adopted ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="composer-pet-menu-row toggle"
                        onClick={() => {
                          onTogglePet?.();
                          setPetOpen(false);
                        }}
                      >
                        <Icon
                          name={petConfig.enabled ? 'eye' : 'sparkles'}
                          size={12}
                        />
                        <span>
                          {petConfig.enabled
                            ? t('pet.tuck')
                            : t('pet.wake')}
                        </span>
                      </button>
                    ) : null}
                    <div className="composer-pet-menu-grid">
                      {BUILT_IN_PETS.map((p) => {
                        const active =
                          petConfig?.adopted && petConfig.petId === p.id;
                        return (
                          <button
                            type="button"
                            role="menuitem"
                            key={p.id}
                            className={`composer-pet-menu-pet${active ? ' active' : ''}`}
                            onClick={() => {
                              onAdoptPet?.(p.id);
                              setPetOpen(false);
                            }}
                            style={{ ['--pet-accent' as string]: p.accent }}
                            title={p.flavor}
                          >
                            <span aria-hidden>{p.glyph}</span>
                            <span>{p.name}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className="composer-pet-menu-row settings"
                      onClick={() => {
                        onOpenPetSettings?.();
                        setPetOpen(false);
                      }}
                    >
                      <Icon name="settings" size={12} />
                      <span>{t('pet.composerOpenSettings')}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <span className="composer-spacer" />
            <AnimatePresence mode="wait">
              {streaming ? (
                <motion.button
                  key="stop"
                  type="button"
                  className="composer-send stop"
                  onClick={onStop}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                >
                  <Icon name="stop" size={13} />
                  <span>{t('chat.stop')}</span>
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  type="button"
                  className="composer-send"
                  data-testid="chat-send"
                  onClick={() => void submit()}
                  disabled={!draft.trim() && commentAttachments.length === 0}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                >
                  <Icon name="send" size={13} />
                  <span>{t('chat.send')}</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        {uploadError ? <span className="composer-hint">{uploadError}</span> : null}
        <span className="composer-hint">{t('chat.composerHint')}</span>
      </div>
    );
  }
);

function ContextInspector({
  items,
  commentAttachments,
  inspected,
  onInspect,
  onClearInspect,
  onRemove,
}: {
  items: MentionItem[];
  commentAttachments: ChatCommentAttachment[];
  inspected: MentionItem | null;
  onInspect: (item: MentionItem) => void;
  onClearInspect: () => void;
  onRemove: (item: MentionItem) => void;
}) {
  const ambiguous = items.some((item) => contextDetailRows(item, commentAttachments).length <= 1);
  return (
    <div className="context-inspector" data-testid="context-inspector">
      <div className="context-inspector-row">
        <span className="context-inspector-label">Context</span>
        <AnimatePresence>
          {items.map((item) => (
            <motion.span
              key={`${item.kind}:${item.token}`}
              className={`context-chip ${item.kind}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            >
              <button
                type="button"
                className="context-chip-main"
                onClick={() => onInspect(item)}
                title={contextHelp(item)}
              >
                <Icon name={item.icon} size={12} />
                <span>{item.title}</span>
              </button>
              <button
                type="button"
                className="context-chip-remove"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item.title}`}
              >
                <Icon name="close" size={10} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      {inspected ? (
        <div className="context-inspector-detail">
          <div className="context-inspector-detail-copy">
            <strong>@{inspected.token}</strong>
            <span>{contextHelp(inspected)}</span>
            <dl>
              {contextDetailRows(inspected, commentAttachments).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <button type="button" className="ghost" onClick={onClearInspect}>
            Close
          </button>
        </div>
      ) : ambiguous ? (
        <div className="context-inspector-empty">
          Select a context chip to confirm exactly what the agent will receive.
        </div>
      ) : null}
    </div>
  );
}

function RewritePreview({
  preview,
  onUse,
  onEdit,
  onOriginal,
}: {
  preview: { original: string; rewritten: string };
  onUse: () => void;
  onEdit: () => void;
  onOriginal: () => void;
}) {
  return (
    <div className="rewrite-preview" data-testid="rewrite-preview">
      <div className="rewrite-preview-head">
        <strong>Prompt rewrite</strong>
        <span>Review before sending</span>
      </div>
      <pre>{preview.rewritten}</pre>
      <div className="rewrite-preview-actions">
        <button type="button" className="ghost" onClick={onOriginal}>
          Send original
        </button>
        <button type="button" className="ghost" onClick={onEdit}>
          Edit rewrite
        </button>
        <button type="button" className="primary" onClick={onUse}>
          Use rewrite
        </button>
      </div>
    </div>
  );
}

function StagedAttachments({
  attachments,
  projectId,
  onRemove,
  t,
}: {
  attachments: ChatAttachment[];
  projectId: string | null;
  onRemove: (path: string) => void;
  t: TranslateFn;
}) {
  return (
    <div className="staged-row" data-testid="staged-attachments">
      {attachments.map((a) => (
        <div key={a.path} className={`staged-chip staged-${a.kind}`}>
          {a.kind === "image" && projectId ? (
            <img src={projectRawUrl(projectId, a.path)} alt={a.name} />
          ) : (
            <span className="staged-icon" aria-hidden>
              <Icon name="file" size={13} />
            </span>
          )}
          <span className="staged-name" title={a.path}>
            {a.name}
          </span>
          <button
            className="staged-remove"
            onClick={() => onRemove(a.path)}
            title={t('common.delete')}
            aria-label={t('chat.removeAria', { name: a.name })}
          >
            <Icon name="close" size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

function StagedCommentAttachments({
  attachments,
  onRemove,
  t,
}: {
  attachments: ChatCommentAttachment[];
  onRemove: (id: string) => void;
  t: TranslateFn;
}) {
  return (
    <div className="staged-row comment-staged-row" data-testid="staged-comment-attachments">
      {attachments.map((a) => (
        <div key={a.id} className="staged-chip staged-comment">
          <span className="staged-name" title={`${a.elementId}: ${a.comment}`}>
            <strong>{a.elementId}</strong>
            <span>{a.comment}</span>
          </span>
          <button
            className="staged-remove"
            onClick={() => onRemove(a.id)}
            title={t('chat.comments.removeAttachment')}
            aria-label={t('chat.comments.removeAttachmentAria', { name: a.elementId })}
          >
            <Icon name="close" size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ImportItem({
  icon,
  label,
  t,
}: {
  icon: "upload" | "link" | "grid" | "folder" | "sparkles" | "file";
  label: string;
  t: TranslateFn;
}) {
  return (
    <button
      type="button"
      className="composer-import-item"
      role="menuitem"
      tabIndex={-1}
      disabled
      title={t('chat.importComingSoon')}
      onClick={(e) => e.preventDefault()}
    >
      <span className="ico" aria-hidden>
        <Icon name={icon} size={14} />
      </span>
      <span className="composer-import-item-label">{label}</span>
      <span className="composer-import-item-soon">{t('chat.importSoon')}</span>
    </button>
  );
}

function SlashPopover({
  commands,
  activeIndex,
  onPick,
  onHover,
  t,
}: {
  commands: SlashCommand[];
  activeIndex: number;
  onPick: (cmd: SlashCommand) => void;
  onHover: (index: number) => void;
  t: TranslateFn;
}) {
  return (
    <div
      className="slash-popover"
      data-testid="slash-popover"
      role="listbox"
      aria-label={t('pet.slashPopoverAria')}
    >
      <div className="slash-popover-head">
        <span>{t('pet.slashPopoverTitle')}</span>
        <span className="slash-popover-hint">{t('pet.slashPopoverHint')}</span>
      </div>
      {commands.map((cmd, idx) => {
        const active = idx === activeIndex;
        return (
          <button
            key={cmd.id}
            type="button"
            role="option"
            aria-selected={active}
            className={`slash-item${active ? ' active' : ''}`}
            onMouseDown={(e) => {
              // Prevent the textarea from losing focus before the click
              // handler fires — otherwise selectionStart resets and the
              // pick replacement targets the wrong substring.
              e.preventDefault();
            }}
            onMouseEnter={() => onHover(idx)}
            onClick={() => onPick(cmd)}
          >
            <span className="slash-item-icon" aria-hidden>
              <Icon name={cmd.icon} size={13} />
            </span>
            <span className="slash-item-body">
              <span className="slash-item-row">
                <code className="slash-item-label">{cmd.label}</code>
                {cmd.argHint ? (
                  <span className="slash-item-arg">{cmd.argHint}</span>
                ) : null}
              </span>
              <span className="slash-item-desc">
                {cmd.descKey ? t(cmd.descKey) : cmd.descText}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MentionPopover({
  items,
  activeIndex,
  onPick,
}: {
  items: MentionItem[];
  activeIndex: number;
  onPick: (item: MentionItem) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const grouped = groupMentionItems(items);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [items]);
  useEffect(() => {
    if (!ref.current) return;
    const active = ref.current.querySelector<HTMLElement>('.mention-item.active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);
  return (
    <div
      className="mention-popover"
      data-testid="mention-popover"
      ref={ref}
      role="listbox"
    >
      {grouped.map((group) => (
        <div key={group.kind} className="mention-group">
          <div className="mention-group-label">{mentionKindLabel(group.kind)}</div>
          {group.items.map(({ item, index }) => {
            const active = index === activeIndex;
            return (
              <button
                key={item.id}
                role="option"
                aria-selected={active}
                className={`mention-item ${item.kind}${active ? ' active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(item)}
              >
                <span className="mention-item-icon" aria-hidden>
                  <Icon name={item.icon} size={13} />
                </span>
                <span className="mention-item-body">
                  <span className="mention-item-title">{item.title}</span>
                  <span className="mention-item-subtitle">{item.subtitle}</span>
                </span>
                <code>@{item.token}</code>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function looksLikeImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(name);
}

function scoreMention(item: MentionItem, rawQuery: string): number {
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

function groupMentionItems(items: MentionItem[]): Array<{
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

function mentionKindLabel(kind: MentionKind): string {
  if (kind === 'action') return 'Targets & actions';
  if (kind === 'skill') return 'Discovered skills';
  if (kind === 'design') return 'Design systems';
  if (kind === 'craft') return 'Craft rules';
  return 'Project files';
}

function resolveContextItems(
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

function removeMentionToken(draft: string, token: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return draft.replace(new RegExp(`(^|\\s)@${escaped}(?=\\s|$)`, 'g'), ' ').replace(/\s{2,}/g, ' ').trimStart();
}

function contextHelp(item: MentionItem): string {
  if (item.kind === 'skill') return 'Agent receives this skill workflow and treats it as an explicit capability reference.';
  if (item.kind === 'design') return 'Agent receives this design system as style direction; multiple systems compose as primary plus inspiration.';
  if (item.kind === 'craft') return 'Agent applies this craft rule-set as a quality bar across the generated asset.';
  if (item.kind === 'action' && item.token.startsWith('slide:')) return 'Agent targets the dynamically rendered deck slide or matching saved slide context.';
  if (item.kind === 'action') return 'Agent targets the rendered element/selection context staged from edit or comment mode.';
  return 'Agent receives this project reference and can read it from the project workspace.';
}

function contextDetailRows(
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
