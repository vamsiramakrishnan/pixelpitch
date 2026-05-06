# SKILL — Netflix

> When designing any artifact under the **Netflix** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#141414` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#b3b3b3` | Secondary / muted text |
| `--signal` | `#f40612` | Accent / brand |
| `--bone` | `#1c1c1c` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#141414` as the base canvas — this specific shade is warmer and softer than pure `#000000`
- Reserve Netflix Red (`#e50914`) exclusively for logo, primary subscription CTAs, progress bars, and error states
- Let poster art and show stills provide all the color — the UI itself is achromatic
- Use the hover-to-expand pattern for content cards: scale 1.4x, 300ms ease-out, metadata reveal
- Apply heavy gradient overlays on hero images to ensure text readability

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Keep border radius at 4px for most elements — sharp, not rounded, not square
- Use horizontal scroll carousels as the primary content navigation pattern
- Fade carousel edges with `linear-gradient(#141414, transparent)` to imply more content

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
