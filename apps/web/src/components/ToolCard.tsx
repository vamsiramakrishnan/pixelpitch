/**
 * Renders a single tool_use (optionally paired with its tool_result) as an
 * inline card in the assistant message stream. Lookup order:
 *
 *   1. user-registered renderer in `tool-renderers` (the extension point
 *      analogous to CopilotKit's `useCopilotAction({ render })`)
 *   2. hardcoded family card for tools we ship with (TodoWrite / Write /
 *      Edit / Read / Bash / Glob / Grep / WebFetch / WebSearch)
 *   3. generic command/output fallback
 */
import { useState } from 'react';
import { Icon } from './Icon';
import { useT } from '../i18n';
import { parseTodoWriteInput } from '../runtime/todos';
import { getToolRenderer, toRenderProps } from '../runtime/tool-renderers';
import type { AgentEvent } from '../types';

interface Props {
  use: Extract<AgentEvent, { kind: 'tool_use' }>;
  result?: Extract<AgentEvent, { kind: 'tool_result' }> | undefined;
  // True while the parent run is still streaming. Forwarded to registered
  // renderers via `status` so they can distinguish "executing" (run alive)
  // from "inProgress" (run dead before result arrived).
  runStreaming?: boolean;
  // Set of file names that exist in the project folder. When the tool's
  // `file_path`/`path` argument's basename appears in this set we surface
  // an "open" button on the card. Pass `undefined` to skip the existence
  // check (the button is then always shown for file-shaped tools).
  projectFileNames?: Set<string>;
  // Lifts a basename up to ProjectView so it can focus the matching tab
  // in FileWorkspace.
  onRequestOpenFile?: (name: string) => void;
}

export function ToolCard({
  use,
  result,
  runStreaming,
  projectFileNames,
  onRequestOpenFile,
}: Props) {
  const name = use.name;
  const custom = getToolRenderer(name);
  if (custom) {
    // A misbehaving third-party renderer must not take down the whole
    // assistant message — catch synchronous throws and fall through to the
    // built-in family card. (React's own error boundaries still cover
    // throws raised inside the returned tree once it's mounted.)
    try {
      const node = custom(toRenderProps(use, result, runStreaming ?? false));
      if (node !== undefined && node !== null && node !== false) return <>{node}</>;
    } catch (err) {
      console.error(`[ToolCard] custom renderer for "${name}" threw; falling back`, err);
    }
  }
  const ctx: FileToolCtx = { projectFileNames, onRequestOpenFile };
  if (name === 'TodoWrite') return <TodoCard input={use.input} />;
  if (name === 'Write' || name === 'create_file')
    return <FileWriteCard input={use.input} result={result} ctx={ctx} />;
  if (name === 'Edit' || name === 'str_replace_edit')
    return <FileEditCard input={use.input} result={result} ctx={ctx} />;
  if (name === 'Read' || name === 'read_file')
    return <FileReadCard input={use.input} result={result} ctx={ctx} />;
  if (name === 'Bash') return <BashCard input={use.input} result={result} />;
  if (name === 'Glob' || name === 'list_files') return <GlobCard input={use.input} result={result} />;
  if (name === 'Grep') return <GrepCard input={use.input} result={result} />;
  if (name === 'WebFetch' || name === 'web_fetch') return <WebFetchCard input={use.input} result={result} />;
  if (name === 'WebSearch' || name === 'web_search') return <WebSearchCard input={use.input} result={result} />;
  return <GenericCard name={name} input={use.input} result={result} />;
}

interface FileToolCtx {
  projectFileNames?: Set<string> | undefined;
  onRequestOpenFile?: ((name: string) => void) | undefined;
}

function OpenInTabButton({ filePath, ctx }: { filePath: string; ctx: FileToolCtx }) {
  const t = useT();
  if (!ctx.onRequestOpenFile) return null;
  if (!filePath || filePath === '(unnamed)') return null;
  // The agent uses absolute paths; the project-file API keys on basename.
  const baseName = filePath.split('/').pop() ?? filePath;
  if (!baseName) return null;
  if (ctx.projectFileNames && !ctx.projectFileNames.has(baseName)) return null;
  const open = ctx.onRequestOpenFile;
  return (
    <button
      type="button"
      className="op-open"
      onClick={() => open(baseName)}
      title={t('tool.openInTab', { name: baseName })}
    >
      {t('tool.open')}
    </button>
  );
}

