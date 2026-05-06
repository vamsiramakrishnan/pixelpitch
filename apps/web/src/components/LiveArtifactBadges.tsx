import type { LiveArtifactRefreshStatus, LiveArtifactStatus } from '../types';

export function LiveArtifactBadges({
  status,
  refreshStatus,
  className = '',
}: {
  status: LiveArtifactStatus;
  refreshStatus: LiveArtifactRefreshStatus;
  className?: string;
}) {
  const refreshLabel =
    refreshStatus === 'running'
      ? 'Refreshing'
      : refreshStatus === 'failed'
        ? 'Refresh failed'
        : refreshStatus === 'succeeded'
          ? 'Fresh'
          : refreshStatus === 'never'
            ? 'Static'
            : 'Idle';
  return (
    <span className={`live-artifact-badges ${className}`.trim()}>
      <span className={`la-badge status-${status}`}>{status}</span>
      <span className={`la-badge refresh-${refreshStatus}`}>{refreshLabel}</span>
    </span>
  );
}
