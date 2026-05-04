import { useEffect } from 'react';
import type { DeckPlan, DeckSlide } from '@pixelpitch/contracts';
import { SlideStrip } from './SlideStrip';

interface Props {
  plan: DeckPlan;
  activeSlideId: string | null;
  onSelectSlide: (id: string) => void;
  slidePreview: React.ReactNode;
  renderThumbnail: (slide: DeckSlide) => React.ReactNode;
}

export function SlideEditor({
  plan,
  activeSlideId,
  onSelectSlide,
  slidePreview,
  renderThumbnail,
}: Props) {
  const activeSlide = plan.slides.find((s) => s.id === activeSlideId);
  const activeIdx = plan.slides.findIndex((s) => s.id === activeSlideId);

  function navigate(delta: number) {
    const next = Math.max(0, Math.min(plan.slides.length - 1, activeIdx + delta));
    const slide = plan.slides[next];
    if (slide) onSelectSlide(slide.id);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'ArrowRight') navigate(1);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div className="slide-editor">
      <SlideStrip
        slides={plan.slides}
        activeId={activeSlideId}
        onSelect={onSelectSlide}
        renderThumbnail={renderThumbnail}
      />
      <div className="slide-editor-preview">
        {slidePreview}
        <div className="slide-nav">
          <button
            type="button"
            className="slide-nav-btn"
            onClick={() => navigate(-1)}
            disabled={activeIdx <= 0}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <span className="slide-nav-count">
            {activeIdx + 1} / {plan.slides.length}
          </span>
          <button
            type="button"
            className="slide-nav-btn"
            onClick={() => navigate(1)}
            disabled={activeIdx >= plan.slides.length - 1}
            aria-label="Next slide"
          >
            ›
          </button>
        </div>
      </div>
      {activeSlide ? (
        <div className="slide-editor-notes">
          <span className="slide-editor-notes-label">Notes</span>
          <span className="slide-editor-notes-text">
            {activeSlide.speakerNotes || 'No speaker notes yet.'}
          </span>
          {activeSlide.status === 'ready' || activeSlide.status === 'fixed' ? (
            <span className="slide-editor-confidence ready">Ready to present</span>
          ) : (
            <span className="slide-editor-confidence pending">
              {activeSlide.status.replace('-', ' ')}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
