# Being Slidify-Aware (Without Kneecapping Your Design)

> Pixelpitch's deck skills generate sophisticated, designer-grade HTML.
> Slidify evolves to convert that HTML to maximally-editable PPTX.
> This file is the contract that makes the two evolve together.

## Two principles

1. **Skills don't constrain themselves to slidify's current capabilities.**
   Use `backdrop-filter`, `mix-blend-mode`, custom WebGL shaders,
   `bg-clip-text` gradient headlines, `<canvas>` heroes, every modern
   Tailwind utility, every shadcn primitive, every Lucide icon —
   whatever makes the deck designer-grade.

2. **Slidify evolves to match.** Each pattern the skills emit gets,
   in order of preference:
   - **Native atom or pattern** — slidify learns to emit it as native
     PPTX shapes (text frames, gradients, lines, geometric shapes).
   - **Hybrid recipe** — keep the editable structure (text, layout)
     native; rasterize only the irreducible effect layer.
   - **Clean preserved raster** — when the effect is genuinely
     irreducible (canvas, complex masks, blends), slidify emits a
     pixel-perfect raster tile rather than guessing.

The harvester (`make bench-harvest`) closes the loop: it ranks repeat
misses across the corpus, classifies them by source spread / visual area
/ fidelity risk, and labels each as native-promotion, hybrid-recipe, or
preserve-raster work. Patterns the deck skills emit go into the corpus.

## Three free moves that help slidify (no design change)

These three hints cost nothing visually — they don't change a single
pixel — but they let slidify produce significantly more editable PPTX.

### 1. Tag titles with `data-pptx-role="title"`

```html
<h1 class="title gradient-text" data-pptx-role="title">
  Future is post-pixel.
</h1>
```

Slidify routes this to the master title placeholder, applies the right
font scale, and keeps it editable as a real PPTX title shape.
**Recommended on every `<h1>` / `<h2>` you treat as the slide title.**
Other roles: `subtitle`, `footer`.

### 2. Use atomic-seed `data-atom="<id>"` when an atom matches your intent

Slidify ships ~70 named recipes ("atoms") for common visual patterns.
When your CSS happens to match one, adding `data-atom` short-circuits
classification — slidify emits the atom's curated native recipe instead
of guessing. Your CSS still runs in the browser; the hint just helps the
PPTX side.

```html
<!-- Existing CSS unchanged. data-atom is purely a hint. -->
<div class="hero-bg" data-atom="bg.mesh">…</div>
<h1 class="display gradient-text" data-atom="type.gfill-4"
    data-pptx-role="title">Future.</h1>
<svg class="kpi-ring" data-atom="data.ring">…</svg>
```

Atoms catalog: [`examples/landing/atoms.html`](../examples/landing/atoms.html).
Compositions: [`examples/landing/recipes.html`](../examples/landing/recipes.html).

### 3. Mark intentional bleed with `data-pptx-allow-overflow="true"`

Slidify warns when content extends past the slide boundary because that
usually indicates an accidental overflow. When the bleed is intentional
(aurora glow, longshadow, marquee atoms), tag the parent — slidify
suppresses the warning and the descendants inherit the permission.

```html
<div class="aurora-bleed" data-pptx-allow-overflow="true">…</div>
```

That's the whole authoring contract. Three hints, all free, all optional.

## Hints for irreducible effects (also optional)

If you *know* a region is irreducible — a custom WebGL shader, a complex
mask animation, a `<canvas>` data viz — you can tell slidify to skip
classification and use a clean raster tile straight away. This is faster
and more deterministic than letting slidify discover it.

| Hint | Use case |
|---|---|
| `data-pptx-rasterize="true"` | Force this element + subtree to render as a raster image. Use for canvas/WebGL/complex-mask zones. |
| `data-pptx-skip="true"` | Don't emit this element at all. Use for browser-only chrome (page counter dots, in-iframe nav arrows). |
| `data-pptx-text="…"` | Override slidify's extracted text (when the visible glyph is decorative but you want a canonical OCR-recoverable version). |

## What slidify supports natively today

This is the *floor*, not the ceiling. The list grows every harvest cycle.

- **Tailwind v3/v4 utilities**: spacing, sizing, layout, color, type,
  borders, preset shadows.
- **Linear and radial gradients**, including multi-stop and `from-via-to`.
- **`bg-clip-text` gradient headlines** via the `type.gfill-N` atom
  family.
- **shadcn/ui primitives**: Card, Button, Badge, Tabs, Separator, Alert,
  Avatar, Progress, Tooltip — they compile to standard HTML+Tailwind.
- **Lucide icons** — inline SVG, slidify emits native paths.
- **SVG geometry**: `<path>`, `<rect>`, `<circle>`, `<line>`,
  `<polyline>` — all native.
- **Mesh / aurora backgrounds** — native via `bg.mesh`, `bg.aurora`
  atoms.
- **Ring charts, linear bar charts** — native via `data.ring`,
  `data.bar.linear` atoms.
- **Border radius up to 26 px**, preset shadow recipes (sm/md/lg/xl/2xl).

## What slidify rasters today (next on the harvester roadmap)

These are sophisticated patterns the deck skills already emit. Slidify
currently handles them via clean raster tiles or hybrid recipes;
upcoming work in `_bench/reports/harvest/` ranks them for promotion to
native atoms or hybrid recipes.

- `backdrop-filter: blur(...)` (frosted-glass cards): hybrid recipe
  candidate — emit native shape with a raster overlay just for the blur
  layer.
- `mix-blend-mode` overlays: hybrid recipe candidate.
- `<canvas>` data viz with axes/labels in HTML around it: native frame
  + raster canvas tile (already supported via auto-rasterize when
  `<canvas>` is detected; promotion to a proper hybrid recipe pending).
- `filter: blur(...)` on decorative non-text layers: candidate for a
  blurred-shadow native recipe.
- WebGL shader heroes: preserve-raster (irreducible), but the
  surrounding text/layout stays fully native.

To see what's in flight:

```bash
make bench-harvest                                    # mine the corpus
slidify field _bench/reports/harvest/bench-signals.json promotions
```

## Author with confidence

When you author a deck slide:

- Use any modern CSS / Tailwind / shadcn / Lucide pattern that matches
  your design intent.
- Add the three free hints above (`data-pptx-role`, `data-atom`,
  `data-pptx-allow-overflow`) where they apply.
- If you know a region is irreducible, hint it with
  `data-pptx-rasterize="true"`.

Slidify takes care of the rest, and the parts it can't natively model
yet become inputs to the next harvest cycle. See
[`docs/slidify-evolution.md`](../docs/slidify-evolution.md) for the
closed feedback loop.

## See also

- [`slide-author` skill](../.claude/skills/slide-author/SKILL.md) —
  full atomic-seed grammar (10 axes, all atoms, typographic registers).
- [`html-to-slides` skill](../.claude/skills/html-to-slides/SKILL.md) —
  the slidify CLI wrapper.
- [`pptx-html-fidelity-audit` skill](../skills/pptx-html-fidelity-audit/) —
  audit any deck after export.
- Slidify's in-tree guides: `slidify guide`.
