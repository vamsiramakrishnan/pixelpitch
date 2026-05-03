"""Unified bench builder.

Walks every sub-corpus under `_bench/` (currently `llm-corpus/` and
`atlas-vol-iii/`), regenerates the slide HTMLs from each `generate.py`,
converts each to its own PPTX, and finally produces a combined PPTX
that concatenates every slide in the bench in lexicographic-then-
sub-corpus order.

Outputs land in `_bench/dist/`, which is the gitignore exception so
the artefacts ship with the repo.

Run:
    uv run python _bench/build.py
    uv run python _bench/build.py --skip-generate   # skip running
                                                    # generate.py per dir
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).parent
DIST = ROOT / "dist"

# Sub-corpora to build.  Each entry is (display_name, source_dir,
# output_pptx_stem).  Order matters for the combined PPTX.
SUBCORPORA: list[tuple[str, Path, str]] = [
    ("llm-corpus",     ROOT / "llm-corpus",     "llm-corpus"),
    ("atlas-vol-iii",  ROOT / "atlas-vol-iii",  "atlas-vol-iii"),
]


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
        for slot, (name, src, _) in enumerate(SUBCORPORA, 1):
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

    for name, src, stem in SUBCORPORA:
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
