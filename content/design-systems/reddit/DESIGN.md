# Design System Inspired by Reddit

> Category: Media & Consumer
> Community platform. OrangeRed identity, card-based feeds, subreddit-driven theming.

## 1. Visual Theme & Atmosphere

Reddit's redesigned interface is a clean, light-first community platform built around card-based content consumption and conversation threading. The default canvas is a soft warm gray (`#DAE0E6`) behind crisp white content cards, creating a newspaper-like browse experience where each post is a discrete, self-contained unit. The signature **OrangeRed** (`#FF4500`) is the gravitational center of the brand — it powers the upvote arrow, the app icon, primary CTAs, and the wordmark, but is used with restraint across the UI so it pops when it appears.

The typography pairs **IBM Plex Sans** for headlines and system chrome with **Noto Sans** for body text and comments — a combination that balances the technical credibility of a link-aggregation platform with the warmth of long-form conversation. Headlines use semibold-to-bold weights for scannable feed density; comment threads stay at regular weight with tight line-heights to maximize the volume of visible conversation. The type scale is compact: most UI text sits between 12px and 16px, reflecting Reddit's roots as a text-dense information utility.

What distinguishes Reddit is its full-pill geometry and community-layer theming. Buttons, chips, flair tags, and navigation pills all use full-radius (9999px) corners, creating a soft, approachable shape language. Subreddit banners and custom community themes overlay the global system with per-community colors and imagery, making each subreddit feel like its own neighborhood while sharing the same structural bones. The upvote/downvote axis — OrangeRed (`#FF4500`) for up, Periwinkle (`#7193FF`) for down — is the single most recognizable interaction pattern on the platform.

**Key Characteristics:**
- Light gray canvas (`#DAE0E6`) with white content cards — newspaper-like feed
- OrangeRed (`#FF4500`) as singular brand accent — upvotes, CTAs, identity
- Periwinkle (`#7193FF`) as downvote/secondary cool accent
- IBM Plex Sans headlines + Noto Sans body — technical clarity meets conversational warmth
- Full-pill buttons and chips (9999px radius) — soft, rounded, approachable
- Card-based feed with 8px radius — each post is a discrete content unit
- Comment threading with depth lines and nested indentation
- Subreddit-level theme customization (banners, icons, community colors)
- Vote arrows as primary interaction affordance — the Reddit ritual

## 2. Color Palette & Roles

### Primary
- **OrangeRed** (`#FF4500`): Brand primary, upvote active, primary CTA, logo.
- **OrangeRed Hover** (`#D93B00`): Hover/pressed for primary actions.
- **OrangeRed Light** (`#FFE5D9`): Soft wash for notification badges, highlight backgrounds.
- **Accessible OrangeRed Text** (`#C23600`): Darker variant for orange text on light surfaces. Passes WCAG AA.

### Secondary & Accent
- **Periwinkle** (`#7193FF`): Downvote active, secondary accent, link highlights.
- **Periwinkle Light** (`#D4DFFF`): Soft wash for info states, selected tabs.
- **Reddit Blue** (`#0079D3`): Legacy link color, mod badge, verified states.
- **Reddit Gold** (`#FFD700`): Award system, premium badge, gilded indicator.
- **Platinum** (`#A0E8FF`): Platinum award accent.

### Surface & Background
- **Canvas** (`#DAE0E6`): Default page background — warm, paper-like gray.
- **Card White** (`#FFFFFF`): Post cards, comment panels, modals.
- **Card Hover** (`#F6F7F8`): Subtle hover state on cards.
- **Sidebar** (`#F6F7F8`): Right rail, community info panel.
- **Nav White** (`#FFFFFF`): Top navigation bar.
- **Dark Canvas** (`#030303`): Dark mode deepest background.
- **Dark Card** (`#1A1A1B`): Dark mode card surface.
- **Dark Elevated** (`#272729`): Dark mode elevated panels.

