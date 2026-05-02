"""Corpus harvester — aggregate `unmatched_signatures` telemetry across many decks.

The slidify pipeline already records every Tier-0 miss as an `UnmatchedSignature`
(see `slidify/api.py::_classify_unit_tier12`). The harvester is the next layer:

  1. Walk a corpus of HTML files.
  2. Run `slidify.api.convert(..)` on each (no oracle, no LLM — fast path).
  3. Aggregate the per-deck `unmatched_signatures` lists into clusters keyed by
     `sig_hash`, summing occurrence counts and collecting exemplar paths +
     class/text samples + bbox stats.
  4. Heuristically propose a candidate atom id + axis for each cluster from
     the dominant class names ("card" → surf.*, "icon" → dec.*, "stat" →
     data.*, etc.). The proposal is ADVISORY — designers and the M1 atoms
     manifest authors get the final word.

Output is a JSON document conforming to the contract in CONTRACT-v2 §G.3:

    {
      "harvest_run": {timestamp, corpus_dir, decks_processed, total_unmatched,
                      unique_signatures},
      "clusters": [{id, sig_hash, signature, instances, exemplars,
                    sample_classes, sample_text, bbox_typical,
                    candidate_atom_id, candidate_axis, candidate_props}, ...]
    }

The harvester is read-only relative to slidify itself: it doesn't mutate the
pattern catalog, only proposes candidates. This is by design — Tier-0 patterns
ship in `slidify/patterns/data/patterns.yaml` and need human review before
inclusion. Future M4-followup work may auto-promote high-confidence clusters
to a `patterns_proposed.yaml` lane.
"""

from __future__ import annotations

import asyncio
import json
import re
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import structlog

from slidify.api import ConversionConfig, convert
from slidify.models import UnmatchedSignature

log = structlog.get_logger(__name__)


# -----------------------------------------------------------------------------
# Dataclasses (shape returned from `aggregate_corpus` / `cluster_signatures`)
# -----------------------------------------------------------------------------


@dataclass
class ClusterExemplar:
    """One concrete instance contributing to a cluster.

    `slide_ref` is `<file>#node-<index>` (file path relative to the corpus
    root). `node-<index>` is best-effort — without re-walking the DOM we use
    the per-deck rank order in which the signature first appeared.
    """

    slide_ref: str
    bbox_w: int
    bbox_h: int
    sample_text: str = ""
    sample_classes: str = ""


@dataclass
class Cluster:
    """A group of UnmatchedSignature observations sharing a structural shape."""

    id: str
    sig_hash: str
    signature: str
    instances: int
    exemplars: list[ClusterExemplar] = field(default_factory=list)
    sample_classes: list[str] = field(default_factory=list)
    sample_text: list[str] = field(default_factory=list)
    bbox_typical: dict[str, float] = field(default_factory=dict)


@dataclass
class AtomCandidate:
    """Heuristic proposal for the cluster's eventual home atom."""

    candidate_atom_id: str
    candidate_axis: str
    candidate_props: dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    reason: str = ""


@dataclass
class HarvestReport:
    """Full harvester output. Maps directly to `clusters.json` schema."""

    timestamp: str
    corpus_dir: str
    decks_processed: int
    total_unmatched: int
    unique_signatures: int
    clusters: list[Cluster] = field(default_factory=list)
    candidates: dict[str, AtomCandidate] = field(default_factory=dict)
    # Per-deck error log so a flaky corpus doesn't silently shrink the run.
    errors: list[dict[str, str]] = field(default_factory=list)


# -----------------------------------------------------------------------------
# Aggregation
# -----------------------------------------------------------------------------


def _walk_corpus(corpus_dir: Path) -> list[Path]:
    """Return all `*.html` files under `corpus_dir` in sorted order."""
    if corpus_dir.is_file() and corpus_dir.suffix.lower() == ".html":
        return [corpus_dir]
    if not corpus_dir.is_dir():
        return []
    return sorted(p for p in corpus_dir.glob("**/*.html") if p.is_file())


