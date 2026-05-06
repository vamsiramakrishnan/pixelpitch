# Design System Inspired by YouTube

> Category: Media & Consumer
> Video platform. Red play button, content-grid layout, thumbnail-driven discovery.

## 1. Visual Theme & Atmosphere

YouTube's interface is a clean, content-forward canvas where video thumbnails are the dominant visual element and the chrome recedes into neutral white and gray tones. The design philosophy is "thumbnail-first neutrality" — the UI provides a quiet, systematic frame so that vivid, unpredictable video thumbnails can do all the visual work. The signature YouTube Red (`#ff0000`) appears with surgical restraint: the logo wordmark, the video progress bar, the subscribe button, and the notification badge. Everywhere else, the palette is achromatic — whites, near-whites, and a careful ladder of grays.

Typography uses Roboto as the primary UI font across all surfaces, with YouTube Sans reserved for the wordmark lockup. Roboto at 400 (regular) and 500 (medium) weights gives the interface a utilitarian, information-dense feel — optimized for scanning hundreds of video titles, channel names, view counts, and timestamps. Text is compact: 10px metadata up to 20px page-level headings, with the vast majority at 14px.

What distinguishes YouTube is its thumbnail grid geometry and information density. Video cards are borderless, relying on natural contrast between photographic thumbnails and the white canvas. Thumbnails carry overlaid duration badges (dark semi-transparent pills), and every card packs title, channel name, view count, and upload date into a tight vertical stack below the image. The left sidebar uses a rail of 24px outline icons with 10px labels, collapsing to icon-only on narrower viewports. The persistent top app bar carries hamburger menu, YouTube logo, centered search bar, and right-aligned user controls.

**Key Characteristics:**
- Pure white canvas (`#ffffff`) with YouTube Red (`#ff0000`) used only for logo, progress bar, subscribe button, and notification badge
- Thumbnail-driven content grid — borderless cards where photography provides all visual weight
- Roboto 400/500 as the single UI font family across all surfaces
- Compact information density — title + channel + metadata stacked tightly below each thumbnail
- Duration badge pills (`rgba(0,0,0,0.6)`) overlaid at thumbnail bottom-right
- Left sidebar navigation: icon rail with text labels, collapsible to icon-only
- Persistent top app bar with centered search input
- Rounded 12px corners on thumbnails, chips, and containers (Material You influence)
- Dark semi-transparent overlays on video player controls
- Shorts vertical-video shelf as a distinct layout module within the main feed

## 2. Color Palette & Roles

### Primary Brand
- **YouTube Red** (`#ff0000`): The singular brand accent — logo wordmark, video progress bar, subscribe button fill, notification badge, and live indicator dot. Never used decoratively or as a surface color.
- **Dark Red** (`#cc0000`): Hover/pressed state for the subscribe button and red interactive elements.

### Surface & Background
- **Canvas White** (`#ffffff`): Primary page background, card surfaces, dialog backgrounds.
- **Soft Gray** (`#f2f2f2`): Chip backgrounds (inactive filter chips), hover states on white surfaces, secondary surface tint.
- **Light Gray** (`#e5e5e5`): Divider lines, input borders at rest, chip borders.
- **Elevated White** (`#f9f9f9`): Sidebar background, header background on scroll, subtle surface differentiation.
- **Overlay Black** (`rgba(0,0,0,0.6)`): Duration badge background on thumbnails, video player control scrim.
- **Overlay Light** (`rgba(0,0,0,0.05)`): Hover tint on thumbnails and interactive surfaces.

### Text
- **Primary Text** (`#0f0f0f`): Video titles, page headings, primary body copy — YouTube's near-black, slightly softer than pure `#000`.
- **Secondary Text** (`#606060`): Channel names, view counts, upload dates, metadata lines below video titles.
- **Tertiary Text** (`#909090`): Placeholder text, disabled labels, timestamps in comments.
- **Inverse White** (`#ffffff`): Text on dark surfaces — duration badges, player controls, subscribe button label, dark-mode inverse.

