import type { DeckBeat, DeckEvidenceType } from '@pixelpitch/contracts';

interface Props {
  beat: DeckBeat;
  slideIndex: number;
  totalSlides: number;
  onUpdate: (updates: Partial<DeckBeat>) => void;
  preview: React.ReactNode;
}

const EVIDENCE_OPTIONS: { value: DeckEvidenceType; label: string }[] = [
  { value: 'stat', label: 'Big stat' },
  { value: 'chart', label: 'Chart' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'quote', label: 'Quote' },
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'table', label: 'Table' },
  { value: 'none', label: 'None' },
];

export function SlidePlanner({ beat, slideIndex, totalSlides, onUpdate, preview }: Props) {
  return (
    <div className="slide-planner">
      <div className="slide-planner-header">
        Slide {slideIndex + 1} of {totalSlides} — {beat.type}
      </div>
      <div className="slide-planner-body">
        <div className="slide-planner-form">
          <label className="slide-planner-label">
            Headline
            <input
              className="slide-planner-input"
              value={beat.summary}
              onChange={(e) => onUpdate({ summary: e.target.value })}
              placeholder="What's the one takeaway from this slide?"
            />
          </label>
          <label className="slide-planner-label">
            Evidence type
            <div className="slide-planner-pills">
              {EVIDENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`slide-planner-pill${beat.evidenceType === opt.value ? ' active' : ''}`}
                  onClick={() => onUpdate({ evidenceType: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </label>
          <label className="slide-planner-label">
            Key data points
            <textarea
              className="slide-planner-textarea"
              value={(beat.dataPoints ?? []).join('\n')}
              onChange={(e) =>
                onUpdate({ dataPoints: e.target.value.split('\n').filter(Boolean) })
              }
              placeholder="One data point per line"
              rows={3}
            />
          </label>
        </div>
        <div className="slide-planner-preview">
          {preview}
        </div>
      </div>
    </div>
  );
}
