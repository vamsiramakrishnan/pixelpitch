"""Unit tests for the corpus harvester aggregator.

Covers `cluster_signatures` (dedupe + ranking + bbox stats) and
`propose_atom_candidate` (axis routing from class names + signature props).
The tests use synthetic `UnmatchedSignature` lists — the heavy slidify
conversion path is covered separately via `test_cli_harvest.py`.
"""

from __future__ import annotations

from slidify.harvester import (
    AtomCandidate,
    Cluster,
    cluster_signatures,
    propose_atom_candidate,
    report_to_dict,
    write_report,
    HarvestReport,
)
from slidify.models import UnmatchedSignature


def _sig(
    *,
    sig: str = "div(bg)[][256x256]",
    sig_hash: str = "deadbeefdeadbeef",
    bbox_w: int = 256,
    bbox_h: int = 256,
    sample_classes: str = "",
    sample_text: str = "",
    n_occurrences: int = 1,
) -> UnmatchedSignature:
    return UnmatchedSignature(
        sig=sig, sig_hash=sig_hash,
        bbox_w=bbox_w, bbox_h=bbox_h,
        sample_classes=sample_classes, sample_text=sample_text,
        n_occurrences=n_occurrences,
    )


# ---------------------------------------------------------------------------
# cluster_signatures
# ---------------------------------------------------------------------------


def test_cluster_signatures_dedupes_by_hash():
    obs = [
        ("deck-a.html#node-0", _sig(sig_hash="aaaa", sample_classes="card",
                                     n_occurrences=2)),
        ("deck-a.html#node-1", _sig(sig_hash="aaaa", sample_classes="card",
                                     n_occurrences=1)),
        ("deck-b.html#node-0", _sig(sig_hash="aaaa", sample_classes="card-large",
                                     n_occurrences=3)),
        ("deck-c.html#node-0", _sig(sig_hash="bbbb", sample_classes="icon")),
    ]
    clusters = cluster_signatures(obs)
    assert len(clusters) == 2
    # Sort by instance count: aaaa = 6, bbbb = 1.
    assert clusters[0].sig_hash == "aaaa"
    assert clusters[0].instances == 6
    assert clusters[0].id == "auto-cluster-001"
    assert clusters[1].sig_hash == "bbbb"
    assert clusters[1].instances == 1


def test_cluster_signatures_collects_exemplars_and_classes():
    obs = [
        ("a.html#node-0", _sig(sig_hash="x", sample_classes="card", sample_text="Hi")),
        ("b.html#node-0", _sig(sig_hash="x", sample_classes="card", sample_text="Hi")),
        ("c.html#node-7", _sig(sig_hash="x", sample_classes="tile", sample_text="Yo")),
    ]
    [c] = cluster_signatures(obs)
    refs = [ex.slide_ref for ex in c.exemplars]
    assert refs == ["a.html#node-0", "b.html#node-0", "c.html#node-7"]
    # Classes/text dedupe within the cluster.
    assert set(c.sample_classes) == {"card", "tile"}
    assert set(c.sample_text) == {"Hi", "Yo"}


def test_cluster_signatures_filters_by_min_occurrences():
    obs = [
        ("a.html#node-0", _sig(sig_hash="big", n_occurrences=10)),
        ("b.html#node-0", _sig(sig_hash="med", n_occurrences=3)),
        ("c.html#node-0", _sig(sig_hash="lo",  n_occurrences=1)),
    ]
    clusters = cluster_signatures(obs, min_occurrences=3)
    assert [c.sig_hash for c in clusters] == ["big", "med"]


def test_cluster_signatures_bbox_typical_aggregates():
    obs = [
        ("a.html#node-0", _sig(sig_hash="z", bbox_w=200, bbox_h=100)),
        ("b.html#node-0", _sig(sig_hash="z", bbox_w=300, bbox_h=200)),
        ("c.html#node-0", _sig(sig_hash="z", bbox_w=400, bbox_h=300)),
    ]
    [c] = cluster_signatures(obs)
    assert c.bbox_typical["w_avg"] == 300.0
    assert c.bbox_typical["h_avg"] == 200.0
    assert c.bbox_typical["w_min"] == 200
    assert c.bbox_typical["w_max"] == 400


def test_cluster_signatures_caps_exemplars_at_ten():
    obs = [
        (f"deck-{i}.html#node-0", _sig(sig_hash="z"))
        for i in range(25)
    ]
    [c] = cluster_signatures(obs)
    assert c.instances == 25
    assert len(c.exemplars) == 10


# ---------------------------------------------------------------------------
# propose_atom_candidate
# ---------------------------------------------------------------------------


def _cluster(
    *,
    classes: str = "",
    sig: str = "div(bg)[][256x256]",
    bbox_w: int = 256,
    bbox_h: int = 256,
) -> Cluster:
    """Build a one-exemplar cluster shaped like what `cluster_signatures` emits."""
    obs = [("deck.html#node-0", _sig(sig=sig, sample_classes=classes,
                                      bbox_w=bbox_w, bbox_h=bbox_h))]
    return cluster_signatures(obs)[0]


def test_propose_card_class_lands_surf():
    c = _cluster(classes="card shadow-xl rounded-2xl",
                 sig="div(bg+brd+shdw=t)[][256x256]")
    cand = propose_atom_candidate(c)
    assert cand.candidate_axis == "surf"
    assert cand.candidate_atom_id.startswith("surf.card")
    assert cand.candidate_props.get("border") is True
    assert cand.candidate_props.get("shadow") == "translatable"
    assert cand.confidence >= 0.7


