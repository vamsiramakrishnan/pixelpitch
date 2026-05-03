"""Build a top-level index for every bench source deck.

This complements `_bench/corpus/index.json`: corpus has richer per-slide tags,
while this file gives the whole bench a single inventory and catches numbering
drift across generated decks, archives, and composed render sets.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DECKS_ROOT = ROOT / "decks"
OUT_JSON = ROOT / "index.json"
OUT_HTML = ROOT / "index.html"

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)
NUMBER_RE = re.compile(r"^(?:slide-)?(\d+)-(.+)\.html$")
SKIP_DIRS = {"__pycache__", "animated", "assets", "out", "preview"}


def _title(path: Path) -> str:
    text = path.read_text(encoding="utf-8", errors="ignore")
    match = TITLE_RE.search(text)
    if match:
        return re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()
    return path.stem


def _slide_entry(path: Path) -> dict:
    match = NUMBER_RE.match(path.name)
    number = int(match.group(1)) if match else None
    return {
        "number": number,
        "file": path.name,
        "title": _title(path),
        "path": str(path.relative_to(ROOT)),
    }


def _is_deck_dir(path: Path) -> bool:
    if not path.is_dir() or path.name in SKIP_DIRS:
        return False
    return any(path.glob("*.html"))


def build_payload() -> dict:
    decks = []
    candidates = [ROOT / "corpus"]
    if DECKS_ROOT.exists():
        candidates.extend(sorted(p for p in DECKS_ROOT.iterdir() if p.is_dir()))
    for deck_dir in (p for p in candidates if _is_deck_dir(p)):
        slides = [_slide_entry(p) for p in sorted(deck_dir.glob("*.html"))]
        numbered = [s["number"] for s in slides if s["number"] is not None]
        duplicate_numbers = sorted({n for n in numbered if numbered.count(n) > 1})
        expected = list(range(1, len(numbered) + 1))
        numbering = "sequential" if numbered == expected and not duplicate_numbers else "mixed"
        decks.append({
            "id": deck_dir.name,
            "path": str(deck_dir.relative_to(ROOT)),
            "slide_count": len(slides),
            "numbered_count": len(numbered),
            "numbering": numbering,
            "duplicate_numbers": duplicate_numbers,
            "has_generator": (deck_dir / "generate.py").exists(),
            "slides": slides,
        })
    return {
        "version": 2,
        "root": "_bench",
        "source_roots": ["corpus", "decks"],
        "generated_root": "generated",
        "reports_root": "reports",
        "decks": decks,
    }


def write_html(payload: dict) -> None:
    cards = []
    for deck in payload["decks"]:
        slides = "\n".join(
            f"<a href='{html.escape(deck['path'] + '/' + s['file'])}'>"
            f"<span>{s['number'] if s['number'] is not None else '--'}</span>"
            f"<strong>{html.escape(s['title'])}</strong></a>"
            for s in deck["slides"]
        )
        cards.append(
            f"<section class='{deck['numbering']}'><h2>{html.escape(deck['id'])}</h2>"
            f"<p>{deck['slide_count']} HTML files / {deck['numbering']}"
            f"{' / generated' if deck['has_generator'] else ''}</p>"
            f"<div class='slides'>{slides}</div></section>"
        )

    OUT_HTML.write_text(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Bench Index</title>
<style>
html,body{{margin:0;background:#111114;color:#f6efe4;font-family:Inter,Arial,sans-serif}}
body{{padding:40px 48px 64px}}
h1{{margin:0 0 10px;font-size:42px;letter-spacing:-.03em}}
p{{color:#aaa194;line-height:1.45}}
.deck-grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;margin-top:28px}}
section{{border:1px solid rgba(255,255,255,.12);background:#1a1a20;border-radius:8px;padding:18px}}
section.mixed{{border-color:rgba(255,190,91,.55)}}
h2{{font-size:16px;text-transform:uppercase;letter-spacing:.18em;color:#e4b45d;margin:0 0 8px}}
.slides{{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:14px}}
a{{display:flex;gap:10px;text-decoration:none;color:#f6efe4;background:#121218;border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:10px;min-height:42px}}
a span{{color:#8e8578;font-size:11px;letter-spacing:.18em;min-width:24px}}
a strong{{font-size:13px;line-height:1.25;font-weight:600}}
@media(max-width:900px){{.deck-grid,.slides{{grid-template-columns:1fr}}body{{padding:24px}}}}
</style>
</head>
<body>
<h1>Bench Index</h1>
<p>Single inventory for all `_bench` HTML decks. Yellow-bordered sections indicate mixed/non-sequential numbering that should be intentional.</p>
<div class="deck-grid">{''.join(cards)}</div>
</body>
</html>
""", encoding="utf-8")


def main() -> int:
    payload = build_payload()
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    write_html(payload)
    mixed = [d["id"] for d in payload["decks"] if d["numbering"] != "sequential"]
    print(f"wrote {OUT_JSON.relative_to(ROOT.parent)}")
    print(f"wrote {OUT_HTML.relative_to(ROOT.parent)}")
    if mixed:
        print(f"mixed numbering: {', '.join(mixed)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
