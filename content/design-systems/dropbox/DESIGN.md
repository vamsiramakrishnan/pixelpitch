# Design System Inspired by Dropbox

> Category: Productivity & SaaS
> Cloud storage and collaboration. Clean blue accent, illustration-forward, spacious whitespace.

## 1. Visual Theme & Atmosphere

Dropbox's design language, refined through the 2020+ rebrand, is a study in approachable professionalism. The interface opens on an expansive white canvas (`#ffffff`) that breathes with generous whitespace, punctuated by a confident, saturated blue (`#0061ff`) that serves as both brand anchor and primary interactive color. Where enterprise SaaS often defaults to dense, information-heavy layouts, Dropbox takes the opposite stance: every element gets room to exist, every action gets space to be understood. The result feels less like a file management tool and more like a well-organized creative studio.

The typography is built on Sharp Grotesk for headlines -- a geometric sans-serif with distinctive character -- paired with Inter for body text and UI elements. Sharp Grotesk at display sizes carries a confident, slightly technical energy that distinguishes Dropbox from the rounded-friendly aesthetic of consumer apps without drifting into cold enterprise territory. Inter handles the workhorse duty of body copy, labels, metadata, and interactive text with clean readability. The pairing creates a two-voice system: Sharp Grotesk announces, Inter explains.

What truly sets Dropbox apart from its SaaS peers is the illustration-forward design philosophy. The 2020 rebrand introduced a vibrant, playful illustration system featuring hand-drawn characters, abstract shapes, and bold color blocks that inject warmth and personality into what could otherwise be a utilitarian file management interface. These illustrations appear at hero scales, in empty states, onboarding flows, and feature explanations -- they are not decorative afterthoughts but structural elements of the communication system. The color palette for illustrations extends well beyond the primary blue into warm corals, sunny yellows, and deep purples, creating visual interest while the UI chrome itself remains clean and restrained.

**Key Characteristics:**
- Expansive whitespace as a primary design element -- space is the luxury
- Dropbox Blue (`#0061ff`) as the singular brand accent and interactive color
- Sharp Grotesk for headlines, Inter for body and UI text
- Illustration-forward communication: hand-drawn, playful, warm
- Conservative border-radius (8px standard) -- rounded but not bubbly
- Minimal elevation: flat surfaces with subtle borders rather than heavy shadows
- File-centric UI patterns: cards, thumbnails, breadcrumbs, activity feeds
- Clean horizontal navigation with generous spacing
- Light UI with strategic use of dark text (`#1e1919`) for hierarchy

## 2. Color Palette & Roles

### Primary
- **Dropbox Blue** (`#0061ff`): The singular brand color. CTA backgrounds, links, selected states, progress indicators, primary interactive elements. A pure, saturated blue that reads as trustworthy and modern.
- **Blue Hover** (`#0050d4`): Slightly darker blue for hover and pressed states on primary buttons and links.
- **Blue Light** (`#e3ecff`): Soft blue tint for selected row backgrounds, active nav highlights, and notification badges. Low enough contrast to serve as a surface without competing with text.

### Neutrals
- **Black** (`#1e1919`): Primary heading color. Not pure black -- a warm near-black with a faint brown undertone that prevents harshness against white backgrounds.
- **Dark Gray** (`#3d3b39`): Secondary headings, strong labels, nav text. One step lighter than the heading black.
- **Mid Gray** (`#637282`): Body text, descriptions, secondary content. The default reading color for paragraph text.
- **Light Gray** (`#8c8c8c`): Tertiary text, timestamps, metadata, de-emphasized labels.
- **Muted** (`#b2b2b2`): Placeholder text, disabled states, inactive icons.
- **Pure White** (`#ffffff`): Page background, card surfaces, modal backgrounds. The dominant surface color of the entire system.

### Surface & Border
- **Surface Light** (`#f7f5f2`): Off-white surface for secondary panels, sidebar backgrounds, and alternate row striping. A warm gray-beige that creates subtle depth without visible borders.
- **Surface Hover** (`#f0edea`): Hover state for list items, file rows, and interactive surfaces.
- **Border Default** (`#e2e0de`): Standard border color for cards, dividers, input fields, and containers.
- **Border Subtle** (`#ebebeb`): Lighter border for internal dividers, table lines, and secondary separations.
- **Border Focus** (`#0061ff`): Focus ring color, matching the primary blue for accessibility.

