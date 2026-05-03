"""Unified bench builder.

Walks every deck-like source directory under `_bench/corpus` and `_bench/decks`,
regenerates slide HTMLs
from each `generate.py`, converts each to its own PPTX, and finally produces
a combined PPTX that concatenates every slide in stable deck/file order.

Outputs land in `_bench/generated/dist/`.

Run:
    uv run python _bench/build.py
    uv run python _bench/build.py --skip-generate   # skip running
                                                    # generate.py per dir
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent
DECKS_ROOT = ROOT / "decks"
DIST = ROOT / "generated" / "dist"

SKIP_DIRS = {"__pycache__", "animated", "assets", "out", "preview"}


def discover_subcorpora() -> list[tuple[str, Path, str]]:
    """Return deck folders in stable order.

    A deck folder is `_bench/corpus` or any immediate `_bench/decks/*`
    directory with top-level HTML slides.
    """
    decks = []
    candidates = [ROOT / "corpus"]
    if DECKS_ROOT.exists():
        candidates.extend(sorted(p for p in DECKS_ROOT.iterdir() if p.is_dir()))
    for src in candidates:
        if src.name in SKIP_DIRS or not any(src.glob("*.html")):
            continue
        decks.append((src.name, src, src.name))
    return decks


def _run(cmd: list[str], *, allow_drift: bool = True) -> None:
    """Invoke a sub-process.  When `allow_drift` is set, `slidify
    convert`'s exit-3 (editability-drift warning) is treated as
    success — the PPTX is produced and valid; drift is a soft signal,
    not a failure.
    """
    print(f"  $ {' '.join(cmd)}")
    proc = subprocess.run(cmd)
    if proc.returncode == 0:
        return
    if proc.returncode == 3 and allow_drift:
        print(f"  ⚠ exit 3 (editability drift) — kept; PPTX is valid")
        return
    raise SystemExit(proc.returncode)


def build_subcorpus(
    name: str, src: Path, output_pptx: Path, *, skip_generate: bool
) -> None:
    print(f"\n── {name} ─────────────────────────────────────────────────")
    if not skip_generate and (src / "generate.py").exists():
        _run(["uv", "run", "python", str(src / "generate.py")])
    output_pptx.parent.mkdir(parents=True, exist_ok=True)
    _run([
        "uv", "run", "slidify", "convert",
        str(src), str(output_pptx),
        "--no-tier3", "--no-oracle", "--quiet",
    ])
    size_kb = output_pptx.stat().st_size // 1024
    print(f"  → {output_pptx.relative_to(ROOT.parent)}  ({size_kb} KB)")


def build_combined(output_pptx: Path) -> None:
    """Merge every sub-corpus's slide HTMLs into one ordered PPTX.

    Slides are renumbered with a per-corpus prefix so order is stable:
    `01-<corpus>-<original-stem>.html`.  We copy into a tmpdir rather
    than mutate the sub-corpora in place.
    """
    print("\n── bench-combined ─────────────────────────────────────────")
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        i = 0
        for slot, (name, src, _) in enumerate(discover_subcorpora(), 1):
            for slide in sorted(src.glob("*.html")):
                # Skip animation source HTMLs — they live under anim/
                # already excluded by glob, but be defensive.
                if slide.parent.name == "anim":
                    continue
                i += 1
                dst = tmp / f"{i:03d}-{slot}-{name}-{slide.stem}.html"
                dst.write_text(slide.read_text(encoding="utf-8"),
                               encoding="utf-8")
        output_pptx.parent.mkdir(parents=True, exist_ok=True)
        _run([
            "uv", "run", "slidify", "convert",
            str(tmp), str(output_pptx),
            "--no-tier3", "--no-oracle", "--quiet",
        ])
        size_kb = output_pptx.stat().st_size // 1024
        slide_count = len(list(tmp.glob("*.html")))
        print(f"  → {output_pptx.relative_to(ROOT.parent)}  "
              f"({size_kb} KB, {slide_count} slides)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-generate", action="store_true",
        help="Skip running generate.py per sub-corpus "
             "(use existing HTMLs as-is).",
    )
    parser.add_argument(
        "--skip-combined", action="store_true",
        help="Don't build the combined bench PPTX.",
    )
    args = parser.parse_args()

    DIST.mkdir(parents=True, exist_ok=True)

    for name, src, stem in discover_subcorpora():
        if not src.exists():
            print(f"  skipping {name}: {src} does not exist", file=sys.stderr)
            continue
        build_subcorpus(name, src, DIST / f"{stem}.pptx",
                        skip_generate=args.skip_generate)

    if not args.skip_combined:
        build_combined(DIST / "bench-combined.pptx")

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
