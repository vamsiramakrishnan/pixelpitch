### Style brief: APPLE-KEYNOTE / PRODUCT REVEAL

**References:** Apple keynote slides (Tim Cook era), Vision Pro reveal,
Tesla unveils, Rauno Freiberg's portfolio, Linear's ChangeLog hero
images, Arc browser launch slides.

**Voice:** declarative, confident, single-sentence-per-slide. Each slide
is one moment in a story.

**Palette:**
- Page bg: pure `#000000` OR pure `#ffffff` (no in-between greys).
- Text: `#ffffff` on black / `#000000` on white. ONE accent color
  per slide chosen from: `#0a84ff` (Apple blue), `#ff453a` (red),
  `#bf5af2` (purple), `#30d158` (green), `#ff9f0a` (orange).
- No gradients except as the accent on a SINGLE element per slide.

**Typography:**
- Display: 110-180px, weight 700-800, **letter-spacing -0.04em**,
  line-height 0.92. Use `font-family: 'SF Pro Display', -apple-system,
  Inter, sans-serif;`.
- Sub-display: 22-28px, weight 400, line-height 1.3, color rgba(255,255,255,0.65)
  on dark.
- Mini-label / kicker: 11px, uppercase, letter-spacing 0.22em, weight 600.
- Pricing / spec numbers: tabular-nums monospace at display size.

**Mandatory shape vocabulary (use ≥3 of these per slide):**
- Inline SVG abstract product silhouette: a single complex `<path d>`
  using cubic bezier curves (`C` commands). Render in solid accent or
  outlined (stroke 2-3px, no fill). Examples to draw:
  - A device silhouette (rectangle with rounded corners, abstract).
  - A spec callout: a circle + a thin line + a label, exploded-view style.
  - A radial dial / gauge ring.
  - An abstract "feature glyph" — 3-5 stroked geometric shapes
    (circles, triangles, hexagons) arranged in a constellation.
- Tabular numeric block: a single huge number (180-240px) + a tiny
  label below ("Battery life", "Megapixels", "Watts").
- Spec list: 3-5 rows of small label + tabular number, vertically stacked,
  with hairline 1px dividers between.
- Comparison badge: two small rects side-by-side with "Was: X" / "Now: Y".
- Feature pill: a single rounded pill (border-radius:9999px) with text.

**Layout families:**
1. Hero number — one massive metric (`240px`) centered + 1-line caption + tiny footer.
2. Title-only — single big sentence at top, white space below, page number.
3. Product spec sheet — abstract silhouette on left, spec list on right.
4. Comparison reveal — Was / Now side-by-side, large numbers.
5. Feature mosaic — 2×2 or 3×2 grid of abstract feature glyphs + labels.
6. Quote slide — large pull-quote, attribution, single accent dot.

**Things this brief EXPLICITLY rejects:**
- Multiple accent colors per slide.
- Decorative SVG blobs (mesh / aurora / glass / hero — none of those).
- Background images. Background gradients. Glass surfaces.
- Card outlines. Drop shadows on body content.
- More than ~30 distinct visual elements per slide. Density is LOW.
- Body copy paragraphs longer than 2 lines.

**Density target:** 8-15 distinct elements per slide (sparser than other
briefs — the keynote aesthetic IS the whitespace).
