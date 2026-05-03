---
name: simple-deck
description: |
  Single-file horizontal-swipe HTML deck. Built by copying the seed
  `assets/template.html` (which carries the proven 5-rule iframe nav script)
  and pasting slide layouts from `references/layouts.md`. Pitch decks,
  product overviews, study material — when you don't need the magazine
  aesthetic of `magazine-web-ppt`.
triggers:
  - "deck"
  - "slides"
  - "ppt"
  - "presentation"
  - "幻灯"
  - "ppt 模板"
pixelpitch:
  mode: deck
  scenario: product
  preview:
    type: html
    entry: index.html
  design_system:
    requires: true
    sections: [color, typography, layout, components]
---

# Simple Deck Skill

Produce a single-file horizontal-swipe HTML deck using the seed and layout library.

## Resource map

```
simple-deck/
├── SKILL.md                ← you're reading this
├── assets/
│   └── template.html       ← seed: tokens + slide primitives + proven nav script (READ FIRST)
└── references/
    ├── layouts.md          ← 8 paste-ready slide layouts + theme-rhythm rules
    └── checklist.md        ← P0/P1/P2 self-review (rhythm spot-check at bottom)
```

## Workflow

### Step 0 — Pre-flight

1. **Read `assets/template.html`** end-to-end through the `<style>` block AND the `<script>` block. The script solves five iframe-specific bugs (real scroller detection, dual capture-phase listeners, auto-focus, no `scrollIntoView`, position persistence) — do not rewrite it.
2. **Read `references/layouts.md`** so you know the 8 layouts. Pay special attention to the "Theme rhythm" section — it's the rule that prevents the deck from feeling sleepy.
3. **Read the active DESIGN.md** — map its tokens to the six `:root` variables in the seed.

### Step 1 — Copy the seed

Copy `assets/template.html` to the project root as `index.html`. Replace the six `:root` variables with the active design system's tokens. Replace the page `<title>`.

### Step 2 — Decide slide count + theme rhythm BEFORE writing any slide

Default: 6 slides unless the brief says otherwise.

| Audience / format | Slides |
|---|---|
| Product overview / lightning talk (5–10 min) | 6 |
| Pitch deck (15 min) | 8–10 |
| Investor update / longer talk (20–30 min) | 12–18 |

Then write out the rhythm before any HTML — for example, 8 slides:

```
01  hero light center  Cover
02  light              Problem
03  hero dark center   Big stat
04  light              Three points
05  dark               Pipeline
06  hero light center  Quote
07  light              Before / after
08  hero dark center   Ask
```

A healthy sequence has:
- No 3+ same theme in a row
- ≥ 1 `hero dark` AND ≥ 1 `hero light` (for 8+ slides)
- Alternating breath every 3–4 slides

Show this rhythm sketch to the user *before* writing slide HTML — they can redirect cheaply.

### Step 3 — Paste and fill

For each planned slide, copy the matching `<section>` from `layouts.md` into the body. Replace bracketed text with real, specific copy. **No filler / no lorem.** If a slide feels empty, the layout is wrong — pick a different one.

Tag each slide with `data-screen-label="01 Cover"`, `"02 Problem"`, etc., in the order you wrote them. (The seed's first three slides already do this — extend the pattern.)

### Step 4 — Self-check

Run through `references/checklist.md`. The "Theme rhythm spot-check" at the end is non-negotiable:

```bash
grep 'class="slide' index.html
```

Read the resulting class list. If you see `light × 4 in a row`, swap one to `dark`. If no `hero dark` exists in an 8+ slide deck, promote one big-stat or closing slide.

### Step 5 — Emit the artifact

```
<artifact identifier="deck-slug" type="text/html" title="Deck Title">
<!doctype html>
<html>...</html>
</artifact>
```

One sentence before the artifact. Stop after `</artifact>`.

## Hard rules

- **Theme class on every slide** (`light` | `dark` | `hero light` | `hero dark`). Bare `class="slide"` = regression.
- **No 3+ same theme in a row.**
- **Display = serif via `var(--font-display)`.** `.h-hero` / `.h-xl` / `.h-md` already enforce.
- **One accent per slide, used at most twice.**
- **Don't rewrite the nav script.** It's proven.
- **No `scrollIntoView()`.** Breaks iframe.
- **`data-screen-label` on every slide.**

<!-- pixelpitch:slidify-aware -->
## Slidify-aware authoring (PPTX export)

This deck skill is part of pixelpitch's slide-designing system. The
HTML you author here is rendered live in the sandboxed iframe preview
and, when the user exports to PPTX, fed through `slidify` for a
maximally-editable PowerPoint file.

You don't need to change any of the design above to make slidify happy.
You can use `backdrop-filter`, `mix-blend-mode`, `<canvas>` heroes,
gradient text-clipping, and the full Tailwind / shadcn / Lucide stack.

There are **three free hints** that help slidify produce more editable
PPTX without changing a single pixel:

1. **Tag the slide title.** Add `data-pptx-role="title"` to the `<h1>`
   (or `<h2>`) you treat as the slide title. Slidify routes it to the
   master title placeholder and keeps it editable.
2. **Use atomic-seed atoms when one matches.** When your CSS happens to
   match a named recipe (`bg.mesh`, `type.gfill-4`, `data.ring`,
   etc.), tag the cluster anchor with `data-atom="<id>"`. Your CSS
   still runs in the browser unchanged; the hint just helps slidify
   pick the curated native recipe instead of guessing.
3. **Mark intentional bleed.** When a decorative element intentionally
   extends past the slide boundary (aurora glow, longshadow, marquee),
   tag the parent with `data-pptx-allow-overflow="true"`.

For irreducible effects (custom WebGL, complex masks), `data-pptx-rasterize="true"`
on the wrapper tells slidify to use a clean raster tile straight away
rather than discovering it.

Full guide: [`craft/slidify-compat.md`](../../craft/slidify-compat.md).
Atomic-seed grammar: [`slide-author`](../../.claude/skills/slide-author/SKILL.md)
sibling skill. Evolution loop (how slidify catches up to whatever this
skill emits): [`docs/slidify-evolution.md`](../../docs/slidify-evolution.md).

### Export

```bash
slidify convert deck.html out.pptx --json --report-json /tmp/r.json
slidify field /tmp/r.json native_area_ratio        # how editable the result is
slidify check deck.html                             # exit 0 ok / 3 = drift
```

Inside the pixelpitch web app, the daemon shells out to this same
`slidify` binary when the user clicks Export → PPTX.
