"""IR → PPTX compiler.

Consumes a JSON IR document (produced by `@slidify/components`) and emits a
native PPTX. No browser, no clustering, no classifier — every primitive in the
IR has a known emission path. Native ratio is 100% by construction; only
`raster` nodes ever hit a picture.

Each emitted shape carries a `slidify:recipeId` extension list entry so the
reverse path (PPTX → IR → JSX) can recognize what to reconstitute.
"""

from __future__ import annotations

import base64
import io
import json
from pathlib import Path

import structlog
from lxml import etree
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Pt

from slidify.colors import parse_color
from slidify.emission.primitives import set_text_frame_margins_zero
from slidify.fonts import resolve as resolve_font
from slidify.geom import (
    SLIDE_H_EMU,
    SLIDE_W_EMU,
    SLIDE_W_PX,
    px_to_emu,
)
from slidify.gradients import (
    GradientStop as GGradientStop,
)
from slidify.gradients import (
    LinearGradient as GLinearGradient,
)
from slidify.gradients import (
    RadialGradient as GRadialGradient,
)
from slidify.gradients import (
    apply_gradient_fill,
)
from slidify.ir import (
    Fill,
    FillLinearGradient,
    FillRadialGradient,
    FillSolid,
    IRBbox,
    IRDeck,
    IRGroupNode,
    IRNode,
    IRParagraph,
    IRPictureNode,
    IRRasterNode,
    IRShapeNode,
    IRSlide,
    IRTextNode,
    _color_to_hex_alpha,
)
from slidify.shadows import (
    BoxShadow as ShBoxShadow,
)
from slidify.shadows import (
    apply_shadow,
)

log = structlog.get_logger(__name__)


# OOXML namespace + slidify recipe-id extension URI.
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
SLIDIFY_RECIPE_NS = "https://slidify.dev/2026/recipe"

_TEXT_ALIGN_MAP = {
    "left": PP_ALIGN.LEFT,
    "right": PP_ALIGN.RIGHT,
    "center": PP_ALIGN.CENTER,
    "justify": PP_ALIGN.JUSTIFY,
}


# ---- Public entry points -----------------------------------------------------


def compile_ir(deck_json: str | dict | IRDeck, output_path: str | Path) -> Path:
    """Compile an IR deck (JSON string, dict, or IRDeck) to PPTX. Returns path."""
    if isinstance(deck_json, IRDeck):
        deck = deck_json
    elif isinstance(deck_json, dict):
        deck = IRDeck.model_validate(deck_json)
    else:
        deck = IRDeck.model_validate(json.loads(deck_json))
    out = Path(output_path)
    compiler = _IRCompiler()
    compiler.compile(deck, out)
    return out


def compile_ir_file(json_path: str | Path, output_path: str | Path) -> Path:
    """Read an IR JSON file and compile to PPTX."""
    text = Path(json_path).read_text(encoding="utf-8")
    return compile_ir(text, output_path)


# ---- Compiler ----------------------------------------------------------------


