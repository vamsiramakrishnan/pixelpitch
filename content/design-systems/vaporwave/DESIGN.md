# Vaporwave

> Category: Themed & Unique
> Retro-futuristic nostalgia. Pastel neons, sunset gradients, 80s/90s digital dreamscape.

---

## 1. Visual Theme & Atmosphere

Vaporwave is a digital fever dream soaked in expired nostalgia. It lives in the
liminal space between a Macintosh Plus booting up in a Tokyo mall at 3 AM and
a Windows 95 screensaver drifting through infinite geometric space. The aesthetic
is not ironic -- it is sincere longing for a future that was promised but never
arrived.

**Core visual pillars:**

- **Sunset gradients** -- the eternal sunset. Hot pink bleeds into tangerine,
  dissolves through lavender, settles into deep indigo. Every background is a
  horizon line. The sun is always setting and never gone.
- **Greek and Roman busts** -- marble statuary, cropped and glitched, floating
  against grid planes. Classical beauty filtered through digital decay. Heads
  without bodies, columns without temples.
- **Palm trees** -- silhouetted against gradient skies. Black fronds against
  pink-orange-purple. The tropical paradise of a screensaver, not a geography.
- **VHS scan lines** -- horizontal interference, tracking artifacts, chromatic
  aberration. Every surface carries the memory of magnetic tape.
- **Japanese text as decoration** -- katakana and kanji used as texture, not
  meaning. Floating glyphs, vertical text columns, neon signage half-glimpsed
  through rain on glass.
- **Retro computing** -- the Macintosh System 7 window chrome, the Windows 95
  taskbar, the 256-color palette, the aliased pixel. CRT glow. Floppy disk
  icons. Dialog boxes that ask questions nobody answers.
- **Grid perspectives** -- infinite Tron-like wireframe grids receding to a
  vanishing point, glowing cyan or magenta against black void.

**Mood:** Melancholic, dreamy, luxuriously slow. Everything floats. Nothing is
urgent. Time is a loop. The mall is empty but the fountain is still running.

---

## 2. Color Palette & Roles

### Primary neons

| Token       | Hex       | Name       | Role                                    |
|-------------|-----------|------------|-----------------------------------------|
| `--primary` | `#ff71ce` | Hot Pink   | Primary actions, headings, hero accents |
| `--secondary` | `#01cdfe` | Cyan     | Links, interactive states, data viz     |
| `--tertiary` | `#b967ff` | Purple    | Decorative borders, tags, badges        |

### Deep backgrounds

| Token            | Hex       | Name           | Role                          |
|------------------|-----------|----------------|-------------------------------|
| `--bg-deep`      | `#0d001a` | Void Black     | Page body, deepest layer      |
| `--bg-surface`   | `#1a0a2e` | Midnight Plum  | Cards, panels, elevated areas |
| `--bg-raised`    | `#2d1554` | Dusk Purple    | Hover states, active surfaces |

### Pastel variants (softened neons for large fills)

| Token              | Hex       | Name          | Role                              |
|--------------------|-----------|---------------|-----------------------------------|
| `--pastel-pink`    | `#ffa4d4` | Blush         | Soft backgrounds, highlight fills |
| `--pastel-mint`    | `#7dffc7` | Seafoam       | Success states, secondary fills   |
| `--pastel-lilac`   | `#c4a4ff` | Lavender Haze | Info banners, decorative fills    |

### Sunset gradient

```css
--gradient-sunset: linear-gradient(
  135deg,
  #ff71ce 0%,
  #ff9a56 30%,
  #ffbd39 50%,
  #b967ff 80%,
  #01cdfe 100%
);
```

Use `--gradient-sunset` for hero sections, card borders, and divider lines.
For subtlety, apply at 40-60% opacity over `--bg-deep`.

### Text colors

| Token          | Hex       | Usage                            |
|----------------|-----------|----------------------------------|
| `--text-primary` | `#f0e6ff` | Body text on dark backgrounds  |
| `--text-bright`  | `#ffffff` | Headlines, high-emphasis text  |
| `--text-muted`   | `#8a7ca8` | Captions, timestamps, metadata |

### Stitch token mapping

```
Primary color:   #ff71ce
Secondary:       #01cdfe
Tertiary:        #b967ff
Color mode:      DARK
Color variant:   EXPRESSIVE
```

---

## 3. Typography Rules

### Font stack

| Role      | Family          | Stitch token     | Fallback stack                 |
|-----------|-----------------|------------------|--------------------------------|
| Headlines | Space Grotesk   | SPACE_GROTESK    | `'Space Grotesk', sans-serif`  |
| Body      | Inter           | INTER            | `'Inter', system-ui, sans-serif` |

### Type scale

