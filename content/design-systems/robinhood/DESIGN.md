# Design System Inspired by Robinhood

> Category: Fintech & Crypto
> Commission-free trading app. Green gains, minimalist finance, chart-forward UI.

## 1. Visual Theme & Atmosphere

Robinhood's design philosophy is radical subtraction. Where traditional brokerages like Schwab or Fidelity drown users in data density -- order books, Level II quotes, multiple chart indicators stacked in tabbed panels -- Robinhood strips the interface to a single number, a single chart, and a single action. The result is an app that feels more like a lifestyle product than a financial terminal, which is precisely the point: Robinhood brought an entire generation of first-time investors into the market by making stock trading look as simple as a messaging app.

The visual foundation is a clean white canvas (`#ffffff`) with near-black text (`#1e2124`) and the signature Robinhood Green (`#00c805`) that only appears when money is being made. This green is not a brand color in the decorative sense -- it is a semantic color that means "gain." When a portfolio is down, the entire UI shifts to Robinhood Red (`#ff5000`), a warm orange-red that replaces the green everywhere: the chart line, the percentage badge, the portfolio value. This binary color state -- green-when-up, red-when-down -- is the emotional core of the interface.

Typography uses Capsule Sans, Robinhood's proprietary geometric sans-serif commissioned from Grilli Type. It is clean, round, slightly friendly -- a typeface that says "accessible finance" rather than "institutional trading." For reproduction, Inter serves as the closest system-available substitute: both share a tall x-height, open apertures, and geometric construction. Headlines run at medium weight (500), never bold, maintaining the approachable feel. Body text stays at regular weight (400) with generous line-height for readability on mobile screens where most trading happens.

The layout is phone-first by conviction, not concession. Every screen is designed as a single vertical scroll with one primary action. The stock detail page is the signature: a massive price at the top, a full-width line chart in the middle, time range pills below the chart, and a green "Buy" button pinned to the bottom. There is no sidebar, no secondary panel, no tab-within-tab. This aggressive simplicity is the design system.

**Key Characteristics:**
- Semantic green/red binary: `#00c805` for gains, `#ff5000` for losses -- never decorative
- Near-black text (`#1e2124`) on pure white (`#ffffff`) -- maximum contrast, zero ornamentation
- Capsule Sans (proprietary) / Inter (substitute) -- geometric, friendly, never authoritarian
- Weight 500 maximum for headlines -- no bold, no heavy weights
- Phone-first vertical scroll with one CTA per screen
- Full-width line charts as the dominant visual element
- Minimal border-radius (8px standard) -- not pill-shaped, not sharp
- Almost no shadows -- depth comes from whitespace and subtle dividers
- Bottom-pinned action buttons in the mobile trading flow

## 2. Color Palette & Roles

### Primary
- **Robinhood Green** (`#00c805`): Gain color. Portfolio up, positive percentage, chart line when profitable. Also used for primary CTA ("Buy" button). A vivid, saturated green that reads as pure optimism.
- **Near Black** (`#1e2124`): Primary text, headings, nav icons. A warm charcoal that avoids the harshness of pure `#000000`.
- **Pure White** (`#ffffff`): Page background, card surfaces, input backgrounds.

### Semantic / Gain-Loss
- **Gain Green** (`#00c805`): Positive returns, upward chart lines, green percentage badges. The signature color.
- **Loss Red** (`#ff5000`): Negative returns, downward chart lines, red percentage badges. A warm orange-red, not a cold crimson -- less alarming, more informational.
- **Neutral Gray** (`#76767e`): Flat / no-change state. Used when a position is exactly 0% change.

### Secondary
- **Brand Green Dark** (`#00a033`): Hover/pressed state for green buttons. Slightly deeper for interaction feedback.
- **Accessible Green Text** (`#008b00`): Darker variant of brand green for use as text on light surfaces. Passes WCAG AA (4.50:1 on white). Use instead of `#00c805` whenever green appears as foreground text on white or light backgrounds.
- **Brand Black** (`#1c1e21`): Dark header bars, bottom navigation background on certain flows, dark mode surfaces.
- **Teal Accent** (`#00bfa5`): Occasionally used for crypto-specific UI, Robinhood Gold branding elements.

