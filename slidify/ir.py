"""Slide IR — Python mirror of @slidify/components/src/ir/schema.ts.

The IR is the wire format between the JS component library and the Python
compiler. JSX components emit IR JSON via their `*toIR` helpers; this module
parses the JSON into Pydantic models and `slidify.compile_ir` lowers them to
PPTX with no rendering and no classification.

Keep these models in lockstep with the TS schema; if you change a field on
one side, change it on the other. (A future move: make TS the source of
truth and codegen the Python.)
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# ---- Primitive value types ---------------------------------------------------


class ColorWithAlpha(BaseModel):
    model_config = ConfigDict(frozen=True)
    hex: str  # "#rrggbb"
    alpha: float = 1.0


# A Color is either a "#rrggbb"/"#rrggbbaa" hex string or a ColorWithAlpha object.
Color = str | ColorWithAlpha


class GradientStop(BaseModel):
    color: Color
    position: float


class FillSolid(BaseModel):
    kind: Literal["solid"]
    color: Color


class FillLinearGradient(BaseModel):
    kind: Literal["linear-gradient"]
    angleDeg: float = 180.0
    stops: list[GradientStop]


class FillRadialGradient(BaseModel):
    kind: Literal["radial-gradient"]
    shape: Literal["circle", "ellipse"] = "ellipse"
    cx: float = 0.5
    cy: float = 0.5
    stops: list[GradientStop]


class FillNone(BaseModel):
    kind: Literal["none"]


Fill = FillSolid | FillLinearGradient | FillRadialGradient | FillNone


class IRBoxShadow(BaseModel):
    offsetX: float = 0.0
    offsetY: float = 0.0
    blur: float = 0.0
    spread: float = 0.0
    color: Color
    inset: bool = False


class IRBorder(BaseModel):
    width: float = 1.0
    color: Color
    style: Literal["solid", "dashed", "dotted"] = "solid"


class IRBbox(BaseModel):
    model_config = ConfigDict(frozen=True)
    x: float
    y: float
    w: float
    h: float


class IRTextRun(BaseModel):
    text: str
    fontFamily: str | None = None
    fontSizePx: float | None = None
    fontWeight: int | None = None
    color: Color | None = None
    italic: bool = False
    underline: bool = False


class IRParagraph(BaseModel):
    runs: list[IRTextRun]
    align: Literal["left", "center", "right", "justify"] = "left"


# ---- Node types --------------------------------------------------------------


class _NodeBase(BaseModel):
    recipeId: str
    bbox: IRBbox | None = None
    zOrder: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)


class IRTextNode(_NodeBase):
    kind: Literal["text"]
    paragraphs: list[IRParagraph]
    fill: Fill | None = None
    shadow: IRBoxShadow | None = None


class IRShapeNode(_NodeBase):
    kind: Literal["shape"]
    shape: Literal["rect", "rounded-rect", "oval", "line"] = "rounded-rect"
    borderRadiusPx: float = 0.0
    fill: Fill
    border: IRBorder | None = None
    shadow: IRBoxShadow | None = None


class IRPictureNode(_NodeBase):
    kind: Literal["picture"]
    src: str
    alt: str = ""


class IRRasterNode(_NodeBase):
    kind: Literal["raster"]
    pngBase64: str


class IRGroupNode(_NodeBase):
    kind: Literal["group"]
    children: list[IRNode]


IRNode = IRTextNode | IRShapeNode | IRPictureNode | IRRasterNode | IRGroupNode
IRGroupNode.model_rebuild()


# ---- Slide / Deck ------------------------------------------------------------


class IRTheme(BaseModel):
    name: str = "default"
    bgColor: Color = "#ffffff"
    fgColor: Color = "#000000"
    accent: Color = "#6366f1"
    fontFamily: str = "Inter, sans-serif"


class IRSlide(BaseModel):
    index: int
    bbox: IRBbox = IRBbox(x=0, y=0, w=1280, h=720)
    background: Fill = FillSolid(kind="solid", color="#ffffff")
    nodes: list[IRNode]
    notes: str = ""


class IRDeck(BaseModel):
    """Top-level IR document. Parse with `IRDeck.model_validate(json)`."""

    version: Literal[1] = 1
    theme: IRTheme = IRTheme()
    slides: list[IRSlide]


# ---- Helpers ----------------------------------------------------------------


def _color_to_hex_alpha(c: Color) -> tuple[str, float]:
    """Normalize an IR color to (hex, alpha)."""
    if isinstance(c, str):
        s = c.strip()
        if not s.startswith("#"):
            return ("#000000", 1.0)
        if len(s) == 9:
            try:
                a = int(s[7:9], 16) / 255.0
                return (s[:7], a)
            except ValueError:
                return (s[:7], 1.0)
        return (s[:7], 1.0)
    return (c.hex, c.alpha)


__all__ = [
    "Color",
    "ColorWithAlpha",
    "Fill",
    "FillLinearGradient",
    "FillNone",
    "FillRadialGradient",
    "FillSolid",
    "GradientStop",
    "IRBbox",
    "IRBorder",
    "IRBoxShadow",
    "IRDeck",
    "IRGroupNode",
    "IRNode",
    "IRParagraph",
    "IRPictureNode",
    "IRRasterNode",
    "IRShapeNode",
    "IRSlide",
    "IRTextNode",
    "IRTextRun",
    "IRTheme",
    "_color_to_hex_alpha",
]
