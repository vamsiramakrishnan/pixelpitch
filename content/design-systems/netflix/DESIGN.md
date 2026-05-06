# Design System Inspired by Netflix

> Category: Media & Consumer
> The world's streaming platform. Cinematic dark UI, bold red accent, content-first design.

## 1. Visual Theme & Atmosphere

Netflix's interface is a cinematic canvas — a near-black theater (`#141414`) where content is the light source. Every design decision serves one goal: get out of the way of the poster art. The background is not merely dark; it is the darkness of a movie theater before the projector fires. Surfaces step up in barely perceptible shades (`#181818`, `#1c1c1c`, `#221f1f`, `#2f2f2f`) so the eye never registers "UI" — only content. The singular brand color, Netflix Red (`#e50914`), is used with extreme restraint: the logo, the primary CTA, and error states. Everything else is grayscale, letting the rich photography of movie posters and show stills command the visual field.

Typography is built on Netflix Sans — a proprietary geometric sans-serif designed in-house to feel authoritative without being cold. It has wide apertures for legibility on screens and a slightly condensed width that lets titles punch without eating horizontal space. Where Netflix Sans is unavailable, the system falls back to Helvetica Neue and then Inter — clean grotesques that maintain the neutral, confident tone. Weight usage is binary: bold (700) for titles and CTAs, regular (400) for body and metadata. Medium (500) appears only in navigation and category labels. The type scale is deliberately compressed — Netflix rarely goes above 24px for UI text, reserving cinematic scale (48px+) for the hero billboard overlay.

What makes Netflix instantly recognizable is the horizontal scroll carousel — rows of poster-art cards that scroll infinitely left-right, each row a genre or algorithmic category. On hover, a card scales up ~1.4x with a smooth 300ms ease-out, revealing metadata (title, match percentage, maturity rating, season count) in a mini-detail panel below the expanded poster. This hover-to-expand interaction, combined with the full-bleed hero billboard at the top and the profile-selection grid on entry, creates a layered experience: dark stillness punctuated by motion only when the user initiates it.

**Key Characteristics:**
- Pitch-dark cinematic canvas (`#141414`) — the UI is a theater, not a page
- Netflix Red (`#e50914`) reserved for logo, primary CTA, and error — never decorative
- Netflix Sans proprietary typeface — geometric, wide-aperture, condensed
- Horizontal scroll carousels with poster-art cards as the primary navigation paradigm
- Hover-to-expand card interaction: scale 1.4x, 300ms ease-out, metadata reveal
- Full-bleed hero billboard with gradient overlay (bottom `rgba(20,20,20,0.8)` to transparent)
- Profile selection screen: circular avatars on dark field, the first ritual of every session
- Content-forward philosophy — UI chrome is invisible until needed

## 2. Color Palette & Roles

### Primary
- **Netflix Red** (`#e50914`): Brand mark, primary CTA, active progress bars
- **Netflix Red Dark** (`#b1060f`): Hover/pressed state for red buttons
- **Netflix Red Light** (`#f40612`): Logo rendering, high-contrast accent

### Surface & Background
- **Base Black** (`#141414`): Primary page background — the theater canvas
- **Surface Dark** (`#181818`): Card backgrounds, elevated containers
- **Surface Mid** (`#1c1c1c`): Secondary surfaces, row backgrounds on hover
- **Surface Warm** (`#221f1f`): Slightly warm dark surface for certain sections
- **Surface Elevated** (`#2f2f2f`): Tooltips, dropdown menus, popover backgrounds
- **Surface Light** (`#333333`): Input field backgrounds, search bar fill
- **Modal Overlay** (`rgba(0,0,0,0.70)`): Full-screen overlay behind modals and detail views

### Neutrals & Text
- **White** (`#ffffff`): Primary text, active navigation, titles on dark
- **Off-White** (`#e5e5e5`): Body text, descriptions, synopses
- **Silver** (`#b3b3b3`): Secondary text, metadata, inactive navigation
- **Muted** (`#808080`): Tertiary text, timestamps, supplementary info
- **Dark Gray** (`#404040`): Borders, dividers, subtle separators
- **Charcoal** (`#6d6d6d`): Placeholder text, disabled button text

