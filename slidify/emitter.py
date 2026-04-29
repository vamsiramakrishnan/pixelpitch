"""PPTX emitter: turns EmitOps into a python-pptx Presentation."""

from __future__ import annotations

import io
import re
from pathlib import Path
from urllib.parse import urlparse

import httpx
import structlog
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Emu, Pt

from slidify.colors import parse_color
from slidify.exceptions import EmitError
from slidify.fonts import is_bold
from slidify.fonts import resolve as resolve_font
from slidify.geom import (
    SLIDE_H_EMU,
    SLIDE_H_PX,
    SLIDE_W_EMU,
    SLIDE_W_PX,
    parse_pt,
    parse_px,
    px_to_emu,
)
from slidify.models import (
    BoundingBox,
    DecisionKind,
    DomElement,
    EmitOp,
    RenderedSlide,
    VisualUnit,
)

log = structlog.get_logger(__name__)


_TEXT_ALIGN_MAP = {
    "left": PP_ALIGN.LEFT,
    "right": PP_ALIGN.RIGHT,
    "center": PP_ALIGN.CENTER,
    "justify": PP_ALIGN.JUSTIFY,
    "start": PP_ALIGN.LEFT,
    "end": PP_ALIGN.RIGHT,
}


def _clamp_bbox(b: BoundingBox) -> BoundingBox:
    x = max(0.0, min(b.x, SLIDE_W_PX - 1))
    y = max(0.0, min(b.y, SLIDE_H_PX - 1))
    w = max(1.0, min(b.w, SLIDE_W_PX - x))
    h = max(1.0, min(b.h, SLIDE_H_PX - y))
    return BoundingBox(x=x, y=y, w=w, h=h)


def _emu_rect(b: BoundingBox) -> tuple[Emu, Emu, Emu, Emu]:
    b = _clamp_bbox(b)
    return (
        Emu(px_to_emu(b.x)),
        Emu(px_to_emu(b.y)),
        Emu(px_to_emu(b.w)),
        Emu(px_to_emu(b.h)),
    )


