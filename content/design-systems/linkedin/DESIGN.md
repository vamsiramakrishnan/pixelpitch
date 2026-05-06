# Design System Inspired by LinkedIn

> Category: Productivity & SaaS
> Professional network. Corporate blue, card-based feed, connection-driven design.

## 1. Visual Theme & Atmosphere

LinkedIn's design system is built for professional trust. The interface communicates competence without coldness, authority without intimidation. The page opens on a warm off-white canvas (`#f4f2ee`) -- not the sterile white of a tech startup, but the soft warm gray of a well-lit office. Content lives inside crisp white cards (`#ffffff`) with `1px solid #e0deda` borders, creating a layered card-feed architecture where every post, profile, and job listing is a discrete, scannable unit.

The signature LinkedIn Blue (`#0a66c2`) is a mid-saturation corporate blue that reads as simultaneously trustworthy and approachable. It avoids the electric brightness of social-media blues (Facebook, Twitter) and the deep navy of financial institutions. This blue appears on primary CTAs, active navigation states, link text, and the iconic "Connect" button -- always signaling action and connection. A secondary warm-blue (`#004182`) serves as hover/pressed state, darkening without cooling.

Typography uses the system font stack (`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif`), ensuring LinkedIn feels native to every operating system. Headlines run at weight 600 (semibold) in sizes from 14px to 24px -- deliberately restrained, never shouting. Body text sits at 14px weight 400, the workhorse size for feed content, job descriptions, and messaging. The system never uses display-scale type (32px+); LinkedIn's largest text is a profile name at 24px. This typographic restraint reinforces the professional-network tone: content speaks, not chrome.

The layout is a three-column desktop architecture: left profile sidebar, center feed, right sidebar with ads and suggestions. This feed-centric model means cards are the atomic unit of design. Every interaction -- posting, commenting, reacting, sharing -- happens within or adjacent to a card. The card system uses consistent 16px internal padding, 12px gaps between cards, and a uniform 8px border-radius that softens without becoming playful.

**Key Characteristics:**
- System font stack for native platform feel -- no custom fonts, no brand typography overhead
- LinkedIn Blue (`#0a66c2`) as singular action color -- every blue element is interactive
- Warm off-white page canvas (`#f4f2ee`) with pure white cards -- layered reading surface
- Card-based feed architecture -- every content unit is a bordered, padded card
- Weight 600 (semibold) for headings, weight 400 for body -- two-weight simplicity
- 8px border-radius on all containers -- soft but professional, never pill-shaped
- 48px circular avatars as the primary visual anchor in feed items
- Reaction system with six emoji reactions replacing simple likes
- Restrained type scale maxing at 24px -- content over chrome

## 2. Color Palette & Roles

### Primary
- **LinkedIn Blue** (`#0a66c2`): Primary brand color. CTAs, links, active nav tabs, "Connect" buttons, profile action buttons. The single interactive accent.
- **White** (`#ffffff`): Card surfaces, modal backgrounds, input backgrounds, nav bar background.
- **Warm Canvas** (`#f4f2ee`): Page background. The warm off-white that sits behind all card content.

### Brand Blues
- **Blue Hover** (`#004182`): Hover/pressed state for primary blue buttons and links. Darker, deeper corporate blue.
- **Blue Light** (`#70b5f9`): Secondary blue for icon fills, illustration accents, and lighter interactive hints.
- **Blue Light (Dark Mode)** (`#4b86e7`): Lighter variant of LinkedIn Blue for text on dark surfaces. Passes WCAG AA (4.50:1).
- **Blue Tint** (`#d0e8ff`): Notification badge backgrounds, selected-state tints, "You have new messages" highlights.
- **Blue Surface** (`#edf3f8`): Skill endorsement backgrounds, feature callout surfaces, section header tints.

### Text Colors
- **Text Primary** (`rgba(0,0,0,0.9)` / `#191919`): Primary headings, names, titles, body text. Near-black with warmth.
- **Text Secondary** (`rgba(0,0,0,0.6)` / `#666666`): Timestamps, secondary labels, metadata ("3rd+", "2h ago", "500+ connections").
- **Text Tertiary** (`rgba(0,0,0,0.4)` / `#6f6f6f`): Placeholder text, disabled labels, muted captions.
- **Text Inverse** (`#ffffff`): Text on blue buttons, dark overlays, premium gold badges.

