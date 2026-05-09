// @ts-nocheck

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const ALLOWED_STYLE_KEYS = new Set([
  'color',
  'background-color',
  'backgroundColor',
  'border-color',
  'borderColor',
  'font-size',
  'fontSize',
  'font-weight',
  'fontWeight',
  'line-height',
  'lineHeight',
  'letter-spacing',
  'letterSpacing',
  'padding',
  'border-radius',
  'borderRadius',
  'opacity',
  'width',
  'height',
]);

export class HtmlEditOperationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'HtmlEditOperationError';
    this.details = details;
  }
}

export function applyHtmlEditOperations(source, operations) {
  let next = String(source ?? '');
  const applied = [];
  for (const operation of Array.isArray(operations) ? operations : []) {
    next = applyHtmlEditOperation(next, operation);
    applied.push({
      type: operation.type,
      fileName: operation.target?.fileName,
      selector: operation.target?.selector,
      elementId: operation.target?.elementId,
    });
  }
  return { source: next, applied };
}

export function applyHtmlEditOperation(source, operation) {
  if (!operation || typeof operation !== 'object') {
    throw new HtmlEditOperationError('edit operation must be an object');
  }
  const target = operation.target && typeof operation.target === 'object' ? operation.target : null;
  if (!target) throw new HtmlEditOperationError('edit operation target is required');
  const element = findTargetElement(source, target);
  if (!element) {
    throw new HtmlEditOperationError('target element not found', {
      selector: target.selector,
      elementId: target.elementId,
    });
  }

  if (operation.type === 'setText') {
    if (element.closeStart == null) {
      throw new HtmlEditOperationError('setText requires a non-void element');
    }
    return `${source.slice(0, element.openEnd)}${escapeHtml(String(operation.text ?? ''))}${source.slice(element.closeStart)}`;
  }

  if (operation.type === 'setStyle') {
    return applyInlineStyles(source, element, operation.styles);
  }

  if (operation.type === 'removeElement') {
    return `${source.slice(0, element.openStart)}${source.slice(element.closeEnd ?? element.openEnd)}`;
  }

  throw new HtmlEditOperationError(`unsupported edit operation: ${operation.type}`);
}

function findTargetElement(source, target) {
  const elements = parseElements(source);
  if (target.selector) {
    const bySelector = elements.find((element) => selectorMatches(element, target.selector));
    if (bySelector) return bySelector;
  }
  const elementId = clean(target.elementId);
  if (elementId) {
    const explicit = elements.find((element) => (
      element.attrs['data-od-id'] === elementId ||
      element.attrs['data-screen-label'] === elementId ||
      element.attrs['aria-label'] === elementId ||
      element.attrs.id === elementId
    ));
    if (explicit) return explicit;
    const generated = elements.find((element) => {
      const generated = generatedElementId(source, element);
      return generated === elementId || compactGeneratedId(generated) === compactGeneratedId(elementId);
    });
    if (generated) return generated;
    const contextual = findGeneratedContextualElement(source, elements, target, elementId);
    if (contextual) return contextual;
  }
  return null;
}

function findGeneratedContextualElement(source, elements, target, elementId) {
  const parts = parseGeneratedElementId(elementId);
  const targetTag = clean(target.tagName || parts?.tag).toLowerCase();
  const targetTextSlug = compactGeneratedId(textSlug(target.currentText || parts?.textSlug || ''));
  const context = contextFromLabel(target.label);
  const candidates = elements
    .filter((element) => !targetTag || element.tag === targetTag)
    .filter((element) => {
      if (!targetTextSlug) return true;
      const sourceTextSlug = compactGeneratedId(textSlug(elementText(source, element)));
      return sourceTextSlug === targetTextSlug;
    })
    .filter((element) => !context || elementWithinContext(source, element, context));
  if (candidates.length === 0) return null;
  if (parts?.ordinal != null) {
    const exactOrdinal = candidates.find((element) => element.globalNthOfTag === parts.ordinal);
    if (exactOrdinal) return exactOrdinal;
    return candidates
      .slice()
      .sort((a, b) => Math.abs(a.globalNthOfTag - parts.ordinal) - Math.abs(b.globalNthOfTag - parts.ordinal))[0] ?? null;
  }
  return candidates.length === 1 ? candidates[0] : null;
}

