"""Pydantic models for the slidify pipeline."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class BoundingBox(BaseModel):
    model_config = ConfigDict(frozen=True)

    x: float
    y: float
    w: float
    h: float

    @property
    def x2(self) -> float:
        return self.x + self.w

    @property
    def y2(self) -> float:
        return self.y + self.h

    @property
    def area(self) -> float:
        return max(0.0, self.w) * max(0.0, self.h)

    def envelope(self, other: BoundingBox) -> BoundingBox:
        x1 = min(self.x, other.x)
        y1 = min(self.y, other.y)
        x2 = max(self.x2, other.x2)
        y2 = max(self.y2, other.y2)
        return BoundingBox(x=x1, y=y1, w=x2 - x1, h=y2 - y1)

    def intersect_area(self, other: BoundingBox) -> float:
        x1 = max(self.x, other.x)
        y1 = max(self.y, other.y)
        x2 = min(self.x2, other.x2)
        y2 = min(self.y2, other.y2)
        return max(0.0, x2 - x1) * max(0.0, y2 - y1)

    def overlap_ratio(self, other: BoundingBox) -> float:
        """Intersection / min(area)."""
        denom = min(self.area, other.area)
        if denom <= 0:
            return 0.0
        return self.intersect_area(other) / denom


class TextRun(BaseModel):
    """A single styled run inside a text container (per-span styling)."""

    text: str
    font_family: str = ""
    font_size: str = "16px"
    font_weight: str = "400"
    color: str = "rgb(0, 0, 0)"
    # Run's parent computed background-image. When color is transparent and
    # bg-image is a gradient, the emitter reads this to pick a solid color
    # fallback (gradient-clipped text → solid color).
    background_image: str = "none"
    italic: bool = False
    underline: bool = False
    is_break: bool = False
    # Per-line boxes captured via Range.getClientRects() in the browser.
    # One entry per visual line the text rendered as. Empty when the run
    # is `is_break=True` or the walker couldn't get rects.
    line_boxes: list[BoundingBox] = Field(default_factory=list)


class DomElement(BaseModel):
    """One DOM element snapshot from the in-page walker."""

    id: int
    parent_id: int | None
    depth: int
    tag: str
    cls: str = ""
    bbox: BoundingBox
    z_index: int = 0
    transform: str = "none"
    opacity: float = 1.0
    overflow: str = "visible"
    background_color: str = "rgba(0, 0, 0, 0)"
    background_image: str = "none"
    border: str = "none"
    border_top: str = "none"
    border_radius: str = "0px"
    box_shadow: str = "none"
    filter: str = "none"
    clip_path: str = "none"
    # PPTX-unsupported CSS — captured so the classifier can route the
    # whole unit to a raster fallback rather than emit a half-broken
    # native shape.
    mix_blend_mode: str = "normal"
    backdrop_filter: str = "none"
    background_clip: str = "border-box"
    text: str | None = None
    is_text_container: bool = False
    runs: list[TextRun] | None = None
    font_family: str = ""
    font_size: str = "16px"
    font_weight: str = "400"
    color: str = "rgb(0, 0, 0)"
    text_align: str = "start"
    line_height: str = "normal"
    has_before: bool = False
    has_after: bool = False
    before_content: str | None = None
    after_content: str | None = None
    pseudo_before_style: dict | None = None
    pseudo_after_style: dict | None = None
    is_canvas: bool = False
    is_svg: bool = False
    is_img: bool = False
    is_video: bool = False
    img_src: str | None = None
    svg_path_count: int = 0
    svg_shapes: list[dict] | None = None
    pptx_role: str | None = None
    pptx_rasterize: bool = False
    pptx_skip: bool = False
    pptx_text: str | None = None
    pptx_notes: str | None = None
    aria_label: str | None = None
    stable_selector: str = ""
    # Decoration opt-in: HTML can carry `data-slidify-decorate="hero|glass|tactile|recessed|aurora"`
    # to request a layered native shape stack at emit time. Empty = no
    # decoration (the default — heuristics never silently inflate shape count).
    decorate_hint: str = ""


class UnitKind(str, Enum):
    Generic = "generic"
    Card = "card"
    Title = "title"
    Body = "body"
    ListContainer = "list_container"
    ListItem = "list_item"
    Decoration = "decoration"
    Chart = "chart"
    Image = "image"


class VisualUnit(BaseModel):
    id: str
    kind: UnitKind = UnitKind.Generic
    bbox: BoundingBox
    elements: list[DomElement] = Field(default_factory=list)
    children: list[VisualUnit] = Field(default_factory=list)
    parent_id: str | None = None
    anchor_element_id: int | None = None

    def all_elements(self) -> list[DomElement]:
        out = list(self.elements)
        for c in self.children:
            out.extend(c.all_elements())
        return out


class DecisionKind(str, Enum):
    NativeText = "native_text"
    NativeShape = "native_shape"
    NativeBullet = "native_bullet"
    NativePicture = "native_picture"
    NativeSvg = "native_svg"  # SVG with translatable primitives
    Raster = "raster"
    Hybrid = "hybrid"
    Skip = "skip"


class Decision(BaseModel):
    kind: DecisionKind
    confidence: float = 1.0
    reason: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    source_tier: str = "tier1"  # "tier1" | "tier2" | "tier3" | "promotion" | "oracle_fix"


class EmitOp(BaseModel):
    """One operation for the PPTX emitter."""

    unit_id: str
    decision: Decision
    z_order: int
    bbox: BoundingBox
    payload: dict[str, Any] = Field(default_factory=dict)


class FidelityReport(BaseModel):
    slide_index: int
    ssim: float
    ocr_recall: float
    passed: bool
    failing_regions: list[BoundingBox] = Field(default_factory=list)
    failing_units: list[str] = Field(default_factory=list)
    note: str = ""


class RenderedSlide(BaseModel):
    """A single slide after browser rendering."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    html: str
    elements: list[DomElement]
    ground_truth_png: bytes
    # Optional second-pass screenshot taken with every text node blanked.
    # Captures the *decoration-only* layer — used by surgical-hybrid emission
    # to crop pixel-exact backgrounds without text bleeding into them.
    no_text_png: bytes = b""
    viewport_w: int
    viewport_h: int
    notes: str = ""
    degraded: bool = False
    reason: str = ""


class UnmatchedSignature(BaseModel):
    """A unit that no Tier-0 pattern matched. Logged for the corpus harvester."""

    sig: str
    sig_hash: str
    bbox_w: int
    bbox_h: int
    sample_classes: str = ""
    sample_text: str = ""
    n_occurrences: int = 1


class ConversionResult(BaseModel):
    pptx_path: str
    n_slides: int
    fidelity_reports: list[FidelityReport]
    native_area_ratio: float
    llm_calls: int = 0
    total_cost_usd: float = 0.0
    elapsed_seconds: float = 0.0
    cache_hit_rate: float = 0.0
    decisions_by_tier: dict[str, int] = Field(default_factory=dict)
    pattern_hits: dict[str, int] = Field(default_factory=dict)
    pattern_coverage: float = 0.0
    unmatched_signatures: list[UnmatchedSignature] = Field(default_factory=list)


VisualUnit.model_rebuild()