### Semantic Colors
- **Success Green** (`#057642`): "Open to Work" frame, availability indicators, positive status.
- **Green Light** (`#7fc15e`): Online presence dots, active status indicators.
- **Green Surface** (`#e7f4e4`): Success message backgrounds, confirmation banners.
- **Warning Orange** (`#c37d16`): Premium/Gold badge color, warning indicators.
- **Premium Gold** (`#f8c77e`): LinkedIn Premium badge backgrounds, gold plan highlights.
- **Error Red** (`#cc1016`): Form validation errors, destructive action warnings, critical alerts.
- **Error Surface** (`#fce8e6`): Error message backgrounds, validation error fields.

### Neutral Scale
- **Border Default** (`#e0deda`): Standard card borders, divider lines, input borders.
- **Border Light** (`#ebebeb`): Subtle separators within cards, section dividers inside panels.
- **Surface Hover** (`#f5f5f5`): Hover state for list items, menu items, comment areas.
- **Surface Active** (`#e8e8e8`): Active/pressed state for interactive list items.
- **Dark Surface** (`#1d2226`): Messaging panel header, dark-mode surfaces, footer.

### Special
- **Open to Work Green** (`#01754f`): The "Open to Work" photo frame ring color.
- **Hiring Frame** (`#915907`): The "#Hiring" photo frame ring (amber/gold).
- **Creator Mode Orange** (`#e7700d`): Creator mode accent, "Follow" button in creator context.

## 3. Typography Rules

### Font Family
- **Primary**: `-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Arial, sans-serif`
- **Fallback in Stitch**: `Inter` (closest match to the system font rendering across platforms)
- **Monospace**: Not used in primary UI -- LinkedIn does not surface code-centric elements.

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Color | Notes |
|------|------|--------|-------------|----------------|-------|-------|
| Profile Name | 24px (1.5rem) | 600 | 1.25 | normal | `rgba(0,0,0,0.9)` | Largest text in the system, profile header only |
| Section Title | 20px (1.25rem) | 600 | 1.30 | normal | `rgba(0,0,0,0.9)` | "Experience", "Education", "About" on profile |
| Card Heading | 16px (1.0rem) | 600 | 1.375 | normal | `rgba(0,0,0,0.9)` | Post author name, job title in listings |
| Body / Feed Text | 14px (0.875rem) | 400 | 1.43 | normal | `rgba(0,0,0,0.9)` | Standard feed post content, descriptions |
| Body Semibold | 14px (0.875rem) | 600 | 1.43 | normal | `rgba(0,0,0,0.9)` | Emphasized text, link labels, action labels |
| Caption / Meta | 12px (0.75rem) | 400 | 1.33 | 0.1px | `rgba(0,0,0,0.6)` | Timestamps, connection degree, "2h ago" |
| Button Text | 16px (1.0rem) | 600 | 1.25 | normal | varies | Primary and secondary button labels |
| Button Small | 14px (0.875rem) | 600 | 1.25 | normal | varies | Compact buttons, reaction counts |
| Nav Label | 12px (0.75rem) | 400 | 1.33 | normal | `rgba(0,0,0,0.6)` | Bottom/top nav icon labels ("Home", "Jobs") |
| Badge Count | 11px (0.69rem) | 600 | 1.0 | normal | `#ffffff` | Notification count badges on nav icons |
| Overline / Pill | 12px (0.75rem) | 600 | 1.33 | 0.4px | varies | Skill pills, endorsement counts, status labels |

### Principles
- **System-native rendering**: No custom web fonts. The system stack ensures text renders at native quality on every platform, matching the OS reading experience.
- **Two-weight clarity**: 400 (regular) for reading, 600 (semibold) for labels, names, and headings. No bold (700), no light (300). This creates a binary signal: if it's semibold, it's a heading or label; if it's regular, it's content.
- **14px as the workhorse**: The majority of LinkedIn's UI runs at 14px -- feed text, descriptions, comments, messages. This is smaller than most social platforms (16px baseline) and reflects the density-over-delight philosophy of a professional tool.
- **Restrained scale**: Maximum text size is 24px (profile names). No display type, no hero headlines. LinkedIn's type scale compresses into a 12px--24px range, a 2:1 ratio that keeps everything feeling compact and information-dense.
- **Positive tracking on small text**: Captions and overlines at 12px use slight positive letter-spacing (0.1px--0.4px) for legibility at small sizes.

