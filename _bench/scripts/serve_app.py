"""Local human viewer for bench HTML/PPTX comparisons."""
from __future__ import annotations

import argparse
import asyncio
import html
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
CORPUS = ROOT / "corpus"
DIST = ROOT / "generated" / "dist"
CACHE = ROOT / "generated" / "app-cache"
INDEX_JSON = ROOT / "index.json"
CORPUS_INDEX_JSON = CORPUS / "index.json"


def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _folder_decks() -> list[dict]:
    payload = _load_json(INDEX_JSON)
    decks = []
    for deck in payload.get("decks", []):
        deck_id = deck["id"]
        slides = [
            {
                "label": s.get("title") or s["file"],
                "file": str((ROOT / deck["path"] / s["file"]).relative_to(ROOT)),
            }
            for s in deck.get("slides", [])
            if s.get("file", "").endswith(".html")
        ]
        if slides:
            decks.append({
                "id": deck_id,
                "title": deck_id,
                "kind": "folder",
                "pptx": str((DIST / f"{deck_id}.pptx").relative_to(ROOT)),
                "slides": slides,
            })
    return decks


def _corpus_decks() -> list[dict]:
    payload = _load_json(CORPUS_INDEX_JSON)
    slides_by_id = {s["id"]: s for s in payload.get("slides", [])}
    decks = []
    for deck in payload.get("decks", []):
        rows = []
        for sid in deck.get("slides", []):
            slide = slides_by_id.get(sid)
            if not slide:
                continue
            rows.append({
                "label": slide.get("title") or slide["file"],
                "file": str((CORPUS / slide["file"]).relative_to(ROOT)),
            })
        if rows:
            decks.append({
                "id": deck["id"],
                "title": deck.get("title", deck["id"]),
                "kind": "corpus-mix",
                "pptx": str((DIST / f"{deck['id']}.pptx").relative_to(ROOT)),
                "slides": rows,
            })
    return decks


def _decks() -> list[dict]:
    decks = _corpus_decks() + _folder_decks()
    seen = set()
    out = []
    for deck in decks:
        key = (deck["kind"], deck["id"])
        if key in seen:
            continue
        seen.add(key)
        out.append(deck)
    return out


def _find_deck(deck_id: str) -> dict | None:
    return next((d for d in _decks() if d["id"] == deck_id), None)


def _slide_path(deck: dict, slide_idx: int) -> Path:
    slides = deck["slides"]
    if slide_idx < 0 or slide_idx >= len(slides):
        raise ValueError("slide index out of range")
    path = (ROOT / slides[slide_idx]["file"]).resolve()
    if ROOT.resolve() not in path.parents:
        raise ValueError("slide path escapes _bench")
    return path


def _pptx_path(deck: dict) -> Path:
    path = (ROOT / deck["pptx"]).resolve()
    if ROOT.resolve() not in path.parents:
        raise ValueError("pptx path escapes _bench")
    return path


async def _render_pptx(pptx: Path, out_dir: Path) -> None:
    from slidify.oracle import render_pptx_to_pngs

    pngs = await render_pptx_to_pngs(pptx)
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, raw in enumerate(pngs, 1):
        (out_dir / f"{i:03d}.png").write_bytes(raw)


def _ensure_pptx_png(deck: dict, slide_idx: int) -> Path:
    pptx = _pptx_path(deck)
    if not pptx.exists():
        raise FileNotFoundError(f"Missing PPTX: {pptx.relative_to(ROOT)}")
    cache_dir = CACHE / pptx.stem
    png = cache_dir / f"{slide_idx + 1:03d}.png"
    if not png.exists() or png.stat().st_mtime < pptx.stat().st_mtime:
        asyncio.run(_render_pptx(pptx, cache_dir))
    if not png.exists():
        raise FileNotFoundError(f"PPTX preview missing slide {slide_idx + 1}")
    return png