### Surface & Background
- **Surface White** (`#ffffff`): Primary background.
- **Surface Light Gray** (`#f5f5f7`): Card backgrounds, section separators, input fields in some states.
- **Surface Divider** (`#e8e8ea`): Hairline dividers between list items (watchlist rows, transaction history).
- **Surface Muted** (`#f0f0f2`): Disabled input backgrounds, skeleton loading states.

### Text Hierarchy
- **Text Primary** (`#1e2124`): Headlines, stock names, portfolio value.
- **Text Secondary** (`#6f7072`): Subtitles, descriptions, metadata labels ("Market Cap", "P/E Ratio").
- **Text Tertiary** (`#76767e`): Timestamps, disclaimers, inactive tab labels.
- **Text Inverse** (`#ffffff`): On green/dark buttons, on dark overlays.

### Interactive
- **Link Green** (`#00c805`): Text links within content areas.
- **Focus Ring** (`rgba(0,200,5,0.3)`): Focus outline on interactive elements -- green-tinted.
- **Tap Highlight** (`rgba(0,0,0,0.04)`): Subtle press state on list rows and cards.
- **Disabled** (`#c4c4c8`): Disabled button backgrounds, inactive toggles.

## 3. Typography Rules

### Font Family
- **Primary**: `Capsule Sans` (proprietary, Grilli Type). Substitute: `Inter`, fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- **Monospace**: `SF Mono`, `"Roboto Mono"`, `"Courier New"`, monospace -- used for order entry, quantity fields, and price displays in some contexts.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Portfolio Value | Inter | 40px (2.50rem) | 500 | 1.10 | -0.5px | The big number at the top of the home screen |
| Stock Price | Inter | 32px (2.00rem) | 500 | 1.15 | -0.3px | Individual stock/crypto detail price |
| Section Heading | Inter | 24px (1.50rem) | 500 | 1.20 | -0.2px | "Popular Lists", "News", "Upcoming Earnings" |
| Card Title | Inter | 20px (1.25rem) | 500 | 1.25 | -0.1px | Stock name in detail view, list headers |
| Body Large | Inter | 17px (1.06rem) | 400 | 1.50 | normal | Descriptions, about sections |
| Body | Inter | 15px (0.94rem) | 400 | 1.50 | normal | Standard reading text, news snippets |
| Body Small | Inter | 13px (0.81rem) | 400 | 1.45 | normal | Metadata, secondary labels |
| Button | Inter | 17px (1.06rem) | 500 | 1.00 | normal | "Buy", "Sell", "Review Order" |
| Tab Label | Inter | 13px (0.81rem) | 500 | 1.00 | 0.4px | Chart time range tabs ("1D", "1W", "1M") |
| Gain/Loss % | Inter | 15px (0.94rem) | 500 | 1.00 | normal | "+3.42% ($12.50)" in green or red |
| Ticker Symbol | Inter | 15px (0.94rem) | 600 | 1.00 | 0.5px | "AAPL", "TSLA" -- the only place 600 weight appears |
| Caption | Inter | 12px (0.75rem) | 400 | 1.35 | 0.2px | Disclaimers, legal text, timestamps |
| Stat Label | Inter | 13px (0.81rem) | 400 | 1.00 | normal | "Mkt Cap", "Vol", "Avg Vol" |
| Stat Value | Inter | 15px (0.94rem) | 500 | 1.00 | normal | "$2.87T", "54.2M" |

### Principles
- **No bold**: Weight 500 (medium) is the heaviest weight used in headings. Weight 600 appears only on ticker symbols (AAPL, TSLA). True bold (700) is essentially absent -- the interface speaks softly.
- **Numbers as display type**: The portfolio value (40px) is the largest element on the home screen. This is a financial app where the number IS the content; typography exists to present numbers, not decorate around them.
- **Tight tracking on large sizes**: Negative letter-spacing at 24px+ keeps large numbers and headings feeling compact and engineered.
- **Generous line-height on body**: 1.50 for reading text ensures comfort on mobile, where most users interact.
- **Tabular figures for prices**: All financial numbers use `font-variant-numeric: tabular-nums` so dollar amounts and percentages align in columns.

## 4. Component Stylings

