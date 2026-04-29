"""Tier-1 deterministic rules. Fast, no LLM. Returns Decision or None (defer).

Rules are evaluated in order; first match wins. Each rule is a small function
to make adding/removing easy.
"""

from __future__ import annotations

from collections.abc import Callable

from slidify.geom import parse_px
from slidify.models import Decision, DecisionKind, UnitKind, VisualUnit


def _has_canvas(unit: VisualUnit) -> bool:
    return any(e.is_canvas for e in unit.all_elements())


def _has_video(unit: VisualUnit) -> bool:
    return any(e.is_video for e in unit.all_elements())


def _has_complex_svg(unit: VisualUnit) -> bool:
    return any(e.is_svg and e.svg_path_count > 10 for e in unit.all_elements())


def _has_simple_svg(unit: VisualUnit) -> bool:
    return any(e.is_svg and e.svg_path_count > 0 for e in unit.all_elements())


def _has_caller_rasterize_hint(unit: VisualUnit) -> bool:
    # Caller hint applies if any element in THIS unit (not child units) is hinted.
    return any(e.pptx_rasterize for e in unit.elements)


def _is_skipped(unit: VisualUnit) -> bool:
    return any(e.pptx_skip for e in unit.elements)


def _has_role_title(unit: VisualUnit) -> bool:
    # A unit is a "title" only if an element directly in it carries the role —
    # never a descendant unit (otherwise ancestors falsely inherit the role).
    return any(e.pptx_role == "title" for e in unit.elements)


def _is_single_image(unit: VisualUnit) -> Decision | None:
    """If unit has a single <img> that fills it, return NativePicture."""
    imgs = [e for e in unit.all_elements() if e.is_img and e.img_src]
    if len(imgs) != 1:
        return None
    img = imgs[0]
    # img must roughly fill the unit bbox
    if (
        img.bbox.w >= unit.bbox.w * 0.85
        and img.bbox.h >= unit.bbox.h * 0.85
    ):
        return Decision(
            kind=DecisionKind.NativePicture,
            confidence=1.0,
            reason="single image fills unit",
            metadata={"src": img.img_src, "alt": img.aria_label or ""},
            source_tier="tier1",
        )
    return None


def _has_3d_transform(unit: VisualUnit) -> bool:
    for e in unit.all_elements():
        t = e.transform
        if not t or t == "none":
            continue
        if "matrix3d" in t or "rotate" in t or "skew" in t or "perspective" in t:
            return True
    return False


def _has_filter(unit: VisualUnit) -> bool:
    return any(e.filter and e.filter != "none" for e in unit.all_elements())


def _has_clip_path(unit: VisualUnit) -> bool:
    return any(e.clip_path and e.clip_path != "none" for e in unit.all_elements())


def _has_pseudo_content(unit: VisualUnit) -> bool:
    for e in unit.all_elements():
        if e.has_before and e.before_content not in (None, "none", '""', "''"):
            return True
        if e.has_after and e.after_content not in (None, "none", '""', "''"):
            return True
    return False


def _is_simple_leaf_text(unit: VisualUnit) -> bool:
    """Unit is a self-contained text region: its own elements include text
    and there are no child anchor units (text belonging to descendants
    should be classified as their own units)."""
    if unit.children:
        return False
    own_text = [e for e in unit.elements if e.text and e.text.strip()]
    if not own_text:
        return False
    if len(unit.elements) > 6:
        return False
    anchor = unit.elements[0]
    if anchor.background_image and anchor.background_image != "none":
        return False
    if anchor.transform and anchor.transform != "none":
        return False
    if anchor.box_shadow and anchor.box_shadow != "none":
        return False
    if anchor.filter and anchor.filter != "none":
        return False
    if _has_pseudo_content(unit):
        return False
    return True


def _is_plain_rectangle(unit: VisualUnit) -> bool:
    """Unit is a pure rectangle: bg (or border), no text content of its own."""
    elems = unit.all_elements()
    if any(e.text and e.text.strip() for e in elems):
        return False
    if any(e.is_canvas or e.is_svg or e.is_img or e.is_video for e in elems):
        return False
    if _has_pseudo_content(unit):
        return False
    if any(e.transform and e.transform != "none" for e in elems):
        return False
    if any(e.filter and e.filter != "none" for e in elems):
        return False
    # Background image (gradient/url) cannot be reproduced by a flat fill.
    if any(
        e.background_image and e.background_image != "none" for e in elems
    ):
        return False
    return True


def _has_nontrivial_shadow(box_shadow: str) -> bool:
    """A shadow we *might* be able to render natively in PPTX."""
    if not box_shadow or box_shadow == "none":
        return False
    # Multiple shadows separated by commas (and not inside rgba)
    # Simple heuristic: count commas outside parens
    depth = 0
    n_shadows = 1
    for ch in box_shadow:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            n_shadows += 1
    return n_shadows > 1


