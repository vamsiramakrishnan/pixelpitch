"""Studio Atlas — Vol. III · On Editing.

A 12-frame editorial essay deck in the sage / clay register.
Avant-garde, subtle, polished. Cohesive narrative, not a fixture
catalog. Four GIF moments author the motion register.

Run:
    uv run python _bench/atlas-vol-iii/generate.py
    uv run slidify check _bench/atlas-vol-iii/01-cover.html
    uv run slidify convert _bench/atlas-vol-iii/ _bench/atlas-vol-iii/out/atlas-iii.pptx
"""
from __future__ import annotations

from pathlib import Path
from textwrap import dedent

OUT_DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Sage / Clay Editorial — palette + type stack
# ---------------------------------------------------------------------------
BONE   = "#EFE9DC"     # page
BONE_2 = "#E6DFD0"     # surface (subtle warm shift)
SAGE   = "#1F2924"     # ink (deep cool green)
SAGE_2 = "#2D3833"     # ink-2 (slightly warmer, for body)
SAGE_3 = "#7A8978"     # muted, hairlines
CLAY   = "#B05A3C"     # accent (warm terracotta)
CLAY_2 = "#8A4530"     # accent-2 (deeper)
TAUPE  = "#C7C0AE"     # support, dimensions
ASH    = "#0F1311"     # contact-shadow target

DISPLAY = ("'Spectral', 'Playfair Display', 'Iowan Old Style', "
           "Georgia, 'Times New Roman', serif")
BODY    = ("'Inter Tight', 'Inter', -apple-system, 'Segoe UI', "
           "Helvetica, sans-serif")
MONO    = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', Menlo, monospace"

# ---------------------------------------------------------------------------
# Page wrapper — every slide starts identically
# ---------------------------------------------------------------------------

_BASE_CSS = dedent(f"""
  *, *::before, *::after {{ box-sizing: border-box; }}
  html, body {{ margin:0; padding:0; width:1280px; height:720px;
               font-family: {BODY}; -webkit-font-smoothing:antialiased;
               color:{SAGE}; background:{BONE}; }}
  .slide {{ position:relative; width:1280px; height:720px;
           overflow:hidden; background:{BONE}; }}
  .display {{ font-family: {DISPLAY}; font-style:italic; }}
  .body    {{ font-family: {BODY}; }}
  .mono    {{ font-family: {MONO}; letter-spacing:0.04em; }}
  .hairline {{ border:0; border-top:1px solid rgba(31,41,36,0.18);
              margin:0; }}
  .clay-rule {{ height:2px; background:{CLAY}; border:0; }}
""").strip()


def _wrap(stem: str, body_html: str) -> str:
    return dedent(f"""\
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <title>Atlas Vol III — {stem}</title>
    <style>{_BASE_CSS}</style>
    </head>
    <body>
    {body_html}
    </body>
    </html>
    """)


# ---------------------------------------------------------------------------
# Recurring chrome — every slide carries the same colophon line
# ---------------------------------------------------------------------------

def _colophon(page_n: int, total: int = 12, *, title: str = "On editing") -> str:
    """Mono colophon line at slide bottom — vol/page/title."""
    return (
        f'<div class="mono" style="position:absolute; left:64px; right:64px;'
        f' bottom:32px; display:flex; justify-content:space-between;'
        f' align-items:center; font-size:10.5px; letter-spacing:0.18em;'
        f' color:{SAGE_3}; text-transform:uppercase;">'
        f'  <span>Studio Atlas · Vol. III</span>'
        f'  <span style="font-style:italic; text-transform:none;'
        f' letter-spacing:0.04em; color:{SAGE_2};">— {title} —</span>'
        f'  <span>{page_n:02d} / {total:02d}</span>'
        f'</div>'
    )


def _gif_data_uri(name: str) -> str | None:
    """Return data:image/gif;base64,... for out/<name>.gif if it exists.

    None means the GIF hasn't been captured yet — slide falls back to the
    static "resolved frame" composition.
    """
    p = OUT_DIR / "out" / f"{name}.gif"
    if not p.exists():
        return None
    import base64
    return "data:image/gif;base64," + base64.b64encode(p.read_bytes()).decode()


def _vol_mark(page_n: int, total: int = 12) -> str:
    """Top-right discreet volume mark."""
    return (
        f'<div class="mono" style="position:absolute; right:64px; top:32px;'
        f' font-size:10.5px; letter-spacing:0.22em; color:{SAGE_3};'
        f' text-transform:uppercase; text-align:right;">'
        f'  <span>Vol III · 2026</span><br/>'
        f'  <span style="color:{CLAY};">·</span>'
        f'  <span style="margin-left:6px; font-style:italic;'
        f' text-transform:none; letter-spacing:0.04em;">an essay</span>'
        f'</div>'
    )


# ---------------------------------------------------------------------------
# §SLIDE 01 — Cover
# ---------------------------------------------------------------------------
#
# Full-bleed bone with a soft sage radial wash bleeding off the top-left.
# A single italic-serif line "On editing" set 280px, with the period
# scaled and tinted clay as a visual anchor. Frame-breaking hairline at
# right edge. Dense negative space.
#
# Techniques: #14 cropping tension (the line sits low-left, not centered),
#             #22 multi-axis type pairing (display italic + mono),
#             #23 frame-break (atmosphere bleeds past edges, hairline
#             extends past right edge), #25 strategic neg space.

def slide_01_cover() -> tuple[str, str]:
    period_gif = _gif_data_uri('01-cover-period')
    if period_gif:
        period_block = (
            f'<img src="{period_gif}" alt="."'
            f' style="width:200px; height:200px; margin-left:-20px;'
            f' margin-bottom:-50px;"'
            f' data-slidify-anim="cover-period"/>'
        )
    else:
        period_block = (
            f'<span class="display" style="font-size:300px;'
            f' line-height:0.7; color:{CLAY}; font-weight:400;'
            f' margin-left:-6px; transform:translateY(8px);">.</span>'
        )
    body = f"""<div class="slide">
      <!-- atmosphere: soft sage wash bleeds off upper-left -->
      <div style="position:absolute; inset:0;
                  background: radial-gradient(ellipse 900px 720px at -10% -20%,
                              rgba(31,41,36,0.10) 0%,
                              rgba(31,41,36,0.04) 35%,
                              transparent 65%);"></div>
      <!-- frame-breaking hairline that runs past right edge -->
      <div style="position:absolute; right:-40px; top:120px; width:380px;
                  height:1px; background:{CLAY}; opacity:0.7;"></div>

      {_vol_mark(1)}

      <!-- the line, low-left, italic display.  The period is the GIF
           moment — captured from anim/01-cover-period.html, embedded as
           a base64 data: URI so the slide stays self-contained. -->
      <div style="position:absolute; left:64px; bottom:160px;
                  display:flex; align-items:flex-end; gap:0;">
        <span class="display" style="font-size:240px; line-height:0.86;
                                      letter-spacing:-0.025em; color:{SAGE};
                                      font-weight:300;">On editing</span>
        {period_block}
      </div>

      <!-- attribution low-left under line -->
      <div class="mono" style="position:absolute; left:64px; bottom:96px;
                                font-size:11px; letter-spacing:0.22em;
                                color:{SAGE_3}; text-transform:uppercase;">
        an essay in twelve frames
      </div>

      {_colophon(1)}
    </div>"""
    return "01-cover", body


