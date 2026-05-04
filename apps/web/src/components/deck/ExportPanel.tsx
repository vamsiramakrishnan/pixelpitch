import type { DeckPlan } from '@pixelpitch/contracts';
import { Icon } from '../Icon';

interface Props {
  plan: DeckPlan;
  exporting: boolean;
  onExport: () => void;
  onClose: () => void;
  onFixSlide: (slideId: string) => void;
}

export function ExportPanel({
  plan,
  exporting,
  onExport,
  onClose,
  onFixSlide,
}: Props) {
  const issues = plan.slidify.fidelityIssues;
  const errors = issues.filter((i) => i.severity === 'error');

  return (
    <div className="export-panel-overlay">
      <div className="export-panel">
        <div className="export-panel-header">
          <h2>Export to PPTX</h2>
          <button type="button" className="icon-only" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        {exporting ? (
          <div className="export-panel-progress">
            <div className="export-panel-spinner" />
            <span>Running slidify...</span>
          </div>
        ) : plan.slidify.lastExport ? (
          <div className="export-panel-report">
            <div className="export-panel-summary">
              {errors.length === 0 ? (
                <span className="export-panel-success">
                  Export complete — all slides converted
                </span>
              ) : (
                <span className="export-panel-warn">
                  {errors.length} slide{errors.length > 1 ? 's' : ''} need attention
                </span>
              )}
            </div>
            {issues.length > 0 ? (
              <table className="export-panel-table">
                <thead>
                  <tr>
                    <th>Slide</th>
                    <th>Issue</th>
                    <th>Severity</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue, i) => (
                    <tr key={i}>
                      <td>{issue.slideId}</td>
                      <td>{issue.detail}</td>
                      <td>
                        <span className={`fidelity-badge ${issue.severity}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => onFixSlide(issue.slideId)}
                        >
                          Fix
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            {plan.slidify.exportPath ? (
              <a
                href={`/api/projects/current/files/${plan.slidify.exportPath}`}
                className="primary export-panel-download"
                download
              >
                <Icon name="download" size={14} />
                <span>Download PPTX</span>
              </a>
            ) : null}
          </div>
        ) : (
          <div className="export-panel-ready">
            <p>{plan.slides.length} slides ready for export.</p>
            <button type="button" className="primary" onClick={onExport}>
              Export PPTX
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
