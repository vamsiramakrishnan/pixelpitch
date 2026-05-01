"""DOM walker: runs in-page to extract a flat list of element snapshots."""

from __future__ import annotations

from typing import Any

from playwright.async_api import Page

from slidify.models import BoundingBox, DomElement, TextRun

# Maximum SVG primitive count that the walker captures geometry for and that
# the tier-1 classifier accepts on the native path. Beyond this, the SVG is
# treated as a complex illustration and rasterized cleanly. The two sites
# (this constant and `classifier.tier1._has_complex_svg`) MUST stay aligned —
# a mismatch creates a "dead band" where the walker drops geometry but the
# classifier still routes the unit to the native emitter, which then emits
# an empty shell. Real-world charts (50+ data points + axis ticks + gridlines)
# and architecture diagrams (40-80 connectors) routinely exceed the previous
# cap of 30; the bumped budget keeps them on the native path.
SVG_NATIVE_PATH_BUDGET = 200

# Walks the DOM in-page and produces an array of element records.
# Skips invisible elements and <head>. Captures bbox, computed style,
# pseudo-element presence, and slidify hints.
_WALKER_JS_TEMPLATE = r"""
() => {
    const out = [];
    let nextId = 0;

    function buildStableSelector(el) {
        if (el.id) {
            try { return '#' + CSS.escape(el.id); } catch (_) {}
        }
        const path = [];
        let node = el;
        while (node && node.nodeType === 1 && node !== document.body && node.parentElement) {
            const idx = Array.from(node.parentElement.children).indexOf(node) + 1;
            path.unshift(node.tagName.toLowerCase() + ':nth-child(' + idx + ')');
            node = node.parentElement;
        }
        if (node === document.body) path.unshift('body');
        return path.join(' > ');
    }

    function isInteresting(content) {
        return !!content && content !== 'none' && content !== '""' && content !== "''" && content !== 'normal';
    }

    const INLINE_FORMATTING_TAGS = new Set([
        'SPAN', 'EM', 'STRONG', 'B', 'I', 'U', 'A', 'CODE', 'SMALL',
        'MARK', 'SUP', 'SUB', 'INS', 'DEL', 'KBD', 'ABBR', 'CITE',
    ]);

    function pseudoSnapshot(cs) {
        return {
            background_color: cs.backgroundColor || 'rgba(0, 0, 0, 0)',
            background_image: cs.backgroundImage || 'none',
            color: cs.color || 'rgb(0,0,0)',
            font_family: cs.fontFamily || '',
            font_size: cs.fontSize || '16px',
            font_weight: cs.fontWeight || '400',
            position: cs.position || 'static',
            border_radius: cs.borderRadius || '0px',
        };
    }

    function isTextContainer(el) {
        // Element has at least one non-empty text node AND every element
        // child is an inline formatting tag (or BR). Text containers emit as
        // one text frame with multiple styled runs.
        let hasText = false;
        for (const node of el.childNodes) {
            if (node.nodeType === 3) {
                if ((node.textContent || '').trim()) hasText = true;
            } else if (node.nodeType === 1) {
                const t = node.tagName;
                if (t !== 'BR' && !INLINE_FORMATTING_TAGS.has(t)) return false;
            }
        }
        return hasText;
    }

    function collectRuns(el) {
        const out = [];
        const cs = getComputedStyle(el);
        // Capture this element's bg-image so the Python emitter can substitute
        // a solid color when the run uses gradient-clipped text
        // (background-clip: text + color: transparent).
        const bgImage = cs.backgroundImage || 'none';
        for (const node of el.childNodes) {
            if (node.nodeType === 3) {
                const txt = node.textContent || '';
                if (!txt) continue;
                // Capture browser-derived line boxes for this text node via
                // Range.getClientRects(). Each rect is one visual line at
                // its exact rendered position. The Python emitter uses
                // these as ground truth so a wrapped headline lands at the
                // pixel-precise lines the source rendered, instead of
                // being squeezed into the unit's bbox and re-flowed.
                let lineBoxes = [];
                try {
                    const r = document.createRange();
                    r.selectNodeContents(node);
                    const rects = r.getClientRects();
                    for (const rect of rects) {
                        if (rect.width > 0 && rect.height > 0) {
                            lineBoxes.push({
                                x: rect.x, y: rect.y,
                                w: rect.width, h: rect.height,
                            });
                        }
                    }
                } catch (_) {}
                out.push({
                    text: txt,
                    font_family: cs.fontFamily,
                    font_size: cs.fontSize,
                    font_weight: cs.fontWeight,
                    color: cs.color,
                    background_image: bgImage,
                    italic: cs.fontStyle === 'italic',
                    underline: cs.textDecorationLine && cs.textDecorationLine.includes('underline'),
                    is_break: false,
                    line_boxes: lineBoxes,
                });
            } else if (node.nodeType === 1) {
                if (node.tagName === 'BR') {
                    out.push({ text: '\n', is_break: true });
                    continue;
                }
                // Recurse with the child's own computed style.
                const sub = collectRuns(node);
                if (sub.length > 0) {
                    // CSS `margin-left` / `margin-right` on an inline child
                    // creates a visible gap that the source HTML doesn't
                    // express as whitespace (`<span>Q1</span>Foundation` →
                    // CSS margin makes "Q1 Foundation"). Insert ASCII
                    // spaces so the gap survives into the PPTX runs.
                    const ccs = getComputedStyle(node);
                    const mlPx = parseFloat(ccs.marginLeft || '0') || 0;
                    const mrPx = parseFloat(ccs.marginRight || '0') || 0;
                    if (mlPx >= 3) sub[0].text = ' ' + sub[0].text;
                    if (mrPx >= 3) sub[sub.length - 1].text = sub[sub.length - 1].text + ' ';
                }
                for (const r of sub) out.push(r);
            }
        }
        return out;
    }

    function snapshot(el, parentId, depth) {
        // Skip non-element nodes and <head>/<script>/<style>
        if (!el || el.nodeType !== 1) return null;
        const tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'META' || tag === 'LINK' || tag === 'NOSCRIPT') return null;

        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);

        const isHidden = cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0;
        // Allow zero-size elements only if they may still render via pseudos/decoration; otherwise skip.
        if (isHidden) return null;
        if ((r.width < 1 || r.height < 1)) {
            // Some parents have 0 size but children render; recurse without recording.
            for (const child of el.children) snapshot(child, parentId, depth + 1);
            return null;
        }

        const id = nextId++;

        let before = null, after = null, hasBefore = false, hasAfter = false;
        let pseudoBeforeStyle = null, pseudoAfterStyle = null;
        try {
            const csb = getComputedStyle(el, '::before');
            const csa = getComputedStyle(el, '::after');
            if (isInteresting(csb.content)) {
                hasBefore = true; before = csb.content;
                pseudoBeforeStyle = pseudoSnapshot(csb);
            }
            if (isInteresting(csa.content)) {
                hasAfter = true; after = csa.content;
                pseudoAfterStyle = pseudoSnapshot(csa);
            }
        } catch (_) {}

        // Leaf-text detection: only text node children, non-empty
        let isLeafText = el.children.length === 0 && (el.textContent || '').trim().length > 0;
        // Text container: text + only inline formatting children. Emitter
        // renders as a single text frame with multiple styled runs.
        const textContainer = !isLeafText && el.children.length > 0 && isTextContainer(el);
        const runs = textContainer ? collectRuns(el) : null;

        // SVG path count (for tier 1 complexity rule)
        let svgPathCount = 0;
        let svgShapes = null;
        if (tag === 'SVG' || tag === 'svg') {
            try {
                // Skip primitives inside <defs> — those are definitions
                // (markers / gradients-as-defs / symbols / patterns) consumed
                // by other elements, not visible drawing primitives. The
                // walker counts and emits the *visible* drawing primitives only.
                const inDefs = (n) => {
                    let p = n.parentNode;
                    while (p && p !== el) {
                        if (p.tagName && p.tagName.toLowerCase() === 'defs') return true;
                        p = p.parentNode;
                    }
                    return false;
                };
                const allShapes = Array.from(
                    el.querySelectorAll('path, polygon, polyline, circle, rect, ellipse, line')
                ).filter(s => !inDefs(s));
                // Capture <text> children too — slidify emits these as
                // textboxes alongside the freeform shapes. Without this,
                // brutalist schematics / chart axis labels / annotated
                // callouts render their boxes/lines but lose every label.
                const allTexts = Array.from(
                    el.querySelectorAll('text')
                ).filter(t => !inDefs(t));
                svgPathCount = allShapes.length;
                // Capture geometry for SVGs up to __SVG_NATIVE_PATH_BUDGET__
                // primitives (kept in sync with classifier.tier1). Real-world
                // charts (line/bar with 50+ data points + ticks + gridlines)
                // and architecture diagrams (40-80 connectors) routinely
                // exceed the older cap of 30. The classifier's simple/complex
                // SVG rules scope to a unit's direct elements only, so a
                // large overlay SVG can't absorb sibling content even when
                // its bbox spans most of the slide.
                if (svgPathCount > 0 && svgPathCount <= __SVG_NATIVE_PATH_BUDGET__) {
                    const svgRect = el.getBoundingClientRect();
                    svgShapes = [];
                    for (const s of allShapes) {
                        const sCs = getComputedStyle(s);
                        const ss = { tag: s.tagName.toLowerCase(),
                                     fill: s.getAttribute('fill') || sCs.fill || 'none',
                                     stroke: s.getAttribute('stroke') || sCs.stroke || 'none',
                                     stroke_width: parseFloat(s.getAttribute('stroke-width') || sCs.strokeWidth || '0') || 0,
                                     fill_opacity: parseFloat(s.getAttribute('fill-opacity') || sCs.fillOpacity || '1'),
                                     stroke_opacity: parseFloat(s.getAttribute('stroke-opacity') || sCs.strokeOpacity || '1') };
                        if (s.tagName === 'rect') {
                            ss.x = parseFloat(s.getAttribute('x') || '0');
                            ss.y = parseFloat(s.getAttribute('y') || '0');
                            ss.w = parseFloat(s.getAttribute('width') || '0');
                            ss.h = parseFloat(s.getAttribute('height') || '0');
                            ss.rx = parseFloat(s.getAttribute('rx') || '0');
                        } else if (s.tagName === 'circle') {
                            ss.cx = parseFloat(s.getAttribute('cx') || '0');
                            ss.cy = parseFloat(s.getAttribute('cy') || '0');
                            ss.r = parseFloat(s.getAttribute('r') || '0');
                        } else if (s.tagName === 'ellipse') {
                            ss.cx = parseFloat(s.getAttribute('cx') || '0');
                            ss.cy = parseFloat(s.getAttribute('cy') || '0');
                            ss.rx = parseFloat(s.getAttribute('rx') || '0');
                            ss.ry = parseFloat(s.getAttribute('ry') || '0');
                        } else if (s.tagName === 'line') {
                            ss.x1 = parseFloat(s.getAttribute('x1') || '0');
                            ss.y1 = parseFloat(s.getAttribute('y1') || '0');
                            ss.x2 = parseFloat(s.getAttribute('x2') || '0');
                            ss.y2 = parseFloat(s.getAttribute('y2') || '0');
                        } else if (s.tagName === 'polygon' || s.tagName === 'polyline') {
                            ss.points = s.getAttribute('points') || '';
                        } else {
                            // path — skip detailed parsing for v1
                            ss.d = s.getAttribute('d') || '';
                        }
                        svgShapes.push(ss);
                    }
                    // Add <text> children alongside the shapes. Each
                    // captured with attribute coords + computed style
                    // (font / size / fill / anchor) so the emitter can
                    // place a PPTX textbox at the right pixel.
                    for (const t of allTexts) {
                        const tcs = getComputedStyle(t);
                        svgShapes.push({
                            tag: 'text',
                            text: t.textContent || '',
                            x: parseFloat(t.getAttribute('x') || '0'),
                            y: parseFloat(t.getAttribute('y') || '0'),
                            font_size: parseFloat(t.getAttribute('font-size') || tcs.fontSize || '14') || 14,
                            font_weight: t.getAttribute('font-weight') || tcs.fontWeight || '400',
                            font_family: tcs.fontFamily || 'Inter',
                            font_style: tcs.fontStyle || 'normal',
                            fill: t.getAttribute('fill') || tcs.fill || '#000',
                            text_anchor: t.getAttribute('text-anchor') || 'start',
                        });
                    }
                    // Embed _svgRect on every shape dict — JS array
                    // properties don't survive JSON serialization, but
                    // dict items do. Capture viewBox + preserveAspectRatio
                    // so the Python side can map SVG userspace units (which
                    // may be very different from viewport pixels) into the
                    // slide. Without this, an SVG with viewBox="0 0 100 100"
                    // rendered into a 1280×720 box has every coordinate off
                    // by a factor of ~12.
                    let viewBox = null;
                    try {
                        const vb = el.viewBox && el.viewBox.baseVal;
                        if (vb && (vb.width > 0 || vb.height > 0)) {
                            viewBox = [vb.x, vb.y, vb.width, vb.height];
                        } else if (el.getAttribute('viewBox')) {
                            const parts = el.getAttribute('viewBox').trim().split(/[\s,]+/).map(parseFloat);
                            if (parts.length === 4 && parts.every(n => Number.isFinite(n))) {
                                viewBox = parts;
                            }
                        }
                    } catch (_) {}
                    const preserveAspectRatio = el.getAttribute('preserveAspectRatio') || null;
                    const rect = {
                        x: svgRect.x,
                        y: svgRect.y,
                        w: svgRect.width,
                        h: svgRect.height,
                        viewBox: viewBox,
                        preserveAspectRatio: preserveAspectRatio,
                    };
                    for (const sh of svgShapes) sh._svgRect = rect;
                }
            } catch (_) {}
        }

        const ds = el.dataset || {};

        out.push({
            id,
            parent_id: parentId,
            depth,
            tag,
            cls: typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '',
            bbox: { x: r.x, y: r.y, w: r.width, h: r.height },
            z_index: cs.zIndex === 'auto' ? 0 : (parseInt(cs.zIndex, 10) || 0),
            transform: cs.transform || 'none',
            opacity: parseFloat(cs.opacity || '1'),
            overflow: cs.overflow || 'visible',
            background_color: cs.backgroundColor || 'rgba(0, 0, 0, 0)',
            background_image: cs.backgroundImage || 'none',
            border: cs.border || 'none',
            border_top: cs.borderTop || 'none',
            border_radius: cs.borderRadius || '0px',
            box_shadow: cs.boxShadow || 'none',
            filter: cs.filter || 'none',
            clip_path: cs.clipPath || 'none',
            mix_blend_mode: cs.mixBlendMode || 'normal',
            backdrop_filter: cs.backdropFilter || 'none',
            background_clip: cs.backgroundClip || 'border-box',
            text: isLeafText ? el.textContent : (textContainer ? el.textContent : null),
            is_text_container: textContainer,
            runs: runs,
            font_family: cs.fontFamily || '',
            font_size: cs.fontSize || '16px',
            font_weight: cs.fontWeight || '400',
            color: cs.color || 'rgb(0, 0, 0)',
            text_align: cs.textAlign || 'start',
            line_height: cs.lineHeight || 'normal',
            has_before: hasBefore,
            has_after: hasAfter,
            before_content: before,
            after_content: after,
            pseudo_before_style: pseudoBeforeStyle,
            pseudo_after_style: pseudoAfterStyle,
            is_canvas: tag === 'CANVAS',
            is_svg: tag === 'SVG' || tag === 'svg',
            is_img: tag === 'IMG',
            is_video: tag === 'VIDEO',
            img_src: tag === 'IMG' ? (el.currentSrc || el.src || null) : null,
            svg_path_count: svgPathCount,
            svg_shapes: svgShapes,
            pptx_role: ds.pptxRole || null,
            pptx_rasterize: ds.pptxRasterize === 'true',
            pptx_skip: ds.pptxSkip === 'true',
            pptx_text: ds.pptxText || null,
            pptx_notes: ds.pptxNotes || null,
            aria_label: el.getAttribute('aria-label'),
            stable_selector: buildStableSelector(el),
            decorate_hint: ds.slidifyDecorate || '',
        });

        // If we captured this element as a text container, don't recurse —
        // the runs already include all inline children's text and styling.
        if (!textContainer) {
            for (const child of el.children) snapshot(child, id, depth + 1);
        }
        return id;
    }

    snapshot(document.body, null, 0);
    return out;
}
"""