# ---------------------------------------------------------------------------
# §SLIDE 02 — Index (with circular text-path seal)
# ---------------------------------------------------------------------------
#
# Left half: chapter index (six titles + numbers) in a strict ladder.
# Right half: a circular SVG <textPath> seal — text running around a
# circle — over a sparse italic dek. Strict 8pt baseline, generous neg
# space.
#
# Techniques: #11 text-on-path (seal), #16 8pt baseline rigor,
#             #22 multi-axis type pairing, #25 neg space.

def slide_02_index() -> tuple[str, str]:
    chapters = [
        ("01", "Removing"),
        ("02", "Subtraction"),
        ("03", "Restraint"),
        ("04", "The discipline"),
        ("05", "Asymmetry"),
        ("06", "Silence"),
    ]
    rows = "".join(
        f'<div style="display:grid; grid-template-columns:64px 1fr;'
        f' align-items:baseline; padding:14px 0;'
        f' border-bottom:1px solid rgba(31,41,36,0.10);">'
        f'<span class="mono" style="font-size:13px; letter-spacing:0.18em;'
        f' color:{CLAY};">{n}</span>'
        f'<span class="display" style="font-size:32px; line-height:1.1;'
        f' font-weight:300; color:{SAGE}; letter-spacing:-0.005em;">'
        f'{title}</span>'
        f'</div>'
        for n, title in chapters
    )
    seal_text = ("STUDIO ATLAS • VOL III • ON EDITING • "
                 "STUDIO ATLAS • VOL III • ON EDITING • ")
    body = f"""<div class="slide">
      {_vol_mark(2)}

      <div style="position:absolute; left:64px; top:96px;
                  font-size:11px; letter-spacing:0.32em; color:{CLAY};
                  text-transform:uppercase; font-weight:600;">
        Index — six chapters
      </div>

      <!-- chapter ladder, left -->
      <div style="position:absolute; left:64px; top:148px; width:520px;">
        {rows}
      </div>

      <!-- right column: seal + dek -->
      <div style="position:absolute; left:740px; top:96px; right:64px;
                  bottom:96px;">
        <!-- circular text-path seal -->
        <svg viewBox="0 0 220 220" width="220" height="220"
             style="display:block; margin-bottom:36px;">
          <defs>
            <path id="seal-circle" fill="none"
                  d="M 110,110 m -84,0 a 84,84 0 1,1 168,0 a 84,84 0 1,1 -168,0"/>
          </defs>
          <!-- outer hairline ring -->
          <circle cx="110" cy="110" r="106" fill="none"
                  stroke="{SAGE}" stroke-width="0.75"/>
          <!-- inner clay ring -->
          <circle cx="110" cy="110" r="64" fill="none"
                  stroke="{CLAY}" stroke-width="1"/>
          <!-- center mark -->
          <circle cx="110" cy="110" r="4" fill="{CLAY}"/>
          <text style="font-family:{MONO}; font-size:9px;
                       letter-spacing:0.32em; fill:{SAGE_2};">
            <textPath href="#seal-circle" startOffset="0">{seal_text}</textPath>
          </text>
          <!-- center label -->
          <text x="110" y="115" text-anchor="middle"
                style="font-family:{DISPLAY}; font-style:italic;
                       font-size:18px; fill:{SAGE};">vol · iii</text>
        </svg>

        <p class="display" style="margin:0; font-size:24px; line-height:1.45;
                                   color:{SAGE_2}; font-weight:300;
                                   letter-spacing:-0.005em;">
          Six chapters on the discipline that
          separates craft from competence — the
          art of taking away.
        </p>
        <div style="margin-top:24px; height:1px; width:64px;
                    background:{CLAY};"></div>
        <p class="mono" style="margin:14px 0 0; font-size:10.5px;
                                letter-spacing:0.18em; color:{SAGE_3};
                                text-transform:uppercase;">
          Read time · 12 minutes · unhurried
        </p>
      </div>

      {_colophon(2)}
    </div>"""
    return "02-index", body


# ---------------------------------------------------------------------------
# §SLIDE 03 — Opening spread (image-fill on EDITING)
# ---------------------------------------------------------------------------
#
# Headline "EDITING" set huge, glyphs filled with a sage-marble gradient
# composition. Drop cap "T" beneath. Two-column body. Mono header.
# This slide is the corpus's first invocation of mask.text / image-fill
# typography (#1).
#
# The marble texture is a layered linear-gradient stack — multiple
# overlapping veining gradients clipped to the text shape. Renders
# natively (no <feTurbulence>, no risky CSS).
#
# Techniques: #1 image-fill type, #14 tension (drop cap left of column),
#             #22 multi-axis pairing, #25 neg space.

