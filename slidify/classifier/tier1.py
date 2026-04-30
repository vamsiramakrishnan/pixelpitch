"""Tier-1 deterministic rules. Fast, no LLM. Returns Decision or None (defer).

Rules are evaluated in order; first match wins. Each rule is a small function
to make adding/removing easy.
"""

from __future__ import annotations

from collections.abc import Callable

from slidify.geom import parse_px
from slidify.gradients import parse_gradient
from slidify.models import Decision, DecisionKind, UnitKind, VisualUnit
from slidify.shadows import is_translatable_shadow
from slidify.svg_shapes import is_translatable_svg


def _has_canvas(unit: VisualUnit) -> bool:
    return any(e.is_canvas for e in unit.all_elements())


def _has_video(unit: VisualUnit) -> bool:
    return any(e.is_video for e in unit.all_elements())


def _has_complex_svg(unit: VisualUnit) -> bool:
    return any(e.is_svg and e.svg_path_count > 10 for e in unit.all_elements())


def _has_simple_svg(unit: VisualUnit) -> bool:
    """True iff the unit IS substantially a simple SVG.

    Guard: when the unit is a big slide-level container that happens to
    *contain* an SVG, the NativeSvg path would emit ONLY the svg shapes
    and drop all other content. Require the SVG element to occupy at
    least 30% of the unit's area before treating the whole unit as an
    SVG unit. Small standalone SVGs (icons, decorative paths in their
    own DIVs) still match.
    """
    unit_area = unit.bbox.area
    if unit_area <= 0:
        return False
    for e in unit.all_elements():
        if e.is_svg and e.svg_path_count > 0:
            if e.bbox.area / unit_area >= 0.30:
                return True
    return False


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


def _is_complex_pseudo(content: str | None, style: dict | None) -> bool:
    """A pseudo is *complex* — and forces raster — if it carries a bg-image,
    url() content, or a non-trivial decoration. Text-only pseudos (e.g.,
    `content: "01"`) are decorative and don't disqualify the parent from
    native classification.
    """
    if not content or content in ("none", '""', "''"):
        return False
    if "url(" in content:
        return True
    if style:
        bg_image = (style.get("background_image") or "none")
        if bg_image != "none" and "url(" in bg_image:
            return True
    return False


def _has_pseudo_content(unit: VisualUnit) -> bool:
    """Return True only if the unit has a *complex* pseudo we can't translate."""
    for e in unit.all_elements():
        if e.has_before and _is_complex_pseudo(e.before_content, e.pseudo_before_style):
            return True
        if e.has_after and _is_complex_pseudo(e.after_content, e.pseudo_after_style):
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
    # Gradient bg is OK if we can translate it natively.
    if anchor.background_image and anchor.background_image != "none":
        if "url(" in anchor.background_image:
            return False
        if not parse_gradient(anchor.background_image):
            return False
    if anchor.transform and anchor.transform != "none":
        return False
    # Shadow is OK if translatable.
    if (
        anchor.box_shadow
        and anchor.box_shadow != "none"
        and not is_translatable_shadow(anchor.box_shadow)
    ):
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
    # url() backgrounds we can't reproduce. Gradients we *can* — let those
    # through.
    for e in elems:
        bg_img = e.background_image
        if not bg_img or bg_img == "none":
            continue
        if "url(" in bg_img:
            return False
        # Unparseable / unrecognized gradient → treat as raster
        if not parse_gradient(bg_img):
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
    if not _has_simple_svg(unit):
        return None
    svg_el = next(
        (e for e in unit.all_elements() if e.is_svg and e.svg_shapes), None
    )
    if svg_el is not None and is_translatable_svg(svg_el.svg_shapes):
        return Decision(
            kind=DecisionKind.NativeSvg,
            confidence=0.9,
            reason="svg_translatable_primitives",
            source_tier="tier1",
        )
    return Decision(
        kind=DecisionKind.Raster,
        confidence=0.95,
        reason="svg_path_or_complex",
        source_tier="tier1",
    )


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