### Semantic & Accent
- **Match Green** (`#46d369`): Match percentage badges ("98% Match")
- **New Badge Red** (`#e50914`): "New" episode indicators
- **Maturity Gray** (`#bcbcbc` on `#333333`): Maturity rating badges (TV-MA, PG-13)
- **Top 10 Badge** (`#b8192e` to `#e50914`): Top 10 numbered ranking badges
- **Warning Yellow** (`#e6b616`): Thumbs-up, rating icons
- **Info Blue** (`#0080ff`): Help links, informational CTAs (rare)

### Gradient System
- **Hero Bottom Fade**: `linear-gradient(transparent, rgba(20,20,20,0.6) 60%, #141414 100%)` — dissolves hero image into the page
- **Hero Left Fade**: `linear-gradient(to right, rgba(20,20,20,0.9) 20%, transparent 50%)` — protects text readability over hero image
- **Card Hover Fade**: `linear-gradient(transparent, rgba(20,20,20,0.95))` — metadata reveal overlay
- **Row Edge Fade**: `linear-gradient(to right, #141414, transparent 5%, transparent 95%, #141414)` — carousels fade at edges
- **Top Nav Fade**: `linear-gradient(rgba(0,0,0,0.7), transparent)` — fixed nav gradient on scroll

## 3. Typography Rules

### Font Family
- **Primary**: `"Netflix Sans", "Helvetica Neue", Helvetica, Inter, Arial, sans-serif`
- **Fallback for CJK**: `"Noto Sans CJK", "Hiragino Sans", "Yu Gothic", sans-serif`
- Netflix Sans is a proprietary geometric sans-serif with wide apertures, designed for screen legibility at small sizes and cinematic impact at display sizes.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Color | Notes |
|------|------|--------|-------------|----------------|-------|-------|
| Hero Title | 48–64px | 700 | 1.1 | -0.5px | `#ffffff` | Billboard overlay, text-shadow |
| Section Header | 20–24px | 700 | 1.2 | 0px | `#e5e5e5` | Genre row titles ("Trending Now") |
| Card Title | 16px | 700 | 1.3 | 0px | `#ffffff` | Expanded card title |
| Body / Synopsis | 14px | 400 | 1.5 | 0.2px | `#e5e5e5` | Show descriptions |
| Metadata | 13px | 400 | 1.4 | 0px | `#b3b3b3` | Year, duration, season count |
| Nav Link Active | 14px | 500 | 1.0 | 0px | `#ffffff` | Top navigation, active |
| Nav Link | 14px | 400 | 1.0 | 0px | `#b3b3b3` | Top navigation, inactive |
| Button Label | 16px | 700 | 1.0 | 0.5px | `#ffffff` / `#141414` | CTA buttons |
| Badge | 12px | 700 | 1.0 | 0.5px | `#ffffff` | Match %, maturity, tags |
| Caption | 11px | 400 | 1.3 | 0.3px | `#808080` | Fine print, copyright |

### Principles
- **Content titles dominate**: Show and movie titles are set large and bold; everything else recedes. The hero title can reach 64px — nothing else in the UI comes close.
- **Weight as hierarchy**: Size variation is minimal (11px–24px for UI). Hierarchy is established through weight (700 vs 400) and color (white vs silver vs muted gray).
- **No uppercase in content UI**: Unlike many apps, Netflix avoids uppercase transforms in its streaming interface. Button text, navigation, and metadata are all sentence/title case — uppercase feels like shouting in a dark theater.
- **Negative tracking on display**: Hero titles use slight negative letter-spacing (-0.5px) for a cinematic, title-card feel. Body text uses neutral or slightly positive tracking for readability.

## 4. Component Stylings

### Buttons

**Primary CTA (Play / Resume)**
- Background: `#ffffff`
- Text: `#141414`, 16px weight 700
- Icon: black play triangle, left-aligned
- Padding: 8px 24px 8px 20px
- Radius: 4px
- Hover: `rgba(255,255,255,0.75)` — white dims slightly
- Use: "Play" and "Resume" on hero billboard and detail pages

**Secondary CTA (More Info)**
- Background: `rgba(109,109,109,0.7)`
- Text: `#ffffff`, 16px weight 700
- Padding: 8px 24px
- Radius: 4px
- Hover: `rgba(109,109,109,0.4)` — slightly more transparent
- Use: "More Info" on hero billboard

