"""Compose ordered render folders from `_bench/corpus/index.json`.

Examples:
    uv run python _bench/scripts/compose_corpus.py --deck image-led-magazine
    uv run python _bench/scripts/compose_corpus.py --tag raster-rich
    uv run python _bench/scripts/compose_corpus.py slide-01 slide-24 slide-43

The output directory can be passed directly to `slidify convert`.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus"
INDEX = CORPUS / "index.json"
OUT_ROOT = ROOT / "generated" / "composed"


def _load() -> dict:
    if not INDEX.exists():
        raise SystemExit("missing _bench/corpus/index.json; run build_corpus_index.py")
    return json.loads(INDEX.read_text(encoding="utf-8"))


def _select(payload: dict, args: argparse.Namespace) -> list[dict]:
    slides = payload["slides"]
    by_id = {s["id"]: s for s in slides}
    by_file = {s["file"]: s for s in slides}
    chosen: list[dict] = []

    if args.deck:
        deck = next((d for d in payload["decks"] if d["id"] == args.deck), None)
        if deck is None:
            known = ", ".join(d["id"] for d in payload["decks"])
            raise SystemExit(f"unknown deck {args.deck!r}; known: {known}")
        chosen.extend(by_id[sid] for sid in deck["slides"])

    for tag in args.tag:
        if tag in {"raster-rich", "native-mixed"}:
            chosen.extend(s for s in slides if s["rendering"] == tag)
        else:
            chosen.extend(s for s in slides if tag in s["tags"])

    for token in args.slides:
        if token in by_id:
            chosen.append(by_id[token])
        elif token in by_file:
            chosen.append(by_file[token])
        else:
            raise SystemExit(f"unknown slide selector: {token}")

    if not chosen:
        chosen = slides

    deduped = []
    seen = set()
    for slide in chosen:
        if slide["id"] in seen:
            continue
        seen.add(slide["id"])
        deduped.append(slide)
    return deduped


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("slides", nargs="*", help="Slide ids or filenames.")
    parser.add_argument("--deck", help="Deck id from index.json.")
    parser.add_argument("--tag", action="append", default=[], help="Tag or rendering mode to include.")
    parser.add_argument("--name", default=None, help="Output folder name under _bench/generated/composed.")
    parser.add_argument("--force", action="store_true", help="Replace an existing output folder.")
    args = parser.parse_args()

    payload = _load()
    selected = _select(payload, args)
    name = args.name or args.deck or ("tag-" + "-".join(args.tag) if args.tag else "custom")
    out = OUT_ROOT / name
    if out.exists():
        if not args.force:
            raise SystemExit(f"{out} exists; pass --force to replace it")
        shutil.rmtree(out)
    out.mkdir(parents=True)

    rows = []
    for i, slide in enumerate(selected, 1):
        src = CORPUS / slide["file"]
        dst = out / f"{i:03d}-{slide['id']}-{src.name.removeprefix(slide['id'] + '-')}"
        shutil.copy2(src, dst)
        rows.append({**slide, "composed_file": dst.name})

    (out / "manifest.json").write_text(
        json.dumps({"source": str(INDEX), "slides": rows}, indent=2) + "\n",
        encoding="utf-8",
    )
    rel_out = out.relative_to(ROOT.parent)
    print(f"wrote {rel_out} ({len(rows)} slides)")
    print(f"render with: uv run slidify convert {rel_out} _bench/generated/dist/{name}.pptx")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
