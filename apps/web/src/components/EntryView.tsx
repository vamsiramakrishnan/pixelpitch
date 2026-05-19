import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import { usePopoverLayer } from '../layers';
import {
  DEFAULT_AUDIO_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
} from '../media/models';
import type {
  AgentInfo,
  AppConfig,
  DesignSystemSummary,
  Project,
  ProjectKind,
  ProjectMetadata,
  ProjectTemplate,
  PromptTemplateSummary,
  SkillSummary,
} from '../types';
import { DesignsTab } from './DesignsTab';
import { DesignSystemPreviewModal } from './DesignSystemPreviewModal';
import { DesignSystemsTab } from './DesignSystemsTab';
import { ExamplesTab } from './ExamplesTab';
import { Icon } from './Icon';
import { LanguageMenu } from './LanguageMenu';
import { CenteredLoader } from './Loading';
import { NewProjectPanel, type CreateInput, type CreateTab } from './NewProjectPanel';
import { PetRail } from './pet/PetRail';
import { PromptTemplatePreviewModal } from './PromptTemplatePreviewModal';
import { PromptTemplatesTab } from './PromptTemplatesTab';
import { apiRuntimeLabel } from '../utils/runtimeLabels';

export type EntryTopTab = 'designs' | 'examples' | 'design-systems' | 'media';

interface Props {
  skills: SkillSummary[];
  designSystems: DesignSystemSummary[];
  projects: Project[];
  templates: ProjectTemplate[];
  promptTemplates: PromptTemplateSummary[];
  defaultDesignSystemId: string | null;
  config: AppConfig;
  agents: AgentInfo[];
  loading?: boolean;
  initialTopTab?: EntryTopTab | null;
  initialCreateTab?: CreateTab | null;
  onCreateProject: (input: CreateInput & { pendingPrompt?: string }) => void;
  onImportClaudeDesign: (file: File) => Promise<void> | void;
  onOpenProject: (id: string) => void;
  onOpenLiveArtifact: (projectId: string, artifactId: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onChangeDefaultDesignSystem: (id: string) => void;
  onOpenSettings: () => void;
  // Deep-link into Settings → Pets so the entry view's "Adopt a pet"
  // pill drops the user straight onto the catalog instead of asking
  // them to hunt for the section.
  onAdoptPet: () => void;
  // Inline adopt from the right-side rail — picks a pet by id and
  // wakes the overlay without leaving the entry view.
  onAdoptPetInline: (petId: string) => void;
  // Toggle the overlay visibility (wake / tuck) from the rail.
  onTogglePet: () => void;
}

const SIDEBAR_MIN = 320;
const SIDEBAR_MAX = 560;
const SIDEBAR_DEFAULT = 380;
const SIDEBAR_STORAGE_KEY = 'od-entry-sidebar-width';

// Lets the user fully remove the right-side pet rail from the entry
// layout. They re-summon it from the entry-view avatar dropdown — the
// PetRail's own collapse toggle only narrows the column, so this state
// is the "the rail isn't there at all" escape hatch.
const PET_RAIL_HIDDEN_KEY = 'pixelpitch:pet-rail-hidden';

function loadSidebarWidth(): number {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!raw) return SIDEBAR_DEFAULT;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return SIDEBAR_DEFAULT;
    return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, n));
  } catch {
    return SIDEBAR_DEFAULT;
  }
}

