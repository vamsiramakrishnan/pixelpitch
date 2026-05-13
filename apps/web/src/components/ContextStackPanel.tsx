import type { ContextResolveResponse } from '../types';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  loading: boolean;
  error: string | null;
  context: ContextResolveResponse | null;
  onClose: () => void;
  onRefresh: () => void;
  onAttachItem?: (item: ContextResolveResponse['stack'][number]) => void;
  onRemoveItem?: (item: ContextResolveResponse['stack'][number]) => void;
}

const KIND_LABELS: Record<string, string> = {
  skill: 'Skill',
  'design-system': 'Design',
  directive: 'Directive',
  craft: 'Craft',
  file: 'File',
  'cli-procedure': 'CLI',
};

export function ContextStackPanel({
  open,
  loading,
  error,
  context,
  onClose,
  onRefresh,
  onAttachItem,
  onRemoveItem,
}: Props) {
  const loaded = context?.stack.filter((item) => item.loaded) ?? [];
  const candidates = context?.stack.filter((item) => !item.loaded) ?? [];
  const tokenTotal = loaded.reduce((sum, item) => sum + (item.tokenEstimate ?? 0), 0);

  return (
    <>
      {open ? (
        <aside
          className="context-stack-panel"
          aria-label="Context stack"
        >
          <div className="context-stack-bg" aria-hidden />
          <header className="context-stack-head">
            <div className="context-stack-title">
              <span className="context-stack-mark"><Icon name="sparkles" size={14} /></span>
              <div>
                <strong>Context Stack</strong>
                <span>{loading ? 'Resolving active context' : `${loaded.length} loaded · ${candidates.length} candidates`}</span>
              </div>
            </div>
            <div className="context-stack-actions">
              <button type="button" onClick={onRefresh} title="Refresh context" aria-label="Refresh context">
                <Icon name="refresh" size={14} />
              </button>
              <button type="button" onClick={onClose} title="Close context stack" aria-label="Close context stack">
                <Icon name="close" size={14} />
              </button>
            </div>
          </header>

          <div className="context-stack-meter" aria-label="Loaded context estimate">
            <div>
              <span>Authority</span>
              <strong>{context?.designSystemId ? 'Design system locked' : 'Directive fallback'}</strong>
            </div>
            <div>
              <span>Base</span>
              <strong>{context?.baseSkillId ?? 'Unbound'}</strong>
            </div>
            <div>
              <span>Est.</span>
              <strong>{tokenTotal.toLocaleString()} tok</strong>
            </div>
          </div>

          {error ? <div className="context-stack-error">{error}</div> : null}

          <div className="context-stack-scroll">
            <section>
              <div className="context-section-label">Loaded For Agent</div>
              {loaded.length > 0 ? (
                loaded.map((item) => (
                  <ContextCard
                    key={`${item.kind}:${item.id}`}
                    item={item}
                    onAttach={onAttachItem}
                    onRemove={onRemoveItem}
                  />
                ))
              ) : (
                <div className="context-stack-empty">{loading ? 'Resolving...' : 'No loaded context yet.'}</div>
              )}
            </section>

            {candidates.length > 0 ? (
              <section>
                <div className="context-section-label">Nearby Candidates</div>
                {candidates.map((item) => (
                  <ContextCard
                    key={`${item.kind}:${item.id}`}
                    item={item}
                    muted
                    onAttach={onAttachItem}
                    onRemove={onRemoveItem}
                  />
                ))}
              </section>
            ) : null}

            {context?.trace?.length ? (
              <section>
                <div className="context-section-label">Resolution Trace</div>
                <ol className="context-trace">
                  {context.trace.map((line, index) => (
                    <li key={`${index}:${line}`}>{line}</li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}

function ContextCard({
  item,
  muted = false,
  onAttach,
  onRemove,
}: {
  item: ContextResolveResponse['stack'][number];
  muted?: boolean;
  onAttach?: (item: ContextResolveResponse['stack'][number]) => void;
  onRemove?: (item: ContextResolveResponse['stack'][number]) => void;
}) {
  const token = contextToken(item.kind, item.id);
  const removable = Boolean(token && item.tier !== 'always' && item.kind !== 'cli-procedure');
  return (
    <article className={`context-card${muted ? ' muted' : ''}`}>
      <div className="context-card-top">
        <span className={`context-kind kind-${item.kind}`}>{KIND_LABELS[item.kind] ?? item.kind}</span>
        <span className="context-score">{item.loaded ? item.tier : `score ${item.score}`}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.reason || item.summary}</p>
      {item.summary && item.reason ? <p className="context-summary">{item.summary}</p> : null}
      <div className="context-card-foot">
        {item.source ? <code>{item.source}</code> : <span />}
        {item.tokenEstimate ? <span>{item.tokenEstimate} tok</span> : null}
      </div>
      {item.kind === 'cli-procedure' && typeof item.metadata?.customize === 'string' && item.metadata.customize ? (
        <div className="context-cli-note">{item.metadata.customize}</div>
      ) : null}
      {token ? (
        <div className="context-card-actions">
          {!item.loaded ? (
            <button type="button" onClick={() => onAttach?.(item)}>Attach</button>
          ) : removable ? (
            <button type="button" onClick={() => onRemove?.(item)}>Remove token</button>
          ) : (
            <span>Project-bound</span>
          )}
        </div>
      ) : null}
    </article>
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

export function contextItemToken(item: ContextResolveResponse['stack'][number]): string | null {
  return contextToken(item.kind, item.id);
}
