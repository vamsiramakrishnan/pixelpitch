"""Generic YAML pattern matcher.

Loads `patterns.yaml`, compiles each entry into a Predicate, and returns the
first matching pattern's emit spec. Patterns are sorted by priority (lower
first); ties broken by manifest order. Patterns with `tag: structural` never
override an existing decision — they're observed for telemetry only.

The predicate language is intentionally narrow: every clause is a function
of (unit, anchor, catalog) → bool. Adding a new clause type means extending
`_PREDICATE_HANDLERS` below — no manifest changes required for callers.
"""

from __future__ import annotations

import fnmatch
from dataclasses import dataclass, field
from functools import lru_cache
from importlib import resources
from typing import Any

import yaml

from slidify.geom import parse_px
from slidify.gradients import parse_gradient
from slidify.models import Decision, DecisionKind, DomElement, VisualUnit
from slidify.patterns.tailwind import TailwindCatalog, _split_classes
from slidify.shadows import is_translatable_shadow

# ---------------------------------------------------------------------------
# Pattern dataclasses
# ---------------------------------------------------------------------------


@dataclass
class Pattern:
    id: str
    priority: int
    match: dict
    emit: dict
    tag: str = "decision"  # "decision" | "structural"


@dataclass
class PatternHit:
    pattern_id: str
    decision: Decision | None  # None for structural-tag patterns
    metadata: dict = field(default_factory=dict)


@dataclass
class PatternStats:
    """Telemetry: which patterns fired, which units missed everything."""

    hits_by_id: dict[str, int] = field(default_factory=dict)
    structural_hits_by_id: dict[str, int] = field(default_factory=dict)
    n_units: int = 0
    n_decided: int = 0

    @property
    def coverage(self) -> float:
        return self.n_decided / self.n_units if self.n_units > 0 else 0.0


# ---------------------------------------------------------------------------
# Predicate evaluation
# ---------------------------------------------------------------------------


def _anchor_classes(anchor: DomElement) -> list[str]:
    return _split_classes(anchor.cls)


def _has_visible_decoration(anchor: DomElement) -> bool:
    if anchor.background_color and anchor.background_color != "rgba(0, 0, 0, 0)":
        return True
    if anchor.background_image and anchor.background_image != "none":
        return True
    if parse_px(anchor.border_radius) > 0:
        return True
    # Border check: parse the width — the computed value can be e.g.
    # "0px none rgb(245,245,247)" which is "no visible border" but
    # ``!= "none"`` would falsely flag it as decorated. Look for any
    # parseable width > 0 in the leading token.
    if anchor.border and anchor.border != "none":
        leading = anchor.border.split(None, 1)[0]
        if parse_px(leading) > 0:
            return True
    return False


def _bbox_aspect(unit: VisualUnit) -> float:
    w = max(0.0001, unit.bbox.w)
    h = max(0.0001, unit.bbox.h)
    return max(w / h, h / w)


def _bg_image_kind(anchor: DomElement) -> str:
    bg = anchor.background_image
    if not bg or bg == "none":
        return "none"
    if "url(" in bg:
        return "url"
    if parse_gradient(bg):
        return "gradient"
    return "any"


def _shadow_kind(anchor: DomElement) -> str:
    if not anchor.box_shadow or anchor.box_shadow == "none":
        return "none"
    return "translatable" if is_translatable_shadow(anchor.box_shadow) else "any"


# Each handler returns True iff the *clause* is satisfied by the unit.
_PREDICATE_HANDLERS: dict[str, Any] = {}


def _handler(name: str):
    def deco(fn):
        _PREDICATE_HANDLERS[name] = fn
        return fn
    return deco


@_handler("anchor.tag_in")
def _h_tag_in(unit, anchor, catalog, value):
    return anchor.tag in value


@_handler("anchor.tag_not_in")
def _h_tag_not_in(unit, anchor, catalog, value):
    return anchor.tag not in value


@_handler("classes_all")
def _h_classes_all(unit, anchor, catalog, value):
    cls = set(_anchor_classes(anchor))
    return all(c in cls for c in value)


@_handler("classes_any")
def _h_classes_any(unit, anchor, catalog, value):
    cls = set(_anchor_classes(anchor))
    return any(c in cls for c in value)


@_handler("classes_none")
def _h_classes_none(unit, anchor, catalog, value):
    cls = set(_anchor_classes(anchor))
    return all(c not in cls for c in value)


@_handler("classes_glob_any")
def _h_classes_glob_any(unit, anchor, catalog, value):
    cls = _anchor_classes(anchor)
    for pattern in value:
        for token in cls:
            if fnmatch.fnmatchcase(token, pattern):
                return True
    return False


@_handler("classes_any_rasterize_only")
def _h_rasterize_only(unit, anchor, catalog, value):
    if not value:
        return True
    return catalog.has_rasterize_only(anchor.cls)


