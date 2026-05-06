# SKILL — Art Deco

> When designing any artifact under the **Art Deco** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#3b82f6` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use gold as the dominant accent. It is the visual anchor of the entire system.
- Maintain strict bilateral symmetry in layouts, especially for hero sections and card grids.
- Use geometric decorative elements (fans, sunbursts, chevrons, stepped corners) to reinforce the Deco identity.
- Pair Playfair Display headlines with Inter body text. The serif/sans contrast mirrors the ornament/function duality of Art Deco.
- Keep backgrounds dark. The `black-deep` / `black-raised` palette is non-negotiable for the intended atmosphere.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use uppercase sparingly and deliberately: navigation labels, overlines, button text.
- Let whitespace (or rather, dark space) breathe. Deco is about confident negative space as much as ornament.
- Test gold text against dark backgrounds for WCAG AA contrast (the `gold` / `black-deep` pairing passes at 7.2:1).

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