def slide_03_opening() -> tuple[str, str]:
    marble = (
        # base sage layer + warmer veins + clay highlight + cool shadow
        "linear-gradient(118deg,"
        f" {SAGE} 0%, #2A3530 18%, {SAGE} 36%,"
        f" #324038 54%, {SAGE} 72%, #2A3530 90%, {SAGE_2} 100%),"
        f" linear-gradient(22deg, transparent 38%,"
        f" rgba(176,90,60,0.18) 50%, transparent 62%),"
        f" linear-gradient(76deg, transparent 48%,"
        f" rgba(199,192,174,0.22) 60%, transparent 72%)"
    )
    body = f"""<div class="slide">
      {_vol_mark(3)}

      <!-- mono running header -->
      <div style="position:absolute; left:64px; top:96px;
                  font-family:{MONO}; font-size:10.5px;
                  letter-spacing:0.32em; color:{SAGE_3};
                  text-transform:uppercase;">
        Chapter 01 · Removing
      </div>

      <!-- huge image-fill headline -->
      <h1 data-atom="mask.text" data-pptx-role="title"
          style="position:absolute; left:56px; top:140px; right:0;
                 margin:0; font-family:{DISPLAY}; font-style:italic;
                 font-weight:300; font-size:300px; line-height:0.84;
                 letter-spacing:-0.04em;
                 background:{marble};
                 -webkit-background-clip:text; background-clip:text;
                 color:transparent;">EDITING</h1>

      <!-- two-column body, lower half -->
      <div style="position:absolute; left:64px; right:64px; bottom:96px;
                  display:grid; grid-template-columns:96px 1fr 1fr;
                  gap:32px; align-items:start;">
        <span class="display" style="font-size:128px; line-height:0.78;
                                      color:{CLAY}; font-weight:400;">T</span>
        <p style="margin:0; font-size:14.5px; line-height:1.65;
                  color:{SAGE_2};">
          o edit is the most quietly difficult act in any craft.
          The first draft is loud, generous, eager to be liked. The
          second is the cost of taste.
          <span style="color:{SAGE_3};">A page that says less,
          says more.</span>
        </p>
        <p style="margin:0; font-size:14.5px; line-height:1.65;
                  color:{SAGE_2};">
          The disciplines that hold their composure under reduction
          — typography, music, architecture — are the ones
          we still recognise as art a generation later. Slide design
          asks the same question, often without knowing it.
        </p>
      </div>

      {_colophon(3, title='On editing — Removing')}
    </div>"""
    return "03-opening", body


# ---------------------------------------------------------------------------
# §SLIDE 04 — Duotone plate
# ---------------------------------------------------------------------------
#
# Full-bleed editorial illustration: an abstract still-life of overlapping
# warm and cool forms — typewriter-as-architecture, paper sheet, a hand
# implied by a clay blob. Pure SVG; sage→clay duotone gradient.
# Caption block lower-third with hairline rule.
#
# Techniques: #2 duotone (real, not silhouette — gradient mapping over
#             a constructed scene), #14 cropping tension, #21 split-tone
#             illumination (cool from upper-left, warm from lower-right),
#             #23 frame-break (composition bleeds past three edges).

def slide_04_duotone_plate() -> tuple[str, str]:
    # The illustration lives in an SVG that bleeds 1280×720 with frame
    # break on the top, left, and right edges (composition extends past).
    body = f"""<div class="slide">
      <!-- full-bleed illustration -->
      <svg viewBox="0 0 1280 720" width="1280" height="720"
           preserveAspectRatio="xMidYMid slice"
           style="position:absolute; inset:0;">
        <defs>
          <!-- duotone wash: cool sage upper-left, warm clay lower-right -->
          <linearGradient id="duo-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stop-color="{ASH}"/>
            <stop offset="55%" stop-color="{SAGE}"/>
            <stop offset="100%" stop-color="{CLAY_2}"/>
          </linearGradient>
          <!-- warm rim from lower-right -->
          <radialGradient id="duo-warm" cx="0.85" cy="0.95" r="0.7">
            <stop offset="0%"  stop-color="{CLAY}" stop-opacity="0.55"/>
            <stop offset="60%" stop-color="{CLAY}" stop-opacity="0"/>
          </radialGradient>
          <!-- cool rim from upper-left -->
          <radialGradient id="duo-cool" cx="0.10" cy="0.05" r="0.6">
            <stop offset="0%"  stop-color="{TAUPE}" stop-opacity="0.30"/>
            <stop offset="60%" stop-color="{TAUPE}" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="{BONE}"/>
            <stop offset="100%" stop-color="{TAUPE}"/>
          </linearGradient>
          <linearGradient id="hand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stop-color="{CLAY}"/>
            <stop offset="100%" stop-color="{CLAY_2}"/>
          </linearGradient>
        </defs>

        <!-- duotone background -->
        <rect width="1280" height="720" fill="url(#duo-bg)"/>
        <rect width="1280" height="720" fill="url(#duo-warm)"/>
        <rect width="1280" height="720" fill="url(#duo-cool)"/>

        <!-- typewriter-as-architecture: large rounded rect, off-center -->
        <rect x="240" y="220" width="760" height="380" rx="12"
              fill="{ASH}" opacity="0.92"/>
        <!-- key ladder -->
        {''.join(
            f'<circle cx="{310 + (i % 9) * 78}" cy="{305 + (i // 9) * 60}"'
            f' r="14" fill="{SAGE_2}" opacity="0.85"/>'
            for i in range(27)
        )}
        <!-- platen / roller -->
        <rect x="280" y="240" width="680" height="30" rx="15"
              fill="{TAUPE}" opacity="0.55"/>

        <!-- paper sheet bleeding past top -->
        <rect x="500" y="-40" width="240" height="320" fill="url(#paper)"
              opacity="0.95"/>
        <!-- typed line on paper -->
        <rect x="520" y="120" width="170" height="2" fill="{SAGE}"/>
        <rect x="520" y="140" width="140" height="2" fill="{SAGE}"/>
        <rect x="520" y="160" width="190" height="2" fill="{SAGE}"/>
        <rect x="520" y="180" width="110" height="2" fill="{SAGE}"/>

        <!-- hand: organic clay blob bleeding past lower-right -->
        <path d="M 920 480
                 C 980 440, 1080 420, 1180 460
                 C 1280 510, 1330 600, 1280 720
                 L 880 720
                 C 880 620, 880 520, 920 480 Z"
              fill="url(#hand)" opacity="0.92"/>
        <!-- finger highlight -->
        <ellipse cx="1080" cy="500" rx="80" ry="20"
                 fill="{TAUPE}" opacity="0.18"/>

        <!-- atmospheric film grain via micro-circles (under 200 prims, native) -->
        {''.join(
            f'<circle cx="{(i * 137) % 1280}" cy="{(i * 271) % 720}"'
            f' r="0.6" fill="{BONE}" opacity="0.06"/>'
            for i in range(120)
        )}
      </svg>

      <!-- top mono header (over photo) -->
      <div class="mono" style="position:absolute; left:64px; top:32px;
                                font-size:10.5px; letter-spacing:0.32em;
                                color:{BONE}; opacity:0.7;
                                text-transform:uppercase;">
        Plate IV · Removing
      </div>
      <div class="mono" style="position:absolute; right:64px; top:32px;
                                font-size:10.5px; letter-spacing:0.22em;
                                color:{BONE}; opacity:0.7;
                                text-transform:uppercase; text-align:right;">
        Vol III · 2026
      </div>

      <!-- caption block: lower-third left -->
      <div style="position:absolute; left:64px; right:560px; bottom:96px;
                  background: rgba(239,233,220,0.92);
                  padding:24px 28px; border-left:2px solid {CLAY};">
        <p class="display" style="margin:0; font-size:22px; line-height:1.35;
                                   color:{SAGE}; font-weight:300;
                                   letter-spacing:-0.005em;">
          The keyboard once required us to commit —
          a struck letter could not be unseen.
        </p>
        <hr class="hairline" style="margin:18px 0 12px; width:48px;"/>
        <p class="mono" style="margin:0; font-size:10.5px;
                                letter-spacing:0.18em; color:{SAGE_3};
                                text-transform:uppercase;">
          Studio Atlas · plate IV · photographed in sage & clay
        </p>
      </div>

      {_colophon(4, title='On editing — Subtraction')}
    </div>"""
    return "04-duotone-plate", body


