"""Tests for slidify.svg_shapes — SVG primitive → PPTX shape translation.

Focused on the fill/stroke opacity behavior because regressions there
(silently rendering at full alpha) wash out organic-blob slides.
"""

from __future__ import annotations

from pptx import Presentation
from pptx.util import Emu

from slidify.svg_shapes import emit_svg_shapes

A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"


def _new_slide():
    prs = Presentation()
    prs.slide_width = Emu(12_192_000)
    prs.slide_height = Emu(6_858_000)
    return prs.slides.add_slide(prs.slide_layouts[6])


def test_circle_with_fill_opacity_emits_alpha():
    """Bug C regression: SVG `fill-opacity="0.55"` must reach the PPTX
    shape as `<a:srgbClr><a:alpha val="55000"/></a:srgbClr>`. Without
    this the 55% blobs on slide-43 / slide-44 painted at full opacity
    and drowned the rest of the canvas.
    """
    slide = _new_slide()
    n = emit_svg_shapes(
        slide,
        [
            {
                "tag": "circle",
                "cx": 100,
                "cy": 100,
                "r": 50,
                "fill": "#a78bfa",
                "fill_opacity": 0.55,
                "stroke": "none",
                "stroke_width": 0,
                "_svgRect": {"x": 0, "y": 0, "w": 1280, "h": 720},
            }
        ],
    )
    assert n == 1
    shape = next(iter(slide.shapes))
    # Verify alpha child on the solidFill > srgbClr
    sp_pr = shape._element.spPr
    solid = sp_pr.find(f"{{{A_NS}}}solidFill")
    assert solid is not None
    srgb = solid.find(f"{{{A_NS}}}srgbClr")
    assert srgb is not None
    alpha = srgb.find(f"{{{A_NS}}}alpha")
    assert alpha is not None, "expected <a:alpha> baked in for fill_opacity=0.55"
    # 0.55 → 55_000 (in 1/1000 of a percent)
    assert int(alpha.get("val")) == 55_000


def test_path_with_fill_opacity_emits_alpha():
    """Same guarantee for closed cubic-bezier blob paths (slide-43 ritual
    background blob, slide-44 corner blobs)."""
    slide = _new_slide()
    d = (
        "M 60 60 C 220 28, 460 50, 540 140 "
        "C 620 230, 540 270, 360 256 "
        "C 180 242, 30 220, 60 60 Z"
    )
    n = emit_svg_shapes(
        slide,
        [
            {
                "tag": "path",
                "d": d,
                "fill": "#f7b2a2",
                "fill_opacity": 0.32,
                "stroke": "none",
                "stroke_width": 0,
                "_svgRect": {"x": 0, "y": 0, "w": 1280, "h": 720},
            }
        ],
    )
    assert n == 1
    shape = next(iter(slide.shapes))
    sp_pr = shape._element.spPr
    # Path emit replaces prstGeom with custGeom — verify that and that
    # the alpha is baked.
    assert sp_pr.find(f"{{{A_NS}}}custGeom") is not None
    solid = sp_pr.find(f"{{{A_NS}}}solidFill")
    assert solid is not None
    srgb = solid.find(f"{{{A_NS}}}srgbClr")
    alpha = srgb.find(f"{{{A_NS}}}alpha")
    assert alpha is not None
    assert int(alpha.get("val")) == 32_000


def test_fill_opacity_one_does_not_emit_alpha():
    """No alpha child for fully-opaque fills — keeps the XML tidy and
    avoids fooling renderers that special-case the absence of `<a:alpha>`.
    """
    slide = _new_slide()
    emit_svg_shapes(
        slide,
        [
            {
                "tag": "rect",
                "x": 0,
                "y": 0,
                "w": 100,
                "h": 100,
                "fill": "#000",
                "fill_opacity": 1.0,
                "stroke": "none",
                "stroke_width": 0,
                "_svgRect": {"x": 0, "y": 0, "w": 100, "h": 100},
            }
        ],
    )
    shape = next(iter(slide.shapes))
    sp_pr = shape._element.spPr
    solid = sp_pr.find(f"{{{A_NS}}}solidFill")
    srgb = solid.find(f"{{{A_NS}}}srgbClr") if solid is not None else None
    if srgb is not None:
        assert srgb.find(f"{{{A_NS}}}alpha") is None


def test_stroke_opacity_emits_alpha_on_line_color():
    """slide-44 has `<path stroke-opacity="0.40">` for the wavy divider.
    The opacity must land on the line's color, not just the fill.
    """
    slide = _new_slide()
    emit_svg_shapes(
        slide,
        [
            {
                "tag": "path",
                "d": "M 0 0 C 60 -20, 120 20, 180 0",
                "fill": "none",
                "fill_opacity": 1.0,
                "stroke": "#264653",
                "stroke_width": 1.2,
                "stroke_opacity": 0.40,
                "_svgRect": {"x": 0, "y": 0, "w": 1280, "h": 720},
            }
        ],
    )
    shape = next(iter(slide.shapes))
    sp_pr = shape._element.spPr
    ln = sp_pr.find(f"{{{A_NS}}}ln")
    assert ln is not None
    solid = ln.find(f"{{{A_NS}}}solidFill")
    assert solid is not None
    srgb = solid.find(f"{{{A_NS}}}srgbClr")
    alpha = srgb.find(f"{{{A_NS}}}alpha")
    assert alpha is not None, "expected <a:alpha> on stroke for stroke-opacity"
    assert int(alpha.get("val")) == 40_000