### Stock Chart (Signature Component)
The line chart is Robinhood's most iconic UI element -- a full-width SVG/canvas path with no gridlines, no Y-axis labels, and no X-axis until tapped.
- **Line color**: `#00c805` (gain) or `#ff5000` (loss), determined by the selected time range's net change
- **Line weight**: 2px stroke, no fill by default
- **Gradient fill**: On touch/hover, a subtle vertical gradient from the line color at 15% opacity to transparent fills the area below the line
- **Crosshair**: Vertical 1px line in `#1e2124` appears on touch/hover, with a 6px solid circle at the intersection point colored to match the line
- **Time range pills**: Row of pills below the chart -- "1D", "1W", "1M", "3M", "1Y", "ALL". Active pill: green or red text with a 2px bottom border. Inactive: `#76767e` text
- **No gridlines**: The chart floats in pure whitespace. No horizontal reference lines, no bounding box
- **Price tooltip**: On crosshair interaction, the portfolio value at the top dynamically updates to the hovered price point, replacing the current price

### Portfolio Value Display
- **Value**: 40px, weight 500, `#1e2124`. The dominant element on the home screen.
- **Change amount**: 15px, weight 500. Color is `#00c805` or `#ff5000` based on daily gain/loss.
- **Change percentage**: Same line as change amount, wrapped in parentheses. Same semantic coloring.
- **Layout**: Left-aligned, stacked vertically -- value on line 1, change on line 2. No card, no container, no border. Just the number on white.

### Buy / Sell Buttons
- **Buy button**: Background `#00c805`, text `#ffffff`, 17px weight 500, radius 8px, full-width on mobile, height 48px. This is the primary CTA on every stock detail page.
- **Buy hover/pressed**: Background `#00a033` (darker green).
- **Sell button**: Background `#ff5000`, text `#ffffff`, same dimensions. Appears when user owns the stock, often as a secondary option.
- **Review Order**: Background `#00c805`, same styling as Buy. Appears in the order confirmation flow.
- **Disabled state**: Background `#c4c4c8`, text `#ffffff`. Used when market is closed or input is incomplete.
- **Bottom-pinned**: On mobile, the Buy button is fixed to the bottom of the viewport with 16px padding, sitting above the bottom navigation.

### Watchlist
- **Row height**: 64px
- **Left**: Ticker symbol (15px, weight 600, `#1e2124`) over company name (13px, weight 400, `#6f7072`)
- **Right**: Current price (15px, weight 500, `#1e2124`) over gain/loss pill
- **Gain/loss pill**: 13px, weight 500, padded 4px 8px, radius 4px. Background `rgba(0,200,5,0.12)` with `#00c805` text (gain) or `rgba(255,80,0,0.12)` with `#ff5000` text (loss)
- **Sparkline**: A tiny 48px-wide line chart between name and price, showing the day's price movement in the semantic gain/loss color. No axes, no labels -- pure shape.
- **Divider**: 1px `#e8e8ea` between rows, indented 16px from left edge
- **Swipe actions**: Swipe left reveals "Remove" in red

### News Feed Cards
- **Container**: Full-width, no border, no shadow. Just content separated by 1px `#e8e8ea` dividers.
- **Layout**: Source name (13px, weight 500, `#6f7072`) + timestamp at top. Headline (17px, weight 500, `#1e2124`) below. Optional thumbnail (60x60px, radius 8px) right-aligned.
- **Source pill**: Sometimes shown as a small gray pill with the publisher logo.
- **Tap state**: Entire row gets `rgba(0,0,0,0.04)` overlay on press.
- **No card elevation**: News items are flat list items, not elevated cards. This keeps the feed feeling like a timeline, not a dashboard.

### Options Chain Table
- **Header row**: "Calls" left, "Puts" right, with expiration date selector as horizontal pill tabs
- **Strike column**: Center-aligned, 15px weight 500 -- the shared axis between calls and puts
- **Price cells**: 13px, weight 400, tabular-nums. Colored green/red based on whether the option is in/out of the money
- **Bid/Ask spread**: Shown as two numbers separated by a thin dash, both in `#6f7072`
- **Selected row**: Left border 3px solid `#00c805` (calls) or `#ff5000` (puts), with `rgba(0,200,5,0.04)` or `rgba(255,80,0,0.04)` background tint
- **Scroll**: Horizontal scroll for additional Greeks (delta, gamma, theta, vega) -- revealed only if user scrolls, never forced