## 4. Component Stylings

### Feed Post Cards
- Background: `#ffffff`
- Border: `1px solid #e0deda`
- Border-radius: 8px
- Padding: 16px
- Structure: author row (48px avatar + name/title/timestamp) -> post text (14px, max 3 lines with "...see more") -> optional media (image/video/document) -> reaction summary bar -> action bar (Like/Comment/Repost/Send)
- Author avatar: 48px circle, `border-radius: 50%`
- Author name: 14px weight 600, black; title: 14px weight 400, `rgba(0,0,0,0.6)`
- Action bar: four evenly spaced buttons with 20px icons + 14px labels, color `rgba(0,0,0,0.6)`, hover background `rgba(0,0,0,0.08)`, border-radius 4px
- Card gap: 8px between feed cards

### Profile Header with Banner
- Banner: full-width image, 200px height, border-radius 8px 8px 0 0
- Avatar: 152px circle, 4px white border, positioned 50% overlapping banner bottom edge
- Name: 24px weight 600, `rgba(0,0,0,0.9)`
- Headline: 16px weight 400, `rgba(0,0,0,0.9)`, max 2 lines
- Location + connection count: 14px weight 400, `rgba(0,0,0,0.6)`, separated by bullet
- Action row: "Connect" (primary blue, 8px radius pill), "Message" (outlined blue, 8px radius pill), "More" (outlined, circle icon button)
- "Open to Work" banner: green background `#057642`, white text, rounded pill below headline
- Card: white, 1px solid `#e0deda`, 8px border-radius, 0 top-radius when banner present

### Connection Cards
- Layout: compact horizontal card, 72px height
- Avatar: 48px circle, left-aligned
- Name: 14px weight 600, single line truncated
- Headline: 12px weight 400, `rgba(0,0,0,0.6)`, single line truncated
- Mutual connections: 12px weight 400, `rgba(0,0,0,0.6)`, with overlapping 16px mini-avatars
- "Connect" button: outlined, 1px solid `#0a66c2`, color `#0a66c2`, 16px border-radius pill, 14px weight 600
- Dismiss: small "X" icon, top-right, `rgba(0,0,0,0.4)`

### Job Listing Cards
- Background: `#ffffff`
- Border: `1px solid #e0deda`, 8px radius
- Padding: 16px
- Company logo: 48px square, 4px border-radius, left-aligned
- Job title: 16px weight 600, color `#0a66c2` (linked)
- Company name: 14px weight 400, `rgba(0,0,0,0.9)`
- Location: 14px weight 400, `rgba(0,0,0,0.6)`
- Metadata pills: "Easy Apply" with LinkedIn green background (`#e7f4e4`, text `#057642`), "Promoted" in gray
- Posted time: 12px weight 400, `rgba(0,0,0,0.6)` ("2 days ago")
- Save button: bookmark icon, `rgba(0,0,0,0.6)`, toggles to filled `#0a66c2`

### Messaging Panel
- Container: fixed bottom-right (desktop), full-screen (mobile)
- Header: `#1d2226` dark background, white text, 16px weight 600
- Minimize/expand: chevron icon toggle
- Conversation list: white background, 72px row height, 48px avatar + name (14px/600) + preview (12px/400) + timestamp (12px/400 `rgba(0,0,0,0.4)`)
- Unread indicator: `#0a66c2` dot, 8px diameter
- Chat bubble (sent): `#d0e8ff` background, `rgba(0,0,0,0.9)` text, 18px border-radius, max-width 65%
- Chat bubble (received): `#f4f2ee` background, `rgba(0,0,0,0.9)` text, 18px border-radius
- Input: white background, 1px solid `#e0deda`, 20px border-radius pill, 14px text

### Reaction System
Six reactions, each with a distinct emoji icon and label color:
- **Like** (thumbs up): `#0a66c2` blue -- the default, most common reaction
- **Celebrate** (clapping hands): `#44712e` green
- **Support** (heart-hands): `#7a3db8` purple
- **Love** (red heart): `#cc1016` red
- **Insightful** (lightbulb): `#e7700d` orange
- **Funny** (laughing face): `#44712e` green-teal

