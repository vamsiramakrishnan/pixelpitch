# SKILL — Framer

> When designing any artifact under the **Framer** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#000000` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#a6a6a6` | Secondary / muted text |
| `--signal` | `#ffffff` | Accent / brand |
| `--bone` | `#090909` | Secondary surface |

## Typography
- **Display**: `GT Walsheim Framer Medium`
- **Body**: `GT Walsheim Framer Medium`
- **Mono**: `Azeret Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use pure black (`#000000`) as the primary background — not dark gray, not charcoal
- Apply extreme negative letter-spacing on GT Walsheim display text (-3px to -5.5px)
- Keep all buttons pill-shaped (40px+ radius) — never use squared or slightly-rounded buttons
- Use Framer Blue (`#0099ff`) exclusively for interactive accents — links, borders, focus states
- Deploy `rgba(255, 255, 255, 0.1)` for frosted glass surfaces on dark backgrounds

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain GT Walsheim at weight 500 only — the medium weight IS the brand
- Use extensive OpenType features on Inter text (cv01, cv05, cv09, cv11, ss03, ss07)
- Let product screenshots be the visual centerpiece — the tool markets itself

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
