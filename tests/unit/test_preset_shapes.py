"""Tests for slidify.preset_shapes."""

from __future__ import annotations

import io
import math

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Emu

from slidify.models import BoundingBox, DomElement
from slidify.preset_shapes import (
    KNOWN_PRESETS,
    PresetMatch,
    classify_polygon,
    detect_preset_shape,
    emit_preset,
    parse_polygon_clip_path,
)


def _el(**overrides) -> DomElement:
    base = dict(
        id=1,
        parent_id=None,
        depth=0,
        tag="div",
        bbox=BoundingBox(x=0, y=0, w=200, h=100),
    )
    base.update(overrides)
    return DomElement(**base)


def _slide():
    prs = Presentation()
    layout = prs.slide_layouts[6]  # blank
    slide = prs.slides.add_slide(layout)
    return prs, slide


# 1.
def test_chevron_clip_path():
    el = _el(
        clip_path="polygon(0% 0%, 75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%)",
        bbox=BoundingBox(x=0, y=0, w=200, h=80),
    )
    match = detect_preset_shape(el)
    assert match is not None
    assert match.preset == MSO_SHAPE.CHEVRON


# 2.
def test_arrow_right_class():
    el = _el(cls="arrow-right cta", bbox=BoundingBox(x=0, y=0, w=240, h=80))
    match = detect_preset_shape(el)
    assert match is not None
    assert match.preset == MSO_SHAPE.RIGHT_ARROW


# 3.
def test_pill_class_and_radius():
    el1 = _el(cls="pill button", bbox=BoundingBox(x=0, y=0, w=200, h=40))
    m1 = detect_preset_shape(el1)
    assert m1 is not None
    assert m1.preset == MSO_SHAPE.ROUNDED_RECTANGLE

    el2 = _el(border_radius="9999px", bbox=BoundingBox(x=0, y=0, w=200, h=40))
    m2 = detect_preset_shape(el2)
    assert m2 is not None
    assert m2.preset == MSO_SHAPE.ROUNDED_RECTANGLE


# 4.
def test_oval_from_radius_50_on_square():
    el = _el(border_radius="50%", bbox=BoundingBox(x=0, y=0, w=80, h=80))
    match = detect_preset_shape(el)
    assert match is not None
    assert match.preset == MSO_SHAPE.OVAL


# 5.
def test_plain_rectangle_returns_none():
    el = _el(
        cls="card",
        border_radius="0px",
        clip_path="none",
        bbox=BoundingBox(x=0, y=0, w=300, h=200),
    )
    assert detect_preset_shape(el) is None


# 6 + 7.
def test_emit_preset_adds_shape_and_round_trips(tmp_path):
    prs, slide = _slide()
    bbox = BoundingBox(x=10, y=10, w=200, h=120)
    match = PresetMatch(preset=MSO_SHAPE.HEXAGON, confidence=1.0, reason="test")
    shape = emit_preset(slide, bbox, match)
    assert shape is not None
    assert shape.auto_shape_type == MSO_SHAPE.HEXAGON

    buf = io.BytesIO()
    prs.save(buf)
    buf.seek(0)
    reopened = Presentation(buf)
    assert len(reopened.slides) == 1
    shapes = list(reopened.slides[0].shapes)
    assert len(shapes) >= 1
    assert shapes[0].auto_shape_type == MSO_SHAPE.HEXAGON


# 8.
def test_polygon_signature_hexagon():
    pts = []
    for i in range(6):
        ang = 2 * math.pi * i / 6
        pts.append((0.5 + 0.5 * math.cos(ang), 0.5 + 0.5 * math.sin(ang)))
    match = classify_polygon(pts)
    assert match is not None
    assert match.preset == MSO_SHAPE.HEXAGON


# 9.
def test_polygon_signature_5_point_star():
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + math.pi * i / 5
        r = 0.5 if i % 2 == 0 else 0.22
        pts.append((0.5 + r * math.cos(ang), 0.5 + r * math.sin(ang)))
    match = classify_polygon(pts)
    assert match is not None
    assert match.preset == MSO_SHAPE.STAR_5_POINT


# 10.
def test_known_presets_telemetry_has_30_plus():
    assert len(KNOWN_PRESETS) >= 30


# Additional sanity tests
def test_parse_polygon_clip_path_basic():
    pts = parse_polygon_clip_path("polygon(0% 0%, 100% 0%, 50% 100%)")
    assert pts == [(0.0, 0.0), (1.0, 0.0), (0.5, 1.0)]


def test_parse_polygon_clip_path_invalid():
    assert parse_polygon_clip_path("none") is None
    assert parse_polygon_clip_path("circle(50%)") is None


def test_class_chevron():
    el = _el(cls="chevron-right step", bbox=BoundingBox(x=0, y=0, w=200, h=60))
    m = detect_preset_shape(el)
    assert m is not None
    assert m.preset == MSO_SHAPE.CHEVRON


def test_class_lightning():
    el = _el(cls="lightning glow")
    m = detect_preset_shape(el)
    assert m is not None
    assert m.preset == MSO_SHAPE.LIGHTNING_BOLT


def test_polygon_pentagon():
    pts = []
    for i in range(5):
        ang = -math.pi / 2 + 2 * math.pi * i / 5
        pts.append((0.5 + 0.5 * math.cos(ang), 0.5 + 0.5 * math.sin(ang)))
    match = classify_polygon(pts)
    assert match is not None
    assert match.preset == MSO_SHAPE.PENTAGON


def test_polygon_octagon():
    pts = []
    for i in range(8):
        ang = math.pi / 8 + 2 * math.pi * i / 8
        pts.append((0.5 + 0.5 * math.cos(ang), 0.5 + 0.5 * math.sin(ang)))
    match = classify_polygon(pts)
    assert match is not None
    assert match.preset == MSO_SHAPE.OCTAGON


def test_emit_preset_with_rotation():
    _, slide = _slide()
    bbox = BoundingBox(x=10, y=10, w=120, h=120)
    match = PresetMatch(preset=MSO_SHAPE.STAR_5_POINT, rotation_deg=45.0)
    shape = emit_preset(slide, bbox, match)
    assert abs(shape.rotation - 45.0) < 0.01
