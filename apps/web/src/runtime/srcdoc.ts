/**
 * Wrap an artifact's HTML for a sandboxed iframe. Corresponds to
 * buildSrcdoc in packages/runtime/src/index.ts — the reference version also
 * injects an edit-mode overlay and tweak bridge, which this starter omits.
 *
 * If the model returned a full document, pass it through unchanged; otherwise
 * wrap the fragment in a minimal doctype shell.
 *
 * When `options.deck` is set we also inject a `postMessage` listener that
 * lets the host advance / rewind slides without relying on the iframe
 * having keyboard focus. The host posts:
 *   { type: 'od:slide', action: 'next' | 'prev' | 'first' | 'last' | 'go', index?: number }
 * and the iframe responds with:
 *   { type: 'od:slide-state', active: number, count: number }
 * after every navigation so the host can render its own counter / dots.
 */
export function buildSrcdoc(
  html: string,
  options: { deck?: boolean; baseHref?: string; initialSlideIndex?: number; commentBridge?: boolean; inspectBridge?: boolean } = {}
): string {
  const head = html.trimStart().slice(0, 64).toLowerCase();
  const isFullDoc = head.startsWith("<!doctype") || head.startsWith("<html");
  const wrapped = isFullDoc
    ? html
    : `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>${html}</body>
</html>`;
  const withBase = options.baseHref ? injectBaseHref(wrapped, options.baseHref) : wrapped;
  const withShim = injectSandboxShim(withBase);
  const withDeck = options.deck ? injectDeckBridge(withShim, options.initialSlideIndex) : withShim;
  return options.commentBridge || options.inspectBridge ? injectCommentBridge(withDeck) : withDeck;
}

