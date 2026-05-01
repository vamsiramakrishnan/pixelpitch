### Style brief: EDITORIAL DATA JOURNALISM

**References to absorb (mental mood-board, not citations):**
NYT Upshot graphics, Reuters Graphics, FT Visual Vocabulary, The Pudding,
Bloomberg Businessweek charts, ProPublica investigations.

**Voice:** authoritative, restrained, evidence-led. Captions read like a
beat reporter wrote them, not a copywriter.

**Palette (constrain to these):**
- Page bg:   `#fafaf6` (newsprint cream) OR `#0f1216` (quiet ink)
- Body text: `#1a1a1a` on cream / `#e8e8e0` on dark
- Series A:  `#c41e3a` (NYT red)
- Series B:  `#1e5f8c` (Reuters blue)
- Series C:  `#d4a017` (FT amber)
- Neutral grid: rgba(0,0,0,0.06) on cream / rgba(255,255,255,0.06) on dark
- Annotation callout: pure black border 1px, no fill, on cream

**Typography (load via system fallback chain — Inter is bundled, but
write CSS that EXPRESSES the editorial intent so the styling info
survives):**
- Display headline: 56-72px, weight 700, **letter-spacing -0.02em**,
  line-height 1.05. Use `font-family: 'Source Serif Pro', 'Tiempos',
  Georgia, serif;` (renders as Inter via fallback but the intent is
  recorded — and slidify's font_family field captures it).
- Sub-deck (kicker): 11px, weight 700, letter-spacing 0.18em, uppercase.
- Body / lede: 16-18px, weight 400, line-height 1.55.
- Caption / footnote: 11-12px, italic, color rgba(0,0,0,0.55).
- Tabular nums: monospace for any numeric column.

**Mandatory shape vocabulary per slide (use ≥4 of these):**
- Inline SVG line chart with **gridlines, x/y axis labels, data points,
  and 1-2 annotated callouts** (use `<line>` + `<polyline>` + `<text>`).
- Inline SVG scatter — `<circle>` clouds with varying r/fill-opacity.
- Small multiples: a 2×3 grid of tiny charts inside one card.
- Bar chart: native shapes (`<rect>`s) with value labels above each bar.
- Sparklines: 60-80px wide inline SVG `<polyline>` strokes.
- Annotated callout: a labeled line drawn FROM a data point TO an
  explanatory text. SVG `<line>` + nearby `<text>`.
- Geometric source-data badge: small bordered rectangle saying
  "Source · The Times analysis of FEC filings" or similar.
- Choropleth-style block grid: 50-state grid, each state a tiny rect
  whose fill encodes a value (mock the data; just exercise the shapes).
- Ranked-list with leader bars: name + horizontal bar + numeric value.

**Layout families (use a different one per slide):**
1. Headline + lede + dominant chart + sidebar of small annotations
2. Headline + 2-up split (left chart, right chart with different scale)
3. Lede + small-multiples grid (3×2 or 2×3 charts)
4. Single-column long article style: headline, lede, pull-quote,
   inline chart, conclusion
5. Map-style block grid + ranked-list sidebar
6. Comparison table (CSS grid, NOT `<table>`) with delta indicators

**Things this brief EXPLICITLY rejects:**
- Gradients (no `linear-gradient` or `radial-gradient` — editorial is
  flat color and solid fills).
- `data-slidify-decorate="hero"` / `aurora` / `glass` / etc. — this
  brief renders without our decoration system. Test slidify's native
  emit on FLAT designs.
- Drop shadows on text or cards.
- Rounded corners on charts or data containers.
- Display font sizes above 80px.
- Emoji, dingbats, brand logos.