Display: reaction picker appears on hover/long-press of Like button, horizontal row of 24px animated emoji icons with 4px gap, 28px total height, pill container with `#ffffff` background, `box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.16)`, 24px border-radius. Summary below post shows top 3 reaction icons (16px) + total count in `rgba(0,0,0,0.6)`.

### Endorsement Badges
- Skill name: 14px weight 600, color `#0a66c2`, clickable
- Endorsement count: 14px weight 400, `rgba(0,0,0,0.6)`, in parentheses or right-aligned
- Top skill badge: pill shape, `#edf3f8` background, `#0a66c2` text, 16px border-radius
- Endorser avatars: row of overlapping 24px circles, max 5 visible + "+N" count
- "Endorse" button: small text link, `#0a66c2`

### "Open to Work" Photo Frame
- Overlay: `#01754f` green ring on profile photo, lower arc reads "Open To Work" in white
- Ring: 4px width, positioned as a circular border around the avatar
- Text: 10px weight 700, uppercase, white on green arc, letter-spacing 0.5px
- Applied to: 152px profile avatar (profile page), 48px feed avatar (feed posts), 72px avatar (search results)
- "#Hiring" variant: `#915907` amber ring, "#Hiring" label

### Company Pages
- Banner: full-width, 192px height, brand-colored
- Company logo: 108px square, 4px radius, 4px white border, overlapping banner bottom-left
- Company name: 24px weight 600
- Industry + follower count: 14px weight 400, `rgba(0,0,0,0.6)`, separated by bullet
- Tab navigation: "Home", "About", "Posts", "Jobs", "People" -- 14px weight 600, `rgba(0,0,0,0.6)`, active tab underlined with 2px `#0a66c2` border-bottom
- "Follow" button: primary blue pill; "+ Follow" label
- Content area: same card-based feed as personal profiles

### Article Publishing (Newsletter/Article Cards)
- Cover image: full-width within card, 8px top border-radius
- Article title: 16px weight 600, `rgba(0,0,0,0.9)`, max 2 lines
- Author + publication: 14px weight 400 with 32px avatar
- Subtitle/excerpt: 14px weight 400, `rgba(0,0,0,0.6)`, max 2 lines
- Read time: 12px weight 400, `rgba(0,0,0,0.4)` ("5 min read")
- Newsletter badge: pill, `#edf3f8` background, `#0a66c2` text, 12px font

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px
- Internal card padding: 16px (standard), 12px (compact/mobile)
- Card-to-card gap: 8px
- Section heading to content: 16px
- Avatar to text: 12px horizontal gap

### Grid & Container
- Max content width: 1128px (centered)
- Three-column desktop: 225px left sidebar + 540px center feed + 300px right sidebar, 24px column gaps
- Two-column tablet: feed + right sidebar, left sidebar collapses
- Single-column mobile: full-width cards with 8px horizontal margin
- Nav bar: full-width, max 1128px inner content, 52px height

### Whitespace Philosophy
- **Density over delight**: LinkedIn packs information tightly. Cards have 16px padding, not 24px or 32px. Text runs at 14px, not 16px. The system respects that professionals scan, not browse.
- **Warm canvas breathing room**: The `#f4f2ee` background between cards (8px gap) creates visual breathing room without wasting vertical space.
- **Consistent card rhythm**: Every card uses the same border, radius, and padding treatment, creating a metronomic visual rhythm that makes scanning a long feed effortless.

### Border Radius Scale
- Micro (4px): Action bar hover states, company logos, small buttons
- Standard (8px): Cards, containers, input fields, dropdown menus
- Comfortable (16px): Pill buttons ("Connect", "Follow"), skill tags
- Circle (50%): Avatars (all sizes), online indicators, notification dots
- Pill (20px): Message input field, search bar

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, `1px solid #e0deda` border | Feed cards, profile sections, standard containers |
| Raised (Level 1) | `0 0 0 1px rgba(0,0,0,0.08)` | Subtle card differentiation, hover lift |
| Elevated (Level 2) | `0 4px 12px rgba(0,0,0,0.16)` | Dropdown menus, reaction picker, tooltips |
| Modal (Level 3) | `0 8px 24px rgba(0,0,0,0.24)` | Modals, compose post overlay, full-screen panels |
| Overlay (Level 4) | Full-page `rgba(0,0,0,0.65)` backdrop + Level 3 on panel | Image viewer, profile photo viewer, modal overlays |

