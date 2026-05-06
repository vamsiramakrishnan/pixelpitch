# Design System Inspired by Twitch

> Category: Media & Consumer
> Live streaming platform. Electric purple, dark gaming UI, community-first design.

## 1. Visual Theme & Atmosphere

Twitch is a live-streaming platform built for marathon viewing sessions in dim rooms. The entire interface is dark-first -- a layered system of near-black and charcoal surfaces (`#0e0e10`, `#18181b`, `#1f1f23`) that keeps the stream player the undisputed focal point. Every UI element around the video recedes into shadow so that a streamer's face, gameplay, or creative work can glow at full luminance without competing with chrome.

The signature color is **Twitch Purple** (`#9146ff`) -- an electric, saturated violet that appears on the brand logo, primary CTAs, live indicators, followed-channel highlights, and the iconic "Subscribe" button. Purple is used with deliberate restraint on surfaces: it is never a background fill for large panels, only for interactive affordances and brand moments. The result is that when purple does appear -- a hype train progress bar, a channel point prediction, a raid notification -- it reads as an event, not decoration.

Typography uses **Inter** for UI chrome and body text, and **Roobert** (Twitch's custom geometric sans) for display headlines, marketing surfaces, and brand moments. Roobert's rounded terminals and slightly playful geometry give Twitch its "gaming-meets-community" voice -- warmer than a pure tech sans, but structured enough for dense data-heavy interfaces like chat, analytics dashboards, and mod tools.

**Key Characteristics:**
- Dark-first surfaces: `#0e0e10` / `#18181b` / `#1f1f23` (three-step depth)
- Twitch Purple `#9146ff` as the singular saturated accent -- functional, never decorative
- Roobert for display and brand; Inter for UI and body
- Chat sidebar as a first-class layout citizen, not an afterthought
- 8px card radii, 4px input radii, 0px player radii, full pill on badges
- Real-time state indicators: live dots, viewer counts, hype trains, predictions
- Dense information architecture -- chat, points, emotes, badges all coexist without clutter

## 2. Color Palette & Roles

### Primary Brand
- **Twitch Purple** (`#9146ff`): Brand primary, subscribe button, followed highlights, hype train fills, prediction accents. The heart of the visual identity.
- **Purple Hover** (`#772ce8`): Hover and active state for purple elements. Slightly deeper and more saturated.
- **Purple Dark** (`#5c16c5`): Pressed state, active tab underlines, and visited link variant.
- **Purple Soft** (`rgba(145, 70, 255, 0.2)`): Translucent purple wash for mention highlights, notification backgrounds, and selected states.

### Surface (Dark Theme -- default)
- **Background Base** (`#0e0e10`): Deepest layer -- page background, behind all panels.
- **Background Alt** (`#18181b`): Primary content surface -- stream panels, sidebar, chat container.
- **Background Alt2** (`#1f1f23`): Elevated surface -- cards, dropdowns, hover overlays, modal backdrops.
- **Background Float** (`#26262c`): Floating elements -- tooltips, autocomplete, context menus.
- **Background Input** (`#464649`): Text input fill -- search bar, chat input, form fields.
- **Hover Overlay** (`rgba(255, 255, 255, 0.08)`): Transparent white overlay on hover states.
- **Selected Overlay** (`rgba(255, 255, 255, 0.12)`): Active/selected row or channel highlight.

### Text
- **Text Primary** (`#efeff1`): Headlines, body copy, chat messages in dark mode.
- **Text Secondary** (`#adadb8`): Timestamps, secondary labels, channel metadata.
- **Text Muted** (`#53535f`): Disabled text, placeholder copy, inactive tab labels.
- **Text Link** (`#bf94ff`): Inline hyperlinks in chat and descriptions -- a lighter purple for legibility on dark.
- **Text Alt** (`#dedee3`): Alternative primary text for slightly softer contexts.
- **Username Colors**: Chat assigns 15 default colors (`#ff0000`, `#0000ff`, `#00ff7f`, `#b22222`, `#ff69b4`, `#1e90ff`, `#ff4500`, `#8a2be2`, etc.) plus custom subscriber colors.

### Semantic & Status
- **Live Red** (`#eb0400`): Live indicator dot, "LIVE" badge, recording states. The only red that appears unprompted.
- **Success Green** (`#00ad03`): Online status, successful actions, partner checkmark.
- **Warning Yellow** (`#ffd000`): Automod flags, warning states, timeout indicators.
- **Error Red** (`#d0021b`): Form validation errors, ban states, destructive actions.
- **Info Blue** (`#1f69ff`): Informational tooltips, affiliate program badges.
- **Bits Blue** (`#1db2ff`): Bits/cheers system -- the teal-blue that represents Twitch's virtual currency.

### Accent & Community
- **Sub Badge Gold** (`#ffd700`): Subscriber loyalty badges, gift sub sparkle.
- **Hype Train Purple** (`#9146ff`): Hype train progress bar fill.
- **Prediction Blue** (`#1587e8`): Prediction outcome A.
- **Prediction Pink** (`#e81587`): Prediction outcome B.
- **Raid Purple** (`#bf94ff`): Raid notification banner and animation accent.
- **Mod Green** (`#00ad03`): Moderator sword badge and mod action indicators.
- **VIP Magenta** (`#e005b9`): VIP badge accent.

### Border & Divider
- **Border Default** (`rgba(255, 255, 255, 0.08)`): Subtle dividers between sections.
- **Border Strong** (`rgba(255, 255, 255, 0.16)`): Emphasized dividers, card borders on hover.
- **Border Input** (`rgba(255, 255, 255, 0.12)`): Input field borders at rest.

## 3. Typography Rules

### Font Families
- **Display / Brand**: `Roobert`, fallback: `Inter, "Helvetica Neue", Helvetica, Arial, sans-serif`. Twitch's custom geometric sans with rounded terminals -- used for marketing headlines, onboarding, and brand moments.
- **UI / Body / Chat**: `Inter`, fallback: `"Helvetica Neue", Helvetica, Arial, sans-serif`. The workhorse for all product UI, chat messages, navigation, and data.
- **Mono / Code**: `"JetBrains Mono", "Fira Code", Consolas, monospace`. Used in developer tools, API docs, and bot command displays.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Display | Roobert | 48px (3rem) | 700 | 1.1 | -0.02em | Marketing pages, event banners |
| Page Title | Roobert | 32px (2rem) | 700 | 1.2 | -0.01em | Dashboard headers, settings pages |
| Section Heading | Roobert | 24px (1.5rem) | 600 | 1.25 | normal | Directory categories, panel titles |
| Stream Title | Inter | 18px (1.125rem) | 600 | 1.3 | normal | Stream title in player chrome |
| Channel Name | Inter | 14px (0.875rem) | 700 | 1.25 | normal | Sidebar channel list, bold emphasis |
| Body | Inter | 14px (0.875rem) | 400 | 1.4 | normal | Descriptions, about panels, general UI |
| Chat Message | Inter | 13px (0.8125rem) | 400 | 1.35 | normal | Chat messages -- compact for density |
| Chat Username | Inter | 13px (0.8125rem) | 700 | 1.35 | normal | Bold username before message |
| Label / Button | Inter | 13px (0.8125rem) | 600 | 1.0 | 0.02em | Button text, nav labels |
| Caption / Meta | Inter | 12px (0.75rem) | 400 | 1.3 | 0.01em | Viewer counts, timestamps, tags |
| Badge Text | Inter | 10px (0.625rem) | 700 | 1.0 | 0.04em | Sub badges, live tag, status pills |
| Emote Alt | Inter | 11px (0.6875rem) | 400 | inherit | normal | Emote fallback text in chat |

### Principles
- **Two-font system with clear roles**: Roobert is the brand voice (display, marketing, events). Inter is the product voice (UI, chat, data). Never swap them.
- **Compact at the chat layer**: Chat messages at 13px with tight line-height (1.35) pack hundreds of messages into the sidebar without scrollbar fatigue.
- **Weight hierarchy over size hierarchy**: Most UI text lives at 13-14px. Differentiation comes from 400 (body) vs 600 (labels) vs 700 (emphasis/usernames).
- **Username color trumps weight**: In chat, the username's assigned color is the primary differentiator; bold weight is secondary reinforcement.

## 4. Component Stylings

### Buttons

**Primary (Purple)**
- Background: `#9146ff`
- Text: `#ffffff`, Inter 13px / 600
- Padding: 8px 16px
- Radius: 6px
- Hover: `#772ce8`
- Active: `#5c16c5`
- Use: Subscribe, Follow, primary CTAs

**Secondary (Ghost)**
- Background: `rgba(255, 255, 255, 0.08)`
- Text: `#efeff1`, Inter 13px / 600
- Padding: 8px 16px
- Radius: 6px
- Hover: `rgba(255, 255, 255, 0.12)`
- Use: Cancel, secondary actions, filter toggles

**Destructive**
- Background: `#d0021b`
- Text: `#ffffff`
- Padding: 8px 16px
- Radius: 6px
- Hover: `#a8021b`
- Use: Ban, delete, report

**Text Button**
- Background: transparent
- Text: `#bf94ff` (purple link color)
- Hover: text lightens to `#d8b4ff`, subtle underline
- Use: Inline actions, "Show more", navigation links

**Icon Button (Circular)**
- Background: transparent
- Icon: `#efeff1`
- Padding: 8px
- Radius: 50%
- Hover: `rgba(255, 255, 255, 0.08)` background
- Use: Chat settings, mod tools, share, clip

### Cards

**Stream Card (Directory)**
- Background: `#1f1f23`
- Thumbnail: 16:9 aspect ratio, 0px radius (sharp corners on thumbnails)
- Content padding: 10px
- Radius: 8px on card container
- Hover: border `rgba(255, 255, 255, 0.12)`, slight brightness lift on thumbnail
- Live indicator: Red `#eb0400` dot + "LIVE" pill badge, top-left of thumbnail
- Viewer count: bottom-left overlay pill, `rgba(0, 0, 0, 0.6)` background

**Channel Card (Sidebar)**
- Background: transparent at rest
- Hover: `rgba(255, 255, 255, 0.08)`
- Height: 42px
- Layout: avatar (30px circle) + channel name + game name + viewer count
- Live state: purple left border accent (2px)
- Offline: dimmed to `#53535f` text

### Inputs

**Text Input (Chat)**
- Background: `#464649`
- Text: `#efeff1`
- Placeholder: `#53535f`
- Border: none at rest
- Radius: 4px
- Padding: 8px 12px
- Focus: 2px `#9146ff` border
- The chat input is always visible at the bottom of the chat panel

**Search Input**
- Same fill as chat input (`#464649`), 6px radius, left-padded 36px for icon, focus: 2px `#9146ff` border

### Navigation

**Top Nav Bar**
- Background: `#18181b`
- Height: 50px
- Logo: Twitch Glitch icon in `#9146ff`, top-left
- Search: centered, 400px width
- User controls: right-aligned -- bits, notifications, avatar

**Left Sidebar (Followed Channels)**
- Background: `#1f1f23`
- Width: 240px (expanded), 50px (collapsed)
- Section headers: Inter 12px / 700, `#adadb8`, uppercase
- Channels: avatar + name + game + viewer count (red dot if live)
- Collapse toggle: chevron at bottom

### Distinctive Components

**Stream Player**
- Radius: 0px -- fills container edge-to-edge, no rounding
- Controls overlay: gradient to `rgba(0, 0, 0, 0.7)` at bottom
- Theatre mode: full width + chat sidebar; fullscreen: chat hidden unless popped out

**Chat Panel**
- Background: `#18181b`, 340px wide; message density ~20px/line at 13px
- Usernames: bold + assigned color; badges 18x18px inline before name
- Emotes: 28px inline (1x), 56px emote-only (2x); chat input fixed bottom with emote/bits buttons

**Channel Points**
- Icon: custom channel point icon, 20px, in purple or channel-custom color
- Prediction cards: two-outcome layout with `#1587e8` (blue) vs `#e81587` (pink) bars
- Progress bar: fills from left, `#9146ff` on `#1f1f23` track
- Points balance: displayed in nav bar, Inter 13px / 600

**Raid Animation**
- Full-screen overlay with raiding channel's avatar on `rgba(145, 70, 255, 0.3)` purple wash
- Text: Roobert 24px / 700, ~10 seconds with fade-in and particle effects

**Hype Train**
- Progress bar: `#9146ff` fill on `#1f1f23` track, rounded ends, 8px height
- Level 1-5 with increasing glow; contribution icons: bits (`#1db2ff`), subs (`#9146ff`), gifts (`#ffd700`)
- Timer countdown in Inter 14px / 700, turns `#ffd000` when expiring

**Emote System**
- Picker: 8-column grid, tabbed by category (channel, global, third-party)
- Chat sizes: 28px inline, 56px emote-only messages; hover tooltip shows name and source

**Bits & Cheers**
- Gem icon in `#1db2ff`; cheer tiers escalate: gray (1) -> purple (100) -> green (1K) -> blue (5K) -> red (10K) -> gold (100K)

**Sub Badges**
- 18x18px in chat, 36x36px in profile; loyalty tiers from 1mo to 3yr+
- Gifted sub: purple gradient notification bar across chat

## 5. Layout Principles

### Spacing System
- **Base unit**: 4px
- **Scale**: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Component padding**: 8-16px interior
- **Section spacing**: 24-48px between major sections
- **Chat message spacing**: 4px between messages, 8px between message groups

### Grid & Container
- **Top nav**: full-width, 50px height, fixed
- **Left sidebar**: 240px expanded / 50px collapsed, fixed
- **Stream player**: fluid, fills remaining width minus chat
- **Chat panel**: 340px fixed width on desktop
- **Directory grid**: responsive card grid, 4-6 columns at desktop
- **Max content width**: 1200px for non-stream pages (directory, settings)

### Whitespace Philosophy
Two density modes: **stream view** is maximally dense (player + chat + points competing for pixels in a real-time "watching together" moment) while **directory/browse** is generous (cards breathe, categories separate clearly, browsing a shelf not participating in an event).

### Border Radius Scale
- **0px**: Stream player, thumbnails within cards (content fills edge-to-edge)
- **4px**: Inputs, small interactive elements, dropdown items
- **6px**: Buttons, tags, small cards
- **8px**: Content cards, panels, modals, containers
- **12px**: Feature cards, promotional banners
- **50% / pill**: Avatars, status dots, badge pills, live indicator

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 — Base | `#0e0e10` flat | Page background, deepest layer |
| 1 — Surface | `#18181b` flat | Primary panels: nav, chat, sidebar |
| 2 — Elevated | `#1f1f23` flat | Cards, dropdowns, secondary panels |
| 3 — Float | `#26262c` + `rgba(0, 0, 0, 0.4) 0px 4px 8px` | Tooltips, popovers, autocomplete |
| 4 — Modal | `#1f1f23` + `rgba(0, 0, 0, 0.6) 0px 8px 24px` | Modals, dialogs, emote picker |
| 5 — Overlay | `rgba(0, 0, 0, 0.5)` scrim | Modal backdrop, fullscreen overlays |
| 6 — Notification | `#9146ff` glow + `rgba(145, 70, 255, 0.3) 0px 0px 16px` | Raid banners, hype train, event alerts |

**Shadow Philosophy**: Surface-color stepping (0e0e10 -> 18181b -> 1f1f23 -> 26262c) does most elevation work. Shadows appear only on floating elements (Level 3+). Level 6 (event notifications) uses purple glow to signal real-time community moments.

## 7. Do's and Don'ts

### Do
- **Do** use the three-step dark surface system (`#0e0e10` / `#18181b` / `#1f1f23`) to establish depth through color, not shadow.
- **Do** reserve Twitch Purple `#9146ff` for interactive elements and brand moments -- buttons, links, badges, event indicators.
- **Do** keep the stream player at 0px border-radius -- it fills its container edge-to-edge to maximize viewing area.
- **Do** use Inter for all product UI and chat. Roobert is reserved for display headlines and marketing.
- **Do** support real-time state indicators -- live dots, viewer counts, hype trains, predictions. The platform is defined by liveness.
- **Do** design chat as a first-class layout element with its own scroll, input, and emote system -- never an afterthought sidebar.
- **Do** use the username color system in chat -- the 15 default colors plus custom subscriber colors are part of the identity.
- **Do** keep component density high in stream view but generous in browse/directory view. Two modes, two spatial contracts.
- **Do** use `rgba(255, 255, 255, 0.08)` hover overlays on dark surfaces -- translucent white, never solid color swaps.

### Don't
- **Don't** use Twitch Purple as a large background fill. Purple is an accent and interactive color, not a surface color.
- **Don't** round the stream player or video thumbnails within cards. Sharp-cornered video content is a deliberate contrast to rounded chrome.
- **Don't** use light backgrounds for primary surfaces. The dark immersion keeps focus on stream content.
- **Don't** compete with the stream player for visual attention. Every UI element around the player should recede.
- **Don't** use heavy drop shadows on dark surfaces -- depth comes from surface-color stepping, not shadow.
- **Don't** skip the live indicator red dot (`#eb0400`) on active streams. The live/offline distinction is critical UX.
- **Don't** use Roobert for body text or chat messages. Its rounded geometry loses legibility below 18px in dense contexts.
- **Don't** make the chat panel collapsible-by-default on desktop. Chat is the social layer that makes Twitch Twitch.
- **Don't** add gradient backgrounds or decorative color washes outside of event notifications (raids, hype trains).

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <480px | Single column, chat below player, no sidebar |
| Mobile Large | 480-768px | Player stacks above chat, mini player on scroll |
| Tablet | 768-1024px | Collapsed sidebar (50px), narrower chat (300px) |
| Desktop Small | 1024-1280px | Full sidebar, standard chat, 2-3 column directory |
| Desktop | 1280-1600px | Full layout: sidebar + player + chat, 4 column directory |
| Desktop Large | 1600-1920px | Wider player, 5-6 column directory grid |
| Ultra-wide | >1920px | Player expands, content maxes at 1200px in directory |

### Collapsing Strategy
- **Sidebar**: full (240px) -> collapsed icons (50px) -> hidden (mobile)
- **Chat**: side panel (340px) -> below player (mobile) -> popout at all sizes
- **Player**: fluid width -> full width mobile, theatre and fullscreen at all breakpoints
- **Directory grid**: 6 -> 4 -> 3 -> 2 -> 1 columns; thumbnails maintain 16:9
- **Navigation**: top bar persists; search collapses to icon on mobile

### Touch Targets
- Button minimum: 36px height; sidebar rows: 42px; chat input: 40px on mobile; emote picker: 44x44px tap targets

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: `#0e0e10` (base), `#18181b` (surface), `#1f1f23` (elevated)
- Text: `#efeff1` (primary), `#adadb8` (secondary), `#53535f` (muted)
- Accent: Twitch Purple `#9146ff`
- Accent Hover: `#772ce8`
- Live Indicator: `#eb0400`
- Link: `#bf94ff`
- Input Fill: `#464649`
- Hover Overlay: `rgba(255, 255, 255, 0.08)`
- Border: `rgba(255, 255, 255, 0.08)`

### Example Component Prompts

1. *"Create a stream card for the directory: `#1f1f23` background, 8px radius. 16:9 thumbnail with 0px radius (sharp), a red `#eb0400` LIVE pill badge top-left, viewer count pill bottom-left on `rgba(0, 0, 0, 0.6)`. Below: stream title in Inter 14px/600 white, channel name in Inter 12px/400 `#adadb8`, game tag pill in `rgba(255, 255, 255, 0.08)` with 4px radius."*

2. *"Design a chat panel: `#18181b` background, 340px wide. Messages at Inter 13px/400, usernames bold 700 with random color assignment from the Twitch palette. Inline 18x18px badge icons before usernames. Fixed chat input at bottom: `#464649` fill, 4px radius, 2px `#9146ff` border on focus. Emote picker button right-aligned."*

3. *"Build a channel points prediction: two-outcome card on `#1f1f23`. Outcome A: `#1587e8` blue bar. Outcome B: `#e81587` pink bar. Percentage labels in Inter 14px/700. Point wager input with `#464649` fill. Submit button in `#9146ff` with `#772ce8` hover."*

4. *"Create a hype train progress bar: `#1f1f23` track with `#9146ff` fill, rounded ends, 8px height. Level indicator above in Roobert 18px/700 white. Contribution icons: bits (teal `#1db2ff`), subs (purple `#9146ff`), gifts (gold `#ffd700`). Timer countdown in Inter 14px/700."*

5. *"Design the followed channels sidebar: `#1f1f23` background, 240px wide. Section header 'FOLLOWED CHANNELS' in Inter 12px/700 `#adadb8` uppercase. Channel rows 42px tall: 30px circular avatar, channel name Inter 14px/600 white, game name Inter 12px/400 `#adadb8`, red dot + viewer count for live channels. Hover: `rgba(255, 255, 255, 0.08)` overlay."*

### Iteration Guide
1. **Start with the three-surface stack.** `#0e0e10` page base, `#18181b` for primary panels, `#1f1f23` for cards and elevated content. If your depth looks flat, you skipped a step.
2. **Purple is interactive only.** Audit every `#9146ff` usage -- it should be on a button, link, badge, or event indicator. If purple appears on a static background, remove it.
3. **Chat is a first-class citizen.** The chat panel should have its own scroll context, fixed input, emote system, and badge rendering. If chat feels like a bolted-on widget, redesign it as a core layout column.
4. **Liveness signals everywhere.** Every stream reference needs a live/offline state. Red dot for live, dimmed text for offline, viewer count for context. If a channel list has no live indicators, add them.
5. **Hover with translucent white.** Use `rgba(255, 255, 255, 0.08)` overlays for hover states on dark surfaces. Solid color swaps break the layered dark aesthetic.
6. **Player has no radius.** The stream player and video thumbnails use 0px corners. If you see rounded video, flatten it. The rounded chrome (8px) around sharp video is a deliberate contrast.
7. **Density in stream view, breathing room in browse.** Stream pages pack information tight. Directory pages let cards breathe. If both views have the same spacing, one of them is wrong.