| Level        | Size    | Weight | Line height | Tracking    | Font          |
|--------------|---------|--------|-------------|-------------|---------------|
| Display      | 72px    | 700    | 1.0         | -0.02em     | Space Grotesk |
| H1           | 48px    | 700    | 1.1         | -0.01em     | Space Grotesk |
| H2           | 36px    | 600    | 1.2         | 0           | Space Grotesk |
| H3           | 28px    | 600    | 1.25        | 0           | Space Grotesk |
| H4           | 22px    | 500    | 1.3         | 0.01em      | Space Grotesk |
| Body large   | 18px    | 400    | 1.6         | 0           | Inter         |
| Body         | 16px    | 400    | 1.6         | 0           | Inter         |
| Body small   | 14px    | 400    | 1.5         | 0.01em      | Inter         |
| Caption      | 12px    | 500    | 1.4         | 0.02em      | Inter         |
| Overline     | 11px    | 700    | 1.2         | 0.12em      | Space Grotesk |

### Typography treatment rules

- **Headlines** may use `--gradient-sunset` as `background-clip: text` for hero
  moments. Limit to one gradient heading per view.
- **Glowing text** -- apply a `text-shadow` of `0 0 20px` using `--primary` at
  50% opacity for emphasis. Reserve for hero titles and key CTAs only.
- **Overlines** are always uppercase with extreme tracking (0.12em+).
- Body text stays clean and legible. Never apply glow or gradient to body copy.
- **Decorative Japanese** uses a fallback like `'Noto Sans JP', sans-serif` at
  caption size, placed as watermarks at 15-20% opacity.

### Stitch font mapping

```
Headline font: SPACE_GROTESK
Body font:     INTER
```

---

## 4. Component Stylings

### Frosted glass cards

