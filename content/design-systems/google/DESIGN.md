# Design System Inspired by Google (Material You)

> Category: Media & Consumer
> Google's Material You design language. Dynamic color, rounded surfaces, adaptive UI.

## 1. Visual Theme & Atmosphere

Material You (Material Design 3) is Google's most personal and expressive design language, built around the principle that design should adapt to every user. The visual identity centers on dynamic color derived from a single seed hue, large rounded surfaces that feel tactile and welcoming, and an emphasis on content over chrome. Interfaces feel warm, spacious, and quietly confident, with generous whitespace, soft tonal surfaces, and a systematic elevation model that replaces hard shadows with tonal layering.

The system operates through a tonal palette engine: a single source color (Google Blue `#1a73e8`) seeds an entire harmonized palette of primary, secondary, tertiary, error, neutral, and neutral-variant tones across 13 luminance steps each. This produces surfaces that feel cohesive even when dozens of distinct colors are in play. Light mode surfaces are warm off-whites rather than clinical pure white, and containers use subtle tonal fills rather than borders to define grouping.

Typography pairs Google Sans for headlines and display text with Roboto Flex for body and utility copy, creating a rhythm that is distinctly Google without feeling mechanical. Components embrace full-radius pill shapes for FABs, chips, and buttons, while cards and dialogs use generous 12-28px corner radii. Motion is purposeful and physics-based, with container transforms, shared-axis transitions, and spring-based easing that reinforce spatial relationships.

**Key Characteristics:**
- Dynamic color system seeded from a single primary hue, generating harmonized tonal palettes
- Tonal surface layering instead of shadow-based elevation for most containers
- Full-radius pill geometry as signature shape language (FABs, chips, buttons, search bars)
- Generous corner radii on cards (12px), dialogs (28px), and sheets (28px)
- Warm neutral surfaces (`#fef7ff`, `#f3edf7`) rather than pure white backgrounds
- Google Sans display type paired with Roboto Flex body type
- Emphasis on content hierarchy through color roles rather than heavy borders or separators
- Responsive layout grid adapting across compact, medium, and expanded window classes

## 2. Color Palette & Roles

### Primary
- **Primary** (`#1a73e8`): Brand-level actions, key buttons, active indicators, and focal UI elements.
- **Blue Light (Dark Mode)** (`#5a95ff`): Lighter variant of Google Blue for text and interactive elements on dark surfaces. Passes WCAG AA (4.50:1).
- **On Primary** (`#ffffff`): Text and icons placed on primary-colored surfaces.
- **Primary Container** (`#d3e3fd`): Tonal fill for cards, chips, and secondary-emphasis containers related to primary actions.
- **On Primary Container** (`#041e49`): Text and icons on primary container surfaces.

### Secondary & Accent
- **Secondary** (`#34a853`): Supporting actions, toggles, filters, and complementary interactive elements.
- **On Secondary** (`#ffffff`): Text and icons on secondary-colored surfaces.
- **Secondary Container** (`#c4eed0`): Tonal fill for navigation items, selected states, and supporting containers.
- **On Secondary Container** (`#0d3919`): Text on secondary container surfaces.
- **Tertiary** (`#ea4335`): Contrasting accent for badges, alerts, callouts, and expressive moments.
- **On Tertiary** (`#ffffff`): Text and icons on tertiary-colored surfaces.
- **Tertiary Container** (`#ffd2cc`): Tonal fill for tertiary-related containers and decorative elements.
- **On Tertiary Container** (`#5c1008`): Text on tertiary container surfaces.

### Surface & Background
- **Surface** (`#fef7ff`): Primary background canvas; warm off-white with a slight purple-warm tint.
- **Surface Dim** (`#ded8e0`): Reduced-prominence background variant for secondary regions.
- **Surface Bright** (`#fef7ff`): Maximum-brightness surface, matching the primary background.
- **Surface Container Lowest** (`#ffffff`): Lowest-emphasis container, effectively pure white.
- **Surface Container Low** (`#f8f1fa`): Low-emphasis cards and grouped content areas.
- **Surface Container** (`#f2ecf4`): Default container fill for cards, dialogs, and sheets.
- **Surface Container High** (`#ece6ee`): Elevated container emphasis for search bars and text fields.
- **Surface Container Highest** (`#e6e0e9`): Maximum container emphasis for top app bars and navigation rails.

