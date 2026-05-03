"""Collect slide-*.html files written by parallel generator agents into
the main `_bench/corpus/` directory.

Each generator runs in its own git worktree under `.claude/worktrees/`.
They each write to `_bench/corpus/` inside their worktree (which is
gitignored, so nothing gets committed). After all agents complete, run
this script to copy each worktree's `_bench/corpus/*.html` into the
main worktree's `_bench/corpus/`.

Conflict policy: distinct slide-NN ranges per agent (assigned in the
dispatch prompts), so filenames should not collide. If they do, last
writer wins and a warning is printed.

Usage:
    python _bench/scripts/collect.py
"""

from __future__ import annotations

import shutil
from pathlib import Path

BENCH_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[4]
DEST = BENCH_ROOT / "corpus"
WORKTREES = REPO_ROOT / ".claude" / "worktrees"


def main() -> None:
    DEST.mkdir(parents=True, exist_ok=True)
    if not WORKTREES.is_dir():
        print(f"no worktrees dir at {WORKTREES}; nothing to collect")
        return

    n_collected = 0
    n_collisions = 0
    seen: dict[str, Path] = {}
    for wt in sorted(WORKTREES.iterdir()):
        if not wt.is_dir():
            continue
        wt_corpus = wt / "_bench" / "corpus"
        if not wt_corpus.is_dir():
            continue
        for html in sorted(wt_corpus.glob("slide-*.html")):
            target = DEST / html.name
            if target.exists() and html.name in seen and seen[html.name] != wt:
                print(
                    f"  WARN collision on {html.name}: from {wt.name}, "
                    f"previously from {seen[html.name].name}"
                )
                n_collisions += 1
            shutil.copy2(html, target)
            seen[html.name] = wt
            n_collected += 1
            print(f"  + {html.name} (from {wt.name})")

    print(
        f"\nCollected {n_collected} files into {DEST.relative_to(REPO_ROOT)}"
        + (f" — {n_collisions} collision(s)." if n_collisions else ".")
    )
    files = sorted(DEST.glob("slide-*.html"))
    print(f"Corpus now has {len(files)} slides:")
    for f in files:
        print(f"  {f.name}")


if __name__ == "__main__":
    main()
