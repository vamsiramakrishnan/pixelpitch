import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DeckBeat, DeckPlan, DeckSlide } from '@pixelpitch/contracts';
import { DeckPhaseBar } from './DeckPhaseBar';
import { ExportPanel } from './ExportPanel';
import { OutlineEditor } from './OutlineEditor';
import { SlideEditor } from './SlideEditor';
import { SlideSorter } from './SlideSorter';
import { StoryCanvas } from './StoryCanvas';

interface Props {
  projectId: string;
  plan: DeckPlan | null;
  onUpdatePlan: (updates: Partial<DeckPlan>) => void;
  onExport: () => Promise<void>;
  exporting: boolean;
  chatPane: React.ReactNode;
  renderSlidePreview: (slideId: string) => React.ReactNode;
  renderSlideThumbnail: (slide: DeckSlide) => React.ReactNode;
}

export function DeckWorkspace({
  projectId,
  plan,
  onUpdatePlan,
  onExport,
  exporting,
  chatPane,
  renderSlidePreview,
  renderSlideThumbnail,
}: Props) {
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (!plan) return;
    if (plan.slides.length === 0) return;
    if (!activeSlideId || !plan.slides.some((s) => s.id === activeSlideId)) {
      setActiveSlideId(plan.slides[0]!.id);
    }
  }, [plan, activeSlideId]);

  const handleUpdateBeats = useCallback(
    (beats: DeckBeat[]) => {
      if (!plan) return;
      onUpdatePlan({ narrative: { beats } });
    },
    [onUpdatePlan, plan],
  );

  const handleEditBeat = useCallback(
    (id: string, updates: Partial<DeckBeat>) => {
      if (!plan) return;
      const beats = plan.narrative.beats.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      );
      onUpdatePlan({ narrative: { beats } });
    },
    [plan, onUpdatePlan],
  );

  const handleAddBeat = useCallback(() => {
    if (!plan) return;
    const beats: DeckBeat[] = [
      ...plan.narrative.beats,
      {
        id: `b${Date.now()}`,
        type: 'custom',
        label: 'New beat',
        summary: '',
      },
    ];
    onUpdatePlan({ narrative: { beats } });
  }, [plan, onUpdatePlan]);

  const handleRemoveBeat = useCallback(
    (id: string) => {
      if (!plan) return;
      const beats = plan.narrative.beats.filter((b) => b.id !== id);
      onUpdatePlan({ narrative: { beats } });
    },
    [plan, onUpdatePlan],
  );

  const handleProceed = useCallback(() => {
    onUpdatePlan({ phase: 'generating' });
  }, [onUpdatePlan]);

  const handleExport = useCallback(async () => {
    setShowExport(true);
    await onExport();
  }, [onExport]);

  const activePreview = useMemo(
    () => (activeSlideId ? renderSlidePreview(activeSlideId) : null),
    [activeSlideId, renderSlidePreview],
  );

  if (!plan) {
    return (
      <div className="deck-workspace">
        <div className="deck-workspace-topbar">
          <DeckPhaseBar phase="narrative" />
          <span className="deck-workspace-title">Starting narrative interview...</span>
          <div className="deck-workspace-actions">
            <button type="button" className="topbar-btn" disabled>
              Export PPTX
            </button>
          </div>
        </div>
        <div className="deck-workspace-body">
          <div className="deck-workspace-chat">{chatPane}</div>
          <div className="deck-workspace-canvas">
            <div className="deck-workspace-loading" role="status" aria-live="polite">
              <div className="deck-workspace-loading-icon" aria-hidden>
                <span>...</span>
              </div>
              <div className="deck-workspace-loading-text">Your deck is being set up</div>
              <div className="deck-workspace-loading-hint">
                Starting narrative interview and preparing deck-plan.json.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-workspace">
      <div className="deck-workspace-topbar">
        <DeckPhaseBar phase={plan.phase} />
        <span className="deck-workspace-title">{plan.title || 'Untitled Deck'}</span>
        <div className="deck-workspace-actions">
          <button
            type="button"
            className="topbar-btn"
            onClick={() => setShowExport(true)}
          >
            Export PPTX
          </button>
        </div>
      </div>

      <div className="deck-workspace-body">
        {plan.phase === 'narrative' ? (
          <>
            <div className="deck-workspace-chat">{chatPane}</div>
            <div className="deck-workspace-canvas">
              <StoryCanvas plan={plan} />
            </div>
          </>
        ) : null}

        {plan.phase === 'structure' ? (
          <OutlineEditor
            beats={plan.narrative.beats}
            onReorder={handleUpdateBeats}
            onEditBeat={handleEditBeat}
            onAddBeat={handleAddBeat}
            onRemoveBeat={handleRemoveBeat}
            onProceed={handleProceed}
          />
        ) : null}

        {plan.phase === 'generating' ? (
          <>
            <div className="deck-workspace-chat">{chatPane}</div>
            <div className="deck-workspace-sorter">
              <SlideSorter
                slides={plan.slides}
                onSelect={(id) => {
                  setActiveSlideId(id);
                }}
                renderThumbnail={renderSlideThumbnail}
              />
            </div>
          </>
        ) : null}

        {plan.phase === 'ready' ? (
          <>
            <div className="deck-workspace-chat">{chatPane}</div>
            <div className="deck-workspace-editor">
              <SlideEditor
                plan={plan}
                activeSlideId={activeSlideId}
                onSelectSlide={setActiveSlideId}
                slidePreview={activePreview}
                renderThumbnail={renderSlideThumbnail}
              />
            </div>
          </>
        ) : null}

        {plan.phase === 'exporting' ? (
          <>
            <div className="deck-workspace-chat">{chatPane}</div>
            <div className="deck-workspace-editor">
              <SlideEditor
                plan={plan}
                activeSlideId={activeSlideId}
                onSelectSlide={setActiveSlideId}
                slidePreview={activePreview}
                renderThumbnail={renderSlideThumbnail}
              />
            </div>
          </>
        ) : null}
      </div>

      {showExport || plan.phase === 'exporting' ? (
        <ExportPanel
          plan={plan}
          exporting={exporting}
          onExport={handleExport}
          onClose={() => setShowExport(false)}
          onFixSlide={(slideId) => {
            setActiveSlideId(slideId);
            setShowExport(false);
            onUpdatePlan({ phase: 'ready' });
          }}
        />
      ) : null}
    </div>
  );
}