WALKER_JS = _WALKER_JS_TEMPLATE.replace(
    "__SVG_NATIVE_PATH_BUDGET__", str(SVG_NATIVE_PATH_BUDGET)
)


async def walk(page: Page) -> list[DomElement]:
    """Run the in-page walker and parse results into DomElement models."""
    raw: list[dict[str, Any]] = await page.evaluate(WALKER_JS)
    elements: list[DomElement] = []
    for entry in raw:
        bb = entry["bbox"]
        elements.append(
            DomElement(
                id=entry["id"],
                parent_id=entry["parent_id"],
                depth=entry["depth"],
                tag=entry["tag"],
                cls=entry["cls"] or "",
                bbox=BoundingBox(x=bb["x"], y=bb["y"], w=bb["w"], h=bb["h"]),
                z_index=entry["z_index"],
                transform=entry["transform"],
                opacity=entry["opacity"],
                overflow=entry["overflow"],
                background_color=entry["background_color"],
                background_image=entry["background_image"],
                border=entry["border"],
                border_top=entry["border_top"],
                border_radius=entry["border_radius"],
                box_shadow=entry["box_shadow"],
                filter=entry["filter"],
                clip_path=entry["clip_path"],
                mix_blend_mode=entry.get("mix_blend_mode", "normal"),
                backdrop_filter=entry.get("backdrop_filter", "none"),
                background_clip=entry.get("background_clip", "border-box"),
                text=entry["text"],
                is_text_container=entry.get("is_text_container", False),
                runs=[
                    TextRun(
                        text=r.get("text", ""),
                        font_family=r.get("font_family", ""),
                        font_size=r.get("font_size", "16px"),
                        font_weight=r.get("font_weight", "400"),
                        color=r.get("color", "rgb(0, 0, 0)"),
                        background_image=r.get("background_image", "none"),
                        italic=r.get("italic", False),
                        underline=r.get("underline", False),
                        is_break=r.get("is_break", False),
                        line_boxes=[
                            BoundingBox(
                                x=lb["x"], y=lb["y"], w=lb["w"], h=lb["h"]
                            )
                            for lb in (r.get("line_boxes") or [])
                        ],
                    )
                    for r in (entry.get("runs") or [])
                ] if entry.get("runs") else None,
                font_family=entry["font_family"],
                font_size=entry["font_size"],
                font_weight=entry["font_weight"],
                color=entry["color"],
                text_align=entry["text_align"],
                line_height=entry["line_height"],
                has_before=entry["has_before"],
                has_after=entry["has_after"],
                before_content=entry["before_content"],
                after_content=entry["after_content"],
                pseudo_before_style=entry.get("pseudo_before_style"),
                pseudo_after_style=entry.get("pseudo_after_style"),
                is_canvas=entry["is_canvas"],
                is_svg=entry["is_svg"],
                is_img=entry["is_img"],
                is_video=entry["is_video"],
                img_src=entry["img_src"],
                svg_path_count=entry["svg_path_count"],
                svg_shapes=entry.get("svg_shapes"),
                pptx_role=entry["pptx_role"],
                pptx_rasterize=entry["pptx_rasterize"],
                pptx_skip=entry["pptx_skip"],
                pptx_text=entry["pptx_text"],
                pptx_notes=entry["pptx_notes"],
                aria_label=entry["aria_label"],
                stable_selector=entry["stable_selector"],
                decorate_hint=entry.get("decorate_hint", ""),
            )
        )
    return elements