### Status Colors
- **Success Green** (`#0d7d3b`): Synced status, successful uploads, completion indicators.
- **Success Light** (`#e6f4ea`): Success badge backgrounds, synced state surfaces.
- **Warning Amber** (`#e5a000`): Sync conflicts, storage warnings, attention states.
- **Warning Light** (`#fff3cd`): Warning badge backgrounds, alert surfaces.
- **Error Red** (`#d93025`): Upload failures, permission errors, destructive action warnings.
- **Error Light** (`#fce8e6`): Error badge backgrounds, failed state surfaces.
- **Info Blue** (`#0061ff`): Uses the primary blue for informational badges (shared ownership).

### Illustration Palette (Extended Brand)
- **Coral** (`#ff7e6b`): Warm accent for illustrations, onboarding, and marketing.
- **Yellow** (`#ffd830`): Bright accent for illustrations and feature highlights.
- **Purple** (`#7b68ee`): Deep accent for illustration elements and branding moments.
- **Teal** (`#17bebb`): Cool accent for illustration variety and category coding.

## 3. Typography Rules

### Font Family
- **Headline**: `Sharp Grotesk`, with fallback: `Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`
- **Body / UI**: `Inter`, with fallback: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif`
- **Monospace**: `SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display Hero | Sharp Grotesk | 56px (3.50rem) | 600 | 1.07 | -0.8px | Marketing heroes, landing page headlines |
| Display Large | Sharp Grotesk | 44px (2.75rem) | 600 | 1.09 | -0.6px | Secondary hero text, feature section titles |
| Heading 1 | Sharp Grotesk | 36px (2.25rem) | 600 | 1.11 | -0.5px | Major page titles, section headers |
| Heading 2 | Sharp Grotesk | 28px (1.75rem) | 600 | 1.14 | -0.3px | Sub-section headings, modal titles |
| Heading 3 | Inter | 22px (1.38rem) | 600 | 1.27 | -0.2px | Card titles, sidebar section headers |
| Heading 4 | Inter | 18px (1.13rem) | 600 | 1.33 | normal | List group headers, small section titles |
| Body Large | Inter | 18px (1.13rem) | 400 | 1.56 | normal | Introduction text, feature descriptions |
| Body | Inter | 16px (1.00rem) | 400 | 1.50 | normal | Standard reading text, descriptions |
| Body Medium | Inter | 16px (1.00rem) | 500 | 1.50 | normal | Labels, navigation text, emphasized body |
| Body Small | Inter | 14px (0.88rem) | 400 | 1.43 | normal | Secondary text, metadata, table cells |
| Body Small Medium | Inter | 14px (0.88rem) | 500 | 1.43 | normal | Active nav items, strong labels |
| Caption | Inter | 12px (0.75rem) | 400 | 1.33 | normal | Timestamps, file sizes, version numbers |
| Caption Medium | Inter | 12px (0.75rem) | 500 | 1.33 | 0.2px | Overline labels, category tags |
| Button Large | Inter | 16px (1.00rem) | 500 | 1.00 | normal | Primary CTA buttons |
| Button Standard | Inter | 14px (0.88rem) | 500 | 1.00 | normal | Secondary buttons, toolbar actions |
| Button Small | Inter | 12px (0.75rem) | 500 | 1.00 | normal | Compact buttons, inline actions |

### Principles
- **Two-font pairing**: Sharp Grotesk owns display and heading sizes (28px+), Inter owns everything below. The handoff point is clean -- never mix them at the same hierarchy level.
- **Weight restraint**: Sharp Grotesk uses 600 consistently for all headline sizes. Inter uses 400 (reading), 500 (emphasis/interaction), and 600 (section headers at smaller sizes). No heavy/black weights anywhere.
- **Tight headlines, relaxed body**: Letter-spacing compresses at display sizes (-0.8px at 56px) and relaxes to normal at body sizes. This creates a sense of precision at scale and comfort at reading sizes.
- **Line-height progression**: Line-height increases as size decreases -- tight at display (1.07) for visual density, relaxed at body (1.50-1.56) for readability.

