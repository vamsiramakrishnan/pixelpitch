# D&A Force Multipliers

> Category: Editorial & Print
> Google Cloud APAC Data & Analytics editorial sales system. Five-token palette, four-face typography, hairline depth, one signal accent per slide.

## 1. Visual Theme & Atmosphere

D&A Force Multipliers is an editorial design system for sales artifacts — decks, field journals, scorecards, one-pagers — that read like a printed quarterly, not a SaaS pitch. The aesthetic north star is Bloomberg Businessweek meets The Economist meets WIRED feature. Confidence through restraint. Information-dense pages where typography does the hierarchy work.

The entire chrome palette is five values. The canvas is warm bone newsprint (`#F4EFE6`), not digital white. Depth comes from rule weight (1px–3px hairlines), never from shadows. Corners are square — `border-radius: 0` is law, with only two exceptions: `50%` for circular dots/avatars and `999px` for inline pill spans. One accent color — telex orange (`#D94F1B`) — appears in exactly one element per slide. Two is a bug.

Typography carries the entire hierarchy. Four typefaces in four strictly non-interchangeable roles: Fraunces for display headlines and hero numerals, Source Serif 4 for long-form reading, Geist for UI chrome, JetBrains Mono for ALL-CAPS kickers and metadata. Headlines are set tight (0.95 line-height) while body opens to 1.55 — the contrast is the editorial fingerprint. Every slide carries a mono ALL-CAPS kicker above its headline. Every datum carries a mono-caps source line.

**Key Characteristics:**
- Warm newsprint canvas (`#F4EFE6`) evoking printed editorial, not screens
- Five-token palette: paper, bone, ink, slate, signal — nothing else in chrome
- Four typefaces in four locked lanes — Fraunces, Source Serif 4, Geist, JetBrains Mono
- One signal-orange element per slide maximum (the "rule of one")
- Depth from hairline rule weight, never shadows or gradients
- Square corners everywhere — `border-radius: 0` is the default
- Mono ALL-CAPS kickers above every headline, 0.14em tracking
- Editorial voice: sentences over fragments, specific over universal, no marketing register

## 2. Color Palette & Roles

### Primary
- **Paper** (`#F4EFE6`): Default canvas. Warm bone with a newsprint feel. Every surface starts here. The emotional foundation — this is not white, it is aged paper.
- **Ink** (`#111111`): Primary text, hairlines, ribbons, diagram strokes. Not pure black — a near-black with enough warmth to feel printed. Contrast on Paper: 16.49:1 (AAA).

### Secondary & Accent
- **Slate** (`#6B6862`): Captions, metadata, secondary text. A warm medium-dark gray with olive undertones. Never used for headlines. Contrast on Paper: 4.85:1 (AA).
- **Signal** (`#D94F1B`): Telex orange. The singular accent. Used for ONE element per slide maximum — a drop cap, an underlined italic word, a chart stroke, a glyph mark. Never a fill block, never decorative. Contrast on Paper: 3.61:1 (AA-lg, display use only).

### Surface & Background
- **Bone** (`#E6E0D2`): Quoted blocks, sidebars, photo mattes. A slightly warmer, slightly darker variant of Paper. Use sparingly — it exists to create subtle inset zones, not to tile the page.
- **Ink (inverted)** (`#111111`): Section opener backgrounds. Paper text on Ink surface maintains 16.49:1 (AAA).

### Semantic Aliases
- `--canvas`: aliases `--paper`
- `--text`: aliases `--ink`
- `--text-muted`: aliases `--slate`
- `--rule`: aliases `--ink` (hairlines are pure ink)
- `--rule-quiet`: `rgba(17,17,17,0.18)` (quietest divider, 18% ink)
- `--accent`: aliases `--signal`

### Gradient System
D&A Force Multipliers is **gradient-free** in chrome. Gradients exist only inside photographs (natural light) and inside the subtle paper-grain texture (a repeating SVG dot pattern at 0.018 opacity). If a gradient appears in UI chrome, it is broken — strip it.

## 3. Typography Rules

