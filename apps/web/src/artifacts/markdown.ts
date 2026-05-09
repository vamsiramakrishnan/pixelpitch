function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LINK_TOKEN_PREFIX = 'ODMDLINKTOKEN';
const CODE_TOKEN_PREFIX = 'ODMDCODETOKEN';

function formatInline(raw: string): string {
  const linkTokens = new Map<string, string>();
  const codeTokens = new Map<string, string>();
  let linkTokenIndex = 0;
  let codeTokenIndex = 0;

  const withCodeTokens = raw.replace(/`([^`]+)`/g, (_m, code: string) => {
    const token = `${CODE_TOKEN_PREFIX}${codeTokenIndex++}X`;
    codeTokens.set(token, `<code>${escapeHtml(code)}</code>`);
    return token;
  });

  const withLinkTokens = withCodeTokens.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, href: string) => {
    const normalizedHref = normalizeSafeHref(href);
    const safeText = escapeHtml(text);
    if (!normalizedHref) return safeText;
    const safeHref = escapeHtml(normalizedHref);
    const rel = safeHref.startsWith('#') ? '' : ' rel="noreferrer noopener" target="_blank"';
    const token = `${LINK_TOKEN_PREFIX}${linkTokenIndex++}X`;
    linkTokens.set(token, `<a href="${safeHref}"${rel}>${safeText}</a>`);
    return token;
  });

  let out = escapeHtml(withLinkTokens);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
  out = out.replace(/ODMDCODETOKEN\d+X/g, (token) => codeTokens.get(token) ?? token);
  out = out.replace(/ODMDLINKTOKEN\d+X/g, (token) => linkTokens.get(token) ?? token);
  return out;
}

function normalizeSafeHref(href: string): string | null {
  const decoded = href.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  if (
    decoded.startsWith('#') ||
    decoded.startsWith('/') ||
    decoded.startsWith('./') ||
    decoded.startsWith('../') ||
    /^https?:\/\//i.test(decoded) ||
    /^mailto:/i.test(decoded)
  ) {
    return decoded;
  }
  return null;
}

function headingLevel(line: string): number {
  const m = /^(#{1,6})\s+/.exec(line);
  return m?.[1]?.length ?? 0;
}

export function renderMarkdownToSafeHtml(markdown: string): string {
  // Intentionally small markdown subset for conservative preview rendering.
  // Supported: headings, paragraphs, blockquotes, ul/ol lists, fenced code,
  // pipe tables, inline code, bold/italic, and links.
  // Not supported on purpose: full CommonMark edge cases (nested lists,
  // escaped markdown syntax, raw HTML blocks, tables, etc.).
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    if (/^```/.test(line)) {
      i += 1;
      const code: string[] = [];
      while (i < lines.length) {
        const codeLine = lines[i];
        if (codeLine === undefined || /^```/.test(codeLine)) break;
        code.push(codeLine);
        i += 1;
      }
      if (i < lines.length) i += 1;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const h = headingLevel(line);
    if (h > 0) {
      out.push(`<h${h}>${formatInline(line.replace(/^#{1,6}\s+/, ''))}</h${h}>`);
      i += 1;
      continue;
    }

    if (isTableHeader(lines, i)) {
      const headers = splitTableRow(line);
      const align = parseTableAlign(lines[i + 1] ?? '', headers.length);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length) {
        const rowLine = lines[i];
        if (rowLine === undefined || !isTableRow(rowLine)) break;
        rows.push(normalizeTableCells(splitTableRow(rowLine), headers.length));
        i += 1;
      }
      out.push(renderTable(headers, rows, align));
      continue;
    }

    if (/^>\s?/.test(line)) {
      const block: string[] = [];
      while (i < lines.length) {
        const blockLine = lines[i];
        if (blockLine === undefined || !/^>\s?/.test(blockLine)) break;
        block.push(blockLine.replace(/^>\s?/, ''));
        i += 1;
      }
      out.push(`<blockquote>${formatInline(block.join(' '))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemLine = lines[i];
        if (itemLine === undefined || !/^\s*[-*]\s+/.test(itemLine)) break;
        items.push(`<li>${formatInline(itemLine.replace(/^\s*[-*]\s+/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemLine = lines[i];
        if (itemLine === undefined || !/^\s*\d+\.\s+/.test(itemLine)) break;
        items.push(`<li>${formatInline(itemLine.replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i += 1;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const paraLine = lines[i];
      if (paraLine === undefined || /^\s*$/.test(paraLine)) break;
      if (
        /^```/.test(paraLine) ||
        headingLevel(paraLine) > 0 ||
        isTableHeader(lines, i) ||
        /^>\s?/.test(paraLine) ||
        /^\s*[-*]\s+/.test(paraLine) ||
        /^\s*\d+\.\s+/.test(paraLine)
      ) {
        break;
      }
      para.push(paraLine);
      i += 1;
    }
    out.push(`<p>${formatInline(para.join(' '))}</p>`);
  }

  return out.join('\n');
}

type TableAlign = 'left' | 'center' | 'right' | null;

function isTableHeader(lines: string[], index: number): boolean {
  const header = lines[index] ?? '';
  const separator = lines[index + 1] ?? '';
  if (!isTableRow(header)) return false;
  const headers = splitTableRow(header);
  if (headers.length < 2) return false;
  const align = parseTableAlign(separator, headers.length);
  return align.length === headers.length;
}

function isTableRow(line: string): boolean {
  if (!line.includes('|')) return false;
  const trimmed = line.trim();
  if (!trimmed || trimmed === '|') return false;
  return splitTableRow(line).length >= 2;
}

function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((cell) => cell.trim());
}

function parseTableAlign(line: string, width: number): TableAlign[] {
  if (!isTableRow(line)) return [];
  const cells = splitTableRow(line);
  if (cells.length !== width) return [];
  const align: TableAlign[] = [];
  for (const cell of cells) {
    if (!/^:?-{3,}:?$/.test(cell)) return [];
    align.push(cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : 'left');
  }
  return align;
}

function normalizeTableCells(cells: string[], width: number): string[] {
  if (cells.length === width) return cells;
  if (cells.length > width) return cells.slice(0, width);
  return [...cells, ...Array.from({ length: width - cells.length }, () => '')];
}

function renderTable(headers: string[], rows: string[][], align: TableAlign[]): string {
  const headerHtml = headers
    .map((header, i) => `<th${alignAttr(align[i])}>${formatInline(header)}</th>`)
    .join('');
  const bodyHtml = rows
    .map((row) => `<tr>${headers.map((_header, i) => `<td${alignAttr(align[i])}>${formatInline(row[i] ?? '')}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function alignAttr(align: TableAlign | undefined): string {
  return align ? ` style="text-align: ${align}"` : '';
}
