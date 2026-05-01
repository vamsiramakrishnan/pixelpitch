"""Integration test: verify the emitter bakes <a:normAutofit fontScale=...>
into the slide XML for a too-wide title that overflows in the fallback font."""

from __future__ import annotations

import pytest
from pptx import Presentation
from pptx.util import Emu

from slidify.emitter import Emitter, _apply_explicit_autofit
from slidify.models import (
    BoundingBox,
    Decision,
    DecisionKind,
    DomElement,
    EmitOp,
    UnitKind,
    VisualUnit,
)
from slidify.text_metrics import get_inter_font_path

A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"


def _make_text_element(
    eid: int, text: str, bbox: BoundingBox, font_size_px: float
) -> DomElement:
    return DomElement(
        id=eid,
        parent_id=None,
        depth=0,
        tag="H1",
        bbox=bbox,
        text=text,
        font_family="Inter, sans-serif",
        font_size=f"{font_size_px}px",
        font_weight="700",
        color="rgb(0, 0, 0)",
        stable_selector=f"#e{eid}",
    )


@pytest.mark.asyncio
async def test_emitter_bakes_normAutofit_for_overflowing_title(tmp_path):
    if get_inter_font_path() is None:
        pytest.skip("Inter not installed — autofit pre-compute requires it")
    # Long title that, in any reasonable font, overflows a tight bbox.
    long_text = "An Extraordinarily Long Presentation Title That Will Overflow"
    bbox = BoundingBox(x=10, y=10, w=200, h=60)
    el = _make_text_element(1, long_text, bbox, font_size_px=32.0)
    unit = VisualUnit(
        id="u1",
        kind=UnitKind.Title,
        bbox=bbox,
        elements=[el],
    )
    op = EmitOp(
        unit_id="u1",
        decision=Decision(kind=DecisionKind.NativeText),
        z_order=0,
        bbox=bbox,
    )

    em = Emitter()
    slide = em.prs.slides.add_slide(em.prs.slide_layouts[6])
    em._emit_native_text(slide, unit, op)

    out = tmp_path / "out.pptx"
    em.save(out)
    em.close()

    # Reopen and inspect the XML.
    prs = Presentation(str(out))
    s = prs.slides[0]
    found_scales: list[int] = []
    for shape in s.shapes:
        if not shape.has_text_frame:
            continue
        bodyPr = shape.text_frame._txBody.bodyPr
        for autofit in bodyPr.findall(f"{{{A_NS}}}normAutofit"):
            scale = autofit.get("fontScale")
            if scale is not None:
                found_scales.append(int(scale))
    assert found_scales, "expected at least one <a:normAutofit fontScale=...>"
    assert any(s < 100_000 for s in found_scales), (
        f"expected a fontScale < 100000 (shrink); got {found_scales}"
    )


def test_apply_explicit_autofit_replaces_existing():
    # Build a textbox, then call _apply_explicit_autofit twice — confirm only
    # one normAutofit remains and it has the latest values.
    prs = Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    tb = slide.shapes.add_textbox(Emu(0), Emu(0), Emu(1_000_000), Emu(500_000))
    tf = tb.text_frame
    tf.text = "x"

    _apply_explicit_autofit(tf, 90_000, 0)
    _apply_explicit_autofit(tf, 75_000, 5_000)

    bodyPr = tf._txBody.bodyPr
    autofits = bodyPr.findall(f"{{{A_NS}}}normAutofit")
    assert len(autofits) == 1
    assert autofits[0].get("fontScale") == "75000"
    assert autofits[0].get("lnSpcReduction") == "5000"
    # No spAutoFit/noAutofit left behind either.
    assert bodyPr.find(f"{{{A_NS}}}spAutoFit") is None
    assert bodyPr.find(f"{{{A_NS}}}noAutofit") is None