### Interactive & Semantic
- **Link Blue** (`#065fd4`): Hashtag links, channel mentions in descriptions, text hyperlinks in comments.
- **Active Blue** (`#3ea6ff`): Subscribed-state bell icon, active toggle indicators, selected chip outline in some contexts.
- **Like Green** (`#1b7e1b`): Positive sentiment indicator (used sparingly in analytics/studio contexts).
- **Error Red** (`#cc0000`): Form validation errors, destructive-action warnings.
- **Live Red** (`#ff0000`): LIVE badge background on active livestreams — same hue as brand red but contextually distinct.

### Chip & Tag
- **Chip Background** (`#f2f2f2`): Inactive filter/topic chip fill.
- **Chip Active** (`#0f0f0f`): Selected chip fill — inverts to near-black with white text.
- **Chip Border** (`#d9d9d9`): Subtle border on some chip variants.

### Video Player
- **Player Background** (`#000000`): True black behind the video frame.
- **Progress Bar Red** (`#ff0000`): The played portion of the seek bar — the most prominent use of brand red in the entire interface.
- **Buffer Gray** (`rgba(255,255,255,0.4)`): The buffered portion of the seek bar.
- **Scrubber Dot** (`#ff0000`): The draggable circle on the progress bar, 12px diameter.
- **Control Icon White** (`#ffffff`): Play/pause, volume, fullscreen, settings icons on the player chrome.

## 3. Typography Rules

### Font Families
- **UI / Body**: `Roboto`, fallbacks: `Arial, Noto Sans, sans-serif`
- **Wordmark / Marketing**: `YouTube Sans` (proprietary, used exclusively for the "YouTube" logotype and select campaign headings)

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Page Heading | Roboto | 20px / 1.25rem | 600 | 1.40 | normal | "Trending", "Subscriptions" page titles |
| Section Title | Roboto | 18px / 1.13rem | 500 | 1.33 | normal | "Shorts", "Breaking news", shelf headings |
| Video Title (List) | Roboto | 16px / 1.00rem | 500 | 1.375 | normal | Title on homepage/search grid cards |
| Video Title (Watch) | Roboto | 20px / 1.25rem | 600 | 1.40 | -0.2px | Title on the watch page below the player |
| Channel Name | Roboto | 14px / 0.88rem | 400 | 1.43 | normal | Below video title in cards |
| Metadata | Roboto | 14px / 0.88rem | 400 | 1.43 | normal | View count, date — "1.2M views  3 weeks ago" |
| Body | Roboto | 14px / 0.88rem | 400 | 1.43 | normal | Description text, comments |
| Button Label | Roboto | 14px / 0.88rem | 500 | 1.00 | 0.5px | Subscribe, Share, Download action buttons |
| Chip Label | Roboto | 14px / 0.88rem | 500 | 1.29 | normal | Filter chips — "All", "Music", "Gaming" |
| Comment Author | Roboto | 13px / 0.81rem | 500 | 1.23 | normal | Commenter display name |
| Comment Body | Roboto | 14px / 0.88rem | 400 | 1.43 | normal | Comment text content |
| Timestamp | Roboto | 12px / 0.75rem | 400 | 1.33 | normal | Comment timestamps, sidebar metadata |
| Badge / Duration | Roboto | 12px / 0.75rem | 500 | 1.00 | 0.5px | Duration pill on thumbnails — "12:34" |
| Micro | Roboto | 10px / 0.63rem | 500 | 1.20 | 0.2px | Notification count badge, fine print |

### Principles
- **Single-family discipline**: Roboto handles everything from 10px badge numerals to 20px page headings. YouTube Sans is reserved strictly for the wordmark.
- **Medium weight as emphasis**: The system uses 400 (regular) as body default and 500 (medium) for emphasis — 600 appears only on page headings and the watch-page video title. Bold (700) is rarely used in the core UI.
- **Compact and scannable**: The size range (10px-20px) is deliberately narrow, optimized for scanning dozens of video titles and metadata lines in a single viewport.
- **Metadata as secondary voice**: Channel name, view count, and date share the same 14px 400 styling, separated by a middle-dot ` ` delimiter — they read as a single metadata string rather than distinct fields.

