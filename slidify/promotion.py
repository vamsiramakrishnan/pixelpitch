"""Promotion engine.

Walks the VisualUnit DAG bottom-up. Resolves cases where a parent and its
children disagree, applying the rules in spec §4.8.

The promotion engine is biased toward *surgical hybrid* — when a parent has
decoration (bg image, pseudo-element) AND any child is native, we keep the
parent as a hybrid background (raster the decoration only) and let the
children emit on top. The cascade-rastering of earlier versions is reserved
for the corner case where every child is raster anyway.
"""

from __future__ import annotations

import structlog

from slidify.geom import parse_px
from slidify.gradients import parse_gradient
from slidify.models import (
    Decision,
    DecisionKind,
    EmitOp,
    VisualUnit,
)
from slidify.shadows import is_translatable_shadow

log = structlog.get_logger(__name__)


_RASTER_KINDS = {DecisionKind.Raster, DecisionKind.Hybrid}
_NATIVE_KINDS = {
    DecisionKind.NativeText,
    DecisionKind.NativeShape,
    DecisionKind.NativeBullet,
    DecisionKind.NativePicture,
    DecisionKind.NativeSvg,
}


def _has_visual_presence(unit: VisualUnit) -> bool:
    elems = unit.all_elements()
    if not elems:
        return False
    a = elems[0]
    if a.background_color and a.background_color not in ("rgba(0, 0, 0, 0)", "transparent", ""):
        return True
    if a.background_image and a.background_image != "none":
        return True
    if a.box_shadow and a.box_shadow != "none":
        return True
    if a.transform and a.transform != "none":
        return True
    if a.has_before or a.has_after:
        return True
    if parse_px(a.border_radius) > 0:
        return True
    return False


def _has_bg_image_or_pseudo(unit: VisualUnit) -> bool:
    elems = unit.all_elements()
    if not elems:
        return False
    a = elems[0]
    if a.background_image and a.background_image != "none":
        return True
    if a.has_before and a.before_content and "url(" in a.before_content:
        return True
    if a.has_after and a.after_content and "url(" in a.after_content:
        return True
    return False


def _native_decoration_only(unit: VisualUnit) -> bool:
    """True iff the unit's anchor has *only* decoration we can render natively
    (gradient, translatable shadow, solid bg, border, radius). No raster-required
    layers like url() backgrounds, pseudo-elements, transforms, filters, clip-paths.
    """
    if not unit.elements:
        return False
    a = unit.elements[0]
    if a.has_before or a.has_after:
        return False
    if a.transform and a.transform != "none":
        return False
    if a.filter and a.filter != "none":
        return False
    if a.clip_path and a.clip_path != "none":
        return False
    if a.background_image and a.background_image != "none":
        if "url(" in a.background_image:
            return False
        if not parse_gradient(a.background_image):
            return False
    if (
        a.box_shadow
        and a.box_shadow != "none"
        and not is_translatable_shadow(a.box_shadow)
    ):
        return False
    return True


def _has_low_opacity(unit: VisualUnit) -> bool:
    elems = unit.all_elements()
    return any(e.opacity < 0.99 for e in elems)


