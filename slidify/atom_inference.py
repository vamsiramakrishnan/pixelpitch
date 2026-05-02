"""Implicit atom inference and synthetic priming.

Phase 3 of the coverage-expansion effort. Provides two complementary pieces:

  * :func:`infer_atom_id` — given a :class:`VisualUnit`, return the canonical
    atom id (e.g. ``"bg.mesh"``) when its structural signature is recognised
    by the priming table. Used by ``api._classify_unit_tier12`` to synthesise
    a ``data-atom`` hint when the author didn't tag the markup themselves.
    A miss returns ``None`` silently.
  * :func:`_canonical_unit_for_atom` — build a synthetic :class:`VisualUnit`
    shaped like the prototypical render of an atom. Drives the
    ``slidify prime-atom-cache`` CLI, which hashes one canonical unit per atom
    id from ``atoms.yaml`` and writes the result to
    ``slidify/patterns/data/atom_signatures.json``. The browser-rendered
    variant is intentionally deferred (see TODO inside the function).

The priming table is loaded lazily from a JSON file packaged inside
``slidify.patterns.data``. Format:

    {
      "version": 1,
      "entries": { "<sig_hash>": "<atom_id>", ... }
    }

A missing or malformed file is treated as an empty table — inference simply
returns ``None`` and the existing classifier path runs unchanged.
"""

from __future__ import annotations

import json
from functools import lru_cache
from importlib import resources
from typing import Any

from slidify.models import BoundingBox, DomElement, VisualUnit
from slidify.patterns.signatures import signature_hash

# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

_DATA_PACKAGE = "slidify.patterns.data"
_SIG_FILE = "atom_signatures.json"


@lru_cache(maxsize=1)
def _load_table() -> dict[str, str]:
    """Load the packaged ``atom_signatures.json`` priming table.

    Cached for the process lifetime so repeated lookups are O(1). Returns an
    empty dict if the file is missing or unparseable — never raises.
    """
    try:
        pkg = resources.files(_DATA_PACKAGE)
        path = pkg / _SIG_FILE
        text = path.read_text(encoding="utf-8")
    except (FileNotFoundError, OSError, ModuleNotFoundError):
        return {}
    try:
        raw: Any = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return {}
    if not isinstance(raw, dict):
        return {}
    entries = raw.get("entries", {})
    if not isinstance(entries, dict):
        return {}
    # Coerce all keys/values to str defensively.
    return {str(k): str(v) for k, v in entries.items() if v}


def _reset_table_cache() -> None:
    """Drop the cached priming table. Used by tests after they overwrite the
    JSON file. Not part of the public API."""
    _load_table.cache_clear()


# ---------------------------------------------------------------------------
# Inference
# ---------------------------------------------------------------------------


def infer_atom_id(unit: VisualUnit) -> str | None:
    """Look up `unit`'s signature against the priming table.

    Returns the registered atom id (e.g. ``"bg.mesh"``) when the unit's
    ``signature_hash`` is recognised, otherwise ``None``. The miss path is
    silent so the classifier degrades gracefully when the JSON file is
    missing, empty, or malformed.
    """
    try:
        table = _load_table()
    except Exception:
        return None
    if not table:
        return None
    try:
        h = signature_hash(unit)
    except Exception:
        return None
    return table.get(h)


# ---------------------------------------------------------------------------
# Synthetic canonical units (for cache priming)
# ---------------------------------------------------------------------------


def _bbox(x: float, y: float, w: float, h: float) -> BoundingBox:
    return BoundingBox(x=x, y=y, w=w, h=h)