## 4. Component Stylings

### Buttons

**Subscribe (Unsubscribed)**
- Background: YouTube Red `#ff0000`
- Text: `#ffffff`, Roboto 500, 14px
- Padding: 0 16px, height 36px
- Radius: 18px (full pill)
- Hover: `#cc0000`

**Subscribe (Subscribed)**
- Background: Soft Gray `#f2f2f2`
- Text: Primary Text `#0f0f0f`, Roboto 500, 14px
- Padding: 0 16px, height 36px
- Radius: 18px (full pill)
- Includes a bell notification icon to the right

**Like / Dislike**
- Background: Soft Gray `#f2f2f2`
- Text/Icon: Primary Text `#0f0f0f`, 24px icon
- Joined pill layout: Like and Dislike share a single pill with a 1px `#d9d9d9` vertical divider
- Padding: 0 16px per segment, height 36px
- Radius: 18px (full pill on outer edges)
- Active Like: icon fills solid, count text appears

**Icon Button** (Share, Download, Save, Clip, More)
- Background: Soft Gray `#f2f2f2`
- Icon: `#0f0f0f`, 24px
- Shape: pill with label — icon left, text right
- Padding: 0 16px, height 36px
- Radius: 18px

**Chip / Filter**
- Background: Soft Gray `#f2f2f2` (inactive), `#0f0f0f` (active)
- Text: `#0f0f0f` (inactive), `#ffffff` (active), Roboto 500, 14px
- Padding: 0 12px, height 32px
- Radius: 8px
- Horizontal scrollable row, no wrap

### Cards & Containers

**Video Card (Grid)**
- Background: transparent (no card container — thumbnail + text on white canvas)
- Thumbnail: 16:9 aspect ratio, 12px border-radius
- Duration badge: `rgba(0,0,0,0.6)` background, white Roboto 500 12px, 4px 6px padding, 4px radius, positioned bottom-right inset 4px
- Below thumbnail: 12px gap, then a row with 36px circular channel avatar on left and text stack on right
- Title: Roboto 500, 16px, `#0f0f0f`, max 2 lines with ellipsis overflow
- Channel + metadata: Roboto 400, 14px, `#606060`, channel name on line 1, "1.2M views  3 weeks ago" on line 2

**Video Card (List / Search)**
- Horizontal layout: 360px-wide thumbnail on left, text stack on right
- Thumbnail: 16:9, 12px radius, duration badge at bottom-right
- Title: Roboto 500, 18px, `#0f0f0f`, max 2 lines
- Metadata row: Channel name, view count, date at 14px 400 `#606060`
- Description snippet: 14px 400 `#606060`, max 2 lines

**Shorts Card**
- Aspect ratio: 9:16 (vertical)
- Radius: 12px
- Overlay at bottom: title text in white over a subtle gradient scrim
- Displayed in a horizontal shelf of 4-8 cards with a "Shorts" section heading and the Shorts icon (red lightning bolt)

### Inputs

**Search Bar**
- Background: `#ffffff`
- Border: 1px solid `#cccccc` at rest, 1px solid `#1c62b9` on focus
- Radius: 40px left side (pill), 0px right where it meets the search button
- Height: 40px
- Padding: 4px 4px 4px 16px
- Placeholder: Roboto 400, 16px, `#909090` — "Search"
- Search submit button: `#f8f8f8` background, magnifier icon `#0f0f0f`, 64px wide, radius 0 40px 40px 0 (pill right side)
- Focus: gains a subtle blue shadow and the border transitions to `#1c62b9`

**Comment Input**
- Single-line initially, expands on focus
- Border-bottom only: 1px solid `#e5e5e5` at rest, 2px solid `#0f0f0f` on focus
- No background fill, no radius
- Placeholder: "Add a comment..." Roboto 400, 14px, `#909090`

### Navigation