### Neutrals & Text
- **On Surface** (`#1c1b1f`): Primary text, headings, and high-emphasis content on any surface.
- **On Surface Variant** (`#49454f`): Secondary text, labels, metadata, and medium-emphasis content.
- **Outline** (`#79747e`): Borders, dividers, and medium-contrast structural lines.
- **Outline Variant** (`#cac4d0`): Subtle dividers, disabled borders, and low-contrast containment.
- **Inverse Surface** (`#313033`): Dark surface for snackbars, tooltips, and inverted containers.
- **Inverse On Surface** (`#f4eff4`): Text on inverse surfaces.

### Semantic & Accent
- **Error** (`#b3261e`): Destructive actions, form validation errors, and critical alerts.
- **On Error** (`#ffffff`): Text on error-colored surfaces.
- **Error Container** (`#f9dedc`): Tonal fill for error-state containers.
- **On Error Container** (`#410e0b`): Text on error container surfaces.
- **Google Yellow** (`#fbbc04`): Warning states, star ratings, and cautionary signals.
- **Success Green** (`#34a853`): Confirmation states, completion indicators, and positive feedback.

### Gradient System
- Material You avoids persistent UI gradients in favor of tonal surface stepping. Visual richness comes from the dynamic color system itself, where each surface tone is a controlled luminance step from the seed palette.
- Subtle tonal transitions between surface container levels create implied depth without explicit gradient declarations.
- When gradients appear, they are reserved for hero illustrations, onboarding, or brand moments, using harmonized tones from the same seed palette (e.g., `#1a73e8` transitioning through `#6ea8f6` to `#d3e3fd`).

## 3. Typography Rules

### Font Family
- **Display / Headline Family:** `Google Sans`, fallbacks `Roboto, Helvetica Neue, Arial, sans-serif`
- **Body / Label Family:** `Roboto Flex`, fallbacks `Roboto, Helvetica Neue, Arial, sans-serif`
- **Usage Split:** Google Sans carries display, headline, and title hierarchy; Roboto Flex handles body, label, and dense utility text. Google Sans Text may substitute at smaller optical sizes.

### Hierarchy
| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display Large | Google Sans | 57px | 400 | 64px | -0.25px | Hero headlines, onboarding screens |
| Display Medium | Google Sans | 45px | 400 | 52px | 0px | Section headlines, landing pages |
| Display Small | Google Sans | 36px | 400 | 44px | 0px | Feature callouts, card heroes |
| Headline Large | Google Sans | 32px | 400 | 40px | 0px | Page titles, dialog headers |
| Headline Medium | Google Sans | 28px | 400 | 36px | 0px | Section headings |
| Headline Small | Google Sans | 24px | 400 | 32px | 0px | Card titles, subsection heads |
| Title Large | Roboto Flex | 22px | 400 | 28px | 0px | Top app bar titles, prominent labels |
| Title Medium | Roboto Flex | 16px | 500 | 24px | 0.15px | Navigation labels, tab labels |
| Title Small | Roboto Flex | 14px | 500 | 20px | 0.1px | Smaller section labels |
| Body Large | Roboto Flex | 16px | 400 | 24px | 0.5px | Primary body copy, descriptions |
| Body Medium | Roboto Flex | 14px | 400 | 20px | 0.25px | Standard body text, list items |
| Body Small | Roboto Flex | 12px | 400 | 16px | 0.4px | Captions, helper text, metadata |
| Label Large | Roboto Flex | 14px | 500 | 20px | 0.1px | Button labels, menu items |
| Label Medium | Roboto Flex | 12px | 500 | 16px | 0.5px | Chip labels, tab text |
| Label Small | Roboto Flex | 11px | 500 | 16px | 0.5px | Badges, micro indicators |

### Principles
- **Legibility first:** Roboto Flex's variable-font axes allow optical size adjustments without switching families.
- **Restrained weight range:** Display and headline tiers stay at regular weight (400); emphasis comes from size and color, not bold stacking.
- **Positive letter spacing at small sizes:** Body and label tiers use positive tracking to aid readability in dense UI contexts.
- **Semantic naming:** Roles (Display, Headline, Title, Body, Label) map directly to UI intent, not arbitrary size numbers.

## 4. Component Stylings