class _IRCompiler:
    def __init__(self) -> None:
        self.prs = Presentation()
        self.prs.slide_width = Emu(SLIDE_W_EMU)
        self.prs.slide_height = Emu(SLIDE_H_EMU)

    def compile(self, deck: IRDeck, out_path: Path) -> None:
        for slide_ir in deck.slides:
            self._emit_slide(slide_ir)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        self.prs.save(str(out_path))
        log.info("compile_ir.done", path=str(out_path), n_slides=len(deck.slides))

    def _emit_slide(self, slide_ir: IRSlide) -> None:
        layout = self.prs.slide_layouts[6]
        slide = self.prs.slides.add_slide(layout)

        # Slide background: emit as a full-bleed shape behind everything.
        if not _is_white_solid(slide_ir.background):
            self._emit_background_shape(slide, slide_ir.background)

        for node in slide_ir.nodes:
            self._emit_node(slide, node)

        if slide_ir.notes:
            try:
                slide.notes_slide.notes_text_frame.text = slide_ir.notes
            except Exception as e:
                log.warning("compile_ir.notes_failed", error=str(e))

    # ---- Node dispatch -------------------------------------------------------

    def _emit_node(self, slide, node: IRNode) -> None:
        if isinstance(node, IRTextNode):
            self._emit_text(slide, node)
        elif isinstance(node, IRShapeNode):
            self._emit_shape(slide, node)
        elif isinstance(node, IRPictureNode):
            self._emit_picture(slide, node)
        elif isinstance(node, IRRasterNode):
            self._emit_raster(slide, node)
        elif isinstance(node, IRGroupNode):
            for child in node.children:
                self._emit_node(slide, child)

    # ---- Per-node emit -------------------------------------------------------

    def _emit_text(self, slide, node: IRTextNode) -> None:
        bbox = node.bbox or IRBbox(x=0, y=0, w=SLIDE_W_PX, h=80)
        x, y, w, h = _emu_rect(bbox)
        tb = slide.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame
        tf.word_wrap = True
        set_text_frame_margins_zero(tf)

        if node.fill is not None:
            _apply_fill(tb, node.fill)
        if node.shadow is not None:
            _apply_shadow_ir(tb, node.shadow)

        first = True
        for para in node.paragraphs:
            self._emit_paragraph(tf, para, first)
            first = False
        _stamp_recipe_id(tb, node.recipeId)

    def _emit_paragraph(self, tf, para: IRParagraph, first: bool) -> None:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        p.alignment = _TEXT_ALIGN_MAP.get(para.align, PP_ALIGN.LEFT)
        for run_spec in para.runs:
            run = p.add_run()
            run.text = run_spec.text
            font = run.font
            if run_spec.fontFamily:
                font.name = resolve_font(run_spec.fontFamily)
            else:
                font.name = "Inter"
            if run_spec.fontSizePx:
                font.size = Pt(max(8.0, run_spec.fontSizePx * 72.0 / 96.0))
            if run_spec.fontWeight is not None:
                font.bold = run_spec.fontWeight >= 600
            font.italic = run_spec.italic
            font.underline = run_spec.underline
            if run_spec.color is not None:
                hex_, _alpha = _color_to_hex_alpha(run_spec.color)
                col = parse_color(hex_)
                if col is not None:
                    try:
                        font.color.rgb = col[0]
                    except Exception:
                        pass

    def _emit_shape(self, slide, node: IRShapeNode) -> None:
        bbox = node.bbox or IRBbox(x=0, y=0, w=100, h=100)
        x, y, w, h = _emu_rect(bbox)
        radius = node.borderRadiusPx
        kind_map = {
            "rect": MSO_SHAPE.RECTANGLE,
            "rounded-rect": (
                MSO_SHAPE.ROUNDED_RECTANGLE if radius > 0 else MSO_SHAPE.RECTANGLE
            ),
            "oval": MSO_SHAPE.OVAL,
            "line": MSO_SHAPE.RECTANGLE,
        }
        shape = slide.shapes.add_shape(kind_map[node.shape], x, y, w, h)
        shape.line.fill.background()
        _apply_fill(shape, node.fill)
        if node.border is not None:
            self._apply_border(shape, node.border)
        if node.shadow is not None:
            _apply_shadow_ir(shape, node.shadow)
        _stamp_recipe_id(shape, node.recipeId)

    def _apply_border(self, shape, border) -> None:
        hex_, _alpha = _color_to_hex_alpha(border.color)
        col = parse_color(hex_)
        try:
            shape.line.width = Emu(px_to_emu(border.width))
            if col is not None:
                shape.line.color.rgb = col[0]
        except Exception:
            pass

    def _emit_picture(self, slide, node: IRPictureNode) -> None:
        bbox = node.bbox or IRBbox(x=0, y=0, w=SLIDE_W_PX, h=720)
        x, y, w, h = _emu_rect(bbox)
        try:
            data = _fetch_picture(node.src)
        except Exception as e:
            log.warning("compile_ir.picture_fetch_failed", src=node.src[:80], error=str(e))
            return
        pic = slide.shapes.add_picture(io.BytesIO(data), x, y, w, h)
        _stamp_recipe_id(pic, node.recipeId)

    def _emit_raster(self, slide, node: IRRasterNode) -> None:
        bbox = node.bbox or IRBbox(x=0, y=0, w=SLIDE_W_PX, h=720)
        x, y, w, h = _emu_rect(bbox)
        try:
            png_bytes = base64.b64decode(node.pngBase64)
        except Exception as e:
            log.warning("compile_ir.raster_decode_failed", error=str(e))
            return
        pic = slide.shapes.add_picture(io.BytesIO(png_bytes), x, y, w, h)
        _stamp_recipe_id(pic, node.recipeId)

    def _emit_background_shape(self, slide, fill: Fill) -> None:
        shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE,
            Emu(0),
            Emu(0),
            Emu(SLIDE_W_EMU),
            Emu(SLIDE_H_EMU),
        )
        shape.line.fill.background()
        _apply_fill(shape, fill)
        _stamp_recipe_id(shape, "slide-background")
        # Send to back so children render on top. python-pptx doesn't expose
        # z-order helpers cleanly; the background is added first, so it's
        # naturally at the bottom.


