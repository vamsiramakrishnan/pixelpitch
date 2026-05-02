"""Slide-bounds overflow detector.

The DOM walker captures the resolved pixel layout — every element's
``getBoundingClientRect()`` becomes a `DomElement.bbox`. Any element whose
bbox extends past the slide frame (1280×720 by default) is, by definition,
clipped or off-canvas. That's a layout bug the author would have caught by
eyeballing a PNG; surfacing it here turns it into a structured compile-time
signal so agents can fix the source HTML deterministically instead of
guessing from raster previews.

The detector is intentionally narrow:

  * Only "leaf-ish" elements are reported (own_text or no children, or a
    direct visual element like an svg/img). A wrapper div whose children
    overflow gets reported via the children, not twice.
  * Tiny overflows (< 1px) are ignored — sub-pixel layout noise.
  * Elements explicitly tagged ``data-pptx-skip="true"`` are skipped.
  * Pseudo-elements (``::before`` / ``::after``) are ignored — they don't
    have bboxes in the walker output anyway.

The output is a flat list of `OverflowElement` records that ride on
`ConversionResult.overflow_elements`. Empty list = clean.
"""

from __future__ import annotations

from slidify.models import DomElement, OverflowElement


# Tolerance for sub-pixel rounding in getBoundingClientRect(). Layout that
# overflows by less than this is treated as flush-aligned and not reported.
_TOLERANCE_PX = 1.0


def detect_overflow(
    slide_index: int,
    elements: list[DomElement],
    viewport_w: int,
    viewport_h: int,
) -> list[OverflowElement]:
    """Return one `OverflowElement` per leaf element that crosses a slide edge.

    Args:
        slide_index: 0-based slide index in the deck (for reporting).
        elements: the rendered DOM elements (post-walker).
        viewport_w: slide width in px (1280 by default).
        viewport_h: slide height in px (720 by default).
    """
    out: list[OverflowElement] = []
    for el in elements:
        if el.pptx_skip or el.allow_overflow:
            continue
        # Only leaf-ish elements; wrapper containers that overflow because
        # of their kids would otherwise spam duplicate reports.
        if not _is_leafish(el):
            continue
        bbox = el.bbox
        if bbox.w <= 0 or bbox.h <= 0:
            continue
        right = bbox.x + bbox.w
        bottom = bbox.y + bbox.h
        # Iterate in priority order: bottom is the most common landing-page
        # failure (content too tall), so report it first per element.
        for axis, overflow in (
            ("bottom", bottom - viewport_h),
            ("right", right - viewport_w),
            ("left", -bbox.x),
            ("top", -bbox.y),
        ):
            if overflow > _TOLERANCE_PX:
                out.append(
                    OverflowElement(
                        slide_index=slide_index,
                        axis=axis,
                        overflow_px=round(overflow, 2),
                        bbox_x=bbox.x,
                        bbox_y=bbox.y,
                        bbox_w=bbox.w,
                        bbox_h=bbox.h,
                        tag=el.tag,
                        data_atom=el.data_atom,
                        stable_selector=el.stable_selector,
                        sample_text=_sample_text(el),
                    )
                )
                break  # one report per element; biggest violation first
    return out


def _is_leafish(el: DomElement) -> bool:
    """Worth reporting individually? True for visual leaves and text nodes."""
    if el.tag in ("IMG", "SVG", "svg", "CANVAS", "VIDEO"):
        return True
    if el.is_text_container or (el.text and el.text.strip()):
        return True
    if el.runs:
        return True
    # Self-decorated elements (cards / pills with a background but no kids).
    has_bg = (el.background_color or "rgba(0, 0, 0, 0)") != "rgba(0, 0, 0, 0)"
    has_border = (el.border or "none") not in ("none", "0px none rgb(0, 0, 0)")
    return has_bg or has_border


def _sample_text(el: DomElement) -> str:
    raw = (el.text or "").strip()
    if not raw and el.runs:
        raw = "".join(r.text or "" for r in el.runs if not r.is_break).strip()
    if len(raw) > 60:
        raw = raw[:57] + "…"
    return raw
