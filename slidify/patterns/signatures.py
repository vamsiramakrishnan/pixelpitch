"""DOM-shape signatures for VisualUnits.

A signature is a stable, content-addressable string that identifies a unit's
structural shape independent of its text content or exact pixel positions:

    sig := tag(@kind?)[classes_normalized][bbox_quantized]{ child_sig, ... }

Two units with the same signature should classify identically. We use this:
  * As a stronger structural-cache key
  * For telemetry: log every unmatched signature so the corpus harvester
    can suggest new patterns from the most-common ones
  * As a future basis for pattern matching by example
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from slidify.gradients import parse_gradient
from slidify.models import DomElement, VisualUnit
from slidify.patterns.tailwind import _split_classes
from slidify.shadows import is_translatable_shadow

# Class-name "families" we keep in the signature — the value-bearing ones
# that change a unit's classification. Class names matching these prefixes
# survive the signature normalization step. Everything else (specific colors,
# specific paddings, etc.) is dropped because it doesn't change the structural
# shape.
_KEPT_CLASS_PREFIXES: tuple[str, ...] = (
    "rounded",
    "shadow",
    "bg-gradient",
    "from-",
    "to-",
    "via-",
    "tracking-",
    "uppercase",
    "italic",
    "underline",
    "border",
    "text-",   # text-xs/sm/base/lg/xl/2xl/3xl/...
    "font-",   # font-bold/semibold/...
    "leading-",
    "flex",
    "grid",
    "items-",
    "justify-",
    "gap-",
)

_DROPPED_CLASS_EXACT: frozenset[str] = frozenset({
    # Layout / positioning utilities that don't affect structural shape.
    "block", "inline", "inline-block", "hidden",
    "relative", "absolute", "fixed", "sticky", "static",
    "overflow-hidden", "overflow-visible",
    "antialiased", "subpixel-antialiased",
    # Default/zero variants.
    "rounded-none", "shadow-none", "border-0",
})


def _normalize_classes(cls: str | None) -> tuple[str, ...]:
    if not cls:
        return ()
    out: list[str] = []
    for token in _split_classes(cls):
        if token in _DROPPED_CLASS_EXACT:
            continue
        # bg-{color}-{shade} → bg-color (drop specific color/shade)
        # text-{color} stays as text-* (we keep the size text-xs/sm/etc.)
        if token.startswith("bg-") and not token.startswith("bg-gradient"):
            # If it's a color token like bg-indigo-500 or bg-white/10, normalize.
            rest = token[3:]
            if "-" in rest or rest in {"white", "black", "transparent"} or "/" in rest:
                out.append("bg-*color")
                continue
        if token.startswith("text-") and "-" in token[5:]:
            # text-{color}-{shade} also collapses, but text-xs / text-4xl pass.
            rest = token[5:]
            if rest.split("-")[0] in {"xs", "sm", "base", "lg", "xl",
                                       "2xl", "3xl", "4xl", "5xl", "6xl",
                                       "7xl", "8xl", "9xl"}:
                out.append(token)
                continue
            out.append("text-*color")
            continue
        # Drop spacing utility specifics (p-4, m-6, gap-4 are noise for shape).
        if any(token.startswith(p + "-") for p in
               ("p", "px", "py", "pt", "pb", "pl", "pr",
                "m", "mx", "my", "mt", "mb", "ml", "mr",
                "w", "h", "min-w", "min-h", "max-w", "max-h",
                "space-x", "space-y")):
            continue
        # Keep classes from kept families.
        if any(token.startswith(p) for p in _KEPT_CLASS_PREFIXES):
            out.append(token)
            continue
        # Otherwise drop (unknown / arbitrary classes don't help shape).
    return tuple(sorted(set(out)))


def _quantize(v: float, bucket: int = 32) -> int:
    """Bucket a px dimension to a coarse grid for shape stability."""
    return int(v // bucket) * bucket


def _anchor_kind(anchor: DomElement) -> str:
    """Compress anchor properties into a shape-relevant kind tag."""
    bits: list[str] = []
    bg = anchor.background_image or ""
    if bg and bg != "none":
        if "url(" in bg:
            bits.append("bgi=url")
        elif parse_gradient(bg):
            bits.append("bgi=grad")
        else:
            bits.append("bgi=other")
    if anchor.background_color and anchor.background_color != "rgba(0, 0, 0, 0)":
        bits.append("bg")
    if anchor.box_shadow and anchor.box_shadow != "none":
        bits.append("shdw=" + ("t" if is_translatable_shadow(anchor.box_shadow) else "x"))
    if anchor.border and anchor.border != "none":
        # parse a non-zero width
        first = anchor.border.split()
        if first and first[0] not in ("0px", "0"):
            bits.append("brd")
    if anchor.transform and anchor.transform != "none":
        bits.append("xform")
    if anchor.filter and anchor.filter != "none":
        bits.append("filter")
    if anchor.has_before:
        bits.append("::before")
    if anchor.has_after:
        bits.append("::after")
    if anchor.is_canvas:
        bits.append("canvas")
    if anchor.is_svg:
        bits.append(f"svg/{min(anchor.svg_path_count, 12)}")
    if anchor.is_img:
        bits.append("img")
    if anchor.is_video:
        bits.append("video")
    if anchor.text and anchor.text.strip():
        bits.append("txt")
    if anchor.is_text_container:
        bits.append("txtc")
    return "+".join(bits)


def signature(unit: VisualUnit) -> str:
    """Return a deterministic structural signature for `unit`.

    Same shape → same string, regardless of text content or precise
    coordinates. Sub-units recurse.
    """
    if not unit.elements:
        return f"empty[{_quantize(unit.bbox.w, 64)}x{_quantize(unit.bbox.h, 32)}]"
    a = unit.elements[0]
    kind = _anchor_kind(a)
    classes = _normalize_classes(a.cls)
    cls_str = ",".join(classes)
    qbbox = f"{_quantize(unit.bbox.w, 64)}x{_quantize(unit.bbox.h, 32)}"
    children_sigs = ",".join(sorted(signature(c) for c in unit.children))
    children_str = f"{{{children_sigs}}}" if children_sigs else ""
    own_n = max(0, len(unit.elements) - 1)
    own_str = f"<{own_n}>" if own_n else ""
    return f"{a.tag.lower()}({kind})[{cls_str}]{own_str}[{qbbox}]{children_str}"


def signature_hash(unit: VisualUnit) -> str:
    """A short stable hash of `signature(unit)` for use as a cache key."""
    return hashlib.sha256(signature(unit).encode("utf-8")).hexdigest()[:16]


@dataclass
class SignatureMiss:
    """One unmatched unit recorded for telemetry / harvester."""

    sig: str
    sig_hash: str
    bbox_w: int
    bbox_h: int
    sample_classes: str
    sample_text: str
