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
        if tag == "path":
            # Try a real parse to be sure svg_path can handle it. A bad
            # path string falls through to raster, which is the safer
            # default than emitting a broken custGeom.
            d = (s.get("d") or "").strip()
            if not d:
                return False
            try:
                from slidify.svg_path import parse_path

                cmds = parse_path(d)
                if cmds:
                    continue
            except Exception:
                pass
            return False
        return False
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
        # `_svgRect` used to ride as its own pseudo-entry in the list; now
        # the DOM walker embeds it as a key on every shape dict. Either way,
        # only entries with a real `tag` are emitted.
        if not isinstance(s, dict) or not s.get("tag"):
            continue
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

    if tag == "path":
        d = (s.get("d") or "").strip()
        if not d:
            return False
        return _emit_path(slide, d, mapping, fill, fill_opacity, stroke, stroke_width)

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


def _path_bounds(commands: list) -> tuple[float, float, float, float]:
    """Return (minx, miny, maxx, maxy) over all endpoint + control points."""
    xs: list[float] = []
    ys: list[float] = []
    for cmd in commands:
        op = cmd[0]
        if op == "moveTo" or op == "lineTo":
            xs.append(cmd[1]); ys.append(cmd[2])
        elif op == "cubicBezTo":
            for i in (1, 3, 5):
                xs.append(cmd[i]); ys.append(cmd[i + 1])
        elif op == "quadBezTo":
            for i in (1, 3):
                xs.append(cmd[i]); ys.append(cmd[i + 1])
    if not xs:
        return (0.0, 0.0, 1.0, 1.0)
    return (min(xs), min(ys), max(xs), max(ys))


def _emit_path(
    slide,
    d: str,
    mapping: _Mapping,
    fill: str | None,
    fill_opacity: float,
    stroke: str | None,
    stroke_width: float,
) -> bool:
    """Emit an SVG `<path d="...">` as a native PPTX freeform via custGeom.

    Uses `slidify.svg_path.parse_path` for full curve command coverage
    (cubic / smooth-cubic / quadratic / smooth-quadratic). Builds a
    custGeom XML fragment and grafts it onto a placeholder freeform
    shape, replacing the default prstGeom.
    """
    from lxml import etree

    from slidify.svg_path import commands_to_path_xml, parse_path

    try:
        commands = parse_path(d)
    except Exception:
        return False
    if not commands:
        return False

    # Compute path bounds in SVG-local space, then map to slide-px.
    minx, miny, maxx, maxy = _path_bounds(commands)
    # Horizontal / vertical / dot paths have zero height or width. Pad
    # symmetrically by stroke_width so the stroke is visible *within* the
    # freeform's bbox (otherwise PPT clips half of it).
    pad = max(2.0, stroke_width * 1.5)
    if maxx == minx:
        minx -= pad
        maxx += pad
    elif maxx < minx:
        return False
    if maxy == miny:
        miny -= pad
        maxy += pad
    elif maxy < miny:
        return False

    slide_x = mapping.x(minx)
    slide_y = mapping.y(miny)
    slide_w = (maxx - minx) * mapping.scale_x
    slide_h = (maxy - miny) * mapping.scale_y
    if slide_w <= 0 or slide_h <= 0:
        return False

    # Translate commands so the path's local-origin is (0, 0) at the
    # bbox top-left — custGeom uses path-local coords scaled to the shape.
    PATH_W = 100_000
    PATH_H = 100_000
    norm: list = []
    for cmd in commands:
        op = cmd[0]
        if op == "moveTo" or op == "lineTo":
            x = (cmd[1] - minx) / (maxx - minx) * PATH_W
            y = (cmd[2] - miny) / (maxy - miny) * PATH_H
            norm.append((op, x, y))
        elif op == "cubicBezTo":
            pts = []
            for i in (1, 3, 5):
                x = (cmd[i] - minx) / (maxx - minx) * PATH_W
                y = (cmd[i + 1] - miny) / (maxy - miny) * PATH_H
                pts.extend([x, y])
            norm.append((op, *pts))
        elif op == "quadBezTo":
            pts = []
            for i in (1, 3):
                x = (cmd[i] - minx) / (maxx - minx) * PATH_W
                y = (cmd[i + 1] - miny) / (maxy - miny) * PATH_H
                pts.extend([x, y])
            norm.append((op, *pts))
        elif op == "close":
            norm.append(cmd)

    path_xml = commands_to_path_xml(norm, PATH_W, PATH_H)

    # Bootstrap a freeform so we get a valid <p:sp> with all the
    # plumbing (nvSpPr, spPr, etc.), then swap its <a:prstGeom> for
    # our <a:custGeom>.
    try:
        ff = slide.shapes.build_freeform(
            Emu(px_to_emu(slide_x)),
            Emu(px_to_emu(slide_y)),
            scale=1.0,
        )
        ff.add_line_segments(
            [(Emu(px_to_emu(slide_x + 1)), Emu(px_to_emu(slide_y + 1)))]
        )
        shape = ff.convert_to_shape()
    except Exception:
        return False

    # Resize to the actual path bbox.
    try:
        shape.width = Emu(px_to_emu(slide_w))
        shape.height = Emu(px_to_emu(slide_h))
    except Exception:
        pass

    # Swap prstGeom → custGeom. OOXML's spPr child order matters:
    # xfrm → (prstGeom | custGeom) → fill → ln → effects.
    # LibreOffice silently drops slides whose spPr children violate this.
    sp_pr = shape._element.spPr  # noqa: SLF001
    ns_a = "http://schemas.openxmlformats.org/drawingml/2006/main"
    for prst in sp_pr.findall(f"{{{ns_a}}}prstGeom"):
        sp_pr.remove(prst)
    for cust in sp_pr.findall(f"{{{ns_a}}}custGeom"):
        sp_pr.remove(cust)
    custgeom_el = etree.fromstring(
        f'<a:custGeom xmlns:a="{ns_a}"><a:avLst/><a:gdLst/><a:ahLst/>'
        f"<a:cxnLst/><a:rect l=\"0\" t=\"0\" r=\"{PATH_W}\" b=\"{PATH_H}\"/>"
        f"<a:pathLst>{path_xml}</a:pathLst></a:custGeom>"
    )
    # Insert right after <a:xfrm> (or at index 0 if absent).
    xfrm = sp_pr.find(f"{{{ns_a}}}xfrm")
    if xfrm is not None:
        sp_pr.insert(list(sp_pr).index(xfrm) + 1, custgeom_el)
    else:
        sp_pr.insert(0, custgeom_el)

    _apply_svg_fill(shape, fill, fill_opacity)
    _apply_svg_stroke(shape, stroke, stroke_width)
    return True
