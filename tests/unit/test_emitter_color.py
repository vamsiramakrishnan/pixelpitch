"""Unit tests for emitter color resolution — specifically the
gradient-clipped-text fallback.

CSS pattern:
    .accent {
      background: linear-gradient(...);
      -webkit-background-clip: text;
      color: transparent;
    }

We cannot natively reproduce gradient-clipped text in PPTX, so the emitter
substitutes the gradient's first stop color when the run is otherwise
transparent.
"""

from __future__ import annotations

from pptx.dml.color import RGBColor

from slidify.emitter import _resolve_run_color
from slidify.models import BoundingBox, DomElement


def _el(color: str = "rgb(255, 255, 255)") -> DomElement:
    return DomElement(
        id=0,
        parent_id=None,
        depth=0,
        tag="DIV",
        bbox=BoundingBox(x=0, y=0, w=10, h=10),
        color=color,
        stable_selector="#x",
    )


def test_resolve_run_color_returns_solid():
    spec = {"text": "hi", "color": "rgb(99, 102, 241)"}
    rgb = _resolve_run_color(spec, _el())
    assert rgb == RGBColor(99, 102, 241)


def test_resolve_run_color_with_transparent_falls_through_to_gradient_first_stop():
    """Gradient-clipped text: color=transparent + bg-image=gradient →
    use the FIRST gradient stop's color as a solid fallback."""
    spec = {
        "text": "presentations",
        "color": "rgba(0, 0, 0, 0)",
        "background_image": "linear-gradient(135deg, rgb(129, 140, 248) 0%, rgb(192, 132, 252) 50%, rgb(244, 114, 182) 100%)",
    }
    rgb = _resolve_run_color(spec, _el())
    # First stop = #818cf8 (indigo-400 in v3 / similar in v4)
    assert rgb == RGBColor(0x81, 0x8c, 0xf8)


def test_resolve_run_color_transparent_no_gradient_returns_none():
    """No bg-image gradient available → return None (caller leaves color unset)."""
    spec = {"text": "x", "color": "rgba(0, 0, 0, 0)", "background_image": "none"}
    rgb = _resolve_run_color(spec, _el(color="rgba(0, 0, 0, 0)"))
    assert rgb is None


def test_resolve_run_color_falls_back_to_element_color_if_spec_missing():
    spec = {"text": "x"}
    rgb = _resolve_run_color(spec, _el(color="rgb(50, 60, 70)"))
    assert rgb == RGBColor(50, 60, 70)