## 4. Component Stylings

### Buttons

**Primary Blue**
- Background: `#0061ff`
- Text: `#ffffff`
- Padding: 10px 24px
- Radius: 8px
- Font: 14px Inter weight 500
- Hover: `#0050d4` background
- Active: `#003fa3` background
- Use: Primary CTAs ("Upload", "Share", "Create folder")

**Secondary Outlined**
- Background: `#ffffff`
- Text: `#1e1919`
- Padding: 10px 24px
- Radius: 8px
- Border: `1px solid #e2e0de`
- Font: 14px Inter weight 500
- Hover: `#f7f5f2` background
- Use: Secondary actions ("Cancel", "Download", "Move")

**Tertiary Ghost**
- Background: transparent
- Text: `#0061ff`
- Padding: 10px 16px
- Radius: 8px
- Font: 14px Inter weight 500
- Hover: `#e3ecff` background
- Use: Inline actions, text-level CTAs ("Learn more", "View all")

**Destructive**
- Background: `#d93025`
- Text: `#ffffff`
- Padding: 10px 24px
- Radius: 8px
- Font: 14px Inter weight 500
- Hover: `#b7271d` background
- Use: Destructive actions ("Delete permanently", "Remove access")

### File & Folder Cards

**Grid View Card**
- Background: `#ffffff`
- Border: `1px solid #e2e0de`
- Radius: 8px
- Thumbnail area: 100% width, aspect-ratio 4:3, `#f7f5f2` background with centered file-type icon or image preview
- Title: 14px Inter weight 500, `#1e1919`, single-line with text-overflow ellipsis
- Metadata: 12px Inter weight 400, `#8c8c8c` (modified date, file size)
- Hover: `border-color: #0061ff`, subtle blue ring glow
- Selected: `border: 2px solid #0061ff`, `#e3ecff` background tint
- Checkbox: top-left corner, appears on hover, 16px circular

**List View Row**
- Height: 48px
- Icon: 32px file-type icon, left-aligned with 16px padding
- Name: 14px Inter weight 400, `#1e1919`, flex-grow
- Modified: 14px Inter weight 400, `#637282`
- Size: 14px Inter weight 400, `#637282`
- Sharing: avatar stack (max 3, 24px each, -8px overlap)
- Hover: `#f7f5f2` background
- Selected: `#e3ecff` background
- Border-bottom: `1px solid #ebebeb`

### Breadcrumb Navigation
- Layout: horizontal, left-aligned, inline-flex
- Items: 14px Inter weight 400, `#637282`
- Current item: 14px Inter weight 500, `#1e1919`
- Separator: `/` character or chevron icon, `#b2b2b2`, 4px horizontal margin
- Hover: `#0061ff` text color, underline
- Overflow: collapse middle items into `...` dropdown menu with 8px radius
- Container padding: 12px 0

### Sharing Modal
- Overlay: `rgba(0,0,0,0.5)` backdrop
- Modal: `#ffffff` background, 8px radius, `max-width: 560px`
- Shadow: `0px 8px 32px rgba(0,0,0,0.12)`
- Header: 22px Inter weight 600, `#1e1919`, 24px padding, bottom border `#ebebeb`
- Email input: full-width, 40px height, 8px radius, `#e2e0de` border, `#0061ff` focus border
- Permission dropdown: "Can edit" / "Can view" pill, 8px radius, `#f7f5f2` background
- Member list: avatar (32px, circular) + name (14px, 500) + email (14px, 400, `#637282`) + role pill
- Copy link section: bottom-aligned, `#f7f5f2` background band, link icon + "Copy link" button
- Action row: right-aligned, "Cancel" secondary + "Share" primary button pair

### File Preview
- Background: `#1e1919` (dark overlay for contrast with document content)
- Toolbar: sticky top, `#2d2b29` background, 48px height
- Close button: top-left, `#ffffff` icon, 8px radius ghost button
- File name: 14px Inter weight 500, `#ffffff`, center-aligned
- Actions: top-right, icon buttons (download, share, comment, more), `#ffffff` icons
- Document area: centered, max-width constrained, white document on dark background
- Navigation: left/right arrow buttons for multi-page documents, `rgba(255,255,255,0.1)` background
- Comment sidebar: right panel, 320px width, `#ffffff` background, slide-in animation