def test_propose_icon_class_lands_dec():
    c = _cluster(classes="icon icon-lg",
                 sig="svg(svg/3)[][32x32]",
                 bbox_w=32, bbox_h=32)
    cand = propose_atom_candidate(c)
    assert cand.candidate_axis == "dec"
    assert cand.candidate_atom_id.startswith("dec.icon")


def test_propose_stat_class_lands_data():
    c = _cluster(classes="stat-num", sig="div(txt)[][192x32]",
                 bbox_w=192, bbox_h=64)
    cand = propose_atom_candidate(c)
    assert cand.candidate_axis == "data"
    assert "stat" in cand.candidate_atom_id


def test_propose_svg_anchor_routes_to_dec_when_no_class_match():
    c = _cluster(classes="", sig="svg(svg/12)[][80x80]",
                 bbox_w=80, bbox_h=80)
    cand = propose_atom_candidate(c)
    assert cand.candidate_axis == "dec"
    # Small square svg → icon-vector heuristic.
    assert "icon" in cand.candidate_atom_id


def test_propose_large_svg_lands_illustration():
    c = _cluster(classes="", sig="svg(svg/12)[][512x512]",
                 bbox_w=512, bbox_h=512)
    cand = propose_atom_candidate(c)
    assert cand.candidate_axis == "dec"
    assert "illustration" in cand.candidate_atom_id


def test_propose_img_anchor_routes_to_media():
    c = _cluster(classes="", sig="img(img)[][640x360]",
                 bbox_w=640, bbox_h=360)
    cand = propose_atom_candidate(c)
    assert cand.candidate_axis == "media"
    assert cand.candidate_atom_id.startswith("media.image")


def test_propose_falls_back_to_unmatched_with_low_confidence():
    c = _cluster(classes="weirdthing", sig="span(txt)[][7x7]",
                 bbox_w=7, bbox_h=7)
    cand = propose_atom_candidate(c)
    # No keyword match, no svg/img signal, tiny bbox → unmatched fallback.
    assert cand.candidate_atom_id.startswith("surf.unmatched-") or \
           cand.candidate_axis in {"dec", "surf", "text"}
    assert cand.confidence <= 0.45


def test_propose_modifiers_sorted_alphabetically():
    c = _cluster(classes="card",
                 sig="div(bg+brd+shdw=t+xform+bgi=grad)[][256x256]")
    cand = propose_atom_candidate(c)
    # Modifiers in stem are sorted: bordered, gradient, rotated, shadowed.
    stem = cand.candidate_atom_id.split(".", 1)[1]
    # Strip the leading 'card' prefix to get just the modifier list.
    mods = stem.removeprefix("card-").split("-")
    assert mods == sorted(mods)


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------


def test_report_to_dict_matches_contract_shape():
    obs = [
        ("a.html#node-0", _sig(sig_hash="x", sample_classes="card")),
        ("b.html#node-0", _sig(sig_hash="x", sample_classes="card")),
    ]
    clusters = cluster_signatures(obs)
    candidates = {c.id: propose_atom_candidate(c) for c in clusters}
    report = HarvestReport(
        timestamp="2026-05-02T00:00:00+00:00",
        corpus_dir="/tmp/corpus",
        decks_processed=2,
        total_unmatched=2,
        unique_signatures=1,
        clusters=clusters,
        candidates=candidates,
    )
    payload = report_to_dict(report)
    assert payload["harvest_run"]["decks_processed"] == 2
    assert payload["harvest_run"]["unique_signatures"] == 1
    assert payload["harvest_run"]["timestamp"] == "2026-05-02T00:00:00+00:00"
    [c] = payload["clusters"]
    # Required keys per the contract spec in the M4 brief.
    for key in (
        "id", "sig_hash", "signature", "instances", "exemplars",
        "sample_classes", "sample_text", "bbox_typical",
        "candidate_atom_id", "candidate_axis", "candidate_props",
    ):
        assert key in c, f"missing key: {key}"
    assert c["candidate_axis"] == "surf"
    assert c["candidate_atom_id"].startswith("surf.card")


def test_write_report_creates_parent_dirs(tmp_path):
    obs = [("a.html#node-0", _sig(sig_hash="x", sample_classes="tile"))]
    clusters = cluster_signatures(obs)
    candidates = {c.id: propose_atom_candidate(c) for c in clusters}
    report = HarvestReport(
        timestamp="2026-05-02T00:00:00+00:00",
        corpus_dir=str(tmp_path),
        decks_processed=1,
        total_unmatched=1,
        unique_signatures=1,
        clusters=clusters,
        candidates=candidates,
    )
    out = tmp_path / "nested" / "subdir" / "clusters.json"
    write_report(report, out)
    assert out.exists()
    # Round-trips through json.load cleanly.
    import json
    payload = json.loads(out.read_text())
    assert payload["clusters"][0]["candidate_axis"] == "surf"


def test_top_n_caps_clusters_in_payload():
    obs = []
    for i in range(15):
        # Each unique sig_hash creates its own cluster.
        obs.append((f"deck-{i}.html#node-0",
                    _sig(sig_hash=f"hash{i:02d}", n_occurrences=15 - i)))
    clusters = cluster_signatures(obs)
    candidates = {c.id: propose_atom_candidate(c) for c in clusters}
    report = HarvestReport(
        timestamp="2026-05-02T00:00:00+00:00",
        corpus_dir="/tmp",
        decks_processed=15,
        total_unmatched=sum(range(1, 16)),
        unique_signatures=15,
        clusters=clusters,
        candidates=candidates,
    )
    payload = report_to_dict(report, top_n=5)
    assert len(payload["clusters"]) == 5
    # Ranking preserved (instances descending).
    insts = [c["instances"] for c in payload["clusters"]]
    assert insts == sorted(insts, reverse=True)
