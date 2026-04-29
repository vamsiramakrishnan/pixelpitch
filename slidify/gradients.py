"""CSS gradient parsing and translation to OOXML `a:gradFill` payloads.

Handles `linear-gradient` and `radial-gradient` strings as produced by
browser computed styles. Multi-stop, with optional explicit stop positions.

Output is an `lxml.etree._Element` that callers splice into a shape's
`spPr` to replace the default solid fill. python-pptx exposes solid/no-fill
helpers but not gradient; we drop down to OOXML directly.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

from lxml import etree

from slidify.colors import parse_color

# OOXML namespace for DrawingML.
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"


@dataclass
class GradientStop:
    color_hex: str  # 6-hex (no leading #)
    alpha: float = 1.0  # 0..1
    position: float = 0.0  # 0..1


@dataclass
class LinearGradient:
    angle_deg: float  # CSS angle, 0deg = pointing UP
    stops: list[GradientStop]


@dataclass
class RadialGradient:
    stops: list[GradientStop]
    # Center is approximated; PPTX has limited radial control.


_LINEAR_RE = re.compile(r"linear-gradient\s*\(", re.IGNORECASE)
_RADIAL_RE = re.compile(r"radial-gradient\s*\(", re.IGNORECASE)
_ANGLE_DEG_RE = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*deg\s*$", re.IGNORECASE)
_PERCENT_RE = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*%\s*$")


# A computed-style gradient looks like:
#   linear-gradient(135deg, rgb(99, 102, 241) 0%, rgb(236, 72, 153) 100%)
#   linear-gradient(rgb(255, 255, 255), rgb(0, 0, 0))   (default 'to bottom')
#   radial-gradient(rgba(...) 0%, rgba(...) 60%, rgba(...) 100%)


def parse_gradient(css_value: str) -> LinearGradient | RadialGradient | None:
    """Parse a CSS gradient string. Returns None if not a recognized gradient."""
    if not css_value:
        return None
    s = css_value.strip()
    is_linear = _LINEAR_RE.search(s) is not None
    is_radial = _RADIAL_RE.search(s) is not None
    if not (is_linear or is_radial):
        return None

    # Take the *first* gradient layer; computed style may have a stack.
    inner = _extract_first_call(s)
    if inner is None:
        return None
    args = _split_top_level(inner, ",")
    if not args:
        return None

    if is_linear:
        angle = 180.0  # CSS default: 'to bottom' = 180deg
        if not _looks_like_color_stop(args[0]):
            head = args[0].strip()
            m = _ANGLE_DEG_RE.match(head)
            if m:
                angle = float(m.group(1))
            else:
                angle = _parse_to_direction(head, default=180.0)
            stops_raw = args[1:]
        else:
            stops_raw = args
        stops = _parse_stops(stops_raw)
        if len(stops) < 2:
            return None
        return LinearGradient(angle_deg=angle, stops=stops)

    # Radial: skip any leading shape/extent/at-position clause.
    if not _looks_like_color_stop(args[0]):
        stops_raw = args[1:]
    else:
        stops_raw = args
    stops = _parse_stops(stops_raw)
    if len(stops) < 2:
        return None
    return RadialGradient(stops=stops)


def _extract_first_call(s: str) -> str | None:
    """Pull the body of the first linear-gradient(...) or radial-gradient(...)."""
    for kind in ("linear-gradient", "radial-gradient"):
        idx = s.lower().find(kind + "(")
        if idx == -1:
            continue
        start = idx + len(kind) + 1
        depth = 1
        i = start
        while i < len(s):
            ch = s[i]
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0:
                    return s[start:i]
            i += 1
    return None


def _split_top_level(s: str, sep: str) -> list[str]:
    """Split a string by `sep` only at top-level (skipping parens)."""
    out: list[str] = []
    depth = 0
    cur = []
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


def _looks_like_color_stop(s: str) -> bool:
    s = s.strip().lower()
    return s.startswith(("rgb(", "rgba(", "#", "hsl(", "hsla("))


def _parse_to_direction(head: str, default: float) -> float:
    """Translate 'to bottom', 'to right', etc. → CSS angle (deg)."""
    h = head.strip().lower()
    if not h.startswith("to "):
        return default
    direction = h[3:].strip()
    table: dict[str, float] = {
        "top": 0.0,
        "right": 90.0,
        "bottom": 180.0,
        "left": 270.0,
        "top right": 45.0,
        "right top": 45.0,
        "bottom right": 135.0,
        "right bottom": 135.0,
        "bottom left": 225.0,
        "left bottom": 225.0,
        "top left": 315.0,
        "left top": 315.0,
    }
    return table.get(direction, default)


def _parse_stops(raw: list[str]) -> list[GradientStop]:
    """Parse `["rgb(...) 0%", "rgb(...) 100%", ...]` stops; infer positions."""
    stops: list[GradientStop] = []
    if not raw:
        return []
    for item in raw:
        # Color may itself contain spaces (rgba(255, 0, 0, 0.5)) → split off
        # the trailing position by detecting last whitespace not inside parens.
        color_str, position = _split_stop(item)
        col = parse_color(color_str)
        if col is None:
            continue
        rgb, alpha = col
        # Compute hex
        hex_ = f"{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"
        if position is None:
            # Distribute evenly across remaining slots later.
            stops.append(GradientStop(color_hex=hex_, alpha=alpha, position=-1.0))
        else:
            stops.append(
                GradientStop(color_hex=hex_, alpha=alpha, position=position)
            )

    # Fill in unspecified positions by linear interpolation between known ones.
    _fill_positions(stops)
    return stops


def _split_stop(item: str) -> tuple[str, float | None]:
    """Split 'rgb(255,0,0) 50%' → ('rgb(255,0,0)', 0.5)."""
    s = item.strip()
    # Walk from the right, find the last whitespace-separated token outside parens
    depth = 0
    last_space = -1
    for i in range(len(s) - 1, -1, -1):
        ch = s[i]
        if ch == ")":
            depth += 1
        elif ch == "(":
            depth -= 1
        elif ch.isspace() and depth == 0:
            last_space = i
            break
    if last_space == -1:
        return s, None
    color_part = s[:last_space].strip()
    pos_part = s[last_space:].strip()
    m = _PERCENT_RE.match(pos_part)
    if m:
        return color_part, max(0.0, min(1.0, float(m.group(1)) / 100.0))
    # Bare number? (rare)
    try:
        return color_part, max(0.0, min(1.0, float(pos_part)))
    except ValueError:
        return s, None


def _fill_positions(stops: list[GradientStop]) -> None:
    """Fill in any -1 positions using endpoints + linear interpolation."""
    if not stops:
        return
    n = len(stops)
    # Anchor endpoints if missing
    if stops[0].position < 0:
        stops[0].position = 0.0
    if stops[-1].position < 0:
        stops[-1].position = 1.0
    # Walk and fill gaps
    i = 0
    while i < n:
        if stops[i].position >= 0:
            i += 1
            continue
        # Find next anchored stop
        j = i
        while j < n and stops[j].position < 0:
            j += 1
        prev_pos = stops[i - 1].position if i > 0 else 0.0
        next_pos = stops[j].position if j < n else 1.0
        gap = j - i + 1
        for k, idx in enumerate(range(i, j), start=1):
            stops[idx].position = prev_pos + (next_pos - prev_pos) * k / gap
        i = j + 1


# ---------------------------------------------------------------------------
# OOXML emission
# ---------------------------------------------------------------------------


def to_grad_fill_xml(grad: LinearGradient | RadialGradient) -> etree._Element:
    """Build an `<a:gradFill>` element ready to splice into shape's spPr."""
    fill = etree.Element(f"{{{NS_A}}}gradFill", attrib={"flip": "none", "rotWithShape": "1"})

    stop_lst = etree.SubElement(fill, f"{{{NS_A}}}gsLst")
    for stop in grad.stops:
        gs = etree.SubElement(
            stop_lst,
            f"{{{NS_A}}}gs",
            attrib={"pos": str(int(round(max(0.0, min(1.0, stop.position)) * 100_000)))},
        )
        srgb = etree.SubElement(gs, f"{{{NS_A}}}srgbClr", attrib={"val": stop.color_hex})
        if stop.alpha < 0.999:
            etree.SubElement(
                srgb,
                f"{{{NS_A}}}alpha",
                attrib={"val": str(int(round(stop.alpha * 100_000)))},
            )

    if isinstance(grad, LinearGradient):
        # PPTX angle is in 60_000ths of a degree, measured from "right" axis,
        # rotating clockwise. CSS 0deg points UP; 90deg points RIGHT.
        # Convert: pptx_deg = (css_deg - 90) % 360
        # (CSS up = 0 → pptx -90 → pptx +270; CSS right = 90 → pptx 0)
        pptx_deg = (grad.angle_deg - 90.0) % 360.0
        etree.SubElement(
            fill,
            f"{{{NS_A}}}lin",
            attrib={"ang": str(int(round(pptx_deg * 60_000))), "scaled": "0"},
        )
    else:
        path = etree.SubElement(fill, f"{{{NS_A}}}path", attrib={"path": "circle"})
        etree.SubElement(
            path,
            f"{{{NS_A}}}fillToRect",
            attrib={"l": "50000", "t": "50000", "r": "50000", "b": "50000"},
        )

    return fill


