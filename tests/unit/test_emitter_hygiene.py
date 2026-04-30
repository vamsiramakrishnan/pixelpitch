"""Tests for the pre-save sanitization pass that prevents PowerPoint's
"repair dialog" from popping at open time.

Patterns covered:
  * Empty <a:p/> gets <a:endParaRPr lang="en-US"/> inserted.
  * Whitespace-bearing <a:t> gains xml:space="preserve" if missing.
"""

from __future__ import annotations

from pathlib import Path

from lxml import etree
from pptx import Presentation

from slidify.emitter import Emitter

NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"


def test_save_inserts_endpararpr_on_empty_paragraphs(tmp_path: Path):
    em = Emitter()
    layout = em.prs.slide_layouts[6]
    slide = em.prs.slides.add_slide(layout)
    tb = slide.shapes.add_textbox(0, 0, 1_000_000, 1_000_000)
    tf = tb.text_frame
    # A paragraph with content.
    tf.paragraphs[0].add_run().text = "x"
    # An intentionally empty paragraph (acts as visual spacer).
    tf.add_paragraph()

    out = tmp_path / "deck.pptx"
    em.save(out)
    em.close()

    prs = Presentation(str(out))
    slide_el = prs.slides[0]._element  # noqa: SLF001
    paragraphs = list(slide_el.iter(f"{{{NS_A}}}p"))
    assert any(
        len(p.findall(f"{{{NS_A}}}r")) == 0
        and p.find(f"{{{NS_A}}}endParaRPr") is not None
        for p in paragraphs
    ), "empty <a:p> still missing <a:endParaRPr>"


def test_save_preserves_whitespace_in_runs(tmp_path: Path):
    em = Emitter()
    slide = em.prs.slides.add_slide(em.prs.slide_layouts[6])
    tb = slide.shapes.add_textbox(0, 0, 5_000_000, 1_000_000)
    tf = tb.text_frame
    run = tf.paragraphs[0].add_run()
    run.text = "  leading and trailing  "

    out = tmp_path / "deck.pptx"
    em.save(out)
    em.close()

    prs = Presentation(str(out))
    slide_el = prs.slides[0]._element  # noqa: SLF001
    ts = list(slide_el.iter(f"{{{NS_A}}}t"))
    relevant = [t for t in ts if t.text and t.text.strip() == "leading and trailing"]
    assert relevant, "test text not found"
    for t in relevant:
        assert t.get(XML_SPACE) == "preserve", f"missing xml:space on '{t.text}'"


def test_sanitize_is_idempotent(tmp_path: Path):
    em = Emitter()
    slide = em.prs.slides.add_slide(em.prs.slide_layouts[6])
    tb = slide.shapes.add_textbox(0, 0, 1_000_000, 1_000_000)
    tb.text_frame.paragraphs[0].add_run().text = "x"
    tb.text_frame.add_paragraph()

    em._sanitize_for_repair_dialog()  # noqa: SLF001
    em._sanitize_for_repair_dialog()  # noqa: SLF001

    # Should not have stacked multiple endParaRPr children.
    slide_el = slide._element  # noqa: SLF001
    for p in slide_el.iter(f"{{{NS_A}}}p"):
        assert len(p.findall(f"{{{NS_A}}}endParaRPr")) <= 1
    em.close()


def test_save_roundtrip_still_valid(tmp_path: Path):
    """The hygiene pass must not break the package — save+load should
    succeed and the slide count must match."""
    em = Emitter()
    for _ in range(3):
        em.prs.slides.add_slide(em.prs.slide_layouts[6])
    out = tmp_path / "deck.pptx"
    em.save(out)
    em.close()

    prs = Presentation(str(out))
    assert len(prs.slides) == 3