### Activity Feed
- Container: vertical timeline, left-aligned
- Timestamp header: 12px Inter weight 500, `#8c8c8c`, uppercase, 0.2px letter-spacing, sticky
- Activity item: 44px min-height, 12px vertical padding
- Avatar: 32px circular, left-aligned
- Action text: 14px Inter weight 400, `#637282`. Actor name in weight 500, `#1e1919`. File name in weight 500, `#0061ff` (link)
- Action types: "edited", "shared", "commented", "uploaded", "moved", "deleted"
- Timestamp: 12px Inter weight 400, `#8c8c8c`, right-aligned or below action text
- Border-bottom: `1px solid #ebebeb` between items

### Smart Sync Indicators
- **Synced** (cloud with checkmark): `#0d7d3b` icon, "Available offline" tooltip
- **Online only** (cloud outline): `#8c8c8c` icon, "Online only" tooltip
- **Syncing** (animated circular arrows): `#0061ff` icon with 1.2s rotation animation
- **Sync error** (cloud with x): `#d93025` icon, "Sync error" tooltip with action link
- Icon size: 16px inline with file name, 20px in detail panels
- Transition: 200ms ease-out between states

### Team Spaces
- Space card: `#ffffff` background, 8px radius, `1px solid #e2e0de`
- Space icon: 48px square, 8px radius, brand-colored background with white initial letter
- Space name: 16px Inter weight 600, `#1e1919`
- Member count: 14px Inter weight 400, `#637282`, person icon prefix
- Description: 14px Inter weight 400, `#637282`, 2-line clamp
- Pin indicator: small pin icon, `#0061ff`, top-right of card
- Grid layout: responsive 3-column on desktop, 2 on tablet, 1 on mobile
- Hover: slight upward translate (translateY(-2px)), box-shadow appears

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px, 80px, 120px
- The scale is deliberately clean and geometric -- no odd values, no micro-adjustments
- Primary rhythm: 8px for tight UI, 16px for standard, 24px for comfortable, 32px+ for section-level

### Grid & Container
- Max content width: 1200px centered
- Sidebar: 256px fixed width, `#f7f5f2` background, left-aligned
- Content area: fluid, fills remaining width with 32px horizontal padding
- File grid: auto-fill, minmax(200px, 1fr), 16px gap
- File list: full-width table layout, column widths proportional (name: flex, modified: 180px, size: 100px)

### Whitespace Philosophy
- **Space as premium**: Dropbox uses whitespace as its primary luxury indicator. Where competitors pack features densely, Dropbox lets every element breathe. A file card in grid view has generous internal padding; a settings page uses full-width sections with 48px+ vertical spacing.
- **Illustration-scale breathing room**: Marketing pages allocate 40-60% of viewport height to illustrations and whitespace. This creates a magazine-like reading pace that communicates confidence and clarity.
- **Content hierarchy through space, not weight**: Rather than using bold text or color to create hierarchy, Dropbox relies on spacing intervals -- tighter spacing signals grouping (8px within a card), wider spacing signals separation (32px between sections).
- **Sidebar as anchor**: The persistent left sidebar provides a stable spatial anchor while the content area remains open and generous. The sidebar's warm off-white (`#f7f5f2`) creates a subtle visual separation without needing a visible border.

### Border Radius Scale
- Small (4px): Inline badges, small pills, tags
- Standard (8px): Buttons, cards, inputs, modals, dropdowns -- the workhorse radius
- Medium (12px): Featured cards, larger containers, illustration frames
- Full (9999px): Avatar circles, status dots, toggle switches

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow, white background | Default page surface, file list rows |
| Tinted (Level 1) | `#f7f5f2` background, no shadow | Sidebar, secondary panels, alternate surfaces |
| Bordered (Level 2) | `1px solid #e2e0de`, no shadow | File cards, input fields, standard containers |
| Raised (Level 3) | `0px 4px 16px rgba(0,0,0,0.08)` | Hover cards, dropdowns, popovers |
| Elevated (Level 4) | `0px 8px 32px rgba(0,0,0,0.12)` | Modals, sharing dialogs, preview overlays |
| Overlay (Level 5) | `0px 16px 48px rgba(0,0,0,0.16)` + backdrop | File preview, full-screen overlays |

