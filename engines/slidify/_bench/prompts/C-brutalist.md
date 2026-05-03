### Style brief: BRUTALIST / TECH-MONO

**References:** Vercel docs, Linear's homepage circa 2024, Are.na,
Brutalist Websites, GitHub's marketing pages, Hacker News-meets-zine,
Cabinet magazine, Working Not Working.

**Voice:** matter-of-fact, dense, terminal-output cadence. No marketing
fluff. Sentences look like they could be CLI status messages.

**Palette:**
- Bg: `#0a0a0a` near-black OR `#fafaf9` near-white.
- Text: `#fafaf9` on dark / `#0a0a0a` on light.
- ONE high-voltage accent: `#cdff00` (lime), `#ff5722` (vermilion),
  or `#0066ff` (cobalt). Used sparingly.
- Borders: 1-2px solid in the text color (NOT translucent).

**Typography:**
- ALL TEXT in monospace: `font-family: 'JetBrains Mono', 'IBM Plex Mono',
  'SF Mono', Menlo, monospace;`.
- Display: 36-56px, weight 700, letter-spacing 0 (mono is already wide),
  line-height 1.1.
- Body: 14-16px, weight 400.
- Micro labels: 11px, weight 600.
- All caps headers should ACTUALLY use uppercase letters (not text-transform).

**Mandatory shape vocabulary (use ≥4 per slide):**
- Hard-edged rectangles (NO border-radius, ever — `border-radius: 0`).
- Pixel-perfect 1px or 2px borders, solid color, never `rgba(...)`.
- ASCII-art-like SVG decoration: a `<rect>` grid (e.g. 6×8 of small rects)
  forming a geometric "loading" / "noise" pattern in the corner.
- Status pill drawn with PURE rectangles + text (no rounded corners):
  `[ OK ]`, `[ FAIL ]`, `[ 2.4ms ]`.
- Inline code-like blocks: monospace text on a 1-shade-different bg with
  a 1px solid border. NO syntax highlighting (one color throughout).
- Schematic diagrams: 90-degree-only `<line>`s connecting `<rect>`
  boxes. Endpoints land on rect edges.
- Numeric ladder: a stack of label+value rows separated by 1px hairlines,
  no padding cushion — feel cramped.
- Dot-matrix indicator: a row of 12-20 small circles, some filled accent,
  some outlined.

**Layout families:**
1. Spec sheet: 4-6 numeric rows (label / value / unit / status) in one column.
2. Schematic: 3-5 boxes connected by 90-degree lines, terminal-block layout.
3. Density grid: 3×4 or 4×3 of small bordered cells, each with a heading + 1-line.
4. Code-block hero: a block of monospace text taking up ~60% of the slide,
   sidebar with annotations (arrows + labels).
5. Status board: a vertical list of 8-15 status rows, each `LABEL ........ [STATUS]`.
6. Manifesto / index: numbered list of 5-9 lines (`01 / 02 / 03 ...`).

**Things this brief EXPLICITLY rejects:**
- ANY rounded corners (no border-radius).
- ANY gradients (no linear-, no radial-).
- ANY drop shadows.
- Proportional / sans-serif typography.
- Decoration system hints (`data-slidify-decorate`).
- Curved SVG paths (no `C` / `Q` commands; only `M`, `L`, `H`, `V`).
- Pastel or muted accent colors.

**Density target:** 25-50 distinct elements per slide (the aesthetic IS density).