# ---------------------------------------------------------------------------
# §SLIDE 05 — One number (data-ink reduced; GIF moment #2)
# ---------------------------------------------------------------------------
#
# Single statistic, oversize and serif. Mini chart amputated of every
# tick and label the eye does not need. The animated version (under
# anim/05-number.html) tweens 0→40 with chart drawing; this static
# slide rests on the resolved final state, which is also the GIF's
# last frame.
#
# Techniques: #17 data-ink reduction, #15 highlight sweep (animated),
#             #25 negative space, #22 multi-axis pairing.

def slide_05_one_number() -> tuple[str, str]:
    num_gif = _gif_data_uri('05-number-tween')
    if num_gif:
        right_block = (
            f'<img src="{num_gif}" alt="40 per cent"'
            f' style="width:520px; height:380px; display:block;"'
            f' data-slidify-anim="number-tween"'
            f' data-atom="slot.numeral"/>'
        )
    else:
        right_block = (
            f'<span class="display" data-atom="slot.numeral"'
            f' style="font-size:280px; line-height:0.82; color:{CLAY};'
            f' font-weight:400; letter-spacing:-0.04em;">40</span>'
            f'<span class="display" style="font-size:96px;'
            f' color:{CLAY_2}; font-weight:300; vertical-align:top;'
            f' margin-left:-4px; line-height:1;">%</span>'
            f'<svg viewBox="0 0 480 80" width="100%" height="80"'
            f' style="display:block; margin-top:24px;">'
            f'<line x1="0" y1="60" x2="480" y2="60" stroke="{SAGE_3}"'
            f' stroke-width="0.5" stroke-dasharray="2 4"/>'
            f'<path d="M 0 56 L 60 50 L 120 48 L 180 42 L 240 38'
            f' L 300 30 L 360 26 L 420 18 L 480 10" fill="none"'
            f' stroke="{CLAY}" stroke-width="2" stroke-linecap="round"/>'
            f'<circle cx="480" cy="10" r="4" fill="{CLAY}"/></svg>'
            f'<div class="mono" style="margin-top:8px; display:flex;'
            f' justify-content:space-between; font-size:9px;'
            f' letter-spacing:0.18em; color:{SAGE_3};'
            f' text-transform:uppercase;"><span>Jan</span>'
            f'<span>Apr</span><span>Jul</span><span>Oct</span>'
            f'<span>+22pp</span></div>'
        )
    body = f"""<div class="slide">
      {_vol_mark(5)}

      <!-- mono running header -->
      <div style="position:absolute; left:64px; top:96px;
                  font-family:{MONO}; font-size:10.5px;
                  letter-spacing:0.32em; color:{SAGE_3};
                  text-transform:uppercase;">
        Chapter 02 · Subtraction
      </div>

      <!-- left: dek + insight -->
      <div style="position:absolute; left:64px; top:200px; width:540px;">
        <p class="display" style="margin:0; font-size:30px; line-height:1.3;
                                   color:{SAGE}; font-weight:300;
                                   letter-spacing:-0.005em;">
          We removed forty per cent of the elements.
          Engagement rose by twenty-two.
        </p>
        <div style="margin-top:32px; height:1px; width:64px;
                    background:{CLAY};"></div>
        <p style="margin-top:18px; font-size:13px; line-height:1.6;
                  color:{SAGE_2}; max-width:440px;">
          The fewest legible elements that still
          carry the argument. That is the rule.
          Nothing else.
        </p>
        <p class="mono" style="margin-top:32px; font-size:10.5px;
                                letter-spacing:0.18em; color:{SAGE_3};
                                text-transform:uppercase;">
          Source · 1,284 conversions · q1 2026
        </p>
      </div>

      <!-- right: GIF when captured (anim/05-number-tween.html tweens
           0→40 with the chart drawing in lockstep); otherwise the
           static resolved-state composition. -->
      <div style="position:absolute; right:64px; top:172px;
                  width:520px; text-align:right;">
        {right_block}
      </div>

      {_colophon(5, title='On editing — Subtraction')}
    </div>"""
    return "05-one-number", body


# ---------------------------------------------------------------------------
# §SLIDE 06 — Type specimen
# ---------------------------------------------------------------------------
#
# One word — "Restraint." — set five ways. Each variant annotated with
# a hairline callout and a mono label. Educational and craft-forward.
# Demonstrates the multi-axis type-pairing thesis literally.
#
# Techniques: #22 multi-axis type pairing (size, weight, width, italic,
#             color), #16 baseline grid, #20 stroke consistency in the
#             callouts, #25 negative space.