function TodoCard({ input }: { input: unknown }) {
  const t = useT();
  const todos = parseTodoWriteInput(input);
  if (todos.length === 0) return <GenericCard name="TodoWrite" input={input} />;
  const done = todos.filter((todo) => todo.status === 'completed').length;
  return (
    <div className="op-card op-todo">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>☐</span>
        <span className="op-title">{t('tool.todos')}</span>
        <span className="op-meta">
          {done}/{todos.length}
        </span>
      </div>
      <ul className="todo-list">
        {todos.map((todo, i) => (
          <li key={i} className={`todo-item todo-${todo.status}`}>
            <span className="todo-check" aria-hidden>
              {todo.status === 'completed' ? '✓' : todo.status === 'in_progress' ? '◐' : '○'}
            </span>
            <span className="todo-text">
              {todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileWriteCard({
  input,
  result,
  ctx,
}: {
  input: unknown;
  result?: Props['result'];
  ctx: FileToolCtx;
}) {
  const t = useT();
  const obj = (input ?? {}) as { file_path?: string; path?: string; content?: string };
  const file = obj.file_path ?? obj.path ?? '(unnamed)';
  const lines = typeof obj.content === 'string' ? obj.content.split('\n').length : null;
  return (
    <div className="op-card op-file">
      <div className="op-card-head">
        <span className="op-icon op-icon-write" aria-hidden>+</span>
        <span className="op-title">{t('tool.write')}</span>
        <code className="op-path">{file}</code>
        {lines !== null ? (
          <span className="op-meta">{t('tool.lines', { n: lines })}</span>
        ) : null}
        <ResultBadge result={result} />
        <OpenInTabButton filePath={file} ctx={ctx} />
      </div>
    </div>
  );
}

function FileEditCard({
  input,
  result,
  ctx,
}: {
  input: unknown;
  result?: Props['result'];
  ctx: FileToolCtx;
}) {
  const t = useT();
  const obj = (input ?? {}) as {
    file_path?: string;
    path?: string;
    old_string?: string;
    new_string?: string;
    edits?: { old_string?: string; new_string?: string }[];
  };
  const file = obj.file_path ?? obj.path ?? '(unnamed)';
  const editCount = Array.isArray(obj.edits) ? obj.edits.length : 1;
  const preview = editPreview(obj);
  return (
    <div className="op-card op-file">
      <div className="op-card-head">
        <span className="op-icon op-icon-edit" aria-hidden>✎</span>
        <span className="op-title">{t('tool.edit')}</span>
        <code className="op-path">{file}</code>
        <span className="op-meta">
          {editCount} {editCount === 1 ? t('tool.changeSingular') : t('tool.changePlural')}
        </span>
        <ResultBadge result={result} />
        <OpenInTabButton filePath={file} ctx={ctx} />
      </div>
      {preview ? (
        <div className="op-diff-preview" aria-label="Edit preview">
          <div className="op-diff-line removed">
            <span aria-hidden>-</span>
            <code>{preview.before}</code>
          </div>
          <div className="op-diff-line added">
            <span aria-hidden>+</span>
            <code>{preview.after}</code>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FileReadCard({
  input,
  result,
  ctx,
}: {
  input: unknown;
  result?: Props['result'];
  ctx: FileToolCtx;
}) {
  const t = useT();
  const obj = (input ?? {}) as { file_path?: string; path?: string; limit?: number; offset?: number };
  const file = obj.file_path ?? obj.path ?? '(unnamed)';
  const lineCount = result?.content ? result.content.split('\n').filter(Boolean).length : null;
  return (
    <div className="op-card op-file">
      <div className="op-card-head">
        <span className="op-icon op-icon-read" aria-hidden>↗</span>
        <span className="op-title">{t('tool.read')}</span>
        <code className="op-path">{file}</code>
        {typeof obj.offset === 'number' || typeof obj.limit === 'number' ? (
          <span className="op-meta">
            {typeof obj.offset === 'number' ? `from ${obj.offset}` : ''}
            {typeof obj.offset === 'number' && typeof obj.limit === 'number' ? ' / ' : ''}
            {typeof obj.limit === 'number' ? `${obj.limit} lines` : ''}
          </span>
        ) : lineCount !== null ? (
          <span className="op-meta">{lineCount} lines</span>
        ) : null}
        <ResultBadge result={result} />
        <OpenInTabButton filePath={file} ctx={ctx} />
      </div>
    </div>
  );
}

function BashCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { command?: string; description?: string };
  const command = obj.command ?? '';
  const desc = obj.description;
  const [open, setOpen] = useState(false);
  const output = result?.content ?? '';
  const summary = summarizeOutput(output);
  return (
    <div className="op-card op-bash">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>$</span>
        <span className="op-title">{t('tool.bash')}</span>
        {desc ? <span className="op-meta op-desc">{desc}</span> : null}
        <ResultBadge result={result} />
        {result && result.content ? (
          <button className="op-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? t('tool.hide') : t('tool.output')}
          </button>
        ) : null}
      </div>
      <pre className="op-command">{truncate(command, 400)}</pre>
      {summary && !open ? (
        <div className="op-output-summary">
          <span>{summary.lineCount} lines</span>
          {summary.hasWarnings ? <span className="warn">warnings</span> : null}
          {summary.hasErrors || result?.isError ? <span className="error">errors</span> : null}
          <code>{summary.preview}</code>
        </div>
      ) : null}
      {open && result ? (
        <pre className="op-output">{truncate(result.content, 4000)}</pre>
      ) : null}
    </div>
  );
}

function GlobCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { pattern?: string; path?: string };
  const matches = result?.content ? result.content.split('\n').filter(Boolean) : [];
  return (
    <div className="op-card op-search">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>⌕</span>
        <span className="op-title">{t('tool.glob')}</span>
        <code className="op-path">{obj.pattern ?? '*'}</code>
        {obj.path ? (
          <span className="op-meta">{t('tool.in', { path: obj.path })}</span>
        ) : null}
        <ResultBadge result={result} />
      </div>
      {matches.length > 0 ? <ResultList lines={matches} /> : null}
    </div>
  );
}

function GrepCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { pattern?: string; path?: string; glob?: string };
  const matches = result?.content ? result.content.split('\n').filter(Boolean) : [];
  return (
    <div className="op-card op-search">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>⌕</span>
        <span className="op-title">{t('tool.grep')}</span>
        <code className="op-path">{obj.pattern ?? ''}</code>
        {obj.path ? (
          <span className="op-meta">{t('tool.in', { path: obj.path })}</span>
        ) : null}
        <ResultBadge result={result} />
      </div>
      {matches.length > 0 ? <ResultList lines={matches} /> : null}
    </div>
  );
}

function WebFetchCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { url?: string };
  const summary = result?.content ? summarizeOutput(result.content) : null;
  return (
    <div className="op-card op-web">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>↬</span>
        <span className="op-title">{t('tool.fetch')}</span>
        <code className="op-path">{obj.url ?? ''}</code>
        <ResultBadge result={result} />
      </div>
      {summary ? (
        <div className="op-output-summary">
          <span>{summary.lineCount} lines</span>
          <code>{summary.preview}</code>
        </div>
      ) : null}
    </div>
  );
}

function WebSearchCard({ input, result }: { input: unknown; result?: Props['result'] }) {
  const t = useT();
  const obj = (input ?? {}) as { query?: string };
  const lines = result?.content ? result.content.split('\n').filter(Boolean) : [];
  return (
    <div className="op-card op-web">
      <div className="op-card-head">
        <span className="op-icon" aria-hidden>⌕</span>
        <span className="op-title">{t('tool.search')}</span>
        <code className="op-path">{obj.query ?? ''}</code>
        <ResultBadge result={result} />
      </div>
      {lines.length > 0 ? <ResultList lines={lines} /> : null}
    </div>
  );
}

type ToolIconName = 'search' | 'file' | 'edit' | 'file-code' | '';

function toolIcon(family: string): ToolIconName {
  switch (family) {
    case 'list_files':
    case 'search':
    case 'grep':
      return 'search';
    case 'read':
    case 'read_file':
      return 'file';
    case 'write':
    case 'write_file':
    case 'edit':
      return 'edit';
    case 'bash':
    case 'shell':
    case 'execute':
      return 'file-code';
    default:
      return '';
  }
}

function GenericCard({
  name,
  input,
  result,
}: {
  name: string;
  input: unknown;
  result?: Props['result'];
}) {
  const summary = describeInput(input);
  const iconName = toolIcon(name);
  const [open, setOpen] = useState(false);
  const resultSummary = result?.content ? summarizeOutput(result.content) : null;
  return (
    <div className="op-card op-generic">
      <div className="op-card-head">
        {iconName ? <Icon name={iconName} size={12} /> : <span className="op-icon" aria-hidden>·</span>}
        <span className="op-title">{name}</span>
        {summary ? <span className="op-meta">{truncate(summary, 200)}</span> : null}
        <ResultBadge result={result} />
        {result?.content ? (
          <button className="op-toggle" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide details' : 'Details'}
          </button>
        ) : null}
      </div>
      {resultSummary && !open ? (
        <div className="op-output-summary">
          <span>{resultSummary.lineCount} lines</span>
          {resultSummary.hasWarnings ? <span className="warn">warnings</span> : null}
          {resultSummary.hasErrors || result?.isError ? <span className="error">errors</span> : null}
          <code>{resultSummary.preview}</code>
        </div>
      ) : null}
      {open && result?.content ? (
        <pre className="op-output">{truncate(result.content, 4000)}</pre>
      ) : null}
    </div>
  );
}

function ResultBadge({ result }: { result?: Props['result'] }) {
  const t = useT();
  if (!result) return <span className="op-status op-status-running">{t('tool.running')}</span>;
  if (result.isError) return <span className="op-status op-status-error">{t('tool.error')}</span>;
  return <span className="op-status op-status-ok">{t('tool.done')}</span>;
}

function describeInput(input: unknown): string {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  if (typeof input !== 'object') return String(input);
  const obj = input as Record<string, unknown>;
  for (const key of ['file_path', 'path', 'pattern', 'url', 'query', 'name', 'command']) {
    const v = obj[key];
    if (typeof v === 'string') return v;
  }
  try {
    return JSON.stringify(obj);
  } catch {
    return '';
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function editPreview(obj: {
  old_string?: string;
  new_string?: string;
  edits?: { old_string?: string; new_string?: string }[];
}): { before: string; after: string } | null {
  const first = Array.isArray(obj.edits) ? obj.edits[0] : obj;
  const before = first?.old_string;
  const after = first?.new_string;
  if (typeof before !== 'string' || typeof after !== 'string') return null;
  if (!before && !after) return null;
  return {
    before: compactSnippet(before),
    after: compactSnippet(after),
  };
}

function compactSnippet(value: string): string {
  return truncate(value.trim().replace(/\s+/g, ' '), 160);
}

function summarizeOutput(content: string): {
  lineCount: number;
  preview: string;
  hasWarnings: boolean;
  hasErrors: boolean;
} | null {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const previewLine = lines.find((line) => !/^(success|done|ok)$/i.test(line)) ?? lines[0] ?? '';
  return {
    lineCount: lines.length,
    preview: truncate(previewLine, 180),
    hasWarnings: lines.some((line) => /\bwarn(ing)?\b/i.test(line)),
    hasErrors: lines.some((line) => /\b(error|failed|exception|traceback)\b/i.test(line)),
  };
}

function ResultList({ lines }: { lines: string[] }) {
  const visible = lines.slice(0, 4);
  const hidden = lines.length - visible.length;
  return (
    <div className="op-result-list">
      {visible.map((line, i) => (
        <code key={`${line}-${i}`}>{truncate(line, 180)}</code>
      ))}
      {hidden > 0 ? <span>+{hidden} more</span> : null}
    </div>
  );
}