**Icon Circle (Add / Like / Mute)**
- Background: `rgba(42,42,42,0.6)`
- Border: `2px solid rgba(255,255,255,0.5)`
- Size: 36px diameter
- Radius: 50% (circle)
- Icon: `#ffffff`, 18px
- Hover: border becomes `#ffffff`, background lightens
- Use: Add to My List, thumbs up/down, mute on hero

**Red CTA (Sign Up / Get Started)**
- Background: `#e50914`
- Text: `#ffffff`, 16px weight 700
- Padding: 12px 24px
- Radius: 4px
- Hover: `#b1060f`
- Use: Landing page CTAs, subscription flow

### Cards & Containers

**Poster Card (Default)**
- Aspect ratio: 2:3 (portrait poster) or 16:9 (landscape thumbnail)
- Radius: 4px
- Border: none
- Background: `#181818` (placeholder before image loads)
- Hover: scale(1.4) over 300ms ease-out, z-index elevation, metadata drawer appears below

**Expanded Card (Hover State)**
- Width: ~350px (expanded from ~250px)
- Top: poster image at 16:9 ratio, video preview auto-plays after 2s
- Bottom: `#181818` metadata panel with 12px padding
- Content: title (16px bold), match % in green, maturity badge, duration, genre tags
- Action row: play circle, add circle, like circle, expand-down chevron circle
- Radius: 4px top, 4px bottom
- Shadow: `0 4px 16px rgba(0,0,0,0.75)` — heavy drop shadow for float effect

**Detail Modal / Billboard**
- Background: `#181818`
- Overlay: `rgba(0,0,0,0.70)` behind
- Width: 850px max, centered
- Radius: 8px top corners
- Top: full-width hero image with gradient fade to `#181818`
- Close button: circular, `#181818` background, positioned top-right

### Inputs & Forms

**Search Bar**
- Background: `#000000` with `1px solid #ffffff` border
- Text: `#ffffff`, 14px
- Placeholder: `#808080`
- Width: expands from icon-only (magnifying glass) to 250px on click
- Radius: 0px (sharp rectangle — intentionally angular)
- Transition: width 300ms ease

**Email / Password Input (Landing Page)**
- Background: `rgba(22,22,22,0.7)` with `1px solid #808080` border
- Text: `#ffffff`, 16px
- Floating label: `#b3b3b3`, 12px when focused/filled, 16px when empty
- Radius: 4px
- Focus: border becomes `#ffffff`

### Navigation

**Top Navigation Bar**
- Background: gradient from `rgba(0,0,0,0.7)` to transparent (scrolled to top), solid `#141414` (after scroll)
- Height: 68px
- Logo: Netflix wordmark, `#e50914`, left-aligned, ~92px wide
- Links: 14px weight 400, `#b3b3b3`, hover `#e5e5e5`
- Active link: 14px weight 500, `#ffffff`
- Right side: search icon, notifications bell, profile avatar (32px circle)
- Transition: background opacity on scroll, 400ms

### Image Treatment
- Poster images: `object-fit: cover`, 2:3 or 16:9 aspect ratios
- No border or outline on images — edges bleed into the dark background
- Lazy loading with `#181818` placeholder shimmer
- Hero images: full-viewport-width, gradient overlay on bottom and left

### Distinctive Components

**Match Percentage Badge**
- Text: `#46d369` (green), 13px weight 700
- No background — just colored text
- Example: "98% Match"

**Maturity Rating Badge**
- Background: `rgba(51,51,51,0.6)` with `1px solid #b3b3b3` left border only
- Text: `#bcbcbc`, 12px
- Padding: 2px 6px

**Progress Bar (Continue Watching)**
- Track: `#333333`, height 3px
- Fill: `#e50914`, same height
- No radius — sharp edges
- Positioned at the absolute bottom of the card thumbnail

**Top 10 Badge**
- Large outlined numeral (stroke: `#b8192e`, fill: `#141414`)
- Overlaps left edge of the poster card
- Font: Netflix Sans, 100px+ weight 800

**Profile Avatar Selector**
- Grid: 2x3 or 1x5 depending on profile count
- Avatar: 120px square, 4px radius
- Border: 2px solid transparent, hover becomes `#ffffff`
- Name: centered below, 16px weight 400, `#808080`, hover `#ffffff`
- Background page: `#141414`, centered vertically and horizontally
- "Who's watching?" title: 48px weight 400, `#ffffff`

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 48, 56, 64, 80
- Carousel row gap (vertical): 40–56px between genre rows
- Card gap (horizontal): 4–8px between poster cards in a row
- Page horizontal padding: 4% of viewport width (fluid)

