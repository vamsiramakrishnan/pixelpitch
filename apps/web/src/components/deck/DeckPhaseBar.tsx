import type { DeckPhase } from '@pixelpitch/contracts';

const PHASES: { key: DeckPhase; label: string }[] = [
  { key: 'narrative', label: 'Narrative' },
  { key: 'structure', label: 'Structure' },
  { key: 'generating', label: 'Generate' },
  { key: 'ready', label: 'Polish' },
  { key: 'exporting', label: 'Export' },
];

const ORDER: Record<DeckPhase, number> = {
  narrative: 0, structure: 1, generating: 2, ready: 3, exporting: 4,
};

export function DeckPhaseBar({ phase }: { phase: DeckPhase }) {
  const current = ORDER[phase];
  return (
    <div className="deck-phase-bar">
      {PHASES.map(({ key, label }, i) => (
        <div key={key} className="deck-phase-item">
          <div
            className={`deck-phase-dot${
              i < current ? ' done' : i === current ? ' active' : ''
            }`}
          />
          <span
            className={`deck-phase-label${i === current ? ' active' : ''}`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
