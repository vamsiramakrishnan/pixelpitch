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
  function selectorFor(el, id){
    if (el.hasAttribute('data-od-id')) return '[data-od-id="' + esc(el.getAttribute('data-od-id')) + '"]';
    if (el.hasAttribute('data-screen-label')) return '[data-screen-label="' + esc(el.getAttribute('data-screen-label')) + '"]';
    if (el.id) return '#' + esc(el.id);
    var tag = el.tagName ? el.tagName.toLowerCase() : 'element';
    var cls = el.classList && el.classList.length ? '.' + Array.prototype.slice.call(el.classList, 0, 3).map(esc).join('.') : '';
    var parent = el.parentElement;
    if (!parent) return tag + cls;
    var siblings = Array.prototype.filter.call(parent.children || [], function(child){ return child.tagName === el.tagName; });
    var index = Math.max(0, indexOfElement(el, siblings)) + 1;
    return tag + cls + ':nth-of-type(' + index + ')';
  }
  function targetFrom(el){
    var id = generatedId(el);
    if (!id) return null;
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
    var slide = el.closest ? el.closest('.slide, [data-screen-label]') : null;
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
  function allTargets(){
    var nodes = document.querySelectorAll('[data-od-id], [data-screen-label], .slide, section, article, main, header, footer, nav, aside, button, a[href], h1, h2, h3, h4, p, li, figure, figcaption, img, video, canvas, svg, table, [role="button"], [role="region"], [aria-label]');
    var items = [];
    for (var i = 0; i < nodes.length; i++) {
      var item = targetFrom(nodes[i]);
      if (item) items.push(item);
      if (items.length >= 180) break;
    }
    return items;
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
    if (path && path.length) {
      for (var i = 0; i < path.length; i++) {
        var node = path[i];
        if (!node || !node.matches || node === document.body || node === document.documentElement) continue;
        if (node.matches('script, style, link, meta, head')) continue;
        var candidate = targetFrom(node);
        if (candidate) return node;
      }
    }
    var el = event.target;
    while (el && el !== document.documentElement) {
      if (el.getAttribute && (el.hasAttribute('data-od-id') || el.hasAttribute('data-screen-label'))) return el;
      if (el.matches && el.matches('section, article, main, header, footer, nav, aside, button, a[href], h1, h2, h3, h4, p, li, figure, figcaption, img, video, canvas, svg, table, [role="button"], [role="region"], [aria-label]')) return el;
      el = el.parentElement;
    }
    return null;
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
      else hoveredId = null;
      return;
    }
    if (ev.data.type !== 'od:comment-mode') return;
    enabled = !!ev.data.enabled;
    document.documentElement.toggleAttribute('data-od-comment-mode', enabled);
    document.documentElement.setAttribute('data-od-target-mode', enabled ? targetMode : 'off');
    if (enabled) setTimeout(postTargets, 0);
    else hoveredId = null;
  });
  document.addEventListener('mouseover', function(ev){
    if (!enabled) return;
    var el = closestTarget(ev);
    if (!el) return;
    var payload = targetFrom(el);
    if (!payload || payload.elementId === hoveredId) return;
    hoveredId = payload.elementId;
    window.parent.postMessage(Object.assign({}, payload, { type: 'od:comment-hover' }), '*');
  }, true);
  document.addEventListener('mouseout', function(ev){
    if (!enabled) return;
    var el = closestTarget(ev);
    if (!el) return;
    var next = ev.relatedTarget;
    while (next && next !== document.documentElement) {
      if (next === el) return;
      next = next.parentElement;
    }
    hoveredId = null;
    window.parent.postMessage({ type: 'od:comment-leave' }, '*');
  }, true);
  document.addEventListener('click', function(ev){
    if (!enabled) return;
    var el = closestTarget(ev);
    if (!el) return;
    ev.preventDefault();
    ev.stopPropagation();
    var payload = targetFrom(el);
    if (payload) window.parent.postMessage(payload, '*');
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
  function slides(){ return document.querySelectorAll('.slide'); }
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
    if (isScrollDeck()) {
      var w = Math.max(1, window.innerWidth);
      return Math.max(0, Math.min(list.length - 1, Math.round(scroller().scrollLeft / w)));
    }
    var byClass = findActiveByClass(list);
    if (byClass >= 0) return byClass;
    var byVis = findActiveByVisibility(list);
    if (byVis >= 0) return byVis;
    return 0;
  }
  function dispatchKey(key){
    // Bubbles so any listener on window picks it up too. We dispatch on
    // document only — dispatching on window/body in addition would cause
    // bubbling to fire the same document-level listener twice.
    var init = { key: key, code: key, bubbles: true, cancelable: true, composed: true };
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', init));
      document.dispatchEvent(new KeyboardEvent('keyup', init));
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
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      go(action);
    }, true);
  }
  ownDeckButton('deck-prev', 'prev');
  ownDeckButton('deck-next', 'next');
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
        mo.observe(list[i], { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
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
