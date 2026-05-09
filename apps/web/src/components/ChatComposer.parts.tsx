import type { Dict } from '../i18n/types';
import { projectRawUrl } from '../providers/registry';
import type { ChatAttachment, ChatCommentAttachment } from '../types';
import { Icon } from './Icon';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

export function RewritePreview({
  preview,
  onUse,
  onEdit,
  onOriginal,
}: {
  preview: { original: string; rewritten: string };
  onUse: () => void;
  onEdit: () => void;
  onOriginal: () => void;
}) {
  return (
    <div className="rewrite-preview" data-testid="rewrite-preview">
      <div className="rewrite-preview-head">
        <strong>Prompt rewrite</strong>
        <span>Review before sending</span>
      </div>
      <pre>{preview.rewritten}</pre>
      <div className="rewrite-preview-actions">
        <button type="button" className="ghost" onClick={onOriginal}>
          Send original
        </button>
        <button type="button" className="ghost" onClick={onEdit}>
          Edit rewrite
        </button>
        <button type="button" className="primary" onClick={onUse}>
          Use rewrite
        </button>
      </div>
    </div>
  );
}

export function StagedAttachments({
  attachments,
  projectId,
  onRemove,
  t,
}: {
  attachments: ChatAttachment[];
  projectId: string | null;
  onRemove: (path: string) => void;
  t: TranslateFn;
}) {
  return (
    <div className="staged-row" data-testid="staged-attachments">
      {attachments.map((a) => (
        <div key={a.path} className={`staged-chip staged-${a.kind}`}>
          {a.kind === 'image' && projectId ? (
            <img src={projectRawUrl(projectId, a.path)} alt={a.name} />
          ) : (
            <span className="staged-icon" aria-hidden>
              <Icon name="file" size={13} />
            </span>
          )}
          <span className="staged-name" title={a.path}>
            {a.name}
          </span>
          <button
            className="staged-remove"
            onClick={() => onRemove(a.path)}
            title={t('common.delete')}
            aria-label={t('chat.removeAria', { name: a.name })}
          >
            <Icon name="close" size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function StagedCommentAttachments({
  attachments,
  onRemove,
  t,
}: {
  attachments: ChatCommentAttachment[];
  onRemove: (id: string) => void;
  t: TranslateFn;
}) {
  return (
    <div className="staged-row comment-staged-row" data-testid="staged-comment-attachments">
      {attachments.map((a) => (
        <div key={a.id} className="staged-chip staged-comment">
          <span className="staged-name" title={`${a.elementId}: ${a.comment}`}>
            <strong>{a.elementId}</strong>
            <span>{a.comment}</span>
          </span>
          <button
            className="staged-remove"
            onClick={() => onRemove(a.id)}
            title={t('chat.comments.removeAttachment')}
            aria-label={t('chat.comments.removeAttachmentAria', { name: a.elementId })}
          >
            <Icon name="close" size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ImportItem({
  icon,
  label,
  t,
}: {
  icon: 'upload' | 'link' | 'grid' | 'folder' | 'sparkles' | 'file';
  label: string;
  t: TranslateFn;
}) {
  return (
    <button
      type="button"
      className="composer-import-item"
      role="menuitem"
      tabIndex={-1}
      disabled
      title={t('chat.importComingSoon')}
    >
      <span className="ico" aria-hidden>
        <Icon name={icon} size={13} />
      </span>
      <span className="composer-import-item-label">{label}</span>
      <span className="composer-import-item-soon">{t('chat.importSoon')}</span>
    </button>
  );
}
