"""Visual Unit Clusterer.

Groups DOM elements into VisualUnits — atomic regions that should be classified
together. See spec §4.4.
"""

from __future__ import annotations

import re

import structlog

from slidify.geom import parse_px
from slidify.models import DomElement, UnitKind, VisualUnit

log = structlog.get_logger(__name__)

# CSS color value indicating "no fill" — these strings appear in computed styles.
_TRANSPARENT_COLORS = {
    "rgba(0, 0, 0, 0)",
    "transparent",
    "",
}


def _is_transparent(color: str) -> bool:
    if not color:
        return True
    c = color.strip().lower()
    if c in _TRANSPARENT_COLORS:
        return True
    # rgba(*, *, *, 0)
    m = re.match(r"rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0(?:\.0+)?\s*\)", c)
    return bool(m)


def _has_visible_border(border: str) -> bool:
    if not border or border == "none":
        return False
    # Computed border looks like "1px solid rgb(0, 0, 0)" — check non-zero width
    # AND that it isn't just "0px ...".
    parts = border.split()
    if not parts:
        return False
    width = parse_px(parts[0])
    if width <= 0:
        return False
    # Style none means no border
    if "none" in parts and "solid" not in border and "dashed" not in border:
        return False
    return True


def _has_shadow(box_shadow: str) -> bool:
    return bool(box_shadow) and box_shadow.lower() != "none"


def _has_radius(border_radius: str) -> bool:
    return parse_px(border_radius) > 0


def _has_transform(transform: str) -> bool:
    return bool(transform) and transform.lower() != "none"


def _has_pseudo(el: DomElement) -> bool:
    return el.has_before or el.has_after


def _is_anchor(el: DomElement, parent_bg: str | None) -> bool:
    """An element is anchor-worthy if it has a visual presence of its own."""
    if el.is_canvas or el.is_svg or el.is_img or el.is_video:
        return True
    if el.transform and el.transform != "none":
        return True
    if _has_pseudo(el):
        return True
    if _has_shadow(el.box_shadow):
        return True
    if _has_radius(el.border_radius):
        return True
    if _has_visible_border(el.border):
        return True
    if not _is_transparent(el.background_color):
        if parent_bg is None or parent_bg != el.background_color:
            return True
    if el.background_image and el.background_image != "none":
        return True
    if el.filter and el.filter != "none":
        return True
    if el.clip_path and el.clip_path != "none":
        return True
    if el.pptx_role:
        return True
    # Leaf text elements with their own meaningful area become anchors so
    # that two different text blocks don't merge into one NativeText frame.
    if el.text and el.text.strip() and el.bbox.area >= 200:
        return True
    return False


def _normalize_class_signature(cls: str) -> frozenset[str]:
    return frozenset(cls.split()) if cls else frozenset()


def _isomorphic_subtree_signature(
    el: DomElement,
    by_parent: dict[int | None, list[DomElement]],
) -> tuple:
    """Return a recursive structural signature: (tag, classes, child sigs)."""
    children = by_parent.get(el.id, [])
    return (
        el.tag,
        _normalize_class_signature(el.cls),
        tuple(_isomorphic_subtree_signature(c, by_parent) for c in children),
    )


