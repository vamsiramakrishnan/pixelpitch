"""Programmatically generate a shadcn / Tailwind corpus of slide HTMLs.

Each entry below is a slide that exercises one shadcn primitive or one
Tailwind composition pattern. The generator emits a self-contained
1280×720 HTML file per pattern. The corpus then drives a benchmark:

  1. `slidify check <slide.html> --json --deep` — every slide should
     return self_contained=true, risky_css=[], native_area_ratio≥0.95.
  2. `slidify <slide.html> <slide.pptx>` — must produce a valid PPTX.
  3. `slidify oracle <slide.html> <slide.pptx>` — visual fidelity check
     (out of scope for the v0 generator; see _bench/shadcn-corpus/run.py
     for the runner that wires it up).

Pattern coverage:

  shadcn primitives (static subset):
    - Card                                 (basic, with header, with footer)
    - Button (variants)
    - Badge / Pill
    - Alert
    - Avatar / AvatarStack
    - Separator
    - Progress (static)
    - Tabs body (selected pane only)
    - Skeleton
    - Toast (static)

  Tailwind compositions:
    - Hero (eyebrow + headline + lede + CTA pill)
    - Three-up feature grid
    - Stat strip (3-up KPI)
    - Pricing 3-tier
    - Testimonial card
    - Agenda (numbered TOC)
    - Timeline (horizontal milestones)

Every slide is annotated with `data-atom="…"` hints where the matcher
has a corresponding native recipe. Atoms used: comp.*, surf.*, type.*,
bg.*, dec.*, ui.*.

Usage:
    uv run python _bench/shadcn-corpus/generate.py
    # writes one .html per pattern under the same directory.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

OUT_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Shared head — Tailwind-equivalent inline CSS. Keeps slides self-contained
# (no external Tailwind CDN). Only the utilities each slide actually uses.
# ---------------------------------------------------------------------------

BASE_CSS = """
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; width: 1280px; height: 720px;
               font-family: Inter, -apple-system, BlinkMacSystemFont,
                            "Segoe UI", Helvetica, Arial, sans-serif;
               -webkit-font-smoothing: antialiased; color: #f5f5f7;
               background: #070710; }
  .slide { position: relative; width: 1280px; height: 720px;
           padding: 80px; overflow: hidden;
           background: #070710; }
  .eyebrow { font-size: 13px; font-weight: 600; letter-spacing: 0.42em;
             text-transform: uppercase; color: #a78bfa; }
  h1 { margin: 0; font-weight: 800; letter-spacing: -0.045em; }
  h2 { margin: 0; font-weight: 700; letter-spacing: -0.02em; }
  p, li { margin: 0; line-height: 1.55; }
  ul { padding: 0; margin: 0; list-style: none; }
"""


def _wrap(title: str, body: str, extra_css: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>{BASE_CSS}{extra_css}</style>
</head>
<body>
{body}
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Slide definitions
# ---------------------------------------------------------------------------


@dataclass
class Slide:
    name: str          # filename (without .html)
    title: str         # <title>
    body: str          # <body> contents — should already include .slide wrapper
    extra_css: str = ""


SLIDES: list[Slide] = []


# ---- shadcn: Card ----------------------------------------------------------

SLIDES.append(Slide(
    name="01-card-basic",
    title="shadcn — Card (basic)",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Card</div>
  <div data-atom="surf.card-flat"
       style="width:480px; padding:24px;
              background:#0e0e1a;
              border:1px solid rgba(255,255,255,0.10);
              border-radius:16px;">
    <h2 style="font-size:22px; margin-bottom:6px">Project Atelier</h2>
    <p style="color:#a1a1aa; font-size:14px;">Foundational UI elements for slidify.</p>
  </div>
</div>""",
))


# ---- shadcn: Card with header + footer -------------------------------------

