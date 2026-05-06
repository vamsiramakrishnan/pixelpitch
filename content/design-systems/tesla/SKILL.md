# SKILL — Tesla

> When designing any artifact under the **Tesla** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#3e6ae1` | Canvas / background |
| `--ink` | `#5c5e62` | Primary text |
| `--slate` | `#5c5e62` | Secondary / muted text |
| `--signal` | `#3e6ae1` | Accent / brand |
| `--bone` | `#f4f4f4` | Secondary surface |

## Typography
- **Display**: `Universal Sans Display`
- **Body**: `Universal Sans Display`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Let photography dominate every screen — the product IS the design
- Use Electric Blue (`#3E6AE1`) exclusively for primary CTAs — never for decorative purposes
- Maintain viewport-height sections for major content blocks — one message per screen
- Keep typography at weight 400-500 only — no bold, no light, no extremes
- Use 4px border-radius for all interactive elements — precision over playfulness

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Trust whitespace as a luxury signal — never fill available space just because it's empty
- Keep all transitions at 0.33s — consistency in motion is as important as consistency in color
- Use transparent PNG vehicle imagery on white backgrounds for product showcases

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
