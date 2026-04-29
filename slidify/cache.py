"""Structural cache for classification decisions."""

from __future__ import annotations

import hashlib
import json
import threading
from abc import ABC, abstractmethod
from collections import OrderedDict
from pathlib import Path

import structlog

from slidify.models import Decision, VisualUnit

log = structlog.get_logger(__name__)


def _quantize(v: float, bucket: int = 50) -> int:
    return int(v // bucket) * bucket


def structural_hash(unit: VisualUnit) -> str:
    """Construct a structural hash for a VisualUnit.

    Excludes text content and exact positions so similar templates collide.
    """
    elems = unit.all_elements()
    tags = sorted(e.tag for e in elems)
    classes = sorted(c for e in elems for c in (e.cls or "").split())
    sig = {
        "tags": tags,
        "classes": classes,
        "qbbox": [
            _quantize(unit.bbox.x),
            _quantize(unit.bbox.y),
            _quantize(unit.bbox.w),
            _quantize(unit.bbox.h),
        ],
        "kind": unit.kind.value,
        "anchor_styles": _anchor_style_signature(unit),
    }
    raw = json.dumps(sig, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:24]


def _anchor_style_signature(unit: VisualUnit) -> dict:
    if not unit.elements:
        return {}
    a = unit.elements[0]
    return {
        "bg": a.background_color,
        "bg_image": "yes" if (a.background_image and a.background_image != "none") else "no",
        "border": a.border,
        "radius": a.border_radius,
        "shadow": "yes" if (a.box_shadow and a.box_shadow != "none") else "no",
        "transform": "yes" if (a.transform and a.transform != "none") else "no",
        "filter": "yes" if (a.filter and a.filter != "none") else "no",
        "has_pseudo": a.has_before or a.has_after,
        "is_canvas": a.is_canvas,
        "is_svg": a.is_svg,
        "is_img": a.is_img,
    }


class CacheBackend(ABC):
    @abstractmethod
    def get(self, key: str) -> Decision | None: ...

    @abstractmethod
    def put(self, key: str, decision: Decision) -> None: ...


class MemoryCache(CacheBackend):
    def __init__(self, max_entries: int = 10_000) -> None:
        self._max = max_entries
        self._lock = threading.Lock()
        self._data: OrderedDict[str, Decision] = OrderedDict()

    def get(self, key: str) -> Decision | None:
        with self._lock:
            d = self._data.get(key)
            if d is not None:
                self._data.move_to_end(key)
            return d

    def put(self, key: str, decision: Decision) -> None:
        with self._lock:
            self._data[key] = decision
            self._data.move_to_end(key)
            while len(self._data) > self._max:
                self._data.popitem(last=False)


class DiskCache(CacheBackend):
    def __init__(self, directory: str | Path, ttl: int | None = None) -> None:
        try:
            import diskcache
        except ImportError as e:
            raise RuntimeError("diskcache not installed") from e
        self._dc = diskcache.Cache(str(directory))
        self._ttl = ttl

    def get(self, key: str) -> Decision | None:
        raw = self._dc.get(key)
        if raw is None:
            return None
        try:
            return Decision.model_validate_json(raw)
        except Exception:
            return None

    def put(self, key: str, decision: Decision) -> None:
        self._dc.set(key, decision.model_dump_json(), expire=self._ttl)


class StructuralCache:
    """Wraps a backend with hit-rate accounting."""

    def __init__(self, backend: CacheBackend | None = None) -> None:
        self.backend = backend or MemoryCache()
        self.hits = 0
        self.misses = 0

    def get(self, unit: VisualUnit) -> Decision | None:
        key = structural_hash(unit)
        v = self.backend.get(key)
        if v is None:
            self.misses += 1
        else:
            self.hits += 1
        return v

    def put(self, unit: VisualUnit, decision: Decision) -> None:
        self.backend.put(structural_hash(unit), decision)

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return self.hits / total
