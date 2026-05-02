"""IR → PPTX compiler.

Consumes a JSON IR document (produced by `@slidify/components`) and emits a
native PPTX. No browser, no clustering, no classifier — every primitive in the
IR has a known emission path. Native ratio is 100% by construction; only
`raster` nodes ever hit a picture.

Each emitted shape carries a `slidify:recipeId` extension list entry so the
reverse path (PPTX → IR → JSX) can recognize what to reconstitute.
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import structlog
from lxml import etree
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Pt

from slidify.colors import parse_color
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
# Distinct extension URI for escape-hatch metering payload — keeps the
# harvester's parsing job trivial: scan for this URI, decode the JSON.
SLIDIFY_ESCAPE_NS = "https://slidify.dev/2026/escape-hatch"

# Default slide canvas (px) — kept in sync with IRSlide.bbox default
# in slidify/ir.py. Used as the denominator for escapeRate when the slide
# itself omits a bbox.
_DEFAULT_SLIDE_W_PX = 1280
_DEFAULT_SLIDE_H_PX = 720

# 1×1 transparent PNG — fallback for environments where Playwright
# isn't available (CI without Chromium, unit tests). The .pptx still
# embeds a picture so the slide stays editable; the harvester reads the
# CSS payload from the metadata extension and re-renders if needed.
_TRANSPARENT_1PX_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)

_TEXT_ALIGN_MAP = {
    "left": PP_ALIGN.LEFT,
    "right": PP_ALIGN.RIGHT,
    "center": PP_ALIGN.CENTER,
    "justify": PP_ALIGN.JUSTIFY,
}


# ---- Escape-hatch metering --------------------------------------------------


@dataclass
class EscapeMetering:
    """Per-deck running totals for `report.escapeRate`.

    Tracks the area share each `chrome.escape-hatch` raster consumed,
    bucketed by its free-text `intent` label. Read by `compile_ir(...)`
    as part of the public return value so callers can write the metering
    block straight into `report.json`.

    Per CONTRACT-v2 §F.4. Fields:

    * `total_slide_area`  — sum of slide.bbox area across the deck.
    * `escape_area`       — sum of escape-hatch raster bbox areas.
    * `area_by_intent`    — escape area summed per intent label.
    * `count_by_intent`   — escape-hatch instance count per intent label.
    """

    total_slide_area: float = 0.0
    escape_area: float = 0.0
    area_by_intent: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    count_by_intent: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def add_slide(self, slide_w: float, slide_h: float) -> None:
        self.total_slide_area += max(0.0, slide_w) * max(0.0, slide_h)

    def add_escape(self, intent: str, area: float) -> None:
        if area <= 0:
            return
        self.escape_area += area
        self.area_by_intent[intent] += area
        self.count_by_intent[intent] += 1

    def to_report_dict(self) -> dict:
        """Serialize to the `report.escapeRate` shape per CONTRACT-v2 §F.4."""
        denom = self.total_slide_area
        if denom <= 0:
            return {"value": 0.0, "byIntent": {}, "atomCandidates": []}
        return {
            "value": self.escape_area / denom,
            "byIntent": {k: v / denom for k, v in sorted(self.area_by_intent.items())},
            # M4 harvester populates atomCandidates when run later — see
            # CONTRACT-v2 §F.5. Empty during single-deck compile.
            "atomCandidates": [],
        }


# ---- Public entry points -----------------------------------------------------


def compile_ir(
    deck_json: str | dict | IRDeck,
    output_path: str | Path,
    *,
    return_metering: bool = False,
) -> Path | tuple[Path, EscapeMetering]:
    """Compile an IR deck (JSON string, dict, or IRDeck) to PPTX. Returns path.

    When ``return_metering=True`` returns ``(path, EscapeMetering)`` so the
    caller can attach `report.escapeRate` to its conversion report. Default
    return shape is unchanged for backward compatibility.
    """
    if isinstance(deck_json, IRDeck):
        deck = deck_json
    elif isinstance(deck_json, dict):
        deck = IRDeck.model_validate(deck_json)
    else:
        deck = IRDeck.model_validate(json.loads(deck_json))
    out = Path(output_path)
    compiler = _IRCompiler()
    compiler.compile(deck, out)
    if return_metering:
        return out, compiler.metering
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
        # Per-deck escape-hatch metering, surfaced via `report.escapeRate`.
        self.metering = EscapeMetering()

    def compile(self, deck: IRDeck, out_path: Path) -> None:
        for slide_ir in deck.slides:
            self._emit_slide(slide_ir)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        self.prs.save(str(out_path))
        log.info(
            "compile_ir.done",
            path=str(out_path),
            n_slides=len(deck.slides),
            escape_rate=(
                self.metering.escape_area / self.metering.total_slide_area
                if self.metering.total_slide_area
                else 0.0
            ),
        )

    def _emit_slide(self, slide_ir: IRSlide) -> None:
        layout = self.prs.slide_layouts[6]
        slide = self.prs.slides.add_slide(layout)

        # Slide background: emit as a full-bleed shape behind everything.
        if not _is_white_solid(slide_ir.background):
            self._emit_background_shape(slide, slide_ir.background)

        # Track slide area for the escape-rate denominator BEFORE any node
        # emission — gives accurate accounting even on slides with zero
        # escape-hatch usage (the denominator still grows).
        slide_w = slide_ir.bbox.w if slide_ir.bbox else _DEFAULT_SLIDE_W_PX
        slide_h = slide_ir.bbox.h if slide_ir.bbox else _DEFAULT_SLIDE_H_PX
        self.metering.add_slide(slide_w, slide_h)

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
        tf.margin_left = Emu(0)
        tf.margin_right = Emu(0)
        tf.margin_top = Emu(0)
        tf.margin_bottom = Emu(0)

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
        # Escape-hatch detour: detect, render-if-empty, embed, stamp metadata,
        # and bookkeep for `report.escapeRate`. The detection key is
        # `metadata.role == 'escape-hatch'` (set by EscapeHatch's TSX
        # emitter); we also accept the recipeId as a fallback so handcrafted
        # IR fixtures don't have to remember the metadata convention.
        is_escape = (
            node.metadata.get("role") == "escape-hatch"
            or node.recipeId == "chrome.escape-hatch"
        )
        if is_escape:
            self._emit_escape_hatch(slide, node, bbox)
            return

        x, y, w, h = _emu_rect(bbox)
        try:
            png_bytes = base64.b64decode(node.pngBase64)
        except Exception as e:
            log.warning("compile_ir.raster_decode_failed", error=str(e))
            return
        pic = slide.shapes.add_picture(io.BytesIO(png_bytes), x, y, w, h)
        _stamp_recipe_id(pic, node.recipeId)

    def _emit_escape_hatch(
        self, slide, node: IRRasterNode, bbox: IRBbox
    ) -> None:
        """Embed an escape-hatch raster and stamp its metering payload.

        Pipeline:
          1. Decode the PNG (or render via Chromium if `pngBase64` is empty).
          2. Embed as a picture at the requested bbox.
          3. Stamp the recipe-id extension (so PPTX→IR round-trip recognizes it).
          4. Stamp a separate `escape-hatch` extension carrying the cssPayload,
             intent, attempted, etc., so the harvester can find clusters.
          5. Update `self.metering` for `report.escapeRate`.
        """
        x, y, w, h = _emu_rect(bbox)
        css_payload = str(node.metadata.get("cssPayload", ""))
        body = str(node.metadata.get("body", ""))
        intent = str(node.metadata.get("intent", "unspecified"))
        attempted = node.metadata.get("attempted")

        # 1. Source the PNG. Prefer the IR-supplied pngBase64; fall back to a
        # Chromium screenshot of the cssPayload; final fallback is a 1x1
        # transparent placeholder so the slide still embeds an editable
        # picture frame for the harvester to find later.
        png_bytes: bytes
        if node.pngBase64:
            try:
                png_bytes = base64.b64decode(node.pngBase64)
            except Exception as e:
                log.warning(
                    "compile_ir.escape_hatch_decode_failed", error=str(e)
                )
                png_bytes = base64.b64decode(_TRANSPARENT_1PX_PNG_B64)
        else:
            png_bytes = _render_escape_payload(
                css_payload=css_payload,
                body=body,
                width_px=int(max(1, bbox.w)),
                height_px=int(max(1, bbox.h)),
            )

        try:
            pic = slide.shapes.add_picture(io.BytesIO(png_bytes), x, y, w, h)
        except Exception as e:
            log.warning("compile_ir.escape_hatch_picture_failed", error=str(e))
            return

        # 2. Stamps for round-trip + harvester discovery.
        _stamp_recipe_id(pic, node.recipeId)
        _stamp_escape_metadata(
            pic,
            css_payload=css_payload,
            body=body,
            intent=intent,
            attempted=attempted if isinstance(attempted, str) else None,
        )

        # 3. Metering. Area is in slide-coordinate pixels (matches the
        # denominator added in `_emit_slide`).
        area = max(0.0, bbox.w) * max(0.0, bbox.h)
        self.metering.add_escape(intent, area)
        log.info(
            "compile_ir.escape_hatch_emitted",
            intent=intent,
            attempted=attempted,
            bbox_area=area,
            had_payload=bool(css_payload),
        )

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


def _stamp_escape_metadata(
    shape,
    *,
    css_payload: str,
    body: str,
    intent: str,
    attempted: str | None,
) -> None:
    """Embed the escape-hatch payload as an OOXML extension entry.

    Distinct URI (`SLIDIFY_ESCAPE_NS`) so the harvester's grep can be a
    single substring match; the body is JSON so it stays compact and
    schema-stable across compiler versions.
    """
    try:
        sp_pr = shape._element.spPr
    except AttributeError:
        return
    if sp_pr is None:
        return
    ext_lst = sp_pr.find(f"{{{NS_A}}}extLst")
    if ext_lst is None:
        ext_lst = etree.SubElement(sp_pr, f"{{{NS_A}}}extLst")
    # Replace any prior escape-hatch ext for idempotent re-emission.
    for existing in ext_lst.findall(
        f"{{{NS_A}}}ext[@uri='{SLIDIFY_ESCAPE_NS}']"
    ):
        ext_lst.remove(existing)
    ext = etree.SubElement(
        ext_lst, f"{{{NS_A}}}ext", attrib={"uri": SLIDIFY_ESCAPE_NS}
    )
    payload = etree.SubElement(
        ext, f"{{{SLIDIFY_ESCAPE_NS}}}escapePayload"
    )
    payload.text = json.dumps(
        {
            "intent": intent,
            "attempted": attempted,
            "cssPayload": css_payload,
            "body": body,
        },
        sort_keys=True,
    )


def _render_escape_payload(
    *, css_payload: str, body: str, width_px: int, height_px: int
) -> bytes:
    """Render the escape-hatch CSS payload to PNG via Chromium.

    Best-effort: if Playwright isn't available (CI without browser deps,
    unit tests), returns a 1×1 transparent PNG placeholder so the picture
    frame still embeds and the harvester can later re-render from the
    metadata extension. The metering is unaffected — area accounting uses
    the bbox, not the PNG dimensions.
    """
    html = (
        "<!DOCTYPE html><html><head><meta charset='utf-8'>"
        "<style>html,body{margin:0;padding:0;background:transparent;}"
        f".__esc{{width:{width_px}px;height:{height_px}px;{css_payload}}}"
        "</style></head><body>"
        f"<div class='__esc'>{body}</div>"
        "</body></html>"
    )
    try:
        return asyncio.run(
            _screenshot_html(html, width_px=width_px, height_px=height_px)
        )
    except RuntimeError:
        # We're already inside an event loop (e.g. compile_ir called from an
        # async context). Fall through to placeholder; an async-aware caller
        # should pre-render the PNG and ship it in pngBase64.
        log.info("compile_ir.escape_payload_in_loop_fallback")
        return base64.b64decode(_TRANSPARENT_1PX_PNG_B64)
    except Exception as e:
        log.warning("compile_ir.escape_payload_render_failed", error=str(e))
        return base64.b64decode(_TRANSPARENT_1PX_PNG_B64)


async def _screenshot_html(html: str, *, width_px: int, height_px: int) -> bytes:
    """One-shot Chromium screenshot of an HTML string. Used for escape-hatch
    rasterization. Imported lazily so unit tests without Playwright don't
    fail at import time."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        log.info("compile_ir.playwright_unavailable")
        return base64.b64decode(_TRANSPARENT_1PX_PNG_B64)

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            ctx = await browser.new_context(
                viewport={"width": max(1, width_px), "height": max(1, height_px)},
                device_scale_factor=1,
            )
            page = await ctx.new_page()
            await page.set_content(html, wait_until="load", timeout=10_000)
            try:
                await page.evaluate("document.fonts && document.fonts.ready")
            except Exception:
                pass
            png = await page.screenshot(
                clip={
                    "x": 0,
                    "y": 0,
                    "width": max(1, width_px),
                    "height": max(1, height_px),
                },
                full_page=False,
                type="png",
                omit_background=True,
            )
            return png
        finally:
            await browser.close()


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
