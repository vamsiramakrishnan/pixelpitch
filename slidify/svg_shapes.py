"""Translate simple SVG primitives to native PPTX shapes.

Supports `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>`, `<polyline>`.
Single `<path>` elements are *not* translated (would need a real path parser);
they fall back to raster.

Coordinates are in SVG userspace; we map them into the SVG element's viewport
bounding box on the slide.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Emu

from slidify.colors import parse_color
from slidify.geom import px_to_emu


@dataclass
class _Mapping:
    """Linear map from SVG userspace into a sub-rect of the slide."""

    svg_origin_x: float
    svg_origin_y: float
    scale_x: float
    scale_y: float

    def x(self, ux: float) -> float:
        return self.svg_origin_x + ux * self.scale_x

    def y(self, uy: float) -> float:
        return self.svg_origin_y + uy * self.scale_y


def _build_mapping(svg_rect: dict) -> _Mapping:
    """SVG userspace assumed equal to viewport pixels (the common case for
    inline SVG without a viewBox). For SVGs *with* a viewBox we'd need to
    parse it; we accept the simplification for v1."""
    return _Mapping(
        svg_origin_x=svg_rect["x"],
        svg_origin_y=svg_rect["y"],
        scale_x=1.0,
        scale_y=1.0,
    )


def is_translatable_svg(svg_shapes: list[dict] | None) -> bool:
    if not svg_shapes:
        return False
    for s in svg_shapes:
        tag = s.get("tag")
        if tag in ("rect", "circle", "ellipse", "line", "polygon", "polyline"):
            continue
        return False  # path or other → not translatable
    return True


def emit_svg_shapes(slide, svg_shapes: list[dict]) -> int:
    """Emit each translatable SVG primitive as a native PPTX shape on `slide`.

    Returns the number of shapes successfully emitted.
    """
    if not svg_shapes:
        return 0
    rect_meta = getattr(svg_shapes, "_svgRect", None)
    if rect_meta is None and isinstance(svg_shapes, dict):
        rect_meta = svg_shapes.get("_svgRect")
    # When deserialized through pydantic, the special `_svgRect` attribute
    # doesn't survive on the list. Look for it on the first dict instead.
    if rect_meta is None and svg_shapes and isinstance(svg_shapes[0], dict):
        rect_meta = svg_shapes[0].get("_svgRect")
    if rect_meta is None:
        return 0
    mapping = _build_mapping(rect_meta)

    n_emitted = 0
    for s in svg_shapes:
        if isinstance(s, dict) and s.get("_svgRect") is not None:
            continue  # metadata entry
        try:
            if _emit_one(slide, s, mapping):
                n_emitted += 1
        except Exception:
            pass
    return n_emitted


def _apply_svg_fill(shape, fill: str | None, fill_opacity: float) -> None:
    if fill is None or fill.lower() in ("none", "transparent"):
        try:
            shape.fill.background()
        except Exception:
            pass
        return
    parsed = parse_color(fill)
    if parsed is None:
        return
    try:
        shape.fill.solid()
        shape.fill.fore_color.rgb = parsed[0]
    except Exception:
        pass


def _apply_svg_stroke(shape, stroke: str | None, stroke_width: float) -> None:
    if stroke is None or stroke.lower() in ("none", "transparent") or stroke_width <= 0:
        try:
            shape.line.fill.background()
        except Exception:
            pass
        return
    parsed = parse_color(stroke)
    if parsed is None:
        return
    try:
        shape.line.width = Emu(px_to_emu(stroke_width))
        shape.line.color.rgb = parsed[0]
    except Exception:
        pass


def _emit_one(slide, s: dict, mapping: _Mapping) -> bool:
    tag = s.get("tag")
    fill = s.get("fill")
    stroke = s.get("stroke")
    stroke_width = float(s.get("stroke_width") or 0.0)
    fill_opacity = float(s.get("fill_opacity") or 1.0)

    if tag == "rect":
        x = mapping.x(float(s["x"]))
        y = mapping.y(float(s["y"]))
        w = float(s["w"]) * mapping.scale_x
        h = float(s["h"]) * mapping.scale_y
        if w <= 0 or h <= 0:
            return False
        rx = float(s.get("rx") or 0.0)
        kind = MSO_SHAPE.ROUNDED_RECTANGLE if rx > 0 else MSO_SHAPE.RECTANGLE
        shape = slide.shapes.add_shape(
            kind, Emu(px_to_emu(x)), Emu(px_to_emu(y)), Emu(px_to_emu(w)), Emu(px_to_emu(h))
        )
        _apply_svg_fill(shape, fill, fill_opacity)
        _apply_svg_stroke(shape, stroke, stroke_width)
        return True

    if tag == "circle":
        cx = mapping.x(float(s["cx"]))
        cy = mapping.y(float(s["cy"]))
        r = float(s["r"])
        if r <= 0:
            return False
        x = cx - r
        y = cy - r
        w = h = 2 * r
        shape = slide.shapes.add_shape(
            MSO_SHAPE.OVAL,
            Emu(px_to_emu(x)),
            Emu(px_to_emu(y)),
            Emu(px_to_emu(w)),
            Emu(px_to_emu(h)),
        )
        _apply_svg_fill(shape, fill, fill_opacity)
        _apply_svg_stroke(shape, stroke, stroke_width)
        return True

    if tag == "ellipse":
        cx = mapping.x(float(s["cx"]))
        cy = mapping.y(float(s["cy"]))
        rx = float(s["rx"])
        ry = float(s["ry"])
        if rx <= 0 or ry <= 0:
            return False
        x = cx - rx
        y = cy - ry
        shape = slide.shapes.add_shape(
            MSO_SHAPE.OVAL,
            Emu(px_to_emu(x)),
            Emu(px_to_emu(y)),
            Emu(px_to_emu(2 * rx)),
            Emu(px_to_emu(2 * ry)),
        )
        _apply_svg_fill(shape, fill, fill_opacity)
        _apply_svg_stroke(shape, stroke, stroke_width)
        return True

    if tag == "line":
        x1 = mapping.x(float(s["x1"]))
        y1 = mapping.y(float(s["y1"]))
        x2 = mapping.x(float(s["x2"]))
        y2 = mapping.y(float(s["y2"]))
        connector = slide.shapes.add_connector(
            1,
            Emu(px_to_emu(x1)),
            Emu(px_to_emu(y1)),
            Emu(px_to_emu(x2)),
            Emu(px_to_emu(y2)),
        )
        _apply_svg_stroke(connector, stroke or "rgb(0,0,0)", stroke_width or 1.0)
        return True

    if tag in ("polygon", "polyline"):
        points = _parse_points(s.get("points", ""))
        if len(points) < 2:
            return False
        # Build a freeform shape via add_freeform.
        x0_user, y0_user = points[0]
        try:
            ff = slide.shapes.build_freeform(
                Emu(px_to_emu(mapping.x(x0_user))),
                Emu(px_to_emu(mapping.y(y0_user))),
                scale=1.0,
            )
            for ux, uy in points[1:]:
                ff.add_line_segments(
                    [(Emu(px_to_emu(mapping.x(ux))), Emu(px_to_emu(mapping.y(uy))))]
                )
            if tag == "polygon":
                ff.add_line_segments(
                    [(Emu(px_to_emu(mapping.x(x0_user))), Emu(px_to_emu(mapping.y(y0_user))))]
                )
            shape = ff.convert_to_shape()
        except Exception:
            return False
        _apply_svg_fill(shape, fill, fill_opacity)
        _apply_svg_stroke(shape, stroke, stroke_width)
        return True

    return False


_POINT_PAIR = re.compile(r"(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)")


def _parse_points(s: str) -> list[tuple[float, float]]:
    return [(float(x), float(y)) for x, y in _POINT_PAIR.findall(s)]
