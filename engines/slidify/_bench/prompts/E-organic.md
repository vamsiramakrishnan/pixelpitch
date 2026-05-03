### Style brief: ORGANIC / EDITORIAL-WELLNESS

**References:** Headspace marketing pages, Mailchimp pre-2020,
Tiny.cloud, Fey.com, Cosmic.ai, Phantom.app, Replicate.com hero
sections, illustrated brand sites where shapes feel hand-drawn.

**Voice:** warm, considered, second-person. The product is your
companion, not your tool.

**Palette:**
- Bg: warm cream `#fef6e8`, blush `#fde2e4`, mist `#e8f0eb`, or paper
  off-white `#f5f1eb`. Choose one per slide.
- Body text: deep ink `#2d1f1f` or `#1a1a1a`, weight 400-500.
- Accent palette (pick 2-3 per slide):
  `#f4a261` (apricot), `#e76f51` (terracotta), `#264653` (deep teal),
  `#2a9d8f` (sage), `#e9c46a` (butter), `#a78bfa` (lavender),
  `#f7b2a2` (peach), `#9c89b8` (heather).
- No black; use `#2d1f1f` instead.

**Typography:**
- Display: 48-72px, weight 600 (NOT 700-800 — softer), line-height 1.1.
  `font-family: 'Tiempos Headline', 'Source Serif Pro', 'Cormorant',
  Georgia, serif;`.
- Body: 16-18px, weight 400, line-height 1.65 (more breathing room than
  other briefs).
- Labels: 12-13px, weight 500, NOT all caps (use sentence case).
- Numbers: same serif as headlines, NOT monospace.

**Mandatory shape vocabulary (use ≥5 per slide):**
- Inline SVG ORGANIC BLOBS as backgrounds: amorphous closed paths using
  cubic beziers (`M ... C ... C ... C ... Z`) — irregular, NOT
  symmetric. 4-6 control points per blob.
- Inline SVG hand-drawn-feel decoration: a curved underline (single
  cubic bezier stroke) under a heading, a circle that's slightly off
  (3 control points instead of 4), a wavy divider line.
- Soft circles with low-opacity fills as background "ambience".
- Asymmetric layouts — text NOT centered on the canvas; let it sit
  off-axis with the blob filling the negative space.
- Photo frames mocked as `<rect>` with rounded corners and a soft
  drop-shadow (`0 8px 24px rgba(45,31,31,0.10)`).
- Single-color icon glyphs drawn as inline SVG (a heart, a leaf, a sun,
  a wave) using stroked cubic curves at stroke-width 1.5-2px.
- Quote marks: a giant `"` glyph rendered at 120-180px in a faded accent
  color, behind the quote text.

**Layout families:**
1. Hero with blob: large headline left, organic blob + photo-frame mock right.
2. Story page: lede paragraph + inline pull-quote + blob accent in margin.
3. Step-by-step ritual: 3-4 numbered steps with hand-drawn arrows curving
   between them.
4. Feature with breathing room: one centered headline, two small support
   cards, lots of whitespace.
5. Quote-led testimonial: huge quote glyph + 1-line testimonial + name.
6. Call-to-rest: single accent circle, 1-line CTA, footer with three soft
   metadata items.

**Things this brief EXPLICITLY rejects:**
- Dark mode. (Always light.)
- Hard 90-degree corners.
- Mono fonts. Inter sans-serif.
- Multi-stop "tech" gradients (indigo→pink etc.).
- Drop shadows harder than `0 8px 24px rgba(0,0,0,0.10)`.
- Tabular / dashboard / data-density layouts.
- Big numbers as the focal point of any slide.
- Decoration hints (`data-slidify-decorate=hero/glass/etc.`) — this brief
  is about authored organic SVG, not our decoration system.

**Density target:** 12-22 elements per slide. Whitespace is the design.