def _make_element(
    *,
    eid: int = 1,
    tag: str = "DIV",
    cls: str = "",
    bbox: BoundingBox | None = None,
    text: str | None = None,
    is_text_container: bool = False,
    bg_image: str = "none",
    bg_color: str = "rgba(0, 0, 0, 0)",
    border_radius: str = "0px",
    box_shadow: str = "none",
    clip_path: str = "none",
    font_family: str = "",
    letter_spacing: str = "normal",
    writing_mode: str = "horizontal-tb",
    aspect_ratio: str = "auto",
    grid_template_columns: str = "none",
    text_shadow: str = "none",
    mask_image: str = "none",
    is_svg: bool = False,
    svg_path_count: int = 0,
    is_img: bool = False,
    is_canvas: bool = False,
    data_atom: str = "",
) -> DomElement:
    return DomElement(
        id=eid,
        parent_id=None,
        depth=0,
        tag=tag,
        cls=cls,
        bbox=bbox or _bbox(0, 0, 200, 100),
        background_color=bg_color,
        background_image=bg_image,
        border_radius=border_radius,
        box_shadow=box_shadow,
        clip_path=clip_path,
        is_text_container=is_text_container,
        font_family=font_family,
        letter_spacing=letter_spacing,
        writing_mode=writing_mode,
        aspect_ratio=aspect_ratio,
        grid_template_columns=grid_template_columns,
        text_shadow=text_shadow,
        mask_image=mask_image,
        text=text,
        is_svg=is_svg,
        svg_path_count=svg_path_count,
        is_img=is_img,
        is_canvas=is_canvas,
        data_atom=data_atom,
        stable_selector=f"#syn-{eid}",
    )


# Per-namespace defaults used by `_canonical_unit_for_atom`. The bbox and
# anchor properties are chosen so that the SIGNATURE (not the pixel render)
# differs across namespaces — that's all we need to populate a unique entry
# per atom id in the priming table. Real-browser priming will produce more
# faithful signatures; see the TODO in `_canonical_unit_for_atom`.
_NAMESPACE_TEMPLATES: dict[str, dict[str, Any]] = {
    "bg": {
        "bbox": _bbox(0, 0, 1280, 720),
        "bg_image": (
            "linear-gradient(135deg, rgb(99, 102, 241) 0%, "
            "rgb(236, 72, 153) 100%)"
        ),
        "border_radius": "0px",
    },
    "surf": {
        "bbox": _bbox(0, 0, 480, 320),
        "bg_color": "rgb(255, 255, 255)",
        "box_shadow": "0 12px 24px rgba(0, 0, 0, 0.2)",
        "border_radius": "16px",
    },
    "type": {
        "tag": "H1",
        "bbox": _bbox(0, 0, 720, 180),
        "text": "Headline",
        "font_family": "Inter, sans-serif",
        "letter_spacing": "0.2px",
        "is_text_container": True,
    },
    "mask": {
        "bbox": _bbox(0, 0, 320, 320),
        "clip_path": "circle(50% at 50% 50%)",
        "border_radius": "9999px",
    },
    "dec": {
        "bbox": _bbox(0, 0, 240, 4),
        "bg_color": "rgb(0, 0, 0)",
    },
    "data": {
        "tag": "SVG",
        "bbox": _bbox(0, 0, 240, 240),
        "is_svg": True,
        "svg_path_count": 4,
    },
    "motion": {
        "bbox": _bbox(0, 0, 480, 240),
        "bg_image": (
            "repeating-linear-gradient(90deg, rgb(0, 0, 0) 0px, "
            "rgb(0, 0, 0) 2px, transparent 2px, transparent 8px)"
        ),
    },
    "ui": {
        "bbox": _bbox(0, 0, 640, 400),
        "bg_color": "rgb(244, 244, 245)",
        "border_radius": "8px",
        "box_shadow": "0 1px 2px rgba(0, 0, 0, 0.1)",
    },
    "anno": {
        "tag": "SVG",
        "bbox": _bbox(0, 0, 200, 80),
        "is_svg": True,
        "svg_path_count": 2,
    },
    "comp": {
        "bbox": _bbox(0, 0, 1200, 600),
        "grid_template_columns": "repeat(3, 1fr)",
    },
}


def _atom_namespace(atom_id: str) -> str:
    return atom_id.split(".", 1)[0] if "." in atom_id else atom_id