@_handler("has_token_resolved")
def _h_has_token_resolved(unit, anchor, catalog, value):
    """Check that at least one anchor class resolves to the given family."""
    families = value if isinstance(value, list) else [value]
    for token in _anchor_classes(anchor):
        r = catalog.classify_token(token)
        if r is not None and r.family in families:
            return True
    return False


@_handler("bg_image_kind")
def _h_bg_image_kind(unit, anchor, catalog, value):
    return _bg_image_kind(anchor) == value


@_handler("shadow")
def _h_shadow(unit, anchor, catalog, value):
    if value == "any":
        return _shadow_kind(anchor) != "none"
    return _shadow_kind(anchor) == value


@_handler("transform")
def _h_transform(unit, anchor, catalog, value):
    has_t = bool(anchor.transform) and anchor.transform != "none"
    return (value == "any") if has_t else (value == "none")


@_handler("filter")
def _h_filter(unit, anchor, catalog, value):
    has_f = bool(anchor.filter) and anchor.filter != "none"
    return (value == "any") if has_f else (value == "none")


@_handler("mix_blend_mode")
def _h_mix_blend_mode(unit, anchor, catalog, value):
    """`mix_blend_mode: any` matches anchors / descendants with any non-
    `normal` blend mode. PPTX has no equivalent so the match must route
    the unit to Raster."""
    has = any(
        (getattr(e, "mix_blend_mode", "normal") or "normal") not in ("normal", "")
        for e in unit.all_elements()
    )
    return (value == "any") if has else (value == "none")


@_handler("backdrop_filter")
def _h_backdrop_filter(unit, anchor, catalog, value):
    has = any(
        (getattr(e, "backdrop_filter", "none") or "none") not in ("none", "")
        for e in unit.all_elements()
    )
    return (value == "any") if has else (value == "none")


@_handler("text_image_mask")
def _h_text_image_mask(unit, anchor, catalog, value):
    """`background-clip: text` over a `background-image: url(...)`. Text
    glyphs are a window into a raster — PPTX text-fill can't express it."""
    found = False
    for e in unit.all_elements():
        clip = getattr(e, "background_clip", "border-box") or "border-box"
        if clip != "text":
            continue
        bg = e.background_image or "none"
        if bg != "none" and "url(" in bg:
            found = True
            break
    return (value == "any") if found else (value == "none")


@_handler("bg_image_url")
def _h_bg_image_url(unit, anchor, catalog, value):
    """Anchor (or any direct element) with `background-image: url(...)`.
    Slidify can't fetch+embed bg-image URLs natively (only `<img>` tags)."""
    has = any(
        (e.background_image or "none") != "none" and "url(" in (e.background_image or "")
        for e in unit.elements
    )
    return (value == "any") if has else (value == "none")


@_handler("own_text")
def _h_own_text(unit, anchor, catalog, value):
    has = any(
        (e.text and e.text.strip())
        or (e.runs and any(r.text.strip() for r in e.runs if not r.is_break))
        for e in unit.elements
    )
    return has if value else not has


@_handler("children")
def _h_children(unit, anchor, catalog, value):
    return (value == "any") if unit.children else (value == "none")


@_handler("has_visible_decoration")
def _h_has_visible_decoration(unit, anchor, catalog, value):
    return _has_visible_decoration(anchor) == bool(value)


# Numeric bound predicates ---------------------------------------------------


def _num_bound(actual: float, comp: str, target: float) -> bool:
    if comp == "max":
        return actual <= target
    if comp == "min":
        return actual >= target
    return False


@_handler("bbox.h_max")
def _h_bbox_h_max(unit, anchor, catalog, value):
    return _num_bound(unit.bbox.h, "max", float(value))


@_handler("bbox.h_min")
def _h_bbox_h_min(unit, anchor, catalog, value):
    return _num_bound(unit.bbox.h, "min", float(value))


@_handler("bbox.w_max")
def _h_bbox_w_max(unit, anchor, catalog, value):
    return _num_bound(unit.bbox.w, "max", float(value))


@_handler("bbox.w_min")
def _h_bbox_w_min(unit, anchor, catalog, value):
    return _num_bound(unit.bbox.w, "min", float(value))


@_handler("bbox.aspect_max")
def _h_bbox_aspect_max(unit, anchor, catalog, value):
    return _bbox_aspect(unit) <= float(value)


@_handler("bbox.aspect_min")
def _h_bbox_aspect_min(unit, anchor, catalog, value):
    return _bbox_aspect(unit) >= float(value)


@_handler("font_size_px_max")
def _h_fsize_max(unit, anchor, catalog, value):
    return _num_bound(parse_px(anchor.font_size), "max", float(value))