def cluster(elements: list[DomElement]) -> list[VisualUnit]:
    """Cluster a flat element list into a list of top-level VisualUnits.

    Returns the children of an implicit root (the page body). Top-level units
    are the anchor-rooted regions of the slide.
    """
    if not elements:
        return []

    by_id: dict[int, DomElement] = {e.id: e for e in elements}
    by_parent: dict[int | None, list[DomElement]] = {}
    for e in elements:
        by_parent.setdefault(e.parent_id, []).append(e)

    # Step 1: Identify anchors. parent_bg() walks up the DOM to find the
    # nearest non-transparent ancestor background, used for the
    # transparent-vs-not heuristic in `_is_anchor`.

    def parent_bg(e: DomElement) -> str | None:
        p = e.parent_id
        while p is not None:
            pe = by_id.get(p)
            if pe is None:
                return None
            if not _is_transparent(pe.background_color):
                return pe.background_color
            p = pe.parent_id
        return None

    anchor_ids: set[int] = set()
    for e in elements:
        if _is_anchor(e, parent_bg(e)):
            anchor_ids.add(e.id)

    # Body itself is always an anchor for grouping purposes.
    if elements:
        # The walker emits the body first; conventionally id=0 has parent=None.
        roots = by_parent.get(None, [])
        for r in roots:
            anchor_ids.add(r.id)

    # Step 2: Assign each element to nearest anchor ancestor (including itself).
    nearest_anchor: dict[int, int] = {}
    for e in elements:
        cur: int | None = e.id
        while cur is not None and cur not in anchor_ids:
            parent = by_id[cur].parent_id
            cur = parent
        if cur is None:
            # Fallback to first ancestor that exists (root)
            cur = e.id
        nearest_anchor[e.id] = cur

    # Group elements by anchor
    grouped: dict[int, list[DomElement]] = {}
    for e in elements:
        grouped.setdefault(nearest_anchor[e.id], []).append(e)

    # Build provisional units
    units_by_anchor: dict[int, VisualUnit] = {}
    for anchor_id, members in grouped.items():
        anchor_el = by_id[anchor_id]
        # Envelope of all member bboxes (use anchor's bbox as starting point)
        env = anchor_el.bbox
        for m in members:
            env = env.envelope(m.bbox)
        unit = VisualUnit(
            id=f"u_{anchor_id}",
            kind=UnitKind.Generic,
            bbox=env,
            elements=members,
            anchor_element_id=anchor_id,
        )
        units_by_anchor[anchor_id] = unit

    # Step 3: Merge spatially-overlapping anchor units with shared style.
    # Apply only between siblings (same parent anchor in DOM hierarchy).
    anchor_parent: dict[int, int | None] = {}
    for aid in units_by_anchor:
        # Walk up from anchor's element to find next anchor ancestor
        p = by_id[aid].parent_id
        while p is not None and p not in anchor_ids:
            p = by_id[p].parent_id
        anchor_parent[aid] = p

    # Group anchors by parent for merge candidates
    by_anchor_parent: dict[int | None, list[int]] = {}
    for aid, pid in anchor_parent.items():
        by_anchor_parent.setdefault(pid, []).append(aid)

    merged_into: dict[int, int] = {}
    for siblings in by_anchor_parent.values():
        # Compare each pair
        for i in range(len(siblings)):
            ai = siblings[i]
            if ai in merged_into:
                continue
            for j in range(i + 1, len(siblings)):
                aj = siblings[j]
                if aj in merged_into:
                    continue
                ei = by_id[ai]
                ej = by_id[aj]
                ratio = ei.bbox.overlap_ratio(ej.bbox)
                if ratio < 0.7:
                    continue
                if ei.background_color != ej.background_color:
                    continue
                if ei.border_radius != ej.border_radius:
                    continue
                # Merge aj → ai (keep larger as canonical)
                small, big = (aj, ai) if ei.bbox.area >= ej.bbox.area else (ai, aj)
                merged_into[small] = big
                u_big = units_by_anchor[big]
                u_small = units_by_anchor[small]
                u_big.elements.extend(u_small.elements)
                u_big.bbox = u_big.bbox.envelope(u_small.bbox)
                if small == ai:
                    break  # ai was merged away; stop comparing j
        # Apply transitive merges within this group (rare but safe)
    # Drop merged anchors
    for small_id in merged_into:
        units_by_anchor.pop(small_id, None)

    # Recompute anchor_parent map after merges (skip merged ids)
    # When pid points to a merged anchor, redirect to its absorber.
    def resolve(aid: int) -> int:
        while aid in merged_into:
            aid = merged_into[aid]
        return aid

    new_parent: dict[int, int | None] = {}
    for aid in units_by_anchor:
        pid = anchor_parent[aid]
        new_parent[aid] = resolve(pid) if pid is not None else None

    # Step 4: Repeated-pattern detection (lists). Look for sibling units whose
    # underlying anchor elements share a structural signature, and tag the
    # parent as ListContainer with ListItem children.
    siblings_by_parent: dict[int | None, list[int]] = {}
    for aid, pid in new_parent.items():
        siblings_by_parent.setdefault(pid, []).append(aid)

    for pid, sibs in siblings_by_parent.items():
        if len(sibs) < 3:
            continue
        sigs: dict[tuple, list[int]] = {}
        for aid in sibs:
            sig = _isomorphic_subtree_signature(by_id[aid], by_parent)
            sigs.setdefault(sig, []).append(aid)
        for _sig, group in sigs.items():
            if len(group) < 3:
                continue
            # Check size similarity (within 10%)
            ws = [by_id[a].bbox.w for a in group]
            hs = [by_id[a].bbox.h for a in group]
            if not ws or not hs:
                continue
            mean_w = sum(ws) / len(ws)
            mean_h = sum(hs) / len(hs)
            if mean_w == 0 or mean_h == 0:
                continue
            if any(abs(w - mean_w) / mean_w > 0.10 for w in ws):
                continue
            if any(abs(h - mean_h) / mean_h > 0.10 for h in hs):
                continue
            # Tag the parent (if it exists in our unit set) and the items.
            if pid is not None and pid in units_by_anchor:
                units_by_anchor[pid].kind = UnitKind.ListContainer
            for aid in group:
                u = units_by_anchor[aid]
                u.kind = UnitKind.ListItem

    # Step 5: Build DAG by attaching child units under their parent units.
    children_map: dict[int | None, list[int]] = {}
    for aid, pid in new_parent.items():
        children_map.setdefault(pid, []).append(aid)

    def build(aid: int) -> VisualUnit:
        unit = units_by_anchor[aid]
        unit.parent_id = (
            f"u_{new_parent[aid]}" if new_parent.get(aid) is not None else None
        )
        unit.children = [build(c) for c in children_map.get(aid, [])]
        return unit

    roots: list[VisualUnit] = []
    for top in children_map.get(None, []):
        roots.append(build(top))

    # Apply post-clustering kind hints
    _apply_kind_hints(roots, by_id)

    log.info(
        "units.cluster",
        n_elements=len(elements),
        n_units=len(units_by_anchor),
        n_top=len(roots),
    )
    return roots