**Shadow Philosophy**: Dropbox's elevation system is deliberately understated. The default state for most elements is flat or border-defined -- shadows appear only on interaction (hover) or for overlay elements (modals, menus). This keeps the interface feeling clean and paper-like at rest, with shadows serving as a signal that something has become interactive or has moved above the page plane. The shadow colors are pure neutral black at low opacity, avoiding the colored/tinted shadow trend -- this reinforces the clean, utilitarian feel of a file management tool. The progression from 4px blur at Level 3 to 48px at Level 5 creates a convincing z-axis without ever feeling dramatic.

### Depth Principles
- Default is flat: most elements rely on borders and background color rather than shadows
- Shadows appear on interaction: card hover, dropdown open, modal display
- Dark overlay mode for file preview creates stark contrast with the light UI
- No inset shadows or inner glow effects -- the system stays clean and forward-facing

## 7. Do's and Don'ts

### Do
- Use `#0061ff` (Dropbox Blue) as the single brand accent -- all interactive elements derive from this one color
- Pair Sharp Grotesk headlines with Inter body text -- the two-font system is the typographic identity
- Allocate generous whitespace around all elements -- space communicates trust and clarity
- Use `#f7f5f2` warm off-white for secondary surfaces instead of pure gray
- Keep border-radius at 8px for standard elements -- consistent, rounded but not playful
- Show file-type icons at appropriate sizes (32px in lists, 48px+ in grids, 64px+ in detail views)
- Use illustrations for empty states, onboarding, and feature marketing -- they are a core brand element
- Apply the warm near-black (`#1e1919`) for headings instead of pure `#000000`
- Use avatar stacks (overlapping circles, -8px offset) for showing shared collaborators
- Communicate sync status through simple iconography with clear color coding (green/blue/red)

### Don't
- Don't use multiple accent colors in the UI chrome -- `#0061ff` is the only interactive color
- Don't apply heavy shadows to resting elements -- the system is flat-first, shadows on interaction only
- Don't use border-radius larger than 12px on cards or containers -- the system is rounded, not bubbly
- Don't mix Sharp Grotesk into body text or UI labels -- it belongs exclusively at heading sizes (28px+)
- Don't use dense, cluttered layouts -- whitespace is the brand's primary differentiator
- Don't neglect empty states -- they should include illustrations and helpful copy, never just blank space
- Don't use the extended illustration palette (coral, yellow, purple) for UI elements -- those colors are for illustrations and marketing only
- Don't apply colored backgrounds to page sections -- the UI stays on white/off-white; color belongs in illustrations and the blue accent
- Don't use underlines for links in body text -- use `#0061ff` color alone to indicate interactivity
- Don't skip the breadcrumb in nested folder views -- spatial orientation is critical for file management UX

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <768px | Sidebar collapses to hamburger, single-column file grid, reduced padding |
| Tablet | 768-1024px | Sidebar as overlay, 2-column file grid, sharing modal goes full-width |
| Desktop | 1024-1440px | Full sidebar + content, 3-4 column file grid |
| Large Desktop | >1440px | Centered max-width content with generous lateral margins |

### Touch Targets
- Buttons: minimum 40px height with 10px vertical padding
- File list rows: 48px minimum height for comfortable tap targets
- File grid cards: generous padding with clear tap area
- Navigation items: 40px minimum height in sidebar
- Icon buttons: 36px minimum touch target even if icon is 20px

### Collapsing Strategy
- Sidebar: persistent on desktop, overlay drawer on tablet, hamburger toggle on mobile
- File grid: 4-column -> 3-column -> 2-column -> single column stacked
- File list: horizontal scroll for metadata columns on mobile, name always visible
- Breadcrumb: collapse middle segments into `...` dropdown at 3+ levels on mobile
- Sharing modal: max-width 560px on desktop, full-screen sheet on mobile
- File preview: full-screen overlay at all sizes, toolbar simplifies on mobile
- Activity feed: maintains single-column at all sizes, timestamps stack below action text on mobile
- Team spaces grid: 3-column -> 2-column -> single column
- Section spacing: 64px+ desktop -> 32px mobile
- Hero typography: 56px -> 44px -> 36px across breakpoints