SLIDES.append(Slide(
    name="02-card-header-footer",
    title="shadcn — Card (header + footer)",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Card with header &amp; footer</div>
  <div data-atom="surf.card-raised"
       style="width:560px; padding:0;
              background:#0e0e1a;
              border:1px solid rgba(255,255,255,0.10);
              border-radius:16px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.08);">
    <div style="padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.08);">
      <h2 style="font-size:18px;">Q2 telemetry</h2>
      <p style="color:#a1a1aa; font-size:13px;">Atoms shipped, recipes generated.</p>
    </div>
    <div style="padding:24px;">
      <p style="font-size:48px; font-weight:800; letter-spacing:-0.02em;">87<span style="color:#a78bfa">%</span></p>
      <p style="color:#a1a1aa; font-size:13px; margin-top:6px;">first-pass native ratio</p>
    </div>
    <div style="padding:14px 24px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
      <span style="color:#71717a; font-size:12px;">Updated 2 min ago</span>
      <span data-atom="anno.callout-pill"
            style="display:inline-flex; align-items:center; gap:6px;
                   padding:4px 10px; border-radius:9999px;
                   background:rgba(34,197,94,0.12);
                   border:1px solid rgba(34,197,94,0.30);
                   color:#86efac; font-size:12px; font-weight:600;">▲ +29.4%</span>
    </div>
  </div>
</div>""",
))


# ---- shadcn: Button variants ------------------------------------------------

SLIDES.append(Slide(
    name="03-button-variants",
    title="shadcn — Button (variants)",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Button variants</div>
  <div style="display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap;">
    <button style="height:40px; padding:0 16px; border-radius:8px;
                   background:#a78bfa; color:#0a0a0f; border:0;
                   font-weight:600; font-size:14px;">Primary</button>
    <button style="height:40px; padding:0 16px; border-radius:8px;
                   background:transparent; color:#f5f5f7;
                   border:1px solid rgba(255,255,255,0.20);
                   font-weight:600; font-size:14px;">Outline</button>
    <button style="height:40px; padding:0 16px; border-radius:8px;
                   background:rgba(255,255,255,0.06); color:#f5f5f7; border:0;
                   font-weight:600; font-size:14px;">Secondary</button>
    <button style="height:40px; padding:0 16px; border-radius:8px;
                   background:transparent; color:#f5f5f7; border:0;
                   font-weight:600; font-size:14px;">Ghost</button>
    <button style="height:40px; padding:0 16px; border-radius:8px;
                   background:#ef4444; color:#fff; border:0;
                   font-weight:600; font-size:14px;">Destructive</button>
    <button style="height:40px; padding:0 16px; border-radius:8px;
                   background:transparent; color:#a78bfa; border:0;
                   font-weight:600; font-size:14px; text-decoration:underline;">Link</button>
  </div>
</div>""",
))


# ---- shadcn: Badge / Pill ---------------------------------------------------

SLIDES.append(Slide(
    name="04-badges",
    title="shadcn — Badge variants",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Badge</div>
  <div style="display:flex; gap:12px; flex-wrap:wrap;">
    <span data-atom="anno.callout-pill" style="display:inline-flex; padding:4px 10px; border-radius:9999px; background:#a78bfa; color:#0a0a0f; font-size:12px; font-weight:600;">Default</span>
    <span data-atom="anno.callout-pill" style="display:inline-flex; padding:4px 10px; border-radius:9999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.20); color:#f5f5f7; font-size:12px; font-weight:600;">Outline</span>
    <span data-atom="anno.callout-pill" style="display:inline-flex; padding:4px 10px; border-radius:9999px; background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.30); color:#86efac; font-size:12px; font-weight:600;">Success</span>
    <span data-atom="anno.callout-pill" style="display:inline-flex; padding:4px 10px; border-radius:9999px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.30); color:#fda4af; font-size:12px; font-weight:600;">Destructive</span>
    <span data-atom="anno.callout-pill" style="display:inline-flex; padding:4px 10px; border-radius:9999px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.30); color:#fcd34d; font-size:12px; font-weight:600;">Warning</span>
  </div>
</div>""",
))


# ---- shadcn: Alert ----------------------------------------------------------

SLIDES.append(Slide(
    name="05-alert",
    title="shadcn — Alert",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Alert</div>
  <div data-atom="surf.card-flat"
       style="width:680px; padding:16px 20px; display:flex; gap:14px;
              background:rgba(245,158,11,0.08);
              border:1px solid rgba(245,158,11,0.30);
              border-radius:10px;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex:0 0 20px; margin-top:2px;">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <div>
      <h2 style="font-size:15px; color:#fcd34d; margin-bottom:4px;">Heads up</h2>
      <p style="font-size:13px; color:#fde68a; line-height:1.55;">Atoms.yaml SHA changed since last codegen. Re-run <code style="background:rgba(0,0,0,0.30); padding:1px 4px; border-radius:3px;">npm run codegen-atoms</code> to refresh recipes.</p>
    </div>
  </div>
</div>""",
))


