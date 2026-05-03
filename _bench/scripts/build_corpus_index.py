"""Build the browsable and machine-readable index for `_bench/corpus`.

The corpus intentionally includes both native-friendly slides and visually
rich raster/filter-heavy slides.  The index makes that explicit so presentation
sets can be composed by intent instead of relying on filename ranges.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus"
INDEX_JSON = CORPUS / "index.json"
INDEX_HTML = CORPUS / "index.html"

TITLE_RE = re.compile(r"<title>(.*?)</title>", re.I | re.S)

SECTION_BY_RANGE = [
    (1, 7, "editorial-data", "Editorial Data"),
    (8, 14, "keynote-core", "Keynote Core"),
    (15, 21, "technical-system", "Technical System"),
    (22, 28, "saas-product", "SaaS Product"),
    (29, 35, "organic-editorial", "Organic Editorial"),
    (36, 42, "consulting-strategy", "Consulting Strategy"),
    (43, 49, "magazine-image", "Magazine Image"),
]

TAG_RULES = {
    "editorial-data": ["editorial", "data", "chart"],
    "keynote-core": ["keynote", "minimal"],
    "technical-system": ["technical", "brutalist"],
    "saas-product": ["saas", "product"],
    "organic-editorial": ["organic", "editorial"],
    "consulting-strategy": ["consulting", "strategy"],
    "magazine-image": ["magazine", "image-led"],
}

RASTER_HEAVY = {
    "slide-43-magazine-cover-mask.html",
    "slide-44-magazine-spread.html",
    "slide-45-photo-essay-caption.html",
    "slide-46-pull-quote-faded.html",
    "slide-47-mosaic-gallery.html",
    "slide-48-duotone-hero.html",
}

SPECIAL_TAGS = {
    "slide-07-cover-the-numbers.html": ["cover"],
    "slide-14-thank-you.html": ["closing"],
    "slide-22-hero-gradient.html": ["landing", "hero"],
    "slide-27-cta-closing.html": ["landing", "closing"],
    "slide-41-cover.html": ["cover"],
    "slide-49-text-wrap-stress.html": ["stress-test", "text"],
}

DECKS = [
    {
        "id": "editorial-brief",
        "title": "Editorial Brief",
        "description": "A data-journalism sequence with headline charts and a cover.",
        "slides": ["slide-01", "slide-02", "slide-03", "slide-04", "slide-05", "slide-06", "slide-07"],
    },
    {
        "id": "product-pitch",
        "title": "Product Pitch",
        "description": "Hero, proof, pricing, feature depth, social proof, and CTA.",
        "slides": ["slide-22", "slide-23", "slide-24", "slide-25", "slide-26", "slide-27", "slide-28"],
    },
    {
        "id": "quiet-editorial",
        "title": "Quiet Editorial",
        "description": "Organic story slides with soft layouts and refined typography.",
        "slides": ["slide-29", "slide-30", "slide-31", "slide-32", "slide-33", "slide-34", "slide-35"],
    },
    {
        "id": "strategy-review",
        "title": "Strategy Review",
        "description": "Consulting-style matrix, bars, tables, insights, waterfall, cover, and ranking.",
        "slides": ["slide-36", "slide-37", "slide-38", "slide-39", "slide-40", "slide-41", "slide-42"],
    },
    {
        "id": "image-led-magazine",
        "title": "Image-Led Magazine",
        "description": "Designer-grade image, mask, photo, blend, and editorial spread specimens.",
        "slides": ["slide-43", "slide-44", "slide-45", "slide-46", "slide-47", "slide-48"],
    },
    {
        "id": "fidelity-stress",
        "title": "Fidelity Stress Mix",
        "description": "A balanced set for exercising native, SVG, raster, typography, and wrapping paths.",
        "slides": ["slide-06", "slide-13", "slide-19", "slide-25", "slide-34", "slide-43", "slide-48", "slide-49"],
    },
]


def _slide_number(path: Path) -> int:
    return int(path.name.split("-", 2)[1])


def _old_number(new_number: int) -> int:
    group = (new_number - 1) // 7
    return new_number + group * 3


def _section(new_number: int) -> tuple[str, str]:
    for lo, hi, section_id, section_title in SECTION_BY_RANGE:
        if lo <= new_number <= hi:
            return section_id, section_title
    return "misc", "Misc"


def _title(text: str, fallback: str) -> str:
    match = TITLE_RE.search(text)
    if not match:
        return fallback
    return re.sub(r"\s+", " ", html.unescape(match.group(1))).strip()


def build_payload() -> dict:
    slides = []
    for path in sorted(CORPUS.glob("slide-*.html")):
        text = path.read_text(encoding="utf-8")
        number = _slide_number(path)
        section_id, section_title = _section(number)
        tags = list(TAG_RULES.get(section_id, []))
        tags.extend(SPECIAL_TAGS.get(path.name, []))
        rendering = "raster-rich" if path.name in RASTER_HEAVY else "native-mixed"
        if "svg" in text.lower():
            tags.append("svg")
        if "<img" in text.lower():
            tags.append("photo")
        if "background-clip" in text or "mask-image" in text or "mix-blend-mode" in text or "filter:" in text:
            tags.append("effects")
        slides.append({
            "id": f"slide-{number:02d}",
            "number": number,
            "old_number": _old_number(number),
            "file": path.name,
            "title": _title(text, path.stem),
            "section": section_id,
            "section_title": section_title,
            "rendering": rendering,
            "tags": sorted(set(tags)),
        })

    return {
        "version": 1,
        "root": "_bench/corpus",
        "slides": slides,
        "decks": DECKS,
        "catalogs": [
            {"id": "landing-atoms", "file": "landing-atoms.html", "title": "Atomic Visual Catalog"},
            {"id": "landing-fonts", "file": "landing-fonts.html", "title": "Typographic Register Catalog"},
            {"id": "landing-probe", "file": "landing-probe.html", "title": "Renderer Probe Catalog"},
            {"id": "landing-recipes", "file": "landing-recipes.html", "title": "Composable Recipe Catalog"},
            {"id": "sophisticated", "file": "sophisticated.html", "title": "Sophisticated Product Deck"},
        ],
    }


def write_html(payload: dict) -> None:
    sections: dict[str, list[dict]] = {}
    for slide in payload["slides"]:
        sections.setdefault(slide["section_title"], []).append(slide)

    deck_cards = "\n".join(
        f"<article><h2>{html.escape(deck['title'])}</h2>"
        f"<p>{html.escape(deck['description'])}</p>"
        f"<code>{' '.join(deck['slides'])}</code></article>"
        for deck in payload["decks"]
    )
    section_blocks = []
    for section_title, slides in sections.items():
        links = "\n".join(
            f"<a class='slide {s['rendering']}' href='{html.escape(s['file'])}'>"
            f"<span>{s['id']}</span><strong>{html.escape(s['title'])}</strong>"
            f"<small>{s['rendering']} / {', '.join(s['tags'])}</small></a>"
            for s in slides
        )
        section_blocks.append(f"<section><h2>{html.escape(section_title)}</h2><div class='grid'>{links}</div></section>")

    INDEX_HTML.write_text(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Bench Corpus Index</title>
<style>
html,body{{margin:0;background:#101014;color:#f7f2e8;font-family:Inter,Arial,sans-serif}}
body{{padding:40px 48px 56px}}
h1{{font-size:42px;letter-spacing:-0.03em;margin:0 0 10px}}
p{{color:#b9b1a2;line-height:1.55;max-width:840px}}
.decks{{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:28px 0 36px}}
article,.slide{{border:1px solid rgba(255,255,255,.12);background:#19191f;border-radius:8px}}
article{{padding:18px}}
article h2,section h2{{font-size:15px;text-transform:uppercase;letter-spacing:.18em;margin:0 0 10px;color:#e0b15a}}
code{{display:block;color:#d7d0c4;white-space:normal;font-size:12px}}
section{{margin-top:30px}}
.grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}}
.slide{{display:flex;flex-direction:column;gap:7px;padding:14px;text-decoration:none;color:#f7f2e8;min-height:98px}}
.slide span{{font-size:11px;color:#8f8576;letter-spacing:.22em;text-transform:uppercase}}
.slide strong{{font-size:15px;line-height:1.25}}
.slide small{{color:#a59b8d;line-height:1.35}}
.raster-rich{{background:linear-gradient(145deg,#231a20,#171b2d);border-color:rgba(255,133,86,.35)}}
@media(max-width:900px){{.decks,.grid{{grid-template-columns:1fr}}body{{padding:24px}}}}
</style>
</head>
<body>
<h1>Bench Corpus Index</h1>
<p>Sequential corpus inventory for presentation rendering. Raster-rich slides are intentionally preserved for designer-grade image, mask, blend, and filter fidelity; use the composer script to assemble mixed decks by deck id, tag, or slide id.</p>
<div class="decks">{deck_cards}</div>
{''.join(section_blocks)}
</body>
</html>
""", encoding="utf-8")


def main() -> int:
    payload = build_payload()
    INDEX_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    write_html(payload)
    print(f"wrote {INDEX_JSON.relative_to(ROOT.parent)}")
    print(f"wrote {INDEX_HTML.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