### Grid & Container
- **Hero billboard**: full viewport width, 56vh height, position relative
- **Carousel rows**: full viewport width, horizontally scrollable, no visible scrollbar
- **Cards per row**: 6 (desktop 1400px+), 5 (1100px), 4 (800px), 3 (600px), 2 (mobile)
- **Detail modal**: 850px max-width, centered, vertically scrollable
- **Page max-width**: none — Netflix uses the full viewport, never constrains to a centered container

### Whitespace Philosophy
- **Density in content, void in structure**: Cards within a row are packed tightly (4–8px gap), but rows themselves are separated by generous vertical space (40–56px). This creates a "shelf" metaphor — dense horizontal browsing, clear vertical separation.
- **No gutters, no margins**: Content bleeds to screen edges. The 4% horizontal page padding is the only breathing room, and even that disappears when a card expands on hover.
- **Hero dominance**: The top 56% of the viewport belongs to a single piece of content. This is the most aggressive above-the-fold content commitment in streaming — one show, one image, one CTA.

### Border Radius Scale
- None (0px): Search bar, progress bars — sharp, cinematic edges
- Minimal (4px): Buttons, cards, inputs, badges — the default Netflix radius
- Standard (8px): Modal top corners, larger containers
- Circle (50%): Profile avatars, icon buttons, notification badges

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (Level 0) | `#141414` flat | Page background, the theater floor |
| Surface (Level 1) | `#181818`, no shadow | Card default, nav bar (post-scroll) |
| Hover (Level 2) | `scale(1.4)`, `box-shadow: 0 4px 16px rgba(0,0,0,0.75)` | Expanded card on hover |
| Modal (Level 3) | `#181818`, `box-shadow: 0 8px 32px rgba(0,0,0,0.85)`, overlay `rgba(0,0,0,0.7)` | Detail modal, episode picker |
| Toast (Level 4) | `#333333`, `box-shadow: 0 2px 8px rgba(0,0,0,0.5)` | Notifications, tooltips |

**Shadow Philosophy**: Netflix uses shadows sparingly but heavily. Most cards cast no shadow in their default state — they simply sit on the dark background and blend. Shadows only appear on hover (when a card physically scales up and needs to "float" above its neighbors) or for modals. The shadows are always high-opacity (`0.7–0.85` alpha) because subtle shadows are invisible on dark backgrounds. This "shadow on demand" approach keeps the resting UI perfectly flat and theatrical.

**Decorative Depth**: The hero billboard creates depth through gradients rather than shadows — a bottom fade and a left-side fog that make the text appear to hover in front of the image. The top navigation uses a gradient-to-transparent background that anchors it to the top of the viewport like a proscenium arch.

## 7. Do's and Don'ts

### Do
- Use `#141414` as the base canvas — this specific shade is warmer and softer than pure `#000000`
- Reserve Netflix Red (`#e50914`) exclusively for logo, primary subscription CTAs, progress bars, and error states
- Let poster art and show stills provide all the color — the UI itself is achromatic
- Use the hover-to-expand pattern for content cards: scale 1.4x, 300ms ease-out, metadata reveal
- Apply heavy gradient overlays on hero images to ensure text readability
- Keep border radius at 4px for most elements — sharp, not rounded, not square
- Use horizontal scroll carousels as the primary content navigation pattern
- Fade carousel edges with `linear-gradient(#141414, transparent)` to imply more content
- Design the profile selector as a distinct, centered, minimal entry ritual

### Don't
- Don't use Netflix Red as a background color, surface color, or decorative element
- Don't round buttons or cards beyond 4–8px — Netflix is not bubbly or playful
- Don't add visible borders to cards — edges dissolve into the dark background
- Don't use light backgrounds for any primary interface surface
- Don't show visible scrollbars on carousels — the content edge-fade implies scrollability
- Don't use uppercase transforms in the streaming UI — it conflicts with the cinematic calm
- Don't place more than one hero billboard per page view — one dominant image, one clear CTA
- Don't add decorative icons, illustrations, or empty states with personality — Netflix is austere
- Don't compete with content — if a UI element is drawing more attention than a movie poster, remove it

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <600px | 2 cards per row, stacked hero, bottom tab bar |
| Small Tablet | 600–799px | 3 cards per row, reduced hero height |
| Tablet | 800–1099px | 4 cards per row, side nav collapses |
| Desktop | 1100–1399px | 5 cards per row, full nav bar |
| Large Desktop | 1400px+ | 6 cards per row, maximum card width |