### Crypto View
- **Nearly identical to stock view**: Same chart, same price display, same Buy/Sell buttons. This consistency is intentional -- Robinhood treats crypto as just another asset class.
- **Differences**: 24/7 market indicator (small green dot + "Open" label), no options chain, crypto-specific stats (circulating supply, max supply, market dominance %)
- **Price precision**: Crypto prices show more decimal places (e.g., "$0.00001234") using the same tabular-nums treatment
- **Transfer button**: Additional "Send" / "Receive" buttons below Buy/Sell for crypto wallets, styled as secondary outlined buttons (1px `#e8e8ea` border, `#1e2124` text, 8px radius)

### IPO Access Cards
- **Card**: White background, 1px `#e8e8ea` border, 12px radius (slightly rounder than standard 8px)
- **Badge**: "IPO Access" pill in `#00c805` background, white text, 4px radius, positioned at top of card
- **Company info**: Logo (40px circle), company name (17px, weight 500), ticker (13px, weight 400, `#6f7072`)
- **Expected range**: "$18.00 - $20.00" in 15px weight 500
- **CTA**: "Request Access" button in outlined style -- 1px `#00c805` border, `#00c805` text, transparent background, 8px radius. Becomes solid green after requesting.
- **Status states**: "Requested" (solid green pill), "Confirmed" (solid green with checkmark), "Not Filled" (gray pill)

### Bottom Navigation
- **Bar**: White background, top border 1px `#e8e8ea`, height 56px
- **Icons**: 24px, stroke-style line icons. Active: `#1e2124` (filled variant). Inactive: `#76767e` (outline variant).
- **Labels**: 10px, weight 500. Active: `#1e2124`. Inactive: `#76767e`.
- **Items**: Home (portfolio), Search (magnifying glass), Trading (lightning bolt or transfer icon), Notifications (bell), Account (person)
- **No color on active tab**: Unlike most apps, active tab is black, not green. Green is reserved for money.

### Order Entry / Number Pad
- **Amount field**: Centered, 40px weight 500, with a blinking cursor. Dollar sign in `#76767e`, digits in `#1e2124`.
- **Keypad**: Custom numeric grid, 3x4, with large touch targets (64px row height). Numbers in 24px weight 400, `#1e2124`.
- **Shares/Dollars toggle**: Pill toggle at top -- "Dollars" | "Shares" -- with active state having `#1e2124` background and `#ffffff` text, inactive in `#f5f5f7` background.

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
- Notable: The scale is deliberately restrained. Robinhood avoids the 6px/10px/14px micro-adjustments of denser systems. Spacing jumps in clear, perceptible increments.

### Grid & Container
- Mobile: Single column, full-width. Content padded 16px left/right.
- Tablet/Web: Centered content column, max-width 480px for trading flows, max-width 1040px for dashboard views.
- No sidebar on mobile. Web version introduces a left sidebar for navigation that the mobile version handles through bottom tabs.
- Cards are full-bleed on mobile (no horizontal margin), inset with 16px margin on web.

### Whitespace Philosophy
- **Empty space is the design**: Robinhood uses whitespace the way a gallery uses white walls. The stock chart has no gridlines. The portfolio value has no container. News items have no cards. The whitespace IS the container.
- **One thing per screen**: Each screen has one primary action. Stock detail: Buy. Order entry: amount. Confirmation: Review. This "one thing" principle means each screen can breathe.
- **Vertical rhythm**: Content stacks vertically with 16px-24px gaps between sections. No horizontal splits on mobile. The scroll direction is always down, never sideways (except chart time range pills and options chain).

### Border Radius Scale
- Micro (4px): Gain/loss pills, small badges
- Standard (8px): Buttons, cards, input fields, thumbnails -- the workhorse
- Comfortable (12px): IPO cards, featured content cards
- Large (16px): Modal sheets, bottom sheets
- Full (50%): Avatar circles, status dots

## 6. Depth & Elevation

Robinhood is one of the flattest major apps in production. Elevation is almost nonexistent.

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, no border | Default state for nearly everything |
| Divider (Level 0.5) | 1px solid `#e8e8ea` | List row separators, section dividers |
| Subtle (Level 1) | `0px 1px 4px rgba(0,0,0,0.08)` | Floating action button (rare), sticky headers |
| Sheet (Level 2) | `0px -2px 16px rgba(0,0,0,0.1)` | Bottom sheets, order confirmation modals |
| Overlay (Level 3) | `0px 4px 24px rgba(0,0,0,0.15)` + 60% black scrim | Full-screen modals, alerts |