### Neutrals & Text
- **Text Primary** (`#1C1C1C`): Post titles, headings, primary body text.
- **Text Secondary** (`#576F76`): Metadata, timestamps, secondary labels.
- **Text Tertiary** (`#616466`): Placeholders, disabled text, muted captions.
- **Text Inverted** (`#FFFFFF`): Text on OrangeRed or dark surfaces.
- **Border Default** (`#EDEFF1`): Card borders, dividers.
- **Border Strong** (`#CCCCCC`): Input borders, separator lines.
- **Icon Default** (`#878A8C`): Inactive icons, muted controls.

### Semantic & Accent
- **Success Green** (`#46D160`): Online indicator, success toasts, mod-approved.
- **Error Red** (`#EA0027`): Error states, rule violations, removed posts.
- **Warning Amber** (`#FFB000`): Warnings, NSFW tags, spoiler markers.
- **Info Blue** (`#0079D3`): Informational banners, link text.
- **Mod Green** (`#00A328`): Mod shield, distinguished comments.
- **Admin Red** (`#FF4500`): Admin-distinguished, announcements.
- **NSFW Pink** (`#FF585B`): NSFW badge background.
- **Spoiler Gray** (`#545452`): Spoiler overlay.

### Gradient System
- **OrangeRed Glow**: `linear-gradient(135deg, #FF4500 0%, #FF6B3D 100%)` — hero CTAs, onboarding.
- **Karma Shimmer**: `linear-gradient(90deg, #FF4500, #FFD700, #FF4500)` — animated karma milestone.
- **Premium Gold**: `linear-gradient(135deg, #FFD700 0%, #FFAC33 100%)` — Reddit Premium badge.
- **Community Banner**: `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)` — subreddit banner text overlay.

## 3. Typography Rules

### Font Families
- **Headlines / System Chrome**: `"IBM Plex Sans"`, fallback: `"Segoe UI", "Helvetica Neue", Arial, sans-serif`
- **Body / Comments / Posts**: `"Noto Sans"`, fallback: `"Segoe UI", "Helvetica Neue", Arial, sans-serif`
- **Code / Mono**: `"Noto Sans Mono"`, fallback: `"Source Code Pro", Menlo, Consolas, monospace`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display Hero | IBM Plex Sans | 40px (2.5rem) | 700 | 1.15 | -0.01em | Landing pages, onboarding |
| Page Heading | IBM Plex Sans | 24px (1.5rem) | 700 | 1.25 | -0.005em | Subreddit name, settings titles |
| Section Heading | IBM Plex Sans | 18px (1.125rem) | 600 | 1.3 | normal | Sidebar sections, widget titles |
| Post Title | Noto Sans | 18px (1.125rem) | 500 | 1.3 | normal | Feed post titles (card view) |
| Post Title (Compact) | Noto Sans | 14px (0.875rem) | 500 | 1.3 | normal | Feed post titles (compact view) |
| Body | Noto Sans | 14px (0.875rem) | 400 | 1.5 | normal | Post body, comments, descriptions |
| Comment Author | IBM Plex Sans | 12px (0.75rem) | 700 | 1.3 | normal | Username in comment threads |
| Metadata | Noto Sans | 12px (0.75rem) | 400 | 1.3 | 0.01em | Timestamps, "posted by", vote count |
| Flair Tag | Noto Sans | 12px (0.75rem) | 500 | 1.0 | normal | User/post flair chips |
| Button Label | IBM Plex Sans | 14px (0.875rem) | 700 | 1.0 | 0.03em | CTA buttons |
| Tab / Nav | IBM Plex Sans | 14px (0.875rem) | 600 | 1.0 | normal | Feed sort tabs, navigation |
| Caption | Noto Sans | 10px (0.625rem) | 400 | 1.3 | 0.02em | Fine print, footer links |

### Principles
- **Dual-font pairing**: IBM Plex Sans brings technical precision to chrome and headings; Noto Sans brings global-reach warmth to conversation text.
- **Compact density**: Most functional text is 12-14px. Reddit is an information utility — density over decoration.
- **Weight-driven hierarchy**: Post titles use weight 500 (medium) to sit between body (400) and headings (700); this medium weight is the scanning layer.
- **Global script support**: Noto Sans provides coverage for every Unicode block — critical for a platform with communities in every language.