# ---------------------------------------------------------------------------
# Public rule entry point
# ---------------------------------------------------------------------------

RuleFn = Callable[[VisualUnit], Decision | None]


def rule_skip_hint(unit: VisualUnit) -> Decision | None:
    if _is_skipped(unit):
        return Decision(
            kind=DecisionKind.Skip,
            confidence=1.0,
            reason="data-pptx-skip",
            source_tier="tier1",
        )
    return None


def rule_canvas_always_raster(unit: VisualUnit) -> Decision | None:
    if _has_canvas(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=1.0,
            reason="canvas",
            source_tier="tier1",
        )
    return None


def rule_video_always_raster(unit: VisualUnit) -> Decision | None:
    if _has_video(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=1.0,
            reason="video",
            source_tier="tier1",
        )
    return None


def rule_complex_svg_raster(unit: VisualUnit) -> Decision | None:
    if _has_complex_svg(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=1.0,
            reason="complex_svg",
            source_tier="tier1",
        )
    return None


def rule_simple_svg_raster(unit: VisualUnit) -> Decision | None:
    # Even small SVGs we don't transpile in v1 — rasterize them.
    if _has_simple_svg(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=0.95,
            reason="svg_v1_rasterize",
            source_tier="tier1",
        )
    return None


def rule_caller_rasterize(unit: VisualUnit) -> Decision | None:
    if _has_caller_rasterize_hint(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=1.0,
            reason="caller_hint",
            source_tier="tier1",
        )
    return None


def rule_single_image(unit: VisualUnit) -> Decision | None:
    return _is_single_image(unit)


def rule_role_title(unit: VisualUnit) -> Decision | None:
    if _has_role_title(unit):
        return Decision(
            kind=DecisionKind.NativeText,
            confidence=1.0,
            reason="role=title",
            metadata={"role": "title"},
            source_tier="tier1",
        )
    return None


def rule_list_item(unit: VisualUnit) -> Decision | None:
    if unit.kind != UnitKind.ListItem:
        return None
    # If a list item has child anchor units (e.g., card with H3 + P sub-units),
    # leave it as a complex region — its children classify themselves.
    if unit.children:
        return None
    elems = unit.elements
    if any(e.is_canvas or e.is_svg or e.is_img or e.is_video for e in elems):
        return None
    has_text = any(e.text and e.text.strip() for e in elems)
    if not has_text:
        return None
    return Decision(
        kind=DecisionKind.NativeBullet,
        confidence=0.95,
        reason="list_item",
        source_tier="tier1",
    )


def rule_3d_transform_raster(unit: VisualUnit) -> Decision | None:
    if _has_3d_transform(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=0.95,
            reason="3d_transform",
            source_tier="tier1",
        )
    return None


def rule_filter_raster(unit: VisualUnit) -> Decision | None:
    if _has_filter(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=0.95,
            reason="filter",
            source_tier="tier1",
        )
    return None


def rule_clip_path_raster(unit: VisualUnit) -> Decision | None:
    if _has_clip_path(unit):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=0.9,
            reason="clip_path",
            source_tier="tier1",
        )
    return None


def rule_simple_leaf_text(unit: VisualUnit) -> Decision | None:
    if _is_simple_leaf_text(unit):
        return Decision(
            kind=DecisionKind.NativeText,
            confidence=0.95,
            reason="simple_leaf_text",
            source_tier="tier1",
        )
    return None


def rule_plain_rectangle(unit: VisualUnit) -> Decision | None:
    if _is_plain_rectangle(unit):
        # Only emit if it actually has visible presence (else it's structural).
        elems = unit.all_elements()
        anchor_el = elems[0]
        bg_visible = anchor_el.background_color not in ("rgba(0, 0, 0, 0)", "transparent", "")
        border_visible = anchor_el.border and anchor_el.border != "none" and parse_px(anchor_el.border.split()[0] if anchor_el.border else "") > 0
        if not (bg_visible or border_visible):
            return None
        return Decision(
            kind=DecisionKind.NativeShape,
            confidence=0.95,
            reason="plain_rectangle",
            source_tier="tier1",
        )
    return None


# Order matters.
RULES: list[RuleFn] = [
    rule_skip_hint,
    rule_caller_rasterize,
    rule_canvas_always_raster,
    rule_video_always_raster,
    rule_complex_svg_raster,
    rule_3d_transform_raster,
    rule_filter_raster,
    rule_clip_path_raster,
    rule_simple_svg_raster,
    rule_single_image,
    rule_role_title,
    rule_list_item,
    rule_simple_leaf_text,
    rule_plain_rectangle,
]


def classify_tier1(unit: VisualUnit) -> Decision | None:
    for rule in RULES:
        result = rule(unit)
        if result is not None:
            return result
    return None