**Shadow Philosophy**: Robinhood avoids shadows as a design choice, not an oversight. Shadows imply complexity and layering -- precisely what Robinhood removes. Depth is created through:
- Whitespace separation (no shadow needed when elements have 24px+ gaps)
- Hairline dividers (`#e8e8ea`) for adjacent list items
- Full-screen transitions rather than overlapping panels
- The chart gradient fill, which creates perceived depth through opacity

The only notable shadow usage is bottom sheets (order review, account menus) that slide up from the bottom of the screen. These use the Level 2 shadow with a subtle scrim overlay on the content behind.

## 7. Do's and Don'ts

### Do
- Use `#00c805` green and `#ff5000` red exclusively as semantic gain/loss indicators -- never as decoration
- Keep weight at 400-500 maximum; use 600 only for ticker symbols (AAPL, TSLA)
- Design each screen around a single primary action and a single primary number
- Use full-width line charts with no gridlines, no Y-axis, no bounding box
- Pin the primary action button to the bottom of mobile viewports
- Use 1px `#e8e8ea` dividers instead of shadows to separate list items
- Apply `font-variant-numeric: tabular-nums` to all price and percentage displays
- Keep the chart line at 2px stroke -- thin enough to feel precise, thick enough to read
- Use the binary color state: entire UI shifts green or red based on portfolio performance
- Maintain 16px horizontal padding on mobile, consistent across all screens
- Use Accessible Green Text (`#008b00`) when green appears as text on light backgrounds -- the primary brand green is reserved for large UI elements with white text overlay

### Don't
- Don't use green or red as brand/decorative colors -- they are reserved for financial semantics
- Don't add gridlines, axes, or reference lines to the main chart -- the emptiness is the design
- Don't use bold (700) weight anywhere in the interface -- Robinhood whispers
- Don't add card shadows to list items, news entries, or watchlist rows -- keep them flat
- Don't create multi-column layouts on mobile -- one column, always
- Don't show data that isn't immediately actionable -- hide complexity behind taps, not tabs
- Don't use the green for the active navigation tab -- active tabs are black, green means money
- Don't add decorative borders or background colors to cards unless they serve a functional purpose
- Don't use colored backgrounds for sections -- white on white, separated by whitespace and dividers
- Don't display multiple charts or data panels simultaneously -- one chart per screen
- Don't use primary green (`#00c805`) as text on white or light surfaces -- it fails WCAG AA contrast

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <480px | Single column, bottom tabs, pinned Buy button, full-bleed content |
| Tablet | 480-768px | Centered column (max 480px), bottom tabs persist |
| Small Desktop | 768-1040px | Left sidebar navigation replaces bottom tabs, single content column |
| Desktop | 1040-1440px | Sidebar + centered content column (max 640px for detail, max 1040px for lists) |
| Large Desktop | >1440px | Same as Desktop with increased margins, content does not expand |

### Touch Targets
- Buy/Sell buttons: 48px height minimum, full-width on mobile
- Watchlist rows: 64px height, full-width tap target
- Chart time range pills: 32px height, 48px width minimum
- Bottom navigation icons: 24px icon + 10px label + 16px vertical padding
- Number pad keys: 64px row height with generous horizontal spacing
- Options chain cells: 44px minimum height for tap accuracy

### Collapsing Strategy
- Portfolio value: 40px on mobile, stays 40px on desktop -- the number is always the hero
- Chart: full-width on mobile, constrained to content column on desktop but still dominant
- Watchlist: full-bleed rows on mobile, inset with subtle borders on desktop
- Navigation: bottom tab bar on mobile/tablet, left sidebar on desktop
- Buy button: pinned to bottom viewport on mobile, inline at bottom of content on desktop
- News feed: single column always, thumbnail size may increase on desktop
- Options chain: horizontal scroll on mobile, full table visible on desktop
- Stats grid: 2-column grid on mobile (label/value pairs), 3-4 columns on desktop