function parseGeneratedElementId(elementId) {
  const match = /^([a-z0-9]+)-(.+)-(\d+)$/i.exec(clean(elementId));
  if (!match) return null;
  return {
    tag: match[1].toLowerCase(),
    textSlug: match[2],
    ordinal: Number(match[3]),
  };
}

function contextFromLabel(label) {
  const match = /\bwithin\s+(.+)\s*$/i.exec(clean(label));
  return match?.[1]?.trim() || '';
}

function elementWithinContext(source, element, context) {
  let cursor = element.parent;
  const compactContext = compactGeneratedId(textSlug(context));
  while (cursor) {
    const explicit = cursor.attrs['data-od-id'] || cursor.attrs['data-screen-label'] || cursor.attrs['aria-label'] || cursor.attrs.id;
    if (explicit && (String(explicit) === context || compactGeneratedId(textSlug(explicit)) === compactContext)) return true;
    const generated = generatedElementId(source, cursor);
    if (generated === context || compactGeneratedId(generated) === compactContext) return true;
    cursor = cursor.parent;
  }
  return false;
}

function selectorMatches(element, selector) {
  const raw = clean(selector);
  if (!raw) return false;
  const chain = splitSelectorChain(raw);
  if (chain.length > 1) return selectorChainMatches(element, chain);
  const attr = /^\[([a-zA-Z0-9_:-]+)="([^"]*)"\]$/.exec(raw);
  if (attr) return element.attrs[attr[1]] === attr[2];
  const id = /^#(.+)$/.exec(raw);
  if (id) return element.attrs.id === unescapeCss(id[1]);

  const nth = /:nth-of-type\((\d+)\)$/.exec(raw);
  const withoutNth = nth ? raw.slice(0, nth.index) : raw;
  const parts = withoutNth.split('.').filter(Boolean);
  const tag = parts.shift()?.toLowerCase();
  if (tag && element.tag !== tag) return false;
  for (const className of parts) {
    if (!element.classList.includes(unescapeCss(className))) return false;
  }
  if (nth && element.nthOfType !== Number(nth[1])) return false;
  return Boolean(tag || parts.length);
}

function selectorChainMatches(element, chain) {
  if (!selectorMatches(element, chain[chain.length - 1])) return false;
  let cursor = element.parent;
  for (let i = chain.length - 2; i >= 0; i--) {
    while (cursor && !selectorMatches(cursor, chain[i])) {
      cursor = cursor.parent;
    }
    if (!cursor) return false;
    cursor = cursor.parent;
  }
  return true;
}

