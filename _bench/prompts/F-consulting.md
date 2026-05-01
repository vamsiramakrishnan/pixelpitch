### Style brief: CONSULTING REPORT

**References:** the well-designed McKinsey decks (the Quarterly's slide
PDFs), BCG's strategic briefs, Bain charts, Gartner reports, Deloitte
Insights, A.T. Kearney point-of-views. Think mid-tier-consulting at its
most disciplined — not flashy.

**Voice:** measured, hedged, footnoted. Sentences end with year and
source citations. "Three forces are reshaping..." cadence.

**Palette:**
- Bg: paper white `#ffffff` or warm gray `#f7f5f2`.
- Primary text: `#1a1a1a` near-black.
- Brand accent ONE color for the whole deck (pick one — don't use multiple):
  - Navy: `#0b3a5c`
  - Burgundy: `#7a1f3d`
  - Forest: `#1e4e3a`
  - Slate: `#2c3e50`
- Secondary palette (for series in charts): muted, desaturated:
  `#94a3b8` (slate-300), `#64748b` (slate-500), `#475569` (slate-600).
- Faint grid lines: rgba(0,0,0,0.06).

**Typography:**
- Headline: 28-36px, weight 600, **letter-spacing -0.01em**, line-height 1.2.
  `font-family: 'Source Serif Pro', 'Tiempos', Georgia, serif;`.
- Sub-headline: 18px, weight 400, italic, color `#475569`.
- Body: 13-14px, weight 400, line-height 1.5.
  `font-family: 'Inter', 'Helvetica Neue', sans-serif;` (sans for body, serif for headlines).
- Footnote: 10-11px, color `#475569`. Always present.
- Page number / footer: 10px, all-caps, letter-spacing 0.15em.
- Numeric: tabular-nums, sans-serif, NOT serif.

**Mandatory shape vocabulary (use ≥6 per slide):**
- Strict 12-column grid — every element snaps to it.
- Source citation at slide bottom: small italic line (`Source: Bain
  analysis · 2026; based on n=412 enterprise software buyers, Q3 2025`).
- Footnote markers: superscript `<sup>1</sup>` next to data points.
- 2x2, 3x3, or 4x4 strategic matrix (BCG-style or McKinsey 2×2):
  border + 4 quadrants + axis labels.
- Horizontal stacked bar chart with percentage labels on each segment.
- Numbered list with tight typography (1., 2., 3.) — three or five items.
- Comparison table built from CSS grid (NOT `<table>`): 4-6 rows,
  4-5 columns, with subtle row striping (alt rows light gray bg).
- Hierarchical waterfall / decomposition chart: starts at a total,
  shows additions/subtractions with tiny labeled bars.
- "Pull-out" callout box: a 1px-bordered rectangle with bold heading +
  1-2 lines of takeaway.

**Layout families:**
1. Title + lede + 2×2 matrix + source line.
2. Title + horizontal bar chart + 3 takeaway points sidebar.
3. Title + 4-column comparison table + footnotes.
4. Title + numbered insights (1-5) each with 1-line elaboration.
5. Title + waterfall chart + calc-detail box on side.
6. Cover-style: report name, deck title, date, prepared-for line, page footer.

**Things this brief EXPLICITLY rejects:**
- Gradients (zero — flat fills only).
- Drop shadows.
- Rounded corners (border-radius 0 OR 2-4px max for table cells).
- Decoration system hints.
- Bright / saturated colors.
- Display typography above 40px.
- Background imagery / illustration.
- Casual voice. Sentences must look like they were copyedited by a McK partner.

**Density target:** 35-60 elements per slide (consulting decks are dense
with text and small data marks).