## 4. Component Stylings

### Buttons

**Primary (OrangeRed)**
- Background: `#FF4500`
- Text: `#FFFFFF`
- Padding: 8px 24px
- Radius: 9999px (full pill)
- Hover: `#D93B00`
- Use: "Join", "Post", "Sign Up", primary CTAs

**Secondary (Outlined)**
- Background: transparent
- Text: `#1C1C1C`
- Border: 1px solid `#EDEFF1`
- Padding: 8px 24px
- Radius: 9999px (full pill)
- Hover: background `#F6F7F8`
- Use: "Cancel", "Leave", secondary actions

**Ghost / Text**
- Background: transparent
- Text: `#576F76`
- Padding: 8px 12px
- Radius: 9999px
- Hover: background `#F6F7F8`
- Use: "Share", "Save", "Hide" — post action bar

**Blue Link**
- Background: `#0079D3`
- Text: `#FFFFFF`
- Padding: 4px 16px
- Radius: 9999px
- Use: "Follow", community subscribe

### Cards (Post Cards)

**Standard Post Card**
- Background: `#FFFFFF`
- Border: 1px solid `#EDEFF1`
- Radius: 8px
- Padding: 8px 0
- Hover: border `#898989`, subtle lift
- Structure: vote rail (left 40px) | content area | thumbnail (right, optional)

**Vote Rail**
- Width: 40px, left-aligned in card
- Upvote arrow: `#878A8C` default, `#FF4500` active
- Downvote arrow: `#878A8C` default, `#7193FF` active
- Vote count: `#1C1C1C`, 12px, bold, centered between arrows
- Arrow size: 24px touch target, 16px visual

**Compact Post Row**
- Background: `#FFFFFF`
- Border-bottom: 1px solid `#EDEFF1`
- Padding: 4px 8px
- No radius (list-style)
- Denser metadata, inline vote controls

### Inputs

**Search Bar**
- Background: `#F6F7F8`
- Text: `#1C1C1C`
- Placeholder: `#878A8C`
- Border: 1px solid `#EDEFF1`
- Radius: 9999px (full pill)
- Padding: 8px 16px 8px 40px (icon-aware)
- Focus: border `#0079D3`, background `#FFFFFF`

**Text Input**
- Background: `#FFFFFF`
- Border: 1px solid `#EDEFF1`
- Radius: 8px
- Padding: 8px 12px
- Focus: border `#0079D3`

### Navigation

**Top Nav Bar**
- Background: `#FFFFFF`
- Height: 48px
- Border-bottom: 1px solid `#EDEFF1`
- Reddit logo: Snoo icon + wordmark in OrangeRed
- Search: centered pill, 40% width on desktop
- Right rail: icon buttons (create, notifications, chat, user)

**Feed Sort Tabs**
- Active: `#0079D3` text, 2px bottom border `#0079D3`
- Inactive: `#878A8C` text
- Font: IBM Plex Sans, 14px, weight 600
- Tabs: Best, Hot, New, Top, Rising

### Distinctive Components

**Comment Thread**
- Depth line: 2px solid `#EDEFF1`, left margin 16px per level
- Max visual depth: 10 levels before "Continue this thread"
- Author line: username (12px, bold, community-colored) + flair + time
- Collapse button: vertical line click-to-collapse entire subtree
- Reply indent: 16px per nesting level

**Award Badges**
- Size: 16px inline, 24px in award modal
- Background: transparent
- Gold: `#FFD700` ring, Silver: `#C0C0C0`, Platinum: `#A0E8FF`
- Helpful: `#FF4500`, Wholesome: `#FF585B` (seal icon)
- Display: inline row after post/comment metadata

**Subreddit Banner**
- Height: 80px mobile, 228px desktop (customizable)
- Full-bleed image with gradient overlay for text legibility
- Community icon: 72px circle, positioned overlapping banner bottom edge
- Name: 28px IBM Plex Sans weight 700, white on gradient overlay