function splitSelectorChain(selector) {
  const out = [];
  let current = '';
  let bracketDepth = 0;
  let quote = '';
  for (const char of selector) {
    if (quote) {
      current += char;
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      current += char;
      quote = char;
      continue;
    }
    if (char === '[') bracketDepth += 1;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (bracketDepth === 0 && (char === '>' || /\s/.test(char))) {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function parseElements(source) {
  const elements = [];
  const stack = [];
  const globalTagCounts = {};
  const tagRe = /<!--[\s\S]*?-->|<![^>]*>|<\/?\s*([a-zA-Z][\w:-]*)([^>]*)>/g;
  let match;
  while ((match = tagRe.exec(source))) {
    if (!match[1]) continue;
    const full = match[0];
    const tag = match[1].toLowerCase();
    const rest = match[2] ?? '';
    const isClose = /^<\//.test(full);
    if (isClose) {
      for (let i = stack.length - 1; i >= 0; i--) {
        const candidate = stack[i];
        if (candidate.tag !== tag) continue;
        stack.splice(i);
        candidate.closeStart = match.index;
        candidate.closeEnd = tagRe.lastIndex;
        break;
      }
      continue;
    }

    const parent = stack[stack.length - 1] ?? null;
    const attrs = parseAttrs(rest);
    globalTagCounts[tag] = (globalTagCounts[tag] ?? 0) + 1;
    const element = {
      tag,
      attrs,
      classList: String(attrs.class ?? '').split(/\s+/).filter(Boolean),
      globalNthOfTag: globalTagCounts[tag],
      openStart: match.index,
      openEnd: tagRe.lastIndex,
      closeStart: null,
      closeEnd: null,
      nthOfType: parent
        ? (parent.childCounts[tag] = (parent.childCounts[tag] ?? 0) + 1)
        : 1 + elements.filter((item) => item.parent === null && item.tag === tag).length,
      parent,
      childCounts: {},
    };
    elements.push(element);
    const selfClosing = /\/\s*>$/.test(full) || VOID_TAGS.has(tag);
    if (selfClosing) {
      element.closeStart = tagRe.lastIndex;
      element.closeEnd = tagRe.lastIndex;
    } else {
      stack.push(element);
    }
  }
  for (const element of stack) {
    element.closeStart = element.openEnd;
    element.closeEnd = element.openEnd;
  }
  return elements;
}

function generatedElementId(source, element) {
  const explicit = element.attrs['data-od-id'] || element.attrs['data-screen-label'] || element.attrs['aria-label'] || element.attrs.id;
  if (explicit) return String(explicit);
  let scope = element.tag || 'element';
  if (element.classList.length) scope += `-${element.classList.slice(0, 2).join('-')}`;
  const text = textSlug(elementText(source, element)) || 'target';
  return textSlug(`${scope}-${text}-${element.globalNthOfTag}`);
}

function elementText(source, element) {
  if (element.closeStart == null || element.closeStart < element.openEnd) return '';
  return decodeHtmlEntities(source.slice(element.openEnd, element.closeStart).replace(/<[^>]*>/g, ' '));
}

function compactGeneratedId(value) {
  return String(value || '').replace(/-/g, '');
}

function textSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&nbsp;/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseAttrs(raw) {
  const attrs = {};
  const attrRe = /([^\s=/>]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(raw))) {
    attrs[match[1]] = match[3] ?? match[4] ?? match[5] ?? '';
  }
  return attrs;
}

function applyInlineStyles(source, element, styles) {
  if (!styles || typeof styles !== 'object') {
    throw new HtmlEditOperationError('setStyle requires styles');
  }
  const openTag = source.slice(element.openStart, element.openEnd);
  const styleMap = parseStyleAttribute(element.attrs.style ?? '');
  for (const [rawKey, rawValue] of Object.entries(styles)) {
    if (!ALLOWED_STYLE_KEYS.has(rawKey)) continue;
    const key = cssPropertyName(rawKey);
    if (rawValue == null || String(rawValue).trim() === '') styleMap.delete(key);
    else styleMap.set(key, String(rawValue).trim());
  }
  const styleValue = serializeStyle(styleMap);
  const nextOpenTag = setAttribute(openTag, 'style', styleValue);
  return `${source.slice(0, element.openStart)}${nextOpenTag}${source.slice(element.openEnd)}`;
}

function parseStyleAttribute(value) {
  const out = new Map();
  String(value || '').split(';').forEach((part) => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const key = cssPropertyName(part.slice(0, idx));
    const val = part.slice(idx + 1).trim();
    if (key && val) out.set(key, val);
  });
  return out;
}

function serializeStyle(styleMap) {
  return Array.from(styleMap.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

function setAttribute(openTag, name, value) {
  const attrRe = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|[^\\s>]+)`, 'i');
  if (!value) return openTag.replace(attrRe, '');
  const escaped = escapeAttr(value);
  if (attrRe.test(openTag)) return openTag.replace(attrRe, ` ${name}="${escaped}"`);
  return openTag.replace(/\s*\/?>$/, (ending) => `${ending.startsWith('/') ? ' ' : ' '}${name}="${escaped}"${ending.trimStart()}`);
}

function cssPropertyName(value) {
  return clean(value).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function unescapeCss(value) {
  return String(value || '').replace(/\\(.)/g, '$1');
}
