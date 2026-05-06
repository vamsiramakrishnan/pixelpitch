# Art Deco

> Category: Themed & Unique
> 1920s glamour meets digital. Gold on black, geometric patterns, luxurious symmetry.

---

## 1. Visual Theme & Atmosphere

This design system channels the opulence and geometric precision of the Art Deco movement (1920-1940). Every surface should evoke the lobbies of the Chrysler Building, the ballrooms of The Great Gatsby, and the gilt facades of Miami's Ocean Drive. The visual language is defined by three pillars:

**Geometric Precision.** Sunburst rays, stepped ziggurats, chevron borders, and fan motifs replace organic curves. Forms are angular, deliberate, and mathematical. Arcs exist only as segments of perfect circles, always paired with straight verticals.

**Luxurious Materiality.** Gold on black is the foundational pairing. Every element should feel as if it were stamped from brushed metal, etched into onyx, or inlaid with ivory. Surfaces carry the weight of marble, lacquer, and polished brass.

**Bilateral Symmetry.** Layouts mirror along a strong vertical axis. Navigation, headings, decorative borders, and card grids honor left-right balance. Asymmetry is used only with intention and always counterweighted visually.

**Mood keywords:** Glamour, permanence, confidence, ceremony, velocity, nightfall, gilt.

**Reference touchstones:**
- Architecture: Chrysler Building crown, Rockefeller Center entrance, Guardian Building lobby
- Graphic design: A.M. Cassandre travel posters, Erte magazine covers, Tamara de Lempicka figure studies
- Film/media: The Great Gatsby (2013 production design), Metropolis (1927), BioShock Rapture interiors
- Typography: Broadway, Futura Display, hand-lettered hotel signage of the 1930s

---

## 2. Color Palette & Roles

### Primary Colors

| Token            | Hex       | Role                                                      |
|------------------|-----------|------------------------------------------------------------|
| `gold`           | `#c9a96e` | Primary accent, interactive elements, key borders, icons   |
| `gold-light`     | `#d4b878` | Hover states, secondary highlights, gradient endpoint      |
| `gold-pale`      | `#e0c88f` | Disabled gold text, faint decorative strokes               |

### Neutral Surfaces

| Token            | Hex       | Role                                                      |
|------------------|-----------|------------------------------------------------------------|
| `black-deep`     | `#0d0d0d` | Page background, primary canvas                            |
| `black-raised`   | `#1a1a1a` | Card backgrounds, elevated containers                      |
| `black-surface`  | `#242424` | Input fields, secondary panels, sidebar backgrounds        |
| `black-border`   | `#2e2e2e` | Subtle structural dividers, table rules                    |

### Accent Neutrals

| Token            | Hex       | Role                                                      |
|------------------|-----------|------------------------------------------------------------|
| `ivory`          | `#f5f0e8` | Primary text color, headings, high-contrast labels         |
| `champagne`      | `#e8dcc8` | Body text, secondary copy, muted labels                    |
| `champagne-mute` | `#b8a88c` | Tertiary text, placeholder content, timestamps             |

### Semantic Colors

| Token            | Hex       | Role                                                      |
|------------------|-----------|------------------------------------------------------------|
| `success`        | `#7a9e6c` | Muted olive-green, approvals, positive signals             |
| `warning`        | `#c9a96e` | Reuse gold for caution; context disambiguates              |
| `error`          | `#a85c4a` | Burnt sienna, errors, destructive actions                  |
| `info`           | `#6a8fa8` | Steel-blue, informational badges and tooltips              |

### Gradient

The signature Art Deco gradient runs from `gold` to `gold-light` at a 135-degree angle. Use it sparingly for hero banners, feature-card top borders, and decorative dividers. Never apply it to body text.

```css
--gradient-gold: linear-gradient(135deg, #c9a96e 0%, #d4b878 100%);
```

### Opacity Rules