function loadPetRailHidden(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PET_RAIL_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function EntryView({
  skills,
  designSystems,
  projects,
  templates,
  promptTemplates,
  defaultDesignSystemId,
  config,
  agents,
  loading = false,
  initialTopTab = null,
  initialCreateTab = null,
  onCreateProject,
  onImportClaudeDesign,
  onOpenProject,
  onOpenLiveArtifact,
  onDeleteProject,
  onRenameProject,
  onChangeDefaultDesignSystem,
  onOpenSettings,
  onAdoptPet,
  onAdoptPetInline,
  onTogglePet,
}: Props) {
  const t = useT();
  const [topTab, setTopTab] = useState<EntryTopTab>('designs');
  const [previewSystemId, setPreviewSystemId] = useState<string | null>(null);
  const [previewPromptTemplate, setPreviewPromptTemplate] =
    useState<PromptTemplateSummary | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => loadSidebarWidth());
  const [resizing, setResizing] = useState(false);
  const [petRailHidden, setPetRailHiddenState] = useState<boolean>(() => loadPetRailHidden());
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const lastIntentRef = useRef('');

  const entryAvatarLayer = usePopoverLayer({
    open: avatarMenuOpen,
    onDismiss: () => setAvatarMenuOpen(false),
    triggerRef: avatarMenuRef as React.RefObject<HTMLElement | null>,
  });

  function setPetRailHidden(next: boolean) {
    setPetRailHiddenState(next);
    try {
      window.localStorage.setItem(PET_RAIL_HIDDEN_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  const currentAgent = useMemo(
    () => agents.find((a) => a.id === config.agentId) ?? null,
    [agents, config.agentId],
  );
  const dashboardStats = useMemo(() => {
    const active = projects.filter((project) =>
      project.status?.value === 'running' ||
      project.status?.value === 'queued' ||
      project.status?.value === 'awaiting_input',
    ).length;
    const shipped = projects.filter((project) => project.status?.value === 'succeeded').length;
    return {
      total: projects.length,
      active,
      shipped,
      systems: designSystems.length,
    };
  }, [projects, designSystems.length]);
  const latestProject = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt || 0;
        const bTime = b.updatedAt || b.createdAt || 0;
        return bTime - aTime;
      })[0] ?? null,
    [projects],
  );
  const activeProject = useMemo(
    () =>
      projects.find((project) =>
        project.status?.value === 'running' ||
        project.status?.value === 'queued' ||
        project.status?.value === 'awaiting_input',
      ) ?? null,
    [projects],
  );
  const featuredProject = activeProject ?? latestProject;

  const envMetaLine = useMemo(() => {
    if (config.mode === 'api') {
      try {
        return `${config.model} · ${new URL(config.baseUrl).host}`;
      } catch {
        return config.model;
      }
    }
    return currentAgent
      ? `${currentAgent.name}${currentAgent.version ? ` · ${currentAgent.version}` : ''}`
      : t('settings.noAgentSelected');
  }, [config.mode, config.model, config.baseUrl, currentAgent, t]);

  // 'Use this prompt' on an example card is a fast path — skip the form and
  // create the project immediately with sane defaults derived from the skill,
  // seeding the chat composer with the example prompt via pendingPrompt.
  function usePromptFromSkill(skill: SkillSummary) {
    onCreateProject({
      name: skill.name,
      skillId: skill.id,
      designSystemId: null,
      metadata: metadataForSkill(skill),
      pendingPrompt: skill.examplePrompt || skill.description,
    });
  }

  function previewDesignSystem(id: string) {
    setPreviewSystemId(id);
  }

  const previewSystem = useMemo(
    () => (previewSystemId ? designSystems.find((d) => d.id === previewSystemId) ?? null : null),
    [designSystems, previewSystemId],
  );

  function handleCreate(input: CreateInput) {
    onCreateProject(input);
  }

  function focusCreatePanel() {
    const input = document.querySelector<HTMLInputElement>('[data-testid="new-project-name"]');
    input?.focus();
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  useEffect(() => {
    const intentKey = `${initialTopTab ?? ''}:${initialCreateTab ?? ''}`;
    if (!intentKey || lastIntentRef.current === intentKey) return;
    lastIntentRef.current = intentKey;
    if (initialTopTab) {
      setTopTab(initialTopTab);
    }
    if (initialCreateTab) {
      window.requestAnimationFrame(() => focusCreatePanel());
    }
  }, [initialTopTab, initialCreateTab]);

  const startWidthRef = useRef(0);
  const startXRef = useRef(0);

  useEffect(() => {
    if (!resizing) return;
    function onMove(e: MouseEvent) {
      const dx = e.clientX - startXRef.current;
      const next = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, startWidthRef.current + dx),
      );
      setSidebarWidth(next);
    }
    function onUp() {
      setResizing(false);
    }
    document.body.classList.add('entry-resizing');
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.classList.remove('entry-resizing');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    } catch {
      /* ignore */
    }
  }, [sidebarWidth]);


  // The right rail tracks its own collapse state internally and tells
  // us its preferred column width via a CSS variable on the wrapper —
  // we keep both the expanded and collapsed widths declarative here so
  // the grid stays in sync with whatever the rail decides to render.
  return (
    <div
      className={`entry${petRailHidden ? '' : ' has-pet-rail'}${initialTopTab || initialCreateTab ? ' entry-arrival' : ''}`}
      style={{
        gridTemplateColumns: petRailHidden
          ? `${sidebarWidth}px 1fr`
          : `${sidebarWidth}px 1fr auto`,
      }}
    >
      <aside className="entry-side" style={{ width: sidebarWidth }}>
        <div className="entry-brand">
          <span className="entry-brand-mark" aria-hidden>
            <img src="/logo.svg" alt="" className="brand-mark-img" draggable={false} />
          </span>
          <div className="entry-brand-text">
            <div className="entry-brand-title-row">
              <span className="entry-brand-title">{t('app.brand')}</span>
              <span className="entry-brand-pill">{t('app.brandPill')}</span>
            </div>
            <div className="entry-brand-subtitle">{t('app.brandSubtitle')}</div>
          </div>
        </div>
        <NewProjectPanel
          skills={skills}
          designSystems={designSystems}
          defaultDesignSystemId={defaultDesignSystemId}
          templates={templates}
          promptTemplates={promptTemplates}
          onCreate={handleCreate}
          onImportClaudeDesign={onImportClaudeDesign}
          mediaProviders={config.mediaProviders}
          loading={loading}
          initialTab={initialCreateTab}
        />
        <div className="entry-side-foot">
          <button
            type="button"
            className={`foot-pill pet-pill${config.pet?.adopted ? '' : ' pet-pill-fresh'}`}
            onClick={onAdoptPet}
            title={
              config.pet?.adopted
                ? t('pet.changePet')
                : t('pet.adoptCallout')
            }
          >
            <span className="pet-pill-glyph" aria-hidden>
              {config.pet?.adopted
                ? config.pet.petId === 'custom'
                  ? config.pet.custom.glyph || '🦄'
                  : '🐾'
                : '🐾'}
            </span>
            <span>
              {config.pet?.adopted
                ? t('pet.changePet')
                : t('pet.adoptCallout')}
            </span>
            {!config.pet?.adopted ? <span className="pet-pill-dot" aria-hidden /> : null}
          </button>
          <button
            type="button"
            className="foot-pill"
            onClick={onOpenSettings}
            title={t('settings.envConfigure')}
          >
            <Icon name="settings" size={12} />
            <span>
              {config.mode === 'daemon'
                ? t('settings.localCli')
                : apiRuntimeLabel(config)}
            </span>
            <span style={{ color: 'var(--text-faint)' }}>·</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
              {envMetaLine}
            </span>
          </button>
          <LanguageMenu />
        </div>
        <button
          type="button"
          aria-label={t('entry.resizeAria')}
          className={`entry-side-resizer${resizing ? ' dragging' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            startWidthRef.current = sidebarWidth;
            startXRef.current = e.clientX;
            setResizing(true);
          }}
        />
      </aside>
      <main className="entry-main">
        <div className="entry-header">
          <div className="entry-tabs" role="tablist">
            <TopTabButton current={topTab} value="designs" label={t('entry.tabDesigns')} onClick={setTopTab} />
            <TopTabButton current={topTab} value="examples" label={t('entry.tabExamples')} onClick={setTopTab} />
            <TopTabButton
              current={topTab}
              value="design-systems"
              label={t('entry.tabDesignSystems')}
              onClick={setTopTab}
            />
            <TopTabButton
              current={topTab}
              value="media"
              label="Media"
              onClick={setTopTab}
            />
          </div>
          <div className="entry-header-right">
            {/* Avatar dropdown — mirrors the project-view AvatarMenu so
                users get the same anchor for cross-cutting options
                (open settings, hide / show the pet rail). */}
            <div className="avatar-menu" ref={avatarMenuRef}>
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setAvatarMenuOpen((v) => !v)}
                title={t('entry.openSettingsTitle')}
                aria-label={t('entry.openSettingsAria')}
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
              >
                <img
                  src="/avatar.png"
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="avatar-btn-photo"
                />
              </button>
              {avatarMenuOpen ? (
                <div ref={entryAvatarLayer.contentRef} className="avatar-popover" role="menu" style={{ zIndex: entryAvatarLayer.zIndex }}>
                  <button
                    type="button"
                    className="avatar-item"
                    onClick={() => {
                      setPetRailHidden(!petRailHidden);
                      setAvatarMenuOpen(false);
                    }}
                  >
                    <span className="avatar-item-icon" aria-hidden>
                      <Icon name={petRailHidden ? 'sparkles' : 'eye'} size={14} />
                    </span>
                    <span>
                      {petRailHidden
                        ? t('pet.railShow')
                        : t('pet.railHide')}
                    </span>
                  </button>
                  <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 6px' }} />
                  <button
                    type="button"
                    className="avatar-item"
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      onOpenSettings();
                    }}
                  >
                    <span className="avatar-item-icon" aria-hidden>
                      <Icon name="settings" size={14} />
                    </span>
                    <span>{t('avatar.settings')}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="entry-tab-content">
          {loading ? (
            <CenteredLoader label={t('entry.loadingWorkspace')} />
          ) : (
            <>
              <section className="entry-dashboard" aria-label="Studio overview">
                <div className="entry-dashboard-copy">
                  <span className="entry-dashboard-kicker">PP / Studio Plate</span>
                  <h1>Make the next artifact</h1>
                  <p>Start with a focused output, then iterate with chat, files, comments, inspect-mode edits, and design-system context in one workspace.</p>
                  <div className="entry-dashboard-flow" aria-label="Creation workflow">
                    <span><Icon name="send" size={13} /> Brief</span>
                    <span><Icon name="file" size={13} /> Files</span>
                    <span><Icon name="eye" size={13} /> Preview</span>
                  </div>
                  <div className="entry-dashboard-actions">
                    <button type="button" className="primary entry-dashboard-action" onClick={focusCreatePanel}>
                      <Icon name="plus" size={14} />
                      <span>New project</span>
                    </button>
                    {featuredProject ? (
                      <button
                        type="button"
                        className="ghost entry-dashboard-action"
                        onClick={() => onOpenProject(featuredProject.id)}
                      >
                        <Icon name="chevron-right" size={14} />
                        <span>{activeProject ? 'Resume active' : 'Open latest'}</span>
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="entry-dashboard-plate" aria-label="Workspace summary">
                  <img src="/landing/hero-plate.png" alt="" draggable={false} />
                  <div className="entry-dashboard-plate-caption">
                    <span>FIG. 01</span>
                    <span>Local agent studio</span>
                  </div>
                  {featuredProject ? (
                    <button
                      type="button"
                      className={`entry-dashboard-current status-${featuredProject.status?.value ?? 'idle'}`}
                      onClick={() => onOpenProject(featuredProject.id)}
                    >
                      <span className="entry-dashboard-current-label">
                        {activeProject ? 'Needs attention' : 'Latest workspace'}
                      </span>
                      <strong>{featuredProject.name}</strong>
                      <span>{projectStatusLabel(featuredProject)}</span>
                    </button>
                  ) : (
                    <div className="entry-dashboard-current empty">
                      <span className="entry-dashboard-current-label">No workspaces yet</span>
                      <strong>Create your first project</strong>
                      <span>Pick a format on the left and start from a clean workspace.</span>
                    </div>
                  )}
                  <div className="entry-dashboard-stats" aria-label="Workspace summary">
                    <DashboardStat label="Workspaces" value={dashboardStats.total} tone="blue" />
                    <DashboardStat label="Active" value={dashboardStats.active} tone="green" />
                    <DashboardStat label="Shipped" value={dashboardStats.shipped} tone="yellow" />
                    <DashboardStat label="Systems" value={dashboardStats.systems} tone="red" />
                  </div>
                </div>
              </section>
              {topTab === 'designs' ? (
                <DesignsTab
                  projects={projects}
                  skills={skills}
                  designSystems={designSystems}
                  onOpen={onOpenProject}
                  onOpenLiveArtifact={onOpenLiveArtifact}
                  onDelete={onDeleteProject}
                  onRename={onRenameProject}
                />
              ) : null}
              {topTab === 'examples' ? (
                <ExamplesTab skills={skills} onUsePrompt={usePromptFromSkill} />
              ) : null}
              {topTab === 'design-systems' ? (
                <DesignSystemsTab
                  systems={designSystems}
                  selectedId={defaultDesignSystemId}
                  onSelect={onChangeDefaultDesignSystem}
                  onPreview={previewDesignSystem}
                />
              ) : null}
              {topTab === 'media' ? (
                <MediaTemplatesTab
                  templates={promptTemplates}
                  onPreview={setPreviewPromptTemplate}
                />
              ) : null}
            </>
          )}
        </div>
      </main>
      {petRailHidden ? null : (
        <PetRail
          config={config}
          onAdoptInline={onAdoptPetInline}
          onOpenPetSettings={onAdoptPet}
          onTuck={onTogglePet}
          onHide={() => setPetRailHidden(true)}
        />
      )}
      {previewSystem ? (
        <DesignSystemPreviewModal
          open
          system={previewSystem}
          onClose={() => setPreviewSystemId(null)}
        />
      ) : null}
      {previewPromptTemplate ? (
        <PromptTemplatePreviewModal
          open
          summary={previewPromptTemplate}
          onClose={() => setPreviewPromptTemplate(null)}
        />
      ) : null}
    </div>
  );
}

function projectStatusLabel(project: Project) {
  switch (project.status?.value) {
    case 'queued':
      return 'Queued';
    case 'running':
      return 'Running now';
    case 'awaiting_input':
      return 'Awaiting input';
    case 'succeeded':
      return 'Completed';
    case 'failed':
      return 'Failed';
    case 'canceled':
      return 'Canceled';
    case 'not_started':
      return 'Ready to start';
    default:
      return 'Ready to continue';
  }
}

function DashboardStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'blue' | 'green' | 'yellow' | 'red';
}) {
  return (
    <div className={`entry-dashboard-stat ${tone}`}>
      <span className="entry-dashboard-stat-value">{value}</span>
      <span className="entry-dashboard-stat-label">{label}</span>
    </div>
  );
}

function MediaTemplatesTab({
  templates,
  onPreview,
}: {
  templates: PromptTemplateSummary[];
  onPreview: (tpl: PromptTemplateSummary) => void;
}) {
  const imageCount = templates.filter((tpl) => tpl.surface === 'image').length;
  const videoCount = templates.filter((tpl) => tpl.surface === 'video').length;
  return (
    <div className="media-templates-panel">
      <section className="media-templates-intro" aria-label="Media prompt library summary">
        <div>
          <span className="media-templates-kicker">Media Library</span>
          <h2>Prompt systems for image direction and motion briefs in one place.</h2>
          <p>
            Use the same gallery flow for stills and video: browse, preview, then carry the prompt into the creation panel.
          </p>
        </div>
        <div className="media-templates-counts" aria-label="Media template counts">
          <span><strong>{imageCount}</strong> image prompts</span>
          <span><strong>{videoCount}</strong> video prompts</span>
        </div>
      </section>
      <section className="media-template-section" aria-label="Image prompt templates">
        <div className="media-template-section-head">
          <Icon name="image" size={16} />
          <div>
            <h3>Image prompts</h3>
            <p>Visual systems for posters, editorial frames, product key art, and generated assets.</p>
          </div>
        </div>
        <PromptTemplatesTab surface="image" templates={templates} onPreview={onPreview} />
      </section>
      <section className="media-template-section" aria-label="Video prompt templates">
        <div className="media-template-section-head">
          <Icon name="play" size={16} />
          <div>
            <h3>Video prompts</h3>
            <p>Motion prompts with camera, rhythm, render intent, and HyperFrames-compatible direction.</p>
          </div>
        </div>
        <PromptTemplatesTab surface="video" templates={templates} onPreview={onPreview} />
      </section>
    </div>
  );
}

function TopTabButton({
  current,
  value,
  label,
  onClick,
}: {
  current: EntryTopTab;
  value: EntryTopTab;
  label: string;
  onClick: (v: EntryTopTab) => void;
}) {
  return (
    <button
      role="tab"
      data-testid={`entry-tab-${value}`}
      aria-selected={current === value}
      className={`entry-tab ${current === value ? 'active' : ''}`}
      onClick={() => onClick(value)}
    >
      {label}
    </button>
  );
}

// Map a skill's declared mode to project metadata. Falls back to the same
// defaults the new-project form would apply (high-fidelity prototype, no
// speaker notes on decks, no template animations) so 'Use this prompt'
// produces a project indistinguishable from one created via the form. Per-
// skill hints in SKILL.md frontmatter (od.fidelity, od.speaker_notes,
// od.animations) override the defaults so each example reproduces the
// shipped example.html — e.g. wireframe-sketch declares fidelity:wireframe.
function metadataForSkill(skill: SkillSummary): ProjectMetadata {
  const kind = kindForSkill(skill);
  if (kind === 'prototype') {
    return { kind, fidelity: skill.fidelity ?? 'high-fidelity' };
  }
  if (kind === 'deck') {
    return {
      kind,
      speakerNotes:
        typeof skill.speakerNotes === 'boolean' ? skill.speakerNotes : false,
    };
  }
  if (kind === 'template') {
    return {
      kind,
      animations:
        typeof skill.animations === 'boolean' ? skill.animations : false,
    };
  }
  if (kind === 'image') {
    return { kind, imageModel: DEFAULT_IMAGE_MODEL, imageAspect: '1:1' };
  }
  if (kind === 'video') {
    return { kind, videoModel: DEFAULT_VIDEO_MODEL, videoAspect: '16:9', videoLength: 5 };
  }
  if (kind === 'audio') {
    return {
      kind,
      audioKind: 'speech',
      audioModel: DEFAULT_AUDIO_MODEL.speech,
      audioDuration: 10,
    };
  }
  return { kind: 'other' };
}

function kindForSkill(skill: SkillSummary): ProjectKind {
  if (skill.mode === 'deck') return 'deck';
  if (skill.mode === 'prototype') return 'prototype';
  if (skill.mode === 'template') return 'template';
  if (skill.mode === 'image' || skill.surface === 'image') return 'image';
  if (skill.mode === 'video' || skill.surface === 'video') return 'video';
  if (skill.mode === 'audio' || skill.surface === 'audio') return 'audio';
  return 'other';
}
