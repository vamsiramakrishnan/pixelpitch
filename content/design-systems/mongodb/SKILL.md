# SKILL — MongoDB

> When designing any artifact under the **MongoDB** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#001e2b` | Canvas / background |
| `--ink` | `#3c9171` | Primary text |
| `--slate` | `#5c6c75` | Secondary / muted text |
| `--signal` | `#00ed64` | Accent / brand |
| `--bone` | `#e8edeb` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#001e2b` (forest-black) for dark sections — not pure black
- Apply MongoDB Green (`#00ed64`) sparingly for maximum electric impact
- Use MongoDB Value Serif ONLY for hero/display headings — Euclid Circular A for everything else
- Apply Source Code Pro uppercase with wide tracking (1px–3px) for technical labels
- Use teal-tinted shadows (`rgba(0,30,43,0.12)`) for primary card elevation

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain the dark/light section duality — dramatic contrast between modes
- Use weight 300 for body text — the light weight is the readable voice
- Apply pill radius (100px) to primary action buttons

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
