"""Unified bench runner — `slidify check` over every bench source deck.

Reports per-corpus + aggregate stats: self-contained, risky CSS,
atom-hint coverage, warnings.  Use this in CI to gate the bench.

Usage:
    uv run python _bench/run.py                    # static checks only
    uv run python _bench/run.py --deep             # also run matcher
    uv run python _bench/run.py --json             # machine-readable
    uv run python _bench/run.py --corpus llm-corpus  # restrict scope

Static mode is fast (~1 s per ~20 slides).  Deep mode round-trips
through Chromium so plan ~3 s per slide.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from slidify.checker import check_html, check_html_deep

ROOT = Path(__file__).parent
DECKS_ROOT = ROOT / "decks"

SKIP_DIRS = {"__pycache__", "animated", "assets", "out", "preview"}

# Static gates — anything below these fails the bench.
GATE_RISKY_MAX = 0
GATE_DEEP_NATIVE_FLOOR = 0.85  # global floor; per-corpus may be tighter


def discover_subcorpora() -> dict[str, Path]:
    """Return `_bench/corpus` plus immediate `_bench/decks/*` source folders."""
    out: dict[str, Path] = {}
    candidates = [ROOT / "corpus"]
    if DECKS_ROOT.exists():
        candidates.extend(sorted(p for p in DECKS_ROOT.iterdir() if p.is_dir()))
    for src in candidates:
        if src.name in SKIP_DIRS or not any(src.glob("*.html")):
            continue
        out[src.name] = src
    return out


@dataclass
class SlideResult:
    corpus: str
    slide: str
    self_contained: bool
    risky_css_count: int
    atom_hints: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    native_area_ratio: float | None = None

    @property
    def static_pass(self) -> bool:
        return (self.self_contained
                and self.risky_css_count <= GATE_RISKY_MAX)

    @property
    def deep_pass(self) -> bool | None:
        if self.native_area_ratio is None:
            return None
        return self.static_pass and (
            self.native_area_ratio >= GATE_DEEP_NATIVE_FLOOR
        )


def _check_one(corpus: str, html_path: Path, deep: bool) -> SlideResult:
    html = html_path.read_text(encoding="utf-8")
    rep = check_html_deep(html) if deep else check_html(html)
    res = SlideResult(
        corpus=corpus,
        slide=html_path.stem,
        self_contained=rep.self_contained,
        risky_css_count=len(rep.risky_css),
        atom_hints=list(rep.atom_hints),
        warnings=list(rep.warnings),
    )
    if rep.deep is not None:
        res.native_area_ratio = rep.deep["native_area_ratio"]
    return res


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--deep", action="store_true",
                        help="Run the matcher (Chromium round-trip).")
    parser.add_argument("--json", action="store_true",
                        help="Emit machine-readable JSON.")
    parser.add_argument("--strict", action="store_true",
                        help="Exit non-zero on risky CSS/static failures.")
    parser.add_argument("--corpus", default=None,
                        help="Restrict to one sub-corpus name.")
    args = parser.parse_args()

    targets = (
        {args.corpus: discover_subcorpora()[args.corpus]}
        if args.corpus and args.corpus in discover_subcorpora() else discover_subcorpora()
    )
    if args.corpus and args.corpus not in discover_subcorpora():
        print(f"unknown corpus: {args.corpus}; known: "
              f"{list(discover_subcorpora())}", file=sys.stderr)
        return 1

    results: list[SlideResult] = []
    for name, src in targets.items():
        if not src.exists():
            continue
        # anim/ holds GIF-source HTMLs; those aren't slides themselves.
        for slide in sorted(src.glob("*.html")):
            results.append(_check_one(name, slide, args.deep))

    if not results:
        print("no slides found", file=sys.stderr)
        return 1

    if args.json:
        payload = {
            "n_slides": len(results),
            "n_static_pass": sum(1 for r in results if r.static_pass),
            "by_corpus": {
                c: {
                    "n": sum(1 for r in results if r.corpus == c),
                    "static_pass": sum(
                        1 for r in results if r.corpus == c and r.static_pass
                    ),
                }
                for c in {r.corpus for r in results}
            },
            "slides": [
                {
                    "corpus": r.corpus,
                    "slide": r.slide,
                    "self_contained": r.self_contained,
                    "risky_css_count": r.risky_css_count,
                    "atom_hints": r.atom_hints,
                    "warnings_count": len(r.warnings),
                    "native_area_ratio": r.native_area_ratio,
                    "static_pass": r.static_pass,
                    "deep_pass": r.deep_pass,
                }
                for r in results
            ],
        }
        print(json.dumps(payload, indent=2))
        if args.strict and any(not r.static_pass for r in results):
            return 1
        if args.deep and any(not (r.deep_pass or False) for r in results):
            return 1
        return 0

    # Human-readable, grouped by corpus.
    grouped: dict[str, list[SlideResult]] = defaultdict(list)
    for r in results:
        grouped[r.corpus].append(r)

    width_slide = max(len(r.slide) for r in results) + 2
    header = (f"{'slide':<{width_slide}}  self  risky  atoms  warn"
              f"  ratio  pass")

    total_pass = 0
    for corpus, rs in grouped.items():
        print(f"\n── {corpus} ────────────────────────────────────────")
        print(header)
        print("─" * len(header))
        n_pass = 0
        for r in rs:
            ok = "✓" if r.static_pass else "✗"
            ratio = (f"{r.native_area_ratio:.3f}"
                     if r.native_area_ratio is not None else "  - ")
            deep = (("✓" if r.deep_pass else "✗")
                    if r.deep_pass is not None else " ")
            print(
                f"{r.slide:<{width_slide}}  "
                f"{'✓' if r.self_contained else '✗':<4}"
                f"  {r.risky_css_count:<5}"
                f"  {len(r.atom_hints):<5}"
                f"  {len(r.warnings):<4}"
                f"  {ratio}  {ok}{deep}"
            )
            if r.static_pass:
                n_pass += 1
        print("─" * len(header))
        print(f"  {n_pass}/{len(rs)} static-pass")
        total_pass += n_pass

    print(f"\n══ aggregate ══════════════════════════════════════════")
    print(f"  {total_pass}/{len(results)} static-pass across "
          f"{len(grouped)} sub-corpora")
    if args.deep:
        n_deep = sum(1 for r in results if r.deep_pass)
        print(f"  {n_deep}/{len(results)} deep-pass "
              f"(native_ratio ≥ {GATE_DEEP_NATIVE_FLOOR})")

    if args.strict and any(not r.static_pass for r in results):
        return 1
    if args.deep and any(not (r.deep_pass or False) for r in results):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