async def _harvest_one_async(html_path: Path) -> list[UnmatchedSignature]:
    """Run slidify on a single deck and return its `unmatched_signatures`.

    Uses the fast config (`ConversionConfig.fast()`) — no oracle, no LLM, no
    editability check. Output PPTX is written to a temp file and discarded.
    """
    cfg = ConversionConfig.fast()
    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as tf:
        out = Path(tf.name)
    try:
        result = await convert(html_path, out, cfg)
        return list(result.unmatched_signatures)
    finally:
        try:
            out.unlink()
        except FileNotFoundError:
            pass


def _harvest_one(html_path: Path) -> list[UnmatchedSignature]:
    """Synchronous wrapper around :func:`_harvest_one_async`."""
    return asyncio.run(_harvest_one_async(html_path))


def cluster_signatures(
    observations: Iterable[tuple[str, UnmatchedSignature]],
    *,
    min_occurrences: int = 1,
) -> list[Cluster]:
    """Group `UnmatchedSignature` observations into clusters.

    `observations` yields `(deck_ref, sig)` tuples — `deck_ref` is the
    string used as the exemplar's slide reference (typically the corpus-
    relative file path, optionally `#node-<i>`).

    For v1 we cluster by exact `sig_hash` equality. The `signature` string
    already normalizes class names + quantizes bboxes (see
    `slidify/patterns/signatures.py::signature`), so two visually identical
    units land on the same hash even if their text or exact px sizes differ.

    `min_occurrences` filters out singleton noise; defaults to 1 (keep all).
    """
    by_hash: dict[str, dict[str, Any]] = {}
    for deck_ref, sig in observations:
        h = sig.sig_hash
        bucket = by_hash.setdefault(
            h,
            {
                "sig_hash": h,
                "signature": sig.sig,
                "instances": 0,
                "exemplars": [],
                "sample_classes": [],
                "sample_text": [],
                "bbox_w": [],
                "bbox_h": [],
            },
        )
        bucket["instances"] += int(sig.n_occurrences)
        bucket["bbox_w"].append(int(sig.bbox_w))
        bucket["bbox_h"].append(int(sig.bbox_h))
        if sig.sample_classes and sig.sample_classes not in bucket["sample_classes"]:
            bucket["sample_classes"].append(sig.sample_classes)
        if sig.sample_text and sig.sample_text not in bucket["sample_text"]:
            bucket["sample_text"].append(sig.sample_text)
        bucket["exemplars"].append(
            ClusterExemplar(
                slide_ref=deck_ref,
                bbox_w=int(sig.bbox_w),
                bbox_h=int(sig.bbox_h),
                sample_text=sig.sample_text,
                sample_classes=sig.sample_classes,
            )
        )

    clusters: list[Cluster] = []
    for i, (_, b) in enumerate(
        sorted(by_hash.items(), key=lambda kv: -kv[1]["instances"]), start=1
    ):
        if b["instances"] < min_occurrences:
            continue
        ws, hs = b["bbox_w"], b["bbox_h"]
        bbox_typical = {
            "w_avg": round(sum(ws) / len(ws), 1) if ws else 0.0,
            "h_avg": round(sum(hs) / len(hs), 1) if hs else 0.0,
            "w_min": min(ws) if ws else 0,
            "w_max": max(ws) if ws else 0,
            "h_min": min(hs) if hs else 0,
            "h_max": max(hs) if hs else 0,
        }
        clusters.append(
            Cluster(
                id=f"auto-cluster-{i:03d}",
                sig_hash=b["sig_hash"],
                signature=b["signature"],
                instances=b["instances"],
                # Cap exemplars to keep clusters.json bounded on huge corpora.
                exemplars=b["exemplars"][:10],
                sample_classes=b["sample_classes"][:5],
                sample_text=b["sample_text"][:5],
                bbox_typical=bbox_typical,
            )
        )
    return clusters


# -----------------------------------------------------------------------------
# Candidate atom proposal (heuristic — designer reviews)
# -----------------------------------------------------------------------------


