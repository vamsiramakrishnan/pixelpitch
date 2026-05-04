import type { DeckSlide } from '@pixelpitch/contracts';

interface Props {
  slides: DeckSlide[];
  activeId: string | null;
  onSelect: (id: string) => void;
  renderThumbnail: (slide: DeckSlide) => React.ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  ready: '#34d399',
  fixed: '#34d399',
  generating: '#818cf8',
  pending: 'rgba(255,255,255,0.15)',
  'needs-evidence': '#fbbf24',
  'needs-data': '#f87171',
};

export function SlideStrip({ slides, activeId, onSelect, renderThumbnail }: Props) {
  return (
    <div className="slide-strip">
      {slides.map((slide, idx) => (
        <button
          key={slide.id}
          type="button"
          className={`slide-thumb${slide.id === activeId ? ' active' : ''}`}
          onClick={() => onSelect(slide.id)}
          aria-label={`Slide ${idx + 1}: ${slide.title}`}
        >
          <div className="slide-thumb-preview">
            {renderThumbnail(slide)}
            <span className="slide-thumb-num">{idx + 1}</span>
            <span
              className="slide-thumb-badge"
              style={{ background: STATUS_COLORS[slide.status] ?? 'rgba(255,255,255,0.15)' }}
            />
            <span className="slide-thumb-click-target" aria-hidden />
          </div>
        </button>
      ))}
    </div>
  );
}