def slide_06_type_specimen() -> tuple[str, str]:
    variants = [
        # (label, family_override, weight, italic, size, color, axis_note)
        ("01 · light",   DISPLAY, 300, False, 64, SAGE,   "weight · 300"),
        ("02 · regular", DISPLAY, 400, False, 64, SAGE,   "weight · 400"),
        ("03 · bold",    DISPLAY, 700, False, 64, SAGE,   "weight · 700"),
        ("04 · italic",  DISPLAY, 400, True,  64, CLAY,   "italic + accent"),
    ]
    rows = ""
    for i, (label, family, weight, italic, size, color, note) in enumerate(variants):
        text = "Restraint" if family == DISPLAY else "RESTRAINT"
        ital = "italic" if italic else "normal"
        ls = "0.18em" if family == BODY else "-0.005em"
        rows += (
            f'<div style="display:grid;'
            f' grid-template-columns:140px 1fr 220px;'
            f' align-items:baseline; gap:24px; padding:18px 0;'
            f' border-top:1px solid rgba(31,41,36,0.10);">'
            f'<span class="mono" style="font-size:10.5px;'
            f' letter-spacing:0.22em; color:{SAGE_3};'
            f' text-transform:uppercase;">{label}</span>'
            f'<span style="font-family:{family}; font-style:{ital};'
            f' font-weight:{weight}; font-size:{size}px;'
            f' line-height:1; letter-spacing:{ls}; color:{color};">'
            f'{text}</span>'
            f'<span class="mono" style="font-size:10.5px;'
            f' letter-spacing:0.18em; color:{SAGE_2};'
            f' text-align:right; text-transform:uppercase;">'
            f'<span style="color:{CLAY};">·</span> {note}</span>'
            f'</div>'
        )
    body = f"""<div class="slide">
      {_vol_mark(6)}

      <div style="position:absolute; left:64px; top:96px;
                  font-family:{MONO}; font-size:10.5px;
                  letter-spacing:0.32em; color:{SAGE_3};
                  text-transform:uppercase;">
        Chapter 03 · Restraint
      </div>

      <h2 class="display" style="position:absolute; left:64px; top:130px;
                                  margin:0; font-size:38px; font-weight:300;
                                  color:{SAGE}; letter-spacing:-0.012em;">
        One word, four voices.
      </h2>

      <div style="position:absolute; left:64px; right:64px; top:200px;
                  bottom:96px;">
        {rows}
      </div>
      <p style="position:absolute; left:64px; right:64px; bottom:64px;
                margin:0; max-width:680px; font-size:12px;
                line-height:1.55; color:{SAGE_2}; font-style:italic;
                font-family:{DISPLAY};">
        Each axis carries a different register — weight is emphasis,
        italic is voice, family is genre. Three voices, used surgically.
      </p>

      {_colophon(6, title='On editing — Restraint')}
    </div>"""
    return "06-type-specimen", body


# ---------------------------------------------------------------------------
# §SLIDE 07 — Pull-quote
# ---------------------------------------------------------------------------
#
# A single italic line, dead-centered horizontally, sat on the lower-
# third vertically. 3:1 negative-space ratio. The most "edited" page
# in the deck so far.
#
# Techniques: #25 strategic negative space, #22 multi-axis pairing.

def slide_07_pullquote() -> tuple[str, str]:
    body = f"""<div class="slide">
      {_vol_mark(7)}

      <div style="position:absolute; left:64px; top:96px;
                  font-family:{MONO}; font-size:10.5px;
                  letter-spacing:0.32em; color:{SAGE_3};
                  text-transform:uppercase;">
        Chapter 04 · The discipline
      </div>

      <!-- single hairline, half-width, centered: the quote sits beneath -->
      <div style="position:absolute; left:50%; top:380px; width:96px;
                  height:1px; background:{CLAY};
                  transform:translateX(-50%);"></div>

      <!-- the line, italic display, centered -->
      <blockquote class="display"
                  style="position:absolute; left:128px; right:128px;
                         top:420px; margin:0; text-align:center;
                         font-size:54px; line-height:1.18;
                         font-weight:300; color:{SAGE};
                         letter-spacing:-0.012em;">
        To remove a thing<br/>
        is to say what mattered.
      </blockquote>

      <!-- attribution, mono, centered -->
      <div class="mono" style="position:absolute; left:0; right:0; top:608px;
                                text-align:center; font-size:10.5px;
                                letter-spacing:0.32em; color:{SAGE_3};
                                text-transform:uppercase;">
        — Studio Atlas, on editing
      </div>

      {_colophon(7, title='On editing — The discipline')}
    </div>"""
    return "07-pullquote", body


# ---------------------------------------------------------------------------
# §SLIDE 08 — Cinemagraph (GIF moment #3)
# ---------------------------------------------------------------------------
#
# Full-bleed editorial composition: a still life of a coffee + paper +
# pen, but rendered as overlapping warm and cool sage forms — the loop
# is the rising steam from the cup, animated separately under
# anim/08-cinemagraph.html and embedded as base64 GIF.
#
# This static fallback shows the resolved scene without motion.
#
# Techniques: #3 cinemagraph (animated ribbon of steam), #2 duotone,
#             #14 cropping tension (off-center), #23 frame-break,
#             #21 split-tone illumination.

