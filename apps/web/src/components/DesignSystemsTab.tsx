import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import {
  localizeDesignSystemCategory,
  localizeDesignSystemSummary,
} from '../i18n/content';
import { fetchDesignSystemShowcase } from '../providers/registry';
import { buildSrcdoc } from '../runtime/srcdoc';
import type { DesignSystemSummary, Surface } from '../types';

interface Props {
  systems: DesignSystemSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
}

const CATEGORY_ORDER = [
  'Starter',
  'AI & LLM',
  'Developer Tools',
  'Productivity & SaaS',
  'Backend & Data',
  'Design & Creative',
  'Fintech & Crypto',
  'E-Commerce & Retail',
  'Media & Consumer',
  'Automotive',
];

type SurfaceFilter = 'all' | Surface;

const SURFACE_PILLS: { value: SurfaceFilter; labelKey: 'examples.modeAll' | 'ds.surfaceWeb' | 'ds.surfaceImage' | 'ds.surfaceVideo' | 'ds.surfaceAudio' }[] = [
  { value: 'all', labelKey: 'examples.modeAll' },
  { value: 'web', labelKey: 'ds.surfaceWeb' },
  { value: 'image', labelKey: 'ds.surfaceImage' },
  { value: 'video', labelKey: 'ds.surfaceVideo' },
  { value: 'audio', labelKey: 'ds.surfaceAudio' },
];

function surfaceOf(system: DesignSystemSummary): Surface {
  return system.surface ?? 'web';
}