# Class-name keywords → (axis, atom-id-stem). Order matters: more specific
# keywords come first so e.g. "stat-card" lands as data.* rather than surf.*.
_AXIS_KEYWORDS: list[tuple[re.Pattern[str], str, str]] = [
    (re.compile(r"\bstat(?:-|s\b|\b)"),     "data",   "stat"),
    (re.compile(r"\bnumber\b"),             "data",   "number"),
    (re.compile(r"\bmetric\b"),             "data",   "metric"),
    (re.compile(r"\bchart\b|\bgraph\b"),    "data",   "chart"),
    (re.compile(r"\btable\b"),              "data",   "table"),
    (re.compile(r"\bgauge\b"),              "data",   "gauge"),
    (re.compile(r"\bicon\b"),               "dec",    "icon"),
    (re.compile(r"\bavatar\b"),             "dec",    "avatar"),
    (re.compile(r"\blogo\b"),               "dec",    "logo"),
    (re.compile(r"\bbadge\b"),              "dec",    "badge"),
    (re.compile(r"\bglyph\b"),              "dec",    "glyph"),
    (re.compile(r"\bcard\b"),               "surf",   "card"),
    (re.compile(r"\btile\b"),               "surf",   "tile"),
    (re.compile(r"\bpanel\b"),              "surf",   "panel"),
    (re.compile(r"\bbento\b"),              "surf",   "bento"),
    (re.compile(r"\bframe\b"),              "surf",   "frame"),
    (re.compile(r"\bsurface\b"),            "surf",   "surface"),
    (re.compile(r"\bhero\b"),               "comp",   "hero"),
    (re.compile(r"\bcta\b"),                "comp",   "cta"),
    (re.compile(r"\bquote\b"),              "comp",   "quote"),
    (re.compile(r"\btestimonial\b"),        "comp",   "testimonial"),
    (re.compile(r"\bfeature\b"),            "comp",   "feature"),
    (re.compile(r"\bpricing\b"),            "comp",   "pricing"),
    (re.compile(r"\bnav\b|\bnavbar\b"),     "chrome", "nav"),
    (re.compile(r"\bheader\b"),             "chrome", "header"),
    (re.compile(r"\bfooter\b"),             "chrome", "footer"),
    (re.compile(r"\bsidebar\b"),            "chrome", "sidebar"),
    (re.compile(r"\bpill\b"),               "text",   "pill"),
    (re.compile(r"\bkicker\b"),             "text",   "kicker"),
    (re.compile(r"\btitle\b"),              "text",   "title"),
    (re.compile(r"\bsubtitle\b"),           "text",   "subtitle"),
    (re.compile(r"\bcaption\b"),            "text",   "caption"),
    (re.compile(r"\bgrid\b"),               "layout", "grid"),
    (re.compile(r"\bstack\b"),              "layout", "stack"),
    (re.compile(r"\brow\b"),                "layout", "row"),
    (re.compile(r"\bcol(?:umn)?\b"),        "layout", "column"),
]

# Signature substrings → property bits. Read off the structural sig string
# directly so we don't need to re-parse the DOM.
_SIG_PROP_PROBES: list[tuple[str, str, Any]] = [
    ("brd",            "border",       True),
    ("shdw=t",         "shadow",       "translatable"),
    ("shdw=x",         "shadow",       "raster"),
    ("bgi=grad",       "gradient",     True),
    ("bgi=url",        "image",        True),
    ("xform",          "transform",    True),
    ("filter",         "filter",       True),
    ("svg/",           "svg",          True),
    ("canvas",         "canvas",       True),
    ("img",            "image",        True),
    ("video",          "video",        True),
    ("grid-line",      "grid",         True),
    ("::before",       "pseudo_before", True),
    ("::after",        "pseudo_after",  True),
]


def _dominant_classes(cluster: Cluster) -> list[str]:
    """Return the cluster's class-name tokens ranked by frequency.

    `sample_classes` is a list of raw `class` attribute strings from each
    exemplar (e.g. "tile shadow-xl rounded-2xl"). We split + count tokens
    across every exemplar so common skeleton classes ("tile", "card") rise
    above one-off styling utilities.
    """
    counts: dict[str, int] = {}
    for ex in cluster.exemplars:
        for tok in (ex.sample_classes or "").split():
            tok = tok.strip()
            if not tok:
                continue
            counts[tok] = counts.get(tok, 0) + 1
    return [k for k, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]


