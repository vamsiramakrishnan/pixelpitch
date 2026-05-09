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
import { usePopoverLayer } from '../layers';
import { uploadProjectFiles } from "../providers/registry";
import type {
  AppConfig,
  ChatAttachment,
  ChatCommentAttachment,
  DesignSystemSummary,
  ProjectFile,
  SkillSummary,
} from "../types";
import { Icon } from "./Icon";
import {
  buildSlashCommands,
  buildSpecialistWorkflowPrompt,
  expandComposerCommand,
  expandHatchCommand,
  type SlashCommand,
} from './ChatComposer.commands';
import {
  ImportItem,
  RewritePreview,
  StagedAttachments,
  StagedCommentAttachments,
} from './ChatComposer.parts';
import { PetComposerMenu } from './ChatComposer.pet';
import {
  ContextInspector,
  MentionPopover,
  SlashPopover,
} from './ChatComposer.popovers';
import {
  buildMentionItems,
  escapeRegExp,
  filterMentionItems,
  looksLikeImage,
  removeMentionToken,
  resolveContextItems,
  type MentionItem,
} from './ChatComposer.mentions';
import { BUILT_IN_PETS, CUSTOM_PET_ID } from "./pet/pets";

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
    const [specialistWorkflow, setSpecialistWorkflow] = useState(false);
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

    const importLayer = usePopoverLayer({
      open: importOpen,
      onDismiss: () => setImportOpen(false),
      triggerRef: importTriggerRef as React.RefObject<HTMLElement | null>,
      insideRefs: [importMenuRef as React.RefObject<HTMLElement | null>],
    });

    const petLayer = usePopoverLayer({
      open: petOpen,
      onDismiss: () => setPetOpen(false),
      triggerRef: petTriggerRef as React.RefObject<HTMLElement | null>,
      insideRefs: [petMenuRef as React.RefObject<HTMLElement | null>],
    });

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

    const slashCommands = useMemo<SlashCommand[]>(
      () => buildSlashCommands({ petEnabled, t }),
      [petEnabled, t],
    );

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
      setSpecialistWorkflow(false);
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
      const rewritten = expandComposerCommand(prompt);
      if (rewritten) {
        if (streaming) return;
        if (/^\/workflow(?:\s|$)/i.test(prompt)) {
          onSend(rewritten, staged, commentAttachments);
          reset();
          return;
        }
        setRewritePreview({ original: prompt, rewritten });
        return;
      }
      if ((!prompt && commentAttachments.length === 0) || streaming) return;
      onSend(specialistWorkflow ? buildSpecialistWorkflowPrompt(prompt) : prompt, staged, commentAttachments);
      reset();
    }

    const mentionItems = useMemo(
      () => buildMentionItems({ projectFiles, skills, designSystems }),
      [projectFiles, skills, designSystems],
    );

    const filteredMentions = mention
      ? filterMentionItems(mentionItems, mention.q)
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
          {specialistWorkflow ? (
            <div className="composer-workflow-prefix" data-testid="composer-workflow-prefix">
              <Icon name="sparkles" size={12} />
              <span>Specialist workflow + capability notes enabled</span>
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
            <button
              type="button"
              className={`composer-workflow-toggle${specialistWorkflow ? ' active' : ''}`}
              aria-pressed={specialistWorkflow}
              disabled={streaming}
              title="Use specialist workflow and include skills/weak-capability notes"
              onClick={() => setSpecialistWorkflow((value) => !value)}
            >
              <Icon name="sparkles" size={13} />
              <span>Workflow</span>
            </button>
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
                  ref={(el) => { importMenuRef.current = el; importLayer.contentRef.current = el; }}
                  className="composer-import-menu"
                  role="menu"
                  style={{ zIndex: importLayer.zIndex }}
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
              <PetComposerMenu
                petConfig={petConfig}
                petOpen={petOpen}
                petTriggerRef={petTriggerRef}
                petMenuRef={petMenuRef}
                petZIndex={petLayer.zIndex}
                onToggleOpen={() => setPetOpen((v) => !v)}
                onClose={() => setPetOpen(false)}
                onAdoptPet={onAdoptPet}
                onTogglePet={onTogglePet}
                onOpenPetSettings={onOpenPetSettings}
                t={t}
              />
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