**Flair Chips**
- Background: community-defined color or `#EDEFF1`
- Text: community-defined or `#1C1C1C`
- Padding: 2px 8px
- Radius: 9999px (full pill)
- Font: 12px Noto Sans weight 500
- Types: user flair (after username), post flair (after title)

**Karma Display**
- Font: IBM Plex Sans, 14px, weight 700
- Color: `#1C1C1C` (neutral) — karma itself is not colored
- Format: abbreviated (1.2k, 45.3k, 1.2m)
- Location: user profile, hover card, post/comment vote count

**NSFW / Spoiler Tags**
- NSFW: `#FF585B` background, `#FFFFFF` text, 4px radius
- Spoiler: `#545452` background, `#FFFFFF` text, 4px radius
- Font: 10px, weight 700, uppercase
- Position: before post title

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
- Post card internal padding: 8px vertical, 8px horizontal
- Card gap in feed: 8px
- Comment indent per level: 16px

### Grid & Container
- Feed column: max 640px centered (card view)
- Sidebar: 312px fixed on desktop right
- Full-width nav bar with centered 1200px max content
- Three-column on community pages: nav | feed | sidebar
- Two-column on profile: feed | sidebar

### Whitespace Philosophy
- **Dense feed, breathing sidebar**: The card feed is tightly stacked (8px gaps) for rapid scanning. The sidebar gets generous 16-24px padding for readability of community rules and widgets.
- **Compact view as first-class**: Reddit supports Classic, Card, and Compact view modes. The system must work at all three density levels.
- **Content type drives spacing**: Text posts get tighter padding; image/video posts get zero padding on the media itself (full-bleed within the card).

### Border Radius Scale
- Minimal (4px): Tags (NSFW, Spoiler), small badges
- Standard (8px): Post cards, inputs, dropdowns, modals
- Large (16px): Image previews, video players
- Full (9999px): Buttons, pills, flair chips, search bar, avatars
- Circle (50%): Community icons, user avatars, vote arrows (background on hover)

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Recessed (Level -1) | `#DAE0E6` canvas, no shadow | Page background behind cards |
| Base (Level 0) | `#FFFFFF`, 1px solid `#EDEFF1` | Post cards, comment panels |
| Hover (Level 1) | border `#898989`, no shadow | Hovered post card |
| Raised (Level 2) | `box-shadow: 0 2px 4px rgba(0,0,0,0.08)` | Dropdowns, sort menus |
| Floating (Level 3) | `box-shadow: 0 4px 12px rgba(0,0,0,0.15)` | Modals, popup cards, hover previews |
| Overlay (Level 4) | `box-shadow: 0 8px 24px rgba(0,0,0,0.2)` + scrim `rgba(0,0,0,0.4)` | Lightbox, create-post modal |

**Shadow Philosophy**: Reddit uses light, functional shadows. The card-based layout relies on border separation and canvas-to-card color contrast rather than dramatic elevation. Shadows appear primarily on floating elements (menus, modals, hover previews) where the user needs to understand layering. The `#DAE0E6` canvas behind white cards creates a natural depth without any shadow at all.

## 7. Do's and Don'ts

### Do
- Use OrangeRed (`#FF4500`) for upvotes and primary CTAs — it is the singular brand moment
- Use Periwinkle (`#7193FF`) only for downvote active states — the orange/blue polarity is sacred
- Apply full-pill radius (9999px) to all buttons, chips, flairs, and search inputs
- Keep post cards on white with 1px `#EDEFF1` borders — clean, discrete units
- Use the `#DAE0E6` canvas behind cards for natural depth separation
- Show comment threading depth via left-edge vertical lines with 16px indent per level
- Abbreviate large numbers (1.2k, 45.3k) for karma and vote counts
- Allow community-level color customization for flairs and banners
- Use Accessible OrangeRed (`#C23600`) for orange text on light backgrounds