**Shadow Philosophy**: LinkedIn's elevation system is border-first, shadow-second. Most elements rely on the `1px solid #e0deda` border for visual containment rather than shadows. Shadows appear only for floating UI: dropdowns, tooltips, and modals. This keeps the feed feeling grounded -- cards sit *on* the canvas, not *above* it. The shadow colors use neutral black at moderate opacity (0.08 to 0.24), never blue-tinted, reflecting the no-nonsense professional tone.

### Decorative Depth
- Profile banner creates depth via the overlapping avatar (protruding 50% below)
- Messaging panel overlays the page as a fixed-position element with Level 2 shadow
- "Open to Work" and "#Hiring" frames add colored ring depth to avatars
- Sticky nav bar uses a `1px solid #e0deda` bottom border, no shadow

## 7. Do's and Don'ts

### Do
- Use `#0a66c2` LinkedIn Blue exclusively for interactive elements -- every blue element should be clickable or tappable
- Use the system font stack for native rendering on every platform
- Keep type scale between 12px and 24px -- LinkedIn never uses display-size text
- Use 8px border-radius on all card containers consistently
- Place 48px circular avatars as the primary visual anchor in feed items and lists
- Use `#f4f2ee` warm off-white for page backgrounds -- never pure white or cool gray
- Maintain 16px internal padding on all cards
- Use `1px solid #e0deda` borders on cards rather than shadows for containment
- Show reaction summaries as overlapping 16px emoji icons with a count
- Use pill-shaped buttons (16px radius) for primary actions like "Connect" and "Follow"
- Truncate long text with "...see more" at 3 lines in feed posts
- Use Blue Light (#4b86e7) for interactive blue elements on dark surfaces

### Don't
- Don't use LinkedIn Blue for non-interactive text or decorative elements -- blue means "action"
- Don't exceed 24px for any text size -- LinkedIn's restraint is intentional
- Don't use custom fonts or heavy web fonts -- the system stack IS the brand
- Don't apply pill shapes (full radius) to content cards -- 8px radius only
- Don't use drop shadows on feed cards -- borders provide containment
- Don't mix warm and cool grays -- LinkedIn's neutral scale is consistently warm
- Don't make avatars square or rounded-square -- always circular (border-radius 50%)
- Don't use more than two font weights (400 and 600) in standard UI
- Don't place feed content outside of card containers -- everything lives in a card
- Don't use colored backgrounds on cards (except hover states) -- cards are always white
- Don't hide the reaction system behind a generic "like" -- all six reactions should be accessible
- Don't use primary LinkedIn Blue (#0a66c2) as text on dark backgrounds -- it fails WCAG AA

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <768px | Single column, bottom nav bar, full-width cards, compose button as FAB |
| Tablet | 768-1024px | Two-column (feed + right sidebar), top nav, left sidebar collapses to icons |
| Desktop | 1024-1200px | Three-column layout begins, all sidebars visible |
| Large Desktop | >1200px | Full 1128px container, centered with generous margins |

### Touch Targets
- Action bar buttons (Like/Comment/Repost/Send): 48px minimum tap height
- Connection card "Connect" button: 32px height, 80px minimum width
- Avatar tap targets: 48px minimum (even if avatar renders at 32px)
- Navigation icons: 48px tap target with 24px icon
- Messaging compose: 48px input height, pill-shaped

### Collapsing Strategy
- Navigation: top horizontal nav (desktop) -> bottom tab bar with 5 icons (mobile)
- Left sidebar: full profile card -> collapses entirely on tablet/mobile
- Right sidebar: suggestions + ads -> collapses entirely on mobile
- Feed cards: maintain full width, reduce padding from 16px to 12px
- Profile header: banner height reduces to 120px, avatar to 96px on mobile
- Messaging: bottom-right panel (desktop) -> full-screen view (mobile)
- Job listings: card grid -> single-column stacked list
- Tab navigation on profiles: horizontal scroll with fade edges on mobile
- Company logo in cards: 48px -> 40px on mobile

### Image Behavior
- Post images: full-width within card, maintain aspect ratio, max-height 512px with scroll
- Profile banners: full-width, height scales proportionally (200px desktop, 120px mobile)
- Document carousels: swipeable cards with dot pagination indicator
- Video: inline autoplay (muted) in feed, full-screen on tap (mobile)
- Gallery posts: 2x2 grid with "+N more" overlay on the fourth image

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: LinkedIn Blue (`#0a66c2`)
- CTA Hover: Blue Dark (`#004182`)
- Page Background: Warm Canvas (`#f4f2ee`)
- Card Background: White (`#ffffff`)
- Heading text: Near-Black (`rgba(0,0,0,0.9)`)
- Secondary text: Medium Gray (`rgba(0,0,0,0.6)`)
- Placeholder text: Light Gray (`rgba(0,0,0,0.4)`)
- Border: Warm Border (`#e0deda`)
- Link: LinkedIn Blue (`#0a66c2`)
- Success/Open to Work: Green (`#057642`)
- Premium: Gold (`#f8c77e`)
- Error: Red (`#cc1016`)
- Dark Surface: Charcoal (`#1d2226`)

### Stitch Token Mapping
```
primaryColor: #0a66c2
colorMode: LIGHT
colorVariant: NEUTRAL
headlineFont: INTER
bodyFont: INTER
roundness: ROUND_EIGHT
```

### Example Component Prompts
- "Create a feed post card: white background, 1px solid #e0deda, 8px radius. Author row: 48px circular avatar + name at 14px weight 600 + title/timestamp at 14px weight 400 in rgba(0,0,0,0.6). Post body at 14px weight 400. Action bar at bottom: four evenly spaced buttons (Like/Comment/Repost/Send) with 20px icons, 14px labels in rgba(0,0,0,0.6), hover bg rgba(0,0,0,0.08)."
- "Design a profile header: full-width banner (200px, 8px top radius), overlapping 152px circular avatar with 4px white border. Name at 24px weight 600, headline at 16px weight 400, location at 14px rgba(0,0,0,0.6). Blue pill 'Connect' button (#0a66c2, white text, 16px radius) and outlined 'Message' button (1px solid #0a66c2, blue text)."
- "Build a connection suggestion card: white bg, 1px solid #e0deda, 8px radius. 48px circular avatar, name 14px/600, headline 12px/400 rgba(0,0,0,0.6), mutual connections as 16px overlapping mini-avatars + text. Outlined 'Connect' pill button (1px solid #0a66c2, #0a66c2 text, 16px radius)."
- "Create a job listing card: white bg, 1px solid #e0deda, 8px radius, 16px padding. 48px square company logo (4px radius) left-aligned. Job title 16px/600 in #0a66c2 (linked), company 14px/400 black, location 14px/400 gray. 'Easy Apply' pill badge (#e7f4e4 bg, #057642 text, 12px font, 16px radius)."
- "Design the reaction picker: horizontal row of six emoji icons (24px each), white pill container with box-shadow 0 4px 12px rgba(0,0,0,0.16), 24px border-radius. Icons: thumbs-up (blue), clapping (green), heart-hands (purple), heart (red), lightbulb (orange), laughing (teal)."

### Iteration Guide
1. LinkedIn Blue (`#0a66c2`) is interactive-only -- if it's blue, it must be clickable
2. System font stack, mapped to Inter in Stitch -- never use decorative or serif fonts
3. Two weights only: 400 (content) and 600 (labels/headings) -- no 300, no 700
4. 14px is the default text size; 24px is the maximum. Keep the type scale compressed
5. Cards use borders (`1px solid #e0deda`), not shadows -- shadows are reserved for floating UI
6. Page background is warm (`#f4f2ee`), never cool gray or pure white
7. Avatars are always circular (50% radius) at standard sizes: 24px, 32px, 48px, 72px, 96px, 152px
8. Pill buttons (16px radius) for primary actions; 8px radius for cards and containers
9. 8px gap between feed cards creates the scanning rhythm
10. All six reactions (Like/Celebrate/Support/Love/Insightful/Funny) should be available, not just "Like"
