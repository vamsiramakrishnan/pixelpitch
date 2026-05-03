"""Batch-capture every animated corpus slide as a GIF.

Run from the repo root:

    uv run python _bench/scripts/capture_anim.py

Globs `_bench/corpus/animated/anim-*.html` and writes a sibling
`<name>.gif` for each. Skips slides whose GIF is newer than the source
HTML unless --force is passed.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

ENGINE_ROOT = Path(__file__).resolve().parents[2]
BENCH_ROOT = Path(__file__).resolve().parents[1]
CORPUS_DIR = BENCH_ROOT / "corpus" / "animated"


async def main_async(force: bool) -> int:
    sys.path.insert(0, str(ENGINE_ROOT))
    from slidify.anim_capture import capture_html_to_gif

    htmls = sorted(CORPUS_DIR.glob("anim-*.html"))
    if not htmls:
        print(f"no anim-*.html files in {CORPUS_DIR}")
        return 1

    failures = 0
    for html in htmls:
        gif = html.with_suffix(".gif")
        if (
            not force
            and gif.exists()
            and gif.stat().st_mtime >= html.stat().st_mtime
        ):
            print(f"skip {gif.name} (up to date)")
            continue
        print(f"capture {html.name} -> {gif.name}")
        try:
            await capture_html_to_gif(html, gif)
        except Exception as e:
            print(f"  FAILED: {e}")
            failures += 1
            continue
        size_kb = gif.stat().st_size / 1024
        print(f"  ok ({size_kb:.1f} KiB)")
    return 1 if failures else 0


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--force", action="store_true",
        help="Re-capture even if the GIF is newer than the HTML.",
    )
    args = p.parse_args()
    rc = asyncio.run(main_async(force=args.force))
    sys.exit(rc)


if __name__ == "__main__":
    main()