@_handler("font_size_px_min")
def _h_fsize_min(unit, anchor, catalog, value):
    return _num_bound(parse_px(anchor.font_size), "min", float(value))


@_handler("border_radius_px_min")
def _h_radius_min(unit, anchor, catalog, value):
    return _num_bound(parse_px(anchor.border_radius), "min", float(value))


@_handler("border_radius_px_max")
def _h_radius_max(unit, anchor, catalog, value):
    return _num_bound(parse_px(anchor.border_radius), "max", float(value))


# ---- New: position, text length, child counts, color luminance ------------


@_handler("bbox.y_max")
def _h_y_max(unit, anchor, catalog, value):
    """unit's top must be at or above this y (in px). Useful for "is in the
    top of the slide" predicates."""
    return unit.bbox.y <= float(value)


@_handler("bbox.y_min")
def _h_y_min(unit, anchor, catalog, value):
    return unit.bbox.y >= float(value)


@_handler("bbox.bottom_min")
def _h_bottom_min(unit, anchor, catalog, value):
    """unit's bottom edge ≥ value. Useful for footer detection."""
    return unit.bbox.y + unit.bbox.h >= float(value)


@_handler("text_length_max")
def _h_text_length_max(unit, anchor, catalog, value):
    text = "".join(
        e.text or "" for e in unit.elements if e.text and e.text.strip()
    )
    return len(text.strip()) <= int(value)


@_handler("text_length_min")
def _h_text_length_min(unit, anchor, catalog, value):
    text = "".join(
        e.text or "" for e in unit.elements if e.text and e.text.strip()
    )
    return len(text.strip()) >= int(value)


@_handler("n_children_max")
def _h_n_children_max(unit, anchor, catalog, value):
    return len(unit.children) <= int(value)


@_handler("n_children_min")
def _h_n_children_min(unit, anchor, catalog, value):
    return len(unit.children) >= int(value)


@_handler("anchor.is_img")
def _h_is_img(unit, anchor, catalog, value):
    return anchor.is_img == bool(value)


@_handler("anchor.is_canvas")
def _h_is_canvas(unit, anchor, catalog, value):
    return anchor.is_canvas == bool(value)


@_handler("anchor.is_svg")
def _h_is_svg(unit, anchor, catalog, value):
    return anchor.is_svg == bool(value)


@_handler("anchor.opacity_max")
def _h_anchor_opacity_max(unit, anchor, catalog, value):
    """Anchor's `opacity` is at most `value`. Use `0.95` as the typical
    threshold for "visibly translucent" (anything less is essentially full)."""
    try:
        return float(anchor.opacity) <= float(value)
    except (TypeError, ValueError):
        return False


@_handler("anchor.opacity_min")
def _h_anchor_opacity_min(unit, anchor, catalog, value):
    try:
        return float(anchor.opacity) >= float(value)
    except (TypeError, ValueError):
        return False


# Heuristic luminance via background color hex. Useful for "is dark theme."
def _hex_luma(hex_str: str) -> float | None:
    s = (hex_str or "").strip().lower()
    if s.startswith("rgb(") or s.startswith("rgba("):
        # parse "rgb(r, g, b[, a])"
        import re

        m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", s)
        if not m:
            return None
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
    elif s.startswith("#") and len(s) >= 7:
        try:
            r = int(s[1:3], 16)
            g = int(s[3:5], 16)
            b = int(s[5:7], 16)
        except ValueError:
            return None
    else:
        return None
    # Rec. 709 luminance.
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0


@_handler("anchor.bg_dark")
def _h_bg_dark(unit, anchor, catalog, value):
    """anchor's bg color luminance ≤ 0.30 ⇔ "dark"."""
    luma = _hex_luma(anchor.background_color)
    if luma is None:
        return not bool(value)  # unknown → treat as not-dark
    return (luma <= 0.30) == bool(value)


@_handler("anchor.bg_light")
def _h_bg_light(unit, anchor, catalog, value):
    luma = _hex_luma(anchor.background_color)
    if luma is None:
        return not bool(value)
    return (luma >= 0.85) == bool(value)


@_handler("anchor.text_dark")
def _h_text_dark(unit, anchor, catalog, value):
    luma = _hex_luma(anchor.color)
    if luma is None:
        return not bool(value)
    return (luma <= 0.30) == bool(value)


@_handler("font_weight_min")
def _h_weight_min(unit, anchor, catalog, value):
    from slidify.fonts import parse_weight

    return parse_weight(anchor.font_weight) >= int(value)


@_handler("font_weight_max")
def _h_weight_max(unit, anchor, catalog, value):
    from slidify.fonts import parse_weight

    return parse_weight(anchor.font_weight) <= int(value)


# ---- Composite predicates: inspect child units' shape -----------------------