### Font Family
- **Display**: `Fraunces` (variable serif, optical-sized 9–144), fallback: `Times New Roman`, serif
- **Body**: `Source Serif 4` (humanist serif, optical-sized 8–60), fallback: `Georgia`, serif
- **UI**: `Geist` (geometric sans), fallback: system-ui, -apple-system, Helvetica Neue, sans-serif
- **Mono**: `JetBrains Mono`, fallback: IBM Plex Mono, ui-monospace, Menlo, monospace

*All four faces load via Google Fonts CDN. They never trade roles.*

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero | Fraunces | 96px | 400 | 0.95 | -0.02em | Section opener / title slide. opsz 144, SOFT 0 |
| Display | Fraunces | 72px | 400 | 0.95 | -0.02em | Slide headline, single line preferred. opsz 144 |
| Headline | Fraunces | 54px | 400 | 1.10 | -0.02em | Standard slide headline. opsz 96 |
| Subhead | Fraunces | 36px | 400 | 1.10 | normal | Slide subheadline / deck-level lead. opsz 48 |
| Lead | Source Serif 4 | 28px | 400 | 1.35 | normal | Long-form lead paragraph |
| Body | Source Serif 4 | 22px | 400 | 1.55 | normal | Body copy, floor for reading text. Max-width 62ch |
| Caption | Geist | 16px | 500 | 1.35 | normal | Captions, metadata, footnotes. Slate color |
| Kicker | JetBrains Mono | 14px | 500 | 1.00 | 0.14em | ALL-CAPS kicker above every headline. Non-negotiable |
| Meta / Page Num | JetBrains Mono | 13px | 500 | 1.00 | 0.06em | Slide numbers, page marks, folio strip |

### Principles
- **Tight headlines, generous body.** Display runs at 0.95; body opens to 1.55. This contrast is the editorial fingerprint.
- **Mono is always uppercase** with 0.14em tracking. Lowercase mono is broken — it must not appear anywhere.
- **Bold is rare.** Fraunces at display size uses size and ink, not weight (400 default). Source Serif 4 body uses 600 only for rare emphasized nouns. Display emphasis weight is 600, reserved for one word.
- **Two letter-spacing registers.** Negative (-0.02em) on display serif. Positive (0.14em) on mono caps. Neutral on everything else.
- **Drop cap once per essay.** Five-line Fraunces drop cap, signal orange, opening the first paragraph only. Every subsequent paragraph is flat body.
- **One italic per slide.** Italic emphasizes one word inside a headline — never a phrase, never body copy. The italic is also the signal-orange underline target (`.t-em`).

## 4. Component Stylings

### Buttons
Buttons appear sparingly — only on companion one-pagers and digital field journals, never on deck slides.

**Default**
- Background: Paper (`#F4EFE6`)
- Border: 2px solid Ink (`#111111`)
- Radius: 0 (square corners, always)
- Text: Geist 15px weight 500, uppercase, 0.02em tracking
- Hover: inverts (Ink background, Paper text)

**Ink (Primary)**
- Background: Ink (`#111111`), Text: Paper (`#F4EFE6`)
- Hover: inverts to Paper bg, Ink text
- Same border and radius as default

**Ghost**
- No border. Text underlined with 2px Signal (`#D94F1B`) underline, 4px offset
- Hover: none (the underline is the affordance)

### Cards & Containers
There are **no cards** in this system. No tiles, no toasts, no modals. Content is separated by hairline rules and whitespace, never by elevated surfaces. If a card appears, it is broken — replace it with a hairline-separated layout.

### Navigation
- **Masthead**: Display logotype (Fraunces 64px, `D&A` with signal-orange italic ampersand) + mono tagline block. Bounded by 4px ink rule above, 1px ink rule below.
- **Folio strip**: Every slide carries a bottom folio — chapter label at left, page number at right, separated from body by 1px ink rule. JetBrains Mono 12px, 0.12em tracking, uppercase, Slate color.
- **Page chrome**: Top hairline at 3% from top with masthead left, folio right, 1px ink border-bottom at 60% opacity.