### Touch Targets
- Minimum touch target: 44px (Apple HIG standard Netflix follows)
- Icon circle buttons: 36px minimum, 48px preferred with padding
- Card tap area: entire card surface — no small hit targets within cards on touch devices
- Swipe gesture: horizontal swipe replaces hover-scroll on touch devices

### Collapsing Strategy
- **Navigation**: horizontal top bar (desktop) collapses to hamburger + bottom tab bar (mobile)
- **Hero billboard**: 56vh (desktop) reduces to 40vh (tablet) then 30vh (mobile); "More Info" button may be removed
- **Card hover expand**: disabled on touch — replaced by tap-to-detail navigation
- **Carousel arrows**: visible on desktop hover, hidden on touch (swipe replaces)
- **Detail modal**: full-width overlay on desktop becomes full-screen page on mobile
- **Profile selector**: 5-across grid (desktop) wraps to 2x3 or stacked (mobile)

### Image Behavior
- Poster cards use `object-fit: cover` at fixed aspect ratios (2:3 or 16:9)
- Hero images are full-bleed with `background-size: cover; background-position: center top`
- On mobile, hero images crop to center with increased gradient opacity for text protection
- Images lazy-load with a `#181818` shimmer placeholder matching the card dimensions

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#141414`
- Surface: `#181818`
- Elevated: `#2f2f2f`
- Text Primary: `#ffffff`
- Text Body: `#e5e5e5`
- Text Muted: `#b3b3b3`
- Brand Accent: `#e50914`
- Match Green: `#46d369`
- Border: `#404040`
- Input Fill: `#333333`

### Example Component Prompts
- "Create a Netflix genre row: #141414 background, full viewport width. Title '16px Netflix Sans weight 700' in #e5e5e5, left-aligned with 4% left padding. Below, a horizontal scroll container with 6 poster cards (2:3 aspect ratio, 4px radius, 8px gap). Cards scale(1.4) on hover with 300ms ease-out and show a #181818 metadata panel beneath."
- "Design a hero billboard: full viewport width, 56vh height. Background image with cover positioning. Bottom gradient: linear-gradient(transparent, rgba(20,20,20,0.6) 60%, #141414). Left gradient: linear-gradient(to right, rgba(20,20,20,0.9) 20%, transparent 50%). Title overlay at 48px weight 700 white, synopsis at 14px weight 400 #e5e5e5 max-width 450px. Two buttons: white 'Play' (4px radius) and gray 'More Info' (rgba(109,109,109,0.7), 4px radius)."
- "Build a profile selector screen: #141414 background, centered vertically/horizontally. 'Who's watching?' at 48px weight 400 white. Below: row of 5 profile avatars — 120px squares, 4px radius, 2px solid transparent border, hover border becomes #ffffff. Name below each: 16px weight 400 #808080, hover #ffffff."
- "Create a content card with progress bar: 16:9 thumbnail image, 4px radius. At the absolute bottom, a 3px tall progress bar — #333333 track, #e50914 fill at 65%. No border radius on the progress bar."
- "Design the top navigation: fixed, full-width, 68px height. Background: linear-gradient(rgba(0,0,0,0.7), transparent), transitions to solid #141414 on scroll. Left: Netflix logo in #e50914. Center: links at 14px weight 400 #b3b3b3, active link #ffffff weight 500. Right: search icon, bell icon, 32px circular avatar."

### Iteration Guide
1. Start with `#141414` — not pure black (`#000000`), which is too harsh. Netflix's black is warm.
2. Netflix Red (`#e50914`) appears in exactly three places: logo, CTA, progress/error. If you are using it anywhere else, remove it.
3. Content is the color. The UI is grayscale. If your mockup looks colorful without images loaded, something is wrong.
4. Radius is always 4px. Not 0 (too sharp), not 8+ (too soft). The exception is circles (50%) for icons and avatars.
5. Hover-to-expand is the signature interaction. Cards must scale, cast shadow, and reveal metadata — the resting state is just a poster image.
6. Gradients replace borders. Where two elements meet, use a gradient fade rather than a line or shadow.
7. The hero owns the viewport. 56vh of pure cinematic imagery with gradient protection for text. Do not shrink this.