### Buttons
- **Filled Button:** `#1a73e8` background, `#ffffff` text, 20px full radius (pill), 40px height, 24px horizontal padding. Used for highest-emphasis actions.
- **Filled Tonal Button:** `#d3e3fd` background, `#041e49` text, 20px full radius. Used for medium-emphasis actions that still need visual weight.
- **Outlined Button:** transparent background, `#1a73e8` text, 1px `#79747e` border, 20px full radius. Used for secondary actions.
- **Text Button:** no background, `#1a73e8` text, no border, 20px full radius hit target. Used for lowest-emphasis actions, inline links.
- **FAB (Floating Action Button):** `#d3e3fd` background, `#1a73e8` icon, 16px radius (regular) or 28px radius (large), 56px size (regular) or 96px size (large), 3dp elevation.
- **Extended FAB:** `#d3e3fd` background, `#1a73e8` icon + text, 16px radius, auto width, 56px height.

### Cards & Containers
- **Elevated Card:** `#f8f1fa` fill, 12px radius, 1dp shadow (`rgba(0,0,0,0.15)`), no border. Standard content grouping.
- **Filled Card:** `#e6e0e9` fill, 12px radius, no shadow, no border. Higher-emphasis tonal grouping.
- **Outlined Card:** `#fef7ff` fill, 12px radius, 1px `#cac4d0` border, no shadow. Structured content with clear edges.
- **Dialog:** `#ece6ee` fill, 28px radius, 3dp elevation. Centered modal containers.
- **Bottom Sheet:** `#ece6ee` fill, 28px top-left/top-right radius, drag handle centered at top.
- **Navigation Drawer:** `#f8f1fa` fill, 0px left radius, 16px right radius on standard; 28px radius on modal.

### Inputs & Forms
- **Text Field (Filled):** `#e6e0e9` fill, 4px top radius, 0px bottom radius, 1px `#49454f` bottom border. Active state uses 2px `#1a73e8` bottom border.
- **Text Field (Outlined):** transparent fill, 4px radius, 1px `#79747e` border. Active state uses 2px `#1a73e8` border.
- **Chips (Assist/Filter/Input/Suggestion):** 8px radius, 32px height, 1px `#79747e` border (unselected) or `#c4eed0` fill (selected).
- **Switch:** 32px width, 20px height, `#1a73e8` fill when on, `#e6e0e9` track when off, 16px circular thumb.
- **Checkbox:** 18px square, 2px `#49454f` border (unchecked), `#1a73e8` fill with white check (checked), 2px radius.

### Navigation
- **Top App Bar:** `#fef7ff` surface at scroll rest, transitioning to `#e6e0e9` on scroll. 64px height, centered or left-aligned title.
- **Navigation Bar (Bottom):** `#f8f1fa` fill, 80px height, 3-5 destinations with icon + label. Active indicator pill: `#d3e3fd` fill, 16px radius width 64px.
- **Navigation Rail:** `#f8f1fa` fill, 80px width, icon-only or icon + label. Active indicator pill same as nav bar.
- **Navigation Drawer:** persistent left panel, `#f8f1fa` fill, 360px width, active item uses `#c4eed0` pill indicator.
- **Tabs:** underline indicator (`#1a73e8`, 3px) for primary; pill indicator (`#d3e3fd`) for secondary.

### Image Treatment
- **Rounded media containers:** 12-16px radius for inline media, matching card geometry.
- **Avatar circles:** 40px diameter, 50% radius for user icons and profile images.
- **Hero media:** full-width with 0px radius at screen edges, 28px radius when inset.

### Distinctive Components
- **Search Bar:** `#ece6ee` fill, 28px full radius (pill), 56px height, leading icon, trailing avatar.
- **Badge:** `#ea4335` fill, `#ffffff` text, 6px dot or 16px label variant, attached to icon corner.
- **Snackbar:** `#313033` fill, `#f4eff4` text, 4px radius, positioned bottom-center with optional action button.
- **Segmented Button:** 20px full radius group, 1px `#79747e` border, `#e6e0e9` fill for selected segment.

## 5. Layout Principles

### Spacing System
- Base unit: `4px`. All spacing values derive from 4px increments.
- Commonly used steps: `4`, `8`, `12`, `16`, `24`, `32`, `48`, `64px`.
- Component internal padding: `16px` standard, `24px` generous, `12px` compact.
- Section spacing: `32px` standard vertical gap, `48-64px` between major sections.

### Grid & Container
- **Compact (phone, 0-599dp):** 4 columns, 16px margins, 8px gutters. Single-column content flow.
- **Medium (tablet/foldable, 600-839dp):** 12 columns, 24px margins, 16px gutters. Two-pane adaptive layouts.
- **Expanded (desktop, 840dp+):** 12 columns, 24-32px margins, 24px gutters. Three-pane layouts with persistent navigation.
- Maximum content width: `1200px` centered with auto margins on large displays.