def _apply_kind_hints(roots: list[VisualUnit], by_id: dict[int, DomElement]) -> None:
    """Promote unit kinds based on DOM hints (data-pptx-role, tags, etc.)."""

    def visit(u: VisualUnit) -> None:
        anchor = by_id.get(u.anchor_element_id) if u.anchor_element_id is not None else None
        if anchor:
            if anchor.is_canvas or anchor.is_video:
                u.kind = UnitKind.Chart if anchor.is_canvas else UnitKind.Generic
            elif anchor.is_img:
                u.kind = UnitKind.Image
            elif anchor.pptx_role == "title":
                u.kind = UnitKind.Title
            elif anchor.pptx_role in ("heading", "body", "caption"):
                u.kind = UnitKind.Body
            elif u.kind == UnitKind.Generic and anchor.tag in ("H1", "H2", "H3"):
                u.kind = UnitKind.Title if anchor.tag == "H1" else UnitKind.Body
        for c in u.children:
            visit(c)

    for r in roots:
        visit(r)


def flatten(roots: list[VisualUnit]) -> list[VisualUnit]:
    """Pre-order walk of the unit DAG."""
    out: list[VisualUnit] = []

    def visit(u: VisualUnit) -> None:
        out.append(u)
        for c in u.children:
            visit(c)

    for r in roots:
        visit(r)
    return out
