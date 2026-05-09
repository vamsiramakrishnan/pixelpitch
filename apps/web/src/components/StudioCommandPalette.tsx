import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Project } from '../types';
import type { Route } from '../router';
import { navigate } from '../router';
import { useModalLayer } from '../layers';
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
}

function goStudio(path: string) {
  window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function projectLabel(project: Project): string {
  const status = project.status?.value ? ` · ${project.status.value.replace(/_/g, ' ')}` : '';
  return `${project.name}${status}`;
}

export function StudioCommandPalette({ route, projects, onOpenSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
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
  }, [latestProjects, onOpenSettings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    const parts = q.split(/\s+/);
    return commands.filter((command) => {
      const haystack = `${command.title} ${command.detail} ${command.group} ${command.keywords}`.toLowerCase();
      return parts.every((part) => haystack.includes(part));
    });
  }, [commands, query]);

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
