"""Recipe matchers — Tier 0 classifier.

Each recipe is a small predicate over (VisualUnit, Tailwind catalog) that
returns a high-confidence Decision when it matches a known composition.
Recipes are evaluated in order; first match wins. Misses fall through to
tier 1 / 2 / 3.

Bias: recipes never *force* raster decisions for things tier 1 already
catches (canvas, video). They mainly do two things:

    1. Recognize compositions that the heuristic pipeline tends to
       mis-classify (text-heavy gradient cards, glass-blur cards, kicker
       eyebrows, pills) and emit them with full intent.
    2. Recognize things the heuristic doesn't see at all
       (`backdrop-blur-md` anywhere → must raster locally).
"""

from __future__ import annotations

from collections.abc import Callable

from slidify.geom import parse_px
from slidify.gradients import parse_gradient
from slidify.models import Decision, DecisionKind, DomElement, VisualUnit
from slidify.patterns.tailwind import TailwindCatalog, get_default_catalog
from slidify.shadows import is_translatable_shadow

RecipeFn = Callable[[VisualUnit, TailwindCatalog], Decision | None]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _anchor(unit: VisualUnit) -> DomElement | None:
    return unit.elements[0] if unit.elements else None


def _own_text_elements(unit: VisualUnit) -> list[DomElement]:
    return [
        e
        for e in unit.elements
        if (e.text and e.text.strip())
        or (e.runs and any(r.text.strip() for r in e.runs if not r.is_break))
    ]


def _all_classes(unit: VisualUnit) -> set[str]:
    """All Tailwind tokens used anywhere in the unit (own + descendant)."""
    out: set[str] = set()
    for e in unit.all_elements():
        if e.cls:
            for token in e.cls.split():
                out.add(token)
    return out


def _children_classify_natively(unit: VisualUnit, decisions: dict[str, Decision]) -> bool:
    """True iff every child unit has a known native or skip decision."""
    if not unit.children:
        return True
    for c in unit.children:
        d = decisions.get(c.id)
        if d is None:
            return False
        if d.kind in (DecisionKind.Raster, DecisionKind.Hybrid):
            return False
    return True


# ---------------------------------------------------------------------------
# Recipes (high precision, low recall — only fire when we're sure)
# ---------------------------------------------------------------------------


def recipe_blur_or_filter_raster(
    unit: VisualUnit, catalog: TailwindCatalog
) -> Decision | None:
    """Any backdrop-blur / blur / mix-blend / heavy filter forces local raster.

    The heuristic pipeline catches these by computed `filter`, but Tailwind's
    `backdrop-filter` lives in a different CSS property and was sometimes
    missed. The class hint is the most reliable signal."""
    anchor = _anchor(unit)
    if anchor is None:
        return None
    if catalog.has_rasterize_only(anchor.cls):
        return Decision(
            kind=DecisionKind.Raster,
            confidence=0.99,
            reason="tailwind:rasterize_only_class",
            source_tier="tier0",
        )
    return None


def recipe_kicker(
    unit: VisualUnit, catalog: TailwindCatalog
) -> Decision | None:
    """Small uppercase eyebrow text — `text-xs/sm` + `tracking-wide(r/est)` +
    optional `uppercase`. Almost always a NativeText with bold weight.

    Common in modern decks (`<div class="kicker">QUARTERLY UPDATE</div>` or
    `<div class="text-xs uppercase tracking-widest">Q2 2026</div>`)."""
    anchor = _anchor(unit)
    if anchor is None:
        return None
    if unit.children:
        return None  # kickers are leaf
    text_elems = _own_text_elements(unit)
    if not text_elems:
        return None

    cls = anchor.cls or ""
    has_small = catalog.has_any(cls, ["text-xs", "text-sm"])
    has_tracking = catalog.has_any(cls, ["tracking-wide", "tracking-wider", "tracking-widest"])
    has_upper = catalog.has_token(cls, "uppercase")

    # Computed-CSS fallback: text-transform isn't in our DomElement, but
    # parse_pt(font_size) ≤ 14 and presence of letter-spacing > 0.05em is a
    # strong signal. We check just the size + tracking-token.
    size_px = parse_px(anchor.font_size)
    is_small = size_px > 0 and size_px <= 14

    if (has_small or is_small) and (has_tracking or has_upper):
        return Decision(
            kind=DecisionKind.NativeText,
            confidence=0.95,
            reason="recipe:kicker",
            metadata={"recipe": "kicker"},
            source_tier="tier0",
        )
    return None


def recipe_pill(
    unit: VisualUnit, catalog: TailwindCatalog
) -> Decision | None:
    """Pill / badge: `rounded-full` + `bg-*` + small text. Emit as composite
    NativeShape (text frame with solid fill) — exactly the behavior the
    NativeText path already produces. The benefit of recognizing it as a
    recipe is confidence + skipping tiers 1–3."""
    anchor = _anchor(unit)
    if anchor is None:
        return None
    if not anchor.cls:
        return None
    cls = anchor.cls

    is_full_rounded = (
        catalog.has_token(cls, "rounded-full")
        or parse_px(anchor.border_radius) >= 100
    )
    has_bg = (
        catalog.has_any(
            cls,
            [
                "bg-white", "bg-black",
            ],
        )
        or any(
            t.startswith("bg-") and ("/" in t or "-" in t[3:])
            for t in cls.split()
        )
        or (anchor.background_color and anchor.background_color != "rgba(0, 0, 0, 0)")
    )
    text_elems = _own_text_elements(unit)
    if not (is_full_rounded and has_bg and text_elems):
        return None
    # Size sanity: pills are short, narrow.
    if unit.bbox.h > 64 or unit.bbox.w > 320:
        return None
    return Decision(
        kind=DecisionKind.NativeText,
        confidence=0.95,
        reason="recipe:pill",
        metadata={"recipe": "pill"},
        source_tier="tier0",
    )