**Top App Bar**
- Height: 56px
- Background: `#ffffff`
- Left cluster: hamburger menu icon (24px, `#0f0f0f`) + YouTube logo lockup (red play-button icon + "YouTube" in near-black YouTube Sans, total ~90px wide)
- Center: search bar (max-width 640px) with microphone voice-search button (circular, 40px, `#f2f2f2` background)
- Right cluster: Create (+) icon, notification bell (with optional red badge showing count), user avatar (32px circular)
- Border-bottom: 1px solid `#e5e5e5` or none (varies by scroll context)

**Left Sidebar (Expanded)**: 240px wide, `#ffffff`. Items: 24px outline icon + 14px Roboto 400 label, 40px height, 12px horizontal padding. Active: `#f2f2f2` background, Roboto 500, 10px radius. Sections separated by 1px `#e5e5e5` dividers. Sections: Home, Shorts, Subscriptions | Library, History | Explore, Trending | Settings.

**Left Sidebar (Mini)**: 72px wide, icon-only with 10px label below, no dividers.

**Bottom Navigation (Mobile)**: 48px tall, `#ffffff`, border-top 1px `#e5e5e5`. Five items: Home, Shorts, Create (+), Subscriptions, Library. Create button is circular and slightly raised. Active: solid icon fill, Roboto 500 label.

### Distinctive Components

**Video Player**
- Aspect ratio: 16:9, background `#000000`
- Controls: gradient scrim from transparent to `rgba(0,0,0,0.7)` at bottom
- Progress bar: 3px at rest, 5px on hover; red (`#ff0000`) played, `rgba(255,255,255,0.4)` buffered, `rgba(255,255,255,0.2)` remaining
- Scrubber: 12px red circle on hover; chapter markers as thin white ticks
- Control icons: `#ffffff`, 24-36px; radius 0px inline, 12px in mini-player

**Thumbnail Grid**
- Homepage: responsive grid, 4 columns at desktop, 3 at tablet, 2 at small tablet, 1 on mobile
- Card gap: 16px horizontal, 40px vertical (larger vertical gap accommodates the metadata stack)
- Thumbnails fill column width, height determined by 16:9 ratio
- No card borders or shadows — whitespace alone provides separation

**Channel Page Header**
- Banner: full-width, ~200px, no radius
- Below: 80px circular avatar, channel name (24px Roboto 600 `#0f0f0f`), sub count (14px 400 `#606060`), subscribe button
- Tab bar: Home, Videos, Shorts, Live, Playlists, Community — 14px Roboto 500, active tab has 3px `#0f0f0f` underline on a 1px `#e5e5e5` border

**Shorts Shelf**
- Section heading: Shorts icon (red lightning bolt) + "Shorts" at 18px Roboto 500
- Horizontal scroll of 9:16 vertical thumbnail cards
- Each card: 12px radius, title overlaid at bottom in white over gradient scrim, max 2 lines
- Card width: ~210px at desktop, maintaining 9:16 ratio
- Sound and more-options icons overlaid at bottom-right of each card

**Comments Section**
- Each comment: 40px circular avatar left, text stack right
- Author: 13px Roboto 500 `#0f0f0f`, timestamp 13px 400 `#909090` inline
- Body: 14px Roboto 400 `#0f0f0f`
- Actions: thumbs up + count, thumbs down, Reply — all `#606060`
- Replies: indented 56px, collapsed behind "X replies" toggle in `#065fd4`

**Live Chat Panel**
- Width: 400px, right-adjacent to the player on desktop
- Background: `#ffffff`, radius 12px
- Message rows: 24px circular avatar + username (13px 500, randomized accent color) + message (13px 400 `#0f0f0f`)
- Super Chat: highlighted message with colored background (yellow/blue/pink tiers based on amount)
- Input at bottom: text field with send button, emoji picker toggle

**Progress Bar (Mini-player)**
- Flush edge-to-edge, 2px height, red (`#ff0000`) for played progress — a thin red line, no scrubber

## 5. Layout Principles