### Whitespace Philosophy
- Material You uses whitespace as a primary grouping mechanism, reducing reliance on borders and dividers.
- Vertical rhythm is maintained through consistent section gaps that scale with content density.
- Containers float on tonal surfaces with enough surrounding space to feel distinct without outlines.
- Dense surfaces (settings, lists) compress vertical spacing but maintain horizontal padding.

### Border Radius Scale
- **4px:** text fields (bottom corners), small utility shapes.
- **8px:** chips, small buttons, compact containers.
- **12px:** cards, standard containers, media frames.
- **16px:** navigation rail indicators, medium containers.
- **20px:** buttons (pill), segmented controls.
- **28px:** dialogs, bottom sheets, large FABs, search bars.
- **50%:** avatar circles, icon buttons, circular FABs.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Level 0 (0dp) | No shadow, base surface `#fef7ff` | Page background, flat content regions |
| Level 1 (1dp) | Surface tint overlay `#1a73e8` at 5% opacity, minimal shadow | Cards, elevated surfaces, filled buttons at rest |
| Level 2 (3dp) | Tint at 8%, soft shadow `0 1px 3px rgba(0,0,0,0.12)` | FABs, elevated cards on hover, search bars |
| Level 3 (6dp) | Tint at 11%, medium shadow `0 3px 6px rgba(0,0,0,0.15)` | Top app bars (scrolled), navigation drawers |
| Level 4 (8dp) | Tint at 12%, deeper shadow `0 4px 8px rgba(0,0,0,0.18)` | Menus, dialog containers |
| Level 5 (12dp) | Tint at 14%, full shadow `0 6px 12px rgba(0,0,0,0.22)` | Modal surfaces, full-screen dialogs |

### Shadow Philosophy
Material You replaces traditional shadow-only elevation with a dual system: a primary-tinted surface overlay combined with a subtle shadow. The tint overlay makes elevated surfaces warmer and more integrated with the color scheme, while the shadow provides the spatial cue. At higher elevations, the surface tint intensity increases, creating a visually harmonized depth stack that feels organic rather than mechanical.

### Decorative Depth
- Surface color stepping across container levels (Lowest through Highest) creates implicit depth without any shadow or elevation.
- State layers (hover, pressed, focused) use semi-transparent overlays of the content color at `8%`, `12%`, and `12%` opacity respectively.
- Dragged surfaces use `16%` state layer intensity with Level 4 elevation to feel physically lifted.

## 7. Do's and Don'ts

### Do
- Seed the entire palette from a single source color and let tonal mapping generate harmonized variants.
- Use tonal surface fills (`Surface Container` variants) to group content instead of adding borders everywhere.
- Apply full-radius pill shapes to buttons, chips, search bars, and navigation indicators for the signature M3 feel.
- Keep display and headline typography at regular weight (400); let size and color carry hierarchy.
- Use the 3-tier navigation model: bar (compact), rail (medium), drawer (expanded) adapting to window size.
- Pair primary with primary-container, secondary with secondary-container for layered emphasis without clashing.
- Apply state layers (hover, press, focus) as semi-transparent overlays of the content color, not separate hardcoded colors.
- Reserve the tertiary palette for high-attention moments like badges, callouts, and expressive accents.
- Test all surfaces against WCAG 2.1 AA: `On Surface` on `Surface` must maintain at least 4.5:1 contrast for body text.
- Use Blue Light (`#5a95ff`) for interactive blue elements on dark surfaces.

### Don't
- Don't use pure white (`#ffffff`) as the main background; Material You surfaces carry a warm tint from the source color.
- Don't apply drop shadows without the corresponding surface tint overlay; isolated shadows break the M3 depth model.
- Don't assign random border radii; follow the defined scale (4/8/12/16/20/28/50%) for visual consistency.
- Don't stack more than two levels of container nesting; surfaces become muddy when too many tonal layers overlap.
- Don't use heavy font weights (700+) for display type; Material You headlines are deliberately light and airy.
- Don't mix Material 2 component geometry (sharp 4px cards, rectangular FABs) with Material 3 tonal surfaces.
- Don't ignore the dynamic color contract: every custom color must define both the color role and its `on-` counterpart.
- Don't place text directly on Primary or Secondary without using the designated `On Primary` / `On Secondary` token.
- Don't use primary Google Blue (`#1a73e8`) as text on dark surfaces (`#313033` and darker) — it fails WCAG AA.
- Don't rely on color alone for state changes; combine color shift with shape, elevation, or icon changes.

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Compact | 0-599dp | Single column, bottom navigation bar, full-width cards, stacked content |
| Medium | 600-839dp | Navigation rail appears, two-column list-detail, inset cards with margins |
| Expanded | 840-1199dp | Persistent navigation drawer, three-pane layouts, side sheets |
| Large | 1200-1599dp | Extended navigation drawer with labels, wider content columns |
| Extra Large | 1600dp+ | Maximum content width capped at 1200px, generous outer margins |