- Gold overlays on dark surfaces: max `0.12` opacity for tinted panels.
- Text shadows: `0 1px 2px rgba(0,0,0,0.6)` on gold text over images.
- Decorative background patterns (sunbursts, chevrons): `0.04`-`0.08` opacity.

---

## 3. Typography Rules

### Font Stack

| Role      | Family                          | Stitch Token      |
|-----------|---------------------------------|--------------------|
| Headlines | Playfair Display, Georgia, serif | `PLAYFAIR_DISPLAY` |
| Body      | Inter, system-ui, sans-serif     | `INTER`            |
| Mono      | JetBrains Mono, monospace        | Fallback only      |

### Type Scale

| Level       | Size   | Weight | Line Height | Letter Spacing | Font           |
|-------------|--------|--------|-------------|----------------|----------------|
| Display     | 48px   | 700    | 1.1         | -0.02em        | Playfair Display |
| H1          | 36px   | 700    | 1.15        | -0.01em        | Playfair Display |
| H2          | 28px   | 600    | 1.2         | 0              | Playfair Display |
| H3          | 22px   | 600    | 1.3         | 0.01em         | Playfair Display |
| H4          | 18px   | 600    | 1.35        | 0.01em         | Playfair Display |
| Body-lg     | 16px   | 400    | 1.6         | 0.01em         | Inter            |
| Body        | 14px   | 400    | 1.6         | 0.01em         | Inter            |
| Body-sm     | 13px   | 400    | 1.5         | 0.015em        | Inter            |
| Caption     | 12px   | 500    | 1.4         | 0.04em         | Inter            |
| Overline    | 11px   | 600    | 1.3         | 0.12em         | Inter            |

### Typography Conventions

- **Overline labels** are always uppercase with wide letter spacing. They precede headings and act as categorical tags.
- **Headlines** may use Playfair Display italic for emphasis within a phrase, never for entire blocks.
- **Body text** is always Inter. Never set body copy in Playfair Display.
- **Numeric data** in tables uses tabular figures (`font-variant-numeric: tabular-nums`) in Inter.
- **Gold text** is reserved for headings, navigation labels, and interactive affordances. Body text stays ivory or champagne.
- **All-caps** is permitted for overlines, button labels, and nav items. Never for paragraphs.

---

## 4. Component Stylings

### Geometric Border Frames

The signature Art Deco frame uses stepped corners: small right-angle notches cut from each corner of a rectangular border.

```css
.deco-frame {
  border: 1px solid #c9a96e;
  clip-path: polygon(
    0 8px, 8px 8px, 8px 0,
    calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px,
    100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px),
    calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px),
    0 calc(100% - 8px)
  );
  padding: 24px;
}
```

Alternate: double-rule frames with a 2px outer gold border, 4px gap, and 1px inner gold border.

### Gold-Rule Dividers

Horizontal rules use a centered gold line flanked by decorative endpoints.

```
--- Pattern A: thin gold line, full width ---
  1px solid #c9a96e, 32px margin top/bottom

--- Pattern B: centered segment with diamond endpoints ---
  ◆————————————————◆
  Diamond: 6px rotated square in gold
  Line: 1px, max-width 200px, centered

--- Pattern C: stepped rule ---
  Horizontal bar with a small stepped bump at center, 3px tall
```

### Fan / Sunburst Decorative Elements

Use as section headers or card crowns. Generated via CSS `conic-gradient` or SVG:

- Rays alternate between `gold` at `0.15` opacity and transparent.
- Total arc: 180 degrees (half-fan) or 360 degrees (full sunburst).
- Ray count: 12-24 for half-fan, 24-48 for full sunburst.
- Position: centered above headings or at the top edge of hero sections.

### Chevron Patterns

Repeating V-shapes used as background textures or border accents:

- Stroke: 1px `gold` at `0.06` opacity on dark backgrounds.
- Angle: 120 degrees (wide chevron) or 90 degrees (sharp chevron).
- Use as a tiling background pattern on secondary panels or footer regions.
- Never use on primary reading surfaces; chevrons are atmospheric, not structural.