function injectBaseHref(doc: string, baseHref: string): string {
  const safeHref = escapeAttr(baseHref);
  const tag = `<base href="${safeHref}">`;
  if (/<head[^>]*>/i.test(doc)) {
    return doc.replace(/<head[^>]*>/i, (m) => `${m}${tag}`);
  }
  if (/<html[^>]*>/i.test(doc)) {
    return doc.replace(/<html[^>]*>/i, (m) => `${m}<head>${tag}</head>`);
  }
  return tag + doc;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Sandboxed iframes (we use `sandbox="allow-scripts"`) without
// `allow-same-origin` raise a SecurityError on first `localStorage` /
// `sessionStorage` access. Many freeform-generated decks call
// `localStorage.getItem(...)` at the top of their IIFE without a
// try/catch — when it throws, the whole script aborts and the deck
// becomes a static, unnavigable preview. We install a same-origin
// in-memory shim BEFORE any user script runs so those decks degrade
// gracefully (position just doesn't persist across reloads).
function injectSandboxShim(doc: string): string {
  const shim = `<script>(function(){
  function makeStore(){
    var data = {};
    var api = {
      getItem: function(k){ return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function(k, v){ data[k] = String(v); },
      removeItem: function(k){ delete data[k]; },
      clear: function(){ data = {}; },
      key: function(i){ return Object.keys(data)[i] || null; }
    };
    Object.defineProperty(api, 'length', { get: function(){ return Object.keys(data).length; } });
    return api;
  }
  function tryShim(name){
    var works = false;
    try { works = !!window[name] && typeof window[name].getItem === 'function'; void window[name].length; }
    catch (_) { works = false; }
    if (works) return;
    try { Object.defineProperty(window, name, { configurable: true, value: makeStore() }); }
    catch (_) { try { window[name] = makeStore(); } catch (__) {} }
  }
  tryShim('localStorage');
  tryShim('sessionStorage');
})();</script>`;
  if (/<head[^>]*>/i.test(doc))
    return doc.replace(/<head[^>]*>/i, (m) => `${m}${shim}`);
  if (/<body[^>]*>/i.test(doc))
    return doc.replace(/<body[^>]*>/i, (m) => `${m}${shim}`);
  return shim + doc;
}

function injectCommentBridge(doc: string): string {
  const script = `<script data-od-comment-bridge>(function(){
  var enabled = true;
  var targetMode = 'comment';
  var hoveredId = null;
  var stableHover = null;
  var hoverFrame = 0;
  var queuedHover = null;
  var drawStart = null;
  var drawBox = null;
  var nativeRing = null;
  function esc(value){ try { return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/"/g, '\\\\"'); } catch (_) { return String(value); } }
  function textSlug(value){
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 42);
  }
  function indexOfElement(el, list){
    for (var i = 0; i < list.length; i++) if (list[i] === el) return i;
    return -1;
  }
  function generatedId(el){
    var explicit = el.getAttribute('data-od-id') || el.getAttribute('data-screen-label') || el.getAttribute('aria-label') || el.id;
    if (explicit) return String(explicit);
    var tag = el.tagName ? el.tagName.toLowerCase() : 'element';
    var scope = tag;
    if (el.classList && el.classList.length) scope += '-' + Array.prototype.slice.call(el.classList, 0, 2).join('-');
    var text = textSlug(el.textContent || el.getAttribute('title') || '');
    var peers = document.querySelectorAll(tag);
    var index = Math.max(0, indexOfElement(el, peers));
    return textSlug(scope + '-' + (text || 'target') + '-' + (index + 1));
  }
  function isDeckChrome(el){
    if (!el || !el.closest) return false;
    try {
      if (el.closest('[data-od-selection-ring], [data-od-draw-box]')) return true;
      if (el.closest([
        '#deck-prev',
        '#deck-next',
        '#deck-cur',
        '#deck-total',
        '[data-od-deck-chrome]',
        '[data-noncommentable]',
        '[role="toolbar"]',
        '[aria-label="Previous slide"]',
        '[aria-label="Next slide"]',
        '[aria-label="Reset to first slide"]',
        '[aria-label="Previous"]',
        '[aria-label="Next"]',
        '.export-hidden',
        '.overlay',
        '.tapzones',
        '.tapzone',
        '.btn.prev',
        '.btn.next',
        '.btn.reset',
        '.count',
        '.current',
        '.total',
        '.sep',
        '.kbd',
        '.deck-nav',
        '.deck-controls',
        '.slide-nav',
        '.slide-controls',
        '.nav-controls',
        '.carousel-controls',
        '.pager',
        '.pagination',
        '.prev',
        '.next',
        '.arrow'
      ].join(','))) return true;
      var node = el.closest('button, a, [role="button"], [aria-label], [class], [id]') || el;
      var rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      var cs = window.getComputedStyle ? window.getComputedStyle(node) : null;
      var classId = String((node.className || '') + ' ' + (node.id || '') + ' ' + (node.getAttribute && (node.getAttribute('aria-label') || ''))).toLowerCase();
      var namesLikeNav = /\\b(prev|previous|next|arrow|nav|pager|pagination|slide[-_ ]?(control|nav|next|prev)|deck[-_ ]?(control|nav|next|prev)|carousel)\\b/.test(classId);
      if (namesLikeNav) return true;
      if (rect && cs && (cs.position === 'fixed' || cs.position === 'sticky')) {
        var area = Math.max(1, rect.width * rect.height);
        var nearEdge = rect.left < 96 || rect.right > window.innerWidth - 96 || rect.top < 96 || rect.bottom > window.innerHeight - 96;
        var compact = rect.width <= 180 && rect.height <= 96 && area <= 12000;
        var clickable = /^(button|a)$/i.test(node.tagName || '') || node.getAttribute('role') === 'button' || !!node.onclick;
        if (nearEdge && compact && clickable) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }
  function selectorFor(el, id){
    if (el.hasAttribute('data-od-id')) return '[data-od-id="' + esc(el.getAttribute('data-od-id')) + '"]';
    if (el.hasAttribute('data-screen-label')) return '[data-screen-label="' + esc(el.getAttribute('data-screen-label')) + '"]';
    if (el.id) return '#' + esc(el.id);
    function stableSelectorFor(node){
      if (!node || !node.getAttribute) return '';
      if (node.hasAttribute('data-od-id')) return '[data-od-id="' + esc(node.getAttribute('data-od-id')) + '"]';
      if (node.hasAttribute('data-screen-label')) return '[data-screen-label="' + esc(node.getAttribute('data-screen-label')) + '"]';
      if (node.id) return '#' + esc(node.id);
      return '';
    }
    function segmentFor(node){
      var nodeTag = node.tagName ? node.tagName.toLowerCase() : 'element';
      var nodeCls = node.classList && node.classList.length ? '.' + Array.prototype.slice.call(node.classList, 0, 3).map(esc).join('.') : '';
      var nodeParent = node.parentElement;
      if (!nodeParent) return nodeTag + nodeCls;
      var nodeSiblings = Array.prototype.filter.call(nodeParent.children || [], function(child){ return child.tagName === node.tagName; });
      var nodeIndex = Math.max(0, indexOfElement(node, nodeSiblings)) + 1;
      return nodeTag + nodeCls + ':nth-of-type(' + nodeIndex + ')';
    }
    var tag = el.tagName ? el.tagName.toLowerCase() : 'element';
    var cls = el.classList && el.classList.length ? '.' + Array.prototype.slice.call(el.classList, 0, 3).map(esc).join('.') : '';
    var parent = el.parentElement;
    if (!parent) return tag + cls;
    var siblings = Array.prototype.filter.call(parent.children || [], function(child){ return child.tagName === el.tagName; });
    var index = Math.max(0, indexOfElement(el, siblings)) + 1;
    var segment = tag + cls + ':nth-of-type(' + index + ')';
    var anchor = parent;
    var path = [segment];
    while (anchor && anchor !== document.body && anchor !== document.documentElement) {
      var stable = stableSelectorFor(anchor);
      if (stable) return stable + ' ' + path.join(' > ');
      path.unshift(segmentFor(anchor));
      anchor = anchor.parentElement;
    }
    return path.join(' > ');
  }
  function targetFrom(el){
    if (isDeckChrome(el)) return null;
    var id = generatedId(el);
    if (!id) return null;
    var slide = el.closest ? el.closest('.slide, [data-screen-label]') : null;
    if (slide && !isForegroundSlide(slide)) return null;
    var rect = el.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) return null;
    var tag = el.tagName ? el.tagName.toLowerCase() : 'element';
    var cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0,2).join('.') : '';
    var html = '';
    try { html = (el.outerHTML || '').replace(/\\s+/g, ' ').match(/^<[^>]+>/)?.[0] || ''; } catch (_) {}
    var style = '';
    var styles = {};
    try {
      var cs = window.getComputedStyle(el);
      style = ' display=' + cs.display + ' font=' + cs.fontFamily.split(',')[0] + ' size=' + cs.fontSize + ' color=' + cs.color + ' bg=' + cs.backgroundColor;
      styles = {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        borderColor: cs.borderColor,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        padding: cs.padding,
        borderRadius: cs.borderRadius,
        opacity: cs.opacity,
        width: Math.round(rect.width) + 'px',
        height: Math.round(rect.height) + 'px'
      };
    } catch (_) {}
    var slideInfo = slide && slide !== el ? ' within ' + generatedId(slide) : '';
    return {
      type: 'od:comment-target',
      elementId: id,
      selector: selectorFor(el, id),
      label: tag + cls + slideInfo,
      text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160),
      position: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      htmlHint: (html + style).slice(0, 260),
      tagName: tag,
      className: typeof el.className === 'string' ? el.className : '',
      styles: styles
    };
  }
  function inlineCloneStyles(source, clone, depth){
    if (!source || !clone || depth > 3) return;
    try {
      var cs = window.getComputedStyle(source);
      var props = ['display','position','box-sizing','width','height','margin','padding','color','background','background-color','border','border-radius','box-shadow','font','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-transform','text-align','opacity','transform','gap','align-items','justify-content','flex-direction','grid-template-columns'];
      clone.setAttribute('style', props.map(function(prop){ return prop + ':' + cs.getPropertyValue(prop); }).join(';'));
      var sourceKids = source.children || [];
      var cloneKids = clone.children || [];
      for (var i = 0; i < sourceKids.length && i < cloneKids.length; i++) inlineCloneStyles(sourceKids[i], cloneKids[i], depth + 1);
    } catch (_) {}
  }
  function captureTargetImage(el, rect){
    return new Promise(function(resolve){
      if (!el || !rect || rect.width < 2 || rect.height < 2) return resolve('');
      try {
        var scale = Math.min(2, 900 / Math.max(1, rect.width));
        var width = Math.max(1, Math.round(rect.width * scale));
        var height = Math.max(1, Math.round(rect.height * scale));
        var clone = el.cloneNode(true);
        inlineCloneStyles(el, clone, 0);
        clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        clone.style.margin = '0';
        clone.style.transform = 'none';
        clone.style.width = Math.round(rect.width) + 'px';
        clone.style.height = Math.round(rect.height) + 'px';
        var xml = new XMLSerializer().serializeToString(clone);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + Math.round(rect.width) + ' ' + Math.round(rect.height) + '"><foreignObject width="100%" height="100%">' + xml + '</foreignObject></svg>';
        var blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function(){
          try {
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
          } catch (_) {
            URL.revokeObjectURL(url);
            resolve('');
          }
        };
        img.onerror = function(){ URL.revokeObjectURL(url); resolve(''); };
        img.src = url;
      } catch (_) {
        resolve('');
      }
    });
  }
  function postCapturedTarget(el, payload){
    var rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    captureTargetImage(el, rect).then(function(dataUrl){
      if (dataUrl) payload.screenshotDataUrl = dataUrl;
      window.parent.postMessage(payload, '*');
    });
  }
  function slideNodes(){
    return Array.prototype.slice.call(document.querySelectorAll('.slide, [data-screen-label]'));
  }
  function isForegroundSlide(slide){
    var list = slideNodes();
    if (!list || list.length <= 1) return true;
    if (slide.classList && (slide.classList.contains('active') || slide.classList.contains('is-active') || slide.classList.contains('current'))) return true;
    try {
      var cs = window.getComputedStyle(slide);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    } catch (_) {}
    var activeByClass = list.some(function(item){
      return item.classList && (item.classList.contains('active') || item.classList.contains('is-active') || item.classList.contains('current'));
    });
    if (activeByClass) return false;
    var rect = slide.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) return false;
    var viewportCenter = window.innerWidth / 2;
    var slideCenter = rect.left + rect.width / 2;
    var nearest = list[0];
    var nearestDistance = Infinity;
    for (var i = 0; i < list.length; i++) {
      try {
        var itemStyle = window.getComputedStyle(list[i]);
        if (itemStyle.display === 'none' || itemStyle.visibility === 'hidden' || itemStyle.opacity === '0') continue;
      } catch (_) {}
      var itemRect = list[i].getBoundingClientRect();
      if (!itemRect || itemRect.width < 2 || itemRect.height < 2) continue;
      var distance = Math.abs((itemRect.left + itemRect.width / 2) - viewportCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = list[i];
      }
    }
    return nearest === slide || Math.abs(slideCenter - viewportCenter) <= 2;
  }
  function allTargets(){
    var nodes = document.querySelectorAll('[data-od-id], [data-screen-label], .slide, section, article, main, header, footer, nav, aside, button, a[href], h1, h2, h3, h4, p, li, figure, figcaption, span, strong, em, small, b, i, label, img, video, canvas, svg, table, [role="button"], [role="region"], [aria-label]');
    var items = [];
    for (var i = 0; i < nodes.length; i++) {
      var item = targetFrom(nodes[i]);
      if (item) items.push(item);
      if (items.length >= 180) break;
    }
    return items;
  }
  function containsPoint(rect, x, y, pad){
    return rect &&
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad;
  }
  function targetScore(el, event){
    if (!el || !el.matches) return -1;
    if (el.matches('script, style, link, meta, head, html, body')) return -1;
    if (isDeckChrome(el)) return -1;
    var payload = targetFrom(el);
    if (!payload) return -1;
    var rect = el.getBoundingClientRect();
    if (!rect || !containsPoint(rect, event.clientX, event.clientY, 0)) return -1;
    var tag = el.tagName ? el.tagName.toLowerCase() : '';
    var score = 0;
    if (el.hasAttribute && el.hasAttribute('data-od-id')) score += 90;
    if (el.hasAttribute && el.hasAttribute('data-screen-label')) score += 35;
    if (el.id) score += 72;
    if (el.hasAttribute && el.hasAttribute('aria-label')) score += 58;
    if (/^(span|strong|em|small|b|i|label)$/.test(tag)) score += 72;
    if (/^(button|a|input|select|textarea)$/.test(tag)) score += 60;
    if (/^h[1-6]$/.test(tag)) score += 48;
    if (/^(img|video|canvas|svg|table)$/.test(tag)) score += 44;
    if (/^(div)$/.test(tag) && (el.textContent || '').trim().length > 0) score += 34;
    if (/^(figure|li|p|figcaption)$/.test(tag)) score += 28;
    if (/^(section|article|main|header|footer|nav|aside)$/.test(tag)) score += 8;
    var area = Math.max(1, rect.width * rect.height);
    var viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
    var isSlideShell = false;
    try {
      isSlideShell = !!(el.classList && (
        el.classList.contains('slide') ||
        el.classList.contains('slide-cover') ||
        el.classList.contains('deck-slide')
      ));
      if (!isSlideShell && typeof el.className === 'string') isSlideShell = /(^|\\s)(slide|slide-[\\w-]+|deck-slide)(\\s|$)/i.test(el.className);
    } catch (_) {}
    if (isSlideShell) score -= 96;
    if (area > viewportArea * 0.55) score -= 82;
    else if (area > viewportArea * 0.28) score -= 44;
    if (area < 18 * 10) score -= 10;
    score -= Math.min(28, Math.log(area) / Math.log(10) * 2.2);
    return score;
  }
  var postTargetsPending = false;
  function postTargets(){
    if (!enabled) return;
    window.parent.postMessage({ type: 'od:comment-targets', targets: allTargets() }, '*');
  }
  function schedulePostTargets(){
    if (!enabled || postTargetsPending) return;
    postTargetsPending = true;
    window.requestAnimationFrame(function(){
      postTargetsPending = false;
      postTargets();
    });
  }
  function closestTarget(event){
    var path = typeof event.composedPath === 'function' ? event.composedPath() : null;
    var best = null;
    var bestScore = -1;
    if (path && path.length) {
      for (var i = 0; i < path.length; i++) {
        var node = path[i];
        if (!node || !node.matches || node === document.body || node === document.documentElement) continue;
        if (node.matches('script, style, link, meta, head')) continue;
        var score = targetScore(node, event);
        if (score > bestScore) {
          best = node;
          bestScore = score;
        }
      }
      if (!best || bestScore < 20) {
        try {
          var pointNodes = document.elementsFromPoint(event.clientX, event.clientY);
          for (var p = 0; p < pointNodes.length; p++) {
            var pointNode = pointNodes[p];
            var pointScore = targetScore(pointNode, event);
            if (pointScore > bestScore) {
              best = pointNode;
              bestScore = pointScore;
            }
          }
        } catch (_) {}
      }
    }
    var el = event.target;
    while (el && el !== document.documentElement) {
      if (el.matches && targetScore(el, event) > bestScore) {
        best = el;
        bestScore = targetScore(el, event);
      }
      el = el.parentElement;
    }
    if (stableHover && stableHover.el && stableHover.rect && containsPoint(stableHover.rect, event.clientX, event.clientY, 6)) {
      var stableScore = targetScore(stableHover.el, event);
      if (stableScore >= 6 && stableScore >= bestScore - 8) return stableHover.el;
    }
    if (best && bestScore >= 6) {
      try { stableHover = { el: best, rect: best.getBoundingClientRect() }; } catch (_) {}
      return best;
    }
    return null;
  }
  function postHover(payload){
    queuedHover = payload;
    if (hoverFrame) return;
    hoverFrame = window.requestAnimationFrame(function(){
      hoverFrame = 0;
      if (!queuedHover) return;
      if (queuedHover.elementId === hoveredId) {
        queuedHover = null;
        return;
      }
      hoveredId = queuedHover.elementId;
      window.parent.postMessage(Object.assign({}, queuedHover, { type: 'od:comment-hover' }), '*');
      queuedHover = null;
    });
  }
  function ensureNativeRing(){
    if (nativeRing) return nativeRing;
    nativeRing = document.createElement('div');
    nativeRing.setAttribute('data-od-selection-ring', 'true');
    nativeRing.innerHTML = '<span data-od-ring-label></span>';
    document.documentElement.appendChild(nativeRing);
    return nativeRing;
  }
  function hideNativeRing(){
    if (!nativeRing) return;
    nativeRing.style.opacity = '0';
    nativeRing.removeAttribute('data-selected');
  }
  function updateNativeRing(el, payload, selected){
    if (!el || !payload) {
      hideNativeRing();
      return;
    }
    var rect = el.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) {
      hideNativeRing();
      return;
    }
    var ring = ensureNativeRing();
    ring.style.opacity = '1';
    ring.style.left = Math.round(rect.left) + 'px';
    ring.style.top = Math.round(rect.top) + 'px';
    ring.style.width = Math.round(rect.width) + 'px';
    ring.style.height = Math.round(rect.height) + 'px';
    ring.toggleAttribute('data-selected', !!selected);
    var label = ring.querySelector('[data-od-ring-label]');
    if (label) {
      label.textContent = (payload.text || payload.elementId || payload.label || 'Selected').slice(0, 56);
    }
  }
  function removeDrawBox(){
    if (drawBox && drawBox.parentNode) drawBox.parentNode.removeChild(drawBox);
    drawBox = null;
  }
  function updateDrawBox(a, b){
    if (!drawBox) {
      drawBox = document.createElement('div');
      drawBox.setAttribute('data-od-draw-box', 'true');
      document.documentElement.appendChild(drawBox);
    }
    var left = Math.min(a.x, b.x);
    var top = Math.min(a.y, b.y);
    var width = Math.abs(a.x - b.x);
    var height = Math.abs(a.y - b.y);
    drawBox.style.left = left + 'px';
    drawBox.style.top = top + 'px';
    drawBox.style.width = width + 'px';
    drawBox.style.height = height + 'px';
  }
  function drawRegionPayload(start, end){
    var left = Math.min(start.x, end.x);
    var top = Math.min(start.y, end.y);
    var width = Math.abs(start.x - end.x);
    var height = Math.abs(start.y - end.y);
    if (width < 8 || height < 8) return null;
    var centerX = left + width / 2;
    var centerY = top + height / 2;
    var under = null;
    try {
      if (drawBox) drawBox.style.pointerEvents = 'none';
      under = document.elementFromPoint(centerX, centerY);
    } catch (_) {}
    var target = under ? targetFrom(under) : null;
    var id = 'draw-region-' + Math.round(left) + '-' + Math.round(top) + '-' + Math.round(width) + 'x' + Math.round(height);
    return Object.assign({}, target || {}, {
      type: 'od:draw-region',
      elementId: id,
      selector: target && target.selector ? target.selector : 'body',
      label: target && target.label ? 'Drawn region over ' + target.label : 'Drawn region',
      text: target && target.text ? target.text : '',
      position: { x: Math.round(left), y: Math.round(top), width: Math.round(width), height: Math.round(height) },
      htmlHint: target && target.htmlHint ? target.htmlHint : 'drawn preview region',
      tagName: target && target.tagName ? target.tagName : 'region',
      className: target && target.className ? target.className : '',
      drawRegion: true
    });
  }
  function findTarget(selector, elementId){
    try {
      if (selector) {
        var selected = document.querySelector(selector);
        if (selected) return selected;
      }
    } catch (_) {}
    var targets = allTargets();
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].elementId === elementId) {
        try { return document.querySelector(targets[i].selector); } catch (_) { return null; }
      }
    }
    return null;
  }
  function applyStyles(el, styles){
    if (!el || !styles || typeof styles !== 'object') return;
    var allowed = {
      color: true,
      backgroundColor: true,
      borderColor: true,
      fontSize: true,
      fontWeight: true,
      lineHeight: true,
      letterSpacing: true,
      padding: true,
      borderRadius: true,
      opacity: true,
      width: true,
      height: true
    };
    Object.keys(styles).forEach(function(key){
      if (!allowed[key]) return;
      var value = styles[key];
      if (value == null) el.style[key] = '';
      else el.style[key] = String(value);
    });
    schedulePostTargets();
  }
  window.addEventListener('message', function(ev){
    if (!ev.data) return;
    if (ev.data.type === 'od:inspect-apply') {
      applyStyles(findTarget(ev.data.selector, ev.data.elementId), ev.data.styles);
      return;
    }
    if (ev.data.type === 'od:preview-target-mode') {
      targetMode = ev.data.mode || 'comment';
      enabled = !!ev.data.enabled;
      document.documentElement.toggleAttribute('data-od-comment-mode', enabled);
      document.documentElement.setAttribute('data-od-target-mode', targetMode);
      if (enabled) setTimeout(postTargets, 0);
      else { hoveredId = null; stableHover = null; queuedHover = null; drawStart = null; removeDrawBox(); hideNativeRing(); }
      return;
    }
    if (ev.data.type !== 'od:comment-mode') return;
    enabled = !!ev.data.enabled;
    document.documentElement.toggleAttribute('data-od-comment-mode', enabled);
    document.documentElement.setAttribute('data-od-target-mode', enabled ? targetMode : 'off');
    if (enabled) setTimeout(postTargets, 0);
    else { hoveredId = null; stableHover = null; queuedHover = null; drawStart = null; removeDrawBox(); hideNativeRing(); }
  });
  function handleAnnotationSlideKey(ev){
    if (!enabled) return;
    if (ev.__odDeckBridge) return;
    var isSlideKey = ev.key === 'ArrowRight' || ev.key === 'ArrowLeft' || ev.key === 'PageDown' || ev.key === 'PageUp' || ev.key === 'Home' || ev.key === 'End';
    if (!isSlideKey) return;
    if (ev.metaKey || ev.ctrlKey) {
      var action = ev.key === 'ArrowRight' || ev.key === 'PageDown'
        ? 'next'
        : ev.key === 'ArrowLeft' || ev.key === 'PageUp'
          ? 'prev'
          : ev.key === 'Home'
            ? 'first'
            : 'last';
      window.parent.postMessage({ type: 'od:annotation-slide-nav', action: action }, '*');
    }
    ev.preventDefault();
    ev.stopPropagation();
  }
  document.addEventListener('keydown', handleAnnotationSlideKey, true);
  document.addEventListener('keyup', handleAnnotationSlideKey, true);
  window.addEventListener('keydown', handleAnnotationSlideKey, true);
  window.addEventListener('keyup', handleAnnotationSlideKey, true);
  document.addEventListener('pointerdown', function(ev){
    if (!enabled || targetMode !== 'draw') return;
    drawStart = { x: ev.clientX, y: ev.clientY };
    updateDrawBox(drawStart, drawStart);
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
  document.addEventListener('pointermove', function(ev){
    if (!enabled) return;
    if (targetMode !== 'draw') {
      var hoverEl = closestTarget(ev);
      if (!hoverEl) {
        hideNativeRing();
        return;
      }
      var hoverPayload = targetFrom(hoverEl);
      if (!hoverPayload) {
        hideNativeRing();
        return;
      }
      updateNativeRing(hoverEl, hoverPayload, false);
      postHover(hoverPayload);
      return;
    }
    if (!drawStart) return;
    updateDrawBox(drawStart, { x: ev.clientX, y: ev.clientY });
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
  document.addEventListener('pointerup', function(ev){
    if (!enabled || targetMode !== 'draw' || !drawStart) return;
    var start = drawStart;
    drawStart = null;
    var payload = drawRegionPayload(start, { x: ev.clientX, y: ev.clientY });
    removeDrawBox();
    if (payload) {
      var centerEl = null;
      try {
        centerEl = document.elementFromPoint(
          payload.position.x + payload.position.width / 2,
          payload.position.y + payload.position.height / 2
        );
      } catch (_) {}
      if (centerEl && !isDeckChrome(centerEl)) postCapturedTarget(centerEl, payload);
      else window.parent.postMessage(payload, '*');
    }
    ev.preventDefault();
    ev.stopPropagation();
  }, true);
  document.addEventListener('mouseover', function(ev){
    if (!enabled || targetMode === 'draw') return;
    var el = closestTarget(ev);
    if (!el) return;
    var payload = targetFrom(el);
    if (!payload) return;
    postHover(payload);
  }, true);
  document.addEventListener('mouseout', function(ev){
    if (!enabled || targetMode === 'draw') return;
    var el = closestTarget(ev);
    if (!el) return;
    var next = ev.relatedTarget;
    while (next && next !== document.documentElement) {
      if (next === el) return;
      next = next.parentElement;
    }
    hoveredId = null;
    stableHover = null;
    queuedHover = null;
    hideNativeRing();
    window.parent.postMessage({ type: 'od:comment-leave' }, '*');
  }, true);
  document.addEventListener('click', function(ev){
    if (!enabled) return;
    if (targetMode === 'draw') {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    var el = closestTarget(ev);
    if (!el) return;
    ev.preventDefault();
    ev.stopPropagation();
    var payload = targetFrom(el);
    if (payload) {
      updateNativeRing(el, payload, true);
      postCapturedTarget(el, payload);
    }
  }, true);
  window.addEventListener('resize', schedulePostTargets);
  document.addEventListener('scroll', schedulePostTargets, true);
  try {
    var mo = new MutationObserver(schedulePostTargets);
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-od-id', 'data-screen-label'] });
  } catch (_) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', postTargets);
  else setTimeout(postTargets, 0);
})();</script>`;
  const style = `<style data-od-comment-bridge-style>
html[data-od-comment-mode] [data-od-id],
html[data-od-comment-mode] [data-screen-label],
html[data-od-comment-mode] section,
html[data-od-comment-mode] article,
html[data-od-comment-mode] main,
html[data-od-comment-mode] header,
html[data-od-comment-mode] footer,
html[data-od-comment-mode] nav,
html[data-od-comment-mode] aside,
html[data-od-comment-mode] button,
html[data-od-comment-mode] a[href],
html[data-od-comment-mode] h1,
html[data-od-comment-mode] h2,
html[data-od-comment-mode] h3,
html[data-od-comment-mode] h4,
html[data-od-comment-mode] span,
html[data-od-comment-mode] strong,
html[data-od-comment-mode] em,
html[data-od-comment-mode] small,
html[data-od-comment-mode] b,
html[data-od-comment-mode] i,
html[data-od-comment-mode] label,
html[data-od-comment-mode] p,
html[data-od-comment-mode] li,
html[data-od-comment-mode] figure,
html[data-od-comment-mode] figcaption,
html[data-od-comment-mode] img,
html[data-od-comment-mode] video,
html[data-od-comment-mode] canvas,
html[data-od-comment-mode] svg,
html[data-od-comment-mode] table,
html[data-od-comment-mode] [role="button"],
html[data-od-comment-mode] [role="region"],
html[data-od-comment-mode] [aria-label] { cursor: crosshair !important; }
html[data-od-comment-mode][data-od-target-mode="draw"],
html[data-od-comment-mode][data-od-target-mode="draw"] * { cursor: crosshair !important; user-select: none !important; }
[data-od-draw-box] {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
  border: 1.5px solid rgba(22, 119, 255, 0.95);
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(22, 119, 255, 0.2), rgba(91, 141, 255, 0.09));
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.55) inset,
    0 18px 54px -28px rgba(22, 119, 255, 0.95);
}
[data-od-selection-ring] {
  position: fixed;
  z-index: 2147483646;
  pointer-events: none;
  opacity: 0;
  border: 1.5px solid rgba(234, 88, 12, 0.98);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(255, 247, 237, 0.04));
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.7) inset,
    0 0 0 5px rgba(234, 88, 12, 0.13),
    0 18px 54px -30px rgba(124, 45, 18, 0.8);
  transition:
    left 90ms ease,
    top 90ms ease,
    width 90ms ease,
    height 90ms ease,
    opacity 80ms ease;
}
[data-od-selection-ring]::before,
[data-od-selection-ring]::after {
  content: '';
  position: absolute;
  width: 9px;
  height: 9px;
  border-color: rgba(234, 88, 12, 0.98);
}
[data-od-selection-ring]::before {
  left: -4px;
  top: -4px;
  border-left: 2px solid;
  border-top: 2px solid;
}
[data-od-selection-ring]::after {
  right: -4px;
  bottom: -4px;
  border-right: 2px solid;
  border-bottom: 2px solid;
}
[data-od-selection-ring][data-selected] {
  border-color: rgba(22, 119, 255, 0.98);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.72) inset,
    0 0 0 5px rgba(22, 119, 255, 0.14),
    0 18px 54px -30px rgba(22, 119, 255, 0.9);
}
[data-od-selection-ring] [data-od-ring-label] {
  position: absolute;
  left: 0;
  top: -24px;
  max-width: min(260px, 80vw);
  overflow: hidden;
  border: 1px solid rgba(234, 88, 12, 0.42);
  border-radius: 999px;
  padding: 3px 8px;
  background: rgba(17, 24, 39, 0.93);
  color: white;
  font: 600 11px/1.25 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>`;
  const withStyle = /<\/head>/i.test(doc)
    ? doc.replace(/<\/head>/i, style + '</head>')
    : /<head[^>]*>/i.test(doc)
      ? doc.replace(/<head[^>]*>/i, (m) => m + style)
      : style + doc;
  if (/<\/body>/i.test(withStyle)) return withStyle.replace(/<\/body>/i, script + '</body>');
  return withStyle + script;
}

// The deck bridge supports three deck conventions found across our skills
// and freeform-generated artifacts:
//   1. Horizontal scroll decks (simple-deck, guizang-ppt) — slides laid out
//      side-by-side, navigation = scrollTo({ left }).
//   2. Class-toggle decks (deck-framework, freeform pitches) — one slide
//      carries `.active` or `.is-active`; siblings are display:none. Their
//      own JS listens for ArrowRight/Left, so we drive them by dispatching
//      synthetic KeyboardEvents.
//   3. Visibility-only decks — no class toggle, slides hidden via inline
//      style. We fall back to keyboard dispatch + visibility detection.
//
// All three report `{ active, count }` back to the host so the toolbar can
// render a unified counter. A MutationObserver on each `.slide` lets us
// catch class changes from the deck's own keyboard handler.
//
// We also inject a small CSS override that fixes a common authoring
// mistake in fixed-canvas decks: a `.stage { display: grid; place-items:
// center }` only centers items within their grid cells, but the track
// itself stays `start`-aligned, so the 1920x1080 canvas top-lefts at
// (0,0) of the stage. Combined with `transform-origin: center center`,
// the scaled canvas ends up offset toward the bottom-right of any
// preview that's smaller than 1920x1080 — exactly what users see in the
// sandbox iframe. `place-content: center` centers the track itself.
function injectDeckBridge(doc: string, initialSlideIndex = 0): string {
  const safeInitialSlideIndex = Number.isFinite(initialSlideIndex)
    ? Math.max(0, Math.floor(initialSlideIndex))
    : 0;
  const styleFix = `<style data-od-deck-fix>
.stage, .deck-stage, .deck-shell { place-content: center !important; }
</style>`;
  const docWithStyle = /<\/head>/i.test(doc)
    ? doc.replace(/<\/head>/i, styleFix + "</head>")
    : /<head[^>]*>/i.test(doc)
    ? doc.replace(/<head[^>]*>/i, (m) => m + styleFix)
    : styleFix + doc;
  doc = docWithStyle;
  const script = `<script>(function(){
  var initialSlideIndex = ${safeInitialSlideIndex};
  var didRestoreInitialSlide = initialSlideIndex <= 0;
  function deckStage(){
    return document.querySelector('deck-stage');
  }
  function stageSlides(stage){
    return stage ? Array.prototype.slice.call(stage.children || []).filter(function(child){
      return child && child.nodeType === 1 && !/^(SCRIPT|STYLE|TEMPLATE)$/i.test(child.tagName || '');
    }) : [];
  }
  function slides(){
    var stage = deckStage();
    var stageItems = stageSlides(stage);
    if (stageItems.length) return stageItems;
    return Array.prototype.slice.call(document.querySelectorAll('.slide, [data-deck-slide]'));
  }
  function hasDeckStageApi(){
    var stage = deckStage();
    return !!(stage && typeof stage.goTo === 'function' && typeof stage.next === 'function' && typeof stage.prev === 'function');
  }
  function scroller(){
    if (document.body && document.body.scrollWidth > document.body.clientWidth + 1) return document.body;
    return document.scrollingElement || document.documentElement;
  }
  function isScrollDeck(){
    var sc = scroller();
    return !!(sc && sc.scrollWidth > sc.clientWidth + 1);
  }
  function findActiveByClass(list){
    for (var i=0; i<list.length; i++) {
      var cl = list[i].classList;
      if (cl && (cl.contains('is-active') || cl.contains('active') || cl.contains('current'))) return i;
    }
    return -1;
  }
  function findActiveByVisibility(list){
    for (var i=0; i<list.length; i++) {
      try {
        var cs = window.getComputedStyle(list[i]);
        if (cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0') return i;
      } catch (_) {}
    }
    return -1;
  }
  function activeIndex(list){
    if (!list || !list.length) return 0;
    var stage = deckStage();
    if (stage && typeof stage.index === 'number') return Math.max(0, Math.min(list.length - 1, stage.index));
    if (isScrollDeck()) {
      var w = Math.max(1, window.innerWidth);
      return Math.max(0, Math.min(list.length - 1, Math.round(scroller().scrollLeft / w)));
    }
    var byClass = findActiveByClass(list);
    if (byClass >= 0) return byClass;
    for (var i = 0; i < list.length; i++) {
      if (list[i].hasAttribute && list[i].hasAttribute('data-deck-active')) return i;
    }
    var byVis = findActiveByVisibility(list);
    if (byVis >= 0) return byVis;
    return 0;
  }
  function dispatchKey(key){
    // Bubbles so any listener on window picks it up too. We dispatch on
    // document only — dispatching on window/body in addition would cause
    // bubbling to fire the same document-level listener twice.
    try {
      var down = new KeyboardEvent('keydown', { key: key, code: key, bubbles: true, cancelable: true, composed: true });
      var up = new KeyboardEvent('keyup', { key: key, code: key, bubbles: true, cancelable: true, composed: true });
      try { Object.defineProperty(down, '__odDeckBridge', { value: true }); } catch (_) {}
      try { Object.defineProperty(up, '__odDeckBridge', { value: true }); } catch (_) {}
      document.dispatchEvent(down);
      document.dispatchEvent(up);
    } catch (_) {}
  }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function activeClassName(list){
    var names = ['active', 'is-active', 'current'];
    for (var n=0; n<names.length; n++) {
      for (var i=0; i<list.length; i++) {
        if (list[i].classList && list[i].classList.contains(names[n])) return names[n];
      }
    }
    return 'active';
  }
  function canSetActive(list){
    if (findActiveByClass(list) >= 0) return true;
    for (var i=0; i<list.length; i++) {
      if (list[i].style.display === 'none') return true;
      if (list[i].style.visibility === 'hidden') return true;
      if (list[i].hasAttribute('hidden')) return true;
    }
    return false;
  }
  function updateDeckChrome(i, count){
    var cur = document.getElementById('deck-cur');
    var total = document.getElementById('deck-total');
    var prev = document.getElementById('deck-prev');
    var next = document.getElementById('deck-next');
    if (cur) cur.textContent = pad2(i + 1);
    if (total) total.textContent = pad2(count);
    if (prev) prev.toggleAttribute('disabled', i <= 0);
    if (next) next.toggleAttribute('disabled', i >= count - 1);
  }
  function setActive(i){
    var list = slides();
    if (!list.length) return false;
    var target = Math.max(0, Math.min(list.length - 1, i));
    var activeClass = activeClassName(list);
    var usesInlineDisplay = false;
    var usesInlineVisibility = false;
    var usesHidden = false;
    for (var j=0; j<list.length; j++) {
      usesInlineDisplay = usesInlineDisplay || list[j].style.display === 'none';
      usesInlineVisibility = usesInlineVisibility || list[j].style.visibility === 'hidden';
      usesHidden = usesHidden || list[j].hasAttribute('hidden');
    }
    for (var k=0; k<list.length; k++) {
      if (list[k].classList) {
        list[k].classList.remove('active', 'is-active', 'current');
        if (k === target) list[k].classList.add(activeClass);
      }
      if (usesHidden) {
        if (k === target) list[k].removeAttribute('hidden');
        else list[k].setAttribute('hidden', '');
      }
      if (usesInlineDisplay && list[k].style) {
        list[k].style.display = k === target ? '' : 'none';
      }
      if (usesInlineVisibility && list[k].style) {
        list[k].style.visibility = k === target ? '' : 'hidden';
      }
    }
    updateDeckChrome(target, list.length);
    report();
    return true;
  }
  function scrollGo(i){
    var list = slides();
    var next = Math.max(0, Math.min(list.length - 1, i));
    scroller().scrollTo({ left: next * window.innerWidth, behavior: 'smooth' });
    setTimeout(report, 380);
  }
  function targetFor(action, list){
    var i = activeIndex(list);
    if (action === 'next') return i + 1;
    if (action === 'prev') return i - 1;
    if (action === 'first') return 0;
    if (action === 'last') return list.length - 1;
    return i;
  }
  function go(action){
    var list = slides();
    if (!list.length) return;
    var target = Math.max(0, Math.min(list.length - 1, targetFor(action, list)));
    var stage = deckStage();
    if (hasDeckStageApi()) {
      if (action === 'next') stage.next();
      else if (action === 'prev') stage.prev();
      else if (action === 'first') stage.goTo(0);
      else if (action === 'last') stage.goTo(list.length - 1);
      else stage.goTo(target);
      setTimeout(report, 60);
      return;
    }
    if (isScrollDeck()) {
      scrollGo(target);
      return;
    }
    if (canSetActive(list) && setActive(target)) return;
    if (action === 'next') dispatchKey('ArrowRight');
    else if (action === 'prev') dispatchKey('ArrowLeft');
    else if (action === 'first') dispatchKey('Home');
    else if (action === 'last') dispatchKey('End');
    setTimeout(report, 280);
  }
  function gotoIndex(i){
    var list = slides();
    if (!list.length) return;
    var target = Math.max(0, Math.min(list.length - 1, i));
    var stage = deckStage();
    if (hasDeckStageApi()) {
      stage.goTo(target);
      setTimeout(report, 60);
      return;
    }
    if (isScrollDeck()) { scrollGo(target); return; }
    if (canSetActive(list) && setActive(target)) return;
    var current = activeIndex(list);
    var diff = target - current;
    if (!diff) { report(); return; }
    var key = diff > 0 ? 'ArrowRight' : 'ArrowLeft';
    var n = Math.abs(diff);
    for (var k = 0; k < n; k++) dispatchKey(key);
    setTimeout(report, 320);
  }
  function report(){
    try {
      var list = slides();
      window.parent.postMessage({
        type: 'od:slide-state',
        active: activeIndex(list),
        count: list.length,
      }, '*');
    } catch (e) {}
  }
  function restoreInitialSlide(){
    if (didRestoreInitialSlide) { report(); return; }
    var list = slides();
    if (!list.length) return;
    didRestoreInitialSlide = true;
    gotoIndex(initialSlideIndex);
  }
  window.addEventListener('message', function(ev){
    var data = ev && ev.data;
    if (!data || data.type !== 'od:slide') return;
    if (data.action === 'go' && typeof data.index === 'number') gotoIndex(data.index);
    else go(data.action);
  });
  function ownDeckButton(id, action){
    var btn = document.getElementById(id);
    if (!btn || btn.__odDeckOwned) return;
    btn.__odDeckOwned = true;
    btn.setAttribute('data-od-deck-chrome', 'true');
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      go(action);
    }, true);
  }
  ownDeckButton('deck-prev', 'prev');
  ownDeckButton('deck-next', 'next');
  document.addEventListener('slidechange', function(){ setTimeout(report, 0); }, true);
  // Report once on load and on every scroll-end so the host stays in sync.
  window.addEventListener('load', function(){ setTimeout(restoreInitialSlide, 200); });
  document.addEventListener('scroll', function(){
    clearTimeout(window.__odReportT);
    window.__odReportT = setTimeout(report, 120);
  }, { passive: true, capture: true });
  // Nudge the deck's own fit/resize listener after layout settles. Fixed-canvas
  // decks (e.g. ".canvas { width: 1920px }" + "transform: scale(...)") compute
  // their scale on first run, which fires when the iframe is still 0x0 in
  // sandboxed previews — the deck's fit() then resolves to scale(0) / scale(1)
  // and never recovers. Re-firing 'resize' lets the deck recompute, and a
  // ResizeObserver picks up later layout settles (zoom toggle, sidebar drag).
  function nudgeResize(){
    try { window.dispatchEvent(new Event('resize')); }
    catch (_) {}
  }
  // Aggressively nudge during the first second so the deck catches the
  // iframe's first non-zero size; bail out early once the iframe reports a
  // real width. Without this loop, fixed-canvas decks render at scale(0).
  function chaseFirstLayout(){
    var attempts = 0;
    function tick(){
      attempts += 1;
      var w = window.innerWidth;
      nudgeResize();
      if (w > 0 && attempts >= 2) return; // one extra nudge after first non-zero
      if (attempts < 30) setTimeout(tick, 50);
    }
    tick();
  }
  if (document.readyState === 'complete') chaseFirstLayout();
  else window.addEventListener('load', chaseFirstLayout);
  // Re-nudge whenever the iframe itself is resized by the host (e.g.
  // user toggles zoom, resizes the chat sidebar, exits Present).
  if (typeof ResizeObserver !== 'undefined') {
    try {
      var ro = new ResizeObserver(function(){ nudgeResize(); });
      ro.observe(document.documentElement);
    } catch (_) {}
  }
  // For class-toggle decks the deck's own keyboard handler updates classes
  // on the slide elements; an attribute observer translates that into the
  // host counter without depending on scroll events.
  function observeSlides(){
    var list = slides();
    if (!list.length) { setTimeout(observeSlides, 150); return; }
    try {
      var mo = new MutationObserver(function(){
        clearTimeout(window.__odReportT2);
        window.__odReportT2 = setTimeout(report, 60);
      });
      for (var i = 0; i < list.length; i++) {
        mo.observe(list[i], { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-deck-active'] });
      }
    } catch (e) {}
    setTimeout(restoreInitialSlide, 100);
  }
  observeSlides();
})();</script>`;
  if (/<\/body>/i.test(doc))
    return doc.replace(/<\/body>/i, `${script}</body>`);
  return doc + script;
}