def _app_html() -> str:
    decks = _decks()
    first = decks[0] if decks else {"id": "", "slides": []}
    decks_json = json.dumps(decks)
    first_id = json.dumps(first["id"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>slidify bench viewer</title>
<style>
*{{box-sizing:border-box}}
html,body{{margin:0;height:100%;font-family:Inter,Arial,sans-serif;background:#101114;color:#f4efe6}}
body{{display:grid;grid-template-rows:auto 1fr}}
header{{display:flex;gap:16px;align-items:center;padding:14px 18px;border-bottom:1px solid #2a2c33;background:#17181d}}
h1{{font-size:16px;margin:0;text-transform:uppercase;letter-spacing:.16em;color:#e5bb68}}
select,button{{background:#24262d;color:#f4efe6;border:1px solid #3b3e48;border-radius:6px;padding:8px 10px;font:inherit}}
button{{cursor:pointer}}
.meta{{margin-left:auto;color:#9da0aa;font-size:12px}}
main{{display:grid;grid-template-columns:280px 1fr;min-height:0}}
aside{{border-right:1px solid #2a2c33;background:#15161b;overflow:auto;padding:14px}}
.slideBtn{{display:block;width:100%;text-align:left;margin:0 0 8px;padding:10px;border-radius:6px;border:1px solid #2d3038;background:#1d1f26;color:#f4efe6}}
.slideBtn.active{{border-color:#e5bb68;background:#2b2518}}
.stage{{display:grid;grid-template-rows:auto 1fr;min-width:0;min-height:0}}
.toolbar{{display:flex;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #2a2c33;background:#131419}}
.toolbar a{{color:#e5bb68;text-decoration:none;font-size:13px}}
.panes{{display:grid;grid-template-columns:1fr 1fr;gap:1px;min-height:0;background:#2a2c33}}
.pane{{display:grid;grid-template-rows:auto 1fr;min-width:0;min-height:0;background:#101114}}
.pane h2{{margin:0;padding:10px 12px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9da0aa;background:#17181d}}
iframe,.pptx{{width:100%;height:100%;border:0;background:white}}
.pptx{{display:grid;place-items:center;overflow:auto}}
.pptx img{{max-width:100%;max-height:100%;object-fit:contain;background:white}}
.empty{{padding:24px;color:#b6b0a6;line-height:1.5}}
@media(max-width:1000px){{main{{grid-template-columns:1fr}}aside{{max-height:180px}}.panes{{grid-template-columns:1fr}}}}
</style>
</head>
<body>
<header>
<h1>Bench Viewer</h1>
<select id="deck"></select>
<button id="prev">Prev</button>
<button id="next">Next</button>
<span class="meta" id="meta"></span>
</header>
<main>
<aside id="slides"></aside>
<section class="stage">
<div class="toolbar">
<a id="htmlLink" target="_blank" rel="noreferrer">open html</a>
<a id="pptxLink" target="_blank" rel="noreferrer">download pptx</a>
<span class="meta" id="status"></span>
</div>
<div class="panes">
<div class="pane"><h2>Rendered HTML</h2><iframe id="htmlFrame"></iframe></div>
<div class="pane"><h2>PPTX Preview</h2><div class="pptx" id="pptxPane"></div></div>
</div>
</section>
</main>
<script>
const decks = {decks_json};
let deckId = {first_id};
let slide = 0;
const deckSelect = document.getElementById('deck');
const slideList = document.getElementById('slides');
const htmlFrame = document.getElementById('htmlFrame');
const pptxPane = document.getElementById('pptxPane');
const htmlLink = document.getElementById('htmlLink');
const pptxLink = document.getElementById('pptxLink');
const meta = document.getElementById('meta');
const statusEl = document.getElementById('status');

for (const deck of decks) {{
  const opt = document.createElement('option');
  opt.value = deck.id;
  opt.textContent = `${{deck.title}} · ${{deck.kind}}`;
  deckSelect.appendChild(opt);
}}
deckSelect.value = deckId;

function currentDeck() {{
  return decks.find(d => d.id === deckId) || decks[0];
}}

function renderSlideList() {{
  const deck = currentDeck();
  slideList.innerHTML = '';
  deck.slides.forEach((row, idx) => {{
    const btn = document.createElement('button');
    btn.className = 'slideBtn' + (idx === slide ? ' active' : '');
    btn.textContent = `${{String(idx + 1).padStart(2, '0')}} · ${{row.label}}`;
    btn.onclick = () => {{ slide = idx; update(); }};
    slideList.appendChild(btn);
  }});
}}

function update() {{
  const deck = currentDeck();
  if (!deck) return;
  slide = Math.max(0, Math.min(slide, deck.slides.length - 1));
  renderSlideList();
  const q = `deck=${{encodeURIComponent(deck.id)}}&slide=${{slide}}`;
  htmlFrame.src = `/html?${{q}}`;
  htmlLink.href = `/html?${{q}}`;
  pptxLink.href = `/pptx?deck=${{encodeURIComponent(deck.id)}}`;
  meta.textContent = `${{deck.id}} · slide ${{slide + 1}} / ${{deck.slides.length}}`;
  statusEl.textContent = 'PPTX preview renders lazily from _bench/generated/dist';
  pptxPane.innerHTML = `<img alt="PPTX slide preview" src="/pptx.png?${{q}}" onerror="this.replaceWith(missingPptx())">`;
}}

function missingPptx() {{
  const div = document.createElement('div');
  div.className = 'empty';
  div.textContent = 'No PPTX preview yet. Render this deck first, e.g. make bench-render DECK=' + currentDeck().id + '.';
  return div;
}}

deckSelect.onchange = () => {{ deckId = deckSelect.value; slide = 0; update(); }};
document.getElementById('prev').onclick = () => {{ slide -= 1; update(); }};
document.getElementById('next').onclick = () => {{ slide += 1; update(); }};
update();
</script>
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    def _send(self, body: bytes, content_type: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, status: HTTPStatus, message: str) -> None:
        self._send(message.encode("utf-8"), "text/plain; charset=utf-8", status.value)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        qs = parse_qs(parsed.query)
        try:
            if parsed.path == "/":
                self._send(_app_html().encode("utf-8"), "text/html; charset=utf-8")
            elif parsed.path == "/api/decks":
                self._send(json.dumps(_decks(), indent=2).encode("utf-8"), "application/json")
            elif parsed.path == "/html":
                deck = _find_deck(unquote(qs.get("deck", [""])[0]))
                if deck is None:
                    raise ValueError("unknown deck")
                slide = int(qs.get("slide", ["0"])[0])
                path = _slide_path(deck, slide)
                self._send(path.read_bytes(), "text/html; charset=utf-8")
            elif parsed.path == "/pptx.png":
                deck = _find_deck(unquote(qs.get("deck", [""])[0]))
                if deck is None:
                    raise ValueError("unknown deck")
                slide = int(qs.get("slide", ["0"])[0])
                self._send(_ensure_pptx_png(deck, slide).read_bytes(), "image/png")
            elif parsed.path == "/pptx":
                deck = _find_deck(unquote(qs.get("deck", [""])[0]))
                if deck is None:
                    raise ValueError("unknown deck")
                pptx = _pptx_path(deck)
                if not pptx.exists():
                    raise FileNotFoundError(f"Missing PPTX: {pptx.relative_to(ROOT)}")
                self.send_response(200)
                self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
                self.send_header("Content-Disposition", f"attachment; filename=\"{quote(pptx.name)}\"")
                self.send_header("Content-Length", str(pptx.stat().st_size))
                self.end_headers()
                self.wfile.write(pptx.read_bytes())
            else:
                self._error(HTTPStatus.NOT_FOUND, "not found")
        except FileNotFoundError as e:
            self._error(HTTPStatus.NOT_FOUND, str(e))
        except Exception as e:  # noqa: BLE001
            self._error(HTTPStatus.BAD_REQUEST, f"{type(e).__name__}: {e}")

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"{self.address_string()} - {fmt % args}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=15999)
    args = parser.parse_args()

    if not INDEX_JSON.exists() or not CORPUS_INDEX_JSON.exists():
        raise SystemExit("missing bench indexes; run `make bench-index-all` first")

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"bench viewer: http://{args.host}:{args.port}")
    print("HTML comes from _bench; PPTX previews come from _bench/generated/dist and cache in _bench/generated/app-cache")
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
