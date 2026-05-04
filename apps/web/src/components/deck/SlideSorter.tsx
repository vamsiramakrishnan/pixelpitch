import type { DeckSlide } from '@pixelpitch/contracts';

interface Props {
  slides: DeckSlide[];
  onSelect: (id: string) => void;
  renderThumbnail: (slide: DeckSlide) => React.ReactNode;
}

export function SlideSorter({ slides, onSelect, renderThumbnail }: Props) {
  const issues = slides.filter(
    (s) => s.status === 'needs-evidence' || s.status === 'needs-data',
  );

  return (
    <div className="slide-sorter">
      <div className="slide-sorter-header">
        <span>
          {slides.length} slides · {slides.filter((s) => s.status === 'ready' || s.status === 'fixed').length} ready
          {issues.length > 0 ? ` · ${issues.length} need attention` : ''}
        </span>
      </div>
      <div className="slide-sorter-grid">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            className={`slide-sorter-card${
              slide.status === 'needs-data' ? ' error' : ''
            }`}
            onClick={() => onSelect(slide.id)}
          >
            <div className="slide-sorter-preview">
              {renderThumbnail(slide)}
              <span className="slide-thumb-click-target" aria-hidden />
            </div>
            <div className="slide-sorter-meta">
              <span>{idx + 1} · {slide.title}</span>
              <span
                className="slide-sorter-badge"
                style={{
                  background:
                    slide.status === 'ready' || slide.status === 'fixed'
                      ? '#34d399'
                      : slide.status === 'needs-evidence'
                        ? '#fbbf24'
                        : slide.status === 'needs-data'
                          ? '#f87171'
                          : 'rgba(255,255,255,0.15)',
                }}
              />
            </div>
          </button>
        ))}
      </div>
      {issues.length > 0 ? (
        <div className="slide-sorter-warning">
          <strong>{issues.length} slides need attention:</strong>{' '}
          {issues.map((s, i) => (
            <span key={s.id}>
              {i > 0 ? ', ' : ''}Slide {slides.indexOf(s) + 1} — {s.status.replace('-', ' ')}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
