import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ContextSearchResponse, Project } from '../types';
import type { Route } from '../router';
import { navigate } from '../router';
import { useModalLayer } from '../layers';
import { searchContext } from '../providers/registry';
import { Icon } from './Icon';

type Command = {
  id: string;
  title: string;
  detail: string;
  group: string;
  icon: Parameters<typeof Icon>[0]['name'];
  keywords: string;
  run: () => void;
};

interface Props {
  route: Route;
  projects: Project[];
  onOpenSettings: () => void;
  onOpenContextPanel?: () => void;
  onStageContextToken?: (token: string) => void;
}

function goStudio(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function projectLabel(project: Project): string {
  const status = project.status?.value ? ` · ${project.status.value.replace(/_/g, ' ')}` : '';
  return `${project.name}${status}`;
}

export function StudioCommandPalette({
  route,
  projects,
  onOpenSettings,
  onOpenContextPanel,
  onStageContextToken,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [contextResults, setContextResults] = useState<ContextSearchResponse['results']>([]);
  const [contextSearching, setContextSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const layer = useModalLayer({
    open,
    onDismiss: () => setOpen(false),
    scrollLock: false,
  });

  const latestProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
        .slice(0, 5),
    [projects],
  );

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: 'studio-designs',
        title: 'Studio home',
        detail: 'Return to the project wall',
        group: 'Navigate',
        icon: 'grid',
        keywords: 'home studio designs projects dashboard',
        run: () => goStudio('/app?tab=designs'),
      },
      {
        id: 'new-prototype',
        title: 'New prototype',
        detail: 'Open the creation panel for an interactive UI',
        group: 'Create',
        icon: 'sparkles',
        keywords: 'create new prototype web app ui',
        run: () => goStudio('/app?create=prototype'),
      },
      {
        id: 'new-deck',
        title: 'New deck',
        detail: 'Start a presentation-ready slide deck',
        group: 'Create',
        icon: 'present',
        keywords: 'create new deck slides pptx presentation',
        run: () => goStudio('/app?create=deck'),
      },
      {
        id: 'new-image',
        title: 'New image',
        detail: 'Open image prompt templates and generation flow',
        group: 'Create',
        icon: 'image',
        keywords: 'create image poster media generation prompt',
        run: () => goStudio('/app?create=image'),
      },
      {
        id: 'examples',
        title: 'Example wall',
        detail: 'Browse artifact shapes and starter prompts',
        group: 'Explore',
        icon: 'file',
        keywords: 'examples gallery skills prompts',
        run: () => goStudio('/app?tab=examples'),
      },
      {
        id: 'systems',
        title: 'Design systems',
        detail: 'Choose typography, palette, and component language',
        group: 'Explore',
        icon: 'sliders',
        keywords: 'systems design tokens palette typography',
        run: () => goStudio('/app?tab=design-systems'),
      },
      {
        id: 'image-templates',
        title: 'Image prompt library',
        detail: 'Jump to visual prompt templates',
        group: 'Explore',
        icon: 'image',
        keywords: 'image templates prompts media',
        run: () => goStudio('/app?tab=image-templates'),
      },
      {
        id: 'settings',
        title: 'Settings',
        detail: 'Agent, model, theme, and provider controls',
        group: 'Workspace',
        icon: 'settings',
        keywords: 'settings model agent provider theme',
        run: onOpenSettings,
      },
      ...(route.kind === 'project'
        ? [
            {
              id: 'context-panel',
              title: 'Context stack',
              detail: 'Inspect the skill, design system, directives, craft, and CLI procedures loaded for this turn',
              group: 'Context',
              icon: 'eye' as const,
              keywords: 'context stack resolve inspect skill design directives craft cli loaded',
              run: () => onOpenContextPanel?.(),
            },
            {
              id: 'context-search',
              title: 'Search context',
              detail: 'Open @ search in the composer',
              group: 'Context',
              icon: 'search' as const,
              keywords: 'context search mention skills design systems craft files references',
              run: () => onStageContextToken?.('@'),
            },
            {
              id: 'context-selection',
              title: 'Use current selection',
              detail: 'Stage the active rendered target as edit context',
              group: 'Context',
              icon: 'comment' as const,
              keywords: 'context selection current target inspect edit comment',
              run: () => onStageContextToken?.('selection'),
            },
            {
              id: 'context-slide',
              title: 'Use current slide',
              detail: 'Stage the active deck slide as context',
              group: 'Context',
              icon: 'present' as const,
              keywords: 'context slide current deck presentation',
              run: () => onStageContextToken?.('slide:current'),
            },
          ]
        : []),
      {
        id: 'landing',
        title: 'Homepage',
        detail: 'Return to the public editorial landing page',
        group: 'Navigate',
        icon: 'arrow-left',
        keywords: 'landing homepage public',
        run: () => {
          window.location.href = '/';
        },
      },
    ];
    for (const project of latestProjects) {
      list.push({
        id: `project-${project.id}`,
        title: project.name,
        detail: projectLabel(project),
        group: 'Recent projects',
        icon: 'folder',
        keywords: `project recent ${project.name} ${project.skillId ?? ''}`,
        run: () => navigate({ kind: 'project', projectId: project.id, fileName: null }),
      });
    }
    return list;
  }, [latestProjects, onOpenContextPanel, onOpenSettings, onStageContextToken, route.kind]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dynamicContextCommands = contextResults
      .map((result): Command | null => {
        const token = contextToken(result.kind, result.id);
        if (!token) return null;
        return {
          id: `context-result-${result.kind}-${result.id}`,
          title: result.title,
          detail: result.summary || result.source || result.kind,
          group: 'Context results',
          icon: contextIcon(result.kind),
          keywords: `context ${result.kind} ${result.id} ${result.source ?? ''}`,
          run: () => onStageContextToken?.(token),
        };
      })
      .filter((command): command is Command => Boolean(command));
    const allCommands = [...dynamicContextCommands, ...commands];
    if (!q) return allCommands;
    const parts = q.split(/\s+/);
    return allCommands.filter((command) => {
      const haystack = `${command.title} ${command.detail} ${command.group} ${command.keywords}`.toLowerCase();
      return parts.every((part) => haystack.includes(part));
    });
  }, [commands, contextResults, onStageContextToken, query]);

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open || route.kind !== 'project') {
      setContextResults([]);
      setContextSearching(false);
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setContextResults([]);
      setContextSearching(false);
      return;
    }
    let cancelled = false;
    setContextSearching(true);
    const timer = window.setTimeout(() => {
      void searchContext(q, 8)
        .then((result) => {
          if (!cancelled) setContextResults(result.results);
        })
        .finally(() => {
          if (!cancelled) setContextSearching(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, route.kind]);

  function run(command: Command) {
    setOpen(false);
    command.run();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(filtered.length - 1, index + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === 'Enter' && filtered[active]) {
      event.preventDefault();
      run(filtered[active]);
    }
  }

  return (
    <>
      <button
        type="button"
        className="studio-command-chip"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Icon name="sparkles" size={13} />
        <span>Command</span>
        <kbd>{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K</kbd>
      </button>
      {open ? (
        <div ref={layer.contentRef} className="command-backdrop" role="presentation" style={{ zIndex: layer.zIndex }} onMouseDown={layer.onBackdropClick}>
          <div
            className="command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="command-orb" aria-hidden />
            <div className="command-input-row">
              <Icon name="search" size={17} />
              <input
                ref={inputRef}
                value={query}
                placeholder={route.kind === 'project' ? 'Jump, create, open settings…' : 'Go somewhere beautiful…'}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
              />
              <kbd>Esc</kbd>
            </div>
            <div className="command-list" role="listbox" aria-label="Commands">
              {contextSearching ? (
                <div className="command-loading">Searching context registry...</div>
              ) : null}
              {filtered.length > 0 ? (
                filtered.map((command, index) => (
                  <button
                    key={command.id}
                    type="button"
                    className={`command-item${index === active ? ' active' : ''}`}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => run(command)}
                  >
                    <span className="command-item-icon"><Icon name={command.icon} size={15} /></span>
                    <span className="command-item-copy">
                      <strong>{command.title}</strong>
                      <em>{command.detail}</em>
                    </span>
                    <span className="command-item-group">{command.group}</span>
                  </button>
                ))
              ) : (
                <div className="command-empty">No matching command</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function contextToken(kind: string, id: string): string | null {
  if (kind === 'skill') return `skill:${id}`;
  if (kind === 'design-system') return `design:${id}`;
  if (kind === 'craft') return `craft:${id}`;
  if (kind === 'directive') return `directive:${id}`;
  if (kind === 'file') return id;
  return null;
}

function contextIcon(kind: string): Parameters<typeof Icon>[0]['name'] {
  if (kind === 'design-system') return 'sliders';
  if (kind === 'craft') return 'tweaks';
  if (kind === 'directive') return 'sparkles';
  if (kind === 'file') return 'file';
  return 'search';
}
