"""Programmatic LLM-style slide composer for the slidify check bench.

The corpus is what an LLM would emit when asked to compose a deck —
a mix of shadcn / Tailwind primitives, Bebas-Neue magazine display,
NYT data-journalism layouts, brutalist manifestos, mono-spec product
sheets, and duotone photo essays. Each slide is a Python function that
returns one fully self-contained HTML string. Output is one HTML file
per slide; every slide stands alone with inline CSS.

Themes (see §THEMES): vercel-dark, paper, magazine, brutalist,
mono-spec, duotone. New slides should `theme=THEMES[name]` rather than
hardcoding hex literals — that's how the corpus stays diverse.

Run:
    uv run python _bench/llm-corpus/generate.py
    uv run python _bench/llm-corpus/run.py        # then slidify-check all 20

Adding a new slide = adding one function in §SLIDES below. Adding a new
primitive = adding one helper in §PRIMITIVES.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from textwrap import dedent

OUT_DIR = Path(__file__).parent


# ---------------------------------------------------------------------------
# §THEMES — palette + font registry
# ---------------------------------------------------------------------------
#
# A `Theme` is a frozen palette + font stack a slide can pick from. Every
# theme below renders well through slidify (solid + linear-gradient bgs,
# inline SVG, no backdrop-filter). New slides should `theme=THEMES[name]`
# rather than hardcoding hex literals — that's how we get diversity that
# matches `_bench/corpus/`.


@dataclass(frozen=True)
class Theme:
    name: str
    bg: str           # page background
    surface: str      # flat card
    surface_alt: str  # raised card
    border: str       # 1px hairlines
    fg: str           # primary text
    muted: str        # secondary text
    accent: str       # CTA + highlight
    accent_grad: str  # CSS background string for headlines
    success: str
    warn: str
    danger: str
    fonts: dict[str, str] = field(default_factory=dict)
    radius: int = 12  # default card radius
    is_dark: bool = True


_INTER = "Inter, -apple-system, 'Segoe UI', Helvetica, sans-serif"
_PLAYFAIR = "'Playfair Display', 'Times New Roman', Georgia, serif"
_BEBAS = "'Bebas Neue', 'Anton', Impact, sans-serif"
_HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"
_MONO = "'IBM Plex Mono', 'JetBrains Mono', 'Menlo', monospace"
_GEORGIA = "Georgia, 'Iowan Old Style', 'Tiempos', serif"


THEMES: dict[str, Theme] = {
    "vercel-dark": Theme(
        name="vercel-dark",
        bg="#070710", surface="#0e0e1a", surface_alt="#16162a",
        border="rgba(255,255,255,0.08)",
        fg="#f5f5f7", muted="#a1a1aa",
        accent="#a78bfa",
        accent_grad="linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f472b6 100%)",
        success="#86efac", warn="#fcd34d", danger="#fda4af",
        fonts={"display": _INTER, "body": _INTER, "mono": _MONO, "serif": _GEORGIA},
        radius=14, is_dark=True,
    ),
    "paper": Theme(
        name="paper",
        bg="#f7f5ef", surface="#ffffff", surface_alt="#fbfaf6",
        border="rgba(17,17,17,0.10)",
        fg="#111111", muted="#52525b",
        accent="#b91c1c",
        accent_grad="linear-gradient(135deg,#b91c1c 0%,#7f1d1d 100%)",
        success="#15803d", warn="#a16207", danger="#b91c1c",
        fonts={"display": _GEORGIA, "body": _INTER, "mono": _MONO, "serif": _GEORGIA},
        radius=4, is_dark=False,
    ),
    "magazine": Theme(
        name="magazine",
        bg="#fde9ec", surface="#ffffff", surface_alt="#0a0a0a",
        border="rgba(10,10,10,0.18)",
        fg="#0a0a0a", muted="#3f3f46",
        accent="#e11d48",
        accent_grad="linear-gradient(120deg,#e11d48 0%,#0a0a0a 100%)",
        success="#15803d", warn="#a16207", danger="#e11d48",
        fonts={"display": _BEBAS, "body": _PLAYFAIR, "mono": _MONO, "serif": _PLAYFAIR},
        radius=0, is_dark=False,
    ),
    "brutalist": Theme(
        name="brutalist",
        bg="#fef200", surface="#fef200", surface_alt="#0a0a0a",
        border="#0a0a0a",
        fg="#0a0a0a", muted="#3f3f46",
        accent="#0a0a0a",
        accent_grad="linear-gradient(90deg,#0a0a0a 0%,#0a0a0a 100%)",
        success="#15803d", warn="#a16207", danger="#dc2626",
        fonts={"display": _HELVETICA, "body": _HELVETICA, "mono": _MONO, "serif": _GEORGIA},
        radius=0, is_dark=False,
    ),
    "mono-spec": Theme(
        name="mono-spec",
        bg="#0a0a0a", surface="#101010", surface_alt="#1a1a1a",
        border="rgba(255,255,255,0.14)",
        fg="#e5e5e5", muted="#737373",
        accent="#22d3ee",
        accent_grad="linear-gradient(135deg,#22d3ee 0%,#a3e635 100%)",
        success="#a3e635", warn="#facc15", danger="#f87171",
        fonts={"display": _MONO, "body": _MONO, "mono": _MONO, "serif": _GEORGIA},
        radius=2, is_dark=True,
    ),
    "duotone": Theme(
        name="duotone",
        bg="#0d1f3c", surface="rgba(13,31,60,0.78)", surface_alt="rgba(13,31,60,0.92)",
        border="rgba(255,236,196,0.30)",
        fg="#ffecc4", muted="#ffd9a0",
        accent="#ff7a59",
        accent_grad="linear-gradient(135deg,#ff7a59 0%,#ffecc4 100%)",
        success="#86efac", warn="#fcd34d", danger="#fca5a5",
        fonts={"display": _PLAYFAIR, "body": _INTER, "mono": _MONO, "serif": _PLAYFAIR},
        radius=0, is_dark=True,
    ),
}


VD = THEMES["vercel-dark"]  # shorthand the existing helpers fall back to

# ---------------------------------------------------------------------------
# §PRIMITIVES — shadcn / Tailwind helpers (HTML-string emitters)
# ---------------------------------------------------------------------------
#
# Every helper:
#   - Returns a string (the full HTML for one element).
#   - Inlines its own CSS so the slide stays self-contained.
#   - Stamps a `data-atom='…'` hint when a matcher recipe exists.
#
# Naming follows shadcn's component names (Card, Button, Badge, Alert,
# Avatar, …) so the generator code reads like JSX shorthand.


def card(
    *,
    children: str,
    variant: str = "raised",         # 'flat' | 'raised' | 'depth'
    width: str = "100%",
    padding: int = 24,
    radius: int = 16,
) -> str:
    bg = "#0e0e1a"
    extra_shadow = ""
    border = "1px solid rgba(255,255,255,0.08)"
    if variant == "raised":
        extra_shadow = "box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.10);"
    elif variant == "depth":
        bg = "#16162a"
        extra_shadow = (
            "box-shadow: 0 8px 16px rgba(0,0,0,0.35), 0 24px 48px rgba(0,0,0,0.55), "
            "inset 0 1px 0 rgba(167,139,250,0.45);"
        )
    atom_id = f"surf.card-{variant}"
    return (
        f'<div data-atom="{atom_id}" style="width:{width}; padding:{padding}px; '
        f'background:{bg}; border:{border}; border-radius:{radius}px; '
        f'{extra_shadow}">{children}</div>'
    )


def button(
    *,
    label: str,
    variant: str = "primary",        # 'primary' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
    size: str = "md",                # 'sm' | 'md' | 'lg'
) -> str:
    height = {"sm": 32, "md": 40, "lg": 48}[size]
    pad = {"sm": 12, "md": 16, "lg": 20}[size]
    fs = {"sm": 13, "md": 14, "lg": 15}[size]
    styles = {
        "primary":     "background:#a78bfa; color:#0a0a0f; border:0;",
        "outline":     "background:transparent; color:#f5f5f7; border:1px solid rgba(255,255,255,0.20);",
        "secondary":   "background:rgba(255,255,255,0.06); color:#f5f5f7; border:0;",
        "ghost":       "background:transparent; color:#f5f5f7; border:0;",
        "destructive": "background:#ef4444; color:#fff; border:0;",
        "link":        "background:transparent; color:#a78bfa; border:0; text-decoration:underline;",
    }[variant]
    return (
        f'<button style="height:{height}px; padding:0 {pad}px; border-radius:8px; '
        f'{styles} font-weight:600; font-size:{fs}px; font-family:inherit;">{label}</button>'
    )


def badge(*, label: str, tone: str = "neutral") -> str:
    """tone: neutral | success | warning | destructive | info | accent"""
    palette = {
        "neutral":     ("rgba(255,255,255,0.06)", "rgba(255,255,255,0.20)", "#f5f5f7"),
        "success":     ("rgba(34,197,94,0.12)",   "rgba(34,197,94,0.30)",   "#86efac"),
        "warning":     ("rgba(245,158,11,0.12)",  "rgba(245,158,11,0.30)",  "#fcd34d"),
        "destructive": ("rgba(239,68,68,0.12)",   "rgba(239,68,68,0.30)",   "#fda4af"),
        "info":        ("rgba(59,130,246,0.12)",  "rgba(59,130,246,0.30)",  "#93c5fd"),
        "accent":      ("rgba(167,139,250,0.18)", "rgba(167,139,250,0.40)", "#c4b5fd"),
    }[tone]
    bg, border, text = palette
    return (
        f'<span data-atom="anno.callout-pill" style="display:inline-flex; '
        f'align-items:center; gap:6px; padding:4px 10px; border-radius:9999px; '
        f'background:{bg}; border:1px solid {border}; color:{text}; '
        f'font-size:12px; font-weight:600;">{label}</span>'
    )


def alert(*, title: str, body: str, tone: str = "info") -> str:
    palette = {
        "info":        ("rgba(59,130,246,0.08)",  "rgba(59,130,246,0.30)",  "#93c5fd", "#dbeafe"),
        "warning":     ("rgba(245,158,11,0.08)",  "rgba(245,158,11,0.30)",  "#fcd34d", "#fde68a"),
        "destructive": ("rgba(239,68,68,0.08)",   "rgba(239,68,68,0.30)",   "#fda4af", "#fecaca"),
        "success":     ("rgba(34,197,94,0.08)",   "rgba(34,197,94,0.30)",   "#86efac", "#bbf7d0"),
    }[tone]
    bg, border, head, body_color = palette
    return (
        f'<div data-atom="surf.card-flat" style="padding:16px 20px; '
        f'background:{bg}; border:1px solid {border}; border-radius:10px;">'
        f'<h4 style="margin:0 0 4px; font-size:14px; font-weight:700; color:{head};">{title}</h4>'
        f'<p style="margin:0; font-size:13px; line-height:1.55; color:{body_color};">{body}</p>'
        f'</div>'
    )


def avatar(*, initials: str, size: int = 48, bg: str = "linear-gradient(135deg,#818cf8,#c084fc 50%,#f472b6)", ring: bool = False) -> str:
    fs = max(12, size // 3)
    border = " border:2px solid #070710;" if ring else ""
    return (
        f'<div style="width:{size}px; height:{size}px; border-radius:50%; '
        f'background:{bg}; display:inline-flex; align-items:center; justify-content:center; '
        f'color:#0a0a0f; font-weight:700; font-size:{fs}px;{border}">{initials}</div>'
    )


def avatar_stack(*, members: list[tuple[str, str]], size: int = 40, overflow: int = 0) -> str:
    """members: [(initials, gradient_css)]"""
    parts = []
    for i, (initials, bg) in enumerate(members):
        margin = f"; margin-left:{-size // 4}px" if i > 0 else ""
        parts.append(
            f'<div style="width:{size}px; height:{size}px; border-radius:50%; '
            f'border:2px solid #070710; background:{bg}; display:flex; '
            f'align-items:center; justify-content:center; color:#0a0a0f; '
            f'font-weight:700; font-size:{max(11, size // 3)}px{margin}">{initials}</div>'
        )
    if overflow > 0:
        parts.append(
            f'<div style="width:{size}px; height:{size}px; border-radius:50%; '
            f'border:2px solid #070710; background:rgba(255,255,255,0.08); '
            f'display:flex; align-items:center; justify-content:center; '
            f'color:#f5f5f7; font-weight:700; font-size:{max(11, size // 3)}px; '
            f'margin-left:{-size // 4}px;">+{overflow}</div>'
        )
    return f'<div style="display:flex;">{"".join(parts)}</div>'


def progress(*, value: float, label: str = "", trail_label: str = "", color: str = "#a78bfa") -> str:
    """value: 0..1"""
    pct = max(0.0, min(1.0, value)) * 100
    head = ""
    if label or trail_label:
        head = (
            '<div style="display:flex; justify-content:space-between; '
            'margin-bottom:8px; font-size:13px;">'
            f'<span style="color:#d4d4d8;">{label}</span>'
            f'<span style="color:#a1a1aa;">{trail_label}</span>'
            '</div>'
        )
    bar = (
        f'<div data-atom="ui.progress-bar" style="position:relative; height:8px; '
        f'background:rgba(255,255,255,0.08); border-radius:4px;">'
        f'<div style="position:absolute; left:0; top:0; bottom:0; '
        f'width:{pct:.1f}%; background:{color}; border-radius:4px;"></div></div>'
    )
    return head + bar


def hairline() -> str:
    return (
        '<hr data-atom="dec.hairline-rule" '
        'style="border:0; border-top:1px solid rgba(255,255,255,0.10); margin:0;">'
    )


def kicker(text: str, *, color: str = "#a78bfa") -> str:
    return (
        f'<div data-atom="type.eyebrow-ruled" '
        f'style="font-size:13px; font-weight:600; letter-spacing:0.42em; '
        f'text-transform:uppercase; color:{color};">{text}</div>'
    )


def headline(text: str, *, size_px: int = 56, gradient: bool = False) -> str:
    grad_css = (
        ' background:linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f472b6 100%);'
        ' -webkit-background-clip:text; background-clip:text; color:transparent;'
    ) if gradient else ""
    atom = "type.gfill-4" if gradient else "type.eyebrow-ruled"
    return (
        f'<h1 data-atom="{atom}" data-pptx-role="title" '
        f'style="margin:0; font-size:{size_px}px; font-weight:800; '
        f'letter-spacing:-0.045em; line-height:1.0;{grad_css}">{text}</h1>'
    )


def stat(*, label: str, value: str, unit: str = "", delta: str = "", delta_tone: str = "success") -> str:
    delta_html = badge(label=delta, tone=delta_tone) if delta else ""
    unit_html = f'<span style="font-size:32px; color:#a78bfa">{unit}</span>' if unit else ""
    return card(
        variant="raised",
        children=(
            f'<p style="margin:0; color:#a1a1aa; font-size:12px; letter-spacing:0.18em; '
            f'text-transform:uppercase; font-weight:600;">{label}</p>'
            f'<p data-atom="type.gfill-4" style="margin:14px 0 0; font-size:64px; '
            f'font-weight:800; letter-spacing:-0.045em; line-height:1.0; color:#f5f5f7;">'
            f'{value}{unit_html}</p>'
            + (f'<div style="margin-top:14px;">{delta_html}</div>' if delta else "")
        ),
        padding=28,
    )


# ---------------------------------------------------------------------------
# §LUCIDE — inline-SVG icons (subset)
# ---------------------------------------------------------------------------
#
# Lucide-react ships icons as inline 24×24 SVG with stroke=2,
# stroke-linecap=round, stroke-linejoin=round, fill=none. Slidify
# converts every `<svg>` natively as long as the icon stays under
# ~200 primitive children — every icon below qualifies.
#
# Path data is from lucide.dev (ISC license). When you need an icon
# that isn't here, copy it straight from `lucide.dev/icons/<name>` —
# it'll convert just like the ones below.

LUCIDE_ICONS: dict[str, str] = {
    "check":         '<path d="M20 6 9 17l-5-5"/>',
    "x":             '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    "plus":          '<path d="M5 12h14"/><path d="M12 5v14"/>',
    "minus":         '<path d="M5 12h14"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "arrow-right":   '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-up-right":'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    "circle":        '<circle cx="12" cy="12" r="10"/>',
    "square":        '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    "play":          '<polygon points="6 3 20 12 6 21 6 3"/>',
    "star":          ('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14'
                      ' 18.18 21.02 12 17.77 5.82 21.02 7 14.14'
                      ' 2 9.27 8.91 8.26 12 2"/>'),
    "zap": ('<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46'
            'l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2'
            'a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'),
    "globe": ('<circle cx="12" cy="12" r="10"/>'
              '<line x1="2" y1="12" x2="22" y2="12"/>'
              '<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10'
              ' 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
    "user":  ('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>'
              '<circle cx="12" cy="7" r="4"/>'),
    "bar-chart": ('<line x1="12" y1="20" x2="12" y2="10"/>'
                  '<line x1="18" y1="20" x2="18" y2="4"/>'
                  '<line x1="6" y1="20" x2="6" y2="16"/>'),
    "lock":  ('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>'
              '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    "shield": ('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01'
               'C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72'
               'a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),
    "eye":   ('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>'
              '<circle cx="12" cy="12" r="3"/>'),
    "github": ('<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5'
               '.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5'
               ' 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2'
               'c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9'
               'c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85'
               'v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>'),
    "rocket": ('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2'
               'c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>'
               '<path d="M12 15c4-1.4 7.6-5.6 8-12-6.4.4-10.6 4-12 8z"/>'
               '<path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>'
               '<path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'),
    "sparkles": ('<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582'
                 'a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135'
                 'a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937'
                 'l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063'
                 'a2 2 0 0 0-1.437 1.437l-1.582 6.135'
                 'a.5.5 0 0 1-.963 0z"/>'
                 '<path d="M20 3v4"/><path d="M22 5h-4"/>'
                 '<path d="M4 17v2"/><path d="M5 18H3"/>'),
    "trending-up": ('<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>'
                    '<polyline points="16 7 22 7 22 13"/>'),
}


def lucide(name: str, *, size: int = 24, stroke: float = 2.0,
           color: str = "currentColor") -> str:
    """Return inline SVG for a lucide icon. Always 24×24 viewBox."""
    body = LUCIDE_ICONS[name]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" '
        f'height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" '
        f'stroke-width="{stroke}" stroke-linecap="round" '
        f'stroke-linejoin="round" data-icon="lucide.{name}">{body}</svg>'
    )


def aurora_bg() -> str:
    return (
        '<div data-atom="bg.aurora-band" style="position:absolute; inset:0; '
        'background: radial-gradient(ellipse 1100px 760px at 80% 12%, '
        '#1e1b4b 0%, #0a0a14 55%, #050510 100%);"></div>'
    )


# ---------------------------------------------------------------------------
# Page wrapper
# ---------------------------------------------------------------------------


def _base_css(theme: Theme) -> str:
    return dedent(f"""
      *, *::before, *::after {{ box-sizing: border-box; }}
      html, body {{ margin:0; padding:0; width:1280px; height:720px;
                   font-family: {theme.fonts.get('body', _INTER)};
                   -webkit-font-smoothing:antialiased;
                   color:{theme.fg}; background:{theme.bg}; }}
      .slide {{ position:relative; width:1280px; height:720px; padding:80px;
               overflow:hidden; background:{theme.bg}; }}
    """).strip()


def _wrap(title: str, body: str, theme: Theme = VD) -> str:
    return dedent(f"""\
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <title>{title}</title>
    <style>{_base_css(theme)}</style>
    </head>
    <body>
    {body}
    </body>
    </html>
    """)


# ---------------------------------------------------------------------------
# §SLIDES — real, dense, multi-primitive compositions
# ---------------------------------------------------------------------------
#
# Each function returns (filename_stem, html_for_one_slide). Slides
# compose 5–12 primitives with realistic content — these are the slides
# you'd actually put in a deck, not a parts catalog.


def slide_01_hero() -> tuple[str, str]:
    body = f"""<div class="slide">
      {aurora_bg()}
      <div style="position:relative; height:100%; display:flex; flex-direction:column; justify-content:space-between;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:10px;
                        background:linear-gradient(135deg,#818cf8,#c084fc 50%,#f472b6);"></div>
            <div style="font-size:18px; font-weight:700; letter-spacing:-0.01em;">
              slidify <span style="font-weight:500; color:#a1a1aa;">· v1.0</span>
            </div>
          </div>
          {badge(label='● shipping today', tone='success')}
        </div>
        <div>
          {kicker('Q2 2026 · Investor Update')}
          <div style="height:24px;"></div>
          {headline('A compiler for <span style="background:linear-gradient(135deg,#818cf8,#c084fc 50%,#f472b6);'
                    '-webkit-background-clip:text;background-clip:text;color:transparent;">presentations</span>, '
                    'not a screenshot tool.', size_px=92)}
          <p style="margin-top:28px; max-width:780px; color:#d4d4d8; font-size:22px;
                    line-height:1.5; font-weight:500;">
            Render in Chromium. Cluster into visual units. Translate gradients,
            shadows, and shapes natively. Edit the result in PowerPoint as if a
            human authored it.
          </p>
          <div style="margin-top:36px; display:flex; gap:12px;">
            {button(label='Get the CLI →', variant='primary', size='lg')}
            {button(label='Watch the demo', variant='outline', size='lg')}
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:13px;
                    color:#52525b; letter-spacing:0.18em; font-weight:600;">
          <span>INTERNAL · For discussion</span>
          <span>PIXELPITCH LABS · 01 / 09</span>
        </div>
      </div>
    </div>"""
    return "01-hero", body


def slide_02_kpi_grid() -> tuple[str, str]:
    body = f"""<div class="slide">
      {kicker('By the numbers')}
      <h1 style="margin:24px 0 56px; font-size:56px; font-weight:800;
                 letter-spacing:-0.025em;">Atelier-v2 telemetry.</h1>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:24px;">
        {stat(label='Atoms shipped', value='155', delta='▲ +94 vs Wave-2A')}
        {stat(label='Native ratio', value='87', unit='%', delta='▲ +29.4%')}
        {stat(label='Recipes', value='95', delta='codegen', delta_tone='neutral')}
        {stat(label='Escape rate', value='0.12', unit='%', delta='▼ −2.1pp', delta_tone='success')}
      </div>
      <div style="margin-top:48px;">
        {hairline()}
        <p style="margin-top:18px; color:#71717a; font-size:13px;
                  letter-spacing:0.18em; font-weight:600;">
          SOURCE · slidify telemetry · last 28 days · n = 1,284 deck conversions
        </p>
      </div>
    </div>"""
    return "02-kpi-grid", body


def slide_03_feature_three_up() -> tuple[str, str]:
    icon = lambda gradient: (  # noqa: E731
        f'<div style="width:36px; height:36px; border-radius:9px; '
        f'background:{gradient}; margin-bottom:16px;"></div>'
    )
    feature = lambda gradient, title, copy: card(  # noqa: E731
        variant="raised",
        children=(
            icon(gradient)
            + f'<h2 style="margin:0 0 6px; font-size:20px;">{title}</h2>'
            + f'<p style="margin:0; color:#a1a1aa; font-size:14px; line-height:1.55;">{copy}</p>'
        ),
        padding=28,
    )
    third = feature(
        'linear-gradient(135deg,#f59e0b,#ef4444)',
        'LLM-friendly',
        "A pre-flight checker tells the model exactly what will and won't convert.",
    )
    body = f"""<div class="slide">
      {kicker('Why slidify')}
      <h1 style="margin:18px 0 48px; font-size:48px; font-weight:800;
                 letter-spacing:-0.025em;">Three reasons it lands.</h1>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px;">
        {feature('linear-gradient(135deg,#818cf8,#c084fc 50%,#f472b6)',
                 'Native shapes',
                 '87% of slide area emits as editable PPTX primitives. No screenshots in PowerPoint.')}
        {feature('linear-gradient(135deg,#10b981,#84cc16)',
                 'Round-trippable',
                 'Every shape carries a recipe id. Edits in PowerPoint flow back to JSX.')}
        {third}
      </div>
      <div style="margin-top:64px; display:flex; gap:32px; align-items:center;
                  color:#a1a1aa; font-size:13px;">
        {avatar_stack(members=[
            ('AK', 'linear-gradient(135deg,#818cf8,#c084fc)'),
            ('BM', 'linear-gradient(135deg,#10b981,#84cc16)'),
            ('CR', 'linear-gradient(135deg,#f59e0b,#ef4444)'),
            ('DV', 'linear-gradient(135deg,#3b82f6,#06b6d4)'),
        ], overflow=12, size=32)}
        <span>Built by 16 designers + engineers across 4 timezones.</span>
      </div>
    </div>"""
    return "03-feature-three-up", body


def slide_04_pricing() -> tuple[str, str]:
    def tier(name, price, suffix, popular, items):
        list_html = "".join(
            '<li style="display:flex; align-items:center; gap:8px; padding:6px 0; '
            'font-size:13px; color:#d4d4d8;">'
            '<span style="color:#86efac;">✓</span><span>' + x + '</span></li>'
            for x in items
        )
        ribbon = (
            '<span style="position:absolute; top:-12px; left:32px; padding:4px 10px; '
            'border-radius:9999px; background:#a78bfa; color:#0a0a0f; '
            'font-size:12px; font-weight:700; letter-spacing:0.04em;">POPULAR</span>'
        ) if popular else ""
        bg = "#16162a" if popular else "#0e0e1a"
        border = "2px solid #a78bfa" if popular else "1px solid rgba(255,255,255,0.08)"
        shadow = "box-shadow: 0 24px 60px rgba(167,139,250,0.20);" if popular else ""
        atom_id = "surf.card-raised" if popular else "surf.card-flat"
        suffix_html = (
            '<span style="font-size:18px; color:#a1a1aa;">' + suffix + '</span>'
        ) if suffix else ""
        sub = "forever" if not suffix else "per editor"
        title_color = "#a78bfa" if popular else "#a1a1aa"
        cta = button(
            label=f"Choose {name}",
            variant=("primary" if popular else "outline"),
            size="md",
        )
        return (
            f'<div data-atom="{atom_id}" '
            f'style="position:relative; padding:32px; background:{bg}; '
            f'border:{border}; border-radius:16px; {shadow}">'
            f'{ribbon}'
            f'<p style="margin:0; color:{title_color}; font-size:13px; font-weight:600;">{name}</p>'
            f'<p style="margin:16px 0 8px; font-size:48px; font-weight:800; '
            f'letter-spacing:-0.045em;">${price}{suffix_html}</p>'
            f'<p style="margin:0; color:#71717a; font-size:13px;">{sub}</p>'
            f'<ul style="margin:24px 0 0; padding:0; list-style:none;">{list_html}</ul>'
            f'<div style="margin-top:24px;">{cta}</div>'
            f'</div>'
        )
    body = f"""<div class="slide">
      <div style="text-align:center; margin-bottom:48px;">
        {kicker('Pricing')}
        <h1 style="margin:18px 0 12px; font-size:48px; font-weight:800;
                   letter-spacing:-0.025em;">One PPTX per pitch.</h1>
        <p style="margin:0; color:#a1a1aa; font-size:16px;">
          Free for hobby decks. Pay when you ship to a board.
        </p>
      </div>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px;">
        {tier('Hobby', '0', '', False, ['50 slides / month', '4 templates', 'Watermark on export'])}
        {tier('Pro', '29', '/mo', True, ['Unlimited slides', 'All templates &amp; atoms', 'No watermark', 'PPTX round-trip'])}
        {tier('Team', '79', '/mo', False, ['Everything in Pro', 'Brand atoms.yaml lock', 'Slack &amp; Figma plugins', 'SSO'])}
      </div>
    </div>"""
    return "04-pricing", body


def slide_05_dashboard() -> tuple[str, str]:
    body = f"""<div class="slide">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          {kicker('Internal dashboard')}
          <h1 style="margin:14px 0 0; font-size:36px; font-weight:800;">
            Conversion health, last 28 days.
          </h1>
        </div>
        <div style="display:flex; gap:8px;">
          {badge(label='● live', tone='success')}
          {badge(label='28d window', tone='neutral')}
          {button(label='Export PPTX', variant='outline', size='sm')}
        </div>
      </div>

      <div style="margin-top:36px; display:grid; grid-template-columns:1fr 1fr; gap:24px;">
        {card(variant='flat', children=
          '<p style="margin:0 0 16px; font-size:13px; color:#a1a1aa; '
          'letter-spacing:0.18em; text-transform:uppercase; font-weight:600;">Native ratio progression</p>'
          + '<svg width="100%" height="160" viewBox="0 0 540 160" preserveAspectRatio="none">'
          '<polyline fill="none" stroke="#a78bfa" stroke-width="3" '
          'points="0,140 60,128 120,116 180,104 240,86 300,72 360,68 420,52 480,40 540,30"/>'
          '<polyline fill="rgba(167,139,250,0.18)" stroke="none" '
          'points="0,140 60,128 120,116 180,104 240,86 300,72 360,68 420,52 480,40 540,30 540,160 0,160"/>'
          '<circle cx="540" cy="30" r="5" fill="#f472b6"/>'
          '</svg>'
          + '<div style="display:flex; justify-content:space-between; margin-top:12px; '
          'font-size:11px; color:#71717a;">'
          '<span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>'
          '<span>Jul</span><span>Aug</span><span>Sep</span></div>',
          padding=24)}
        {card(variant='flat', children=
          '<p style="margin:0 0 16px; font-size:13px; color:#a1a1aa; '
          'letter-spacing:0.18em; text-transform:uppercase; font-weight:600;">Coverage by tier</p>'
          + progress(value=0.91, label='Tier-0 (atoms)',     trail_label='91%', color='#a78bfa')
          + '<div style="height:14px"></div>'
          + progress(value=0.78, label='Tier-1 (patterns)',  trail_label='78%', color='#c084fc')
          + '<div style="height:14px"></div>'
          + progress(value=0.42, label='Tier-2 (heuristics)', trail_label='42%', color='#f472b6')
          + '<div style="height:14px"></div>'
          + progress(value=0.08, label='Tier-3 (LLM)',        trail_label='8%',  color='#71717a'),
          padding=24)}
      </div>

      <div style="margin-top:24px;">
        {alert(title='Heads up: bento-cell contrast bumped',
               body='surf.bento-cell now defaults to surface-3 (#16162a) so cards are visible against the surface-1 slide background. Re-render decks compiled before today.',
               tone='warning')}
      </div>
    </div>"""
    return "05-dashboard", body


def slide_06_team() -> tuple[str, str]:
    members = [
        ('Avery K.', 'IR & compiler',     'linear-gradient(135deg,#818cf8,#c084fc)'),
        ('Bo M.',    'Primitives',         'linear-gradient(135deg,#10b981,#84cc16)'),
        ('Cyn R.',   'Recipes',            'linear-gradient(135deg,#f59e0b,#ef4444)'),
        ('Dev V.',   'Harvester',          'linear-gradient(135deg,#3b82f6,#06b6d4)'),
        ('Eli T.',   'PPTX backend',       'linear-gradient(135deg,#ec4899,#a78bfa)'),
        ('Fia W.',   'Design system',      'linear-gradient(135deg,#84cc16,#22c55e)'),
    ]
    member_card = lambda name, role, grad: card(  # noqa: E731
        variant="raised",
        children=(
            f'<div style="display:flex; gap:16px; align-items:center;">'
            f'{avatar(initials="".join(p[0] for p in name.split()), bg=grad, size=56)}'
            f'<div><p style="margin:0; font-size:18px; font-weight:700;">{name}</p>'
            f'<p style="margin:4px 0 0; color:#a1a1aa; font-size:13px;">{role}</p></div>'
            f'</div>'
        ),
        padding=20,
    )
    grid = "".join(member_card(n, r, g) for n, r, g in members)
    body = f"""<div class="slide">
      {kicker('Team')}
      <h1 style="margin:14px 0 8px; font-size:48px; font-weight:800;
                 letter-spacing:-0.025em;">The people who shipped this.</h1>
      <p style="margin:0; color:#a1a1aa; font-size:16px;">
        Six full-time + two design partners. Distributed across four timezones.
      </p>
      <div style="margin-top:40px; display:grid; grid-template-columns:repeat(3,1fr); gap:20px;">
        {grid}
      </div>
    </div>"""
    return "06-team", body


def slide_07_quote() -> tuple[str, str]:
    body = f"""<div class="slide" style="display:flex; flex-direction:column;
                                          justify-content:center; align-items:center;
                                          text-align:center;">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="rgba(167,139,250,0.40)">
        <path d="M9 7H5a2 2 0 00-2 2v4h6v-2H7V9h2zm10 0h-4a2 2 0 00-2 2v4h6v-2h-2V9h2z"/>
      </svg>
      <blockquote data-atom="type.pullquote-serif"
                  style="margin:32px 0; max-width:980px; font-family:'Tiempos','Iowan Old Style',Georgia,serif;
                         font-size:48px; line-height:1.22; font-style:italic;">
        Slidify is the first tool that actually understands what designers
        mean by &ldquo;editable.&rdquo;
      </blockquote>
      <div style="display:flex; align-items:center; gap:14px; margin-top:8px;">
        {avatar(initials='DV', bg='linear-gradient(135deg,#818cf8,#f472b6)', size=48)}
        <div style="text-align:left;">
          <p style="margin:0; font-weight:600; font-size:14px;">Dev V.</p>
          <p style="margin:4px 0 0; color:#a1a1aa; font-size:13px;">Design partner, Anonymous Studio</p>
        </div>
        <div style="margin-left:14px;">{badge(label='Verified customer', tone='accent')}</div>
      </div>
    </div>"""
    return "07-quote", body


def slide_08_roadmap() -> tuple[str, str]:
    quarters = [
        ("Q1", ["Atoms.yaml lock", "Codegen pass", "M3 primitives"], True),
        ("Q2", ["Atelier-v2", "Preset matrix", "Harvester GA"],     True),
        ("Q3", ["PPTX round-trip", "Reverse-import", "Cookbook"],   False),
        ("Q4", ["PDF backend", "Keynote XML", "Figma plugin"],      False),
    ]
    def col(q, items, done):
        b = badge(label='✓ shipped', tone='success') if done else badge(label='in flight', tone='neutral')
        list_html = "".join(
            f'<li style="display:flex; align-items:center; gap:8px; padding:8px 0; '
            f'font-size:14px; color:#d4d4d8;">'
            f'<span style="color:#a78bfa;">●</span><span>{x}</span></li>'
            for x in items
        )
        return card(
            variant="flat",
            children=(
                f'<div style="display:flex; justify-content:space-between; align-items:center;">'
                f'<p style="margin:0; font-size:32px; font-weight:800;">{q}</p>{b}</div>'
                f'<ul style="margin:16px 0 0; padding:0; list-style:none;">{list_html}</ul>'
            ),
            padding=24,
        )
    body = f"""<div class="slide">
      {kicker('2026 plan of record')}
      <h1 style="margin:14px 0 40px; font-size:48px; font-weight:800;
                 letter-spacing:-0.025em;">Roadmap.</h1>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:20px;">
        {''.join(col(q, items, done) for q, items, done in quarters)}
      </div>
      <div style="margin-top:36px; display:flex; gap:16px; justify-content:flex-end;">
        {button(label='Subscribe to changelog', variant='outline', size='md')}
        {button(label='Join the waitlist →', variant='primary', size='md')}
      </div>
    </div>"""
    return "08-roadmap", body


def slide_09_closing() -> tuple[str, str]:
    body = f"""<div class="slide" style="display:flex; flex-direction:column;
                                          justify-content:center; align-items:center;
                                          text-align:center;">
      {aurora_bg()}
      <div style="position:relative;">
        {kicker('Get the slidify CLI')}
        <h1 data-atom="type.gfill-4" style="margin:24px 0 18px; font-size:88px;
                                            font-weight:800; letter-spacing:-0.04em;
                                            background:linear-gradient(135deg,#818cf8,#c084fc 50%,#f472b6);
                                            -webkit-background-clip:text; background-clip:text;
                                            color:transparent;">
          Ready to compile your next deck?
        </h1>
        <p style="margin:0 0 36px; max-width:720px; color:#d4d4d8;
                  font-size:20px; line-height:1.5; font-weight:500;">
          One curl. One command. Native PPTX out the other side.
        </p>
        <div style="display:flex; gap:12px; justify-content:center;">
          {button(label='curl -fsSL https://slidify.sh/install | sh', variant='secondary', size='lg')}
          {button(label='Read the docs →', variant='primary', size='lg')}
        </div>
        <div style="margin-top:48px; display:flex; gap:24px; justify-content:center;
                    color:#71717a; font-size:13px; letter-spacing:0.04em;">
          <span>github.com/slidify/slidify</span>
          <span>· @slidify_dev</span>
          <span>· slidify.dev</span>
        </div>
      </div>
    </div>"""
    return "09-closing", body


# ---------------------------------------------------------------------------
# §SLIDES — diversity expansion (themes beyond vercel-dark)
# ---------------------------------------------------------------------------


def slide_10_news_data_journalism() -> tuple[str, str]:
    """NYT-flavored data-journalism slide on paper theme.

    Annotated line chart + dek + footnote source line. Inline SVG, Georgia
    display, Inter sans for chrome.
    """
    t = THEMES["paper"]
    body = f"""<div class="slide" style="padding:64px 88px;">
      <div data-atom="type.eyebrow-ruled"
           style="font-family:{t.fonts['body']}; font-size:11px; letter-spacing:0.32em;
                  text-transform:uppercase; font-weight:700; color:{t.accent};">
        The Upshot · Housing</div>
      <h1 data-pptx-role="title"
          style="margin:14px 0 8px; font-family:{t.fonts['display']};
                 font-size:54px; line-height:1.05; letter-spacing:-0.012em;
                 font-weight:700; max-width:920px;">
        Rents fell in just six of the country's fifty largest metros.
      </h1>
      <p style="margin:0; max-width:760px; color:{t.muted}; font-size:17px;
                line-height:1.55;">
        Year-over-year change in median asking rent for a two-bedroom apartment,
        2024 → 2025. Bars below zero mark cities where renters caught a break.
      </p>

      <div style="margin-top:36px; position:relative; height:300px;
                  border-top:1px solid {t.border}; border-bottom:1px solid {t.border};">
        <!-- horizontal grid -->
        <div style="position:absolute; left:0; right:0; top:50%; height:1px;
                    background:rgba(17,17,17,0.14);"></div>
        <div style="position:absolute; left:0; bottom:8px; font-family:{t.fonts['mono']};
                    font-size:10px; color:{t.muted};">−6%</div>
        <div style="position:absolute; left:0; top:calc(50% - 16px);
                    font-family:{t.fonts['mono']}; font-size:10px; color:{t.muted};">0</div>
        <div style="position:absolute; left:0; top:8px; font-family:{t.fonts['mono']};
                    font-size:10px; color:{t.muted};">+6%</div>

        <!-- bars -->
        <svg width="100%" height="300" viewBox="0 0 1100 300" preserveAspectRatio="none"
             style="position:absolute; inset:0;">
          <!-- positives (above 150) -->
          {"".join(
            f'<rect x="{40 + i*22}" y="{150 - h*1.0}" width="14" height="{h*1.0}" '
            f'fill="#111111"/>'
            for i, h in enumerate([12,18,22,28,34,40,46,54,62,72,80,88,94,
                                    72,66,58,50,44,38,32,28,22,18,14,10,8])
          )}
          <!-- negatives (below 150) -->
          {"".join(
            f'<rect x="{40 + (26+i)*22}" y="150" width="14" height="{abs(h)*1.0}" '
            f'fill="{t.accent}"/>'
            for i, h in enumerate([-6,-12,-18,-24,-32,-44])
          )}
          <!-- annotation line -->
          <line x1="990" y1="206" x2="940" y2="240" stroke="#111111" stroke-width="1"/>
          <circle cx="990" cy="206" r="3" fill="{t.accent}"/>
        </svg>
        <div style="position:absolute; left:760px; bottom:24px; max-width:300px;
                    font-family:{t.fonts['display']}; font-style:italic; color:{t.fg};
                    font-size:14px; line-height:1.4;">
          Austin posted the steepest drop, −4.4%,<br/>
          after two straight years of double-digit gains.
        </div>
      </div>

      <div style="margin-top:24px; display:flex; justify-content:space-between;
                  font-family:{t.fonts['mono']}; font-size:10.5px; letter-spacing:0.04em;
                  color:{t.muted};">
        <span>Source: Zillow Observed Rent Index, Jan 2025</span>
        <span>Note: Metros ordered by 12-month change. n=50.</span>
      </div>
    </div>"""
    return "10-news-data-journalism", body


def slide_11_magazine_cover() -> tuple[str, str]:
    """Magazine cover: oversize Bebas Neue display, hot pink + black."""
    t = THEMES["magazine"]
    body = f"""<div class="slide" style="padding:0; background:{t.accent};">
      <!-- masthead -->
      <div style="position:absolute; top:36px; left:48px; right:48px;
                  display:flex; justify-content:space-between; align-items:flex-end;
                  border-bottom:2px solid {t.fg}; padding-bottom:14px;">
        <div style="font-family:{t.fonts['display']}; font-size:64px; line-height:0.86;
                    letter-spacing:0.02em; color:{t.fg};">PITCH</div>
        <div style="font-family:{t.fonts['body']}; font-style:italic; font-size:14px;
                    color:{t.fg};">Issue No. 04 · Spring 2026 · $14</div>
      </div>

      <!-- diagonal photo block -->
      <div style="position:absolute; top:130px; right:48px; width:520px; height:520px;
                  background: linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 60%,#3a3a3a 100%);
                  border:2px solid {t.fg};">
        <div style="position:absolute; inset:0;
                    background:radial-gradient(circle at 30% 35%, rgba(255,255,255,0.12) 0%,
                               transparent 55%);"></div>
        <div style="position:absolute; bottom:24px; left:24px; right:24px;
                    color:#fff; font-family:{t.fonts['display']};
                    font-size:36px; line-height:0.95;">A NEW<br/>EDITORIAL ENGINE</div>
      </div>

      <!-- huge headline -->
      <div style="position:absolute; top:170px; left:48px; max-width:680px;">
        <div style="font-family:{t.fonts['body']}; font-style:italic; font-size:18px;
                    color:{t.fg}; margin-bottom:16px;">The cover story</div>
        <h1 data-pptx-role="title"
            style="margin:0; font-family:{t.fonts['display']};
                   font-size:184px; line-height:0.84; letter-spacing:-0.02em;
                   color:{t.fg};">
          DESIGNED<br/>FOR<br/><span style="color:{t.surface};
                                            background:{t.fg}; padding:0 16px;">EDITORS</span>
        </h1>
      </div>

      <!-- footer dek -->
      <div style="position:absolute; bottom:48px; left:48px; right:48px;
                  display:flex; gap:32px; align-items:flex-end;
                  border-top:2px solid {t.fg}; padding-top:14px;
                  font-family:{t.fonts['serif']}; color:{t.fg};">
        <div style="flex:1; font-size:14px; line-height:1.45;">
          Inside: how slidify rewrote the rules of editable presentations,
          why every shape matters, and the case for typographic restraint.
        </div>
        <div style="font-family:{t.fonts['display']}; font-size:24px; line-height:0.9;">
          PP / 04
        </div>
      </div>
    </div>"""
    return "11-magazine-cover", body


def slide_12_magazine_spread() -> tuple[str, str]:
    """Magazine 60/40 spread: photo block + body column with drop cap."""
    t = THEMES["magazine"]
    body = f"""<div class="slide" style="padding:0; background:{t.surface};">
      <!-- left photo column -->
      <div style="position:absolute; left:0; top:0; width:48%; height:100%;
                  background: linear-gradient(160deg,#0a0a0a 0%,#1a1a1a 50%,#3a1a2a 100%);
                  border-right:2px solid {t.fg};">
        <div style="position:absolute; inset:0;
                    background:radial-gradient(ellipse at 30% 30%,
                              rgba(225,29,72,0.30) 0%, transparent 60%);"></div>
        <div style="position:absolute; left:32px; top:32px;
                    font-family:{t.fonts['body']}; font-style:italic;
                    color:{t.surface}; font-size:13px; letter-spacing:0.16em;">
          Photograph by — Studio Anonymous
        </div>
        <div style="position:absolute; left:32px; bottom:32px; right:32px;">
          <div style="font-family:{t.fonts['display']}; font-size:108px;
                      line-height:0.84; color:{t.surface};">EDITORIAL<br/>FEATURE</div>
          <div style="margin-top:14px; height:2px; width:64px; background:{t.accent};"></div>
        </div>
      </div>

      <!-- right body column -->
      <div style="position:absolute; right:0; top:0; width:52%; height:100%;
                  padding:64px 56px 56px;">
        <div style="font-family:{t.fonts['body']}; font-style:italic; font-size:13px;
                    letter-spacing:0.18em; text-transform:uppercase; color:{t.accent};
                    font-weight:700;">Pages 24 — 31</div>
        <h2 style="margin:18px 0 24px; font-family:{t.fonts['display']};
                   font-size:56px; line-height:0.9; letter-spacing:0.005em;
                   color:{t.fg};">A QUIET REVOLUTION<br/>IN PRESENTATION</h2>
        <div style="height:2px; width:48px; background:{t.fg}; margin-bottom:24px;"></div>
        <p style="margin:0 0 16px; font-family:{t.fonts['serif']}; font-size:17px;
                  line-height:1.55; color:{t.fg}; column-count:2; column-gap:32px;">
          <span style="float:left; font-family:{t.fonts['display']};
                       font-size:96px; line-height:0.78; padding:6px 12px 0 0;
                       color:{t.accent};">F</span>
          or three decades, software treated slides as flat, lossy artifacts —
          captured screenshots of design intent, never the intent itself.
          Slidify is a deliberate departure: every shape, gradient, shadow, and
          glyph survives the export. What looked like a screenshot is now a
          first-class object. The deck you compile in the morning becomes the
          deck a colleague edits in the afternoon, and the difference between
          raster and editable is no longer a tax you pay at the door.
        </p>
        <div style="margin-top:24px; display:flex; gap:14px; align-items:center;
                    font-family:{t.fonts['body']}; font-size:12px; color:{t.muted};">
          <span style="font-weight:700; color:{t.fg};">A. KAPLAN</span>
          <span>·</span><span>4,200 words</span>
          <span>·</span><span>continued page 28</span>
        </div>
      </div>
    </div>"""
    return "12-magazine-spread", body


def slide_13_product_spec() -> tuple[str, str]:
    """Mono-spec product spec sheet: typewriter table + dimensioned diagram."""
    t = THEMES["mono-spec"]
    rows = [
        ("MASS",          "1.84 kg",   "± 0.02"),
        ("MAX TORQUE",    "240 Nm",    "@ 4200 rpm"),
        ("DRIVETRAIN",    "DUAL-AXIS", "tier-0"),
        ("THERMAL BAND",  "−40 → 95°C", "rated"),
        ("CYCLE LIFE",    "12,500 h",  "MTBF"),
        ("ENERGY DRAW",   "18.4 W",    "nominal"),
        ("PROTOCOL",      "rs-485",    "9600/8N1"),
    ]
    rows_html = "".join(
        f'<tr style="border-bottom:1px solid {t.border};">'
        f'<td style="padding:10px 0; color:{t.muted};">{k}</td>'
        f'<td style="padding:10px 0; font-weight:700; color:{t.fg};">{v}</td>'
        f'<td style="padding:10px 0; text-align:right; color:{t.accent};">{n}</td>'
        f'</tr>'
        for k, v, n in rows
    )
    body = f"""<div class="slide" style="padding:48px 56px;
                                          font-family:{t.fonts['mono']};">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;
                  border-bottom:1px solid {t.border}; padding-bottom:12px;">
        <div>
          <div style="font-size:11px; letter-spacing:0.32em; color:{t.muted};">
            DOC · 2026.04.21 · REV-C</div>
          <div style="margin-top:6px; font-size:24px; font-weight:700;
                      letter-spacing:-0.005em; color:{t.fg};">SLIDIFY-EXEC // SPEC SHEET</div>
        </div>
        <div style="font-size:11px; text-align:right; color:{t.muted};
                    line-height:1.6;">
          <div>part : SDX-V2-EXEC</div>
          <div>maint: pixelpitch.dev/spec</div>
          <div>cls  : <span style="color:{t.accent};">production</span></div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1.1fr 1fr; gap:40px; margin-top:28px;">
        <!-- left: spec table -->
        <div>
          <div style="font-size:11px; letter-spacing:0.32em; color:{t.accent};
                      margin-bottom:10px;">§ 01 · NOMINAL VALUES</div>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            {rows_html}
          </table>
          <div style="margin-top:24px; padding:14px; border:1px dashed {t.border};
                      font-size:12px; color:{t.muted}; line-height:1.55;">
            <span style="color:{t.warn};">NOTE</span> · Values are derived from a
            full-load 28-day soak. Re-validate on stack rotation.
          </div>
        </div>

        <!-- right: schematic -->
        <div>
          <div style="font-size:11px; letter-spacing:0.32em; color:{t.accent};
                      margin-bottom:10px;">§ 02 · DIMENSIONED PROFILE</div>
          <svg viewBox="0 0 360 320" width="100%" height="320"
               style="border:1px solid {t.border};">
            <!-- main body -->
            <rect x="60" y="80" width="240" height="160" fill="none"
                  stroke="{t.fg}" stroke-width="1.5"/>
            <!-- chamber -->
            <rect x="100" y="120" width="160" height="80" fill="none"
                  stroke="{t.accent}" stroke-width="1" stroke-dasharray="4 3"/>
            <!-- ports -->
            <circle cx="100" cy="160" r="6" fill="{t.accent}"/>
            <circle cx="260" cy="160" r="6" fill="{t.accent}"/>
            <!-- horizontal dimension -->
            <line x1="60" y1="60" x2="300" y2="60" stroke="{t.muted}" stroke-width="0.8"/>
            <line x1="60" y1="55" x2="60" y2="65" stroke="{t.muted}"/>
            <line x1="300" y1="55" x2="300" y2="65" stroke="{t.muted}"/>
            <text x="180" y="52" font-family="{t.fonts['mono']}" font-size="11"
                  fill="{t.fg}" text-anchor="middle">240 mm</text>
            <!-- vertical dimension -->
            <line x1="320" y1="80" x2="320" y2="240" stroke="{t.muted}" stroke-width="0.8"/>
            <line x1="315" y1="80" x2="325" y2="80" stroke="{t.muted}"/>
            <line x1="315" y1="240" x2="325" y2="240" stroke="{t.muted}"/>
            <text x="335" y="164" font-family="{t.fonts['mono']}" font-size="11"
                  fill="{t.fg}">160</text>
            <!-- label -->
            <text x="180" y="280" font-family="{t.fonts['mono']}" font-size="10"
                  fill="{t.muted}" text-anchor="middle">FIG-A · TOP VIEW · 1:2</text>
          </svg>
        </div>
      </div>

      <div style="margin-top:28px; display:flex; justify-content:space-between;
                  font-size:10px; letter-spacing:0.18em; color:{t.muted};
                  border-top:1px solid {t.border}; padding-top:10px;">
        <span>PIXELPITCH ENG · INTERNAL DISTRIBUTION</span>
        <span>SHEET 13 / 24</span>
      </div>
    </div>"""
    return "13-product-spec", body


def slide_14_brutalist_manifesto() -> tuple[str, str]:
    """Brutalist manifesto: neon yellow page, hard 2px borders, block sans."""
    t = THEMES["brutalist"]
    tenets = [
        ("01", "EVERY SHAPE IS EDITABLE.",
         "The PPTX you ship is the artifact someone else will edit. No rasters, no apologies."),
        ("02", "TYPE IS A FIRST-CLASS CITIZEN.",
         "Glyphs survive the export with their tracking, leading, and weight intact. We do not flatten."),
        ("03", "GRADIENTS ARE NATIVE.",
         "Linear and radial fills emit as <a:gradFill>. PowerPoint colour-pickers stay accurate."),
        ("04", "LLM-LEGIBLE BY CONSTRUCTION.",
         "A pre-flight checker tells the model what works before the conversion runs. No surprises."),
    ]
    rows = "".join(
        f'<div style="display:grid; grid-template-columns:120px 1fr 1.4fr; gap:32px;'
        f' align-items:start; padding:18px 0; border-top:2px solid {t.fg};">'
        f'<div style="font-family:{t.fonts["display"]}; font-size:64px; line-height:0.8;'
        f' font-weight:900;">{n}</div>'
        f'<div style="font-family:{t.fonts["display"]}; font-size:24px;'
        f' line-height:1.05; font-weight:900; letter-spacing:-0.005em;'
        f' text-transform:uppercase;">{title}</div>'
        f'<div style="font-family:{t.fonts["body"]}; font-size:15px; line-height:1.5;'
        f' color:{t.fg};">{body}</div>'
        f'</div>'
        for n, title, body in tenets
    )
    body = f"""<div class="slide" style="padding:48px 56px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="font-family:{t.fonts['display']}; font-size:148px; line-height:0.82;
                    font-weight:900; letter-spacing:-0.03em;">MANI<br/>FESTO</div>
        <div style="text-align:right; max-width:300px;">
          <div style="font-family:{t.fonts['mono']}; font-size:11px; letter-spacing:0.18em;
                      text-transform:uppercase; padding:6px 10px;
                      background:{t.fg}; color:{t.bg}; display:inline-block;">
            v0.1 · APR 2026</div>
          <div style="margin-top:14px; font-family:{t.fonts['body']}; font-size:14px;
                      line-height:1.45;">Four tenets we will not negotiate.
            Pin this above your desk.</div>
        </div>
      </div>
      <div style="margin-top:24px; border-bottom:2px solid {t.fg};">
        {rows}
      </div>
      <div style="margin-top:18px; display:flex; justify-content:space-between;
                  font-family:{t.fonts['mono']}; font-size:11px; letter-spacing:0.18em;">
        <span>SLIDIFY · OPEN MANIFESTO</span>
        <span>SIGN AT pixelpitch.dev/manifesto</span>
      </div>
    </div>"""
    return "14-brutalist-manifesto", body


def slide_15_comparison_vs() -> tuple[str, str]:
    """Paper-theme us-vs-them: two columns of feature checks."""
    t = THEMES["paper"]
    them = [
        ("Slides ship as screenshots",        False),
        ("Gradients flatten on export",       False),
        ("Type loses tracking + leading",     False),
        ("No round-trip back to source",      False),
        ("LLM has to guess what works",       False),
    ]
    us = [
        ("Every shape is editable PPTX",      True),
        ("Native <a:gradFill> on export",     True),
        ("Glyph metrics survive end-to-end",  True),
        ("Edits in PPTX trace to recipes",    True),
        ("`slidify check` blocks bad HTML",   True),
    ]
    def col(title, sub, items, accent_col, ribbon):
        rows = "".join(
            f'<li style="display:flex; gap:14px; padding:12px 0;'
            f' border-bottom:1px solid {t.border}; font-size:15px; line-height:1.45;">'
            f'<span style="flex:0 0 20px; font-weight:800; color:{accent_col};">'
            f'{"✓" if ok else "✕"}</span>'
            f'<span>{txt}</span></li>'
            for txt, ok in items
        )
        return (
            f'<div style="border:1px solid {t.border}; padding:32px 28px;'
            f' background:{t.surface}; border-radius:{t.radius}px;">'
            f'<div style="display:inline-block; padding:4px 10px; font-size:11px;'
            f' letter-spacing:0.22em; text-transform:uppercase; font-weight:700;'
            f' background:{accent_col}; color:{t.surface};">{ribbon}</div>'
            f'<h3 style="margin:14px 0 4px; font-family:{t.fonts["display"]};'
            f' font-size:32px; font-weight:700; letter-spacing:-0.012em;">{title}</h3>'
            f'<p style="margin:0 0 16px; font-size:13px; color:{t.muted};">{sub}</p>'
            f'<ul style="margin:0; padding:0; list-style:none;">{rows}</ul></div>'
        )
    body = f"""<div class="slide" style="padding:64px 88px;">
      <div data-atom="type.eyebrow-ruled"
           style="font-family:{t.fonts['body']}; font-size:11px; letter-spacing:0.32em;
                  text-transform:uppercase; font-weight:700; color:{t.accent};">
        How we differ</div>
      <h1 style="margin:14px 0 6px; font-family:{t.fonts['display']};
                 font-size:54px; line-height:1.05; letter-spacing:-0.012em;
                 font-weight:700;">
        Editable, not photographable.
      </h1>
      <p style="margin:0 0 36px; max-width:700px; color:{t.muted};
                font-size:16px; line-height:1.5;">
        The standard HTML→slide tool flattens design intent. Slidify preserves it.
      </p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
        {col("The screenshot tools", "The status quo since 2014.", them, "#6b7280", "Them")}
        {col("Slidify",  "What you get when shapes are first-class.", us,   t.accent,  "Us")}
      </div>
      <div style="margin-top:24px; font-size:11px; color:{t.muted};
                  font-family:{t.fonts['mono']}; letter-spacing:0.06em;">
        Comparison table compiled Apr 2026 — verified against 12 production decks.
      </div>
    </div>"""
    return "15-comparison-vs", body


def slide_16_duotone_photo_essay() -> tuple[str, str]:
    """Duotone photo with caption block: navy + cream gradient backdrop, serif pull-quote."""
    t = THEMES["duotone"]
    body = f"""<div class="slide" style="padding:0;
                                          background:linear-gradient(135deg,#0d1f3c 0%,#23456b 60%,#3a6a8a 100%);">
      <!-- duotone wash -->
      <div style="position:absolute; inset:0;
                  background:radial-gradient(ellipse 1100px 720px at 30% 30%,
                            rgba(255,236,196,0.30) 0%, transparent 60%);"></div>
      <!-- subject silhouette via SVG -->
      <svg viewBox="0 0 1280 720" width="1280" height="720"
           style="position:absolute; inset:0;">
        <defs>
          <linearGradient id="duo-fig" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="#ffecc4" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#ff7a59" stop-opacity="0.7"/>
          </linearGradient>
        </defs>
        <ellipse cx="320" cy="380" rx="180" ry="220" fill="url(#duo-fig)"/>
        <ellipse cx="320" cy="200" rx="80"  ry="92"  fill="url(#duo-fig)"/>
        <ellipse cx="900" cy="500" rx="240" ry="120" fill="rgba(255,122,89,0.25)"/>
      </svg>

      <!-- left strip caption -->
      <div style="position:absolute; left:48px; top:48px; width:280px;
                  border-left:2px solid {t.fg}; padding:8px 0 8px 14px;
                  font-family:{t.fonts['body']}; font-size:13px;
                  letter-spacing:0.18em; text-transform:uppercase;
                  color:{t.fg}; font-weight:600;">
        Photo essay · part iii<br/>
        <span style="font-style:italic; text-transform:none;
                     letter-spacing:0.02em; color:{t.muted};">
          Light over the editing room</span>
      </div>

      <!-- pull quote -->
      <div style="position:absolute; left:560px; top:100px; right:80px;">
        <div style="font-family:{t.fonts['serif']}; font-style:italic;
                    font-size:62px; line-height:1.08; color:{t.fg};
                    letter-spacing:-0.005em;">
          The slides we ship are<br/>
          <span style="background:{t.accent}; color:#0d1f3c; padding:0 12px;">
            an act of editing,</span><br/>
          not an accident<br/>of capture.
        </div>
        <div style="margin-top:32px; padding-left:18px;
                    border-left:2px solid {t.accent}; max-width:520px;
                    font-family:{t.fonts['body']}; font-size:14px;
                    line-height:1.5; color:{t.muted};">
          Slidify treats every shape as a curated object. The export is
          the artifact, not a flattened souvenir of one.
        </div>
      </div>

      <!-- footer -->
      <div style="position:absolute; bottom:32px; left:48px; right:48px;
                  display:flex; justify-content:space-between; align-items:center;
                  font-family:{t.fonts['body']}; font-size:11px;
                  letter-spacing:0.18em; text-transform:uppercase;
                  color:{t.fg}; border-top:1px solid {t.border}; padding-top:14px;">
        <span>Pitch Quarterly · Spring 2026</span>
        <span>Plate 16 of 24</span>
      </div>
    </div>"""
    return "16-duotone-photo-essay", body


def slide_17_research_figure() -> tuple[str, str]:
    """Paper-theme academic figure: Figure 4 with caption + footnotes."""
    t = THEMES["paper"]
    body = f"""<div class="slide" style="padding:48px 72px;
                                          background:{t.surface};">
      <!-- running header -->
      <div style="display:flex; justify-content:space-between;
                  font-family:{t.fonts['mono']}; font-size:10px;
                  letter-spacing:0.18em; text-transform:uppercase;
                  color:{t.muted}; border-bottom:1px solid {t.border};
                  padding-bottom:8px;">
        <span>Slidify et al. · §4 — Conversion fidelity</span>
        <span>Preprint, draft Apr 2026</span>
      </div>

      <h2 style="margin:18px 0 6px; font-family:{t.fonts['display']};
                 font-size:32px; font-weight:700; letter-spacing:-0.005em;
                 color:{t.fg};">
        Figure 4 — Native-area ratio across the four-tier matcher.
      </h2>
      <p style="margin:0 0 20px; max-width:880px; font-size:14px;
                line-height:1.55; color:{t.muted};">
        Each bar shows the median fraction of slide area emitted as native
        PPTX primitives, by matcher tier. n = 1284 conversions over a 28-day
        window. Whiskers indicate the inter-quartile range.
      </p>

      <!-- the figure -->
      <div style="border:1px solid {t.border}; padding:24px 28px;
                  background:{t.surface_alt};">
        <svg viewBox="0 0 760 280" width="100%" height="280">
          <!-- y axis -->
          <line x1="64" y1="20" x2="64" y2="240" stroke="#111" stroke-width="1"/>
          <line x1="64" y1="240" x2="720" y2="240" stroke="#111" stroke-width="1"/>
          {"".join(
              f'<line x1="60" y1="{240 - g*40}" x2="64" y2="{240 - g*40}" stroke="#111"/>'
              f'<text x="50" y="{244 - g*40}" font-size="10" '
              f'font-family="{t.fonts["mono"]}" fill="{t.fg}" text-anchor="end">'
              f'{g*20}</text>'
              for g in (0,1,2,3,4,5)
          )}
          <!-- bars -->
          {"".join(
              f'<rect x="{120 + i*150}" y="{240 - h}" width="80" height="{h}" '
              f'fill="{c}" stroke="#111" stroke-width="1"/>'
              f'<line x1="{160 + i*150}" y1="{240 - h - w}" x2="{160 + i*150}" '
              f'y2="{240 - h + w}" stroke="#111" stroke-width="1"/>'
              f'<text x="{160 + i*150}" y="{260}" font-size="11" '
              f'font-family="{t.fonts["mono"]}" fill="#111" text-anchor="middle">'
              f'tier-{i}</text>'
              for i, (h, c, w) in enumerate([
                (180, "#dcdada", 22),
                (164, "#bababa", 26),
                (118, "#9a9a9a", 18),
                ( 32, "#7a7a7a", 12),
              ])
          )}
          <!-- caption above figure -->
          <text x="64" y="14" font-size="10" font-family="{t.fonts['mono']}"
                fill="{t.muted}">native area, % of slide</text>
        </svg>
      </div>

      <!-- caption -->
      <div style="margin-top:14px; font-family:{t.fonts['serif']};
                  font-size:13px; line-height:1.55; color:{t.fg};">
        <strong>Figure 4.</strong> Tier-0 (atoms) carries the conversion. The
        long tail at tier-3 (LLM oracle) is a 3.2% residual; the bulk lands
        through tier-0 and tier-1 patterns. Trend is consistent across the
        seven shipped theme presets <span style="color:{t.muted};">[a]</span>.
      </div>

      <div style="margin-top:14px; padding-top:10px; border-top:1px dashed {t.border};
                  font-family:{t.fonts['mono']}; font-size:10px; color:{t.muted};
                  letter-spacing:0.04em;">
        [a] vercel-dark, linear-light, stripe, paper, retro, brutalist, editorial<br/>
        [b] Source data archived at pixelpitch.dev/figures/04 — DOI 10.0000/slidify.4
      </div>
    </div>"""
    return "17-research-figure", body


def slide_18_timeline_history() -> tuple[str, str]:
    """Mono-spec horizontal timeline of slide-software since 1990."""
    t = THEMES["mono-spec"]
    events = [
        ("1990", "PowerPoint 2.0",        "First true WYSIWYG slide editor on Mac."),
        ("2003", "Keynote",               "Apple's response: gradients, drop shadows, smooth typography."),
        ("2010", "Reveal.js / Prezi",     "HTML eats the slide format. Editing returns to designers."),
        ("2018", "Figma slides",          "Web-native canvas. Real-time collaboration, but exports flatten."),
        ("2024", "LLM-authored decks",    "Models can author HTML — but conversion to PPTX is still lossy."),
        ("2026", "slidify",               "Native shapes round-trip: design intent survives the export."),
    ]
    cells = "".join(
        f'<div style="position:relative; flex:1; padding:0 6px;">'
        f'<div style="font-family:{t.fonts["mono"]}; font-size:24px; font-weight:700;'
        f' color:{t.accent if i == len(events)-1 else t.fg};">{year}</div>'
        f'<div style="margin-top:2px; font-size:13px; font-weight:700; color:{t.fg};">'
        f'{title}</div>'
        f'<p style="margin:6px 0 0; font-size:11px; line-height:1.45; color:{t.muted};">'
        f'{copy}</p>'
        f'</div>'
        for i, (year, title, copy) in enumerate(events)
    )
    dots = "".join(
        f'<div style="width:14px; height:14px; border-radius:50%;'
        f' background:{t.accent if i == len(events)-1 else t.fg};'
        f' border:2px solid {t.bg}; box-shadow:0 0 0 1px {t.border};"></div>'
        for i in range(len(events))
    )
    body = f"""<div class="slide" style="padding:64px 72px;
                                          font-family:{t.fonts['body']};">
      <div style="font-size:11px; letter-spacing:0.32em; text-transform:uppercase;
                  color:{t.accent};">§ history</div>
      <h1 style="margin:14px 0 8px; font-family:{t.fonts['display']};
                 font-size:44px; font-weight:700; letter-spacing:-0.005em;
                 color:{t.fg};">
        Thirty-six years of slide software.
      </h1>
      <p style="margin:0 0 56px; max-width:820px; color:{t.muted};
                font-size:14px; line-height:1.55;">
        Every era added one capability the previous one couldn't survive.
        Slidify is the era where editability stops being lossy.
      </p>

      <!-- timeline rail -->
      <div style="position:relative; padding-bottom:140px;">
        <div style="position:absolute; left:0; right:0; top:6px; height:2px;
                    background:{t.border};"></div>
        <div style="position:absolute; left:0; top:0; right:0; display:flex;
                    justify-content:space-between; padding:0 6px;">{dots}</div>
        <div style="position:absolute; top:34px; left:0; right:0; display:flex;">
          {cells}
        </div>
      </div>

      <div style="margin-top:24px; display:flex; justify-content:space-between;
                  font-size:10px; letter-spacing:0.18em; color:{t.muted};">
        <span>SOURCE · pixelpitch.dev/timeline</span>
        <span>FIG-T · 36-YR SLICE</span>
      </div>
    </div>"""
    return "18-timeline-history", body


def slide_19_brutalist_stat_wall() -> tuple[str, str]:
    """Brutalist stat wall: oversized numerals on neon-yellow grid."""
    t = THEMES["brutalist"]
    stats = [
        ("87",   "%", "of slide area emits as editable PPTX primitives."),
        ("0.12", "%", "average drift per slide vs. the source HTML."),
        ("155",  "",  "atomic recipes shipped in atoms.yaml."),
        ("28",   "s", "median end-to-end conversion for a 12-slide deck."),
    ]
    def cell(i, n, unit, copy):
        border_top = f"4px solid {t.fg}" if i < 2 else "0"
        border_bottom = f"4px solid {t.fg}" if i >= 2 else "0"
        border_left = f"4px solid {t.fg}" if i % 2 == 1 else "0"
        return (
            f'<div style="padding:32px 28px; border-top:{border_top};'
            f' border-left:{border_left}; border-bottom:{border_bottom};">'
            f'<div style="font-family:{t.fonts["display"]}; font-size:200px;'
            f' line-height:0.82; font-weight:900; letter-spacing:-0.04em;">'
            f'{n}<span style="font-size:80px; vertical-align:super;">{unit}</span></div>'
            f'<p style="margin:8px 0 0; font-family:{t.fonts["body"]};'
            f' font-size:16px; font-weight:600; line-height:1.35; max-width:320px;">'
            f'{copy}</p></div>'
        )
    cells = "".join(cell(i, n, u, c) for i, (n, u, c) in enumerate(stats))
    body = f"""<div class="slide" style="padding:0;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end;
                  padding:28px 36px; border-bottom:4px solid {t.fg};">
        <div style="font-family:{t.fonts['display']}; font-size:84px;
                    font-weight:900; line-height:0.82; letter-spacing:-0.02em;">
          BY THE<br/>NUMBERS</div>
        <div style="text-align:right; font-family:{t.fonts['mono']};
                    font-size:11px; letter-spacing:0.18em; text-transform:uppercase;">
          internal · q1 2026<br/>
          <span style="font-weight:700;">N = 1,284 conversions</span>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr;">
        {cells}
      </div>
      <div style="padding:14px 36px; font-family:{t.fonts['mono']};
                  font-size:11px; letter-spacing:0.18em; text-transform:uppercase;
                  display:flex; justify-content:space-between;">
        <span>slidify telemetry</span>
        <span>see appendix · table 7</span>
      </div>
    </div>"""
    return "19-brutalist-stat-wall", body


def slide_20_ranking_leaderboard() -> tuple[str, str]:
    """Paper-theme leaderboard: ranking table with bar-style native_ratio cell."""
    t = THEMES["paper"]
    rows = [
        (1, "slidify",          "0.872", "Native PPTX shapes",   True),
        (2, "PitchCompiler",    "0.781", "Hybrid raster+native", False),
        (3, "DeckRender",       "0.654", "Native + screenshot",  False),
        (4, "HTML2Slides",      "0.512", "Mostly screenshot",    False),
        (5, "Tailwind→PPTX",    "0.408", "All raster",           False),
        (6, "PaperPress",       "0.296", "Image only",           False),
    ]
    def bar(value: float, highlight: bool) -> str:
        pct = value * 100
        col = t.accent if highlight else "#9a9a9a"
        return (
            f'<div style="position:relative; width:200px; height:10px;'
            f' background:{t.border}; border-radius:2px;">'
            f'<div style="position:absolute; left:0; top:0; bottom:0;'
            f' width:{pct:.1f}%; background:{col}; border-radius:2px;"></div>'
            f'</div>'
        )
    leader_badge = (
        f'<span style="display:inline-block; padding:2px 8px; margin-left:8px;'
        f' font-size:10px; letter-spacing:0.18em; text-transform:uppercase;'
        f' background:{t.accent}; color:{t.surface};">leader</span>'
    )
    fonts_display = t.fonts["display"]
    fonts_mono = t.fonts["mono"]
    def _row(rk: int, name: str, score: str, notes: str, hl: bool) -> str:
        bg = "background:rgba(185,28,28,0.04);" if hl else ""
        rk_color = t.accent if hl else t.fg
        badge_html = leader_badge if hl else ""
        return (
            f'<tr style="border-bottom:1px solid {t.border}; {bg}">'
            f'<td style="padding:14px 12px; font-family:{fonts_display};'
            f' font-size:24px; font-weight:700; color:{rk_color};'
            f' width:48px;">{rk}</td>'
            f'<td style="padding:14px 12px; font-size:18px; font-weight:600;">'
            f'{name}{badge_html}</td>'
            f'<td style="padding:14px 12px; color:{t.muted}; font-size:13px;">{notes}</td>'
            f'<td style="padding:14px 12px;">{bar(float(score), hl)}</td>'
            f'<td style="padding:14px 12px; font-family:{fonts_mono};'
            f' font-size:13px; text-align:right; font-weight:700; color:{t.fg};'
            f' width:80px;">{score}</td>'
            f'</tr>'
        )
    rows_html = "".join(_row(*r) for r in rows)
    body = f"""<div class="slide" style="padding:56px 80px;">
      <div data-atom="type.eyebrow-ruled"
           style="font-family:{t.fonts['body']}; font-size:11px;
                  letter-spacing:0.32em; text-transform:uppercase;
                  font-weight:700; color:{t.accent};">
        Bench · Q1 2026</div>
      <h1 style="margin:14px 0 6px; font-family:{t.fonts['display']};
                 font-size:48px; line-height:1.05; letter-spacing:-0.012em;
                 font-weight:700;">
        Native-area ratio, six tools compared.
      </h1>
      <p style="margin:0 0 32px; max-width:760px; color:{t.muted};
                font-size:15px; line-height:1.5;">
        Higher is better — fraction of slide area that survives the export
        as editable PPTX primitives. Identical input deck, all defaults.
      </p>
      <table style="width:100%; border-collapse:collapse;
                    border-top:2px solid {t.fg};">
        <thead>
          <tr style="border-bottom:1px solid {t.fg};">
            <th style="padding:10px 12px; text-align:left;
                       font-family:{t.fonts['mono']}; font-size:10px;
                       letter-spacing:0.18em; color:{t.muted};">RK</th>
            <th style="padding:10px 12px; text-align:left;
                       font-family:{t.fonts['mono']}; font-size:10px;
                       letter-spacing:0.18em; color:{t.muted};">TOOL</th>
            <th style="padding:10px 12px; text-align:left;
                       font-family:{t.fonts['mono']}; font-size:10px;
                       letter-spacing:0.18em; color:{t.muted};">METHOD</th>
            <th style="padding:10px 12px; text-align:left;
                       font-family:{t.fonts['mono']}; font-size:10px;
                       letter-spacing:0.18em; color:{t.muted};">RATIO</th>
            <th style="padding:10px 12px; text-align:right;
                       font-family:{t.fonts['mono']}; font-size:10px;
                       letter-spacing:0.18em; color:{t.muted};">SCORE</th>
          </tr>
        </thead>
        <tbody>{rows_html}</tbody>
      </table>
      <div style="margin-top:18px; display:flex; justify-content:space-between;
                  font-family:{t.fonts['mono']}; font-size:10px;
                  letter-spacing:0.06em; color:{t.muted};">
        <span>method: identical 12-slide deck, public benchmark, n = 50 trials</span>
        <span>raw: pixelpitch.dev/bench/q1-2026.json</span>
      </div>
    </div>"""
    return "20-ranking-leaderboard", body


def slide_21_lucide_feature_grid() -> tuple[str, str]:
    """Vercel-dark feature grid driven by lucide icons.

    Six feature tiles, each with a lucide icon at 32px, a tagline, and
    a one-line copy. Plus a top nav strip with five icons exercising
    the lucide subset end-to-end. This slide is the integration test
    for the icon converter path.
    """
    t = THEMES["vercel-dark"]
    features = [
        ("zap",         "Sub-second compile",  "Median 280 ms / slide on a 12-deck batch."),
        ("shield",      "PPTX-safe by default","Every shape carries a recipe id; no rasters."),
        ("trending-up", "Native_ratio 87%",    "Up from 58% in the v0.1 baseline."),
        ("sparkles",    "LLM-friendly",        "`slidify check` blocks bad HTML pre-convert."),
        ("globe",       "Six theme registers", "Vercel-dark, paper, magazine, brutalist…"),
        ("rocket",      "Round-trippable",     "Edits in PPT trace back to recipe ids."),
    ]
    def tile(icon, title, copy):
        icon_svg = lucide(icon, size=28, stroke=1.8, color=t.accent)
        return (
            f'<div data-atom="surf.card-flat" '
            f'style="padding:24px; background:{t.surface}; '
            f'border:1px solid {t.border}; border-radius:14px;">'
            f'<div style="width:56px; height:56px; border-radius:12px; '
            f'background:rgba(167,139,250,0.12); display:flex; '
            f'align-items:center; justify-content:center; margin-bottom:18px;">'
            f'{icon_svg}</div>'
            f'<h3 style="margin:0 0 6px; font-size:18px; font-weight:700; '
            f'color:{t.fg};">{title}</h3>'
            f'<p style="margin:0; color:{t.muted}; font-size:13.5px; '
            f'line-height:1.5;">{copy}</p></div>'
        )
    nav_icons = ["github", "globe", "sparkles", "user", "arrow-up-right"]
    nav_html = "".join(
        f'<div style="width:36px; height:36px; border-radius:9px; '
        f'border:1px solid {t.border}; display:flex; align-items:center; '
        f'justify-content:center; color:{t.fg};">{lucide(n, size=18)}</div>'
        for n in nav_icons
    )
    body = f"""<div class="slide">
      <!-- top nav -->
      <div style="display:flex; justify-content:space-between; align-items:center;
                  margin-bottom:48px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:36px; height:36px; border-radius:10px;
                      background:{t.accent_grad};"></div>
          <div style="font-size:18px; font-weight:700;">slidify</div>
          <span style="margin-left:8px; padding:3px 8px; border-radius:6px;
                       background:rgba(255,255,255,0.06); font-size:11px;
                       color:{t.muted}; letter-spacing:0.08em;">
            v1.0 · ICONS</span>
        </div>
        <div style="display:flex; gap:10px;">{nav_html}</div>
      </div>

      {kicker('Feature grid · powered by lucide')}
      <h1 style="margin:14px 0 36px; font-size:48px; font-weight:800;
                 letter-spacing:-0.025em;">
        Six reasons icons matter.
      </h1>
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:18px;">
        {''.join(tile(i, t_, c) for i, t_, c in features)}
      </div>
      <div style="margin-top:32px; display:flex; align-items:center; gap:10px;
                  color:{t.muted}; font-size:13px;">
        {lucide('check', size=16, stroke=2.4, color=t.success)}
        <span>All icons inline-SVG · stroke-2 · 24×24 viewBox · ISC-licensed.</span>
      </div>
    </div>"""
    return "21-lucide-feature-grid", body


def slide_22_lucide_dashboard_paper() -> tuple[str, str]:
    """Paper-theme dashboard with lucide icons in tile chrome + sidebar nav."""
    t = THEMES["paper"]
    sidebar_items = [
        ("bar-chart", "Overview",     True),
        ("trending-up", "Trends",     False),
        ("user",      "Audience",     False),
        ("globe",     "Geography",    False),
        ("shield",    "Permissions",  False),
        ("settings",  "Settings",     False),
    ]
    # 'settings' is heavy — use 'lock' instead for confidence
    sidebar_items[5] = ("lock", "Permissions", False)
    sidebar_html = "".join(
        f'<div style="display:flex; align-items:center; gap:12px;'
        f' padding:10px 14px; border-radius:8px;'
        f' {"background:" + t.bg + "; color:" + t.accent + ";" if active else "color:" + t.muted + ";"}'
        f' font-size:14px; font-weight:{600 if active else 500};">'
        f'{lucide(icon, size=18, color=t.accent if active else t.muted)}'
        f'<span>{label}</span></div>'
        for icon, label, active in sidebar_items
    )
    def stat_tile(icon, label, value, delta_icon, delta_text, delta_pos):
        delta_color = "#15803d" if delta_pos else "#b91c1c"
        return (
            f'<div style="padding:20px; background:{t.surface};'
            f' border:1px solid {t.border}; border-radius:8px;">'
            f'<div style="display:flex; justify-content:space-between;'
            f' align-items:flex-start;">'
            f'<div style="width:40px; height:40px; border-radius:8px;'
            f' background:rgba(185,28,28,0.06); display:flex;'
            f' align-items:center; justify-content:center;'
            f' color:{t.accent};">'
            f'{lucide(icon, size=20, color=t.accent)}</div>'
            f'<div style="display:flex; align-items:center; gap:4px;'
            f' color:{delta_color}; font-size:12px; font-weight:600;">'
            f'{lucide(delta_icon, size=14, color=delta_color)}'
            f'<span>{delta_text}</span></div>'
            f'</div>'
            f'<p style="margin:18px 0 4px; font-family:{t.fonts["display"]};'
            f' font-size:36px; font-weight:700;'
            f' letter-spacing:-0.01em; color:{t.fg};">{value}</p>'
            f'<p style="margin:0; font-size:12px; color:{t.muted};'
            f' letter-spacing:0.06em;">{label}</p></div>'
        )
    body = f"""<div class="slide" style="padding:0; display:grid;
                                          grid-template-columns:240px 1fr;">
      <!-- sidebar -->
      <aside style="background:{t.surface_alt};
                    border-right:1px solid {t.border};
                    padding:24px 18px;">
        <div style="display:flex; align-items:center; gap:10px;
                    padding:0 6px 18px; border-bottom:1px solid {t.border};
                    margin-bottom:14px;">
          <div style="width:30px; height:30px; border-radius:8px;
                      background:{t.accent}; display:flex;
                      align-items:center; justify-content:center;
                      color:{t.surface};">
            {lucide('zap', size=16, color=t.surface)}</div>
          <div style="font-family:{t.fonts['display']}; font-size:16px;
                      font-weight:700;">Pitch · Console</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          {sidebar_html}
        </div>
        <div style="margin-top:34px; padding:14px;
                    background:{t.bg}; border:1px solid {t.border};
                    border-radius:8px;">
          <div style="display:flex; align-items:center; gap:8px;
                      font-size:11px; letter-spacing:0.18em;
                      text-transform:uppercase; color:{t.muted};">
            {lucide('sparkles', size=14, color=t.accent)}
            <span>Pro tip</span></div>
          <p style="margin:8px 0 0; font-size:12px; line-height:1.45;
                    color:{t.fg};">Press <kbd style="font-family:{t.fonts['mono']};
            background:{t.surface}; border:1px solid {t.border};
            padding:1px 5px; border-radius:3px;">⌘K</kbd> to open the
            command palette.</p>
        </div>
      </aside>

      <!-- main -->
      <main style="padding:32px 40px;">
        <div style="display:flex; justify-content:space-between;
                    align-items:flex-start;">
          <div>
            <h1 style="margin:0 0 4px; font-family:{t.fonts['display']};
                       font-size:28px; font-weight:700;
                       letter-spacing:-0.012em;">Conversion overview</h1>
            <p style="margin:0; font-size:13px; color:{t.muted};">
              Last 28 days · all decks · production environment.</p>
          </div>
          <div style="display:flex; gap:8px;">
            <div style="display:flex; align-items:center; gap:6px;
                        padding:8px 12px; border:1px solid {t.border};
                        border-radius:6px; font-size:13px; color:{t.fg};">
              {lucide('eye', size=14, color=t.muted)}
              <span>Preview</span></div>
            <div style="display:flex; align-items:center; gap:6px;
                        padding:8px 12px; background:{t.accent};
                        color:{t.surface}; border-radius:6px; font-size:13px;
                        font-weight:600;">
              {lucide('arrow-up-right', size=14, color=t.surface)}
              <span>Export</span></div>
          </div>
        </div>

        <div style="margin-top:24px; display:grid;
                    grid-template-columns:repeat(3,1fr); gap:14px;">
          {stat_tile('bar-chart', 'Decks rendered',  '1,284', 'trending-up', '+18.2%', True)}
          {stat_tile('trending-up','Native ratio',    '87%',  'trending-up', '+4.1pp', True)}
          {stat_tile('shield',    'Drift incidents', '0.12%','arrow-right', '−2.1pp', True)}
        </div>

        <div style="margin-top:18px; padding:18px;
                    background:{t.surface}; border:1px solid {t.border};
                    border-radius:8px;">
          <div style="display:flex; align-items:center; gap:8px;
                      margin-bottom:14px;">
            {lucide('check', size=16, color='#15803d')}
            <span style="font-size:13px; font-weight:700; color:{t.fg};">
              All checks green</span>
            <span style="margin-left:auto; font-family:{t.fonts['mono']};
                         font-size:11px; color:{t.muted};">12s ago</span>
          </div>
          <div style="display:flex; gap:18px; font-size:12px; color:{t.muted};">
            <span>{lucide('check', size=12, color='#15803d')} self-contained</span>
            <span>{lucide('check', size=12, color='#15803d')} no risky CSS</span>
            <span>{lucide('check', size=12, color='#15803d')} 0 warnings</span>
            <span>{lucide('check', size=12, color='#15803d')} 21 / 21 atoms hint</span>
          </div>
        </div>
      </main>
    </div>"""
    return "22-lucide-dashboard-paper", body


SLIDES: list[tuple] = [
    # (fn, theme_name) — the existing nine all run vercel-dark.
    (slide_01_hero,            "vercel-dark"),
    (slide_02_kpi_grid,        "vercel-dark"),
    (slide_03_feature_three_up,"vercel-dark"),
    (slide_04_pricing,         "vercel-dark"),
    (slide_05_dashboard,       "vercel-dark"),
    (slide_06_team,            "vercel-dark"),
    (slide_07_quote,           "vercel-dark"),
    (slide_08_roadmap,         "vercel-dark"),
    (slide_09_closing,         "vercel-dark"),
    (slide_10_news_data_journalism, "paper"),
    (slide_11_magazine_cover,       "magazine"),
    (slide_12_magazine_spread,      "magazine"),
    (slide_13_product_spec,         "mono-spec"),
    (slide_14_brutalist_manifesto,  "brutalist"),
    (slide_15_comparison_vs,        "paper"),
    (slide_16_duotone_photo_essay,  "duotone"),
    (slide_17_research_figure,      "paper"),
    (slide_18_timeline_history,     "mono-spec"),
    (slide_19_brutalist_stat_wall,  "brutalist"),
    (slide_20_ranking_leaderboard,  "paper"),
    (slide_21_lucide_feature_grid,  "vercel-dark"),
    (slide_22_lucide_dashboard_paper,"paper"),
]


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for fn, theme_name in SLIDES:
        theme = THEMES[theme_name]
        stem, body = fn()
        path = OUT_DIR / f"{stem}.html"
        path.write_text(
            _wrap(stem.replace('-', ' ').title(), body, theme),
            encoding="utf-8",
        )
        print(f"  {stem}.html  [{theme_name}]  ({len(body):>5} chars)")
    print(f"wrote {len(SLIDES)} slides to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
