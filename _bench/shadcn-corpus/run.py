"""Run every slide in the shadcn corpus through `slidify check` and
report pass/fail per slide.

This is the corpus benchmark: each slide should be self-contained,
declare at least one atom hint, and (in --deep mode) exceed a
predicted native_area_ratio threshold.

Usage:
    uv run python _bench/shadcn-corpus/run.py            # static checks only
    uv run python _bench/shadcn-corpus/run.py --deep     # also run matcher
    uv run python _bench/shadcn-corpus/run.py --json     # machine-readable

The runner is idempotent and fast in static mode (~1 s for 15 slides).
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

from slidify.checker import check_html, check_html_deep

CORPUS_DIR = Path(__file__).parent
STRICT_NATIVE_FLOOR = 0.90  # for --deep gating
STRICT_RISKY_CSS_MAX = 0    # zero risky CSS in the corpus


@dataclass
class CorpusResult:
    slide: str
    self_contained: bool
    risky_css_count: int
    atom_hints: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    native_area_ratio: float | None = None
    deep_pass: bool | None = None

    @property
    def static_pass(self) -> bool:
        return self.self_contained and self.risky_css_count == 0


def _run_one(html_path: Path, deep: bool) -> CorpusResult:
    html = html_path.read_text(encoding="utf-8")
    rep = check_html_deep(html) if deep else check_html(html)
    res = CorpusResult(
        slide=html_path.stem,
        self_contained=rep.self_contained,
        risky_css_count=len(rep.risky_css),
        atom_hints=list(rep.atom_hints),
        warnings=list(rep.warnings),
    )
    if rep.deep is not None:
        res.native_area_ratio = rep.deep["native_area_ratio"]
        res.deep_pass = (
            rep.self_contained
            and len(rep.risky_css) == 0
            and rep.deep["native_area_ratio"] >= STRICT_NATIVE_FLOOR
        )
    return res


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--deep", action="store_true",
                        help="Run the full convert pipeline (Chromium round-trip).")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args()

    slides = sorted(CORPUS_DIR.glob("*.html"))
    if not slides:
        print("no .html slides found — run generate.py first", file=sys.stderr)
        return 1

    results = [_run_one(p, args.deep) for p in slides]

    if args.json:
        out = {
            "n_slides": len(results),
            "n_static_pass": sum(1 for r in results if r.static_pass),
            "n_deep_pass": (
                sum(1 for r in results if r.deep_pass) if args.deep else None
            ),
            "slides": [
                {
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
        print(json.dumps(out, indent=2))
        # Exit 1 if any slide failed.
        if any(not r.static_pass for r in results):
            return 1
        if args.deep and any(not (r.deep_pass or False) for r in results):
            return 1
        return 0

    # Human-readable table.
    width_slide = max(len(r.slide) for r in results) + 2
    header = f"{'slide':<{width_slide}}  self  risky  atoms  warn  ratio  pass"
    print(header)
    print("─" * len(header))
    n_pass = 0
    for r in results:
        ok = "✓" if r.static_pass else "✗"
        ratio = f"{r.native_area_ratio:.3f}" if r.native_area_ratio is not None else "  - "
        deep = ("✓" if r.deep_pass else "✗") if r.deep_pass is not None else " "
        print(
            f"{r.slide:<{width_slide}}  {'✓' if r.self_contained else '✗':<4}"
            f"  {r.risky_css_count:<5}"
            f"  {len(r.atom_hints):<5}"
            f"  {len(r.warnings):<4}"
            f"  {ratio}  {ok}{deep}"
        )
        if r.static_pass:
            n_pass += 1

    print("─" * len(header))
    print(f"{n_pass}/{len(results)} static-pass")
    if args.deep:
        n_deep = sum(1 for r in results if r.deep_pass)
        print(f"{n_deep}/{len(results)} deep-pass (native_ratio ≥ {STRICT_NATIVE_FLOOR})")

    if any(not r.static_pass for r in results):
        return 1
    if args.deep and any(not (r.deep_pass or False) for r in results):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