### Touch Targets
- Minimum touch target: `48dp x 48dp` for all interactive elements.
- Icon buttons: `48dp` hit area with `24dp` visible icon centered within.
- List items: `56dp` minimum height for single-line, `72dp` for two-line, `88dp` for three-line.
- FAB: `56dp` standard, `96dp` large variant, always with `16dp` minimum margin from screen edges.
- Bottom navigation items: `80dp` height with `64dp x 32dp` active indicator pill.

### Collapsing Strategy
- Navigation transitions: bottom bar (compact) to rail (medium) to drawer (expanded) via canonical breakpoints.
- Cards shift from full-bleed edge-to-edge on compact to inset with `16-24px` margins on medium and larger.
- Grids collapse from multi-column to single-column while maintaining card proportions and internal spacing.
- Top app bar collapses from large (152dp with display title) to small (64dp with title) on scroll.
- Dialogs become full-screen on compact breakpoints, maintaining 28px radius on medium and above.

### Image Behavior
- Media within cards maintains aspect ratio and uses `12px` radius matching the card corners, inset by the card padding.
- Hero images extend full-width on compact with `0px` radius, transitioning to inset with `16-28px` radius on larger breakpoints.
- Avatar images remain circular (`50%` radius) and scale from `40dp` to `56dp` across breakpoints.
- Image carousels use the M3 carousel component with peek-through adjacent items and center-aligned hero items.

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary action: **Google Blue** (`#1a73e8`)
- Primary container: **Blue Tonal** (`#d3e3fd`)
- Secondary: **Google Green** (`#34a853`)
- Secondary container: **Green Tonal** (`#c4eed0`)
- Tertiary accent: **Google Red** (`#ea4335`)
- Tertiary container: **Red Tonal** (`#ffd2cc`)
- Background surface: **Warm White** (`#fef7ff`)
- Surface container: **Lavender Mist** (`#f2ecf4`)
- Primary text: **Near Black** (`#1c1b1f`)
- Secondary text: **Dark Gray** (`#49454f`)
- Outline: **Medium Gray** (`#79747e`)
- Error: **Material Red** (`#b3261e`)

### Example Component Prompts
- "Build a Material You search bar with `#ece6ee` fill, 28px pill radius, 56px height, a leading search icon in `#49454f`, and a trailing 32px circular avatar on a `#fef7ff` page background."
- "Create a Material You card grid on `#fef7ff` with elevated cards using `#f8f1fa` fill, 12px radius, primary-tinted 1dp elevation, Google Sans 24px headlines, and Roboto Flex 14px body text."
- "Design a bottom navigation bar with `#f8f1fa` fill, 80px height, four destinations. Active item gets a `#d3e3fd` pill indicator (64px wide, 32px tall, 16px radius) behind a `#1a73e8` icon."
- "Generate a settings screen with a top app bar (`#fef7ff` transitioning to `#e6e0e9` on scroll), 56px list items with `#1c1b1f` primary labels and `#49454f` secondary text, and `#1a73e8` switches."
- "Compose a dialog with `#ece6ee` fill, 28px radius, Google Sans 24px title, Roboto Flex 14px body, a divider in `#cac4d0`, and two text buttons: 'Cancel' in `#49454f` and 'Confirm' in `#1a73e8`."

### Iteration Guide
1. Start with the seed color (`#1a73e8`) and generate tonal palette variants for primary, secondary, and tertiary before placing any components.
2. Set the background to `#fef7ff` (not pure white) and choose surface container tones for cards and panels.
3. Establish typography: Google Sans for display/headline/title, Roboto Flex for body/label, keeping headline weights at 400.
4. Apply the border radius scale: 12px for cards, 20px for buttons, 28px for dialogs and search, 50% for avatars.
5. Add depth using tonal surface stepping first, then layer in subtle shadows only where spatial hierarchy demands it.
6. Wire up state layers as semi-transparent overlays (8% hover, 12% press, 12% focus) using each element's content color.
7. Test across compact/medium/expanded breakpoints, verifying navigation transitions (bar to rail to drawer) and card layout reflow.