def _canonical_unit_for_atom(atom_id: str) -> VisualUnit | None:
    """Build a synthetic VisualUnit shaped like the prototypical atom render.

    Used by the ``slidify prime-atom-cache`` subcommand to populate
    ``atom_signatures.json`` deterministically without spinning up a browser.

    The unit's signature is *not* guaranteed to match what a real
    browser-rendered ``examples/landing/atoms.html`` would produce — that's
    fine for now: the goal of this Phase-3 deliverable is to lay the rail
    so inference fires on synthetic shapes, and let real-browser priming be
    bolted on later as a refinement.

    TODO: replace this with a real renderer pass that walks
    ``examples/landing/atoms.html``, captures each cluster's anchor, and
    feeds the signature_hash into the table — at which point the synthetic
    fallback only matters when running ``prime-atom-cache`` in environments
    without Chromium.
    """
    if not atom_id:
        return None
    ns = _atom_namespace(atom_id)
    template = _NAMESPACE_TEMPLATES.get(ns)
    if template is None:
        return None
    # Vary classes so each atom id within a namespace gets a unique signature.
    # The atom id leaf becomes a synthetic class token; signature normalization
    # will drop unknown classes, but the atom_id itself is encoded into bbox
    # offset (below) for fan-out across the namespace.
    leaf = atom_id.split(".", 1)[1] if "." in atom_id else atom_id
    # Tweak the bbox by a small per-leaf offset so that two atoms in the same
    # namespace hash to different signatures (the bbox quantizer buckets at 32
    # / 64 px, so we shift by a multiple of that).
    base_bbox: BoundingBox = template["bbox"]
    leaf_hash = sum(ord(c) for c in leaf)
    dw = 64 * (leaf_hash % 5)        # 0, 64, 128, 192, 256
    dh = 32 * ((leaf_hash // 5) % 5)
    bbox = _bbox(base_bbox.x, base_bbox.y, base_bbox.w + dw, base_bbox.h + dh)

    kwargs = {k: v for k, v in template.items() if k != "bbox"}
    el = _make_element(bbox=bbox, **kwargs)
    return VisualUnit(
        id=f"syn_{atom_id}",
        bbox=bbox,
        elements=[el],
        children=[],
        anchor_element_id=el.id,
    )


# ---------------------------------------------------------------------------
# Build helpers (used by the CLI)
# ---------------------------------------------------------------------------


def _atom_ids_from_yaml() -> list[str]:
    """Return every atom id mentioned in ``atoms.yaml``'s ``data_atom_id``
    clauses (single strings or lists). Globs (``"*"``) and namespace-only
    clauses are skipped — they don't pin one canonical signature.
    """
    import yaml

    pkg = resources.files(_DATA_PACKAGE)
    text = (pkg / "atoms.yaml").read_text(encoding="utf-8")
    raw = yaml.safe_load(text) or {}
    ids: list[str] = []
    for entry in raw.get("patterns", []):
        match = entry.get("match", {}) or {}
        v = match.get("anchor.data_atom_id")
        if v is None:
            continue
        if isinstance(v, list):
            for item in v:
                if isinstance(item, str) and "*" not in item and "." in item:
                    ids.append(item)
        elif isinstance(v, str) and "*" not in v and "." in v:
            ids.append(v)
    # Dedupe while preserving order.
    seen: set[str] = set()
    out: list[str] = []
    for a in ids:
        if a not in seen:
            out.append(a)
            seen.add(a)
    return out


def build_synthetic_table() -> dict[str, str]:
    """Construct the {sig_hash: atom_id} table by hashing one synthetic unit
    per atom id declared in ``atoms.yaml``.

    Hash collisions across different atom ids are resolved by the first id
    encountered (atoms.yaml order). In practice the per-leaf bbox offset
    inside :func:`_canonical_unit_for_atom` keeps collisions to zero for the
    current registry; if a collision ever appears, the priming step prefers
    the lower-priority (more specific) atom because YAML order tracks it.
    """
    table: dict[str, str] = {}
    for atom_id in _atom_ids_from_yaml():
        unit = _canonical_unit_for_atom(atom_id)
        if unit is None:
            continue
        try:
            h = signature_hash(unit)
        except Exception:
            continue
        table.setdefault(h, atom_id)
    return table