def slide_08_cinemagraph() -> tuple[str, str]:
    has_gif = _gif_data_uri('08-steam-loop')
    if has_gif:
        steam_block = (
            f'<img src="{has_gif}" alt="rising steam"'
            f' style="position:absolute; left:778px; top:170px;'
            f' width:280px; height:320px;"'
            f' data-slidify-anim="cinemagraph-steam"/>'
        )
        static_steam = ''
    else:
        steam_block = ''
        static_steam = (
            f'<g opacity="0.45" stroke="{BONE}" stroke-width="2.5"'
            f' fill="none" stroke-linecap="round">'
            f'<path d="M 900 380 Q 884 320 916 270 Q 948 220 924 160"/>'
            f'<path d="M 932 388 Q 950 320 922 270 Q 894 220 920 170"/>'
            f'<path d="M 960 384 Q 980 326 952 270 Q 928 215 956 160"/>'
            f'</g>'
        )
    body = f"""<div class="slide">
      <!-- full-bleed scene -->
      <svg viewBox="0 0 1280 720" width="1280" height="720"
           preserveAspectRatio="xMidYMid slice"
           style="position:absolute; inset:0;">
        <defs>
          <linearGradient id="cine-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stop-color="{SAGE_2}"/>
            <stop offset="55%" stop-color="{ASH}"/>
            <stop offset="100%" stop-color="{CLAY_2}"/>
          </linearGradient>
          <radialGradient id="cine-spot" cx="0.32" cy="0.4" r="0.55">
            <stop offset="0%"  stop-color="{TAUPE}" stop-opacity="0.30"/>
            <stop offset="60%" stop-color="{TAUPE}" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="{BONE}"/>
            <stop offset="55%" stop-color="{TAUPE}"/>
            <stop offset="100%" stop-color="{SAGE_3}"/>
          </linearGradient>
          <linearGradient id="cup-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="{ASH}"/>
            <stop offset="100%" stop-color="{SAGE}"/>
          </linearGradient>
          <linearGradient id="paper-cine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="{BONE}"/>
            <stop offset="100%" stop-color="{TAUPE}"/>
          </linearGradient>
        </defs>

        <!-- sage→clay duotone bg -->
        <rect width="1280" height="720" fill="url(#cine-bg)"/>
        <rect width="1280" height="720" fill="url(#cine-spot)"/>

        <!-- table edge: warm hairline horizontal -->
        <rect x="0" y="540" width="1280" height="2" fill="{CLAY_2}"
              opacity="0.55"/>

        <!-- paper sheet, off-center, bleeding past left -->
        <g transform="rotate(-4 680 470)">
          <rect x="-40" y="380" width="660" height="280"
                fill="url(#paper-cine)" opacity="0.95"/>
          <!-- typed lines -->
          <g fill="{SAGE}">
            <rect x="40" y="430" width="380" height="2"/>
            <rect x="40" y="450" width="320" height="2"/>
            <rect x="40" y="470" width="400" height="2"/>
            <rect x="40" y="490" width="280" height="2"/>
            <rect x="40" y="510" width="360" height="2"/>
            <rect x="40" y="530" width="220" height="2"/>
            <rect x="40" y="550" width="340" height="2"/>
            <rect x="40" y="570" width="180" height="2"/>
          </g>
        </g>

        <!-- pen: thin clay rect -->
        <g transform="rotate(18 540 410)">
          <rect x="430" y="395" width="180" height="6" rx="2"
                fill="{CLAY}"/>
          <rect x="600" y="393" width="22" height="10" fill="{ASH}"/>
        </g>

        <!-- cup, right of center, sat on the table edge -->
        <g transform="translate(820, 360)">
          <!-- saucer -->
          <ellipse cx="100" cy="200" rx="160" ry="20"
                   fill="{ASH}" opacity="0.6"/>
          <ellipse cx="100" cy="195" rx="150" ry="14"
                   fill="{TAUPE}" opacity="0.85"/>
          <!-- cup body -->
          <path d="M 20 50 L 30 180 Q 30 195 100 195
                   Q 170 195 170 180 L 180 50 Z"
                fill="url(#cup)"/>
          <!-- liquid surface -->
          <ellipse cx="100" cy="50" rx="80" ry="14"
                   fill="url(#cup-rim)"/>
          <ellipse cx="100" cy="50" rx="76" ry="10"
                   fill="{ASH}" opacity="0.85"/>
          <!-- handle -->
          <path d="M 180 80 Q 230 80 230 130 Q 230 170 180 165"
                fill="none" stroke="{TAUPE}" stroke-width="6"
                stroke-linecap="round"/>
        </g>

        {static_steam}

        <!-- subtle film grain -->
        {''.join(
            f'<circle cx="{(i * 137) % 1280}" cy="{(i * 271) % 720}"'
            f' r="0.5" fill="{BONE}" opacity="0.05"/>'
            for i in range(180)
        )}
      </svg>

      {steam_block}

      <!-- mono header -->
      <div class="mono" style="position:absolute; left:64px; top:32px;
                                font-size:10.5px; letter-spacing:0.32em;
                                color:{BONE}; opacity:0.7;
                                text-transform:uppercase;">
        Plate VIII · Asymmetry
      </div>
      <div class="mono" style="position:absolute; right:64px; top:32px;
                                font-size:10.5px; letter-spacing:0.22em;
                                color:{BONE}; opacity:0.7;
                                text-transform:uppercase; text-align:right;">
        Vol III · 2026
      </div>

      <!-- caption block lower-left over photo -->
      <div style="position:absolute; left:64px; right:720px; bottom:96px;
                  background: rgba(15,19,17,0.78);
                  padding:24px 28px; border-left:2px solid {CLAY};">
        <p class="display" style="margin:0; font-size:22px; line-height:1.35;
                                   color:{BONE}; font-weight:300;
                                   letter-spacing:-0.005em;">
          Where the eye chooses to rest is
          where the page chooses to live.
        </p>
        <hr class="hairline" style="margin:18px 0 12px; width:48px;
                                     border-top-color:{CLAY};"/>
        <p class="mono" style="margin:0; font-size:10.5px;
                                letter-spacing:0.18em; color:{TAUPE};
                                text-transform:uppercase;">
          Plate VIII — fragment of a working desk
        </p>
      </div>

      {_colophon(8, title='On editing — Asymmetry')}
    </div>"""
    return "08-cinemagraph", body


# ---------------------------------------------------------------------------
# §SLIDE 09 — Process matrix
# ---------------------------------------------------------------------------
#
# 2×3 grid of editorial process steps. Numbered clay rings paired with
# stroke-1.6 lucide icons (re-stroked to match the page hairlines).
# Taupe connector lines suggest flow without forcing it. Multi-shadow
# stack on each ring (contact + ambient) — the deck's first deliberate
# multi-shadow exemplar.
#
# Techniques: #20 icon stroke consistency, #16 8pt grid,
#             #12 multi-shadow (contact dark + ambient soft), #25 neg
#             space, #22 multi-axis type pairing.