### Medallion Badges

Circular badges for status, rank, or category indicators:

- Outer ring: 2px gold border.
- Inner fill: `black-raised` (#1a1a1a).
- Content: single icon, numeral, or 1-3 letter abbreviation.
- Size: 32px (small), 48px (medium), 64px (large).
- Optional: radiating tick marks around the outer ring for a clock/compass effect.

### Cards

Cards follow a symmetric, bordered treatment:

- Background: `black-raised` (#1a1a1a).
- Border: 1px `gold` (#c9a96e).
- Border radius: 4px (matching `ROUND_FOUR`).
- Top accent: 2px solid gold bar across the full width, or a stepped-corner frame.
- Padding: 24px.
- Heading: Playfair Display, `ivory`, left or center-aligned.
- Body: Inter, `champagne`.
- Hover: border brightens to `gold-light` (#d4b878); subtle `box-shadow: 0 0 12px rgba(201,169,110,0.15)`.
- Cards in a grid are always equal height and evenly spaced.

### Buttons

| Variant   | Background       | Text     | Border          |
|-----------|------------------|----------|-----------------|
| Primary   | `gold` (#c9a96e) | `black-deep` (#0d0d0d) | none   |
| Secondary | transparent      | `gold`   | 1px solid `gold` |
| Ghost     | transparent      | `ivory`  | none             |

- Border radius: 4px.
- Padding: 12px 28px.
- Font: Inter, 13px, weight 600, uppercase, letter-spacing 0.08em.
- Hover (primary): background shifts to `gold-light`.
- Hover (secondary): background fills to `gold` at 0.08 opacity.
- Active: scale 0.98, 80ms transition.

### Gatsby-Style Navigation

Top navigation bar with a centered logo flanked by symmetric link groups:

```
  PORTFOLIO    GALLERY    ABOUT    [LOGO]    SERVICES    CONTACT    INQUIRE
```

- Background: `black-deep` with a 1px gold bottom border.
- Links: Inter, 12px, weight 600, uppercase, letter-spacing 0.1em, color `champagne`.
- Active link: color `gold`, with a 2px gold underline offset 4px below.
- Logo: centered, Playfair Display, 20px, color `gold`.
- Mobile: collapses to a centered hamburger icon; drawer slides from top with gold border.

### Tables

- Header row: `black-surface` background, `gold` text, Inter 12px uppercase.
- Body rows: alternating `black-deep` / `black-raised`.
- Cell borders: 1px `black-border` (#2e2e2e).
- Bottom rule of header: 2px solid `gold`.
- Numeric columns: right-aligned, tabular figures.

### Form Inputs

- Background: `black-surface` (#242424).
- Border: 1px solid `black-border` (#2e2e2e).
- Focus border: 1px solid `gold`.
- Text: `ivory`, Inter 14px.
- Label: `champagne-mute`, Inter 12px, uppercase, letter-spacing 0.06em.
- Border radius: 4px.

---

## 5. Layout Principles

### Symmetry First

Every layout begins from a vertical center axis. Content blocks, headings, and decorative elements default to centered alignment. Left-aligned body text is permitted within a centered container, but the container itself must sit on the axis.

### Grid System

- Maximum content width: 1200px, centered.
- Column grid: 12 columns, 24px gutter.
- Common arrangements: 1-column (hero), 2-column symmetric, 3-column card grid, 4-column feature grid.
- Sidebar layouts are discouraged; when required, use a narrow 3-column left rail (max 240px) with a gold vertical divider.

### Spacing Scale

Built on an 8px base unit:

| Token  | Value |
|--------|-------|
| xs     | 4px   |
| sm     | 8px   |
| md     | 16px  |
| lg     | 24px  |
| xl     | 32px  |
| 2xl    | 48px  |
| 3xl    | 64px  |
| 4xl    | 96px  |

### Section Rhythm

- Sections separated by 64px-96px vertical space.
- Each section optionally opens with a gold-rule divider (Pattern B or C).
- Section headings: centered, preceded by an uppercase overline in `champagne-mute`.
- Hero sections: minimum 400px height, vertically centered content, optional half-fan sunburst behind the heading.

### Geometric Proportions

- Favor ratios found in Deco architecture: 1:1 (square cards), 2:3 (portrait panels), 3:4 (feature images), 16:9 (hero banners).
- Avoid arbitrary aspect ratios. When cropping images, snap to one of these proportions.

---

## 6. Depth & Elevation

Art Deco depth is communicated through border hierarchy and surface contrast, not through heavy drop shadows. The aesthetic is flat and inlaid, like marquetry or lacquerwork.

### Elevation Levels

| Level | Surface           | Border             | Shadow                                    |
|-------|-------------------|---------------------|-------------------------------------------|
| 0     | `black-deep`      | none                | none                                      |
| 1     | `black-raised`    | 1px `black-border`  | none                                      |
| 2     | `black-raised`    | 1px `gold`          | `0 2px 8px rgba(0,0,0,0.4)`              |
| 3     | `black-surface`   | 2px `gold`          | `0 4px 16px rgba(0,0,0,0.5)`             |
| Modal | `black-raised`    | 2px `gold` + stepped corners | `0 8px 32px rgba(0,0,0,0.7)` |

### Overlay & Backdrop

- Modal backdrops: `black-deep` at 0.75 opacity.
- Toast/snackbar: elevation 2, positioned top-center (honoring symmetry).
- Tooltips: `black-surface`, 1px gold border, 4px radius, no arrow (use a centered position above the trigger).

### Decorative Depth

- Inset borders: simulate depth by placing a 1px `black-border` line 4px inside a gold outer border.
- Stepped shadows: instead of blur, offset a solid `black-deep` rectangle 3px right and 3px down behind a gold-bordered element.
- Gilt edge effect: apply a `gold` top/left border and a `gold-pale` bottom/right border to simulate directional lighting on a metallic surface.

---

## 7. Do's and Don'ts

### Do

- Use gold as the dominant accent. It is the visual anchor of the entire system.
- Maintain strict bilateral symmetry in layouts, especially for hero sections and card grids.
- Use geometric decorative elements (fans, sunbursts, chevrons, stepped corners) to reinforce the Deco identity.
- Pair Playfair Display headlines with Inter body text. The serif/sans contrast mirrors the ornament/function duality of Art Deco.
- Keep backgrounds dark. The `black-deep` / `black-raised` palette is non-negotiable for the intended atmosphere.
- Use uppercase sparingly and deliberately: navigation labels, overlines, button text.
- Let whitespace (or rather, dark space) breathe. Deco is about confident negative space as much as ornament.
- Test gold text against dark backgrounds for WCAG AA contrast (the `gold` / `black-deep` pairing passes at 7.2:1).

### Don't

- Do not introduce rounded or pill-shaped elements. Border radius is 4px maximum. Circles are used only for medallion badges and avatar frames.
- Do not use organic shapes, hand-drawn textures, or watercolor effects. Art Deco is mechanical and precise.
- Do not mix warm and cool neutrals. Stay within the ivory-champagne-gold warm spectrum.
- Do not use gradients on text (the gold gradient is for borders and backgrounds only).
- Do not apply gold to large surface areas (full-bleed gold backgrounds). Gold is an accent, not a canvas.
- Do not use more than two typefaces. Playfair Display and Inter are the complete set.
- Do not use drop shadows heavier than the defined elevation levels. Subtlety is key.
- Do not center body paragraphs. Center the container; left-align the text within it.
- Do not use emoji or playful iconography. Icons should be geometric line-art in gold or ivory.

---

## 8. Responsive Behavior

### Breakpoints

| Name    | Width     | Columns | Gutter | Content Max-Width |
|---------|-----------|---------|--------|-------------------|
| Mobile  | < 640px   | 4       | 16px   | 100% - 32px       |
| Tablet  | 640-1024px| 8       | 20px   | 100% - 48px       |
| Desktop | > 1024px  | 12      | 24px   | 1200px             |

### Adaptive Rules

- **Navigation:** Desktop shows the full Gatsby-style centered nav. Tablet collapses to logo + hamburger. Mobile uses a full-screen gold-bordered drawer.
- **Card grids:** Desktop 3-4 columns, tablet 2 columns, mobile single column stacked.
- **Hero sections:** Desktop uses large Display type (48px). Tablet reduces to 36px. Mobile reduces to 28px. Sunburst decorations scale proportionally or hide below tablet.
- **Decorative elements:** Stepped-corner clip paths and chevron patterns remain on desktop and tablet. On mobile, simplify to straight gold borders to avoid rendering artifacts at small sizes.
- **Typography:** Body text stays at 14px across all breakpoints. Line length should not exceed 70 characters; use `max-width: 640px` on prose blocks.
- **Spacing:** Vertical section spacing reduces from 96px (desktop) to 64px (tablet) to 48px (mobile).
- **Symmetry:** Centered layouts hold at all breakpoints. Do not switch to left-aligned on mobile.

### Touch Targets

- Minimum interactive size: 44x44px.
- Buttons gain 4px extra vertical padding on mobile.
- Navigation drawer items: 48px row height with gold separators.

---

## 9. Agent Prompt Guide

When generating UI with this Art Deco design system, follow these instructions:

### Surface & Background

Always start with a `#0d0d0d` page background. Elevated containers use `#1a1a1a`. Never use white, light gray, or any light-mode surface. This is a dark-mode-only system.

### Gold Usage

Gold (`#c9a96e`) is the single accent color. Apply it to: borders, headings, navigation labels, icons, button fills, dividers, and decorative elements. Do not apply gold as a background fill for large areas. Do not introduce secondary accent colors (no teal, no coral, no purple).

### Typography Pairing

Set all headings (h1-h4, display) in Playfair Display. Set all body text, labels, captions, and UI chrome in Inter. Use italic Playfair Display only for single emphasized words within a heading. Never italicize Inter in this system.

### Decorative Identity

Include at least one geometric decorative element per major section: a gold-rule divider, a stepped-corner frame, a fan/sunburst motif, or a chevron background pattern. These elements are the visual DNA of the system. Without them, the output reads as a generic dark theme.

### Layout Discipline

Center all section content on the page axis. Use symmetric column counts (2, 4) for card grids when possible. Three-column grids are acceptable when three items is the natural count. Never use off-center or magazine-style asymmetric layouts.

### Stitch Token Mapping

When applying this design system through Stitch, use these exact values:

```
Primary color:   #c9a96e
Color mode:      DARK
Color variant:   MONOCHROME
Headline font:   PLAYFAIR_DISPLAY
Body font:       INTER
Roundness:       ROUND_FOUR
```

### Component Checklist

When building a page, verify the following Art Deco markers are present:

- [ ] Page background is `#0d0d0d`
- [ ] At least one gold-bordered card or frame with stepped corners
- [ ] Gold-rule divider between major sections
- [ ] Navigation uses centered Gatsby-style layout or gold-accented mobile drawer
- [ ] Headings are Playfair Display in ivory or gold
- [ ] Body text is Inter in champagne
- [ ] Buttons follow the primary/secondary/ghost spec
- [ ] No border-radius exceeds 4px (except circular medallion badges)
- [ ] Uppercase overline labels precede section headings
- [ ] Layout is bilaterally symmetric

### Tone of Generated Copy

When generating placeholder or example copy, adopt a tone of confident elegance. Short, declarative statements. Avoid casual language, exclamation marks, or emoji. Think hotel branding, gallery invitations, and private-club communications.

Example heading: "An Evening of Distinction"
Example overline: "EXCLUSIVELY CURATED"
Example CTA: "REQUEST AN INVITATION"