def propose_atom_candidate(cluster: Cluster) -> AtomCandidate:
    """Heuristically propose `(axis, atom_id, props)` for a cluster.

    Ranking signals (in priority order):

    1. Class-name keyword match (highest signal — authors named it).
    2. Anchor `kind` bits in the signature (svg / canvas / img → dec.*).
    3. Aspect ratio + bbox bucket (square small → dec.icon-*; square big →
       surf.tile-*; wide short → text.banner-*; etc.).
    4. Fallback: surf.unmatched-<short_hash> with axis "surf".

    The output's `confidence` is a rough self-rating (0..1) so downstream
    review tooling can sort proposals by how trustworthy the heuristic is.
    """
    classes = _dominant_classes(cluster)
    sig = cluster.signature or ""

    # 1) class-name keyword match
    for rx, axis, stem in _AXIS_KEYWORDS:
        for cls in classes:
            if rx.search(cls.lower()):
                props = _props_from_signature(sig)
                modifiers = _modifiers_from_props(props)
                atom_id = f"{axis}.{stem}" + (
                    f"-{'-'.join(modifiers)}" if modifiers else ""
                )
                return AtomCandidate(
                    candidate_atom_id=atom_id,
                    candidate_axis=axis,
                    candidate_props=props,
                    confidence=0.75,
                    reason=f"class '{cls}' matched /{rx.pattern}/",
                )

    # 2) anchor-kind sniff from signature
    if "svg/" in sig or "canvas" in sig:
        bbox_w = cluster.bbox_typical.get("w_avg", 0)
        bbox_h = cluster.bbox_typical.get("h_avg", 0)
        if bbox_w and bbox_h and max(bbox_w, bbox_h) <= 96:
            return AtomCandidate(
                candidate_atom_id="dec.icon-vector",
                candidate_axis="dec",
                candidate_props={"vector": True},
                confidence=0.6,
                reason="small svg/canvas bbox",
            )
        return AtomCandidate(
            candidate_atom_id="dec.illustration-vector",
            candidate_axis="dec",
            candidate_props={"vector": True},
            confidence=0.45,
            reason="large svg/canvas bbox",
        )

    if "img" in sig and "svg/" not in sig:
        return AtomCandidate(
            candidate_atom_id="media.image",
            candidate_axis="media",
            candidate_props={"raster": True},
            confidence=0.55,
            reason="anchor is <img>",
        )

    # 3) bbox-shape fallback
    bbox_w = cluster.bbox_typical.get("w_avg", 0)
    bbox_h = cluster.bbox_typical.get("h_avg", 0)
    aspect = (bbox_w / bbox_h) if bbox_h else 0
    props = _props_from_signature(sig)
    modifiers = _modifiers_from_props(props)

    if bbox_w and bbox_h:
        if 0.85 <= aspect <= 1.15 and max(bbox_w, bbox_h) <= 96:
            return AtomCandidate(
                candidate_atom_id="dec.glyph"
                + (f"-{'-'.join(modifiers)}" if modifiers else ""),
                candidate_axis="dec",
                candidate_props=props,
                confidence=0.4,
                reason="small square bbox",
            )
        if 0.85 <= aspect <= 1.25 and bbox_w >= 200:
            stem = "tile" + (f"-{'-'.join(modifiers)}" if modifiers else "")
            return AtomCandidate(
                candidate_atom_id=f"surf.{stem}",
                candidate_axis="surf",
                candidate_props=props,
                confidence=0.4,
                reason="square card-sized bbox",
            )
        if aspect >= 3.0:
            return AtomCandidate(
                candidate_atom_id="text.banner"
                + (f"-{'-'.join(modifiers)}" if modifiers else ""),
                candidate_axis="text",
                candidate_props=props,
                confidence=0.35,
                reason="wide-short bbox",
            )

    # 4) terminal fallback
    return AtomCandidate(
        candidate_atom_id=f"surf.unmatched-{cluster.sig_hash[:8]}",
        candidate_axis="surf",
        candidate_props=props,
        confidence=0.15,
        reason="no class/shape signal — falling back to sig_hash stem",
    )


