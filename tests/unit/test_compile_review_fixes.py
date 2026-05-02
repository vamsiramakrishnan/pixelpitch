"""Regression tests for proactive review-pass fixes.

Covers three bugs found while sweeping compile_ir.py + helpers:

  * Solid fill alpha was discarded — translucent solids rendered opaque.
  * `IRPatternFill.angleDeg` rotated the whole shape, not just the pattern.
  * `_fetch_picture` for non-base64 `data:` URIs returned URL-encoded
    bytes instead of decoded bytes.
"""

from __future__ import annotations

from pathlib import Path

from pptx import Presentation

from slidify.compile_ir import NS_A, _fetch_picture, compile_ir
from slidify.ir import (
    ColorWithAlpha,
    FillSolid,
    IRBbox,
    IRDeck,
    IRPatternFill,
    IRShapeNode,
    IRSlide,
)


def _compile_one(node: IRShapeNode, tmp_path: Path) -> Presentation:
    deck = IRDeck(version=2, slides=[IRSlide(index=0, nodes=[node])])
    out = compile_ir(deck, tmp_path / "p.pptx")
    return Presentation(str(out))


def _shape_sp_pr(prs: Presentation):
    """Return the spPr lxml element for the first non-background shape."""
    for sh in prs.slides[0].shapes:
        sp_pr = getattr(sh._element, "spPr", None)
        if sp_pr is None:
            continue
        # Skip the slide-background rect (full-bleed RECTANGLE).
        # The first shape we want is the test node, not the background.
        return sh, sp_pr
    return None, None


# ---- Solid fill alpha -------------------------------------------------------


def test_solid_fill_translucent_writes_alpha_child(tmp_path):
    """A `{hex, alpha: 0.5}` solid color must emit `<a:alpha val="50000"/>`
    inside its `<a:srgbClr>` so the rendered shape isn't opaque.
    """
    node = IRShapeNode(
        kind="shape",
        recipeId="shape.translucent",
        bbox=IRBbox(x=0, y=0, w=100, h=100),
        shape="rect",
        fill=FillSolid(
            kind="solid",
            color=ColorWithAlpha(hex="#a78bfa", alpha=0.5),
        ),
    )
    prs = _compile_one(node, tmp_path)
    _, sp_pr = _shape_sp_pr(prs)
    solid = sp_pr.find(f"{{{NS_A}}}solidFill")
    assert solid is not None, "shape must carry a solidFill"
    srgb = solid.find(f"{{{NS_A}}}srgbClr")
    assert srgb is not None
    alpha_el = srgb.find(f"{{{NS_A}}}alpha")
    assert alpha_el is not None, (
        "translucent solid lost its alpha — `<a:alpha>` should be present "
        "as a child of `<a:srgbClr>`"
    )
    assert alpha_el.get("val") == str(int(round(0.5 * 100_000)))


def test_solid_fill_opaque_omits_alpha_child(tmp_path):
    """Sanity: an opaque solid must NOT add an `<a:alpha>` child.

    Otherwise existing IR documents would gain spurious markup post-fix.
    """
    node = IRShapeNode(
        kind="shape",
        recipeId="shape.opaque",
        bbox=IRBbox(x=0, y=0, w=100, h=100),
        shape="rect",
        fill=FillSolid(kind="solid", color="#a78bfa"),
    )
    prs = _compile_one(node, tmp_path)
    _, sp_pr = _shape_sp_pr(prs)
    solid = sp_pr.find(f"{{{NS_A}}}solidFill")
    srgb = solid.find(f"{{{NS_A}}}srgbClr")
    assert srgb.find(f"{{{NS_A}}}alpha") is None, (
        "opaque solid should not add an alpha child"
    )


# ---- PatternFill angleDeg ---------------------------------------------------


def test_pattern_fill_angle_deg_does_not_rotate_shape(tmp_path):
    """Per CONTRACT §1.3, `IRPatternFill.angleDeg` rotates the pattern,
    not the shape. PPTX has no per-pattern rotation, but rotating the
    host shape was a worse misinterpretation: it tilted the bbox + any
    other content. The compiler now drops the rotation on the floor
    (logged) instead of altering the shape.
    """
    node = IRShapeNode(
        kind="shape",
        recipeId="shape.angled-pattern",
        bbox=IRBbox(x=0, y=0, w=100, h=100),
        shape="rect",
        fill=IRPatternFill(
            kind="pattern",
            pattern="lines-h",
            fgColor="#888888",
            bgColor="#ffffff",
            angleDeg=45.0,
        ),
    )
    prs = _compile_one(node, tmp_path)
    sh, _ = _shape_sp_pr(prs)
    # python-pptx's `shape.rotation` returns degrees; 0 (or unset) means
    # the shape itself wasn't rotated by the fill emit path.
    assert sh.rotation == 0.0, (
        f"shape rotation should be 0; got {sh.rotation} — pattern "
        "angleDeg leaked into shape transform."
    )


# ---- _fetch_picture data URI ------------------------------------------------


def test_fetch_picture_non_base64_data_uri_decodes_url_escapes():
    """A `data:image/svg+xml,<svg>...` URL with a percent-escape must be
    URL-decoded before being returned as bytes. Otherwise `%3C` survives
    as the three bytes `b'%3C'` instead of `b'<'`, producing a broken
    payload.
    """
    src = "data:image/svg+xml,<svg%20width%3D%221%22/>"
    out = _fetch_picture(src)
    # `%20` → space, `%3D` → `=`, `%22` → `"`
    assert out == b'<svg width="1"/>', f"got {out!r}"


def test_fetch_picture_base64_data_uri_decodes_payload():
    """Sanity: the base64 path keeps working. (Same 1×1 transparent PNG
    used by the escape-hatch fallback.)"""
    import base64

    # 'A' = 0x41 in ASCII = 'QQ==' in base64.
    src = "data:application/octet-stream;base64,QQ=="
    out = _fetch_picture(src)
    assert out == b"A"
    # And a more realistic case: a tiny PNG.
    png_b64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAA"
        "C0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
    )
    out2 = _fetch_picture(f"data:image/png;base64,{png_b64}")
    assert out2 == base64.b64decode(png_b64)
