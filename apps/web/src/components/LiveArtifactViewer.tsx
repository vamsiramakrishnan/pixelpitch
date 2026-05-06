import { useEffect, useMemo, useState } from 'react';
import {
  fetchLiveArtifact,
  fetchLiveArtifactRefreshes,
  liveArtifactCodeUrl,
  liveArtifactPreviewUrl,
  refreshLiveArtifact,
} from '../providers/registry';
import type { LiveArtifact, LiveArtifactRefreshLogEntry, LiveArtifactSummary } from '../types';
import { Icon } from './Icon';
import { LiveArtifactBadges } from './LiveArtifactBadges';

export function liveArtifactTabId(artifactId: string): string {
  return `live-artifact:${artifactId}`;
}

export function parseLiveArtifactTabId(tabId: string): string | null {
  return tabId.startsWith('live-artifact:') ? tabId.slice('live-artifact:'.length) : null;
}

export function LiveArtifactViewer({
  projectId,
  summary,
  onUpdated,
}: {
  projectId: string;
  summary: LiveArtifactSummary;
  onUpdated?: () => Promise<void> | void;
}) {
  const [artifact, setArtifact] = useState<LiveArtifact | null>(null);
  const [history, setHistory] = useState<LiveArtifactRefreshLogEntry[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useMemo(
    () => `${liveArtifactPreviewUrl(projectId, summary.id)}&v=${reloadKey}`,
    [projectId, summary.id, reloadKey],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      fetchLiveArtifact(projectId, summary.id),
      fetchLiveArtifactRefreshes(projectId, summary.id),
    ]).then(([nextArtifact, nextHistory]) => {
      if (cancelled) return;
      setArtifact(nextArtifact);
      setHistory(nextHistory);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, summary.id, reloadKey]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    const next = await refreshLiveArtifact(projectId, summary.id);
    if (!next) {
      setError('Refresh failed or no refresh source is available.');
    } else {
      setArtifact(next);
      setReloadKey((value) => value + 1);
      await onUpdated?.();
    }
    setHistory(await fetchLiveArtifactRefreshes(projectId, summary.id));
    setRefreshing(false);
  }

  const current = artifact ?? summary;
  const canRefresh = artifact?.document?.sourceJson?.refreshPermission === 'manual_refresh_granted_for_read_only';

  return (
    <div className="live-artifact-viewer">
      <div className="live-artifact-toolbar">
        <div>
          <div className="live-artifact-title">{current.title}</div>
          <LiveArtifactBadges status={current.status} refreshStatus={current.refreshStatus} />
        </div>
        <div className="live-artifact-actions">
          <a className="ghost-link" href={liveArtifactCodeUrl(projectId, summary.id, 'template')} target="_blank" rel="noreferrer">
            Template
          </a>
          <a className="ghost-link" href={liveArtifactCodeUrl(projectId, summary.id, 'rendered-source')} target="_blank" rel="noreferrer">
            HTML
          </a>
          <a className="ghost-link" href={liveArtifactPreviewUrl(projectId, summary.id)} target="_blank" rel="noreferrer">
            Open
          </a>
          <button type="button" className="primary" disabled={refreshing || !canRefresh} onClick={() => void handleRefresh()}>
            <Icon name={refreshing ? 'spinner' : 'reload'} size={13} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
        </div>
      </div>
      {error ? <div className="live-artifact-notice error">{error}</div> : null}
      {!canRefresh ? (
        <div className="live-artifact-notice">This artifact is viewable now; add a refresh source to enable manual refresh.</div>
      ) : null}
      <div className="live-artifact-stage">
        <iframe title={current.title} src={previewUrl} sandbox="allow-same-origin" />
      </div>
      <div className="live-artifact-history">
        <span>Refresh history</span>
        {history.length === 0 ? (
          <em>No refreshes yet</em>
        ) : (
          history.slice(0, 8).map((entry) => (
            <div key={entry.id} className={`live-artifact-history-row ${entry.status}`}>
              <strong>{entry.step}</strong>
              <span>{entry.status}</span>
              <time>{new Date(entry.finishedAt ?? entry.startedAt).toLocaleString()}</time>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
