# Design System Inspired by Atlassian

> Category: Productivity & SaaS
> Enterprise collaboration suite. Blue-driven hierarchy, dense information UI, board-and-backlog patterns.

## 1. Visual Theme & Atmosphere

Atlassian's design system (ADS) is built for enterprise teams who live inside their tools eight hours a day. The visual language prioritizes information density, scanability, and functional clarity over decorative flair. Every surface exists to frame work -- Jira boards, Confluence pages, Bitbucket diffs -- and the chrome stays deliberately quiet so the content can be loud. The result is a system that feels productive rather than pretty: compact, structured, and unapologetically utilitarian.

The foundation is a clean white canvas (`#ffffff`) with a cool-neutral surface hierarchy (`#f4f5f7` for sunken regions, `#fafbfc` for subtle tinting). The signature Atlassian Blue (`#0052cc`) anchors the entire system -- it is the color of action, navigation, and authority. Unlike consumer products that scatter accent colors freely, ADS concentrates blue on interactive affordances: primary buttons, active nav items, selected states, and focus rings. Everything else recedes into the neutral scale. This discipline creates an instantly recognizable visual signature: a sea of white and gray with precise blue punctuation.

Typography uses Inter for all UI text (the open-source successor to ADS's earlier system font stacks), with Charlie Display reserved for marketing headlines and brand moments. In-product, the type scale is compact: 11px for metadata, 14px for body, 20px for page titles. Weights stay within 400-700, with 600 (semibold) as the workhorse for headings and labels. Letter-spacing is neutral to slightly negative at display sizes. The system avoids decorative typography entirely -- every character exists to convey information.

The spacing system runs on a strict 8px grid with a 4px half-step for tight contexts. Components snap to this grid religiously: 8px inner padding on lozenges, 16px card padding, 24px section gaps, 32px page margins. This mathematical discipline is what gives Atlassian products their characteristic dense-but-not-cramped feel -- every pixel is accounted for.

**Key Characteristics:**
- Light-mode-native: `#ffffff` canvas, `#f4f5f7` sunken surfaces, `#fafbfc` subtle tinting
- Atlassian Blue (`#0052cc`) as the singular interactive accent -- never decorative
- Inter for UI, Charlie Display for marketing/brand headlines only
- Compact type scale: 11px metadata through 29px page headings
- Strict 8px grid with 4px half-step; components are dense but precisely spaced
- Status lozenges as a first-class pattern: colored pills for To Do / In Progress / Done
- Board-column layout as a native primitive (Jira Kanban, Trello)
- Inline editing everywhere -- text that becomes an input on click
- Avatar groups with overlap stacking and +N overflow
- N500 naming convention: colors are named by hue + luminance step (B500, G500, R500, Y500, N500)

## 2. Color Palette & Roles

### Brand Primary
- **Blue 500 / Atlassian Blue** (`#0052cc`): Primary interactive color. Buttons, links, active navigation, selected states, focus rings. The backbone of the entire visual hierarchy.
- **Blue 400** (`#0065ff`): Hover state for primary buttons and links. Slightly brighter, more saturated.
- **Blue 600** (`#0747a6`): Pressed/active state. Darker, more authoritative.
- **Blue 700** (`#003884`): Deep blue for high-contrast contexts.
- **Blue 100** (`#deebff`): Tinted backgrounds for selected rows, info banners, blue surface fills.
- **Blue 75** (`#b3d4ff`): Lighter blue tint for secondary highlights.
- **Blue 50** (`#e6effc`): Barely-there blue wash for hover backgrounds.

### Status & Semantic
- **Green 500** (`#00875a`): Success, Done status, resolved, approved. Used in lozenges, icons, and confirmation states.
- **Green 400** (`#36b37e`): Hover/lighter success contexts.
- **Green 100** (`#e3fcef`): Success background tint for banners and row highlights.
- **Red 500** (`#ff5630`): Error, critical, blocker priority, declined, destructive actions. The alarm color.
- **Red 400** (`#ff7452`): Hover/lighter danger contexts.
- **Red 100** (`#ffebe6`): Error background tint for banners and validation states.
- **Yellow 500** (`#ffab00`): Warning, medium priority, needs attention. Amber caution.
- **Yellow 400** (`#ffc400`): Brighter warning for hover states.
- **Yellow 100** (`#fff0b3`): Warning background tint for banners and alerts.
- **Teal 500** (`#00b8d9`): Informational, new feature, discovery. Used for onboarding and tips.
- **Teal 100** (`#e6fcff`): Info background tint.
- **Purple 500** (`#6554c0`): Used for epics, custom labels, and brand sub-accents.
- **Purple 100** (`#eae6ff`): Purple surface tint.

### Neutral Scale
- **N0 / White** (`#ffffff`): Page canvas, card surfaces, modal backgrounds.
- **N10** (`#fafbfc`): Subtle surface tinting, table header backgrounds.
- **N20** (`#f4f5f7`): Sunken surfaces, sidebar backgrounds, board column backgrounds, disabled fields.
- **N30** (`#ebecf0`): Borders, dividers, separator lines, input borders at rest.
- **N40** (`#dfe1e6`): Stronger borders, card outlines, dropdown borders.
- **N50** (`#c1c7d0`): Disabled text, placeholder icons.
- **N60** (`#b3bac5`): Placeholder text in inputs.
- **N80** (`#6f7786`): De-emphasized metadata, timestamps.
- **N100** (`#7a869a`): Secondary text, descriptions, helper text.
- **N200** (`#6b778c`): Muted body text, table cell text.
- **N300** (`#5e6c84`): Standard body text, secondary headings.
- **N500** (`#42526e`): Primary body text, labels, navigation items.
- **N700** (`#253858`): Strong text, page titles, primary headings.
- **N800** (`#172b4d`): Highest-contrast text. Page headings, modal titles, critical labels. Near-black with a cool blue undertone -- never pure black.

### Overlay
- **Blanket** (`rgba(9, 30, 66, 0.54)`): Modal backdrop, drawer overlay. The blue-tinted black is distinctly Atlassian.
- **Blanket Dark** (`rgba(9, 30, 66, 0.71)`): Heavier overlay for critical dialogs.

## 3. Typography Rules

### Font Family
- **UI / Product**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", Ubuntu, "Droid Sans", "Helvetica Neue", sans-serif`
- **Marketing / Brand Headlines**: `Charlie Display, Inter, -apple-system, BlinkMacSystemFont, sans-serif`
- **Monospace**: `"SFMono-Medium", "SF Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", Menlo, Consolas, Courier, monospace`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Marketing Display | Charlie Display | 48px | 700 | 1.08 | -0.5px | Landing pages, hero banners only |
| Marketing Heading | Charlie Display | 36px | 700 | 1.14 | -0.3px | Sub-hero, marketing sections |
| Page Title (H700) | Inter | 29px | 600 | 1.10 | -0.01em | Top-level page headings in product |
| Section Title (H600) | Inter | 24px | 600 | 1.17 | -0.01em | Major sections, dialog titles |
| Subsection (H500) | Inter | 20px | 600 | 1.20 | -0.008em | Card headers, subsections |
| Card Title (H400) | Inter | 16px | 600 | 1.25 | -0.006em | Inline section heads, list group titles |
| Label (H300) | Inter | 14px | 600 | 1.14 | 0 | Form labels, table headers |
| Overline (H200) | Inter | 12px | 600 | 1.33 | 0 | All-caps overlines, category labels |
| Subtitle (H100) | Inter | 11px | 700 | 1.45 | 0 | Micro-labels, compact headers |
| Body Large | Inter | 16px | 400 | 1.50 | 0 | Confluence page body, long-form |
| Body | Inter | 14px | 400 | 1.43 | 0 | Default product text, descriptions |
| Body Small | Inter | 12px | 400 | 1.33 | 0 | Compact contexts, table cells |
| Caption | Inter | 11px | 400 | 1.45 | 0 | Timestamps, metadata, help text |
| Code Block | SFMono-Medium | 12px | 500 | 1.50 | 0 | Code blocks, PR diffs, JQL |
| Code Inline | SFMono-Medium | 12px (0.85em) | 500 | 1.00 | 0 | Inline code in body text |

### Principles
- **600 is the heading weight**: Semibold, not bold. ADS headings use 600 consistently -- heavy enough to anchor sections, light enough to stay professional.
- **14px is home base**: The default body size across all Atlassian products. Dense enough for enterprise dashboards, readable enough for eight-hour sessions.
- **N800 for headings, N200-N500 for body**: Text color varies by role, not by size. Headings are always `#172b4d`, body text is `#42526e` or lighter.
- **Monospace is a first-class citizen**: Code blocks, JQL queries, branch names, commit hashes -- monospace appears constantly in Jira and Bitbucket.

## 4. Component Stylings

### Primary Button
- Background: `#0052cc` (B500)
- Text: `#ffffff`, 14px, weight 600
- Padding: 6px 12px (compact) or 8px 16px (standard)
- Radius: 3px
- Border: none
- Hover: `#0065ff` (B400)
- Active: `#0747a6` (B600)
- Disabled: background `#f4f5f7`, text `#a5adba`
- Focus: `box-shadow: 0 0 0 2px #4c9aff`

### Default Button
- Background: `#fafbfc` (N10)
- Text: `#42526e` (N500), 14px, weight 600
- Padding: 6px 12px
- Radius: 3px
- Border: `1px solid #dfe1e6` (N40)
- Hover: background `#ebecf0` (N30)
- Active: background `#b3d4ff` (B75), border-color `#b3d4ff`

### Danger Button
- Background: `#ff5630` (R500)
- Text: `#ffffff`
- Hover: `#ff7452` (R400)
- Active: `#bf2600` (R600)
- Use: Delete issue, remove member, destructive confirmations

### Status Lozenges
Lozenges are the signature ADS pattern -- compact pills that encode workflow state at a glance.

| Variant | Background | Text | Use |
|---------|-----------|------|-----|
| Default | `#dfe1e6` (N40) | `#42526e` (N500) | To Do, Open, Backlog |
| In Progress (blue) | `#deebff` (B100) | `#0052cc` (B500) | In Progress, In Review |
| Success (green) | `#e3fcef` (G100) | `#006644` (G600) | Done, Resolved, Merged |
| Removed (red) | `#ffebe6` (R100) | `#bf2600` (R600) | Declined, Won't Do |
| New (purple) | `#eae6ff` (P100) | `#403294` (P600) | New, Updated |
| Moved (yellow) | `#fff0b3` (Y100) | `#ff8b00` (Y600) | Moved, Changed |

- Shape: `border-radius: 3px`, `padding: 2px 4px`
- Font: 11px, weight 700, uppercase
- Always uppercase text, always compact

### Bold Lozenges (filled)
Same status mapping but with solid backgrounds and white text:
- In Progress: bg `#0052cc`, text `#ffffff`
- Done: bg `#00875a`, text `#ffffff`
- Use bold lozenges for board column headers and high-emphasis contexts

### Jira Board Columns
- Column container: `background: #f4f5f7` (N20), no border, `border-radius: 4px` top corners
- Column header: 12px weight 600 uppercase `#5e6c84` (N300), with issue count badge
- Column width: 280-300px fixed, vertical scroll
- Spacing between columns: 8px gap
- Drop zone highlight: `border: 2px dashed #0052cc`, `background: rgba(0, 82, 204, 0.04)`

### Issue Cards (Jira)
- Background: `#ffffff`
- Border: none (shadow only)
- Shadow: `0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)`
- Radius: 3px
- Padding: 10px
- Hover: `background: #ebecf0` (N30)
- Dragging: `box-shadow: 0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)`, rotation 2-4deg
- Content layout: summary text top (14px, N800), bottom row has assignee avatar (24px circle), priority icon (16px), issue type icon (16px), issue key label (12px, N200)

### Priority Icons
- Highest: red upward chevron (`#ff5630`)
- High: red upward arrow (`#ff5630`)
- Medium: orange horizontal bar (`#ffab00`)
- Low: blue downward arrow (`#0065ff`)
- Lowest: blue downward chevron (`#0065ff`)

### Issue Type Icons
- Story: green lightning bolt (`#36b37e`), 16px
- Bug: red circle (`#ff5630`), 16px
- Task: blue checkbox (`#4c9aff`), 16px
- Epic: purple lightning bolt (`#6554c0`), 16px
- Sub-task: blue sub-checkbox (`#4c9aff`), 16px

### Sprint Planning Bar
- Background: `#ffffff`
- Border-bottom: `2px solid #0052cc` (active sprint) or `1px solid #dfe1e6` (backlog)
- Content: sprint name (14px, 600, N700), story points badge (`background: #ebecf0`, 12px, 600), date range (12px, N200)
- Expand/collapse: chevron icon, 16px, N200

### Confluence Page Editor
- Canvas: `#ffffff`, max-width 760px centered
- Title field: 29px, weight 600, N800, no border, placeholder `#c1c7d0`
- Body: 16px, weight 400, line-height 1.714 (24px), N800
- Toolbar: sticky top, `background: #ffffff`, `border-bottom: 1px solid #ebecf0`, 40px height
- Toolbar buttons: 32x32px, icon-only, N500 icons, `border-radius: 3px`, hover `background: #ebecf0`
- Inline comment highlight: `background: #fff0b3` (Y100), `border-bottom: 2px solid #ffab00`

### Bitbucket PR Diff View
- File header: `background: #f4f5f7`, `border: 1px solid #dfe1e6`, padding 8px 12px
- File path: 14px monospace, N500
- Added line: `background: #e3fcef` (G100), `border-left: 3px solid #00875a`
- Removed line: `background: #ffebe6` (R100), `border-left: 3px solid #ff5630`
- Unchanged line: `background: #ffffff`
- Line numbers: 12px monospace, `color: #6f7786` (N80), `width: 48px`, right-aligned
- Comment thread: indented 24px, `border-left: 2px solid #0052cc`, `background: #fafbfc`

### Avatar Groups
- Avatar size: 24px (small), 32px (medium), 40px (large)
- Shape: circle (`border-radius: 50%`)
- Border: `2px solid #ffffff` (to create separation in stacked groups)
- Overlap: each subsequent avatar shifts left by 30-40% of diameter
- Overflow: `+N` counter in `background: #ebecf0`, `color: #42526e`, 11px weight 600
- Hover: avatar lifts slightly, `box-shadow: 0 2px 4px rgba(9, 30, 66, 0.25)`, tooltip with name

### Inline Editing
- Read mode: text appears as plain label, cursor changes to text on hover, faint underline-on-hover (`border-bottom: 1px solid #dfe1e6`)
- Edit mode: text becomes input with `border: 2px solid #0052cc`, `border-radius: 3px`, `padding: 4px 6px`
- Confirm/cancel: small icon buttons (checkmark/cross), 24px, below or beside the input
- Transition: instant swap, no animation -- speed is the priority

### Flags (Notifications / Toasts)
- Width: 400px fixed
- Background: `#ffffff`
- Border-left: `4px solid` + semantic color (blue info, green success, yellow warning, red error)
- Shadow: `0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)`
- Radius: 3px
- Padding: 16px
- Title: 14px weight 600 N800, icon 24px left-aligned
- Body: 14px weight 400 N200, dismiss X top-right

### Dropdown Menu
- Background: `#ffffff`
- Border: none (shadow only)
- Shadow: `0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)`
- Radius: 3px
- Padding: 4px 0
- Item padding: 8px 12px
- Item hover: `background: #ebecf0` (N30)
- Item text: 14px weight 400 N500
- Group header: 11px weight 700 uppercase N200, padding 8px 12px 4px
- Divider: `1px solid #ebecf0`, margin 4px 0

### Tabs
- Container border-bottom: `2px solid #dfe1e6` (N40)
- Tab text: 14px weight 600 N500
- Active tab: text `#0052cc` (B500), `border-bottom: 2px solid #0052cc` overlapping container border
- Hover: text `#0065ff` (B400)
- Padding: 8px 0, margin-right 16px between tabs

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 2px, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px
- 4px half-step used for tight internal padding (lozenges, compact badges)
- 2px used only for micro-spacing (icon-to-text gaps in lozenges)

### Grid & Container
- Product navigation: 240px fixed left sidebar, collapsible to 20px icon rail
- Content area: fluid, with max-width constraints per context
- Confluence: 760px max-width centered editor, 240px page tree sidebar
- Jira board: horizontal scroll of 280-300px columns
- Jira backlog: single-column list, full-width within content area
- Bitbucket: 960-1200px max-width for diff views

### Whitespace Philosophy
- **Density is a feature**: Atlassian products serve teams managing hundreds of issues, pages, and pull requests. The UI compresses information without sacrificing clarity.
- **Consistent inner padding**: Cards use 12-16px padding. List items use 8px vertical padding. Table cells use 8px padding. This consistency creates rhythm across different view types.
- **Section spacing**: 24px between major sections. 16px between related groups. 8px between sibling items.

### Border Radius Scale
- Micro (2px): Inline code, tight badges
- Standard (3px): Buttons, inputs, cards, lozenges, dropdowns -- the ADS default
- Comfortable (4px): Board column tops, slightly softer contexts
- Full Pill (16px): User-facing pills, larger tag variants
- Circle (50%): Avatars, status dots, icon-only buttons

### Navigation Structure
- **Top navigation bar**: `background: #0052cc` (blue) or `#172b4d` (dark), 56px height, white text/icons
- **Product logo**: left-aligned, white, links to product home
- **Global actions**: right-aligned -- search, notifications (bell with red badge), help (?), user avatar
- **Left sidebar**: `background: #fafbfc`, 240px, `border-right: 1px solid #dfe1e6`
- **Sidebar items**: 14px N500, 8px 12px padding, `border-radius: 3px`, hover `background: #ebecf0`, active `background: #e6effc` with `color: #0052cc`

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Sunken (Level -1) | `background: #f4f5f7` (N20), no shadow | Board columns, sidebar, disabled fields |
| Flat (Level 0) | `background: #ffffff`, no shadow | Page canvas, table rows, list items |
| Raised (Level 1) | `box-shadow: 0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)` | Cards, issue cards, basic containers |
| Overlay (Level 2) | `box-shadow: 0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)` | Dropdowns, popovers, tooltips |
| Modal (Level 3) | `box-shadow: 0 8px 16px -4px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)` | Modals, dialogs, flags/toasts |
| Dragging (Level 4) | `box-shadow: 0 20px 32px -8px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)` | Dragged cards, drag handles |

**Shadow Philosophy**: ADS uses a two-layer shadow system. The first layer (`0 0 1px rgba(9, 30, 66, 0.31)`) is a constant ambient shadow that defines the edge of every elevated element -- it is the "border" of shadows. The second layer is a diffused directional shadow that scales with elevation. The color `rgba(9, 30, 66, ...)` is not generic black but Atlassian's dark blue-navy (`#091e42`), giving all shadows a cool, coherent tint that ties back to the brand. This is a subtle but critical detail: warm shadows would clash with the cool-neutral surface system.

## 7. Do's and Don'ts

### Do
- Use `#0052cc` (B500) exclusively for interactive elements -- buttons, links, active states, focus rings
- Apply status lozenges for every workflow state: they are the canonical way to show progress
- Use the `rgba(9, 30, 66, ...)` shadow color for all elevation -- never generic black
- Keep body text at 14px and headings at weight 600 -- the system's density depends on this
- Use `#172b4d` (N800) for headings and `#42526e` (N500) for body text -- never pure black
- Reserve 3px border-radius for nearly everything -- it is the ADS signature radius
- Employ avatar groups with white ring borders and overlap stacking for team contexts
- Support inline editing -- read-mode text that becomes editable on click is an Atlassian pattern
- Use the N20 (`#f4f5f7`) sunken surface for secondary regions (sidebars, board columns, code blocks)
- Stack notifications with `border-left: 4px solid <semantic-color>` flag pattern

### Don't
- Don't use rounded corners beyond 4px on product UI elements -- ADS is compact and squared
- Don't use pure black (`#000000`) for text -- N800 (`#172b4d`) is the darkest text color
- Don't apply blue decoratively -- it is exclusively for interactive and active states
- Don't use generic `rgba(0,0,0,...)` shadows -- the navy-tinted shadow is integral to the system
- Don't make lozenges large or sentence-case -- they are always compact, uppercase, and tight
- Don't skip the 8px spacing grid -- Atlassian's density discipline breaks without it
- Don't hide status behind color alone -- lozenges combine background color, text color, and text label
- Don't use weight 700 (bold) for headings -- 600 (semibold) is the system standard
- Don't introduce warm grays -- the neutral scale has a cool blue undertone throughout
- Don't animate transitions beyond 200ms -- enterprise users need speed, not delight animations

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <768px | Sidebar collapses to bottom nav, single-column boards |
| Tablet | 768-1024px | Sidebar as overlay drawer, 2-column board max |
| Desktop | 1024-1440px | Full sidebar, standard board layout |
| Wide Desktop | >1440px | Expanded content areas, additional board columns visible |

### Touch Targets
- Minimum touch target: 32px (ADS compact) or 40px (ADS standard)
- Buttons: minimum 32px height with 6px 12px padding
- List items: 40px row height minimum
- Avatar buttons: 32px minimum diameter
- Board cards: full-width tap targets within column

### Collapsing Strategy
- **Left sidebar**: 240px expanded, collapses to 20px icon rail, then hidden on mobile
- **Board columns**: horizontal scroll with snap points; on mobile, columns stack vertically or swipe
- **Top navigation**: product switcher compresses into hamburger menu below 768px
- **Issue detail**: side-panel on desktop (40-60% width), full-screen modal on mobile
- **Confluence editor**: max-width 760px on desktop, full-width on mobile with reduced margins
- **Tables**: horizontal scroll with sticky first column below 768px
- **Section spacing**: 32px desktop gaps compress to 16px on mobile

### Image Behavior
- Avatars maintain circle shape and minimum 24px size at all breakpoints
- Priority and type icons stay at 16px -- never scale below
- Board card thumbnails (attachments) hide on mobile to save vertical space
- Confluence page images scale to 100% container width, maintain aspect ratio

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: Atlassian Blue (`#0052cc`)
- Page Background: White (`#ffffff`)
- Sunken Surface: N20 (`#f4f5f7`)
- Card Surface: White (`#ffffff`) + Raised shadow
- Heading text: N800 (`#172b4d`)
- Body text: N500 (`#42526e`)
- Secondary text: N200 (`#6b778c`)
- Muted text: N80 (`#6f7786`)
- Success / Done: Green (`#00875a`)
- Error / Blocker: Red (`#ff5630`)
- Warning / Medium: Yellow (`#ffab00`)
- Info / Discovery: Teal (`#00b8d9`)
- Epic: Purple (`#6554c0`)
- Border (default): N30 (`#ebecf0`)
- Border (strong): N40 (`#dfe1e6`)
- Focus ring: `0 0 0 2px #4c9aff`
- Overlay: `rgba(9, 30, 66, 0.54)`

### Example Component Prompts
- "Create a Jira board with three columns (To Do, In Progress, Done) on `#f4f5f7` background. Column headers at 12px Inter weight 600 uppercase `#5e6c84` with item count. Cards are `#ffffff` with `box-shadow: 0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)`, 3px radius, 10px padding. Each card has summary text at 14px N800, bottom row with 24px avatar circle, priority icon 16px, issue type icon 16px, and issue key at 12px N200."
- "Design a status lozenge set: To Do (`background: #dfe1e6`, `color: #42526e`), In Progress (`background: #deebff`, `color: #0052cc`), Done (`background: #e3fcef`, `color: #006644`). All: 11px weight 700 uppercase, 3px radius, 2px 4px padding."
- "Build a Confluence-style page editor: white canvas, 760px max-width centered. Title input at 29px Inter weight 600 N800, no border. Body at 16px weight 400 line-height 1.714 N800. Sticky toolbar at top with 32x32px icon buttons on `#ffffff`, `border-bottom: 1px solid #ebecf0`."
- "Create a left sidebar navigation on `#fafbfc` with `border-right: 1px solid #dfe1e6`, 240px wide. Items at 14px Inter weight 400 N500, 8px 12px padding, 3px radius. Active item has `background: #e6effc`, `color: #0052cc`. Section headers at 11px weight 700 uppercase N200."
- "Design a PR diff view: file header on `#f4f5f7` with monospace file path at 14px N500. Added lines with `background: #e3fcef` and `border-left: 3px solid #00875a`. Removed lines with `background: #ffebe6` and `border-left: 3px solid #ff5630`. Line numbers at 12px monospace N80."

### Iteration Guide
1. Start with the N800/N500/N200 text hierarchy -- it establishes the information density baseline
2. Apply `#0052cc` only to interactive elements; use status lozenges for state, not blue
3. Use the two-layer `rgba(9, 30, 66, ...)` shadow system for all elevation -- shadow tint matters
4. Keep border-radius at 3px for buttons, inputs, cards, and lozenges -- resist rounding up
5. Spacing snaps to the 8px grid: 8, 16, 24, 32 for padding and gaps; 4px for tight contexts
6. Board layouts are 280-300px columns on `#f4f5f7` with white cards; columns scroll vertically
7. Avatar groups overlap left-to-right with `2px solid #ffffff` ring; overflow shows `+N` badge
8. Inline editing is the default pattern: text becomes input on click, 2px blue border signals edit mode
9. Flags/toasts use `border-left: 4px solid <semantic-color>` -- never full-background color fills
10. Enterprise tone: compact, functional, 200ms max transitions, no playful animations