def _child_anchors(unit):
    """Return the anchor element of each child unit (or None for empty)."""
    out = []
    for c in unit.children:
        if c.elements:
            out.append(c.elements[0])
        else:
            out.append(None)
    return out


@_handler("children_text_count_min")
def _h_children_text_count_min(unit, anchor, catalog, value):
    """Count how many child units are text-bearing (have own text). Useful for
    stat-card recognition: 'has at least 2 text children'."""
    n = 0
    for c in unit.children:
        if any(
            (e.text and e.text.strip())
            or (e.runs and any(r.text.strip() for r in e.runs if not r.is_break))
            for e in c.elements
        ):
            n += 1
    return n >= int(value)


@_handler("children_with_gradient_count_min")
def _h_children_grad_count_min(unit, anchor, catalog, value):
    n = 0
    for a in _child_anchors(unit):
        if a is None:
            continue
        bg = a.background_image or ""
        if "gradient(" in bg:
            n += 1
    return n >= int(value)


@_handler("children_only_text")
def _h_children_only_text(unit, anchor, catalog, value):
    """True iff every child unit is text-only (own text, no further children)."""
    if not unit.children:
        return not bool(value)
    for c in unit.children:
        if c.children:
            return not bool(value)
        has_text = any(
            (e.text and e.text.strip())
            or (e.runs and any(r.text.strip() for r in e.runs if not r.is_break))
            for e in c.elements
        )
        if not has_text:
            return not bool(value)
    return bool(value)


# ---------------------------------------------------------------------------
# Manifest loading
# ---------------------------------------------------------------------------


def _load_manifest_yaml() -> list[Pattern]:
    pkg = resources.files("slidify.patterns.data")
    raw = yaml.safe_load((pkg / "patterns.yaml").read_text(encoding="utf-8"))
    out: list[Pattern] = []
    for entry in raw.get("patterns", []):
        out.append(
            Pattern(
                id=entry["id"],
                priority=int(entry.get("priority", 100)),
                match=entry.get("match", {}),
                emit=entry.get("emit", {}),
                tag=entry.get("tag", "decision"),
            )
        )
    out.sort(key=lambda p: p.priority)
    return out


@lru_cache(maxsize=1)
def get_default_patterns() -> list[Pattern]:
    return _load_manifest_yaml()


# ---------------------------------------------------------------------------
# Matcher
# ---------------------------------------------------------------------------


def _check_match(unit: VisualUnit, anchor: DomElement, catalog: TailwindCatalog, match: dict) -> bool:
    for key, value in match.items():
        handler = _PREDICATE_HANDLERS.get(key)
        if handler is None:
            return False  # unknown clause — fail closed
        if not handler(unit, anchor, catalog, value):
            return False
    return True


def _emit_to_decision(emit: dict, pattern_id: str) -> Decision | None:
    kind_str = emit.get("kind", "")
    if kind_str == "observe":
        return None  # structural-only
    try:
        kind = DecisionKind(_camel_to_snake(kind_str))
    except ValueError:
        # Allow either CamelCase ("NativeShape") or snake ("native_shape").
        try:
            kind = DecisionKind[kind_str]
        except KeyError:
            return None
    return Decision(
        kind=kind,
        confidence=float(emit.get("confidence", 0.9)),
        reason=emit.get("reason", f"recipe:{pattern_id}"),
        metadata=dict(emit.get("metadata", {})),
        source_tier="tier0",
    )


def _camel_to_snake(s: str) -> str:
    out = []
    for i, ch in enumerate(s):
        if ch.isupper() and i > 0:
            out.append("_")
        out.append(ch.lower())
    return "".join(out)


def match(
    unit: VisualUnit,
    catalog: TailwindCatalog,
    patterns: list[Pattern] | None = None,
    stats: PatternStats | None = None,
) -> PatternHit | None:
    """Return the first matching pattern (or None for miss).

    Structural-tag patterns are recorded into stats but don't return a Decision
    — they're observation-only.
    """
    pats = patterns if patterns is not None else get_default_patterns()
    if stats is not None:
        stats.n_units += 1
    if not unit.elements:
        return None
    anchor = unit.elements[0]

    decision_hit: PatternHit | None = None
    for p in pats:
        if not _check_match(unit, anchor, catalog, p.match):
            continue
        if p.tag == "structural":
            if stats is not None:
                stats.structural_hits_by_id[p.id] = (
                    stats.structural_hits_by_id.get(p.id, 0) + 1
                )
            continue
        d = _emit_to_decision(p.emit, p.id)
        if d is None:
            continue
        if stats is not None:
            stats.hits_by_id[p.id] = stats.hits_by_id.get(p.id, 0) + 1
            stats.n_decided += 1
        decision_hit = PatternHit(pattern_id=p.id, decision=d, metadata=dict(p.emit.get("metadata", {})))
        break
    return decision_hit