### Spacing System
- **Base unit**: 8px
- **Scale**: 4, 8, 12, 16, 24, 32, 40, 48px
- **Card gap**: 16px horizontal between grid cards, 40px vertical (accommodates metadata stack height)
- **Section padding**: 24px between shelf sections on the homepage
- **Component internal padding**: 12-16px within cards, 16px within chips, 24px within dialogs

### Grid & Container
- **Max content width**: ~1284px centered on ultra-wide (with sidebar expanded)
- **Homepage grid**: sidebar (240px or 72px) + content area, content area uses a fluid grid of 1-4 columns
- **Watch page**: player area (~70% width) + recommendations sidebar (~30%), stacking vertically on narrow viewports
- **Shorts page**: single centered vertical video, max 405px wide, full viewport height minus top bar

### Whitespace Philosophy
YouTube is information-dense — a homepage viewport shows 8-12 video cards. The system uses vertical spacing (40px between rows) rather than borders or shadows for separation. Within a card, spacing is tight (4-8px between text rows) so each video reads as a single scannable unit.

### Border Radius Scale
| Radius | Use |
|--------|-----|
| 0px | Video player (inline), banner images, progress bar |
| 4px | Duration badge, small utility elements |
| 8px | Chips, filter buttons, dropdowns |
| 10px | Active sidebar item highlight |
| 12px | Thumbnails, cards, dialogs, panels, Shorts cards |
| 18px | Pill buttons (subscribe, like/dislike, share) |
| 40px | Search bar (pill) |
| 50% | Avatars, notification badge, icon-only circular buttons |

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (0) | No shadow | Thumbnail cards, sidebar items, body content |
| Surface (1) | `rgba(0,0,0,0.1) 0 1px 2px` | Top app bar on scroll, sticky chip bar |
| Elevated (2) | `rgba(0,0,0,0.16) 0 2px 8px` | Dropdown menus, autocomplete suggestions, tooltip cards |
| Dialog (3) | `rgba(0,0,0,0.24) 0 8px 24px` | Modal dialogs, share sheet, playlist picker |
| Player Controls | Gradient scrim `rgba(0,0,0,0) → rgba(0,0,0,0.7)` | Bottom control bar overlay on the video player |
| Duration Badge | Solid `rgba(0,0,0,0.6)` fill | Time indicator pill on thumbnails |

**Shadow Philosophy**: YouTube uses extremely restrained shadows. All video cards have zero elevation. Shadows appear only on elements that truly float: the top bar on scroll, dropdowns, and modals. This flatness keeps the interface as close to "white paper with thumbnails" as possible.

## 7. Do's and Don'ts

### Do
- Use YouTube Red (`#ff0000`) exclusively for the logo, subscribe button, progress bar, notification badge, and live indicator — it must feel scarce and meaningful.
- Let thumbnails be the loudest visual element on every page — the UI chrome should be invisible.
- Use Roboto 400 for body and metadata, 500 for titles and emphasis — this two-weight system handles 95% of the interface.
- Apply 12px border-radius to thumbnails, cards, and containers — the signature rounding that arrived with Material You.
- Stack metadata tightly (4-8px gaps) below thumbnails — title, channel, views, and date should read as one scannable block.
- Use the joined like/dislike pill pattern — two actions sharing a single container with a divider.
- Apply the chip-bar pattern for filters: horizontal scrollable row, inactive chips in `#f2f2f2`, active chip inverted to `#0f0f0f`.
- Keep the video player controls on a gradient scrim, never on a solid opaque bar.

### Don't
- Don't use YouTube Red as a surface or background color — it is never a container fill, only an accent on interactive elements and the brand mark.
- Don't add borders or shadows to video cards — separation comes from whitespace and the natural edge of the thumbnail image.
- Don't mix YouTube Sans into the general UI — it is reserved for the wordmark only.
- Don't use rounded corners on the inline video player — the player is edge-to-edge with 0px radius.
- Don't place text overlays on thumbnails except for the duration badge — titles always sit below.
- Don't use heavy font weights (700+) in the core UI — 500 is the heaviest weight in regular use.
- Don't introduce additional accent colors — the palette is red + achromatic grays + a single link blue.
- Don't create bordered card containers — YouTube cards are "floating" text-and-thumbnail groups with no visible container.

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Large Desktop | >1400px | 4-column grid, expanded sidebar (240px), full search bar |
| Desktop | 1024-1400px | 3-column grid, expanded or mini sidebar |
| Tablet | 768-1023px | 2-column grid, mini sidebar (72px), search bar shortens |
| Mobile Large | 480-767px | 1-column grid, no sidebar, bottom tab bar appears |
| Mobile | <480px | 1-column full-width, compact top bar, bottom tab bar |