def slide_09_process_matrix() -> tuple[str, str]:
    # Re-strokeable lucide icons — kept simple and consistent.
    ICONS = {
        "eye":    ('<path d="M 2 12 C 2 12 5 5 12 5 C 19 5 22 12 22 12'
                   ' C 22 12 19 19 12 19 C 5 19 2 12 2 12 Z"/>'
                   '<circle cx="12" cy="12" r="3"/>'),
        "scissors": ('<circle cx="6" cy="6" r="3"/>'
                     '<circle cx="6" cy="18" r="3"/>'
                     '<line x1="20" y1="4" x2="8.12" y2="15.88"/>'
                     '<line x1="14.47" y1="14.48" x2="20" y2="20"/>'
                     '<line x1="8.12" y1="8.12" x2="12" y2="12"/>'),
        "feather": ('<path d="M 20.24 12.24 a 6 6 0 0 0 -8.49 -8.49'
                    ' L 5 10.5 V 19 h 8.5 z"/>'
                    '<line x1="16" y1="8" x2="2" y2="22"/>'
                    '<line x1="17.5" y1="15" x2="9" y2="15"/>'),
        "compass":('<circle cx="12" cy="12" r="10"/>'
                   '<polygon points="16.24 7.76 14.12 14.12 7.76 16.24'
                   ' 9.88 9.88 16.24 7.76"/>'),
        "minus":  ('<line x1="5" y1="12" x2="19" y2="12"/>'),
        "check":  ('<path d="M 20 6 L 9 17 L 4 12"/>'),
    }
    steps = [
        ("01", "feather",  "Begin generously",
         "Write the loud first draft. Do not edit while writing."),
        ("02", "eye",      "Read it slowly",
         "A page reread is a page rewritten in your head."),
        ("03", "scissors", "Cut what is true but unnecessary",
         "The hardest line to remove is the one you wrote well."),
        ("04", "minus",    "Subtract the support",
         "Decoration is the first to go. Hierarchy survives without it."),
        ("05", "compass",  "Re-anchor the argument",
         "What is the page about? Move that to the centre."),
        ("06", "check",    "Stop early",
         "The last cut should leave the page slightly underdressed."),
    ]
    def cell(n, icon_key, title, copy):
        # Multi-shadow stack: tight contact (sharp, dark) + ambient (soft, wide).
        ring = (
            f'<div style="position:relative; width:64px; height:64px;'
            f' border-radius:50%; border:1px solid {CLAY};'
            f' display:flex; align-items:center; justify-content:center;'
            f' background:{BONE_2};'
            f' box-shadow: 0 1px 1px rgba(15,19,17,0.18),'
            f' 0 8px 24px rgba(15,19,17,0.06),'
            f' inset 0 -1px 0 rgba(176,90,60,0.18);">'
            f'<svg width="22" height="22" viewBox="0 0 24 24"'
            f' fill="none" stroke="{SAGE}" stroke-width="1.6"'
            f' stroke-linecap="round" stroke-linejoin="round">'
            f'{ICONS[icon_key]}</svg>'
            f'<span class="mono" style="position:absolute; top:-12px;'
            f' left:-4px; font-size:10px; letter-spacing:0.18em;'
            f' color:{CLAY}; background:{BONE}; padding:0 6px;">'
            f'{n}</span></div>'
        )
        return (
            f'<div style="display:flex; gap:18px; align-items:flex-start;">'
            f'{ring}'
            f'<div style="padding-top:6px;">'
            f'<h3 class="display" style="margin:0 0 6px;'
            f' font-size:22px; font-weight:300;'
            f' letter-spacing:-0.005em; color:{SAGE};">{title}</h3>'
            f'<p style="margin:0; font-size:13px; line-height:1.55;'
            f' color:{SAGE_2}; max-width:240px;">{copy}</p>'
            f'</div></div>'
        )
    grid = "".join(cell(*s) for s in steps)
    body = f"""<div class="slide">
      {_vol_mark(9)}

      <div style="position:absolute; left:64px; top:96px;
                  font-family:{MONO}; font-size:10.5px;
                  letter-spacing:0.32em; color:{SAGE_3};
                  text-transform:uppercase;">
        Chapter 05 · Asymmetry
      </div>

      <h2 class="display" style="position:absolute; left:64px; top:130px;
                                  margin:0; font-size:38px; font-weight:300;
                                  color:{SAGE}; letter-spacing:-0.012em;
                                  max-width:680px;">
        A working method, in six small acts.
      </h2>

      <div style="position:absolute; left:64px; right:64px; top:230px;
                  display:grid; grid-template-columns:repeat(3, 1fr);
                  grid-template-rows: 1fr 1fr; gap:36px 48px;">
        {grid}
      </div>

      {_colophon(9, title='On editing — Asymmetry')}
    </div>"""
    return "09-process-matrix", body


# ---------------------------------------------------------------------------
# §SLIDE 10 — Highlight sweep (GIF moment #4)
# ---------------------------------------------------------------------------
#
# A single key statistic on bone with everything else stripped. The
# animated version sends a clay→bone sheen across the numeral, paced
# slowly and once. Static fallback shows the resolved frame.
#
# Techniques: #15 highlight sweep (animated), #25 strategic neg space,
#             #12 micro-shadow (subtle inset on the figure).

def slide_10_highlight_sweep() -> tuple[str, str]:
    sheen_gif = _gif_data_uri('10-sheen-sweep')
    if sheen_gif:
        figure_block = (
            f'<img src="{sheen_gif}" alt="0.12 per cent"'
            f' style="width:680px; height:280px; display:block;"'
            f' data-atom="slot.numeral"'
            f' data-slidify-anim="sheen-sweep"/>'
        )
    else:
        figure_block = (
            f'<div data-atom="slot.numeral"'
            f' style="font-family:{DISPLAY}; font-style:italic;'
            f' font-weight:300; font-size:280px; line-height:0.86;'
            f' letter-spacing:-0.04em; color:{SAGE};'
            f' text-shadow: 0 1px 0 rgba(15,19,17,0.04);">'
            f'0.12<span style="font-size:120px; color:{CLAY};'
            f' font-weight:400; letter-spacing:0;'
            f' vertical-align:0.18em;">%</span></div>'
        )
    body = f"""<div class="slide">
      {_vol_mark(10)}

      <div style="position:absolute; left:64px; top:96px;
                  font-family:{MONO}; font-size:10.5px;
                  letter-spacing:0.32em; color:{SAGE_3};
                  text-transform:uppercase;">
        Chapter 06 · Silence
      </div>

      <!-- numeral, dead-centered -->
      <div style="position:absolute; inset:0; display:flex;
                  align-items:center; justify-content:center;
                  flex-direction:column;">
        <div class="mono" style="font-size:11px; letter-spacing:0.32em;
                                  color:{SAGE_3}; margin-bottom:24px;
                                  text-transform:uppercase;">
          Drift, after twelve months of editing
        </div>
        {figure_block}
        <div style="margin-top:32px; height:1px; width:96px;
                    background:{CLAY};"></div>
        <p class="display" style="margin-top:24px; font-size:22px;
                                   line-height:1.4; color:{SAGE_2};
                                   font-weight:300; letter-spacing:-0.005em;
                                   text-align:center; max-width:560px;">
          The conversion drift across one thousand
          two hundred eighty-four decks.
        </p>
      </div>

      {_colophon(10, title='On editing — Silence')}
    </div>"""
    return "10-highlight-sweep", body