# ---- shadcn: Avatar + AvatarStack -------------------------------------------

SLIDES.append(Slide(
    name="06-avatar-stack",
    title="shadcn — AvatarStack",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Avatar &amp; AvatarStack</div>
  <div style="display:flex; gap:32px; align-items:center;">
    <!-- Solo avatar -->
    <div data-atom="surf.card-flat"
         style="width:64px; height:64px; border-radius:50%;
                background:linear-gradient(135deg,#818cf8,#c084fc 50%,#f472b6);
                display:flex; align-items:center; justify-content:center;
                color:#fff; font-weight:700; font-size:22px;">AK</div>
    <!-- Stack -->
    <div style="display:flex;">
      <div style="width:48px; height:48px; border-radius:50%; border:2px solid #070710;
                  background:#818cf8; display:flex; align-items:center; justify-content:center;
                  color:#0a0a0f; font-weight:700; font-size:16px; margin-right:-12px;">AK</div>
      <div style="width:48px; height:48px; border-radius:50%; border:2px solid #070710;
                  background:#c084fc; display:flex; align-items:center; justify-content:center;
                  color:#0a0a0f; font-weight:700; font-size:16px; margin-right:-12px;">BM</div>
      <div style="width:48px; height:48px; border-radius:50%; border:2px solid #070710;
                  background:#f472b6; display:flex; align-items:center; justify-content:center;
                  color:#0a0a0f; font-weight:700; font-size:16px; margin-right:-12px;">CR</div>
      <div style="width:48px; height:48px; border-radius:50%; border:2px solid #070710;
                  background:rgba(255,255,255,0.10); display:flex; align-items:center; justify-content:center;
                  color:#f5f5f7; font-weight:700; font-size:14px;">+12</div>
    </div>
  </div>
</div>""",
))


# ---- shadcn: Separator ------------------------------------------------------

SLIDES.append(Slide(
    name="07-separator",
    title="shadcn — Separator",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:32px">shadcn / Separator</div>
  <h1 style="font-size:48px; margin-bottom:24px;">Section above</h1>
  <hr data-atom="dec.hairline-rule"
      style="border:0; border-top:1px solid rgba(255,255,255,0.10); margin:0;">
  <p style="margin-top:24px; color:#a1a1aa; font-size:16px;">Section below the separator. Hairline matches the slidify <code style="background:rgba(0,0,0,0.30); padding:1px 4px; border-radius:3px;">dec.hairline-rule</code> atom.</p>
</div>""",
))


# ---- shadcn: Progress (static) ----------------------------------------------

SLIDES.append(Slide(
    name="08-progress",
    title="shadcn — Progress (static)",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Progress</div>
  <div style="width:600px; display:flex; flex-direction:column; gap:24px;">
    <div>
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:13px; color:#d4d4d8;">Atoms migrated</span>
        <span style="font-size:13px; color:#a1a1aa;">87 / 95</span>
      </div>
      <div data-atom="ui.progress-bar"
           style="position:relative; height:8px; background:rgba(255,255,255,0.08); border-radius:4px;">
        <div style="position:absolute; left:0; top:0; bottom:0; width:91.6%;
                    background:#a78bfa; border-radius:4px;"></div>
      </div>
    </div>
    <div>
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <span style="font-size:13px; color:#d4d4d8;">Coverage</span>
        <span style="font-size:13px; color:#a1a1aa;">64 / 100</span>
      </div>
      <div data-atom="ui.progress-bar"
           style="position:relative; height:8px; background:rgba(255,255,255,0.08); border-radius:4px;">
        <div style="position:absolute; left:0; top:0; bottom:0; width:64%;
                    background:#10b981; border-radius:4px;"></div>
      </div>
    </div>
  </div>
</div>""",
))


# ---- shadcn: Skeleton -------------------------------------------------------

SLIDES.append(Slide(
    name="09-skeleton",
    title="shadcn — Skeleton",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:48px">shadcn / Skeleton</div>
  <div style="display:flex; gap:24px; align-items:center;">
    <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,255,255,0.08);"></div>
    <div style="display:flex; flex-direction:column; gap:8px; flex:1;">
      <div style="width:240px; height:14px; border-radius:4px; background:rgba(255,255,255,0.08);"></div>
      <div style="width:180px; height:12px; border-radius:4px; background:rgba(255,255,255,0.06);"></div>
    </div>
  </div>
  <div style="margin-top:48px; display:flex; gap:24px;">
    <div style="width:280px; height:160px; border-radius:14px; background:rgba(255,255,255,0.06);"></div>
    <div style="width:280px; height:160px; border-radius:14px; background:rgba(255,255,255,0.06);"></div>
    <div style="width:280px; height:160px; border-radius:14px; background:rgba(255,255,255,0.06);"></div>
  </div>
</div>""",
))


# ---- Tailwind: Hero ---------------------------------------------------------

SLIDES.append(Slide(
    name="10-tailwind-hero",
    title="Tailwind — Hero",
    body="""<div class="slide" data-atom="comp.hero-investor">
  <div data-atom="bg.aurora-band"
       style="position:absolute; inset:0; background:
              radial-gradient(ellipse 1100px 760px at 80% 12%, #1e1b4b 0%, #0a0a14 55%, #050510 100%);"></div>
  <div style="position:relative;">
    <div class="eyebrow" style="margin-bottom:24px;">Q2 2026 · Investor Update</div>
    <h1 data-atom="type.gfill-4"
        style="font-size:104px; line-height:0.95; max-width:1080px;
               background:linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#f472b6 100%);
               -webkit-background-clip:text; background-clip:text; color:transparent;">
      A compiler for presentations.
    </h1>
    <p style="margin-top:28px; max-width:780px; color:#d4d4d8; font-size:22px; line-height:1.5; font-weight:500;">
      Render in Chromium. Cluster into visual units. Translate gradients,
      shadows, and shapes natively. Edit in PowerPoint as if a human authored it.
    </p>
    <div style="margin-top:40px; display:flex; gap:12px;">
      <button style="height:44px; padding:0 20px; border-radius:9px; background:#a78bfa; color:#0a0a0f; border:0; font-weight:700; font-size:15px;">Get the CLI →</button>
      <button style="height:44px; padding:0 20px; border-radius:9px; background:transparent; border:1px solid rgba(255,255,255,0.20); color:#f5f5f7; font-weight:600; font-size:15px;">Watch the demo</button>
    </div>
  </div>
</div>""",
))


# ---- Tailwind: Three-up feature grid ---------------------------------------

SLIDES.append(Slide(
    name="11-tailwind-feature-grid",
    title="Tailwind — Three-up feature grid",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:24px">Why slidify</div>
  <h1 style="font-size:48px; margin-bottom:48px;">Three reasons it lands.</h1>
  <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px;">
    <div data-atom="surf.card-raised" style="padding:28px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <div style="width:36px; height:36px; border-radius:9px; background:linear-gradient(135deg,#818cf8,#c084fc 50%,#f472b6); margin-bottom:16px;"></div>
      <h2 style="font-size:18px; margin-bottom:6px;">Native shapes</h2>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.55;">87% of slide area emits as editable PPTX primitives. No more screenshots in PowerPoint.</p>
    </div>
    <div data-atom="surf.card-raised" style="padding:28px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <div style="width:36px; height:36px; border-radius:9px; background:linear-gradient(135deg,#10b981,#84cc16); margin-bottom:16px;"></div>
      <h2 style="font-size:18px; margin-bottom:6px;">Round-trippable</h2>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.55;">Every shape carries a recipe id. Edits in PowerPoint flow back to JSX.</p>
    </div>
    <div data-atom="surf.card-raised" style="padding:28px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <div style="width:36px; height:36px; border-radius:9px; background:linear-gradient(135deg,#f59e0b,#ef4444); margin-bottom:16px;"></div>
      <h2 style="font-size:18px; margin-bottom:6px;">LLM-friendly</h2>
      <p style="color:#a1a1aa; font-size:14px; line-height:1.55;">A pre-flight checker tells the model exactly what will and won't convert.</p>
    </div>
  </div>
</div>""",
))


# ---- Tailwind: Stat strip --------------------------------------------------

SLIDES.append(Slide(
    name="12-tailwind-stat-strip",
    title="Tailwind — Stat strip",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:24px">By the numbers</div>
  <h1 style="font-size:56px; margin-bottom:64px;">Atelier-v2 telemetry</h1>
  <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:24px;">
    <div data-atom="surf.card-raised" style="padding:32px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <p style="color:#a1a1aa; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; font-weight:600;">Atoms</p>
      <p style="font-size:64px; font-weight:800; letter-spacing:-0.045em; margin-top:8px;">155</p>
      <p style="color:#86efac; font-size:13px; font-weight:600; margin-top:8px;">▲ +94 since Wave-2A</p>
    </div>
    <div data-atom="surf.card-raised" style="padding:32px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <p style="color:#a1a1aa; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; font-weight:600;">Native ratio</p>
      <p style="font-size:64px; font-weight:800; letter-spacing:-0.045em; margin-top:8px;">87<span style="font-size:36px; color:#a78bfa">%</span></p>
      <p style="color:#86efac; font-size:13px; font-weight:600; margin-top:8px;">▲ +29.4%</p>
    </div>
    <div data-atom="surf.card-raised" style="padding:32px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <p style="color:#a1a1aa; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; font-weight:600;">Recipes</p>
      <p style="font-size:64px; font-weight:800; letter-spacing:-0.045em; margin-top:8px;">95</p>
      <p style="color:#71717a; font-size:13px; font-weight:600; margin-top:8px;">codegen-emitted</p>
    </div>
    <div data-atom="surf.card-raised" style="padding:32px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <p style="color:#a1a1aa; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; font-weight:600;">Escape rate</p>
      <p style="font-size:64px; font-weight:800; letter-spacing:-0.045em; margin-top:8px;">0.12<span style="font-size:36px; color:#a78bfa">%</span></p>
      <p style="color:#86efac; font-size:13px; font-weight:600; margin-top:8px;">▼ −2.1pp</p>
    </div>
  </div>
</div>""",
))


# ---- Tailwind: Testimonial --------------------------------------------------

SLIDES.append(Slide(
    name="13-tailwind-testimonial",
    title="Tailwind — Testimonial",
    body="""<div class="slide" style="display:flex; align-items:center; justify-content:center;">
  <div data-atom="comp.quote-editorial"
       style="max-width:980px; text-align:center;">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(167,139,250,0.40)" style="margin:0 auto 24px;">
      <path d="M9 7H5a2 2 0 00-2 2v4h6v-2H7V9h2zm10 0h-4a2 2 0 00-2 2v4h6v-2h-2V9h2z"/>
    </svg>
    <blockquote data-atom="type.pullquote-serif"
                style="font-family: 'Tiempos','Iowan Old Style',serif;
                       font-size:42px; line-height:1.25; font-style:italic;
                       margin:0 0 32px;">
      Slidify is the first tool that actually understands what designers mean by "editable."
    </blockquote>
    <div style="display:flex; align-items:center; justify-content:center; gap:14px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#818cf8,#f472b6); display:flex; align-items:center; justify-content:center; color:#0a0a0f; font-weight:700;">DV</div>
      <div style="text-align:left;">
        <p style="font-weight:600; font-size:14px;">Dev V.</p>
        <p style="color:#a1a1aa; font-size:13px;">Design partner, Anonymous</p>
      </div>
    </div>
  </div>
</div>""",
))


# ---- Tailwind: Agenda -------------------------------------------------------

SLIDES.append(Slide(
    name="14-tailwind-agenda",
    title="Tailwind — Agenda",
    body="""<div class="slide" data-atom="comp.agenda-toc">
  <div class="eyebrow" style="margin-bottom:18px">Agenda</div>
  <h1 style="font-size:56px; margin-bottom:56px;">What we'll cover today.</h1>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:0 80px;">
    <div data-atom="dec.hairline-rule" style="display:flex; align-items:flex-end; padding:22px 0; border-top:1px solid rgba(255,255,255,0.10); gap:24px;">
      <div style="font-size:14px; color:#a1a1aa; font-variant-numeric:tabular-nums; min-width:32px; font-weight:600;">01</div>
      <div style="flex:1; font-size:22px; font-weight:600;">Why presentations are broken</div>
      <div style="font-size:14px; color:#71717a; font-variant-numeric:tabular-nums;">p. 03</div>
    </div>
    <div data-atom="dec.hairline-rule" style="display:flex; align-items:flex-end; padding:22px 0; border-top:1px solid rgba(255,255,255,0.10); gap:24px;">
      <div style="font-size:14px; color:#a1a1aa; font-variant-numeric:tabular-nums; min-width:32px; font-weight:600;">02</div>
      <div style="flex:1; font-size:22px; font-weight:600;">The render-and-classify pipeline</div>
      <div style="font-size:14px; color:#71717a; font-variant-numeric:tabular-nums;">p. 05</div>
    </div>
    <div data-atom="dec.hairline-rule" style="display:flex; align-items:flex-end; padding:22px 0; border-top:1px solid rgba(255,255,255,0.10); gap:24px;">
      <div style="font-size:14px; color:#a1a1aa; font-variant-numeric:tabular-nums; min-width:32px; font-weight:600;">03</div>
      <div style="flex:1; font-size:22px; font-weight:600;">Native vs raster</div>
      <div style="font-size:14px; color:#71717a; font-variant-numeric:tabular-nums;">p. 07</div>
    </div>
    <div data-atom="dec.hairline-rule" style="display:flex; align-items:flex-end; padding:22px 0; border-top:1px solid rgba(255,255,255,0.10); gap:24px;">
      <div style="font-size:14px; color:#a1a1aa; font-variant-numeric:tabular-nums; min-width:32px; font-weight:600;">04</div>
      <div style="flex:1; font-size:22px; font-weight:600;">Six pillars of editability</div>
      <div style="font-size:14px; color:#71717a; font-variant-numeric:tabular-nums;">p. 09</div>
    </div>
    <div data-atom="dec.hairline-rule" style="display:flex; align-items:flex-end; padding:22px 0; border-top:1px solid rgba(255,255,255,0.10); gap:24px;">
      <div style="font-size:14px; color:#a1a1aa; font-variant-numeric:tabular-nums; min-width:32px; font-weight:600;">05</div>
      <div style="flex:1; font-size:22px; font-weight:600;">Pattern database deep-dive</div>
      <div style="font-size:14px; color:#71717a; font-variant-numeric:tabular-nums;">p. 11</div>
    </div>
    <div data-atom="dec.hairline-rule" style="display:flex; align-items:flex-end; padding:22px 0; border-top:1px solid rgba(255,255,255,0.10); gap:24px;">
      <div style="font-size:14px; color:#a1a1aa; font-variant-numeric:tabular-nums; min-width:32px; font-weight:600;">06</div>
      <div style="flex:1; font-size:22px; font-weight:600;">Where we are on the roadmap</div>
      <div style="font-size:14px; color:#71717a; font-variant-numeric:tabular-nums;">p. 13</div>
    </div>
  </div>
</div>""",
))


# ---- Tailwind: Pricing 3-tier ----------------------------------------------

SLIDES.append(Slide(
    name="15-tailwind-pricing",
    title="Tailwind — Pricing 3-tier",
    body="""<div class="slide">
  <div class="eyebrow" style="margin-bottom:18px; text-align:center;">Pricing</div>
  <h1 style="font-size:48px; text-align:center; margin-bottom:40px;">One PPTX per pitch.</h1>
  <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px;">
    <div data-atom="surf.card-flat" style="padding:32px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <p style="color:#a1a1aa; font-size:13px; font-weight:600;">Hobby</p>
      <p style="font-size:48px; font-weight:800; margin:16px 0 8px;">$0</p>
      <p style="color:#71717a; font-size:13px;">forever</p>
      <ul style="margin-top:24px; display:flex; flex-direction:column; gap:8px; font-size:13px; color:#d4d4d8;">
        <li>✓ 50 slides / month</li>
        <li>✓ 4 templates</li>
        <li>✓ Watermark on export</li>
      </ul>
    </div>
    <div data-atom="surf.card-raised"
         style="padding:32px; background:#16162a;
                border:2px solid #a78bfa; border-radius:16px;
                position:relative;
                box-shadow: 0 24px 60px rgba(167,139,250,0.20);">
      <span style="position:absolute; top:-12px; left:32px; padding:4px 10px; border-radius:9999px; background:#a78bfa; color:#0a0a0f; font-size:12px; font-weight:700;">POPULAR</span>
      <p style="color:#a78bfa; font-size:13px; font-weight:600;">Pro</p>
      <p style="font-size:48px; font-weight:800; margin:16px 0 8px;">$29<span style="font-size:18px; color:#a1a1aa;">/mo</span></p>
      <p style="color:#71717a; font-size:13px;">per editor</p>
      <ul style="margin-top:24px; display:flex; flex-direction:column; gap:8px; font-size:13px; color:#d4d4d8;">
        <li>✓ Unlimited slides</li>
        <li>✓ All templates &amp; atoms</li>
        <li>✓ No watermark</li>
        <li>✓ PPTX round-trip</li>
      </ul>
    </div>
    <div data-atom="surf.card-flat" style="padding:32px; background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <p style="color:#a1a1aa; font-size:13px; font-weight:600;">Team</p>
      <p style="font-size:48px; font-weight:800; margin:16px 0 8px;">$79<span style="font-size:18px; color:#a1a1aa;">/mo</span></p>
      <p style="color:#71717a; font-size:13px;">per seat</p>
      <ul style="margin-top:24px; display:flex; flex-direction:column; gap:8px; font-size:13px; color:#d4d4d8;">
        <li>✓ Everything in Pro</li>
        <li>✓ Brand atoms.yaml lock</li>
        <li>✓ Slack &amp; Figma plugins</li>
        <li>✓ SSO</li>
      </ul>
    </div>
  </div>
</div>""",
))


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    for slide in SLIDES:
        path = OUT_DIR / f"{slide.name}.html"
        path.write_text(_wrap(slide.title, slide.body, slide.extra_css), encoding="utf-8")
        written.append(slide.name)
    print(f"wrote {len(written)} slides to {OUT_DIR}")
    for n in written:
        print(f"  {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