def promote(
    roots: list[VisualUnit], decisions: dict[str, Decision]
) -> dict[str, Decision]:
    """Bottom-up walk; mutates a copy of decisions and returns it."""
    out = dict(decisions)

    def visit(unit: VisualUnit) -> None:
        for child in unit.children:
            visit(child)

        my_decision = out.get(unit.id)
        if not unit.children:
            return

        child_decisions = [out.get(c.id) for c in unit.children]
        child_kinds = [d.kind for d in child_decisions if d is not None]
        if not child_kinds:
            return

        all_raster = all(k in _RASTER_KINDS for k in child_kinds)
        any_native = any(k in _NATIVE_KINDS for k in child_kinds)

        # Edge case: opacity < 1 on a unit with children → rasterize whole unit.
        if _has_low_opacity(unit) and unit.children:
            out[unit.id] = Decision(
                kind=DecisionKind.Raster,
                confidence=1.0,
                reason="opacity<1 with children",
                source_tier="promotion",
            )
            for c in unit.children:
                if out.get(c.id) and out[c.id].kind != DecisionKind.Skip:
                    out[c.id] = Decision(
                        kind=DecisionKind.Skip,
                        confidence=1.0,
                        reason="absorbed by raster parent (opacity)",
                        source_tier="promotion",
                    )
            return

        # Rule N0: parent's own decoration is fully native-translatable
        # (gradient/shadow/solid bg). Promote the parent to NativeShape and let
        # children emit independently — no rastering anywhere.
        if _native_decoration_only(unit):
            if my_decision is None or my_decision.kind in (
                DecisionKind.Skip,
                DecisionKind.Raster,
                DecisionKind.Hybrid,
            ):
                out[unit.id] = Decision(
                    kind=DecisionKind.NativeShape,
                    confidence=0.85,
                    reason="native_decoration_promoted",
                    source_tier="promotion",
                )
            return

        # Rule N1: parent has un-translatable decoration (url() bg or pseudo)
        # but at least one child is native → emit hybrid (raster crop of
        # the decoration layer + native children on top). Surgical hybrid.
        if _has_bg_image_or_pseudo(unit) and any_native:
            out[unit.id] = Decision(
                kind=DecisionKind.Hybrid,
                confidence=0.9,
                reason="surgical_hybrid",
                source_tier="promotion",
            )
            return

        # Rule 1: All children raster + parent has visual presence and no
        # native-translatable decoration we could spare → fully raster.
        if all_raster and _has_visual_presence(unit):
            out[unit.id] = Decision(
                kind=DecisionKind.Raster,
                confidence=1.0,
                reason="all_children_raster_with_presence",
                source_tier="promotion",
            )
            for c in unit.children:
                out[c.id] = Decision(
                    kind=DecisionKind.Skip,
                    confidence=1.0,
                    reason="absorbed by raster parent",
                    source_tier="promotion",
                )
            return

        # Rule 2 / 4: parent is plain wrapper — keep children's decisions.
        # If parent has no decision, give it a transparent shape so we don't
        # lose its structural slot.
        if my_decision is None:
            out[unit.id] = Decision(
                kind=DecisionKind.Skip,
                confidence=1.0,
                reason="plain_wrapper",
                source_tier="promotion",
            )

    for r in roots:
        visit(r)

    return out


def to_emit_ops(
    roots: list[VisualUnit], decisions: dict[str, Decision]
) -> list[EmitOp]:
    """Linearize the unit DAG to a list of EmitOps in z-order (bottom→top).

    Default z-order is DOM pre-order (depth-first, parent before children).
    """
    ops: list[EmitOp] = []
    counter = [0]

    def visit(unit: VisualUnit) -> None:
        decision = decisions.get(unit.id)
        if decision is None or decision.kind == DecisionKind.Skip:
            for c in unit.children:
                visit(c)
            return

        # Hybrid: emit raster bg first, then children natively.
        if decision.kind == DecisionKind.Hybrid:
            ops.append(
                EmitOp(
                    unit_id=unit.id,
                    decision=Decision(
                        kind=DecisionKind.Raster,
                        confidence=decision.confidence,
                        reason="hybrid_bg",
                        source_tier=decision.source_tier,
                    ),
                    z_order=counter[0],
                    bbox=unit.bbox,
                    payload={"hybrid_role": "background"},
                )
            )
            counter[0] += 1
            for c in unit.children:
                visit(c)
            return

        # Raster absorbs children (they should have been Skip'd by promotion).
        if decision.kind == DecisionKind.Raster:
            ops.append(
                EmitOp(
                    unit_id=unit.id,
                    decision=decision,
                    z_order=counter[0],
                    bbox=unit.bbox,
                    payload={},
                )
            )
            counter[0] += 1
            return

        # Native parent: emit self, then children. NativeText / NativeBullet /
        # NativePicture absorb their region — children should not also emit.
        ops.append(
            EmitOp(
                unit_id=unit.id,
                decision=decision,
                z_order=counter[0],
                bbox=unit.bbox,
                payload={},
            )
        )
        counter[0] += 1
        if decision.kind in (
            DecisionKind.NativeText,
            DecisionKind.NativeBullet,
            DecisionKind.NativePicture,
            DecisionKind.NativeSvg,
        ):
            return
        for c in unit.children:
            visit(c)

    for r in roots:
        visit(r)
    return ops
