"""CSS box-shadow parsing and translation to OOXML `a:outerShdw` / `a:innerShdw`.

CSS box-shadow has the shape:
    [inset]? <offset-x> <offset-y> <blur-radius>? <spread-radius>? <color>

Multiple shadows are comma-separated (we take the first parseable one — PPTX
shapes can only carry one shadow effect via DrawingML's effect list).
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from lxml import etree

from slidify.colors import parse_color

NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"


@dataclass
class BoxShadow:
    inset: bool
    offset_x_px: float
    offset_y_px: float
    blur_px: float
    spread_px: float
    color_hex: str
    alpha: float


_NUM_RE = r"-?\d+(?:\.\d+)?"
_PX_NUM_RE = re.compile(rf"({_NUM_RE})\s*px", re.IGNORECASE)


def _split_top_level(s: str, sep: str) -> list[str]:
    out: list[str] = []
    depth = 0
    cur: list[str] = []
    for ch in s:
        if ch == "(":
            depth += 1
            cur.append(ch)
        elif ch == ")":
            depth -= 1
            cur.append(ch)
        elif ch == sep and depth == 0:
            out.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    if cur:
        out.append("".join(cur).strip())
    return out


def parse_box_shadow(css_value: str | None) -> BoxShadow | None:
    """Parse the first comma-separated layer of a CSS box-shadow.

    Returns None for `none` / empty / unparseable input.
    """
    if not css_value:
        return None
    s = css_value.strip()
    if s.lower() == "none":
        return None

    # Take only the first layer (PPTX shapes only support one shadow effect).
    layer = _split_top_level(s, ",")[0]

    # Extract a color token (rgb()/rgba()/hex). The remaining tokens are numeric.
    color_match = re.search(
        r"(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|hsla?\([^)]+\))", layer
    )
    if color_match:
        color_str = color_match.group(1)
        rest = (layer[: color_match.start()] + layer[color_match.end():]).strip()
    else:
        color_str = "rgba(0, 0, 0, 0.25)"  # CSS default-ish
        rest = layer.strip()

    inset = False
    if "inset" in rest.lower():
        inset = True
        rest = re.sub(r"\binset\b", "", rest, flags=re.IGNORECASE).strip()

    nums = _PX_NUM_RE.findall(rest)
    if len(nums) < 2:
        return None
    offset_x = float(nums[0])
    offset_y = float(nums[1])
    blur = float(nums[2]) if len(nums) >= 3 else 0.0
    spread = float(nums[3]) if len(nums) >= 4 else 0.0

    col = parse_color(color_str)
    if col is None:
        return None
    rgb, alpha = col
    hex_ = f"{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"

    return BoxShadow(
        inset=inset,
        offset_x_px=offset_x,
        offset_y_px=offset_y,
        blur_px=max(0.0, blur),
        spread_px=spread,
        color_hex=hex_,
        alpha=alpha,
    )


# ---------------------------------------------------------------------------
# OOXML emission
# ---------------------------------------------------------------------------


def _ensure_effect_lst(sp_pr: etree._Element) -> etree._Element:
    """Get-or-create the spPr's <a:effectLst> child."""
    existing = sp_pr.find(f"{{{NS_A}}}effectLst")
    if existing is not None:
        # Clear children to avoid duplicate effects on re-emit.
        for child in list(existing):
            existing.remove(child)
        return existing
    el = etree.SubElement(sp_pr, f"{{{NS_A}}}effectLst")
    return el


def _emu(px: float) -> int:
    return int(round(px * 9525))


def apply_shadow(shape, shadow: BoxShadow) -> bool:
    """Attach a native shadow effect to `shape`. Returns True on success."""
    try:
        sp_pr = shape._element.spPr  # python-pptx Shape / Picture
    except AttributeError:
        try:
            sp_pr = shape._element.find(f"{{{NS_A}}}spPr")
        except Exception:
            return False
    if sp_pr is None:
        return False
    effect_lst = _ensure_effect_lst(sp_pr)

    # Convert offset into PPTX's distance + direction polar form.
    dx, dy = shadow.offset_x_px, shadow.offset_y_px
    distance = math.hypot(dx, dy)
    # PPTX angle: 0 = pointing right (positive X), measured clockwise. CSS y is
    # positive going DOWN, which matches PPTX's convention.
    if distance < 0.001:
        direction_deg = 0.0
    else:
        direction_deg = (math.degrees(math.atan2(dy, dx)) + 360.0) % 360.0

    tag = f"{{{NS_A}}}{'innerShdw' if shadow.inset else 'outerShdw'}"
    attrs: dict[str, str] = {
        "blurRad": str(_emu(shadow.blur_px)),
        "dist": str(_emu(distance)),
        "dir": str(int(round(direction_deg * 60_000))),
    }
    if not shadow.inset:
        attrs["algn"] = "ctr"
        attrs["rotWithShape"] = "0"
    shdw = etree.SubElement(effect_lst, tag, attrib=attrs)
    srgb = etree.SubElement(shdw, f"{{{NS_A}}}srgbClr", attrib={"val": shadow.color_hex})
    if shadow.alpha < 0.999:
        etree.SubElement(
            srgb,
            f"{{{NS_A}}}alpha",
            attrib={"val": str(int(round(shadow.alpha * 100_000)))},
        )
    return True


def is_translatable_shadow(css_value: str | None) -> bool:
    return parse_box_shadow(css_value) is not None


__all__ = [
    "BoxShadow",
    "apply_shadow",
    "is_translatable_shadow",
    "parse_box_shadow",
]
