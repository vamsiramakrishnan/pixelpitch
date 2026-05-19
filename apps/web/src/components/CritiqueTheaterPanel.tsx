import type { PanelistRole } from '@pixelpitch/contracts/critique';
import type { CritiqueRound, CritiqueState } from './Theater/state/reducer';
import { Icon } from './Icon';

interface Props {
  state: CritiqueState;
}

const PANELIST_LABELS: Record<PanelistRole, string> = {
  copy: 'Copy',
  designer: 'Designer',
  critic: 'Critic',
  brand: 'Brand',
  a11y: 'A11y',
};

export function CritiqueTheaterPanel({ state }: Props) {
  const rounds = state.phase === 'idle' ? [] : state.rounds;
  const latestRound = rounds[rounds.length - 1] ?? null;
  const activePanelist = state.phase === 'running' ? state.activePanelist : null;
  const status = critiqueStatus(state);

  return (
    <div className="critique-theater-panel" data-testid="critique-theater-panel">
      <div className={`critique-theater-hero phase-${state.phase}`}>
        <div>
          <span className="critique-theater-kicker">Critique Theater</span>
          <strong>{status.title}</strong>
          <p>{status.detail}</p>
        </div>
        <div className="critique-theater-score">
          <span>{status.score}</span>
          <small>{status.scoreLabel}</small>
        </div>
      </div>

      {state.phase === 'idle' ? (
        <div className="critique-theater-empty">
          <Icon name="comment" size={18} />
          <span>Run `/critique @current` from chat to stream panel rounds here.</span>
        </div>
      ) : (
        <>
          <div className="critique-theater-meta">
            <span>Run {state.runId.slice(0, 8)}</span>
            {state.config ? <span>{state.config.cast.length} panelists</span> : null}
            {state.config ? <span>Threshold {state.config.threshold}</span> : null}
            {state.warnings.length > 0 ? <span>{state.warnings.length} parser warning(s)</span> : null}
          </div>

          <div className="critique-theater-rounds">
            {rounds.length === 0 ? (
              <div className="critique-theater-empty compact">
                <span>Waiting for the first panelist event...</span>
              </div>
            ) : rounds.map((round) => (
              <RoundCard
                key={round.n}
                round={round}
                active={latestRound?.n === round.n && state.phase === 'running'}
                activePanelist={activePanelist}
              />
            ))}
          </div>

          {state.warnings.length > 0 ? (
            <div className="critique-theater-warnings">
              {state.warnings.slice(-3).map((warning, index) => (
                <span key={`${warning.kind}-${warning.position}-${index}`}>
                  {warning.kind} at {warning.position}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function RoundCard({
  round,
  active,
  activePanelist,
}: {
  round: CritiqueRound;
  active: boolean;
  activePanelist: PanelistRole | null;
}) {
  const panelists = Object.entries(round.panelists) as Array<[PanelistRole, NonNullable<CritiqueRound['panelists'][PanelistRole]>]>;
  return (
    <article className={`critique-round-card${active ? ' active' : ''}`}>
      <div className="critique-round-head">
        <div>
          <strong>Round {round.n}</strong>
          <span>{round.decision ? `${round.decision} · ${round.decisionReason ?? 'No reason supplied'}` : 'In progress'}</span>
        </div>
        <div className="critique-round-score">
          <span>{round.composite ?? '...'}</span>
          <small>{round.mustFix} must-fix</small>
        </div>
      </div>
      <div className="critique-panelist-grid">
        {panelists.length === 0 ? (
          <span className="critique-panelist-empty">Panelists are warming up.</span>
        ) : panelists.map(([role, panelist]) => {
          const dimScore = panelist.dims.length
            ? Math.round(panelist.dims.reduce((sum, dim) => sum + dim.score, 0) / panelist.dims.length)
            : panelist.score;
          return (
            <div
              key={role}
              className={`critique-panelist-chip${activePanelist === role ? ' active' : ''}`}
            >
              <span>{PANELIST_LABELS[role] ?? role}</span>
              <strong>{dimScore ?? '...'}</strong>
              {panelist.mustFixes.length > 0 ? <small>{panelist.mustFixes.length} fix</small> : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function critiqueStatus(state: CritiqueState): {
  title: string;
  detail: string;
  score: string | number;
  scoreLabel: string;
} {
  if (state.phase === 'idle') {
    return {
      title: 'No active critique',
      detail: 'Live Phase 7 reducer state appears here as SSE events arrive.',
      score: '--',
      scoreLabel: 'idle',
    };
  }
  if (state.phase === 'running') {
    const latest = state.rounds[state.rounds.length - 1];
    return {
      title: `Round ${state.activeRound} running`,
      detail: state.activePanelist
        ? `${PANELIST_LABELS[state.activePanelist] ?? state.activePanelist} is reviewing.`
        : 'Waiting for the next panelist.',
      score: latest?.composite ?? '...',
      scoreLabel: 'live',
    };
  }
  if (state.phase === 'shipped') {
    return {
      title: 'Artifact shipped',
      detail: state.final.summary || `Round ${state.final.round} reached ship status.`,
      score: state.final.composite,
      scoreLabel: state.final.status,
    };
  }
  if (state.phase === 'degraded') {
    return {
      title: 'Critique degraded',
      detail: `${state.degraded.reason} via ${state.degraded.adapter}`,
      score: '!',
      scoreLabel: 'degraded',
    };
  }
  if (state.phase === 'interrupted') {
    return {
      title: 'Critique interrupted',
      detail: `Best round ${state.bestRound} was kept.`,
      score: state.composite,
      scoreLabel: 'partial',
    };
  }
  return {
    title: 'Critique failed',
    detail: state.cause,
    score: '!',
    scoreLabel: 'failed',
  };
}