### Image & Illustration Behavior
- Illustrations scale proportionally, maintain aspect ratio
- File thumbnails maintain consistent border-radius (8px) at all sizes
- Avatar stacks reduce from 3 visible to 2 on mobile
- File-type icons maintain 32px minimum for recognizability
- Marketing illustrations may simplify or reposition (not just scale) on mobile

## 9. Agent Prompt Guide

### Quick Color Reference
- Primary CTA: Dropbox Blue (`#0061ff`)
- CTA Hover: Blue Dark (`#0050d4`)
- Selected surface: Blue Light (`#e3ecff`)
- Background: Pure White (`#ffffff`)
- Secondary surface: Warm Off-white (`#f7f5f2`)
- Heading text: Warm Black (`#1e1919`)
- Secondary text: Dark Gray (`#3d3b39`)
- Body text: Mid Gray (`#637282`)
- Muted text: Light Gray (`#8c8c8c`)
- Border: Default Gray (`#e2e0de`)
- Border subtle: Light (`#ebebeb`)
- Success: Green (`#0d7d3b`)
- Warning: Amber (`#e5a000`)
- Error: Red (`#d93025`)

### Example Component Prompts
- "Create a hero section on white background. Headline at 56px Sharp Grotesk weight 600, line-height 1.07, letter-spacing -0.8px, color #1e1919. Subtitle at 18px Inter weight 400, line-height 1.56, color #637282. Blue CTA button (#0061ff, 8px radius, 10px 24px padding, white text, 14px Inter weight 500) and outlined secondary button (white bg, 1px solid #e2e0de, #1e1919 text, 8px radius)."
- "Design a file card: white background, 1px solid #e2e0de border, 8px radius. Thumbnail area with #f7f5f2 background, 4:3 aspect ratio. File name at 14px Inter weight 500, #1e1919, single-line ellipsis. Metadata at 12px Inter weight 400, #8c8c8c. Hover: border-color #0061ff."
- "Build a sharing modal: white background, 8px radius, max-width 560px, shadow 0px 8px 32px rgba(0,0,0,0.12). Header 22px Inter weight 600, #1e1919, bottom border #ebebeb. Full-width email input with 8px radius, 40px height, #e2e0de border, #0061ff focus border. Permission dropdown as pill with #f7f5f2 background."
- "Create the left sidebar: 256px width, #f7f5f2 background. Navigation items at 14px Inter weight 500, #3d3b39. Active item: #0061ff text with #e3ecff background, 8px radius. Section headers at 12px Inter weight 500, #8c8c8c, uppercase, 0.2px letter-spacing. 40px item height, 8px vertical spacing between items."
- "Design an activity feed: vertical timeline with 32px avatar, circular. Action text at 14px Inter weight 400, #637282. Actor name weight 500, #1e1919. File name weight 500, #0061ff. Timestamp at 12px weight 400, #8c8c8c. Items separated by 1px solid #ebebeb."

### Stitch Token Mapping
```
primary_color: #0061ff
color_mode: LIGHT
color_variant: FIDELITY
headline_font: INTER
body_font: INTER
roundness: ROUND_EIGHT
```

### Iteration Guide
1. Sharp Grotesk for headings 28px+, Inter for everything else -- never cross this boundary
2. Dropbox Blue (`#0061ff`) is the only chromatic color in the UI; status colors (green/amber/red) appear only in status contexts
3. Default state is flat with borders; shadows appear on hover and for overlays only
4. Use `#f7f5f2` warm off-white for the sidebar and secondary panels -- not pure gray
5. Border-radius stays at 8px for nearly everything; use 4px only for tiny inline elements
6. File-type icons are critical visual anchors -- always include them at appropriate sizes
7. Avatar stacks use -8px horizontal overlap with a white 2px ring border between each circle
8. Whitespace is generous: 16px minimum between grouped items, 32px between sections, 48px+ between major page areas
9. Empty states should include an illustration and a clear call-to-action -- never leave blank
10. Sync status uses a three-color system: green (synced), blue (syncing), red (error)