def _props_from_signature(sig: str) -> dict[str, Any]:
    """Read structural props out of the signature string."""
    out: dict[str, Any] = {}
    for needle, key, value in _SIG_PROP_PROBES:
        if needle in sig and key not in out:
            out[key] = value
    return out


def _modifiers_from_props(props: dict[str, Any]) -> list[str]:
    """Stable, alphabetic list of modifier suffixes for an atom id stem."""
    bits: list[str] = []
    if props.get("border"):
        bits.append("bordered")
    if props.get("gradient"):
        bits.append("gradient")
    if props.get("grid"):
        bits.append("grid")
    if props.get("shadow"):
        bits.append("shadowed")
    if props.get("svg"):
        bits.append("vector")
    if props.get("transform"):
        bits.append("rotated")
    return sorted(bits)


# -----------------------------------------------------------------------------
# Top-level orchestration
# -----------------------------------------------------------------------------


def aggregate_corpus(
    corpus_dir: Path,
    *,
    min_occurrences: int = 1,
    on_progress=None,
) -> HarvestReport:
    """Walk `corpus_dir`, run slidify on each HTML deck, cluster the misses.

    `on_progress(path, sigs_count)` is called after each deck finishes so a
    CLI caller can stream a per-deck status line.
    """
    corpus_dir = Path(corpus_dir).resolve()
    paths = _walk_corpus(corpus_dir)

    observations: list[tuple[str, UnmatchedSignature]] = []
    decks_processed = 0
    errors: list[dict[str, str]] = []

    for path in paths:
        try:
            sigs = _harvest_one(path)
        except Exception as e:  # noqa: BLE001 — record per-deck failures
            log.warning("harvester.deck_failed", path=str(path), error=str(e))
            errors.append({"path": str(path), "error": f"{type(e).__name__}: {e}"})
            continue
        decks_processed += 1
        try:
            ref_root = path.relative_to(corpus_dir).as_posix()
        except ValueError:
            ref_root = path.name
        for idx, sig in enumerate(sigs):
            deck_ref = f"{ref_root}#node-{idx}"
            observations.append((deck_ref, sig))
        if on_progress is not None:
            on_progress(path, len(sigs))

    clusters = cluster_signatures(observations, min_occurrences=min_occurrences)
    candidates = {c.id: propose_atom_candidate(c) for c in clusters}

    return HarvestReport(
        timestamp=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        corpus_dir=str(corpus_dir),
        decks_processed=decks_processed,
        total_unmatched=sum(int(s.n_occurrences) for _, s in observations),
        unique_signatures=len(clusters),
        clusters=clusters,
        candidates=candidates,
        errors=errors,
    )


def report_to_dict(report: HarvestReport, *, top_n: int | None = None) -> dict[str, Any]:
    """Serialise a `HarvestReport` to the CONTRACT-v2 §G.3 JSON shape."""
    clusters = report.clusters
    if top_n is not None:
        clusters = clusters[:top_n]
    out_clusters = []
    for c in clusters:
        cand = report.candidates.get(c.id)
        out_clusters.append(
            {
                "id": c.id,
                "sig_hash": c.sig_hash,
                "signature": c.signature,
                "instances": c.instances,
                "exemplars": [ex.slide_ref for ex in c.exemplars],
                "sample_classes": c.sample_classes,
                "sample_text": c.sample_text,
                "bbox_typical": c.bbox_typical,
                "candidate_atom_id": cand.candidate_atom_id if cand else "",
                "candidate_axis": cand.candidate_axis if cand else "",
                "candidate_props": cand.candidate_props if cand else {},
                "candidate_confidence": cand.confidence if cand else 0.0,
                "candidate_reason": cand.reason if cand else "",
            }
        )
    return {
        "harvest_run": {
            "timestamp": report.timestamp,
            "corpus_dir": report.corpus_dir,
            "decks_processed": report.decks_processed,
            "total_unmatched": report.total_unmatched,
            "unique_signatures": report.unique_signatures,
        },
        "clusters": out_clusters,
        "errors": report.errors,
    }


def write_report(report: HarvestReport, out_path: Path, *, top_n: int | None = None) -> None:
    """Write `report` as `clusters.json` per CONTRACT-v2 §G.3."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = report_to_dict(report, top_n=top_n)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