### Image Treatment
- All imagery is **black-and-white documentary**. Grayscale-converted with mild contrast bump.
- CSS filter: `grayscale(1) contrast(1.12) brightness(0.95) sepia(0.18)`
- Square corners, edge-to-edge. No rounded frames.
- Warm paper wash overlay via `mix-blend-mode: multiply` at low opacity.
- Halftone dot pattern overlay (3px repeat, 0.018 opacity) for editorial print feel.
- Captions sit directly under the image in italic Source Serif 4 14px, Slate color.
- No filters, no duotones in brand colors, no warm tinted overlays.

### Distinctive Components

**Story Tile**
- Image rectangle + kicker + headline + deck, separated from neighbors by hairlines, never by cards.
- Kicker: JetBrains Mono 13px, 0.14em, uppercase, optional signal dot (8px square).
- Headline: Fraunces 28px weight 400, -0.015em tracking.
- Deck: Source Serif 4 17px, 1.45 line-height.
- Meta: JetBrains Mono 11px, 0.1em, uppercase, Slate.

**Pull Quote**
- 3px ink display rule top, 1px ink hairline bottom.
- Signal-orange glyph mark (`"`) in Fraunces 96px.
- Blockquote in Fraunces 36–56px weight 400, 1.15 line-height.
- Attribution in JetBrains Mono 12px, 0.12em, uppercase, Slate.

**Numbered List (Most Cited)**
- 2-column grid, 6 items max. Hairline between each item.
- Numerals: Fraunces 56px weight 400, -0.02em, 0.85 line-height.
- One entry may carry signal-orange numeral — max one per list.
- Item headline: Fraunces 26px. Item body: Source Serif 4 16px.

**Rubric Scorecard**
- Table with hairline rules. Bold 2px ink rule under header row.
- Headers: JetBrains Mono 12px, 0.14em, uppercase, Slate.
- Capability column: Fraunces 22px weight 400, 1.15 line-height.
- Diagnostic column: Source Serif 4 16px, 1.5 line-height.
- Score: 5-block visual indicator (14px squares, filled Ink or outlined). One row may carry signal-orange fill.

**Ribbon**
- Inline-flex black bar with mono caps inside. Section markers, chapter labels.
- Background: Ink. Text: Paper. JetBrains Mono 13px, 0.12em, uppercase.
- Signal variant (`ribbon--signal`): Signal background, Paper text. Reserved for live/breaking only.

**Iconography**
- 1.5px ink stroke, square corners (miter joins), no fill, no color.
- Size: 64px on slide chrome, 48px inline in body.
- Canonical vocabulary: warehouse, compounding, cycle time, rubric, field note, playbook.
- One optional 6px signal dot on a glyph terminus — only when the icon is the slide's sole accent.
- No icon libraries (Lucide, Heroicons). Missing glyphs drawn inline as SVG.

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: `--s-1` 4px, `--s-2` 8px, `--s-3` 16px, `--s-4` 24px, `--s-5` 32px, `--s-6` 48px, `--s-7` 64px, `--s-8` 96px, `--s-9` 128px
- Kicker → headline gap: 8px
- Headline → deck gap: 16px
- Body paragraph spacing: 24px
- Section break within slide: 48–64px
- Slide outer margin: 96px (64px for tight layouts)

### Grid & Container
- Slide canvas: 1920 × 1080 (fixed, not responsive)
- Grid: 12 columns, 32px gutters, 96px outer margins
- Hero headlines: full 12 columns
- Numbered lists and rubrics: 4 + 8 column split
- Body copy: 6-column inset, capped at `--measure: 62ch` (optimal reading column)
- Folio chrome: 8% left/right margins, top rule at 3%, footer at 3.5% from bottom

### Whitespace Philosophy
- **Editorial pacing**: Each slide is a spread in a printed quarterly. Generous vertical spacing (48–96px) between major blocks creates distinct reading zones.
- **Density in content, void in structure**: Body text is tight and information-dense (22px, 1.55 line-height, 62ch measure). But the space between sections is vast. The content earns its density by being surrounded by breathing room.
- **The hairline is the space**: Where other systems use cards and padding to separate content, this system uses a 1px ink rule and whitespace. The rule is the separator; the whitespace is the padding.