class Emitter:
    """Builds a PPTX from rendered slides + per-slide EmitOps."""

    def __init__(self) -> None:
        self.prs = Presentation()
        self.prs.slide_width = Emu(SLIDE_W_EMU)
        self.prs.slide_height = Emu(SLIDE_H_EMU)
        self._image_cache: dict[str, bytes] = {}
        self._http = httpx.Client(timeout=10.0, follow_redirects=True)

    def close(self) -> None:
        self._http.close()

    # ----- public --------------------------------------------------------

    async def emit_slide(
        self,
        slide_index: int,
        rendered: RenderedSlide,
        units_by_id: dict[str, VisualUnit],
        ops: list[EmitOp],
        renderer,
        notes: str = "",
    ) -> None:
        layout = self.prs.slide_layouts[6]  # blank
        slide = self.prs.slides.add_slide(layout)

        if rendered.degraded:
            log.warning("emitter.degraded_slide", slide_index=slide_index, reason=rendered.reason)
            # Fall back to ground-truth raster as a safety net.
            self._emit_full_raster(slide, rendered.ground_truth_png)
            if notes:
                self._set_notes(slide, notes)
            return

        # Sort ops by z_order (already pre-order; but EmitOps may include explicit z)
        ops_sorted = sorted(ops, key=lambda o: o.z_order)
        for op in ops_sorted:
            try:
                await self._emit_op(slide, op, units_by_id, rendered, renderer)
            except Exception as e:
                log.warning(
                    "emitter.op_failed",
                    unit_id=op.unit_id,
                    kind=op.decision.kind,
                    error=str(e),
                )
                # Last-resort: fall back to ground-truth crop for this region.
                try:
                    self._emit_region_raster(
                        slide, rendered.ground_truth_png, op.bbox
                    )
                except Exception as e2:
                    log.error("emitter.fallback_failed", error=str(e2))

        if notes:
            self._set_notes(slide, notes)

    def save(self, path: Path | str) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.prs.save(str(path))

    # ----- per-op dispatch ----------------------------------------------

    async def _emit_op(
        self,
        slide,
        op: EmitOp,
        units_by_id: dict[str, VisualUnit],
        rendered: RenderedSlide,
        renderer,
    ) -> None:
        unit = units_by_id.get(op.unit_id)
        if unit is None:
            return
        kind = op.decision.kind

        if kind == DecisionKind.Skip:
            return

        if kind == DecisionKind.NativeText:
            self._emit_native_text(slide, unit, op)
            return

        if kind == DecisionKind.NativeBullet:
            self._emit_native_bullet(slide, unit, op)
            return

        if kind == DecisionKind.NativeShape:
            self._emit_native_shape(slide, unit, op)
            return

        if kind == DecisionKind.NativePicture:
            self._emit_native_picture(slide, unit, op)
            return

        if kind == DecisionKind.Raster:
            await self._emit_raster(slide, unit, op, rendered, renderer)
            return

        if kind == DecisionKind.Hybrid:
            # Hybrid background — emit raster of full unit, children continue separately.
            await self._emit_raster(slide, unit, op, rendered, renderer)
            return

    # ----- native text ---------------------------------------------------

    def _pick_text_anchor(self, unit: VisualUnit) -> DomElement | None:
        """Return the deepest text-bearing element."""
        text_elems = [
            e for e in unit.all_elements() if e.text and e.text.strip()
        ]
        if not text_elems:
            return None
        # Prefer pptx_text override
        for e in text_elems:
            if e.pptx_text:
                return e
        # Largest font-size wins (heuristic for "the headline of the unit")
        return max(text_elems, key=lambda e: parse_px(e.font_size))

    def _emit_native_text(self, slide, unit: VisualUnit, op: EmitOp) -> None:
        anchor = self._pick_text_anchor(unit)
        if anchor is None:
            return
        x, y, w, h = _emu_rect(op.bbox)
        tb = slide.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = Emu(0)
        tf.margin_right = Emu(0)
        tf.margin_top = Emu(0)
        tf.margin_bottom = Emu(0)

        # If unit has a background that we can render, paint it on the textbox.
        unit_anchor_el = unit.elements[0] if unit.elements else None
        if unit_anchor_el is not None:
            self._apply_fill(tb, unit_anchor_el)

        text_elems = [e for e in unit.all_elements() if e.text and e.text.strip()]
        # If multiple text elements, group lines as paragraphs.
        # Otherwise put a single paragraph with the anchor's text.
        para_targets = text_elems if len(text_elems) > 1 else [anchor]
        first = True
        for e in para_targets:
            text = (e.pptx_text or e.text or "").strip()
            if not text:
                continue
            p = tf.paragraphs[0] if first else tf.add_paragraph()
            first = False
            p.alignment = _TEXT_ALIGN_MAP.get(e.text_align, PP_ALIGN.LEFT)
            run = p.add_run()
            run.text = text
            font = run.font
            font.name = resolve_font(e.font_family)
            font.size = Pt(max(8.0, parse_pt(e.font_size)))
            font.bold = is_bold(e.font_weight)
            color = parse_color(e.color)
            if color is not None:
                font.color.rgb = color[0]

    # ----- native bullets ------------------------------------------------

    def _emit_native_bullet(self, slide, unit: VisualUnit, op: EmitOp) -> None:
        # Treat a single ListItem unit as a one-paragraph bullet.
        x, y, w, h = _emu_rect(op.bbox)
        tb = slide.shapes.add_textbox(x, y, w, h)
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = Emu(0)
        tf.margin_right = Emu(0)
        tf.margin_top = Emu(0)
        tf.margin_bottom = Emu(0)
        text_elems = [e for e in unit.all_elements() if e.text and e.text.strip()]
        if not text_elems:
            return
        first = True
        for e in text_elems:
            text = (e.pptx_text or e.text or "").strip()
            if not text:
                continue
            p = tf.paragraphs[0] if first else tf.add_paragraph()
            first = False
            p.text = ""
            run = p.add_run()
            run.text = "• " + text
            font = run.font
            font.name = resolve_font(e.font_family)
            font.size = Pt(max(8.0, parse_pt(e.font_size)))
            font.bold = is_bold(e.font_weight)
            color = parse_color(e.color)
            if color is not None:
                font.color.rgb = color[0]

    # ----- native shape --------------------------------------------------

    def _emit_native_shape(self, slide, unit: VisualUnit, op: EmitOp) -> None:
        x, y, w, h = _emu_rect(op.bbox)
        anchor_el = unit.elements[0] if unit.elements else None
        if anchor_el is None:
            return
        radius = parse_px(anchor_el.border_radius)
        shape_kind = (
            MSO_SHAPE.ROUNDED_RECTANGLE if radius > 0 else MSO_SHAPE.RECTANGLE
        )
        shape = slide.shapes.add_shape(shape_kind, x, y, w, h)
        shape.line.fill.background()  # default to no border
        self._apply_fill(shape, anchor_el)
        self._apply_border(shape, anchor_el)

    def _apply_fill(self, shape, el: DomElement) -> None:
        bg = parse_color(el.background_color)
        if bg is None:
            try:
                shape.fill.background()
            except Exception:
                pass
            return
        try:
            shape.fill.solid()
            shape.fill.fore_color.rgb = bg[0]
        except Exception:
            pass

    def _apply_border(self, shape, el: DomElement) -> None:
        if not el.border or el.border == "none":
            try:
                shape.line.fill.background()
            except Exception:
                pass
            return
        # "1px solid rgb(0, 0, 0)"
        parts = el.border.split()
        if not parts:
            return
        width = parse_px(parts[0])
        if width <= 0:
            try:
                shape.line.fill.background()
            except Exception:
                pass
            return
        # Try to find a color in the border string
        m = re.search(r"(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})", el.border)
        col = parse_color(m.group(1)) if m else None
        try:
            shape.line.width = Emu(px_to_emu(width))
            if col is not None:
                shape.line.color.rgb = col[0]
        except Exception:
            pass

    # ----- native picture (img) ------------------------------------------

    def _emit_native_picture(self, slide, unit: VisualUnit, op: EmitOp) -> None:
        src = op.decision.metadata.get("src") or self._first_img_src(unit)
        if not src:
            return
        try:
            data = self._fetch_image(src)
        except Exception as e:
            log.warning("emitter.image_fetch_failed", src=src[:120], error=str(e))
            return
        x, y, w, h = _emu_rect(op.bbox)
        slide.shapes.add_picture(io.BytesIO(data), x, y, w, h)

    def _first_img_src(self, unit: VisualUnit) -> str | None:
        for e in unit.all_elements():
            if e.is_img and e.img_src:
                return e.img_src
        return None

    def _fetch_image(self, src: str) -> bytes:
        if src in self._image_cache:
            return self._image_cache[src]
        if src.startswith("data:"):
            import base64

            head, _, b64 = src.partition(",")
            if ";base64" in head:
                data = base64.b64decode(b64)
            else:
                data = b64.encode("utf-8")
            self._image_cache[src] = data
            return data
        parsed = urlparse(src)
        if parsed.scheme in ("http", "https"):
            r = self._http.get(src)
            r.raise_for_status()
            data = r.content
        elif parsed.scheme in ("file", ""):
            data = Path(parsed.path or src).read_bytes()
        else:
            raise EmitError(f"unsupported image scheme: {parsed.scheme}")
        self._image_cache[src] = data
        return data

    # ----- raster --------------------------------------------------------

    async def _emit_raster(
        self,
        slide,
        unit: VisualUnit,
        op: EmitOp,
        rendered: RenderedSlide,
        renderer,
    ) -> None:
        # Try a region screenshot from the live page; fall back to ground-truth crop.
        png: bytes | None = None
        try:
            png = await renderer.screenshot_region(
                rendered.html,
                "",
                (op.bbox.x, op.bbox.y, op.bbox.w, op.bbox.h),
            )
        except Exception as e:
            log.warning("emitter.region_screenshot_failed", error=str(e))
            png = None
        if not png:
            self._emit_region_raster(slide, rendered.ground_truth_png, op.bbox)
            return
        x, y, w, h = _emu_rect(op.bbox)
        slide.shapes.add_picture(io.BytesIO(png), x, y, w, h)

    def _emit_region_raster(
        self, slide, ground_truth_png: bytes, bbox: BoundingBox
    ) -> None:
        from PIL import Image

        gt = Image.open(io.BytesIO(ground_truth_png))
        bb = _clamp_bbox(bbox)
        crop = gt.crop(
            (
                int(bb.x),
                int(bb.y),
                int(bb.x + bb.w),
                int(bb.y + bb.h),
            )
        )
        out = io.BytesIO()
        crop.save(out, format="PNG")
        out.seek(0)
        x, y, w, h = _emu_rect(bb)
        slide.shapes.add_picture(out, x, y, w, h)

    def _emit_full_raster(self, slide, png_bytes: bytes) -> None:
        slide.shapes.add_picture(
            io.BytesIO(png_bytes),
            Emu(0),
            Emu(0),
            Emu(SLIDE_W_EMU),
            Emu(SLIDE_H_EMU),
        )

    def _set_notes(self, slide, text: str) -> None:
        try:
            slide.notes_slide.notes_text_frame.text = text
        except Exception as e:
            log.warning("emitter.notes_failed", error=str(e))


def native_area_ratio(
    ops: list[EmitOp], slide_w: int = SLIDE_W_PX, slide_h: int = SLIDE_H_PX
) -> float:
    """Compute fraction of slide area covered by native (non-raster) ops.

    Naively sums non-overlapping native bbox area. Approximate but bounded.
    """
    total = float(slide_w * slide_h)
    if total <= 0:
        return 0.0
    native_area = 0.0
    for op in ops:
        if op.decision.kind in (
            DecisionKind.NativeText,
            DecisionKind.NativeShape,
            DecisionKind.NativeBullet,
            DecisionKind.NativePicture,
        ):
            bb = _clamp_bbox(op.bbox)
            native_area += bb.w * bb.h
    return min(1.0, native_area / total)