### Don't
- Don't use OrangeRed for backgrounds, surfaces, or decorative elements — functional only
- Don't mix upvote orange with downvote blue on the same element — they are polar opposites
- Don't use sharp corners on buttons — the pill shape is core to the redesign identity
- Don't apply heavy shadows to post cards — border + canvas contrast provides the depth
- Don't nest comments beyond 10 visible levels — link to "continue thread" instead
- Don't use decorative fonts or display-weight type — Reddit is an information utility, not a magazine
- Don't color-code karma numbers — karma is neutral; only the vote arrows carry color
- Don't place text directly on subreddit banners without a gradient overlay for legibility
- Don't use primary OrangeRed (`#FF4500`) as text on Canvas (`#DAE0E6`) — it fails WCAG AA

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile Small | <360px | Compact card view, bottom nav |
| Mobile | 360-640px | Standard mobile cards, hamburger nav |
| Tablet | 640-960px | Sidebar collapses, wider cards |
| Desktop Small | 960-1200px | Sidebar appears, standard feed |
| Desktop | 1200-1440px | Full three-column layout |
| Large Desktop | >1440px | Feed and sidebar centered in max-width container |

### Collapsing Strategy
- Sidebar: visible right rail on desktop, collapsed to drawer on tablet, hidden on mobile
- Navigation: top bar with search on desktop, bottom tab bar on mobile (Home, Discover, Create, Chat, Inbox)
- Post cards: Card view on mobile (full-width, no side padding), bordered cards on desktop
- Vote rail: Left column on desktop, inline horizontal on mobile (below post content)
- Comments: Full threading on desktop, reduced indent (8px) and shallower nesting on mobile
- Create button: Full "Create Post" pill on desktop, floating action button (FAB) on mobile
- Search: Full pill in nav on desktop, icon-only that expands on tap on mobile

## 9. Agent Prompt Guide

### Quick Color Reference
- Brand: OrangeRed (`#FF4500`)
- Background: Canvas Gray (`#DAE0E6`)
- Card surface: White (`#FFFFFF`)
- Text primary: Near Black (`#1C1C1C`)
- Text secondary: Teal Gray (`#576F76`)
- Upvote active: OrangeRed (`#FF4500`)
- Downvote active: Periwinkle (`#7193FF`)
- Link / info: Reddit Blue (`#0079D3`)
- Border: Light Gray (`#EDEFF1`)
- Award gold: Gold (`#FFD700`)

### Example Component Prompts
- "Create a post card: white background, 1px solid #EDEFF1 border, 8px radius. Left 40px vote rail with up/down arrows in #878A8C (active: #FF4500 up, #7193FF down). Post title at 18px Noto Sans weight 500 #1C1C1C. Metadata at 12px #576F76. Action bar below: Share, Save, Hide as ghost buttons."
- "Design a pill button: #FF4500 background, #FFFFFF text, 9999px radius, 8px 24px padding. IBM Plex Sans 14px weight 700. Hover: #D93B00."
- "Build a comment thread: 14px Noto Sans body, 12px bold username in community color. 2px #EDEFF1 left depth line, 16px indent per level. Vote arrows inline at 12px."
- "Create a subreddit banner: 228px height, full-bleed background image with linear-gradient(180deg, transparent, rgba(0,0,0,0.7)) overlay. Community icon 72px circle overlapping bottom. Name at 28px IBM Plex Sans weight 700 white."
- "Design flair chips: community-colored background, 9999px radius, 2px 8px padding. 12px Noto Sans weight 500."
- "Build the search bar: #F6F7F8 background, 9999px radius, 1px solid #EDEFF1, 8px 16px 8px 40px padding. Focus: border #0079D3, bg #FFFFFF."

### Iteration Guide
1. Start with `#DAE0E6` canvas — the warm gray paper behind everything
2. White cards with `#EDEFF1` borders — each post is a discrete unit, no shadows needed
3. OrangeRed for upvotes and primary CTAs only — Periwinkle for downvotes only
4. Pill everything (9999px) — buttons, chips, search, flairs
5. IBM Plex Sans for chrome, Noto Sans for conversation — compact at 12-14px
6. Comment threading via 2px depth lines and 16px indentation
7. Community layer: allow subreddit colors on banners, flairs, and usernames
8. Dense feed (8px card gaps), breathing sidebar (16-24px padding)
