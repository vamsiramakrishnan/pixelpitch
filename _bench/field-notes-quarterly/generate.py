from pathlib import Path

OUT = Path(__file__).parent
SLUG = OUT.name

TITLES = [
    "cover", "premise", "object", "system", "tension",
    "method", "signal", "field-note", "resolution", "close",
]

PALETTE = {
    "studio-noir-vol-i": ("#fafaf6", "#1a1a1a", ["#7a4d8c", "#3a5a8c", "#3a8c7d", "#8c7a3a", "#8c4d4d", "#7a4d8c"]),
    "agora-protocol": ("#08070C", "#FFE2C7", ["#2D5BFF", "#DAD9D5"]),
    "field-notes-quarterly": ("#F2EDE4", "#33312E", ["#C9A472", "#7A8C84", "#B85B5B"]),
    "crt-archive": ("#0a0a0a", "#39FF14", ["#FFB000", "#FF00FF", "#39FF14"]),
    "seasons-of-pacific": ("#F2E8DC", "#233344", ["#A4C9A8", "#FFE082", "#A8623F", "#5C7AA8"]),
}


def svg_blob(a: str, b: str) -> str:
    return (
        "<svg width='460' height='330' viewBox='0 0 460 330'>"
        "<defs>"
        f"<linearGradient id='g1' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='{a}'/><stop offset='100%' stop-color='{b}'/></linearGradient>"
        f"<radialGradient id='g2' cx='0.35' cy='0.35' r='0.8'><stop offset='0%' stop-color='{b}' stop-opacity='0.75'/><stop offset='100%' stop-color='{a}' stop-opacity='0.15'/></radialGradient>"
        "</defs>"
        "<rect x='24' y='20' width='412' height='286' rx='34' fill='url(#g1)'/>"
        "<circle cx='310' cy='130' r='92' fill='url(#g2)'/>"
        "<path d='M30 248 C110 170 168 296 255 238 C322 194 380 238 430 210' stroke='rgba(255,255,255,.45)' stroke-width='3' fill='none'/>"
        "</svg>"
    )


def render(i: int, title: str) -> str:
    bg, fg, accs = PALETTE[SLUG]
    acc = accs[(i - 1) % len(accs)]
    acc2 = accs[(i) % len(accs)]
    scan = "background: repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(57,255,20,0.06) 2px, rgba(57,255,20,0.06) 3px);" if SLUG == "crt-archive" else ""
    return f"""<!doctype html><html><head><meta charset='utf-8'><style>
html,body{{margin:0;width:1280px;height:720px;background:{bg};color:{fg};font-family:Inter, Arial, sans-serif;}}
.s{{position:relative;width:1280px;height:720px;overflow:hidden;{scan}}}
.frame{{position:absolute;inset:44px;border:1px solid {acc}33;}}
.kicker{{position:absolute;left:72px;top:56px;font:600 12px/1.2 'JetBrains Mono',monospace;letter-spacing:.16em;color:{acc};}}
h1{{position:absolute;left:72px;top:114px;width:650px;margin:0;font:700 84px/0.92 Inter, sans-serif;letter-spacing:-.026em;}}
.copy{{position:absolute;left:74px;top:418px;width:560px;font:400 24px/1.45 Inter, sans-serif;opacity:.9;}}
.art{{position:absolute;right:84px;top:146px;filter:drop-shadow(0 8px 18px #0002) drop-shadow(0 36px 54px #0001);}}
.orb{{position:absolute;right:40px;bottom:26px;width:320px;height:220px;background:radial-gradient(circle at 25% 50%, {acc}55, transparent 72%);}}
.meta{{position:absolute;left:74px;bottom:42px;font:500 13px/1.2 'JetBrains Mono',monospace;color:{acc2};letter-spacing:.13em;}}
</style></head><body><section class='s'><div class='frame'></div><div class='kicker'>{SLUG.upper()} / FRAME {i:02d}</div><h1>{title.replace('-', ' ').title()}</h1><p class='copy'>Advanced composition scaffold: layered vector illustration, disciplined type system, and register-specific chroma rhythm.</p><div class='art'>{svg_blob(acc, acc2)}</div><div class='orb'></div><div class='meta'>p.{i:02d} · crafted for slidify bench</div></section></body></html>"""


def main() -> None:
    for i, t in enumerate(TITLES, 1):
        (OUT / f"{i:02d}-{t}.html").write_text(render(i, t))


if __name__ == "__main__":
    main()