# ---- Helpers ----------------------------------------------------------------


def _is_white_solid(fill: Fill) -> bool:
    if not isinstance(fill, FillSolid):
        return False
    hex_, _ = _color_to_hex_alpha(fill.color)
    return hex_.lower() in ("#ffffff", "#fff")


def _emu_rect(b: IRBbox) -> tuple[Emu, Emu, Emu, Emu]:
    return (
        Emu(px_to_emu(b.x)),
        Emu(px_to_emu(b.y)),
        Emu(px_to_emu(b.w)),
        Emu(px_to_emu(b.h)),
    )


def _apply_fill(shape, fill: Fill) -> None:
    if isinstance(fill, FillSolid):
        hex_, _alpha = _color_to_hex_alpha(fill.color)
        col = parse_color(hex_)
        if col is None:
            return
        try:
            shape.fill.solid()
            shape.fill.fore_color.rgb = col[0]
        except Exception:
            pass
        return
    if isinstance(fill, FillLinearGradient):
        grad = GLinearGradient(
            angle_deg=fill.angleDeg,
            stops=[_to_grad_stop(s) for s in fill.stops],
        )
        apply_gradient_fill(shape, grad)
        return
    if isinstance(fill, FillRadialGradient):
        grad = GRadialGradient(
            stops=[_to_grad_stop(s) for s in fill.stops],
            cx=fill.cx,
            cy=fill.cy,
            shape=fill.shape,
        )
        apply_gradient_fill(shape, grad)
        return
    # FillNone
    try:
        shape.fill.background()
    except Exception:
        pass


def _to_grad_stop(s) -> GGradientStop:
    hex_, alpha = _color_to_hex_alpha(s.color)
    # GradientStop wants 6-hex (no leading #).
    bare = hex_[1:] if hex_.startswith("#") else hex_
    return GGradientStop(color_hex=bare.upper(), alpha=alpha, position=s.position)


def _apply_shadow_ir(shape, sh) -> None:
    hex_, alpha = _color_to_hex_alpha(sh.color)
    bare = hex_[1:] if hex_.startswith("#") else hex_
    apply_shadow(
        shape,
        ShBoxShadow(
            inset=sh.inset,
            offset_x_px=sh.offsetX,
            offset_y_px=sh.offsetY,
            blur_px=max(0.0, sh.blur),
            spread_px=sh.spread,
            color_hex=bare.upper(),
            alpha=alpha,
        ),
    )


def _stamp_recipe_id(shape, recipe_id: str) -> None:
    """Tag an emitted shape with its IR recipe id via an extension entry.

    The reverse path (PPTX → IR) reads this back to recognize what
    component produced the shape, enabling round-trip JSX reconstitution.
    """
    try:
        sp_pr = shape._element.spPr
    except AttributeError:
        return
    if sp_pr is None:
        return
    # Find or create extLst
    ext_lst = sp_pr.find(f"{{{NS_A}}}extLst")
    if ext_lst is None:
        ext_lst = etree.SubElement(sp_pr, f"{{{NS_A}}}extLst")
    # One ext per recipe-id (overwrite if already present)
    for existing in ext_lst.findall(f"{{{NS_A}}}ext[@uri='{SLIDIFY_RECIPE_NS}']"):
        ext_lst.remove(existing)
    ext = etree.SubElement(
        ext_lst, f"{{{NS_A}}}ext", attrib={"uri": SLIDIFY_RECIPE_NS}
    )
    rid = etree.SubElement(ext, f"{{{SLIDIFY_RECIPE_NS}}}recipeId")
    rid.text = recipe_id


def _fetch_picture(src: str) -> bytes:
    """Fetch picture bytes from data: URI or http(s) URL."""
    if src.startswith("data:"):
        head, _, b64 = src.partition(",")
        if ";base64" in head:
            return base64.b64decode(b64)
        return b64.encode("utf-8")
    if src.startswith(("http://", "https://")):
        import httpx

        with httpx.Client(timeout=10.0, follow_redirects=True) as c:
            r = c.get(src)
            r.raise_for_status()
            return r.content
    return Path(src).read_bytes()
