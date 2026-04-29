"""DOM walker: runs in-page to extract a flat list of element snapshots."""

from __future__ import annotations

from typing import Any

from playwright.async_api import Page

from slidify.models import BoundingBox, DomElement

# Walks the DOM in-page and produces an array of element records.
# Skips invisible elements and <head>. Captures bbox, computed style,
# pseudo-element presence, and slidify hints.
WALKER_JS = r"""
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
        try {
            const csb = getComputedStyle(el, '::before');
            const csa = getComputedStyle(el, '::after');
            if (isInteresting(csb.content)) { hasBefore = true; before = csb.content; }
            if (isInteresting(csa.content)) { hasAfter = true; after = csa.content; }
        } catch (_) {}

        // Leaf-text detection: only text node children, non-empty
        let isLeafText = el.children.length === 0 && (el.textContent || '').trim().length > 0;

        // SVG path count (for tier 1 complexity rule)
        let svgPathCount = 0;
        if (tag === 'SVG' || tag === 'svg') {
            try { svgPathCount = el.querySelectorAll('path, polygon, polyline, circle, rect, ellipse, line').length; } catch (_) {}
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
            text: isLeafText ? el.textContent : null,
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
            is_canvas: tag === 'CANVAS',
            is_svg: tag === 'SVG' || tag === 'svg',
            is_img: tag === 'IMG',
            is_video: tag === 'VIDEO',
            img_src: tag === 'IMG' ? (el.currentSrc || el.src || null) : null,
            svg_path_count: svgPathCount,
            pptx_role: ds.pptxRole || null,
            pptx_rasterize: ds.pptxRasterize === 'true',
            pptx_skip: ds.pptxSkip === 'true',
            pptx_text: ds.pptxText || null,
            pptx_notes: ds.pptxNotes || null,
            aria_label: el.getAttribute('aria-label'),
            stable_selector: buildStableSelector(el),
        });

        for (const child of el.children) snapshot(child, id, depth + 1);
        return id;
    }

    snapshot(document.body, null, 0);
    return out;
}
"""


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
                text=entry["text"],
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
                is_canvas=entry["is_canvas"],
                is_svg=entry["is_svg"],
                is_img=entry["is_img"],
                is_video=entry["is_video"],
                img_src=entry["img_src"],
                svg_path_count=entry["svg_path_count"],
                pptx_role=entry["pptx_role"],
                pptx_rasterize=entry["pptx_rasterize"],
                pptx_skip=entry["pptx_skip"],
                pptx_text=entry["pptx_text"],
                pptx_notes=entry["pptx_notes"],
                aria_label=entry["aria_label"],
                stable_selector=entry["stable_selector"],
            )
        )
    return elements
