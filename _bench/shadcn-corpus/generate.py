"""Programmatic shadcn / Tailwind slide composer.

Each shadcn primitive is a Python helper that returns an HTML string.
Slides are functions that compose multiple primitives into a real,
dense, designer-grade layout. Output is one self-contained HTML file
per slide — every slide stands alone, no shared dependencies.

Run:
    uv run python _bench/shadcn-corpus/generate.py

Adding a new slide = adding one function in §SLIDES below. Adding a new
primitive = adding one helper in §PRIMITIVES.
"""
from __future__ import annotations

from pathlib import Path
from textwrap import dedent

OUT_DIR = Path(__file__).parent

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


def aurora_bg() -> str:
    return (
        '<div data-atom="bg.aurora-band" style="position:absolute; inset:0; '
        'background: radial-gradient(ellipse 1100px 760px at 80% 12%, '
        '#1e1b4b 0%, #0a0a14 55%, #050510 100%);"></div>'
    )


# ---------------------------------------------------------------------------
# Page wrapper
# ---------------------------------------------------------------------------


_BASE_CSS = dedent("""
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin:0; padding:0; width:1280px; height:720px;
               font-family: Inter, -apple-system, "Segoe UI", Helvetica, sans-serif;
               -webkit-font-smoothing:antialiased; color:#f5f5f7; background:#070710; }
  .slide { position:relative; width:1280px; height:720px; padding:80px;
           overflow:hidden; background:#070710; }
""").strip()


def _wrap(title: str, body: str) -> str:
    return dedent(f"""\
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <title>{title}</title>
    <style>{_BASE_CSS}</style>
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


SLIDES = [
    slide_01_hero,
    slide_02_kpi_grid,
    slide_03_feature_three_up,
    slide_04_pricing,
    slide_05_dashboard,
    slide_06_team,
    slide_07_quote,
    slide_08_roadmap,
    slide_09_closing,
]


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for fn in SLIDES:
        stem, body = fn()
        path = OUT_DIR / f"{stem}.html"
        path.write_text(_wrap(stem.replace('-', ' ').title(), body), encoding="utf-8")
        print(f"  {stem}.html  ({len(body):>5} chars)")
    print(f"wrote {len(SLIDES)} slides to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
