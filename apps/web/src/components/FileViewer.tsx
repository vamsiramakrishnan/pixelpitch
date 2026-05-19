import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { MarkdownRenderer, artifactRendererRegistry } from '../artifacts/renderer-registry';
import { renderMarkdownToSafeHtml } from '../artifacts/markdown';
import { useT } from '../i18n';
import { usePopoverLayer } from '../layers';
import type { Dict } from '../i18n/types';
import {
  applyElementEdits,
  checkDeploymentLink,
  deployProjectFile,
  fetchDeployConfig,
  fetchProjectDeployments,
  fetchProjectFilePreview,
  fetchProjectFileText,
  preflightDeployProjectFile,
  projectFileUrl,
  projectRawUrl,
  updateDeployConfig,
  uploadProjectFiles,
  writeProjectTextFile,
} from '../providers/registry';
import type { ProjectFilePreview } from '../providers/registry';
import {
  exportAsHtml,
  exportAsJsx,
  exportAsMd,
  exportAsPdf,
  exportProjectAsPdf,
  exportProjectAsZip,
  exportReactComponentAsHtml,
  exportReactComponentAsZip,
} from '../runtime/exports';
import { buildReactComponentSrcdoc } from '../runtime/react-component';
import { buildSrcdoc } from '../runtime/srcdoc';
import { saveTemplate } from '../state/projects';
import type { DeployConfigResponse, DeployPreflightResponse, DeployProjectFileResponse, ElementEditOperation, ProjectFile } from '../types';
import { Icon } from './Icon';
import {
  liveSnapshotForComment,
  materiallySameSnapshot,
  overlayBoundsFromSnapshot,
  targetFromSnapshot,
  type PreviewCommentSnapshot,
} from '../comments';
import type { PreviewComment, PreviewCommentTarget } from '../types';
import { APP_CHROME_FILE_ACTIONS_ID } from './AppChromeHeader';
import { ManualEditPanel, emptyManualEditDraft, type ManualEditDraft } from './ManualEditPanel';
import { PaletteTweaks, type PaletteId } from './PaletteTweaks';
import {
  applyManualEditPatch,
  readManualEditAttributes,
  readManualEditFields,
  readManualEditOuterHtml,
  readManualEditStyles,
} from '../edit-mode/source-patches';
import type { ManualEditBridgeMessage, ManualEditHistoryEntry, ManualEditPatch, ManualEditTarget } from '../edit-mode/types';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;
type SlideState = { active: number; count: number };
type InspectStyleKey =
  | 'color'
  | 'backgroundColor'
  | 'borderColor'
  | 'fontSize'
  | 'fontWeight'
  | 'lineHeight'
  | 'letterSpacing'
  | 'padding'
  | 'borderRadius'
  | 'opacity'
  | 'width'
  | 'height';
type InspectStyleDraft = Record<InspectStyleKey, string>;
type InspectSnapshot = PreviewCommentSnapshot & {
  tagName?: string;
  className?: string;
  styles?: Partial<InspectStyleDraft>;
  drawRegion?: boolean;
};
type TargetMode = 'comment' | 'inspect' | 'edit' | 'draw';
type InspectApplyScope = 'element' | 'section' | 'similar';
type ColorToken = { label: string; value: string; source: 'token' | 'custom' };
type ContrastSummary = { ratio: number | null; label: string; pass: boolean };
type PreviewViewportId = 'fill' | 'mobile' | 'tablet' | 'desktop' | 'wide';

const PREVIEW_VIEWPORTS: Array<{
  id: PreviewViewportId;
  label: string;
  width: number | null;
  height: number | null;
}> = [
  { id: 'fill', label: 'Fill', width: null, height: null },
  { id: 'mobile', label: '390 mobile', width: 390, height: 844 },
  { id: 'tablet', label: '820 tablet', width: 820, height: 1180 },
  { id: 'desktop', label: '1440 desktop', width: 1440, height: 900 },
  { id: 'wide', label: '1920 wide', width: 1920, height: 1080 },
];

const htmlPreviewSlideState = new Map<string, SlideState>();

interface Props {
  projectId: string;
  file: ProjectFile;
  liveHtml?: string;
  isDeck?: boolean;
  onExportAsPptx?: ((fileName: string) => void) | undefined;
  streaming?: boolean;
  focusMode?: boolean;
  onFocusModeChange?: (focused: boolean) => void;
  previewComments?: PreviewComment[];
  onSavePreviewComment?: (target: PreviewCommentTarget, note: string, attachAfterSave: boolean) => Promise<PreviewComment | null>;
  onRemovePreviewComment?: (commentId: string) => Promise<void>;
  onAttachPreviewComments?: (comments: PreviewComment[]) => void;
  onSendPreviewComments?: (comments: PreviewComment[]) => void;
  onStageComposerToken?: (token: string) => void;
  onFileEdited?: () => Promise<void> | void;
}

export function FileViewer({
  projectId,
  file,
  liveHtml,
  isDeck,
  onExportAsPptx,
  streaming,
  focusMode = false,
  onFocusModeChange,
  previewComments = [],
  onSavePreviewComment,
  onRemovePreviewComment,
  onAttachPreviewComments,
  onSendPreviewComments,
  onStageComposerToken,
  onFileEdited,
}: Props) {
  const rendererMatch = artifactRendererRegistry.resolve({
    file,
    isDeckHint: Boolean(isDeck),
  });

  if (rendererMatch?.renderer.id === 'html' || rendererMatch?.renderer.id === 'deck-html') {
    return (
      <HtmlViewer
        projectId={projectId}
        file={file}
        liveHtml={liveHtml}
        isDeck={rendererMatch.renderer.id === 'deck-html'}
        onExportAsPptx={onExportAsPptx}
        streaming={Boolean(streaming)}
        focusMode={focusMode}
        onFocusModeChange={onFocusModeChange}
        previewComments={previewComments}
        onSavePreviewComment={onSavePreviewComment}
        onRemovePreviewComment={onRemovePreviewComment}
        onAttachPreviewComments={onAttachPreviewComments}
        onSendPreviewComments={onSendPreviewComments}
        onStageComposerToken={onStageComposerToken}
        onFileEdited={onFileEdited}
      />
    );
  }
  if (rendererMatch?.renderer.id === 'react-component') {
    return <ReactComponentViewer projectId={projectId} file={file} />;
  }
  if (rendererMatch?.renderer.id === 'markdown') {
    return <MarkdownViewer projectId={projectId} file={file} />;
  }
  if (rendererMatch?.renderer.id === 'svg') {
    return <SvgViewer projectId={projectId} file={file} />;
  }
  if (file.kind === 'image') {
    return <ImageViewer projectId={projectId} file={file} />;
  }
  if (file.kind === 'video') {
    return <VideoViewer projectId={projectId} file={file} />;
  }
  if (file.kind === 'audio') {
    return <AudioViewer projectId={projectId} file={file} />;
  }
  if (file.kind === 'sketch') {
    return <ImageViewer projectId={projectId} file={file} />;
  }
  if (file.kind === 'text' || file.kind === 'code') {
    return <TextViewer projectId={projectId} file={file} />;
  }
  if (
    file.kind === 'pdf' ||
    file.kind === 'document' ||
    file.kind === 'presentation' ||
    file.kind === 'spreadsheet'
  ) {
    return <DocumentPreviewViewer projectId={projectId} file={file} />;
  }
  return <BinaryViewer projectId={projectId} file={file} />;
}

