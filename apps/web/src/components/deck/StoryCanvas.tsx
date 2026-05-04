import type { DeckPlan } from '@pixelpitch/contracts';

interface Props {
  plan: DeckPlan;
}

const CARD_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  audience: { bg: 'rgba(129,140,248,0.06)', border: 'rgba(129,140,248,0.2)', label: '#818cf8' },
  keyMessage: { bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.2)', label: '#34d399' },
  tone: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)', label: '#f59e0b' },
  pending: { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.08)', label: '#6b7280' },
};

export function StoryCanvas({ plan }: Props) {
  const cards = [
    { key: 'audience', label: 'AUDIENCE', value: plan.audience },
    { key: 'keyMessage', label: 'KEY MESSAGE', value: plan.keyMessage },
    { key: 'tone', label: 'TONE', value: plan.tone },
  ].filter((c) => c.value);

  const pending = ['audience', 'keyMessage', 'tone'].filter(
    (k) => !plan[k as keyof DeckPlan],
  );

  return (
    <div className="story-canvas">
      <div className="story-canvas-header">
        <span className="story-canvas-kicker">Story Arc — Building...</span>
        <div className="story-canvas-progress">
          {[...cards, ...pending.map(() => null)].map((c, i) => (
            <div
              key={i}
              className={`story-canvas-bar${c ? ' filled' : ''}`}
            />
          ))}
        </div>
      </div>
      {cards.map((card) => {
        const colors = CARD_COLORS[card.key] ?? CARD_COLORS.pending;
        return (
          <div
            key={card.key}
            className="story-canvas-card"
            style={{
              background: colors.bg,
              borderColor: colors.border,
              borderLeftColor: colors.label,
            }}
          >
            <div className="story-canvas-card-label" style={{ color: colors.label }}>
              {card.label}
            </div>
            <div className="story-canvas-card-value">{card.value}</div>
          </div>
        );
      })}
      {pending.length > 0 ? (
        <div
          className="story-canvas-card pending"
          style={{
            background: CARD_COLORS.pending.bg,
            borderColor: CARD_COLORS.pending.border,
          }}
        >
          <div className="story-canvas-card-label" style={{ color: CARD_COLORS.pending.label }}>
            {pending.length === 3 ? 'WAITING FOR ANSWERS' : 'DECISION NEEDED'}
          </div>
          <div className="story-canvas-card-value">Waiting for answer...</div>
        </div>
      ) : null}
    </div>
  );
}