### Animation & Motion
- **Chart drawing**: The line chart animates in from left to right on initial load, ~400ms ease-out
- **Price counter**: Portfolio value counts up/down to new values on refresh, ~200ms
- **Bottom sheet**: Slides up with spring physics, ~300ms, slight overshoot
- **Tab transitions**: Cross-fade between screens, ~150ms
- **Gain/loss color**: Instant swap, no transition -- the color change should feel immediate and factual

## 9. Agent Prompt Guide

### Quick Color Reference
- Gain/CTA: Robinhood Green (`#00c805`)
- Loss: Robinhood Red (`#ff5000`)
- Background: Pure White (`#ffffff`)
- Heading text: Near Black (`#1e2124`)
- Secondary text: Gray (`#6f7072`)
- Tertiary text: Light Gray (`#76767e`)
- Divider: Border Gray (`#e8e8ea`)
- Surface: Light Gray (`#f5f5f7`)
- Disabled: Muted Gray (`#c4c4c8`)
- Gain pill bg: `rgba(0,200,5,0.12)`
- Loss pill bg: `rgba(255,80,0,0.12)`

### Stitch Token Mapping
```
primaryColor:    #00c805
colorMode:       LIGHT
colorVariant:    NEUTRAL
headlineFont:    INTER
bodyFont:        INTER
roundness:       ROUND_EIGHT
```

### Example Component Prompts
- "Create a portfolio home screen: white background. Portfolio value at 40px Inter weight 500, color #1e2124, letter-spacing -0.5px. Below it, daily change '+$142.30 (1.87%)' at 15px weight 500 in #00c805. Full-width line chart below in #00c805 with 2px stroke, no gridlines, no axes. Time range pills '1D 1W 1M 3M 1Y ALL' at 13px weight 500, active pill has 2px green bottom border."
- "Build a watchlist row: 64px height, 16px horizontal padding. Left side: ticker 'AAPL' at 15px weight 600 #1e2124, company name 'Apple Inc.' at 13px weight 400 #6f7072 below. Right side: price '$187.44' at 15px weight 500 #1e2124, below it a gain pill with rgba(0,200,5,0.12) background, #00c805 text '+2.34%' at 13px weight 500, 4px radius, 4px 8px padding. Bottom divider 1px #e8e8ea indented 16px."
- "Design a Buy button: full-width, height 48px, background #00c805, text 'Buy AAPL' in white 17px Inter weight 500, border-radius 8px. Pinned to bottom of viewport with 16px padding all sides. Hover: #00a033."
- "Create an options chain: header row with 'Calls' left-aligned and 'Puts' right-aligned. Strike prices in center column at 15px weight 500. Bid/ask in 13px #6f7072. Selected call row: left 3px border #00c805, background rgba(0,200,5,0.04)."
- "Build a news feed item: no card, no shadow, no border. Source 'Reuters' at 13px weight 500 #6f7072 + '2h ago' in #76767e. Headline 'Apple Reports Record Q4 Revenue' at 17px weight 500 #1e2124. 60x60px thumbnail right-aligned with 8px radius. Bottom divider 1px #e8e8ea."
- "Design a crypto detail view: identical to stock view but add a green dot + 'Open 24h' label (12px, #00c805) below the ticker. Stats grid shows 'Circulating Supply', 'Max Supply', 'Market Dominance' as 2-column layout -- labels at 13px #6f7072, values at 15px weight 500 #1e2124."

### Iteration Guide
1. Green (`#00c805`) and red (`#ff5000`) are never decorative -- they communicate gain/loss. If the portfolio is down, every green element turns red.
2. Weight 500 is the maximum for headings; 400 for body. The only 600-weight text is ticker symbols. Never use bold (700).
3. The chart has NO gridlines, NO Y-axis labels, NO bounding box. It is a floating line on white space. This emptiness is intentional.
4. Shadows are almost absent. Use 1px `#e8e8ea` dividers for separation. Shadows appear only on bottom sheets and modals.
5. Every screen should have ONE primary number and ONE primary action. If you're showing two charts or two CTAs, you've broken the pattern.
6. The Buy button is always `#00c805` green regardless of gain/loss state -- it's an action color in this context, not a semantic one. The Sell button is always `#ff5000`.
7. All financial numbers use `font-variant-numeric: tabular-nums` for column alignment.
8. Mobile is the primary design target. Desktop is mobile-centered in a wider frame, not a different layout.
