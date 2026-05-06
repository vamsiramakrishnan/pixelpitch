# Cyberpunk

> Category: Themed & Unique
> Neon-soaked dystopian interface. Terminal greens, glitch effects, augmented reality HUD aesthetic.

## 1. Visual Theme & Atmosphere

The Cyberpunk system channels the dark underbelly of a near-future megalopolis -- rain-slicked streets reflecting holographic billboards, augmented-reality overlays flickering across a user's field of vision, terminal prompts scrolling through cascading data feeds in abandoned server rooms. Think Blade Runner's off-world colony advertisements, Ghost in the Shell's thermoptic camouflage UI, Cyberpunk 2077's braindance editor panels.

- **Visual style:** dark, dense, high-contrast, information-saturated
- **Color stance:** neon primaries against deep abyssal blacks; color is signal, darkness is canvas
- **Design intent:** Every surface should feel like a terminal display embedded in a dystopian control room. Data is the protagonist. The interface is an instrument panel, not a gallery wall.
- **Mood keywords:** dystopian noir, HUD overlay, holographic scan, digital rain, augmented reality, megacorp terminal
- **Reference palette:** CRT phosphor green, UV-reactive magenta, liquid crystal cyan -- all bleeding light into surrounding darkness
- **Texture language:** scan lines, hex grid substrates, noise grain, glitch artifacts, circuit-trace borders
- **Lighting model:** elements glow from within; there is no external light source. Neon bleeds into adjacent surfaces via box-shadow halos. The screen itself is the only illumination in the room.

Backgrounds should never feel flat or empty. Layer subtle hex grids, faint scan-line overlays, or low-opacity circuit patterns behind content areas. The base surface is not merely dark -- it is deep, like looking into a powered-down monitor in a dim room.

## 2. Color Palette & Roles

### Foundation blacks (surfaces and backgrounds)

| Token           | Hex       | Usage                                      |
|-----------------|-----------|---------------------------------------------|
| `void`          | `#050508` | Full-bleed page background, deepest layer   |
| `abyss`         | `#0a0a0f` | Primary surface, card backgrounds            |
| `carbon`        | `#0d0d12` | Elevated surfaces, modal overlays            |
| `slate-dark`    | `#1a1a2e` | Secondary surfaces, sidebar backgrounds      |
| `gunmetal`      | `#16213e` | Tertiary panels, hover states on dark cards  |

### Neon primaries (signal and interaction)

| Token           | Hex       | Role                                        |
|-----------------|-----------|---------------------------------------------|
| `neon-green`    | `#00ff9f` | Primary action, success, active states, CTA  |
| `magenta`       | `#ff00ff` | Secondary action, warnings, highlights       |
| `cyan`          | `#00d4ff` | Tertiary, links, informational, navigation   |

### Extended signal colors

| Token           | Hex       | Role                                        |
|-----------------|-----------|---------------------------------------------|
| `warning-amber` | `#ffb800` | Caution states, rate limits, degraded status |
| `danger-red`    | `#ff003c` | Errors, destructive actions, critical alerts |
| `success-green` | `#00ff9f` | Aliases `neon-green` for semantic consistency |
| `ghost-white`   | `#e0e0e8` | Primary readable text on dark surfaces       |
| `dim-gray`      | `#757586` | Muted text, disabled states, metadata        |
| `scan-line`     | `rgba(255,255,255,0.03)` | Repeating 2px scan-line overlay     |

### Color application rules