```css
.card-glass {
  background: rgba(26, 10, 46, 0.6);
  backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid rgba(255, 113, 206, 0.15);
  border-radius: 12px;            /* ROUND_TWELVE */
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

The glass effect is the primary card surface. Content floats above a blurred
background of grid lines or gradient washes. The border carries a faint pink
tint to catch the ambient neon.

### Gradient-border panels

```css
.panel-gradient-border {
  position: relative;
  border-radius: 12px;
  padding: 1px;                   /* The border width */
  background: var(--gradient-sunset);
}
.panel-gradient-border > .inner {
  background: var(--bg-surface);
  border-radius: 11px;
  padding: 24px;
}
```

Use for feature cards, testimonials, or any content block that needs to stand
out from standard glass cards. The gradient border should shimmer -- not shout.

### Retro window chrome

```css
.retro-window {
  border: 2px solid var(--primary);
  border-radius: 0;              /* Intentionally sharp for retro feel */
  overflow: hidden;
}
.retro-window .title-bar {
  background: linear-gradient(90deg, #1a0a2e, #2d1554);
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 12px;
  color: var(--text-primary);
}
.retro-window .title-bar .btn-close { background: #ff5f56; }
.retro-window .title-bar .btn-min   { background: #ffbd2e; }
.retro-window .title-bar .btn-max   { background: #27c93f; }
.retro-window .title-bar [class^="btn-"] {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
}
```

The retro window is a direct homage to classic OS chrome. Title bar text should
read like a file path or system message: `C:\PARADISE\sunset.bmp` or
`untitled - Dream Editor`. Use for code blocks, embedded content, or image
frames.

### Palm tree silhouette decorations

Palm trees are placed as CSS pseudo-elements or inline SVGs at the bottom or
sides of hero sections. Always rendered as solid black silhouettes against a
gradient sky. Typical placement: bottom-left and bottom-right of hero banners,
scaled to roughly 30-40% of the section height.

### Grid-perspective backgrounds

```css
.grid-bg {
  background-image:
    linear-gradient(rgba(1, 205, 254, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(1, 205, 254, 0.08) 1px, transparent 1px);
  background-size: 40px 40px;
  perspective: 600px;
}
```

The infinite grid recedes toward the horizon. Apply as a full-bleed background
layer behind hero sections. For depth, use a CSS `perspective` transform to
skew the grid plane. Grid lines use `--secondary` (cyan) at very low opacity
(5-10%).

### Glowing text effects

```css
.glow-text {
  color: var(--primary);
  text-shadow:
    0 0 7px rgba(255, 113, 206, 0.6),
    0 0 20px rgba(255, 113, 206, 0.4),
    0 0 40px rgba(255, 113, 206, 0.2);
}
```

Reserve glow for hero headlines, navigation hover states, and primary CTA text.
Three-layer shadow creates a neon tube effect. Swap `--primary` for
`--secondary` or `--tertiary` for variety.

### Pixel-art accent elements

Small 8-bit style icons -- stars, hearts, arrows, geometric shapes -- used as
inline decorations. Render at exact pixel multiples (16px, 32px, 48px) with
`image-rendering: pixelated`. Place beside section headers or as list markers.

### Buttons

```css
.btn-primary {
  background: var(--primary);
  color: var(--bg-deep);
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 12px 28px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 0 16px rgba(255, 113, 206, 0.3);
  transition: box-shadow 0.3s ease, transform 0.2s ease;
}
.btn-primary:hover {
  box-shadow: 0 0 24px rgba(255, 113, 206, 0.5);
  transform: translateY(-1px);
}
```

Secondary buttons use a ghost style: transparent background, 1px border in
`--secondary`, text in `--secondary`, with cyan glow on hover.

### Scan line overlay

```css
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.06) 0px,
    rgba(0, 0, 0, 0.06) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
}
```

Apply sparingly to hero images and retro window content areas. The scan lines
should be barely visible -- a texture, not an obstruction.

### Stitch roundness mapping

```
Roundness: ROUND_TWELVE (12px border-radius on cards, buttons, inputs)
Exception: retro-window uses 0px radius intentionally
```

---

## 5. Layout Principles

### Centered compositions

Content gravitates to center. Hero sections are horizontally and vertically
centered. Cards arrange in centered grids. The eye rests in the middle of the
screen, as if looking through a window into a digital diorama.

```
Max content width:    1200px
Hero content width:   800px (narrower for focus)
Card grid:            3-column at desktop, 2 at tablet, 1 at mobile
Grid gap:             24px
Section padding:      80px vertical, 24px horizontal
```

### Retro asymmetry

While the primary grid is centered, decorative elements break symmetry
intentionally:
- Palm tree silhouettes anchor to corners, not center.
- Floating Japanese text drifts off-axis.
- Marble bust images are cropped and offset, bleeding past card edges.
- Grid-perspective backgrounds are skewed, not perfectly aligned.

This controlled asymmetry creates visual tension between the orderly grid and
the dreamlike decoration.

### Generous spacing

Vaporwave breathes. White space (or rather, deep-purple space) is not wasted --
it is the void through which elements float. Minimum spacing between major
sections is 80px. Cards have internal padding of at least 24px. Headlines sit
48px above their body text. The design should feel expansive, not crowded.

### Z-axis layering order

```
z-0   Grid-perspective background
z-1   Sunset gradient wash
z-2   Scan line overlay
z-3   Content cards and panels
z-4   Floating decorative elements (busts, palms, glyphs)
z-5   Navigation and modals
```

---

## 6. Depth & Elevation

### Elevation scale

| Level | Usage                     | Shadow                                     | Border treatment           |
|-------|---------------------------|---------------------------------------------|----------------------------|
| 0     | Page background           | None                                        | None                       |
| 1     | Cards, panels             | `0 4px 16px rgba(0, 0, 0, 0.3)`            | 1px pink at 15% opacity    |
| 2     | Dropdowns, popovers       | `0 8px 32px rgba(0, 0, 0, 0.5)`            | 1px gradient border        |
| 3     | Modals, dialogs           | `0 16px 48px rgba(0, 0, 0, 0.6)`           | 2px gradient border        |
| 4     | Toast notifications       | `0 4px 24px rgba(255, 113, 206, 0.2)`      | None (glow replaces border)|

### Glow as elevation

In addition to traditional box-shadows, elevated elements gain a colored glow
that intensifies with elevation level. A hovered card gains a faint pink halo.
A modal casts a purple ambient glow onto the backdrop. This replaces the typical
light-source shadow model with a neon-light-source model -- light radiates from
the element itself.

### Backdrop treatment

Modal and drawer backdrops use `backdrop-filter: blur(8px)` over a
semi-transparent `--bg-deep` at 70% opacity. The blurred background should
reveal the grid and gradient beneath, maintaining the layered dreamscape even
when focus narrows to a dialog.

---

## 7. Do's and Don'ts

### Do

- **Do** layer effects: grid background + gradient wash + scan lines + glass
  cards. The richness comes from transparent layers composited together.
- **Do** use the sunset gradient generously but vary its angle and opacity.
  135deg for hero, 90deg for borders, 180deg for dividers.
- **Do** keep body text high-contrast and legible. The dreamy aesthetic applies
  to decoration, not to readability.
- **Do** use retro window chrome for embedded content -- code blocks, image
  galleries, data tables. It frames content with personality.
- **Do** let decorative elements (busts, palms, glyphs) overlap content edges
  slightly. Rigid containment kills the dreamlike quality.
- **Do** use animation sparingly: slow floating (8-12s loops), gentle pulsing
  glows, subtle parallax. Everything drifts. Nothing snaps.

### Don't

- **Don't** use bright white (`#ffffff`) for large backgrounds. The deepest
  background is always `--bg-deep` (#0d001a) or `--bg-surface` (#1a0a2e).
- **Don't** apply glow effects to body text. Glow is for headlines, icons, and
  interactive elements only.
- **Don't** mix this palette with warm earth tones, corporate blues, or
  high-saturation primaries outside the pink-cyan-purple triad.
- **Don't** use sharp 0px border-radius on cards and buttons. Everything except
  retro window chrome uses 12px radius (ROUND_TWELVE).
- **Don't** overcrowd. If a section feels dense, remove elements rather than
  shrinking spacing. The void is part of the composition.
- **Don't** use fast, aggressive animations. No bounce, no elastic, no 200ms
  snaps. Transitions are 400-600ms with ease-out curves. The tempo is slow.
- **Don't** place decorative Japanese text where it could be mistaken for
  navigation or functional UI. It is always watermark-opacity (15-20%).

---

## 8. Responsive Behavior

### Breakpoints

| Name     | Width        | Columns | Section padding |
|----------|-------------|---------|-----------------|
| Desktop  | >= 1200px   | 12      | 80px vertical   |
| Tablet   | 768-1199px  | 8       | 48px vertical   |
| Mobile   | < 768px     | 4       | 32px vertical   |

### Adaptation rules

- **Grid-perspective backgrounds** simplify to flat grids below tablet to avoid
  performance issues on mobile GPUs.
- **Scan line overlays** are disabled below 768px. The effect is imperceptible
  on small, high-DPI screens and costs rendering performance.
- **Frosted glass** (`backdrop-filter`) degrades to solid `--bg-surface` on
  browsers that do not support it. Use `@supports` detection.
- **Palm tree decorations** scale down proportionally and may collapse to a
  single silhouette or be hidden entirely on mobile.
- **Display type** (72px) scales to 48px on tablet and 36px on mobile. H1
  scales from 48px to 36px to 28px.
- **Card grids** collapse from 3-column to 2-column at tablet, single-column
  at mobile. Maintain 24px gap at all breakpoints.
- **Retro window chrome** title bar buttons shrink to 10px on mobile. Window
  border reduces to 1px.
- **Glow effects** reduce shadow spread by 50% on mobile to conserve GPU paint.

### Touch considerations

- Minimum tap target: 44x44px.
- Buttons increase vertical padding from 12px to 16px on mobile.
- Hover-dependent glow states are suppressed on touch devices; use `:active`
  with a brief glow flash instead.

---

## 9. Agent Prompt Guide

When generating UI for the Vaporwave design system, follow these directives:

### Mandatory constraints

1. **Always set a dark base.** The page background is `#0d001a` or `#1a0a2e`.
   Never default to white or light gray.
2. **Use the three-color triad.** Hot Pink (`#ff71ce`), Cyan (`#01cdfe`), and
   Purple (`#b967ff`) are the only accent colors. Do not introduce new hues.
3. **Apply `border-radius: 12px`** to all cards, buttons, inputs, and
   containers. Only retro window chrome uses square corners.
4. **Headlines in Space Grotesk, body in Inter.** No substitutions.
5. **One gradient heading per view.** The sunset gradient text treatment is a
   hero moment, not a default.

### Atmosphere checklist

Before finalizing any screen, verify these atmospheric layers are present:

- [ ] Grid-perspective or flat grid background on at least one section
- [ ] Sunset gradient used in at least one element (hero, border, or divider)
- [ ] Glass-morphism card surfaces with blur and pink-tinted borders
- [ ] Generous vertical spacing (80px+ between major sections)
- [ ] At least one glow effect (text-shadow or box-shadow) on a focal element
- [ ] Muted text color (`#8a7ca8`) for secondary information
- [ ] Deep void (`#0d001a`) visible between content blocks

### Prompt fragments for generation

Use these phrases when prompting sub-agents or image generators to maintain
visual consistency:

- "Dark purple-black background, neon pink and cyan accents"
- "Frosted glass card with blurred background, faint pink border"
- "Sunset gradient flowing from hot pink through orange to purple"
- "Retro computing window with title bar, close/minimize/maximize buttons"
- "Wireframe grid receding to horizon, cyan lines on black"
- "Palm tree silhouettes against gradient sky"
- "VHS scan line texture overlay at low opacity"
- "Space Grotesk bold headline with neon glow effect"
- "Vaporwave aesthetic: dreamy, slow, nostalgic, digital paradise"

### Stitch integration summary

```
Primary color:   #ff71ce (Hot Pink)
Secondary:       #01cdfe (Cyan)
Tertiary:        #b967ff (Purple)
Color mode:      DARK
Color variant:   EXPRESSIVE
Headline font:   SPACE_GROTESK
Body font:       INTER
Roundness:       ROUND_TWELVE
```

When applying this design system through Stitch, these tokens map directly to
the platform's design system controls. The `EXPRESSIVE` color variant ensures
the dynamic color engine produces bold, saturated derivatives from the seed
colors rather than muting them toward neutral.