# ---------------------------------------------------------------------------
# §SLIDE 11 — Numerals ladder
# ---------------------------------------------------------------------------
#
# A vertical mono table of eight stats, laid out as a colophon —
# tabular figures, baseline aligned. Reads like the back-matter of a
# book. The deck's most "data-dense" slide, but every label is mono'd
# and every figure is justified so the page still feels still.
#
# Techniques: #17 data-ink reduction (tabular not chart), #16 grid
#             rigor, #22 multi-axis pairing (display headline + mono
#             body), #20 stroke consistency (mono uniform stroke).

def slide_11_numerals_ladder() -> tuple[str, str]:
    rows = [
        ("Atoms shipped",             "155",      "+94 vs Vol II"),
        ("Native area, median",       "87 %",    "+29 pp"),
        ("Drift, escape rate",        "0.12 %",  "−2.1 pp"),
        ("Decks compiled, q1",        "1,284",   "+18 %"),
        ("Median compile, per slide", "280 ms",  "−40 ms"),
        ("Issue size, this volume",   "12 frames","of twelve"),
    ]
    table_rows = ""
    for label, value, delta in rows:
        delta_color = (CLAY if delta and delta != "·"
                       and not delta.startswith(("·",)) else SAGE_3)
        table_rows += (
            f'<div style="display:grid;'
            f' grid-template-columns:1fr 200px 220px;'
            f' align-items:baseline; padding:14px 0;'
            f' border-bottom:1px solid rgba(31,41,36,0.08);">'
            f'<span class="mono" style="font-size:12.5px;'
            f' letter-spacing:0.18em; color:{SAGE_2};'
            f' text-transform:uppercase;">{label}</span>'
            f'<span style="font-family:{MONO};'
            f' font-variant-numeric:tabular-nums;'
            f' font-size:26px; font-weight:500; color:{SAGE};'
            f' letter-spacing:-0.005em; text-align:right;">{value}</span>'
            f'<span class="mono" style="font-size:11px;'
            f' letter-spacing:0.18em; color:{delta_color};'
            f' text-align:right; text-transform:uppercase;">{delta}</span>'
            f'</div>'
        )
    body = f"""<div class="slide">
      {_vol_mark(11)}

      <div style="position:absolute; left:64px; top:96px;
                  font-family:{MONO}; font-size:10.5px;
                  letter-spacing:0.32em; color:{SAGE_3};
                  text-transform:uppercase;">
        Colophon — by the numbers
      </div>

      <h2 class="display" style="position:absolute; left:64px; top:130px;
                                  margin:0; font-size:38px; font-weight:300;
                                  color:{SAGE}; letter-spacing:-0.012em;">
        The volume in six figures.
      </h2>

      <div style="position:absolute; left:64px; right:64px; top:208px;
                  bottom:128px;">
        <!-- header rule -->
        <div style="display:grid;
                    grid-template-columns:1fr 200px 220px;
                    align-items:baseline; padding:8px 0;
                    border-top:1px solid {SAGE};
                    border-bottom:1px solid rgba(31,41,36,0.18);">
          <span class="mono" style="font-size:9.5px; letter-spacing:0.32em;
                                     color:{SAGE_3}; text-transform:uppercase;">
            measure</span>
          <span class="mono" style="font-size:9.5px; letter-spacing:0.32em;
                                     color:{SAGE_3}; text-transform:uppercase;
                                     text-align:right;">value</span>
          <span class="mono" style="font-size:9.5px; letter-spacing:0.32em;
                                     color:{SAGE_3}; text-transform:uppercase;
                                     text-align:right;">delta</span>
        </div>
        {table_rows}
      </div>

      {_colophon(11, title='On editing — Colophon')}
    </div>"""
    return "11-numerals-ladder", body


# ---------------------------------------------------------------------------
# §SLIDE 12 — Colophon close
# ---------------------------------------------------------------------------
#
# A single oversize em-dash centered on bone. Almost nothing else.
# The deck's most edited page — the thesis, demonstrated.
#
# Techniques: #25 strategic emptiness as primary element, #14 cropping
#             tension (the dash is small relative to the canvas),
#             #22 multi-axis pairing (clay dash + mono colophon).

def slide_12_close() -> tuple[str, str]:
    body = f"""<div class="slide">
      {_vol_mark(12)}

      <!-- the page is mostly empty -->
      <div style="position:absolute; inset:0; display:flex;
                  flex-direction:column; align-items:center;
                  justify-content:center;">
        <span class="display" style="font-size:200px; line-height:1;
                                      color:{CLAY}; font-weight:300;
                                      letter-spacing:-0.04em;">—</span>
        <p class="display" style="margin-top:48px; font-size:22px;
                                   line-height:1.4; color:{SAGE_2};
                                   font-weight:300; letter-spacing:-0.005em;
                                   text-align:center; max-width:480px;">
          The last cut is the page that<br/>says only what it must.
        </p>
      </div>

      <!-- byline lower-left, mono -->
      <div class="mono" style="position:absolute; left:64px; bottom:80px;
                                font-size:10.5px; letter-spacing:0.18em;
                                color:{SAGE_3}; text-transform:uppercase;
                                line-height:1.7;">
        <div>Studio Atlas</div>
        <div>Vol. III · 2026</div>
        <div style="color:{CLAY};">— set in spectral, inter, jet brains</div>
      </div>

      <!-- pixelpitch mark lower-right -->
      <div class="mono" style="position:absolute; right:64px; bottom:80px;
                                font-size:10.5px; letter-spacing:0.18em;
                                color:{SAGE_3}; text-transform:uppercase;
                                text-align:right; line-height:1.7;">
        <div>Compiled with slidify</div>
        <div>pixelpitch.dev/atlas</div>
        <div style="color:{CLAY};">— end of volume</div>
      </div>

      {_colophon(12, title='On editing — Fin.')}
    </div>"""
    return "12-close", body


SLIDES = [
    slide_01_cover,
    slide_02_index,
    slide_03_opening,
    slide_04_duotone_plate,
    slide_05_one_number,
    slide_06_type_specimen,
    slide_07_pullquote,
    slide_08_cinemagraph,
    slide_09_process_matrix,
    slide_10_highlight_sweep,
    slide_11_numerals_ladder,
    slide_12_close,
]


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for fn in SLIDES:
        stem, body = fn()
        path = OUT_DIR / f"{stem}.html"
        path.write_text(_wrap(stem, body), encoding="utf-8")
        print(f"  {stem}.html  ({len(body):>5} chars)")
    print(f"wrote {len(SLIDES)} slides to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