### Collapsing Strategy
- **Sidebar**: expanded (240px) -> mini (72px, icons + tiny labels) -> hidden on mobile, replaced by bottom tab bar
- **Search bar**: centered pill on desktop -> magnifier icon on mobile, tap opens full-width overlay
- **Thumbnail grid**: 4 -> 3 -> 2 -> 1 columns, 16:9 maintained at all sizes
- **Watch page**: player + sidebar horizontal -> stacked vertically on narrow viewports
- **Shorts**: centered single vertical video, max 405px wide, all breakpoints
- **Chip bar**: horizontal scroll always, never wraps to a second line

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: Canvas White (`#ffffff`)
- Surface: Soft Gray (`#f2f2f2`)
- Primary Text: Near Black (`#0f0f0f`)
- Secondary Text: Gray (`#606060`)
- Tertiary/Placeholder: Light Gray (`#909090`)
- Accent: YouTube Red (`#ff0000`)
- Border/Divider: Light Gray (`#e5e5e5`)
- Link: Blue (`#065fd4`)
- Player: True Black (`#000000`)
- Progress: YouTube Red (`#ff0000`)

### Example Component Prompts
- "Create a video card: 16:9 thumbnail with 12px border-radius, duration badge at bottom-right (`rgba(0,0,0,0.6)` fill, white 12px Roboto 500 text, 4px radius). Below: 12px gap, 36px circular avatar on left, text stack on right — title at 16px Roboto 500 #0f0f0f (max 2 lines), channel name at 14px Roboto 400 #606060, view count + date at 14px 400 #606060."
- "Design a subscribe button: YouTube Red (#ff0000) background, white Roboto 500 14px label, 18px pill radius, 36px height, 16px horizontal padding. Hover darkens to #cc0000. Subscribed state: #f2f2f2 background, #0f0f0f text, bell icon appended."
- "Build the like/dislike pill: joined container with 18px outer radius, #f2f2f2 background. Like segment: thumbs-up 24px icon + count in #0f0f0f. 1px #d9d9d9 vertical divider. Dislike segment: thumbs-down 24px icon. 36px height, 16px horizontal padding each segment."
- "Create a search bar: white background, 1px #cccccc border, 40px height, pill radius left (40px), text 16px Roboto 400. Adjacent search button: #f8f8f8, 64px wide, pill radius right, magnifier icon. On focus: border becomes #1c62b9."
- "Design the filter chip bar: horizontal scrollable row. Inactive chips: #f2f2f2 fill, #0f0f0f text, 8px radius, 32px height. Active chip: #0f0f0f fill, #ffffff text. 14px Roboto 500 labels, 12px horizontal padding."

### Iteration Guide
1. Start with `#ffffff` — everything sits on a pure white canvas. The interface is nearly invisible.
2. YouTube Red for functional highlights only — logo, subscribe, progress bar, notification badge. If you see red anywhere else, remove it.
3. Thumbnails are the hero — 16:9, 12px rounded, no borders, no shadows. The content IS the design.
4. Two weights handle everything: Roboto 400 for body/metadata, 500 for titles/buttons. Resist the urge to go bolder.
5. Pill-shape actions (subscribe, like/dislike, share) with 18px radius. Chips at 8px radius. Thumbnails at 12px radius.
6. Zero elevation on cards — shadows are reserved only for floating menus and modals.
7. The progress bar is the most emotionally resonant use of red — a thin `#ff0000` line that tracks time watched. Replicate this restraint in every design.
