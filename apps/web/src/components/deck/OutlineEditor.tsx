import { useState } from 'react';
import type { DeckBeat, DeckBeatType } from '@pixelpitch/contracts';
import { Icon } from '../Icon';

interface Props {
  beats: DeckBeat[];
  onReorder: (beats: DeckBeat[]) => void;
  onEditBeat: (id: string, updates: Partial<DeckBeat>) => void;
  onAddBeat: () => void;
  onRemoveBeat: (id: string) => void;
  onProceed: () => void;
}

const BEAT_COLORS: Record<DeckBeatType, { bg: string; text: string }> = {
  context: { bg: '#e8f0fe', text: '#1a73e8' },
  problem: { bg: '#fce8e6', text: '#d93025' },
  solution: { bg: '#e6f4ea', text: '#34a853' },
  evidence: { bg: '#f3e8fd', text: '#8430ce' },
  how: { bg: '#fef7e0', text: '#f9ab00' },
  plan: { bg: '#f2f3f5', text: '#5f6f89' },
  ask: { bg: '#e8f0fe', text: '#1a73e8' },
  custom: { bg: '#f2f3f5', text: '#5f6f89' },
};

export function OutlineEditor({
  beats,
  onReorder,
  onEditBeat,
  onAddBeat,
  onRemoveBeat,
  onProceed,
}: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDrop(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return;
    const next = [...beats];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(targetIdx, 0, moved!);
    onReorder(next);
    setDragIdx(null);
  }

  return (
    <div className="outline-editor">
      <div className="outline-editor-header">
        <div className="outline-editor-title">{beats.length} beats</div>
        <div className="outline-editor-actions">
          <button type="button" className="ghost" onClick={onAddBeat}>
            <Icon name="plus" size={12} />
            <span>Add beat</span>
          </button>
          <button
            type="button"
            className="primary"
            onClick={onProceed}
            disabled={beats.length === 0}
          >
            Proceed to slides →
          </button>
        </div>
      </div>
      <div className="outline-editor-list">
        {beats.map((beat, idx) => {
          const colors = BEAT_COLORS[beat.type];
          return (
            <div
              key={beat.id}
              className={`outline-beat${dragIdx === idx ? ' dragging' : ''}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(idx)}
            >
              <span className="outline-beat-handle" aria-hidden>
                ⠿
              </span>
              <span
                className="outline-beat-type"
                style={{ background: colors.bg, color: colors.text }}
              >
                {beat.type.toUpperCase()}
              </span>
              <input
                className="outline-beat-summary"
                value={beat.summary}
                onChange={(e) => onEditBeat(beat.id, { summary: e.target.value })}
                placeholder="What's the key point of this beat?"
              />
              <button
                type="button"
                className="outline-beat-remove"
                onClick={() => onRemoveBeat(beat.id)}
                aria-label="Remove beat"
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