def recipe_gradient_card(
    unit: VisualUnit, catalog: TailwindCatalog
) -> Decision | None:
    """Card with a linear-gradient background — classify as NativeShape so the
    emitter renders the gradient natively. The heuristic pipeline already
    handles this, but a recipe hit short-circuits and avoids the gamble that
    tier 2's pressure score gets it right."""
    anchor = _anchor(unit)
    if anchor is None:
        return None
    bg_img = anchor.background_image or ""
    if "gradient(" not in bg_img:
        return None
    grad = parse_gradient(bg_img)
    if grad is None:
        return None
    # Don't override decisions for units that have native text children we
    # want to keep editable on top — let promotion convert to NativeShape +
    # children. So we only fire when this unit has no child-anchor units.
    if unit.children:
        return None
    # Plain rectangle with a gradient and maybe a border.
    text_in_unit = _own_text_elements(unit)
    if not text_in_unit:
        return Decision(
            kind=DecisionKind.NativeShape,
            confidence=0.95,
            reason="recipe:gradient_card",
            metadata={"recipe": "gradient_card"},
            source_tier="tier0",
        )
    # If text is also present, NativeText path will paint the gradient on the
    # text frame's fill — fine.
    return Decision(
        kind=DecisionKind.NativeText,
        confidence=0.92,
        reason="recipe:gradient_text_card",
        metadata={"recipe": "gradient_text_card"},
        source_tier="tier0",
    )


def recipe_card_shape(
    unit: VisualUnit, catalog: TailwindCatalog
) -> Decision | None:
    """A standard Tailwind/shadcn card: `rounded-{lg/xl/2xl}` + `bg-*` (solid
    or rgba) + maybe `shadow-*` + `border` + `p-*`, with text descendants.

    When children exist, leave it alone — promotion will convert to
    NativeShape with native children on top. This recipe targets *empty*
    cards (decoration only) or cards whose children all classify natively."""
    anchor = _anchor(unit)
    if anchor is None:
        return None
    cls = anchor.cls or ""

    has_radius = (
        catalog.has_any(
            cls, ["rounded", "rounded-md", "rounded-lg", "rounded-xl",
                  "rounded-2xl", "rounded-3xl", "rounded-full"]
        )
        or parse_px(anchor.border_radius) > 0
    )
    has_visible = (
        (anchor.background_color and anchor.background_color != "rgba(0, 0, 0, 0)")
        or (anchor.background_image and anchor.background_image != "none")
        or (anchor.border and anchor.border != "none")
    )
    if not (has_radius and has_visible):
        return None

    # Translatable shadow is fine; complex multi-stack still defers.
    if (
        anchor.box_shadow
        and anchor.box_shadow != "none"
        and not is_translatable_shadow(anchor.box_shadow)
    ):
        return None
    if anchor.transform and anchor.transform != "none":
        return None
    if anchor.filter and anchor.filter != "none":
        return None
    if catalog.has_rasterize_only(cls):
        return None

    # We don't override when the card has text directly in it — the existing
    # native-text path emits the shape AND the text together. For pure decor
    # (icon containers, dividers) emit a clean NativeShape.
    if not _own_text_elements(unit) and not unit.children:
        return Decision(
            kind=DecisionKind.NativeShape,
            confidence=0.92,
            reason="recipe:decoration_card",
            metadata={"recipe": "decoration_card"},
            source_tier="tier0",
        )
    return None


def recipe_hairline_divider(
    unit: VisualUnit, catalog: TailwindCatalog
) -> Decision | None:
    """Thin horizontal/vertical divider: a 1–2px-tall (or wide) shape with a
    solid color. Renders as a native line connector for editability."""
    anchor = _anchor(unit)
    if anchor is None or unit.children or _own_text_elements(unit):
        return None
    if min(unit.bbox.w, unit.bbox.h) > 2:
        return None
    if max(unit.bbox.w, unit.bbox.h) < 32:
        return None
    if not (anchor.background_color and anchor.background_color != "rgba(0, 0, 0, 0)"):
        if not (anchor.border and anchor.border != "none"):
            return None
    return Decision(
        kind=DecisionKind.NativeShape,
        confidence=0.95,
        reason="recipe:hairline_divider",
        metadata={"recipe": "hairline"},
        source_tier="tier0",
    )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


RECIPES: list[RecipeFn] = [
    recipe_blur_or_filter_raster,
    recipe_kicker,
    recipe_pill,
    recipe_hairline_divider,
    recipe_gradient_card,
    recipe_card_shape,
]


def classify_tier0(
    unit: VisualUnit, catalog: TailwindCatalog | None = None
) -> Decision | None:
    """Run all recipes; return the first match."""
    cat = catalog or get_default_catalog()
    for recipe in RECIPES:
        d = recipe(unit, cat)
        if d is not None:
            return d
    return None
