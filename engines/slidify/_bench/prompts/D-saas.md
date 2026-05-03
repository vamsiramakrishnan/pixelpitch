### Style brief: MODERN-SAAS / STRIPE-VERCEL HERO

**References:** Stripe Sessions slides, Linear Move, Vercel Ship,
Anthropic homepage, Cursor's launch material, Notion's marketing site,
Resend's homepage, Clay's deck.

**Voice:** confident, succinct, slightly aspirational. Marketing-grade
but not buzzwordy.

**Palette:**
- Bg: deep gradient — `radial-gradient(at 30% 20%, #1e1b4b 0%, #050510 70%)`
  or similar dark-to-darker. Multi-stop, 3+ stops.
- Brand gradients (use one per slide, multi-stop):
  - Indigo→pink: `#818cf8 → #c084fc → #ec4899`
  - Cyan→indigo: `#06b6d4 → #6366f1`
  - Lime→emerald: `#a3e635 → #10b981`
  - Amber→pink: `#fbbf24 → #ec4899`
- Text: `#f5f5f7` primary, `#a1a1aa` secondary, `#52525b` tertiary.
- Card surfaces: `#0f0f1f` to `#15152b` with `border: 1px solid
  rgba(255,255,255,0.08)`.

**Typography:**
- Display: 64-96px, weight 800, letter-spacing -0.035em, line-height 0.96.
  `font-family: Inter, sans-serif`.
- Section headline: 36-48px, weight 700.
- Body: 16-18px, weight 400, line-height 1.55, color `#a1a1aa`.
- Kicker: 13px, weight 700, letter-spacing 0.18em, uppercase.
- Stat numbers: 64-128px, weight 800, gradient-clipped text via
  `background-clip: text; color: transparent`.

**Mandatory shape vocabulary (use ≥5 per slide):**
- Multi-stop linear-gradient backgrounds on cards (≥3 stops so OKLCH
  densification kicks in).
- `data-slidify-decorate="hero"` on the slide bg AND on featured cards.
- `data-slidify-decorate="glass"` on stat / pricing / feature cards.
- `data-slidify-decorate="tactile"` on CTAs.
- Rounded corners (border-radius 16-24px on cards, 9999px on pills).
- Multi-layer box-shadows on cards (decompose to 2 stacked shadows like
  `0 12px 40px rgba(0,0,0,0.18), 0 4px 6px rgba(0,0,0,0.10)`).
- Inline-flex pill tags with `<span>` runs: status indicator dot + text.
- Status pills with 0.12 alpha tinted bg + matching colored text.
- Inline SVG abstract decorative arcs (cubic bezier curves) bleeding from
  corners — keep these to 5 primitives MAX per SVG (slidify capture cap).
- Gradient-clipped text on accent words within paragraphs.

**Layout families:**
1. Hero: bg-gradient, big gradient-clipped headline, lede, dual CTA.
2. Stats trio: 3 stat cards in a row, each `glass`, each with delta pill.
3. Pricing tiers: 3-column, middle `hero`, others `glass`. Feature list with check pills.
4. Feature bento: 1 large hero tile + 4 small mixed-aspect tiles.
5. Quote wall: 3 testimonial cards with avatar circles (gradient fills).
6. CTA closing: huge gradient headline, sub, 2-3 buttons (`tactile`),
   social-proof badge row.

**Things this brief EXPLICITLY rejects:**
- Light backgrounds. Always dark.
- Sans-serif other than Inter.
- Sharp 90-degree corners on content cards.
- More than 2 distinct gradient palettes per slide (one bg + one accent).
- Editorial / data-journalism long-form text.
- Mono fonts.

**Density target:** 18-30 distinct elements per slide.