function FileActions({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  return (
    <div className="viewer-toolbar-actions">
      <a
        className="ghost-link"
        href={projectFileUrl(projectId, file.name)}
        download={file.name}
      >
        {t('fileViewer.download')}
      </a>
      <a
        className="ghost-link"
        href={projectFileUrl(projectId, file.name)}
        target="_blank"
        rel="noreferrer noopener"
      >
        {t('fileViewer.open')}
      </a>
    </div>
  );
}

function CommentPopover({
  target,
  existing,
  draft,
  onDraft,
  onClose,
  onSave,
  onRemove,
  t,
}: {
  target: PreviewCommentSnapshot;
  existing: PreviewComment | null;
  draft: string;
  onDraft: (value: string) => void;
  onClose: () => void;
  onSave: (attach: boolean) => void | Promise<void>;
  onRemove: (commentId: string) => void | Promise<void>;
  t: TranslateFn;
}) {
  return (
    <div className="comment-popover" data-testid="comment-popover">
      <div className="comment-popover-head">
        <div>
          <strong>{target.elementId}</strong>
          <span>{target.label}</span>
        </div>
        <button type="button" className="ghost" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
      <textarea
        data-testid="comment-popover-input"
        value={draft}
        placeholder={t('chat.comments.placeholder')}
        onChange={(event) => onDraft(event.target.value)}
      />
      <div className="comment-popover-actions">
        {existing ? (
          <button type="button" className="comment-popover-remove" onClick={() => onRemove(existing.id)}>
            {t('chat.comments.remove')}
          </button>
        ) : <span />}
        <button
          type="button"
          className="primary"
          data-testid="comment-add-send"
          disabled={!draft.trim()}
          onClick={() => void onSave(true)}
        >
          {existing ? t('chat.comments.updateSend') : t('chat.comments.addSend')}
        </button>
      </div>
    </div>
  );
}

function CommentPreviewOverlays({
  comments,
  liveTargets,
  hoveredTarget,
  activeTarget,
  scale,
  offset,
  onOpenComment,
}: {
  comments: PreviewComment[];
  liveTargets: Map<string, PreviewCommentSnapshot>;
  hoveredTarget: PreviewCommentSnapshot | null;
  activeTarget: PreviewCommentSnapshot | null;
  scale: number;
  offset: { x: number; y: number };
  onOpenComment: (comment: PreviewComment, snapshot: PreviewCommentSnapshot) => void;
}) {
  const visibleComments = comments
    .map((comment, index) => ({
      comment,
      index,
      snapshot: liveSnapshotForComment(comment, liveTargets),
    }))
    .filter((item): item is { comment: PreviewComment; index: number; snapshot: PreviewCommentSnapshot } =>
      Boolean(item.snapshot),
    );
  const targetOverlay = activeTarget ?? hoveredTarget;
  return (
    <div className="comment-overlay-layer" aria-hidden={false}>
      {visibleComments.map(({ comment, index, snapshot }) => {
        const bounds = overlayBoundsFromSnapshot(snapshot, scale, offset);
        return (
          <div
            key={comment.id}
            className="comment-saved-marker"
            style={{
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
            }}
            data-testid={`comment-saved-marker-${comment.elementId}`}
          >
            <div className="comment-saved-outline" />
            <button
              type="button"
              className="comment-saved-pin"
              onClick={() => onOpenComment(comment, snapshot)}
              title={`${comment.elementId}: ${comment.note}`}
              aria-label={`Open comment for ${comment.elementId}`}
            >
              {index + 1}
            </button>
          </div>
        );
      })}
      {targetOverlay ? (
        <CommentTargetOverlay
          snapshot={targetOverlay}
          scale={scale}
          offset={offset}
          selected={Boolean(activeTarget)}
        />
      ) : null}
    </div>
  );
}

function CommentTargetOverlay({
  snapshot,
  scale,
  offset,
  selected,
}: {
  snapshot: PreviewCommentSnapshot;
  scale: number;
  offset: { x: number; y: number };
  selected: boolean;
}) {
  const bounds = overlayBoundsFromSnapshot(snapshot, scale, offset);
  const width = Math.round(snapshot.position.width);
  const height = Math.round(snapshot.position.height);
  return (
    <div
      className={`comment-target-overlay${selected ? ' selected' : ''}`}
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
      data-testid="comment-target-overlay"
    >
      <div className="comment-target-tooltip">
        <strong>{snapshot.elementId}</strong>
        <span>{snapshot.label}</span>
        <span>{width} × {height}</span>
      </div>
    </div>
  );
}

const EMPTY_INSPECT_STYLE: InspectStyleDraft = {
  color: '',
  backgroundColor: '',
  borderColor: '',
  fontSize: '',
  fontWeight: '',
  lineHeight: '',
  letterSpacing: '',
  padding: '',
  borderRadius: '',
  opacity: '',
  width: '',
  height: '',
};

const INSPECT_FIELDS: Array<{ key: InspectStyleKey; label: string; type?: 'color' }> = [
  { key: 'color', label: 'Text', type: 'color' },
  { key: 'backgroundColor', label: 'Fill', type: 'color' },
  { key: 'borderColor', label: 'Border', type: 'color' },
  { key: 'fontSize', label: 'Size' },
  { key: 'fontWeight', label: 'Weight' },
  { key: 'lineHeight', label: 'Line' },
  { key: 'letterSpacing', label: 'Track' },
  { key: 'padding', label: 'Padding' },
  { key: 'borderRadius', label: 'Radius' },
  { key: 'opacity', label: 'Opacity' },
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
];

function inspectStyleFromSnapshot(snapshot: InspectSnapshot | null): InspectStyleDraft {
  return { ...EMPTY_INSPECT_STYLE, ...(snapshot?.styles ?? {}) };
}

function cssColorToInput(value: string): string {
  const raw = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex) return raw;
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(raw);
  if (!rgb) return '#000000';
  return `#${[rgb[1], rgb[2], rgb[3]]
    .map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function colorTokenToInput(value: string): string | null {
  const raw = value.trim();
  if (/^var\(/i.test(raw)) return null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    if (raw.length === 4) {
      return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
    }
    return raw.toLowerCase();
  }
  return /^rgba?\(/i.test(raw) ? cssColorToInput(raw) : null;
}

function extractColorTokens(source: string | null): ColorToken[] {
  if (!source) return [];
  const seen = new Set<string>();
  const tokens: ColorToken[] = [];
  const push = (label: string, value: string, tokenSource: ColorToken['source']) => {
    const cleanValue = value.trim();
    if (!cleanValue || seen.has(`${label}:${cleanValue}`)) return;
    seen.add(`${label}:${cleanValue}`);
    tokens.push({ label, value: cleanValue, source: tokenSource });
  };
  const colorValue = '(#[0-9a-fA-F]{3,8}|rgba?\\([^)]*\\)|hsla?\\([^)]*\\))';
  const varRe = new RegExp(`(--[\\w-]+)\\s*:\\s*${colorValue}`, 'g');
  let match: RegExpExecArray | null;
  while ((match = varRe.exec(source)) && tokens.length < 24) {
    push(match[1] ?? 'token', `var(${match[1]})`, 'token');
    if (match[2]) push(`${match[1]} value`, match[2], 'custom');
  }
  const colorRe = new RegExp(colorValue, 'g');
  while ((match = colorRe.exec(source)) && tokens.length < 36) {
    push(match[1] ?? 'color', match[1] ?? '', 'custom');
  }
  return tokens.slice(0, 24);
}

function parseCssColor(value: string): [number, number, number] | null {
  const raw = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const body = hex[1]!;
    const full = body.length === 3
      ? body.split('').map((char) => char + char).join('')
      : body;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ];
  }
  const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(raw);
  if (!rgb) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])].map((n) => Math.max(0, Math.min(255, n))) as [number, number, number];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return [r, g, b]
    .map((channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    })
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
}

function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseCssColor(foreground);
  const bg = parseCssColor(background);
  if (!fg || !bg) return null;
  const light = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const dark = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (light + 0.05) / (dark + 0.05);
}

function contrastSummary(draft: InspectStyleDraft): ContrastSummary {
  const ratio = contrastRatio(draft.color, draft.backgroundColor);
  if (ratio === null) return { ratio: null, label: 'Contrast unavailable for token/current color', pass: false };
  const pass = ratio >= 4.5;
  return { ratio, label: `${ratio.toFixed(1)}:1 ${pass ? 'AA pass' : 'Low contrast'}`, pass };
}

function inspectVariantStyles(kind: string, draft: InspectStyleDraft): Partial<InspectStyleDraft> {
  if (kind === 'light') return { color: '#111827', backgroundColor: '#ffffff', borderColor: '#e5e7eb' };
  if (kind === 'dark') return { color: '#f9fafb', backgroundColor: '#111827', borderColor: '#374151' };
  if (kind === 'warmer') return { color: '#431407', backgroundColor: '#fff7ed', borderColor: '#fed7aa' };
  if (kind === 'premium') return { color: '#f8fafc', backgroundColor: '#0f172a', borderColor: '#d4af37' };
  if (kind === 'contrast') {
    const bg = parseCssColor(draft.backgroundColor);
    if (!bg) return { color: '#000000', backgroundColor: '#ffffff', borderColor: '#111827' };
    return { color: relativeLuminance(bg) >= 0.45 ? '#000000' : '#ffffff' };
  }
  return {};
}

function changedInspectStyles(draft: InspectStyleDraft, baseline: InspectStyleDraft): Partial<InspectStyleDraft> {
  const out: Partial<InspectStyleDraft> = {};
  for (const field of INSPECT_FIELDS) {
    const next = draft[field.key].trim();
    if (next && next !== baseline[field.key].trim()) out[field.key] = next;
  }
  return out;
}

function renderInspectToken(snapshot: InspectSnapshot, styles: Partial<InspectStyleDraft>): string {
  const declarations = Object.entries(styles)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
  return [
    'inspect:style',
    `file=${snapshot.filePath}`,
    `element=${snapshot.elementId}`,
    `selector=${snapshot.selector}`,
    `label=${snapshot.label}`,
    `styles=${declarations}`,
  ].join(' | ');
}

function renderEditToken(snapshot: InspectSnapshot, instruction: string): string {
  return [
    'edit:element',
    `file=${snapshot.filePath}`,
    `element=${snapshot.elementId}`,
    `selector=${snapshot.selector}`,
    `label=${snapshot.label}`,
    `text=${snapshot.text || '(empty)'}`,
    `instruction=${instruction.trim() || 'Edit this rendered element as requested.'}`,
  ].join(' | ');
}

function renderDrawToken(snapshot: InspectSnapshot): string {
  return [
    'draw:element',
    `file=${snapshot.filePath}`,
    `element=${snapshot.elementId}`,
    `selector=${snapshot.selector}`,
    `label=${snapshot.label}`,
    `region=x${snapshot.position.x} y${snapshot.position.y} ${snapshot.position.width}x${snapshot.position.height}`,
    'instruction=Use this rendered element as the visual target for annotation or redraw.',
  ].join(' | ');
}

function TargetingDock({
  mode,
  target,
  targetCount,
  visibleCommentCount,
  slideState,
  onMode,
  onCloseTarget,
  onStageTarget,
  onStageSlideComments,
  onSendSlideComments,
}: {
  mode: TargetMode;
  target: InspectSnapshot | PreviewCommentSnapshot | null;
  targetCount: number;
  visibleCommentCount: number;
  slideState: SlideState | null;
  onMode: (mode: TargetMode) => void;
  onCloseTarget: () => void;
  onStageTarget: () => void;
  onStageSlideComments: () => void;
  onSendSlideComments: () => void;
}) {
  const copy = mode === 'draw'
    ? 'Drag a region. Pixelpitch will keep its bounds and nearby element context.'
    : mode === 'comment'
      ? 'Click any element to leave a durable comment, then attach it to chat.'
      : mode === 'inspect'
        ? 'Click an element to tune visual tokens, preview instantly, then apply or stage.'
        : 'Click an element to edit text/remove it directly or stage exact context for the agent.';
  return (
    <div className="targeting-dock" data-mode={mode}>
      <div className="targeting-dock-mode">
        {(['comment', 'inspect', 'edit', 'draw'] as TargetMode[]).map((item) => (
          <button
            key={item}
            type="button"
            className={item === mode ? 'active' : ''}
            onClick={() => onMode(item)}
            aria-pressed={item === mode}
          >
            <Icon name={item === 'inspect' ? 'tweaks' : item === 'draw' ? 'draw' : item} size={13} />
            <span>{item === 'inspect' ? 'Tweaks' : item[0]!.toUpperCase() + item.slice(1)}</span>
          </button>
        ))}
      </div>
      <div className="targeting-dock-body">
        <span className="targeting-live-dot" aria-hidden />
        <div>
          <strong>{target ? target.elementId : 'Selection ready'}</strong>
          <span>
            {target
              ? `${target.label} · ${Math.round(target.position.width)}x${Math.round(target.position.height)}`
              : copy}
          </span>
        </div>
      </div>
      <div className="targeting-dock-meta">
        {slideState ? <span>Slide {slideState.active + 1}/{slideState.count}</span> : null}
        <span>{targetCount} targets</span>
        {visibleCommentCount > 0 ? (
          <button type="button" className="ghost-link button-like" onClick={onStageSlideComments}>
            Stage {visibleCommentCount} notes
          </button>
        ) : null}
        {visibleCommentCount > 0 ? (
          <button type="button" className="primary compact" onClick={onSendSlideComments}>
            Send notes
          </button>
        ) : null}
        {target ? (
          <button type="button" className="ghost-link button-like" onClick={onStageTarget}>
            Stage
          </button>
        ) : null}
        {target ? (
          <button type="button" className="ghost" onClick={onCloseTarget} aria-label="Clear selection">
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}

function InspectStylePanel({
  target,
  draft,
  baseline,
  onChange,
  onClose,
  onStage,
  onApply,
  applyScope,
  onApplyScope,
  applyCount,
  palette,
  onVariant,
  applying,
  error,
}: {
  target: InspectSnapshot;
  draft: InspectStyleDraft;
  baseline: InspectStyleDraft;
  onChange: (key: InspectStyleKey, value: string) => void;
  onClose: () => void;
  onStage: () => void;
  onApply: () => void;
  applyScope: InspectApplyScope;
  onApplyScope: (scope: InspectApplyScope) => void;
  applyCount: number;
  palette: ColorToken[];
  onVariant: (kind: string) => void;
  applying: boolean;
  error: string | null;
}) {
  const [colorTarget, setColorTarget] = useState<Extract<InspectStyleKey, 'color' | 'backgroundColor' | 'borderColor'>>('backgroundColor');
  const changed = Object.keys(changedInspectStyles(draft, baseline)).length > 0;
  const contrast = contrastSummary(draft);
  const colorFields = INSPECT_FIELDS.filter((field) => field.type === 'color');
  return (
    <div className="inspect-panel" data-testid="inspect-style-panel">
      <div className="inspect-panel-head">
        <div>
          <strong>{target.elementId}</strong>
          <span>{target.tagName || target.label}</span>
        </div>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      {palette.length > 0 ? (
        <div className="inspect-palette" aria-label="Color palette">
          <div className="inspect-panel-section-title">Palette</div>
          <div className="inspect-swatch-grid">
            {palette.slice(0, 18).map((token) => {
              const color = colorTokenToInput(token.value);
              return (
                <button
                  key={`${token.label}-${token.value}`}
                  type="button"
                  className={`inspect-swatch ${token.source}`}
                  title={`${token.label}: ${token.value}`}
                  onClick={() => onChange(colorTarget, token.value)}
                >
                  <span style={{ background: color ?? token.value }} />
                  <em>{token.source === 'token' ? token.label.replace(/^--/, '') : token.value}</em>
                </button>
              );
            })}
          </div>
          <div className="inspect-color-targets">
            {colorFields.map((field) => (
              <button
                key={field.key}
                type="button"
                className={`ghost-link button-like ${colorTarget === field.key ? 'active' : ''}`}
                onClick={() => setColorTarget(field.key as typeof colorTarget)}
              >
                {field.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="inspect-variant-row">
        {([
          ['light', 'Light'],
          ['dark', 'Dark'],
          ['warmer', 'Warmer'],
          ['premium', 'Premium'],
          ['contrast', 'Higher contrast'],
        ] as Array<[string, string]>).map(([kind, label]) => (
          <button key={kind} type="button" className="ghost-link button-like" onClick={() => onVariant(kind)}>
            {label}
          </button>
        ))}
      </div>
      <div className={`inspect-contrast ${contrast.pass ? 'pass' : 'warn'}`}>
        {contrast.label}
      </div>
      <div className="inspect-panel-grid">
        {INSPECT_FIELDS.map((field) => (
          <label key={field.key} className={field.type === 'color' ? 'inspect-color-field' : undefined}>
            <span>{field.label}</span>
            {field.type === 'color' ? (
              <>
                <input
                  type="color"
                  value={cssColorToInput(draft[field.key])}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  aria-label={field.label}
                />
                <input
                  value={draft[field.key]}
                  onChange={(event) => onChange(field.key, event.target.value)}
                />
              </>
            ) : (
              <input
                value={draft[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      <div className="inspect-panel-actions">
        <span className="inspect-panel-selection-note">Live previewing selected element</span>
        <div className="inspect-panel-action-group">
          <select
            value={applyScope}
            onChange={(event) => onApplyScope(event.target.value as InspectApplyScope)}
            aria-label="Apply scope"
          >
            <option value="element">This element</option>
            <option value="section">This slide/section</option>
            <option value="similar">Similar elements</option>
          </select>
          <button type="button" className="ghost-link button-like" disabled={!changed || applying} onClick={onStage}>
            Stage in chat
          </button>
          <button type="button" className="primary" disabled={!changed || applying} onClick={onApply}>
            {applying ? 'Applying...' : `Apply ${applyCount}`}
          </button>
        </div>
      </div>
      {error ? <div className="inspect-panel-error">{error}</div> : null}
    </div>
  );
}

function EditTargetPanel({
  target,
  draft,
  onDraft,
  onClose,
  onStage,
  onApplyText,
  onRemove,
  applying,
  error,
}: {
  target: InspectSnapshot;
  draft: string;
  onDraft: (value: string) => void;
  onClose: () => void;
  onStage: () => void;
  onApplyText: () => void;
  onRemove: () => void;
  applying: boolean;
  error: string | null;
}) {
  return (
    <div className="inspect-panel edit-target-panel" data-testid="edit-target-panel">
      <div className="inspect-panel-head">
        <div>
          <strong>{target.elementId}</strong>
          <span>{target.tagName || target.label}</span>
        </div>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <textarea
        value={draft}
        placeholder="Edit the text content for this element"
        onChange={(event) => onDraft(event.target.value)}
      />
      <div className="inspect-panel-actions">
        <button type="button" className="comment-popover-remove" disabled={applying} onClick={onRemove}>
          Remove
        </button>
        <div className="inspect-panel-action-group">
          <button type="button" className="ghost-link button-like" disabled={applying} onClick={onStage}>
            Stage for agent
          </button>
          <button type="button" className="primary" disabled={applying} onClick={onApplyText}>
            {applying ? 'Applying...' : 'Apply text'}
          </button>
        </div>
      </div>
      {error ? <div className="inspect-panel-error">{error}</div> : null}
    </div>
  );
}

function DrawRegionPanel({
  target,
  draft,
  onDraft,
  onClose,
  onStage,
  onSaveComment,
  saving,
  error,
}: {
  target: InspectSnapshot;
  draft: string;
  onDraft: (value: string) => void;
  onClose: () => void;
  onStage: () => void;
  onSaveComment: () => void | Promise<void>;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="inspect-panel draw-region-panel" data-testid="draw-region-panel">
      <div className="inspect-panel-head">
        <div>
          <strong>Drawn region</strong>
          <span>{target.position.width}x{target.position.height} over {target.label}</span>
        </div>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="draw-region-preview">
        <span aria-hidden />
        <div>
          <strong>{target.elementId}</strong>
          <p>{target.text || 'No text inside this region. The bounds and nearby element context will still be sent.'}</p>
        </div>
      </div>
      <textarea
        value={draft}
        placeholder="Describe what should change in this region"
        onChange={(event) => onDraft(event.target.value)}
      />
      <div className="inspect-panel-actions">
        <button type="button" className="ghost-link button-like" disabled={saving} onClick={onStage}>
          Stage for agent
        </button>
        <button type="button" className="primary" disabled={saving || !draft.trim()} onClick={() => void onSaveComment()}>
          {saving ? 'Saving...' : 'Save + attach'}
        </button>
      </div>
      {error ? <div className="inspect-panel-error">{error}</div> : null}
    </div>
  );
}

function ReactComponentViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const [source, setSource] = useState<string | null>(null);
  const [srcDoc, setSrcDoc] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);

  const shareLayer = usePopoverLayer({
    open: shareMenuOpen,
    onDismiss: () => setShareMenuOpen(false),
    triggerRef: shareRef as React.RefObject<HTMLElement | null>,
  });

  useEffect(() => {
    setSource(null);
    let cancelled = false;
    void fetchProjectFileText(projectId, file.name).then((text) => {
      if (!cancelled) setSource(text ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime, reloadKey]);

  const exportTitle = file.name.replace(/\.(jsx|tsx)$/i, '') || file.name;
  const sourceExtension = file.name.toLowerCase().endsWith('.tsx') ? '.tsx' : '.jsx';

  useEffect(() => {
    if (source === null) {
      setSrcDoc('');
      return;
    }

    let cancelled = false;
    const buildSrcDoc = () => {
      const nextSrcDoc = buildReactComponentSrcdoc(source, { title: exportTitle });
      if (!cancelled) setSrcDoc(nextSrcDoc);
    };

    if (source.length > 100_000) {
      setSrcDoc('');
      const timeout = window.setTimeout(buildSrcDoc, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timeout);
      };
    }

    buildSrcDoc();
    return () => {
      cancelled = true;
    };
  }, [source, exportTitle]);

  return (
    <div className="viewer react-component-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <button
            type="button"
            className="icon-only"
            onClick={() => setReloadKey((n) => n + 1)}
            title={t('fileViewer.reload')}
            aria-label={t('fileViewer.reloadAria')}
          >
            <Icon name="reload" size={14} />
          </button>
          <span className="viewer-meta">
            {t('fileViewer.reactMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <div className="viewer-toolbar-actions">
          <div className="viewer-tabs">
            <button
              type="button"
              className={`viewer-tab ${mode === 'preview' ? 'active' : ''}`}
              onClick={() => setMode('preview')}
            >
              {t('fileViewer.preview')}
            </button>
            <button
              type="button"
              className={`viewer-tab ${mode === 'source' ? 'active' : ''}`}
              onClick={() => setMode('source')}
            >
              {t('fileViewer.source')}
            </button>
          </div>
          {source !== null ? (
            <>
              <span className="viewer-divider" aria-hidden />
              <div className="share-menu" ref={shareRef}>
                <button
                  type="button"
                  className="viewer-action primary"
                  aria-haspopup="menu"
                  aria-expanded={shareMenuOpen}
                  onClick={() => setShareMenuOpen((v) => !v)}
                >
                  <span>{t('fileViewer.shareLabel')}</span>
                  <Icon name="chevron-down" size={11} />
                </button>
                {shareMenuOpen ? (
                  <div ref={shareLayer.contentRef} className="share-menu-popover" role="menu" style={{ zIndex: shareLayer.zIndex }}>
                    <button
                      type="button"
                      className="share-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        exportAsJsx(source, exportTitle, sourceExtension);
                      }}
                    >
                      <span className="share-menu-icon"><Icon name="file-code" size={14} /></span>
                      <span>{t('fileViewer.exportJsx')}</span>
                    </button>
                    <button
                      type="button"
                      className="share-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        exportReactComponentAsHtml(source, exportTitle);
                      }}
                    >
                      <span className="share-menu-icon"><Icon name="file" size={14} /></span>
                      <span>{t('fileViewer.exportReactHtml')}</span>
                    </button>
                    <div className="share-menu-divider" />
                    <button
                      type="button"
                      className="share-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setShareMenuOpen(false);
                        exportReactComponentAsZip(source, exportTitle, sourceExtension);
                      }}
                    >
                      <span className="share-menu-icon"><Icon name="download" size={14} /></span>
                      <span>{t('fileViewer.exportZip')}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="viewer-body">
        {source === null || (mode === 'preview' && !srcDoc) ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : mode === 'preview' ? (
          <iframe
            data-testid="react-component-preview-frame"
            title={file.name}
            sandbox="allow-scripts"
            srcDoc={srcDoc}
          />
        ) : (
          <CodeWithLines text={source} />
        )}
      </div>
    </div>
  );
}

function BinaryViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  return (
    <div className="viewer binary-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {t('fileViewer.binaryMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <FileActions projectId={projectId} file={file} />
      </div>
      <div className="viewer-body">
        <div className="viewer-empty">
          {t('fileViewer.binaryNote', { size: file.size })}
        </div>
      </div>
    </div>
  );
}

function DocumentPreviewViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const [preview, setPreview] = useState<ProjectFilePreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPreview(null);
    void fetchProjectFilePreview(projectId, file.name).then((next) => {
      if (!cancelled) {
        setPreview(next);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime]);

  return (
    <div className="viewer document-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {documentMetaLabel(file, t)} · {humanSize(file.size)}
          </span>
        </div>
        <FileActions projectId={projectId} file={file} />
      </div>
      <div className="viewer-body">
        {loading ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : preview ? (
          <div className="document-preview">
            <h2>{preview.title}</h2>
            {preview.sections.map((section, idx) => (
              <section key={`${section.title}-${idx}`}>
                <h3>{section.title}</h3>
                {section.lines.map((line, lineIdx) => (
                  <p key={`${lineIdx}-${line}`}>{line}</p>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="viewer-empty">{t('fileViewer.previewUnavailable')}</div>
        )}
      </div>
    </div>
  );
}

function HtmlViewer({
  projectId,
  file,
  liveHtml,
  isDeck,
  onExportAsPptx,
  streaming,
  focusMode,
  onFocusModeChange,
  previewComments = [],
  onSavePreviewComment,
  onRemovePreviewComment,
  onAttachPreviewComments,
  onSendPreviewComments,
  onStageComposerToken,
  onFileEdited,
}: {
  projectId: string;
  file: ProjectFile;
  liveHtml?: string;
  isDeck: boolean;
  onExportAsPptx?: ((fileName: string) => void) | undefined;
  streaming: boolean;
  focusMode: boolean;
  onFocusModeChange?: (focused: boolean) => void;
  previewComments?: PreviewComment[];
  onSavePreviewComment?: (target: PreviewCommentTarget, note: string, attachAfterSave: boolean) => Promise<PreviewComment | null>;
  onRemovePreviewComment?: (commentId: string) => Promise<void>;
  onAttachPreviewComments?: (comments: PreviewComment[]) => void;
  onSendPreviewComments?: (comments: PreviewComment[]) => void;
  onStageComposerToken?: (token: string) => void;
  onFileEdited?: () => Promise<void> | void;
}) {
  const t = useT();
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const [source, setSource] = useState<string | null>(liveHtml ?? null);
  const [inlinedSource, setInlinedSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewportId>('fill');
  const [presentMenuOpen, setPresentMenuOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [paletteTweaksOpen, setPaletteTweaksOpen] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState<PaletteId | null>(null);
  // Template save UX. We surface a transient "Saved" pill in the share
  // menu so the user gets feedback without a noisy toast layer.
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateNote, setTemplateNote] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<DeployProjectFileResponse | null>(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [deployConfig, setDeployConfig] = useState<DeployConfigResponse | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployPhase, setDeployPhase] = useState<'idle' | 'deploying' | 'preparing-link'>('idle');
  const [savingDeployConfig, setSavingDeployConfig] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deployResult, setDeployResult] = useState<DeployProjectFileResponse | null>(null);
  const [deployPreflight, setDeployPreflight] = useState<DeployPreflightResponse | null>(null);
  const [checkingDeployPreflight, setCheckingDeployPreflight] = useState(false);
  const [copiedDeployLink, setCopiedDeployLink] = useState(false);
  const [cloudRunProjectId, setCloudRunProjectId] = useState('');
  const [cloudRunRegion, setCloudRunRegion] = useState('us-central1');
  const [cloudRunServiceName, setCloudRunServiceName] = useState('');
  const [cloudRunPublic, setCloudRunPublic] = useState(true);
  const [inTabPresent, setInTabPresent] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [inspectMode, setInspectMode] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [manualEditMode, setManualEditMode] = useState(false);
  const [manualEditTargets, setManualEditTargets] = useState<ManualEditTarget[]>([]);
  const [selectedManualEditTarget, setSelectedManualEditTarget] = useState<ManualEditTarget | null>(null);
  const [manualEditDraft, setManualEditDraft] = useState<ManualEditDraft>(() => emptyManualEditDraft());
  const [manualEditHistory, setManualEditHistory] = useState<ManualEditHistoryEntry[]>([]);
  const [manualEditUndone, setManualEditUndone] = useState<ManualEditHistoryEntry[]>([]);
  const [manualEditError, setManualEditError] = useState<string | null>(null);
  const [manualEditSaving, setManualEditSaving] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [activeInspectTarget, setActiveInspectTarget] = useState<InspectSnapshot | null>(null);
  const [inspectBaseline, setInspectBaseline] = useState<InspectStyleDraft>(EMPTY_INSPECT_STYLE);
  const [inspectDraft, setInspectDraft] = useState<InspectStyleDraft>(EMPTY_INSPECT_STYLE);
  const [inspectApplyScope, setInspectApplyScope] = useState<InspectApplyScope>('element');
  const [editInstruction, setEditInstruction] = useState('');
  const [drawInstruction, setDrawInstruction] = useState('');
  const [applyingEdit, setApplyingEdit] = useState(false);
  const [editApplyError, setEditApplyError] = useState<string | null>(null);
  const [commentMode, setCommentMode] = useState(false);
  const [activeCommentTarget, setActiveCommentTarget] = useState<PreviewCommentSnapshot | null>(null);
  const [hoveredCommentTarget, setHoveredCommentTarget] = useState<PreviewCommentSnapshot | null>(null);
  const [liveCommentTargets, setLiveCommentTargets] = useState<Map<string, PreviewCommentSnapshot>>(() => new Map());
  const [commentDraft, setCommentDraft] = useState('');
  const [iframeVisualOffset, setIframeVisualOffset] = useState({ x: 0, y: 0 });
  const [previewViewportVars, setPreviewViewportVars] = useState<CSSProperties | undefined>();
  const previewStateKey = `${projectId}:${file.name}`;
  // Slide deck state: the iframe posts the active index + total count back
  // every time a slide settles. The editor surfaces this as context only;
  // slide transitions belong to the deck preview, not the editing controls.
  const [slideState, setSlideState] = useState<SlideState | null>(
    () => htmlPreviewSlideState.get(previewStateKey) ?? null,
  );
  const [chromeActionsHost, setChromeActionsHost] = useState<HTMLElement | null>(null);
  const previewBodyRef = useRef<HTMLDivElement | null>(null);
  const previewFrameWrapRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const shareRef = useRef<HTMLDivElement | null>(null);
  const presentWrapRef = useRef<HTMLDivElement | null>(null);
  const foregroundSlideLockRef = useRef<number | null>(null);
  const lastAnnotationSlideNavRef = useRef<{ action: string; at: number } | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setChromeActionsHost(document.getElementById(APP_CHROME_FILE_ACTIONS_ID));
  }, []);

  const presentLayer = usePopoverLayer({
    open: presentMenuOpen,
    onDismiss: () => setPresentMenuOpen(false),
    triggerRef: presentWrapRef as React.RefObject<HTMLElement | null>,
  });

  const htmlShareLayer = usePopoverLayer({
    open: shareMenuOpen,
    onDismiss: () => setShareMenuOpen(false),
    triggerRef: shareRef as React.RefObject<HTMLElement | null>,
  });

  useEffect(() => {
    if (liveHtml !== undefined) {
      setSource(liveHtml);
      return;
    }
    setSource(null);
    let cancelled = false;
    void fetchProjectFileText(projectId, file.name).then((text) => {
      if (!cancelled) setSource(text);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime, liveHtml, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setDeployResult(null);
    setDeployError(null);
    setCopiedDeployLink(false);
    setDeployPhase('idle');
    void fetchProjectDeployments(projectId).then((items) => {
      if (cancelled) return;
      const current = items.find(
        (item) => item.fileName === file.name && item.providerId === 'cloud-run',
      );
      setDeployment(current ?? null);
      setDeployResult(current ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name]);

  // Detect deck-shaped HTML even when the project's skill didn't declare
  // `mode: deck`. Freeform projects often produce a deck because the user
  // asked for one in plain prose; without this, prev/next and Present
  // never surface and the deck becomes a static, unnavigable preview.
  const looksLikeDeck = useMemo(() => {
    if (!source) return false;
    return (
      /<deck-stage\b/i.test(source) ||
      /\bdata-deck-slide\b/i.test(source) ||
      /\bdata-deck-active\b/i.test(source) ||
      /class\s*=\s*['"][^'"]*\bslide\b/i.test(source)
    );
  }, [source]);
  const effectiveDeck = isDeck || looksLikeDeck;
  const targetingModeActive = commentMode || inspectMode || editMode || drawMode || manualEditMode;
  const previewSource = inlinedSource ?? source;
  const inspectPalette = useMemo(() => extractColorTokens(previewSource), [previewSource]);

  useEffect(() => {
    setInlinedSource(null);
    if (!source || !hasRelativeAssetRefs(source)) return;
    let cancelled = false;
    void inlineRelativeAssets(source, projectId, file.name).then((next) => {
      if (!cancelled) setInlinedSource(next);
    });
    return () => {
      cancelled = true;
    };
  }, [source, effectiveDeck, projectId, file.name]);

  const srcDoc = useMemo(
    () => (previewSource ? buildSrcdoc(previewSource, {
      deck: effectiveDeck,
      baseHref: projectRawUrl(projectId, baseDirFor(file.name)),
      initialSlideIndex: htmlPreviewSlideState.get(previewStateKey)?.active ?? 0,
      commentBridge: commentMode,
      inspectBridge: inspectMode || editMode || drawMode,
      editBridge: manualEditMode,
    }) : ''),
    [previewSource, effectiveDeck, projectId, file.name, previewStateKey, commentMode, inspectMode, editMode, drawMode, manualEditMode],
  );

  useEffect(() => {
    if (mode !== 'preview' || !targetingModeActive) {
      setPreviewViewportVars(undefined);
      return;
    }
    const body = previewBodyRef.current;
    if (!body) return;
    const measure = () => {
      const rect = body.getBoundingClientRect();
      const next = {
        '--preview-left': `${Math.round(rect.left)}px`,
        '--preview-right': `${Math.round(rect.right)}px`,
        '--preview-top': `${Math.round(rect.top)}px`,
        '--preview-bottom': `${Math.round(rect.bottom)}px`,
        '--preview-width': `${Math.round(rect.width)}px`,
        '--preview-height': `${Math.round(rect.height)}px`,
        '--preview-center-x': `${Math.round(rect.left + rect.width / 2)}px`,
      } as CSSProperties;
      setPreviewViewportVars(next);
    };
    measure();
    window.addEventListener('resize', measure);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(body);
    }
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [mode, targetingModeActive, zoom]);

  useEffect(() => {
    if (mode !== 'preview') {
      setIframeVisualOffset({ x: 0, y: 0 });
      return;
    }
    const layer = previewBodyRef.current?.querySelector('.comment-preview-layer') as HTMLElement | null;
    const wrap = previewFrameWrapRef.current;
    if (!layer || !wrap) return;
    const measure = () => {
      const layerRect = layer.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      setIframeVisualOffset((current) => {
        const next = {
          x: Math.round(wrapRect.left - layerRect.left),
          y: Math.round(wrapRect.top - layerRect.top),
        };
        return current.x === next.x && current.y === next.y ? current : next;
      });
    };
    measure();
    const scrollParent = previewBodyRef.current;
    scrollParent?.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(layer);
      ro.observe(wrap);
    }
    return () => {
      scrollParent?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [mode, zoom, srcDoc]);

  useEffect(() => {
    if (!effectiveDeck) {
      setSlideState(null);
      return;
    }
    setSlideState(htmlPreviewSlideState.get(previewStateKey) ?? null);
    function onMessage(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const data = ev?.data as
        | { type?: string; active?: number; count?: number }
        | null;
      if (!data || data.type !== 'od:slide-state') return;
      if (typeof data.active !== 'number' || typeof data.count !== 'number') return;
      const next = { active: data.active, count: data.count };
      htmlPreviewSlideState.set(previewStateKey, next);
      setSlideState(next);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [effectiveDeck, previewStateKey]);

  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const mode: TargetMode | 'off' = commentMode
      ? 'comment'
      : inspectMode
        ? 'inspect'
        : editMode
          ? 'edit'
          : drawMode
            ? 'draw'
            : 'off';
    win.postMessage({ type: 'od:preview-target-mode', mode, enabled: mode !== 'off' }, '*');
    win.postMessage({ type: 'od-edit-mode', enabled: manualEditMode }, '*');
    if (mode !== 'off') {
      window.requestAnimationFrame(() => previewBodyRef.current?.focus({ preventScroll: true }));
    }
  }, [commentMode, inspectMode, editMode, drawMode, manualEditMode, srcDoc]);

  useEffect(() => {
    if (!effectiveDeck || mode !== 'preview' || !targetingModeActive) {
      foregroundSlideLockRef.current = null;
      return;
    }
    if (foregroundSlideLockRef.current === null) {
      foregroundSlideLockRef.current =
        slideState?.active ?? htmlPreviewSlideState.get(previewStateKey)?.active ?? 0;
    }
  }, [effectiveDeck, mode, targetingModeActive, slideState?.active, previewStateKey]);

  useEffect(() => {
    setActiveCommentTarget(null);
    setHoveredCommentTarget(null);
    setActiveInspectTarget(null);
    setInspectBaseline(EMPTY_INSPECT_STYLE);
    setInspectDraft(EMPTY_INSPECT_STYLE);
    setInspectApplyScope('element');
    setEditInstruction('');
    setDrawInstruction('');
    setLiveCommentTargets(new Map());
    setCommentDraft('');
    setManualEditTargets([]);
    setSelectedManualEditTarget(null);
    setManualEditDraft(emptyManualEditDraft());
    setManualEditHistory([]);
    setManualEditUndone([]);
    setManualEditError(null);
  }, [file.name]);

  useEffect(() => {
    if (source == null) return;
    setManualEditDraft((current) =>
      current.fullSource === source ? current : { ...current, fullSource: source },
    );
  }, [source]);

  useEffect(() => {
    if (!commentMode && !inspectMode && !editMode && !drawMode) {
      setActiveCommentTarget(null);
      setHoveredCommentTarget(null);
      setActiveInspectTarget(null);
      setLiveCommentTargets(new Map());
      return;
    }
    const snapshotFromData = (data: Partial<InspectSnapshot>): InspectSnapshot => ({
      filePath: file.name,
      elementId: String(data.elementId || ''),
      selector: String(data.selector || ''),
      label: String(data.label || ''),
      text: String(data.text || ''),
      position: {
        x: Number(data.position?.x) || 0,
        y: Number(data.position?.y) || 0,
        width: Number(data.position?.width) || 0,
        height: Number(data.position?.height) || 0,
      },
      htmlHint: String(data.htmlHint || ''),
      tagName: typeof data.tagName === 'string' ? data.tagName : undefined,
      className: typeof data.className === 'string' ? data.className : undefined,
      styles: data.styles && typeof data.styles === 'object' ? data.styles : undefined,
      drawRegion: Boolean((data as InspectSnapshot).drawRegion),
    });
    function onMessage(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const data = ev.data as (Partial<PreviewCommentSnapshot> & {
        type?: string;
        targets?: Array<Partial<PreviewCommentSnapshot>>;
        action?: unknown;
      }) | null;
      if (!data?.type) return;
      if (data.type === 'od:annotation-slide-nav') {
        const action = data.action === 'next' || data.action === 'prev' || data.action === 'first' || data.action === 'last'
          ? data.action
          : null;
        if (action) {
          annotationSlideNav(action);
        }
        return;
      }
      if (data.type === 'od:comment-targets' && Array.isArray(data.targets)) {
        const next = new Map<string, PreviewCommentSnapshot>();
        data.targets.forEach((item) => {
          const snapshot = snapshotFromData(item);
          if (snapshot.elementId) next.set(snapshot.elementId, snapshot);
        });
        setLiveCommentTargets(next);
        setActiveCommentTarget((current) => (
          current ? next.get(current.elementId) ?? null : null
        ));
        setHoveredCommentTarget((current) => (
          current ? next.get(current.elementId) ?? null : null
        ));
        setActiveInspectTarget((current) => (
          current ? (next.get(current.elementId) as InspectSnapshot | undefined) ?? current : null
        ));
        return;
      }
      if (data.type === 'od:comment-leave') {
        setHoveredCommentTarget(null);
        return;
      }
      if (data.type === 'od:comment-hover') {
        const snapshot = snapshotFromData(data);
        if (!snapshot.elementId) return;
        if (inspectMode || editMode || drawMode) {
          setHoveredCommentTarget((current) => materiallySameSnapshot(current, snapshot) ? current : snapshot);
          setLiveCommentTargets((current) => new Map(current).set(snapshot.elementId, snapshot));
          return;
        }
        setHoveredCommentTarget((current) => materiallySameSnapshot(current, snapshot) ? current : snapshot);
        setLiveCommentTargets((current) => new Map(current).set(snapshot.elementId, snapshot));
        return;
      }
      if (data.type === 'od:comment-target') {
        const snapshot = snapshotFromData(data);
        if (!snapshot.elementId) return;
        if (inspectMode || editMode || drawMode) {
          const nextStyle = inspectStyleFromSnapshot(snapshot);
          setActiveInspectTarget(snapshot);
          setInspectBaseline(nextStyle);
          setInspectDraft(nextStyle);
          setEditInstruction(editMode ? snapshot.text : '');
          setDrawInstruction('');
          setEditApplyError(null);
          setHoveredCommentTarget(snapshot);
          setLiveCommentTargets((current) => new Map(current).set(snapshot.elementId, snapshot));
          return;
        }
        const existing = previewComments.find((comment) => comment.elementId === snapshot.elementId);
        setActiveCommentTarget(snapshot);
        setHoveredCommentTarget(snapshot);
        setLiveCommentTargets((current) => new Map(current).set(snapshot.elementId, snapshot));
        setCommentDraft(existing?.note ?? '');
      }
      if (data.type === 'od:draw-region') {
        const snapshot = snapshotFromData(data);
        if (!snapshot.elementId) return;
        const drawSnapshot = { ...snapshot, drawRegion: true };
        setActiveInspectTarget(drawSnapshot);
        setHoveredCommentTarget(drawSnapshot);
        setLiveCommentTargets((current) => new Map(current).set(drawSnapshot.elementId, drawSnapshot));
        setDrawInstruction('');
        setEditApplyError(null);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [commentMode, inspectMode, editMode, drawMode, file.name, previewComments, onStageComposerToken]);

  useEffect(() => {
    if (!manualEditMode) {
      setManualEditTargets([]);
      setSelectedManualEditTarget(null);
      setManualEditError(null);
      return;
    }
    function onMessage(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const data = ev.data as ManualEditBridgeMessage | null;
      if (!data?.type) return;
      if (data.type === 'od-edit-targets' && Array.isArray(data.targets)) {
        setManualEditTargets(data.targets);
        setSelectedManualEditTarget((current) =>
          current ? data.targets.find((target) => target.id === current.id) ?? null : current,
        );
      } else if (data.type === 'od-edit-select') {
        selectManualEditTarget(data.target);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [manualEditMode, source]);

  function selectManualEditTarget(target: ManualEditTarget) {
    const base = source ?? '';
    const fields = readManualEditFields(base, target.id);
    setSelectedManualEditTarget(target);
    setManualEditDraft({
      text: fields.text ?? target.fields.text ?? target.text,
      href: fields.href ?? target.fields.href ?? '',
      src: fields.src ?? target.fields.src ?? '',
      alt: fields.alt ?? target.fields.alt ?? '',
      styles: readManualEditStyles(base, target.id),
      attributesText: JSON.stringify(readManualEditAttributes(base, target.id), null, 2),
      outerHtml: readManualEditOuterHtml(base, target.id) || target.outerHtml,
      fullSource: base,
    });
    setManualEditError(null);
  }

  async function applyManualEdit(patch: ManualEditPatch, label: string) {
    if (manualEditSaving || source == null) return;
    setManualEditSaving(true);
    setManualEditError(null);
    try {
      const baseSource = source;
      const result = applyManualEditPatch(baseSource, patch);
      if (!result.ok) {
        setManualEditError(result.error ?? 'Could not apply edit.');
        return;
      }
      const saved = await writeProjectTextFile(projectId, file.name, result.source, {
        artifactManifest: (file as any).artifactManifest,
      });
      if (!saved) {
        setManualEditError('Could not save the edited file.');
        return;
      }
      const entry: ManualEditHistoryEntry = {
        id: `${Date.now()}-${manualEditHistory.length}`,
        label,
        patch,
        beforeSource: baseSource,
        afterSource: result.source,
        createdAt: Date.now(),
      };
      setSource(result.source);
      setInlinedSource(null);
      setManualEditHistory((current) => [entry, ...current]);
      setManualEditUndone([]);
      setManualEditDraft((current) => ({ ...current, fullSource: result.source }));
      await onFileEdited?.();
    } finally {
      setManualEditSaving(false);
    }
  }

  async function undoManualEdit() {
    if (manualEditSaving) return;
    const [latest, ...rest] = manualEditHistory;
    if (!latest) return;
    setManualEditSaving(true);
    try {
      const saved = await writeProjectTextFile(projectId, file.name, latest.beforeSource, {
        artifactManifest: (file as any).artifactManifest,
      });
      if (!saved) {
        setManualEditError('Could not save the undo result.');
        return;
      }
      setSource(latest.beforeSource);
      setInlinedSource(null);
      setManualEditHistory(rest);
      setManualEditUndone((current) => [latest, ...current]);
      setManualEditDraft((current) => ({ ...current, fullSource: latest.beforeSource }));
      await onFileEdited?.();
    } finally {
      setManualEditSaving(false);
    }
  }

  async function redoManualEdit() {
    if (manualEditSaving) return;
    const [latest, ...rest] = manualEditUndone;
    if (!latest) return;
    setManualEditSaving(true);
    try {
      const saved = await writeProjectTextFile(projectId, file.name, latest.afterSource, {
        artifactManifest: (file as any).artifactManifest,
      });
      if (!saved) {
        setManualEditError('Could not save the redo result.');
        return;
      }
      setSource(latest.afterSource);
      setInlinedSource(null);
      setManualEditUndone(rest);
      setManualEditHistory((current) => [latest, ...current]);
      setManualEditDraft((current) => ({ ...current, fullSource: latest.afterSource }));
      await onFileEdited?.();
    } finally {
      setManualEditSaving(false);
    }
  }

  function postSlide(action: 'next' | 'prev' | 'first' | 'last' | 'go', index?: number) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: 'od:slide', action, index }, '*');
  }

  function annotationSlideNav(action: 'next' | 'prev' | 'first' | 'last') {
    const now = Date.now();
    const last = lastAnnotationSlideNavRef.current;
    if (last?.action === action && now - last.at < 220) return;
    lastAnnotationSlideNavRef.current = { action, at: now };
    foregroundSlideLockRef.current = null;
    setActiveCommentTarget(null);
    setHoveredCommentTarget(null);
    setActiveInspectTarget(null);
    setLiveCommentTargets(new Map());
    postSlide(action);
  }

  // Plain arrows remain passive preview navigation only. In targeting modes,
  // only Cmd/Ctrl + arrows are treated as deliberate slide annotation nav.
  useEffect(() => {
    if (!effectiveDeck || mode !== 'preview') return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      if (targetingModeActive && !(e.metaKey || e.ctrlKey)) return;
      const navRight = e.key === 'ArrowRight' || e.key === 'PageDown';
      const navLeft = e.key === 'ArrowLeft' || e.key === 'PageUp';
      if (navRight) {
        e.preventDefault();
        annotationSlideNav('next');
      } else if (navLeft) {
        e.preventDefault();
        annotationSlideNav('prev');
      } else if (e.key === 'Home') {
        if (targetingModeActive && !(e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        annotationSlideNav('first');
      } else if (e.key === 'End') {
        if (targetingModeActive && !(e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        annotationSlideNav('last');
      }
    }
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, [effectiveDeck, mode, targetingModeActive]);

  usePopoverLayer({
    open: inTabPresent,
    onDismiss: () => setInTabPresent(false),
  });

  function openInNewTab() {
    if (!source) return;
    const blob = new Blob([source], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // Snapshot this project as a reusable template. The daemon snapshots
  // EVERY html/text/code file in the project (not just the file open in
  // the viewer), so the template captures the whole design, not a single
  // page. Surfaced here in the Share menu because that's where the user's
  // share / export mental model already lives.
  async function handleSaveAsTemplate() {
    setShareMenuOpen(false);
    const defaultName =
      file.name.replace(/\.html?$/i, '') || t('fileViewer.templateNameDefault');
    const name = window.prompt(t('fileViewer.templateNamePrompt'), defaultName);
    if (!name || !name.trim()) return;
    const description = window.prompt(
      t('fileViewer.templateDescPrompt'),
      '',
    );
    setSavingTemplate(true);
    setTemplateNote(null);
    try {
      const tpl = await saveTemplate({
        name: name.trim(),
        description: description?.trim() || undefined,
        sourceProjectId: projectId,
      });
      setTemplateNote(
        tpl
          ? t('fileViewer.savedTemplate', { name: tpl.name })
          : t('fileViewer.savedTemplateFail'),
      );
    } finally {
      setSavingTemplate(false);
      // Auto-clear the note so the menu doesn't keep stale state next open.
      setTimeout(() => setTemplateNote(null), 4000);
    }
  }

  async function openDeployModal() {
    setShareMenuOpen(false);
    setDeployModalOpen(true);
    setDeployError(null);
    setCopiedDeployLink(false);
    setDeployPhase('idle');
    setDeployPreflight(null);
    setCheckingDeployPreflight(true);
    const preflightPromise = preflightDeployProjectFile(projectId, file.name).catch((err) => {
      setDeployError(err instanceof Error ? err.message : 'Deploy preflight failed.');
      return null;
    });
    const [config, deployments, preflight] = await Promise.all([
      fetchDeployConfig(),
      fetchProjectDeployments(projectId),
      preflightPromise,
    ]);
    setCheckingDeployPreflight(false);
    if (config) {
      setDeployConfig(config);
      setCloudRunProjectId(config.projectId || '');
      setCloudRunRegion(config.region || 'us-central1');
      setCloudRunServiceName(config.serviceName || '');
      setCloudRunPublic(config.allowUnauthenticated !== false);
    }
    const current = deployments.find(
      (item) => item.fileName === file.name && item.providerId === 'cloud-run',
    );
    setDeployment(current ?? null);
    setDeployResult(current ?? null);
    setDeployPreflight(preflight);
  }

  async function saveDeployConfig() {
    setSavingDeployConfig(true);
    setDeployError(null);
    try {
      const config = await updateDeployConfig({
        projectId: cloudRunProjectId,
        region: cloudRunRegion,
        serviceName: cloudRunServiceName,
        allowUnauthenticated: cloudRunPublic,
      });
      if (!config) throw new Error(t('fileViewer.deployConfigSaveFailed'));
      setDeployConfig(config);
      setCloudRunProjectId(config.projectId || '');
      setCloudRunRegion(config.region || 'us-central1');
      setCloudRunServiceName(config.serviceName || '');
      setCloudRunPublic(config.allowUnauthenticated !== false);
      return config;
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : t('fileViewer.deployConfigSaveFailed'));
      return null;
    } finally {
      setSavingDeployConfig(false);
    }
  }

  async function deployToCloudRun() {
    setDeploying(true);
    setDeployPhase('deploying');
    setDeployError(null);
    setCopiedDeployLink(false);
    try {
      setCheckingDeployPreflight(true);
      const preflight = await preflightDeployProjectFile(projectId, file.name);
      setDeployPreflight(preflight);
      setCheckingDeployPreflight(false);
      const blocking = deploymentPreflightBlockingWarnings(preflight);
      if (blocking.length > 0) {
        throw new Error('Fix missing or invalid deploy references before deploying.');
      }
      const needsConfigSave =
        cloudRunProjectId.trim() !== (deployConfig?.projectId || '') ||
        cloudRunRegion.trim() !== (deployConfig?.region || '') ||
        cloudRunServiceName.trim() !== (deployConfig?.serviceName || '') ||
        cloudRunPublic !== (deployConfig?.allowUnauthenticated !== false) ||
        !deployConfig?.configured;
      if (needsConfigSave) {
        const nextConfig = await saveDeployConfig();
        if (!nextConfig?.configured) {
          throw new Error(t('fileViewer.vercelTokenRequired'));
        }
      }
      setDeployPhase('preparing-link');
      const next = await deployProjectFile(projectId, file.name);
      setDeployment(next);
      setDeployResult(next);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : t('fileViewer.deployFailed'));
    } finally {
      setCheckingDeployPreflight(false);
      setDeploying(false);
      setDeployPhase('idle');
    }
  }

  async function refreshDeployPreflight() {
    setCheckingDeployPreflight(true);
    setDeployError(null);
    try {
      setDeployPreflight(await preflightDeployProjectFile(projectId, file.name));
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deploy preflight failed.');
    } finally {
      setCheckingDeployPreflight(false);
    }
  }

  async function retryDeploymentLink() {
    const current = deployResult || deployment;
    if (!current?.id) return;
    setDeployError(null);
    setDeployPhase('preparing-link');
    try {
      const next = await checkDeploymentLink(projectId, current.id);
      setDeployment(next);
      setDeployResult(next);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : t('fileViewer.deployFailed'));
    } finally {
      setDeployPhase('idle');
    }
  }

  async function copyDeployLink(url: string) {
    const safeUrl = url.trim();
    if (!safeUrl) return;
    try {
      await navigator.clipboard.writeText(safeUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = safeUrl;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.top = '-1000px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedDeployLink(true);
    window.setTimeout(() => setCopiedDeployLink(false), 1800);
  }

  function presentInThisTab() {
    setPresentMenuOpen(false);
    setInTabPresent(true);
  }

  function presentFullscreen() {
    setPresentMenuOpen(false);
    const el = previewBodyRef.current;
    if (el && typeof el.requestFullscreen === 'function') {
      el.requestFullscreen().catch(() => setInTabPresent(true));
    } else {
      setInTabPresent(true);
    }
  }

  function presentNewTab() {
    setPresentMenuOpen(false);
    openInNewTab();
  }

  function bumpZoom(delta: number) {
    setZoom((z) => Math.max(25, Math.min(200, z + delta)));
  }

  function postInspectStyles(target: InspectSnapshot, styles: Partial<InspectStyleDraft>) {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'od:inspect-apply',
      elementId: target.elementId,
      selector: target.selector,
      styles,
    }, '*');
  }

  function updateInspectStyle(key: InspectStyleKey, value: string) {
    if (!activeInspectTarget) return;
    const next = { ...inspectDraft, [key]: value };
    setInspectDraft(next);
    postInspectStyles(activeInspectTarget, { [key]: value });
  }

  function applyInspectVariant(kind: string) {
    if (!activeInspectTarget) return;
    const styles = inspectVariantStyles(kind, inspectDraft);
    const next = { ...inspectDraft, ...styles };
    setInspectDraft(next);
    postInspectStyles(activeInspectTarget, styles);
  }

  function stageInspectStyles() {
    if (!activeInspectTarget) return;
    const changed = changedInspectStyles(inspectDraft, inspectBaseline);
    if (Object.keys(changed).length === 0) return;
    if (onSavePreviewComment) {
      void targetFromSnapshotForAgent(activeInspectTarget).then((target) =>
        onSavePreviewComment(target, `Apply these style changes: ${renderInspectToken(activeInspectTarget, changed)}`, true),
      );
      return;
    }
    onStageComposerToken?.(renderInspectToken(activeInspectTarget, changed));
  }

  function stageEditTarget() {
    if (!activeInspectTarget) return;
    if (onSavePreviewComment) {
      void targetFromSnapshotForAgent(activeInspectTarget).then((target) =>
        onSavePreviewComment(target, editInstruction.trim() || 'Edit this rendered element as requested.', true),
      );
      return;
    }
    onStageComposerToken?.(renderEditToken(activeInspectTarget, editInstruction));
  }

  function stageActiveTarget() {
    if (!activeInspectTarget || !onStageComposerToken) return;
    if (inspectMode) {
      stageInspectStyles();
      return;
    }
    if (editMode) {
      stageEditTarget();
      return;
    }
    if (drawMode) {
      if (onSavePreviewComment) {
        void targetFromSnapshotForAgent(activeInspectTarget).then((target) =>
          onSavePreviewComment(target, drawInstruction.trim() || 'Review this drawn region.', true),
        );
        return;
      }
      onStageComposerToken?.(`${renderDrawToken(activeInspectTarget)} | note=${drawInstruction.trim() || 'Review this drawn region.'}`);
    }
  }

  function visibleSlideComments(): PreviewComment[] {
    return previewComments.filter((comment) => Boolean(liveSnapshotForComment(comment, liveCommentTargets)));
  }

  function stageVisibleSlideComments() {
    const comments = visibleSlideComments();
    if (comments.length === 0) return;
    onAttachPreviewComments?.(comments);
    onStageComposerToken?.('slide:current');
  }

  function sendVisibleSlideComments() {
    const comments = visibleSlideComments();
    if (comments.length === 0) return;
    onSendPreviewComments?.(comments);
  }

  async function saveDrawRegionComment() {
    if (!activeInspectTarget || !onSavePreviewComment || !drawInstruction.trim()) return;
    setApplyingEdit(true);
    setEditApplyError(null);
    try {
      const saved = await onSavePreviewComment(await targetFromSnapshotForAgent(activeInspectTarget), drawInstruction.trim(), true);
      if (saved) {
        setActiveInspectTarget(null);
        setDrawInstruction('');
      }
    } catch (err) {
      setEditApplyError(err instanceof Error ? err.message : 'Unable to save drawn annotation');
    } finally {
      setApplyingEdit(false);
    }
  }

  function activateTargetMode(nextMode: TargetMode) {
    setCommentMode(nextMode === 'comment');
    setInspectMode(nextMode === 'inspect');
    setEditMode(nextMode === 'edit');
    setDrawMode(nextMode === 'draw');
    setManualEditMode(false);
    setActiveCommentTarget(null);
    setHoveredCommentTarget(null);
    setActiveInspectTarget(null);
    setEditApplyError(null);
    setDrawInstruction('');
  }

  async function targetFromSnapshotForAgent(snapshot: InspectSnapshot | PreviewCommentSnapshot): Promise<PreviewCommentTarget> {
    const enriched = { ...snapshot };
    if (snapshot.screenshotDataUrl && !snapshot.screenshotPath) {
      const file = dataUrlToFile(
        snapshot.screenshotDataUrl,
        `.preview-target-${Date.now()}-${safeArtifactSlug(snapshot.elementId)}.png`,
      );
      if (file) {
        const uploaded = await uploadProjectFiles(projectId, [file]);
        const first = uploaded.uploaded[0];
        if (first?.path) enriched.screenshotPath = first.path;
      }
    }
    const located = await locateSnapshotSource(enriched);
    return targetFromSnapshot({ ...enriched, ...located });
  }

  async function locateSnapshotSource(snapshot: PreviewCommentSnapshot): Promise<Partial<PreviewCommentSnapshot>> {
    const candidates = await sourceCandidatesForSnapshot(snapshot);
    const needles = [
      meaningfulNeedle(snapshot.text, 28),
      idNeedle(snapshot.elementId),
      classNeedle((snapshot as InspectSnapshot).className),
      tagNeedle(snapshot.htmlHint),
    ].filter((item): item is string => Boolean(item));
    for (const candidate of candidates) {
      for (const needle of needles) {
        const index = candidate.text.indexOf(needle);
        if (index >= 0) return sourceLocation(candidate.path, candidate.text, index);
      }
    }
    return { sourcePath: snapshot.filePath };
  }

  async function sourceCandidatesForSnapshot(snapshot: PreviewCommentSnapshot): Promise<Array<{ path: string; text: string }>> {
    const out: Array<{ path: string; text: string }> = [];
    const add = async (path: string, text?: string | null) => {
      if (!path || out.some((item) => item.path === path)) return;
      const body = text ?? await fetchProjectFileText(projectId, path).catch(() => null);
      if (body) out.push({ path, text: body });
    };
    await add(file.name, source);
    if (source) {
      const base = baseDirFor(file.name);
      for (const ref of Array.from(source.matchAll(/<(?:script|link)\b[^>]+(?:src|href)=["']([^"']+\.(?:jsx?|tsx?|css|html?))["']/gi))) {
        const path = resolveProjectRef(base, ref[1] ?? '');
        if (path) await add(path);
      }
    }
    if (snapshot.filePath !== file.name) await add(snapshot.filePath);
    return out;
  }

  function sourceLocation(path: string, text: string, index: number): Partial<PreviewCommentSnapshot> {
    const before = text.slice(0, index);
    const line = before.split('\n').length;
    const lineStart = before.lastIndexOf('\n') + 1;
    const column = index - lineStart + 1;
    const lines = text.split('\n');
    const start = Math.max(0, line - 3);
    const end = Math.min(lines.length, line + 2);
    const sourceSnippet = lines
      .slice(start, end)
      .map((body, offset) => `${start + offset + 1}: ${body}`)
      .join('\n')
      .slice(0, 900);
    return { sourcePath: path, sourceLine: line, sourceColumn: column, sourceSnippet };
  }

  function dataUrlToFile(dataUrl: string, name: string): File | null {
    const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
    if (!match) return null;
    const binary = atob(match[2] ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name, { type: match[1] || 'image/png' });
  }

  function meaningfulNeedle(value: string | undefined, min: number): string | null {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length >= min ? text.slice(0, 90) : null;
  }

  function idNeedle(value: string | undefined): string | null {
    const id = String(value || '').trim();
    return id && !id.startsWith('draw-region-') ? id : null;
  }

  function classNeedle(value: string | undefined): string | null {
    const first = String(value || '').trim().split(/\s+/).find(Boolean);
    return first ? `className="${first}` : null;
  }

  function tagNeedle(value: string | undefined): string | null {
    const match = /^<([a-z0-9-]+)/i.exec(String(value || ''));
    return match?.[1] ? `<${match[1]}` : null;
  }

  function safeArtifactSlug(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'target';
  }

  function resolveProjectRef(base: string, ref: string): string | null {
    if (!ref || /^(?:https?:|data:|blob:|#)/i.test(ref)) return null;
    const stack = `${base}${ref}`.split('/');
    const out: string[] = [];
    for (const part of stack) {
      if (!part || part === '.') continue;
      if (part === '..') out.pop();
      else out.push(part);
    }
    return out.join('/');
  }

  function targetForOperation(target: InspectSnapshot): ElementEditOperation['target'] {
    const editTarget: ElementEditOperation['target'] & {
      currentText?: string;
      tagName?: string;
      htmlHint?: string;
    } = { fileName: file.name };
    if (target.selector) editTarget.selector = target.selector;
    if (target.elementId) editTarget.elementId = target.elementId;
    if (target.label) editTarget.label = target.label;
    if (target.text) editTarget.currentText = target.text;
    if (target.tagName) editTarget.tagName = target.tagName;
    if (target.htmlHint) editTarget.htmlHint = target.htmlHint;
    return editTarget;
  }

  async function applyEditOperations(operations: ElementEditOperation[]): Promise<boolean> {
    if (operations.length === 0) return false;
    setApplyingEdit(true);
    setEditApplyError(null);
    try {
      await applyElementEdits(projectId, { operations });
      await onFileEdited?.();
      setReloadKey((n) => n + 1);
      setActiveInspectTarget(null);
      return true;
    } catch (err) {
      setEditApplyError(err instanceof Error ? err.message : 'Edit operation failed');
      return false;
    } finally {
      setApplyingEdit(false);
    }
  }

  async function applyEditOperation(operation: ElementEditOperation): Promise<boolean> {
    return applyEditOperations([operation]);
  }

  function sectionKeyForTarget(target: InspectSnapshot): string {
    const within = /\bwithin\s+(.+)$/.exec(target.label || '');
    return within?.[1]?.trim() || target.elementId;
  }

  function similarKeyForTarget(target: InspectSnapshot): string {
    const tag = (target.tagName || '').toLowerCase();
    const classes = (target.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    if (classes) return `${tag}.${classes}`;
    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'button' || tag === 'a') return 'action';
    return tag || target.elementId;
  }

  function inspectTargetsForScope(scope: InspectApplyScope): InspectSnapshot[] {
    if (!activeInspectTarget) return [];
    if (scope === 'element') return [activeInspectTarget];
    const targets = Array.from(liveCommentTargets.values()) as InspectSnapshot[];
    if (scope === 'section') {
      const sectionKey = sectionKeyForTarget(activeInspectTarget);
      return targets
        .filter((target) => target.elementId === sectionKey || sectionKeyForTarget(target) === sectionKey)
        .slice(0, 80);
    }
    const similarKey = similarKeyForTarget(activeInspectTarget);
    return targets
      .filter((target) => similarKeyForTarget(target) === similarKey)
      .slice(0, 80);
  }

  async function applyInspectStylesToSource() {
    if (!activeInspectTarget) return;
    const styles = changedInspectStyles(inspectDraft, inspectBaseline);
    if (Object.keys(styles).length === 0) return;
    const operations = inspectTargetsForScope(inspectApplyScope).map((target) => ({
      type: 'setStyle' as const,
      target: targetForOperation(target),
      styles,
    }));
    const applied = await applyEditOperations(operations);
    if (applied) setInspectBaseline(inspectDraft);
  }

  async function applyEditTextToSource() {
    if (!activeInspectTarget) return;
    await applyEditOperation({
      type: 'setText',
      target: targetForOperation(activeInspectTarget),
      text: editInstruction,
    });
  }

  async function removeEditTargetFromSource() {
    if (!activeInspectTarget) return;
    await applyEditOperation({
      type: 'removeElement',
      target: targetForOperation(activeInspectTarget),
    });
  }

  const showPresent = effectiveDeck && source !== null;
  const canShare = source !== null;
  const exportTitle = file.name.replace(/\.html?$/i, '') || file.name;
  const canPptx = canShare && Boolean(onExportAsPptx) && !streaming;
  const previewScale = zoom / 100;
  const selectedPreviewViewport =
    PREVIEW_VIEWPORTS.find((item) => item.id === previewViewport) ?? PREVIEW_VIEWPORTS[0]!;
  const fixedPreviewViewport = selectedPreviewViewport.width !== null && selectedPreviewViewport.height !== null
    ? selectedPreviewViewport
    : null;
  const previewFrameStyle: CSSProperties = fixedPreviewViewport
    ? {
        width: `${fixedPreviewViewport.width}px`,
        height: `${fixedPreviewViewport.height}px`,
        transform: `scale(${previewScale})`,
        transformOrigin: '0 0',
      }
    : {
        width: `${100 / previewScale}%`,
        height: `${100 / previewScale}%`,
        transform: `scale(${previewScale})`,
        transformOrigin: '0 0',
      };
  const activeDeployment = deployResult || deployment;
  const activeDeployedUrl = activeDeployment?.url?.trim() || '';
  const activeDeploymentReady = activeDeployment?.status === 'ready';
  const activeDeploymentDelayed = activeDeployment?.status === 'link-delayed';
  const activeDeploymentProtected = activeDeployment?.status === 'protected';
  const activeDeploymentNeedsRetry = activeDeploymentDelayed || activeDeploymentProtected;
  const deployBlockingWarnings = deployPreflight
    ? deploymentPreflightBlockingWarnings(deployPreflight)
    : [];
  const deployWarningCount = deployPreflight?.warnings.length ?? 0;
  const copyDeployLabel = copiedDeployLink
    ? t('fileViewer.copied')
    : t('fileViewer.copyDeployLink');
  const deployActionLabel = activeDeployedUrl
    ? t('fileViewer.redeployToVercel')
    : t('fileViewer.deployToVercel');
  const inspectApplyCount = inspectTargetsForScope(inspectApplyScope).length || 1;
  const passivePreviewControlsVisible = !targetingModeActive;
  const activeTargetMode: TargetMode = commentMode
    ? 'comment'
    : inspectMode
      ? 'inspect'
      : editMode
        ? 'edit'
        : 'draw';
  const activeDockTarget = commentMode ? activeCommentTarget : activeInspectTarget;
  const visibleCommentCount = visibleSlideComments().length;

  return (
    <div className={`viewer html-viewer${focusMode ? ' viewer-focus-mode' : ''}`}>
      {chromeActionsHost ? createPortal(
        <>
          {mode === 'preview' && passivePreviewControlsVisible ? (
            <label className="chrome-zoom-control" title="Preview viewport">
              <Icon name="grid" size={13} />
              <select
                value={previewViewport}
                onChange={(event) => setPreviewViewport(event.target.value as PreviewViewportId)}
                aria-label="Preview viewport"
              >
                {PREVIEW_VIEWPORTS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          {mode === 'preview' && passivePreviewControlsVisible ? (
            <label className="chrome-zoom-control" title="Preview zoom">
              <Icon name="search" size={13} />
              <select
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                aria-label="Preview zoom"
              >
                {[50, 75, 100, 125, 150, 200].map((value) => (
                  <option key={value} value={value}>{value}%</option>
                ))}
              </select>
            </label>
          ) : null}
          {onFocusModeChange ? (
            <button
              type="button"
              className={`chrome-action chrome-action-secondary${focusMode ? ' active' : ''}`}
              onClick={() => onFocusModeChange(!focusMode)}
              title={focusMode ? 'Exit focus' : 'Focus preview'}
              aria-pressed={focusMode}
            >
              <Icon name={focusMode ? 'close' : 'eye'} size={13} />
              <span>{focusMode ? 'Exit Focus' : 'Focus'}</span>
            </button>
          ) : null}
          {showPresent ? (
            <button
              type="button"
              className="chrome-action chrome-action-secondary"
              onClick={presentInThisTab}
              title={t('fileViewer.present')}
            >
              <Icon name="present" size={13} />
              <span>{t('fileViewer.present')}</span>
            </button>
          ) : null}
          {canShare ? (
            <button
              type="button"
              className="chrome-action chrome-action-primary"
              onClick={() => void exportProjectAsPdf({
                projectId,
                filePath: file.name,
                fallbackHtml: source ?? '',
                fallbackTitle: exportTitle,
                deck: effectiveDeck,
              })}
              title={t('fileViewer.shareLabel')}
            >
              <Icon name="share" size={13} />
              <span>{t('fileViewer.shareLabel')}</span>
            </button>
          ) : null}
        </>,
        chromeActionsHost,
      ) : null}
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          {passivePreviewControlsVisible ? (
            <button
              type="button"
              className="icon-only"
              onClick={() => setReloadKey((n) => n + 1)}
              title={t('fileViewer.reload')}
              aria-label={t('fileViewer.reloadAria')}
            >
              <Icon name="reload" size={14} />
            </button>
          ) : null}
          {effectiveDeck && passivePreviewControlsVisible ? (
            <span
              className="deck-nav"
              role="group"
              aria-label={t('fileViewer.slideNavAria')}
            >
              <span className="deck-nav-counter">
                {slideState
                  ? `${slideState.active + 1} / ${slideState.count}`
                  : '— / —'}
              </span>
              {onStageComposerToken ? (
                <button
                  type="button"
                  className="deck-target-btn"
                  onClick={() => onStageComposerToken('slide:current')}
                  title="Target current slide in chat"
                  aria-label="Target current slide in chat"
                >
                  <Icon name="comment" size={12} />
                  <span>Target</span>
                </button>
              ) : null}
            </span>
          ) : null}
          <button
            type="button"
            className={`viewer-toggle${inspectMode ? ' on' : ''}`}
            title={t('fileViewer.tweaks')}
            aria-pressed={inspectMode}
            data-testid="inspect-mode-toggle"
            onClick={() => {
              if (inspectMode) setInspectMode(false);
              else activateTargetMode('inspect');
            }}
          >
            <Icon name="tweaks" size={13} />
            <span>{t('fileViewer.tweaks')}</span>
            <span className="switch" aria-hidden />
          </button>
          <div className="palette-tweaks-anchor">
            <button
              type="button"
              className={`viewer-action${selectedPalette ? ' active' : ''}`}
              data-testid="palette-tweaks-toggle"
              title="Palette tweaks"
              onClick={() => setPaletteTweaksOpen((open) => !open)}
            >
              <Icon name="tweaks" size={13} />
              <span>Palette</span>
              {selectedPalette ? <span className="palette-tweaks-badge" aria-hidden /> : null}
            </button>
            <PaletteTweaks
              open={paletteTweaksOpen}
              selected={selectedPalette}
              onChange={setSelectedPalette}
              onPreview={() => {}}
              onClose={() => setPaletteTweaksOpen(false)}
            />
          </div>
        </div>
        <div className="viewer-toolbar-actions">
          <div className="viewer-tabs">
            <button
              className={`viewer-tab ${mode === 'preview' ? 'active' : ''}`}
              onClick={() => setMode('preview')}
            >
              {t('fileViewer.preview')}
            </button>
            <button
              className={`viewer-tab ${mode === 'source' ? 'active' : ''}`}
              onClick={() => setMode('source')}
            >
              {t('fileViewer.source')}
            </button>
          </div>
          <span className="viewer-divider" aria-hidden />
          <button
            className={`viewer-action${commentMode ? ' active' : ''}`}
            type="button"
            data-testid="comment-mode-toggle"
            title={t('fileViewer.comment')}
            onClick={() => {
              if (commentMode) setCommentMode(false);
              else activateTargetMode('comment');
            }}
          >
            <Icon name="comment" size={13} />
            <span>{t('fileViewer.comment')}</span>
          </button>
          <button
            className={`viewer-action${editMode ? ' active' : ''}`}
            type="button"
            title={t('fileViewer.edit')}
            aria-pressed={editMode}
            data-testid="edit-mode-toggle"
            onClick={() => {
              if (editMode) setEditMode(false);
              else activateTargetMode('edit');
            }}
          >
            <Icon name="edit" size={13} />
            <span>{t('fileViewer.edit')}</span>
          </button>
          <button
            className={`viewer-action${manualEditMode ? ' active' : ''}`}
            type="button"
            title="Manual edit"
            aria-pressed={manualEditMode}
            data-testid="manual-edit-mode-toggle"
            onClick={() => {
              const next = !manualEditMode;
              setManualEditMode(next);
              if (next) {
                setCommentMode(false);
                setInspectMode(false);
                setEditMode(false);
                setDrawMode(false);
                setMode('preview');
              }
            }}
          >
            <Icon name="pencil" size={13} />
            <span>Manual</span>
          </button>
          <button
            className={`viewer-action${drawMode ? ' active' : ''}`}
            type="button"
            title={t('fileViewer.draw')}
            aria-pressed={drawMode}
            data-testid="draw-mode-toggle"
            onClick={() => {
              if (drawMode) setDrawMode(false);
              else activateTargetMode('draw');
            }}
          >
            <Icon name="draw" size={13} />
            <span>{t('fileViewer.draw')}</span>
          </button>
          {passivePreviewControlsVisible ? (
            <>
              <span className="viewer-divider" aria-hidden />
              <button
                type="button"
                className="icon-only"
                onClick={() => bumpZoom(-25)}
                title={t('fileViewer.zoomOut')}
                aria-label={t('fileViewer.zoomOut')}
              >
                <Icon name="minus" size={14} />
              </button>
              <span className="viewer-zoom-readout" aria-label={`Zoom ${zoom}%`}>
                {zoom}%
              </span>
              <button
                type="button"
                className="icon-only"
                onClick={() => bumpZoom(25)}
                title={t('fileViewer.zoomIn')}
                aria-label={t('fileViewer.zoomIn')}
              >
                <Icon name="plus" size={14} />
              </button>
              <select
                className="viewer-viewport-select"
                value={previewViewport}
                onChange={(event) => setPreviewViewport(event.target.value as PreviewViewportId)}
                aria-label="Preview viewport"
                title="Preview viewport"
              >
                {PREVIEW_VIEWPORTS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <span className="viewer-divider" aria-hidden />
            </>
          ) : null}
          {showPresent && passivePreviewControlsVisible ? (
            <div className="present-wrap" ref={presentWrapRef}>
              <button
                className="viewer-action present-trigger"
                aria-haspopup="menu"
                aria-expanded={presentMenuOpen}
                onClick={() => setPresentMenuOpen((v) => !v)}
              >
                <Icon name="present" size={13} />
                <span>{t('fileViewer.present')}</span>
                <Icon name="chevron-down" size={11} />
              </button>
              {presentMenuOpen ? (
                <div ref={presentLayer.contentRef} className="present-menu" role="menu" style={{ zIndex: presentLayer.zIndex }}>
                  <button role="menuitem" onClick={presentInThisTab}>
                    <span className="present-icon"><Icon name="eye" size={13} /></span>{' '}
                    {t('fileViewer.presentInTab')}
                  </button>
                  <button role="menuitem" onClick={presentFullscreen}>
                    <span className="present-icon"><Icon name="play" size={13} /></span>{' '}
                    {t('fileViewer.presentFullscreen')}
                  </button>
                  <button role="menuitem" onClick={presentNewTab}>
                    <span className="present-icon"><Icon name="share" size={13} /></span>{' '}
                    {t('fileViewer.presentNewTab')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {canShare ? (
            <div className="share-menu" ref={shareRef}>
              <button
                className="viewer-action primary"
                aria-haspopup="menu"
                aria-expanded={shareMenuOpen}
                onClick={() => setShareMenuOpen((v) => !v)}
              >
                <span>{t('fileViewer.shareLabel')}</span>
                <Icon name="chevron-down" size={11} />
              </button>
              {shareMenuOpen ? (
                <div ref={htmlShareLayer.contentRef} className="share-menu-popover" role="menu" style={{ zIndex: htmlShareLayer.zIndex }}>
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      void exportProjectAsPdf({
                        projectId,
                        filePath: file.name,
                        fallbackHtml: source ?? '',
                        fallbackTitle: exportTitle,
                        deck: effectiveDeck,
                      });
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="file" size={14} /></span>
                    <span>
                      {effectiveDeck
                        ? t('fileViewer.exportPdfAllSlides')
                        : t('fileViewer.exportPdf')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    disabled={!canPptx}
                    title={
                      onExportAsPptx
                        ? streaming
                          ? t('fileViewer.exportPptxBusy')
                          : t('fileViewer.exportPptxHint')
                        : t('fileViewer.exportPptxNa')
                    }
                    onClick={() => {
                      setShareMenuOpen(false);
                      if (onExportAsPptx) onExportAsPptx(file.name);
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="present" size={14} /></span>
                    <span>{t('fileViewer.exportPptx') + '…'}</span>
                  </button>
                  <div className="share-menu-divider" />
                  <button
                    type="button"
                    className="share-menu-item share-menu-item-strong"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      void exportProjectAsZip({
                        projectId,
                        filePath: file.name,
                        fallbackHtml: source ?? '',
                        fallbackTitle: exportTitle,
                      });
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="check" size={14} /></span>
                    <span>
                      <strong>Finalize design package</strong>
                      <small>Includes DESIGN-HANDOFF.md and DESIGN-MANIFEST.json</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      void exportProjectAsZip({
                        projectId,
                        filePath: file.name,
                        fallbackHtml: source ?? '',
                        fallbackTitle: exportTitle,
                      });
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="download" size={14} /></span>
                    <span>{t('fileViewer.exportZip')}</span>
                  </button>
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      exportAsHtml(source ?? '', exportTitle);
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="file-code" size={14} /></span>
                    <span>{t('fileViewer.exportHtml')}</span>
                  </button>
                  {/* Export as Markdown — pass-through download of the
                      artifact source with a `.md` extension. No conversion
                      runs; the file body is identical to the Source view.
                      Useful for piping the artifact into markdown-aware
                      tooling (LLM context windows, vault apps). See
                      issue #279. */}
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      setShareMenuOpen(false);
                      exportAsMd(source ?? '', exportTitle);
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="file" size={14} /></span>
                    <span>{t('fileViewer.exportMd')}</span>
                  </button>
                  <div className="share-menu-divider" />
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    disabled={savingTemplate}
                    onClick={() => {
                      void handleSaveAsTemplate();
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="copy" size={14} /></span>
                    <span>
                      {savingTemplate
                        ? t('fileViewer.savingTemplate')
                        : templateNote
                          ? templateNote
                          : t('fileViewer.saveAsTemplate')}
                    </span>
                  </button>
                  <div className="share-menu-divider" />
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    onClick={() => {
                      void openDeployModal();
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="upload" size={14} /></span>
                    <span>
                      {deployActionLabel}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="share-menu-item"
                    role="menuitem"
                    disabled={!activeDeployedUrl}
                    onClick={() => {
                      setShareMenuOpen(false);
                      void copyDeployLink(activeDeployedUrl);
                    }}
                  >
                    <span className="share-menu-icon"><Icon name="copy" size={14} /></span>
                    <span>
                      {copyDeployLabel}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div
        className={`viewer-body${targetingModeActive ? ' targeting-active' : ''}`}
        style={previewViewportVars}
        ref={previewBodyRef}
        tabIndex={targetingModeActive ? 0 : undefined}
      >
        {source === null ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : mode === 'preview' ? (
          <div className={manualEditMode ? 'manual-edit-workspace' : 'comment-preview-layer'}>
            {manualEditMode ? (
              <ManualEditPanel
                targets={manualEditTargets}
                selectedTarget={selectedManualEditTarget}
                draft={manualEditDraft}
                history={manualEditHistory}
                error={manualEditError}
                canUndo={manualEditHistory.length > 0}
                canRedo={manualEditUndone.length > 0}
                busy={manualEditSaving}
                onSelectTarget={selectManualEditTarget}
                onDraftChange={setManualEditDraft}
                onApplyPatch={(patch, label) => {
                  void applyManualEdit(patch, label);
                }}
                onError={setManualEditError}
                onCancelDraft={() => {
                  if (selectedManualEditTarget) selectManualEditTarget(selectedManualEditTarget);
                }}
                onUndo={() => {
                  void undoManualEdit();
                }}
                onRedo={() => {
                  void redoManualEdit();
                }}
              />
            ) : null}
            <div className={manualEditMode ? 'manual-edit-canvas' : `comment-frame-clip${fixedPreviewViewport ? ' fixed-viewport' : ''}`}>
              <div
                ref={previewFrameWrapRef}
                className={fixedPreviewViewport ? 'preview-frame-wrap fixed-viewport' : 'preview-frame-wrap fill-viewport'}
                style={previewFrameStyle}
              >
                <iframe
                  ref={iframeRef}
                  data-testid="artifact-preview-frame"
                  title={file.name}
                  sandbox="allow-scripts"
                  srcDoc={srcDoc}
                />
              </div>
            </div>
            {commentMode || inspectMode || editMode || drawMode ? (
              <CommentPreviewOverlays
                comments={commentMode ? previewComments : []}
                liveTargets={liveCommentTargets}
                hoveredTarget={hoveredCommentTarget}
                activeTarget={commentMode ? activeCommentTarget : activeInspectTarget}
                scale={previewScale}
                offset={iframeVisualOffset}
                onOpenComment={(comment, snapshot) => {
                  setActiveCommentTarget(snapshot);
                  setHoveredCommentTarget(snapshot);
                  setCommentDraft(comment.note);
                }}
              />
            ) : null}
            {targetingModeActive ? (
              <TargetingDock
                mode={activeTargetMode}
                target={activeDockTarget}
                targetCount={liveCommentTargets.size}
                visibleCommentCount={visibleCommentCount}
                slideState={effectiveDeck ? slideState : null}
                onMode={activateTargetMode}
                onCloseTarget={() => {
                  setActiveCommentTarget(null);
                  setActiveInspectTarget(null);
                  setHoveredCommentTarget(null);
                }}
                onStageTarget={stageActiveTarget}
                onStageSlideComments={stageVisibleSlideComments}
                onSendSlideComments={sendVisibleSlideComments}
              />
            ) : null}
            {commentMode && activeCommentTarget ? (
              <CommentPopover
                target={activeCommentTarget}
                existing={previewComments.find((comment) => comment.elementId === activeCommentTarget.elementId) ?? null}
                draft={commentDraft}
                onDraft={setCommentDraft}
                onClose={() => setActiveCommentTarget(null)}
                onSave={async (attach) => {
                  if (!commentDraft.trim() || !onSavePreviewComment) return;
                  const saved = await onSavePreviewComment(await targetFromSnapshotForAgent(activeCommentTarget), commentDraft.trim(), attach);
                  if (saved) setActiveCommentTarget(null);
                }}
                onRemove={async (commentId) => {
                  if (!onRemovePreviewComment) return;
                  await onRemovePreviewComment(commentId);
                  setActiveCommentTarget(null);
                }}
                t={t}
              />
            ) : null}
            {inspectMode && activeInspectTarget ? (
              <InspectStylePanel
                target={activeInspectTarget}
                draft={inspectDraft}
                baseline={inspectBaseline}
                onChange={updateInspectStyle}
                onClose={() => setActiveInspectTarget(null)}
                onStage={stageInspectStyles}
                onApply={() => void applyInspectStylesToSource()}
                applyScope={inspectApplyScope}
                onApplyScope={setInspectApplyScope}
                applyCount={inspectApplyCount}
                palette={inspectPalette}
                onVariant={applyInspectVariant}
                applying={applyingEdit}
                error={editApplyError}
              />
            ) : null}
            {editMode && activeInspectTarget ? (
              <EditTargetPanel
                target={activeInspectTarget}
                draft={editInstruction}
                onDraft={setEditInstruction}
                onClose={() => setActiveInspectTarget(null)}
                onStage={stageEditTarget}
                onApplyText={() => void applyEditTextToSource()}
                onRemove={() => void removeEditTargetFromSource()}
                applying={applyingEdit}
                error={editApplyError}
              />
            ) : null}
            {drawMode && activeInspectTarget ? (
              <DrawRegionPanel
                target={activeInspectTarget}
                draft={drawInstruction}
                onDraft={setDrawInstruction}
                onClose={() => setActiveInspectTarget(null)}
                onStage={stageActiveTarget}
                onSaveComment={saveDrawRegionComment}
                saving={applyingEdit}
                error={editApplyError}
              />
            ) : null}
          </div>
        ) : (
          <pre className="viewer-source">{source}</pre>
        )}
      </div>
      {inTabPresent && source ? (
        <div
          className="present-overlay"
          role="dialog"
          aria-label={t('fileViewer.exitPresentation')}
        >
          <button
            className="present-exit"
            onClick={() => setInTabPresent(false)}
            aria-label={t('fileViewer.exitPresentation')}
          >
            <Icon name="close" size={13} /> {t('fileViewer.exitPresentation')}
          </button>
          <iframe title="present" sandbox="allow-scripts" srcDoc={srcDoc} />
        </div>
      ) : null}
      {deployModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal deploy-modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <div className="kicker">CLOUD RUN</div>
              <h2>{t('fileViewer.deployModalTitle')}</h2>
              <p className="subtitle">{t('fileViewer.deployModalSubtitle')}</p>
            </div>
            <div className="deploy-form">
              <label htmlFor="cloud-run-project">{t('fileViewer.vercelToken')}</label>
              <input
                id="cloud-run-project"
                value={cloudRunProjectId}
                placeholder={t('fileViewer.vercelTokenPlaceholder')}
                onChange={(e) => setCloudRunProjectId(e.target.value)}
              />
              <div className="deploy-field-grid">
                <label htmlFor="cloud-run-region">
                  <span>{t('fileViewer.vercelTeamId')}</span>
                  <input
                    id="cloud-run-region"
                    value={cloudRunRegion}
                    placeholder="us-central1"
                    onChange={(e) => setCloudRunRegion(e.target.value)}
                  />
                </label>
                <label htmlFor="cloud-run-service">
                  <span>{t('fileViewer.vercelTeamSlug')}</span>
                  <input
                    id="cloud-run-service"
                    value={cloudRunServiceName}
                    placeholder="pixelpitch-preview"
                    onChange={(e) => setCloudRunServiceName(e.target.value)}
                  />
                </label>
              </div>
              <label className="deploy-public-toggle">
                <input
                  type="checkbox"
                  checked={cloudRunPublic}
                  onChange={(e) => setCloudRunPublic(e.target.checked)}
                />
                <span>{t('fileViewer.vercelTokenGetLink')}</span>
              </label>
              <div className="deploy-config-actions">
                <button
                  type="button"
                  className="ghost-link button-like"
                  disabled={savingDeployConfig}
                  onClick={() => {
                    void saveDeployConfig();
                  }}
                >
                  {savingDeployConfig ? t('fileViewer.savingConfig') : t('fileViewer.save')}
                </button>
              </div>
              {deployConfig?.configured ? (
                <p className="hint">{t('fileViewer.vercelTokenReuseHint')}</p>
              ) : null}
              <p className="hint">{t('fileViewer.vercelPreviewOnly')}</p>
              <div
                className={`deploy-preflight ${
                  deployBlockingWarnings.length > 0
                    ? 'blocked'
                    : deployWarningCount > 0
                      ? 'warn'
                      : 'ready'
                }`}
              >
                <div className="deploy-preflight-head">
                  <div>
                    <strong>Deploy preflight</strong>
                    <span>
                      {checkingDeployPreflight
                        ? 'Checking deploy bundle...'
                        : deployPreflight
                          ? `${deployPreflight.totalFiles} files · ${formatDeployBytes(deployPreflight.totalBytes)}`
                          : 'Not checked yet'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="ghost-link button-like"
                    disabled={checkingDeployPreflight || deploying}
                    onClick={() => {
                      void refreshDeployPreflight();
                    }}
                  >
                    {checkingDeployPreflight ? 'Checking...' : 'Refresh'}
                  </button>
                </div>
                {deployPreflight ? (
                  <>
                    {deployPreflight.warnings.length > 0 ? (
                      <ul className="deploy-preflight-warnings">
                        {deployPreflight.warnings.slice(0, 4).map((warning, index) => (
                          <li key={`${warning.code}-${warning.path ?? warning.url ?? index}`}>
                            <span>{deployWarningLabel(warning.code)}</span>
                            <p>{warning.message}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="deploy-preflight-ok">No blocking issues found in this artifact bundle.</p>
                    )}
                    {deployPreflight.warnings.length > 4 ? (
                      <p className="deploy-preflight-more">
                        +{deployPreflight.warnings.length - 4} more warning
                        {deployPreflight.warnings.length - 4 === 1 ? '' : 's'}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </div>
              {deployError ? <p className="deploy-error">{deployError}</p> : null}
              {activeDeployedUrl ? (
                <div
                  className={`deploy-result ${
                    activeDeploymentProtected ? 'protected' : activeDeploymentDelayed ? 'delayed' : 'ready'
                  }`}
                >
                  <div className="deploy-result-label">
                    {activeDeploymentProtected
                      ? t('fileViewer.deployLinkProtectedLabel')
                      : activeDeploymentDelayed
                      ? t('fileViewer.deployLinkPreparingLabel')
                      : t('fileViewer.deployResultLabel')}
                  </div>
                  {activeDeploymentNeedsRetry ? (
                    <p className="deploy-result-message">
                      {activeDeploymentProtected
                        ? t('fileViewer.deployLinkProtected')
                        : t('fileViewer.deployLinkDelayed')}
                    </p>
                  ) : null}
                  <a href={activeDeployedUrl} target="_blank" rel="noreferrer noopener">
                    {activeDeployedUrl}
                  </a>
                  <div className="deploy-result-actions">
                    {activeDeploymentNeedsRetry ? (
                      <button
                        type="button"
                        className="viewer-action"
                        disabled={deployPhase === 'preparing-link'}
                        onClick={() => {
                          void retryDeploymentLink();
                        }}
                      >
                        {deployPhase === 'preparing-link'
                          ? t('fileViewer.preparingPublicLink')
                          : t('fileViewer.retryLink')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="viewer-action"
                      onClick={() => {
                        void copyDeployLink(activeDeployedUrl);
                      }}
                    >
                      <Icon name="copy" size={14} />
                      <span>{copyDeployLabel}</span>
                    </button>
                    <a
                      className={`ghost-link ${activeDeploymentReady ? '' : 'disabled'}`}
                      href={activeDeploymentReady ? activeDeployedUrl : undefined}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-disabled={!activeDeploymentReady}
                    >
                      <Icon name="upload" size={14} />
                      {t('fileViewer.open')}
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-foot">
              <button
                type="button"
                className="ghost-link button-like"
                onClick={() => setDeployModalOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="viewer-action primary"
                disabled={
                  deploying ||
                  savingDeployConfig ||
                  checkingDeployPreflight ||
                  deployPhase !== 'idle' ||
                  deployBlockingWarnings.length > 0
                }
                onClick={() => {
                  void deployToCloudRun();
                }}
              >
                {deployPhase === 'deploying'
                  ? t('fileViewer.deployingToVercel')
                  : deployPhase === 'preparing-link'
                    ? t('fileViewer.preparingPublicLink')
                    : deployActionLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function baseDirFor(fileName: string): string {
  const idx = fileName.lastIndexOf('/');
  return idx >= 0 ? fileName.slice(0, idx + 1) : '';
}

function hasRelativeAssetRefs(html: string): boolean {
  const attr = /\s(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = attr.exec(html)) !== null) {
    const value = match[1]?.trim();
    if (!value) continue;
    if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/i.test(value)) continue;
    return true;
  }
  return false;
}

async function inlineRelativeAssets(
  html: string,
  projectId: string,
  fileName: string,
): Promise<string> {
  const replacements: Array<Promise<{ from: string; to: string } | null>> = [];
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    const rel = readHtmlAttr(tag, 'rel');
    const href = readHtmlAttr(tag, 'href');
    if (!rel || !/\bstylesheet\b/i.test(rel) || !href) continue;
    replacements.push(
      fetchProjectRelativeText(projectId, fileName, href).then((css) =>
        css == null
          ? null
          : {
              from: tag,
              to:
                `<style data-od-inline-asset="${escapeHtmlAttr(href)}">\n` +
                `${css.replace(/<\/style/gi, '<\\/style')}\n</style>`,
            },
      ),
    );
  }

  const scripts = html.match(/<script\b[^>]*\bsrc\s*=\s*["'][^"']+["'][^>]*>\s*<\/script>/gi) ?? [];
  for (const tag of scripts) {
    const src = readHtmlAttr(tag, 'src');
    if (!src) continue;
    replacements.push(
      fetchProjectRelativeText(projectId, fileName, src).then((js) => {
        if (js == null) return null;
        const open = tag.match(/^<script\b[^>]*>/i)?.[0] ?? '<script>';
        const attrs = open
          .replace(/^<script/i, '')
          .replace(/>$/i, '')
          .replace(/\ssrc\s*=\s*(['"])[\s\S]*?\1/i, '');
        return {
          from: tag,
          to: `<script${attrs}>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`,
        };
      }),
    );
  }

  const resolved = (await Promise.all(replacements)).filter(
    (item): item is { from: string; to: string } => item !== null,
  );
  return resolved.reduce((next, { from, to }) => next.replace(from, () => to), html);
}

async function fetchProjectRelativeText(
  projectId: string,
  ownerFileName: string,
  assetRef: string,
): Promise<string | null> {
  const filePath = resolveProjectRelativePath(ownerFileName, assetRef);
  if (!filePath) return null;
  try {
    const resp = await fetch(projectRawUrl(projectId, filePath));
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

function resolveProjectRelativePath(ownerFileName: string, assetRef: string): string | null {
  if (/^(?:https?:|data:|blob:|mailto:|tel:|#|\/)/i.test(assetRef)) return null;
  try {
    const url = new URL(assetRef, `https://od.local/${baseDirFor(ownerFileName)}`);
    if (url.origin !== 'https://od.local') return null;
    return decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

function readHtmlAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(['"])([\\s\\S]*?)\\1`, 'i'));
  return match?.[2] ?? null;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function ImageViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const url = `${projectFileUrl(projectId, file.name)}?v=${Math.round(file.mtime)}`;
  return (
    <div className="viewer image-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {file.kind === 'sketch'
              ? t('fileViewer.sketchMeta', { size: humanSize(file.size) })
              : t('fileViewer.imageMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <div className="viewer-toolbar-actions">
          <a
            className="ghost-link"
            href={projectFileUrl(projectId, file.name)}
            download={file.name}
          >
            {t('fileViewer.download')}
          </a>
          <a
            className="ghost-link"
            href={projectFileUrl(projectId, file.name)}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('fileViewer.open')}
          </a>
        </div>
      </div>
      <div className="viewer-body image-body">
        <img alt={file.name} src={url} />
      </div>
    </div>
  );
}

function VideoViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const url = `${projectFileUrl(projectId, file.name)}?v=${Math.round(file.mtime)}`;
  return (
    <div className="viewer video-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {t('fileViewer.videoMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <FileActions projectId={projectId} file={file} />
      </div>
      <div className="viewer-body video-body">
        <video src={url} controls playsInline preload="metadata" />
      </div>
    </div>
  );
}

function AudioViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const url = `${projectFileUrl(projectId, file.name)}?v=${Math.round(file.mtime)}`;
  return (
    <div className="viewer audio-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {t('fileViewer.audioMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <FileActions projectId={projectId} file={file} />
      </div>
      <div className="viewer-body audio-body">
        <div className="audio-card">
          <Icon name="mic" size={28} />
          <div className="audio-card-name">{file.name}</div>
          <audio src={url} controls preload="metadata" />
        </div>
      </div>
    </div>
  );
}

type SvgViewerMode = 'preview' | 'source';

interface SvgViewerProps {
  projectId: string;
  file: ProjectFile;
  initialMode?: SvgViewerMode;
  initialSource?: string | null | undefined;
}

export function SvgViewer({
  projectId,
  file,
  initialMode = 'preview',
  initialSource,
}: SvgViewerProps) {
  const t = useT();
  const [mode, setMode] = useState<SvgViewerMode>(initialMode);
  const [source, setSource] = useState<string | null>(initialSource ?? null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const url = `${projectFileUrl(projectId, file.name)}?v=${Math.round(file.mtime)}&r=${reloadKey}`;

  useEffect(() => {
    if (mode !== 'source') return;
    if (initialSource !== undefined && reloadKey === 0) return;
    let cancelled = false;
    setLoadingSource(true);
    setSourceError(false);
    void fetchProjectFileText(projectId, file.name, {
      cache: 'no-store',
      cacheBustKey: `${Math.round(file.mtime)}-${reloadKey}`,
    }).then((next) => {
      if (cancelled) return;
      if (next === null) {
        setSource('');
        setSourceError(true);
      } else {
        setSource(next);
      }
      setLoadingSource(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime, initialSource, mode, reloadKey]);

  return (
    <div className="viewer svg-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <span className="viewer-meta">
            {t('fileViewer.imageMeta', { size: humanSize(file.size) })}
          </span>
        </div>
        <div className="viewer-toolbar-actions">
          <div className="viewer-tabs">
            <button
              type="button"
              className={`viewer-tab ${mode === 'preview' ? 'active' : ''}`}
              aria-pressed={mode === 'preview'}
              onClick={() => setMode('preview')}
            >
              {t('fileViewer.preview')}
            </button>
            <button
              type="button"
              className={`viewer-tab ${mode === 'source' ? 'active' : ''}`}
              aria-pressed={mode === 'source'}
              onClick={() => setMode('source')}
            >
              {t('fileViewer.source')}
            </button>
          </div>
          <span className="viewer-divider" aria-hidden />
          <button
            type="button"
            className="viewer-action"
            onClick={() => setReloadKey((n) => n + 1)}
            title={t('fileViewer.reloadDisk')}
          >
            <Icon name="reload" size={13} />
            <span>{t('fileViewer.reload')}</span>
          </button>
          <a
            className="ghost-link"
            href={projectFileUrl(projectId, file.name)}
            download={file.name}
          >
            {t('fileViewer.download')}
          </a>
          <a
            className="ghost-link"
            href={projectFileUrl(projectId, file.name)}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t('fileViewer.open')}
          </a>
        </div>
      </div>
      <div className={`viewer-body ${mode === 'preview' ? 'image-body' : ''}`}>
        {mode === 'preview' ? (
          <img alt={file.name} src={url} />
        ) : loadingSource ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : sourceError ? (
          <div className="viewer-empty">{t('fileViewer.previewUnavailable')}</div>
        ) : (
          <pre className="viewer-source">{source ?? ''}</pre>
        )}
      </div>
    </div>
  );
}

function TextViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const [text, setText] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setText(null);
    let cancelled = false;
    void fetchProjectFileText(projectId, file.name).then((t) => {
      if (!cancelled) setText(t ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime, reloadKey]);

  async function copy() {
    if (text == null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // best-effort fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const lineCount = text ? text.split('\n').length : 0;

  return (
    <div className="viewer text-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left" />
        <div className="viewer-toolbar-actions">
          <button
            type="button"
            className="viewer-action"
            onClick={() => setReloadKey((n) => n + 1)}
            title={t('fileViewer.reloadDisk')}
          >
            <Icon name="reload" size={13} />
            <span>{t('fileViewer.reload')}</span>
          </button>
          <button
            type="button"
            className="viewer-action"
            disabled
            title={t('fileViewer.saveDisabled')}
          >
            <Icon name="check" size={13} />
            <span>{t('fileViewer.save')}</span>
          </button>
          <button
            type="button"
            className="viewer-action"
            onClick={() => void copy()}
            title={t('fileViewer.copyTitle')}
          >
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            <span>{copied ? t('fileViewer.copied') : t('fileViewer.copy')}</span>
          </button>
        </div>
      </div>
      <div className="viewer-body">
        {text === null ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : lineCount > 0 ? (
          <CodeWithLines text={text} />
        ) : (
          <pre className="viewer-source">{text}</pre>
        )}
      </div>
    </div>
  );
}

function MarkdownViewer({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  const t = useT();
  const [text, setText] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const status = file.artifactManifest?.status ?? 'complete';
  const isStreaming = status === 'streaming';
  const isError = status === 'error';

  useEffect(() => {
    setText(null);
    let cancelled = false;
    void fetchProjectFileText(projectId, file.name).then((next) => {
      if (!cancelled) setText(next ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, file.name, file.mtime, reloadKey]);

  async function copy() {
    if (text == null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  const html = useMemo(() => {
    if (text === null) return null;
    const renderPartial = MarkdownRenderer.renderPartial ?? renderMarkdownToSafeHtml;
    return renderPartial(text);
  }, [text]);

  return (
    <div className="viewer text-viewer">
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          {isStreaming ? <span className="viewer-meta">{t('fileViewer.markdownStreamingMeta')}</span> : null}
          {isError ? <span className="viewer-meta">{t('fileViewer.markdownErrorMeta')}</span> : null}
        </div>
        <div className="viewer-toolbar-actions">
          <button
            type="button"
            className="viewer-action"
            onClick={() => setReloadKey((n) => n + 1)}
            title={t('fileViewer.reloadDisk')}
          >
            <Icon name="reload" size={13} />
            <span>{t('fileViewer.reload')}</span>
          </button>
          <button
            type="button"
            className="viewer-action"
            onClick={() => void copy()}
            title={t('fileViewer.copyTitle')}
          >
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            <span>{copied ? t('fileViewer.copied') : t('fileViewer.copy')}</span>
          </button>
        </div>
      </div>
      <div className="viewer-body">
        {html === null ? (
          <div className="viewer-empty">{t('fileViewer.loading')}</div>
        ) : (
          <>
            {isStreaming ? <div className="markdown-status">{t('fileViewer.markdownStreamingStatus')}</div> : null}
            {isError ? <div className="markdown-status markdown-status-error">{t('fileViewer.markdownErrorStatus')}</div> : null}
            {/* Safe by contract: renderMarkdownToSafeHtml escapes raw HTML and rejects unsafe link protocols. */}
            <article
              className="markdown-rendered"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function CodeWithLines({ text }: { text: string }) {
  const lines = text.split('\n');
  // Trailing newline produces a phantom empty line — keep gutter aligned.
  const gutter = lines.map((_, i) => `${i + 1}`).join('\n');
  return (
    <pre className="code-viewer">
      <code className="gutter" aria-hidden>
        {gutter}
      </code>
      <code className="lines">{text}</code>
    </pre>
  );
}

function deploymentPreflightBlockingWarnings(preflight: DeployPreflightResponse) {
  return preflight.warnings.filter(
    (warning) => warning.code === 'broken-reference' || warning.code === 'invalid-reference',
  );
}

function formatDeployBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function deployWarningLabel(code: DeployPreflightResponse['warnings'][number]['code']): string {
  switch (code) {
    case 'broken-reference':
      return 'Broken reference';
    case 'invalid-reference':
      return 'Invalid path';
    case 'large-asset':
      return 'Large asset';
    case 'large-bundle':
      return 'Large bundle';
    case 'large-html':
      return 'Large HTML';
    case 'external-script':
      return 'External script';
    case 'external-stylesheet':
      return 'External stylesheet';
    case 'no-doctype':
      return 'Missing doctype';
    case 'no-viewport':
      return 'Missing viewport';
    default:
      return 'Warning';
  }
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function documentMetaLabel(file: ProjectFile, t: TranslateFn): string {
  if (file.kind === 'pdf') return t('fileViewer.pdfMeta');
  if (file.kind === 'document') return t('fileViewer.documentMeta');
  if (file.kind === 'presentation') return t('fileViewer.presentationMeta');
  if (file.kind === 'spreadsheet') return t('fileViewer.spreadsheetMeta');
  return t('fileViewer.binaryMeta', { size: humanSize(file.size) });
}