def apply_gradient_fill(shape, grad: LinearGradient | RadialGradient) -> bool:
    """Replace a shape's fill with a native gradient. Returns True on success."""
    try:
        sp_pr = shape.fill._xPr  # python-pptx internal — works for shapes/textboxes
    except Exception:
        try:
            sp_pr = shape._element.spPr
        except Exception:
            return False
    if sp_pr is None:
        return False
    # Strip any existing fill children
    for tag_local in (
        "solidFill",
        "gradFill",
        "blipFill",
        "pattFill",
        "noFill",
        "grpFill",
    ):
        for existing in sp_pr.findall(f"{{{NS_A}}}{tag_local}"):
            sp_pr.remove(existing)
    sp_pr.insert(0, to_grad_fill_xml(grad))
    return True


# Helper for callers: detect whether a CSS value is a gradient at all.
def is_gradient(css_value: str | None) -> bool:
    if not css_value:
        return False
    return _LINEAR_RE.search(css_value) is not None or _RADIAL_RE.search(css_value) is not None


# Expose math constant in case callers want to know.
__all__ = [
    "GradientStop",
    "LinearGradient",
    "RadialGradient",
    "apply_gradient_fill",
    "is_gradient",
    "math",
    "parse_gradient",
    "to_grad_fill_xml",
]