export function DesignSystemsTab({ systems, selectedId, onSelect, onPreview }: Props) {
  const { locale, t } = useI18n();
  const [filter, setFilter] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<SurfaceFilter>('all');
  const [category, setCategory] = useState<string>('All');
  const [detailId, setDetailId] = useState<string | null>(selectedId);
  // Cache fetched showcase HTML across re-renders so cards never re-flicker
  // when the user filters / scrolls back. null = "in flight"; undefined =
  // "not yet requested". Mirrors the pattern used by ExamplesTab.
  const [thumbs, setThumbs] = useState<Record<string, string | null>>({});

  const surfaceScoped = useMemo(
    () => surfaceFilter === 'all' ? systems : systems.filter((s) => surfaceOf(s) === surfaceFilter),
    [systems, surfaceFilter],
  );

  const surfaceCounts = useMemo(() => {
    const counts: Record<SurfaceFilter, number> = { all: systems.length, web: 0, image: 0, video: 0, audio: 0 };
    for (const s of systems) counts[surfaceOf(s)]++;
    return counts;
  }, [systems]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const s of surfaceScoped) cats.add(s.category || 'Uncategorized');
    const ordered: string[] = [];
    for (const c of CATEGORY_ORDER) if (cats.has(c)) ordered.push(c);
    for (const c of [...cats].sort()) if (!ordered.includes(c)) ordered.push(c);
    return ['All', ...ordered];
  }, [surfaceScoped]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return surfaceScoped.filter((s) => {
      if (category !== 'All' && (s.category || 'Uncategorized') !== category) return false;
      if (!q) return true;
      const summary = localizeDesignSystemSummary(locale, s).toLowerCase();
      const categoryLabel = localizeDesignSystemCategory(
        locale,
        s.category || 'Uncategorized',
      ).toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        summary.includes(q) ||
        categoryLabel.includes(q)
      );
    });
  }, [surfaceScoped, filter, category, locale]);

  // Category metadata is authored in English; keep raw values in state for
  // filtering while localizing the visible labels for the current UI locale.
  const renderCategory = (c: string) => {
    if (c === 'All') return t('ds.categoryAll');
    if (c === 'Uncategorized') return t('ds.categoryUncategorized');
    return localizeDesignSystemCategory(locale, c);
  };

  const featured = filtered[0] ?? systems.find((s) => s.id === selectedId) ?? systems[0] ?? null;
  const detailSystem = useMemo(
    () => systems.find((s) => s.id === detailId) ?? featured,
    [systems, detailId, featured],
  );

  useEffect(() => {
    if (!selectedId) return;
    setDetailId((current) => current ?? selectedId);
  }, [selectedId]);

  function loadThumb(id: string) {
    setThumbs((prev) => {
      if (prev[id] !== undefined) return prev;
      void fetchDesignSystemShowcase(id).then((html) => {
        setThumbs((p) => ({ ...p, [id]: html }));
      });
      return { ...prev, [id]: null };
    });
  }

  return (
    <div className="tab-panel design-systems-panel">
      <div className="ds-hero">
        <div className="ds-hero-copy">
          <span className="ds-hero-kicker">Design Systems</span>
          <h2>Choose the visual language before the agent starts composing.</h2>
          <p>
            Systems carry palette, typography, spacing, surface tone, and product category cues into every artifact.
          </p>
        </div>
        <div className="ds-hero-plate" aria-hidden>
          {featured?.swatches?.slice(0, 5).map((color, index) => (
            <span key={`${color}-${index}`} style={{ background: color }} />
          ))}
          <strong>{featured?.title ?? 'System'}</strong>
          <em>{filtered.length} visible · {systems.length} total</em>
        </div>
      </div>
      <div className="tab-panel-toolbar ds-toolbar">
        <input
          placeholder={t('ds.searchPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {renderCategory(c)}
            </option>
          ))}
        </select>
      </div>
      <div
        className="examples-filter-row"
        role="tablist"
        aria-label={t('ds.surfaceLabel')}
      >
        <span className="examples-filter-label">{t('ds.surfaceLabel')}</span>
        {SURFACE_PILLS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={surfaceFilter === p.value}
            className={`filter-pill ${surfaceFilter === p.value ? 'active' : ''}`}
            onClick={() => {
              setSurfaceFilter(p.value);
              setCategory('All');
            }}
          >
            {t(p.labelKey)}
            <span className="filter-pill-count">{surfaceCounts[p.value]}</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="tab-empty">{t('ds.emptyNoMatch')}</div>
      ) : (
        <div className="ds-browse-layout">
          <div className="ds-grid">
            {filtered.map((s) => (
              <DesignSystemCard
                key={s.id}
                system={s}
                active={s.id === selectedId}
                detailed={s.id === detailSystem?.id}
                thumbHtml={thumbs[s.id]}
                onIntersect={() => loadThumb(s.id)}
                onSelect={() => onSelect(s.id)}
                onOpenDetail={() => setDetailId(s.id)}
                onPreview={() => onPreview(s.id)}
              />
            ))}
          </div>
          {detailSystem ? (
            <DesignSystemDetailCard
              system={detailSystem}
              active={detailSystem.id === selectedId}
              onSelect={() => onSelect(detailSystem.id)}
              onPreview={() => onPreview(detailSystem.id)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  system: DesignSystemSummary;
  active: boolean;
  detailed: boolean;
  thumbHtml: string | null | undefined;
  onIntersect: () => void;
  onSelect: () => void;
  onOpenDetail: () => void;
  onPreview: () => void;
}

function DesignSystemCard({
  system,
  active,
  detailed,
  thumbHtml,
  onIntersect,
  onSelect,
  onOpenDetail,
  onPreview,
}: CardProps) {
  const { locale, t } = useI18n();
  const ref = useRef<HTMLDivElement | null>(null);

  // Lazy-load the showcase iframe only when the card scrolls into the
  // viewport. With ~120 design systems we can't afford to mount every
  // iframe up front — even with `loading="lazy"`, srcDoc iframes ignore
  // the native lazy hint, so we gate via IntersectionObserver.
  useEffect(() => {
    if (thumbHtml !== undefined) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      onIntersect();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onIntersect();
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [thumbHtml, onIntersect]);

  const localizedSummary = localizeDesignSystemSummary(locale, system);
  const categoryLabel = localizeDesignSystemCategory(
    locale,
    system.category || 'Uncategorized',
  );

  return (
    <div
      ref={ref}
      className={`ds-card ${active ? 'active' : ''}${detailed ? ' detailed' : ''}`}
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail();
        }
      }}
    >
      <div
        className="ds-card-thumb"
        onClick={(e) => {
          e.stopPropagation();
          onPreview();
        }}
        title={t('ds.previewTitle')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onPreview();
          }
        }}
      >
        {thumbHtml ? (
          <iframe
            title={`${system.title} preview`}
            sandbox="allow-scripts"
            srcDoc={buildSrcdoc(thumbHtml)}
            tabIndex={-1}
            aria-hidden
          />
        ) : (
          <div className="ds-card-thumb-fallback" aria-hidden>
            {system.swatches && system.swatches.length > 0 ? (
              <div className="ds-card-thumb-swatches">
                {system.swatches.map((c, i) => (
                  <span key={i} style={{ background: c }} />
                ))}
              </div>
            ) : (
              <span className="ds-card-thumb-placeholder">
                {thumbHtml === null ? '' : ''}
              </span>
            )}
          </div>
        )}
        <span className="ds-card-thumb-overlay" aria-hidden>
          {t('ds.preview')}
        </span>
      </div>
      <div className="ds-card-meta">
        <div className="ds-card-map" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="ds-card-title-row">
          <span className="ds-card-title">{system.title}</span>
          {active ? (
            <span className="ds-card-badge">{t('ds.badgeDefault')}</span>
          ) : null}
        </div>
        <div className="ds-card-summary">{localizedSummary}</div>
        <div className="ds-card-footer">
          <span className="ds-card-category">{categoryLabel}</span>
          {system.swatches && system.swatches.length > 0 ? (
            <div className="ds-card-swatches" aria-hidden>
              {system.swatches.map((c, i) => (
                <span key={i} style={{ background: c }} title={c} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="ds-card-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
          >
            {active ? t('ds.badgeDefault') : 'Use system'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPreview();
            }}
          >
            {t('ds.preview')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DesignSystemDetailCard({
  system,
  active,
  onSelect,
  onPreview,
}: {
  system: DesignSystemSummary;
  active: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const { locale, t } = useI18n();
  const summary = localizeDesignSystemSummary(locale, system);
  const category = localizeDesignSystemCategory(locale, system.category || 'Uncategorized');
  return (
    <aside className="ds-detail-card" aria-label={`${system.title} details`}>
      <div className="ds-detail-plate" aria-hidden>
        {(system.swatches?.length ? system.swatches : ['#15140f', '#efe7d2', '#ed6f5c', '#8fb5ff']).slice(0, 6).map((color, index) => (
          <span key={`${color}-${index}`} style={{ background: color }} />
        ))}
      </div>
      <div className="ds-detail-copy">
        <span className="ds-detail-kicker">{category}</span>
        <h3>{system.title}</h3>
        <p>{summary}</p>
      </div>
      <dl className="ds-detail-facts">
        <div>
          <dt>Surface</dt>
          <dd>{surfaceOf(system)}</dd>
        </div>
        <div>
          <dt>Palette</dt>
          <dd>{system.swatches?.length ?? 0} swatches</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{active ? 'Default' : 'Available'}</dd>
        </div>
      </dl>
      <div className="ds-detail-actions">
        <button type="button" className="primary" onClick={onPreview}>
          {t('ds.preview')}
        </button>
        <button type="button" className="ghost" onClick={onSelect}>
          {active ? t('ds.badgeDefault') : 'Use as default'}
        </button>
      </div>
    </aside>
  );
}