- Body text is always `ghost-white` (#e0e0e8) on dark surfaces -- never pure white (#fff), which reads as overluminous on deep blacks.
- Neon colors are reserved for interactive elements, status indicators, borders, and headings. Never fill large areas with neon -- it destroys the contrast hierarchy.
- Each neon primary gets a matching glow: `0 0 8px <color>40, 0 0 20px <color>20`. The glow is the halo of light bleeding from the element into the dark surface.
- Use `magenta` sparingly -- it is the loudest color in the system. Reserve it for destructive confirmations, premium badges, and high-priority callouts.
- Backgrounds graduate from `void` (outermost) through `abyss` (cards) to `carbon` (modals). Never skip a step in the depth ladder.
- Borders on interactive elements use neon colors at 40-60% opacity; borders on passive containers use `dim-gray` at 30% opacity.

## 3. Typography Rules

### Font stack

| Role       | Family           | Stitch token     | Fallback stack                      |
|------------|------------------|------------------|--------------------------------------|
| Headline   | Space Mono       | `SPACE_MONO`     | `'Courier New', monospace`           |
| Body       | Space Grotesk    | `SPACE_GROTESK`  | `'Inter', system-ui, sans-serif`     |
| Code/Data  | Space Mono       | `SPACE_MONO`     | `'Courier New', monospace`           |
| Labels     | Space Grotesk    | `SPACE_GROTESK`  | `'Inter', system-ui, sans-serif`     |

### Type scale

| Level       | Size   | Weight | Line height | Letter spacing | Usage                        |
|-------------|--------|--------|-------------|----------------|-------------------------------|
| display-lg  | 48px   | 700    | 1.1         | -0.02em        | Hero headlines, splash titles |
| display-md  | 36px   | 700    | 1.15        | -0.01em        | Section headers               |
| heading-lg  | 28px   | 600    | 1.2         | 0em            | Card titles, panel headers    |
| heading-md  | 22px   | 600    | 1.25        | 0em            | Subsection headers            |
| heading-sm  | 18px   | 600    | 1.3         | 0.01em         | Widget titles                 |
| body-lg     | 16px   | 400    | 1.6         | 0.01em         | Primary body text             |
| body-md     | 14px   | 400    | 1.5         | 0.01em         | Secondary body, descriptions  |
| body-sm     | 12px   | 400    | 1.4         | 0.02em         | Captions, helper text         |
| label       | 11px   | 500    | 1.2         | 0.08em         | Buttons, tags, status pills   |
| mono-data   | 13px   | 400    | 1.4         | 0.05em         | Data readouts, terminal text  |

### Typography rules

- Headlines are always Space Mono and always `text-transform: uppercase`. This gives headings a terminal-readout cadence that is central to the cyberpunk identity.
- Body text uses Space Grotesk for readability at paragraph length. Do not set body text in monospace -- it degrades reading speed by 15-20%.
- Data readout panels, code blocks, and status strings use Space Mono at `mono-data` scale with `neon-green` color.
- Letter-spacing on labels is wide (`0.08em`) to evoke stenciled military typography on equipment panels.
- Never use italic in headlines -- monospace italic is unreadable. Use color or weight contrast instead.
- Heading color is `neon-green` by default, shifting to `cyan` or `magenta` for secondary/tertiary sections. Body text is always `ghost-white`.

## 4. Component Stylings

### Terminal cards

The primary content container. Dark `abyss` background, 1px border in `neon-green` at 40% opacity, `border-radius: 4px`. A faint scan-line overlay (`repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)`) covers the card surface. Top edge carries a 2px solid `neon-green` accent bar. Optional: a blinking cursor block (`_`) in the card header to suggest live terminal output.

### Glitch-effect headers

Display-level headings use a CSS glitch animation: duplicate the text via `::before` and `::after` pseudo-elements offset by 2px in opposing directions, colored `cyan` and `magenta` respectively, with a `clip-path` animation that randomly crops horizontal slices at staggered intervals (200-400ms steps over a 3s loop). The base text remains `neon-green`. The glitch fires on load, then settles -- it should not loop continuously on non-hero elements.

### Neon-bordered buttons

- **Primary:** `neon-green` 1px border, `neon-green` text, transparent background. On hover: background fills to `neon-green` at 15% opacity, `box-shadow: 0 0 12px #00ff9f40, 0 0 30px #00ff9f15`. Transition: 200ms ease-out.
- **Secondary:** `cyan` 1px border, `cyan` text. Same hover pattern but with cyan glow.
- **Danger:** `danger-red` 1px border, `danger-red` text. Hover glow in red.
- **Disabled:** `dim-gray` 30% border, `dim-gray` text. No glow, no cursor pointer.
- All buttons use `label` typography (11px, uppercase, 0.08em tracking). Border-radius is `4px` -- never rounded pill shapes, which break the angular industrial aesthetic.

### Data readout panels

Rectangular panels with `carbon` background, `dim-gray` 1px border, and a `mono-data` type treatment. Content is structured as key-value pairs in a two-column monospace grid. Keys are `dim-gray`, values are `neon-green`. A slow left-to-right sweep animation (`linear-gradient` at 2% opacity) suggests active data scanning. Optional: prefix each row with a dim line number in `dim-gray`.

### Hex grid backgrounds

For hero sections or splash areas, layer an SVG hex grid pattern behind content. Hex cells are stroked in `neon-green` at 5-8% opacity, no fill. Cell radius: 20-30px. On hover or as an ambient animation, individual cells pulse to 20% opacity in sequence, simulating a propagating network signal.

### Progress bars and loaders

Track background is `slate-dark`. Fill uses a `neon-green` to `cyan` horizontal gradient. A bright pulse highlight (white at 40% opacity, 20px wide) sweeps left-to-right across the fill on a 2s linear loop. The bar has `border-radius: 2px`. Percentage text is `mono-data` aligned right of the track.

### Status indicators

Small 8px circles with three states:
- **Online/Active:** `neon-green` fill with `0 0 6px #00ff9f` glow, pulsing opacity between 0.7 and 1.0 on a 2s ease-in-out loop.
- **Warning/Degraded:** `warning-amber` fill, steady glow, no pulse.
- **Offline/Error:** `danger-red` fill, blinking on/off at 1s intervals.

Status labels sit beside the dot in `mono-data` type, uppercase.

### Input fields

Background `carbon`, 1px border `dim-gray`. On focus: border transitions to `cyan`, faint `cyan` glow appears (`0 0 8px #00d4ff30`). Placeholder text is `dim-gray`. Caret color is `neon-green`. Label text above the field uses `label` typography in `ghost-white`.

### Tooltips and toasts

`carbon` background with `neon-green` 1px left border (4px wide accent). Text in `ghost-white` at `body-sm`. Toasts auto-dismiss after 4s with a thin `neon-green` progress bar shrinking at the bottom edge.

## 5. Layout Principles

### Grid system

- **Primary grid:** 12-column with 16px gutters. Content area max-width: 1440px.
- **Asymmetric bias:** Favor 4/8, 5/7, or 3/9 column splits over symmetrical 6/6. Asymmetry evokes surveillance dashboards where panels are sized to data density, not visual balance.
- **Dense packing:** Cyberpunk interfaces are information-rich. Prefer compact spacing (12-16px padding inside cards) over generous whitespace. The user is an operator, not a tourist.

### Information density

- Target 60-70% surface coverage on dashboard screens. Empty space should feel intentional (a dark breathing gap between data clusters), not accidental.
- Stack secondary metrics and metadata in tight vertical lists with 4-8px row gaps.
- Use horizontal dividers (`dim-gray` at 20% opacity, 1px) between dense list items rather than card separation.

### Monospace alignment

- Data panels, tables, and key-value readouts should snap to a monospace grid. All columns of tabular data use `mono-data` type so character widths align vertically.
- Right-align numeric columns. Left-align string columns. This is a cockpit instrument rule.

### Sidebar + main pattern

The dominant layout is a narrow left sidebar (240-280px) in `abyss` with a full-width main content area in `void`. The sidebar contains navigation as a vertical list of uppercase monospace labels with a 3px left-border accent on the active item in `neon-green`. A 1px `dim-gray` vertical divider separates sidebar from main.

### Z-pattern overlay zones

For HUD-style interfaces, reserve the four corners of the viewport for fixed status readouts: top-left for system identifier/logo, top-right for clock/status indicators, bottom-left for context breadcrumb, bottom-right for quick-action shortcuts. These corner zones use `body-sm` mono type at reduced opacity (60%).

## 6. Depth & Elevation

### Elevation ladder

| Level | Surface     | Border                      | Shadow / Glow                          | Use case               |
|-------|-------------|-----------------------------|-----------------------------------------|--------------------------|
| 0     | `void`      | none                        | none                                    | Page background          |
| 1     | `abyss`     | `dim-gray` 30%              | none                                    | Cards, content panels    |
| 2     | `carbon`    | `dim-gray` 50%              | `0 4px 16px rgba(0,0,0,0.5)`           | Dropdowns, popovers      |
| 3     | `slate-dark`| neon primary 40%            | `0 8px 32px rgba(0,0,0,0.6)`           | Modals, command palettes |
| 4     | `gunmetal`  | neon primary 60%            | `0 0 20px <neon>20, 0 12px 40px rgba(0,0,0,0.7)` | Focused overlay, alerts |

### Glow as elevation signal

In a dark-on-dark system, traditional shadows are invisible. Elevation is communicated through neon glow intensity. A level-1 card has no glow. A level-3 modal has a visible neon-green or cyan halo bleeding outward from its border. This glow replaces the drop-shadow model of light-theme systems.

### Layering rules

- Never place a dark surface on an equally dark surface without a visible border or glow separator.
- Modal backdrops use `rgba(0,0,0,0.8)` with a subtle `backdrop-filter: blur(4px)` to separate the modal plane from the content plane.
- Stacking context: overlays and modals use `z-index` in the 100-200 range. Corner HUD zones use 50-99. Page content stays at auto/0.
- Glassmorphism is not part of this system. Transparency is used only for backdrops and scan-line overlays, never for content containers.

## 7. Do's and Don'ts

### Do

- Use neon color exclusively for interactive and signal elements. Let darkness dominate by area.
- Maintain a clear hierarchy: one primary neon (`neon-green`), one secondary (`magenta`), one tertiary (`cyan`). Never introduce a fourth neon.
- Keep the scan-line overlay subtle (2-3% opacity). It should be felt, not stared at.
- Use monospace type for data, status, and headings. Use the grotesque for sustained reading.
- Animate with restraint: one glitch on load, one pulsing indicator per view, one sweep on a progress bar. The rest is still.
- Test contrast: `ghost-white` on `abyss` must hit WCAG AA (it does at 11.3:1). Neon green on `abyss` hits 12.5:1. Verify `dim-gray` on `abyss` for metadata -- it is intentionally below AA (decorative only, never for actionable text).
- Apply the `border-radius: 4px` rule universally. The angular, industrial feel depends on consistent tight radii.

### Don't

- Do not use rounded pill shapes (`border-radius: 999px`). They belong to friendly consumer interfaces, not control rooms.
- Do not fill large areas with neon color. A neon-green sidebar background is a readability disaster. Neon is for edges, text, and small fills.
- Do not use white (#ffffff) for text. It is too harsh against deep blacks. Use `ghost-white` (#e0e0e8).
- Do not mix warm and cool neons in the same element. Green/cyan pair well. Green/magenta pair well. Cyan/magenta pair well. All three in the same button is chaos.
- Do not animate everything. A screen where every element glitches and pulses is nauseating. Pick one hero animation per viewport.
- Do not use light-mode fallbacks. This system is dark-only. A light variant would require a separate system.
- Do not add photographic imagery without a duotone or threshold filter. Raw photos break the synthetic aesthetic. Process images through a cyan/magenta duotone or a high-contrast monochrome with neon tint overlay.
- Do not use emoji in UI labels. Emoji break the monospace grid and the austere terminal tone. Use status dots, unicode box-drawing characters, or SVG icons.

## 8. Responsive Behavior

### Breakpoints

| Name    | Range         | Columns | Behavior                                  |
|---------|---------------|---------|-------------------------------------------|
| `hud`   | >= 1440px     | 12      | Full dashboard layout, corner HUD zones    |
| `deck`  | 1024-1439px   | 12      | Sidebar collapses to icon rail (56px)      |
| `grid`  | 768-1023px    | 8       | Stack sidebar above content, 2-col cards   |
| `stack` | 480-767px     | 4       | Single column, cards full-width            |
| `palm`  | < 480px       | 4       | Compact stack, reduced type scale (-2px)   |

### Responsive rules

- The sidebar converts to a bottom tab bar at `grid` breakpoint and below. Tab icons use simple SVG line icons in `neon-green`, active tab has a 2px top border accent.
- Corner HUD zones are hidden below `deck`. The information they carried moves into a collapsible top bar.
- Hex grid backgrounds switch from SVG pattern to a solid `void` fill below `grid` to reduce rendering cost on mobile GPUs.
- Glitch animations are disabled below `grid` via `prefers-reduced-motion` or viewport-width media query. They are GPU-intensive and distracting on small screens.
- Data readout panels switch from horizontal key-value pairs to stacked vertical layout below `stack`.
- Touch targets are minimum 44x44px on `stack` and `palm`. Neon glow on buttons is reduced to `0 0 6px` to avoid excessive bloom on OLED screens.
- The scan-line overlay is removed below `grid`. It is a desktop texture detail that adds no value on mobile.

### Performance considerations

- Limit simultaneous CSS animations to 3 per viewport. Each glow and pulse animation triggers compositing; too many degrade scroll performance.
- Use `will-change: transform` on glitch-animated elements and `will-change: opacity` on pulsing indicators. Remove the hint after animation completes.
- Hex grid SVGs should be inlined and use `shape-rendering: crispEdges` for sharp edges at all zoom levels.

## 9. Agent Prompt Guide

When generating interfaces with this design system, the agent should internalize these directives:

### Surface construction

Start every layout with a full-bleed `void` (#050508) background. Place primary content panels on `abyss` (#0a0a0f) surfaces with 1px `dim-gray` borders. Use `carbon` (#0d0d12) only for overlays and elevated panels. Never leave a content area borderless on a dark background -- the panel edges must be visible.

### Color application sequence

1. Apply `ghost-white` (#e0e0e8) to all body text first.
2. Apply `neon-green` (#00ff9f) to primary headings, active nav items, CTAs, and success indicators.
3. Apply `cyan` (#00d4ff) to links, secondary navigation, and informational callouts.
4. Apply `magenta` (#ff00ff) only to high-priority badges, destructive action confirmations, or premium/featured markers.
5. Apply `dim-gray` (#757586) to all metadata, timestamps, and disabled elements.
6. Never apply neon to backgrounds larger than a pill or badge.

### Component defaults

- Every card is a terminal card (scan-line overlay, top accent bar, monospace header).
- Every heading at `display-lg` or `display-md` gets the glitch treatment on first render.
- Every interactive element (button, link, input) gets a neon glow on hover/focus.
- Every progress indicator uses the pulse-sweep animation.
- Every status dot uses the three-state blink/pulse/steady pattern.

### Layout defaults

- Default to sidebar-plus-main for any page with navigation.
- Default to asymmetric grid splits (4/8 or 3/9) for content with a secondary panel.
- Default to dense vertical stacking for data-heavy views.
- Place a thin 1px `dim-gray` horizontal rule between sections instead of using whitespace gaps larger than 32px.

### Tone and microcopy

- Use terse, technical language. "INITIALIZE" not "Get Started". "TERMINATE SESSION" not "Log Out". "DEPLOY" not "Publish".
- Status messages read like system logs: "CONNECTION ESTABLISHED", "SYNC IN PROGRESS", "MODULE OFFLINE".
- Error messages are diagnostic: "ERR_AUTH_TIMEOUT: credential exchange failed after 30s" not "Something went wrong".
- Navigation labels are uppercase, single-word where possible: "DASHBOARD", "MODULES", "CONFIG", "LOGS".

### Stitch integration tokens

When mapping to Stitch design system parameters:
- `customColor`: `#00ff9f`
- `colorMode`: `DARK`
- `colorVariant`: `VIBRANT`
- `headlineFont`: `SPACE_MONO`
- `bodyFont`: `SPACE_GROTESK`
- `roundness`: `ROUND_FOUR`
- `overridePrimaryColor`: `#00ff9f`
- `overrideSecondaryColor`: `#ff00ff`
- `overrideTertiaryColor`: `#00d4ff`
- `overrideNeutralColor`: `#1a1a2e`