### Border Radius Scale
- **Square** (0): Everything. Every container, every image, every button, every table.
- **Circle** (50%): Author dots, meta dots, avatar circles. Only geometric circles.
- **Pill** (999px): Inline text spans only (`LIVE`, `BREAKING`). Never on containers.

There is no 4px, 8px, 12px, or 16px radius in this system.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, no border | Default canvas, body text |
| Quiet (Level 1) | `1px solid rgba(17,17,17,0.18)` | List item separators inside dense blocks |
| Hairline (Level 2) | `1px solid #111111` | Default editorial divider, story-to-story, folio strip |
| Bold (Level 3) | `2px solid #111111` | Slide chapter break, section header underline |
| Display (Level 4) | `3px solid #111111` | Title-slide masthead rule. Used once per slide |
| Inverted (Level 5) | Ink background, Paper text | Section openers, ribbon labels |

**Shadow Philosophy**: There are zero shadows in this system. Zero. Depth is communicated entirely through rule weight — a 1px hairline whispers, a 3px display rule shouts. The hierarchy is: quiet → hair → bold → display. If a `box-shadow` appears anywhere, it is a bug — replace it with a hairline rule or a bold border.

### Decorative Depth
- **Paper grain texture**: A subtle repeating SVG dot pattern (`radial-gradient` at 0.018 opacity) applied to every slide canvas. Creates a newsprint micro-texture.
- **Inverted sections**: Section openers flip to Ink background with Paper text. This is the strongest depth move — an entire surface color change, not a shadow lift.

## 7. Do's and Don'ts

### Do
- Use Paper (`#F4EFE6`) as the default canvas on every slide and card
- Put a mono ALL-CAPS kicker above every headline (JetBrains Mono 14px, 0.14em tracking)
- Use Source Serif 4 for any paragraph longer than two lines — Geist is for UI chrome, not reading
- Keep images square-cornered, edge-to-edge, grayscale, with italic captions hugging the bottom edge
- Separate content with hairline rules or whitespace, never with cards or shadows
- Scale headlines aggressively: 96–110px on hero, 44–56px on body slides — no "safe middle" at 32px
- Underline one italic word per headline in Signal (`#D94F1B`) — and only one
- Source every datum in mono caps: source, date, n
- Write editorial sentences: "A field guide to migration objections" not "Migration Objections, Solved."

### Don't
- Don't add `box-shadow` — anywhere, ever, for any reason
- Don't round corners on rectangular containers — `border-radius: 0` is law
- Don't mix typeface roles: Fraunces never sets body, Source Serif 4 never sets buttons, Geist never sets headlines, JetBrains Mono is never lowercase
- Don't use color outside the five tokens (ink, slate, paper, bone, signal) — no green, no blue, no purple in chrome
- Don't paint two things Signal on the same slide — the rule of one is non-negotiable
- Don't use gradients, blurs, glassmorphism, or atmospheric effects in chrome
- Don't use emoji, Lucide, Heroicons, Inter, or Roboto
- Don't write marketing register ("Solved.", "Reimagined.", "Powered by") — write editorial sentences
- Don't use exclamation marks, question-mark headlines (unless the question is the thesis), or fragment phrasing

## 8. Responsive Behavior

### Canvas
This is a **fixed-canvas** system. The primary artifacts are 1920×1080 slide decks and their PPTX exports. Sizes in `colors_and_type.css` are in px, not rem, because the deck and its export are fixed. Preview cards may rescale when embedded in flowing layouts, but the slide canvas itself does not reflow.

### Breakpoints
Not applicable in the traditional sense. The system has one canvas size (1920×1080) with two margin modes:
- **Standard**: 96px outer margin (`--grid-margin`)
- **Tight**: 64px outer margin (`--grid-margin-tight`) for dense data slides

### Touch Targets
Not applicable — this system produces editorial print artifacts (decks, journals, scorecards), not interactive product UI. Buttons exist only on companion one-pagers and are sized for desktop viewing (12px 20px padding, 2px ink border).

### Collapsing Strategy
- **Slide → PPTX**: The slidify pipeline converts HTML slides to PowerPoint. Layout must stay within 1920×1080 bounds.
- **Slide → Preview card**: Preview cards in the web runtime scale the slide proportionally. Type, spacing, and rules maintain their ratios.
- **Reading column**: Body copy is capped at `62ch` (`--measure`) regardless of container width. This is the optimal reading column and does not change.

## 9. Agent Prompt Guide

### Quick Color Reference
- Canvas: Paper (`#F4EFE6`)
- Text: Ink (`#111111`)
- Secondary text: Slate (`#6B6862`)
- Inset surface: Bone (`#E6E0D2`)
- Accent (one per slide): Signal (`#D94F1B`)
- Rule quiet: `rgba(17,17,17,0.18)`
- Rule standard: `1px solid #111111`
- Rule bold: `2px solid #111111`
- Rule display: `3px solid #111111`

### Example Component Prompts
- "Create a title slide on Paper (#F4EFE6) with a 3px ink masthead rule. Kicker in JetBrains Mono 14px weight 500, uppercase, 0.14em tracking, Ink color. Hero headline in Fraunces 96px weight 400, line-height 0.95, -0.02em tracking, with one italic word underlined in Signal (#D94F1B) at 0.08em thickness. Deck paragraph in Source Serif 4 22px weight 400, line-height 1.55, max-width 62ch. Folio at bottom: JetBrains Mono 12px uppercase Slate, separated by 1px ink rule."
- "Create a pull quote section bounded by 3px ink rule top and 1px ink rule bottom. Signal-orange opening quotation mark in Fraunces 96px. Blockquote in Fraunces 36px weight 400, line-height 1.15. Attribution in JetBrains Mono 12px, 0.12em tracking, uppercase, Slate. Name in Ink bold."
- "Build a rubric scorecard table on Paper. Header row in JetBrains Mono 12px uppercase Slate with 2px ink rule below. Capability column in Fraunces 22px. Diagnostic in Source Serif 4 16px. Score column with five 14px square blocks — filled Ink or outlined 1px Ink. One row gets Signal-orange filled blocks. Hairline rules between rows."
- "Design a story tile grid — three columns separated by 1px ink vertical rules. Each tile: grayscale image (aspect 4:3), kicker in JetBrains Mono 13px uppercase with optional 8px Signal dot, headline in Fraunces 28px, deck in Source Serif 4 17px, meta in JetBrains Mono 11px Slate."
- "Create a section opener slide with Ink (#111111) background. 220px Signal-orange numeral in Fraunces. Chapter name in Fraunces 54px Paper (#F4EFE6) text. Folio strip at bottom in JetBrains Mono 13px Paper text."

### Audit Before Shipping
1. **Corners** — only `0`, `50%`, `999px`. Any other radius is a bug.
2. **Shadows** — count must be zero. Replace with hairline rules.
3. **Type lanes** — four faces, four jobs. Fraunces=display, Source Serif 4=body, Geist=UI, Mono=caps.
4. **Color** — five tokens only. Any hex outside the five is a bug.
5. **Kickers** — every slide must have one.
6. **Signal count** — exactly 1 or 0 per slide. Two is a bug.
7. **Sources** — every datum sourced in mono caps with name, date, n.

### Iteration Guide
1. Focus on ONE slide template at a time
2. Start with the kicker — it frames everything below it
3. Reference exact token names: "Paper (#F4EFE6)" not "cream" or "beige"
4. Specify typeface role explicitly: "Fraunces for the headline, Source Serif 4 for the body, JetBrains Mono for the kicker"
5. For rules, say "1px ink hairline" or "2px ink bold" — never "border" or "divider" generically
6. Count your signal elements — exactly one orange thing per slide
7. Write headline copy in editorial register: complete sentences, specific data, no fragments or marketing superlatives
