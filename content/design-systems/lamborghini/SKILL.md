# SKILL — Lamborghini

> When designing any artifact under the **Lamborghini** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#000000` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#7d7d7d` | Secondary / muted text |
| `--signal` | `#ffc000` | Accent / brand |
| `--bone` | `#181818` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use absolute black (`#000000`) as the primary background — never dark gray as a substitute
- Apply Lamborghini Gold (`#FFC000`) exclusively for primary CTA buttons — never for decorative purposes
- Set all display headings in uppercase with LamboType — the brand voice is always SHOUTING
- Use zero border-radius on buttons and cards — sharp angles are non-negotiable
- Maintain tight line-heights (0.92–1.19) on display type to create dense, architectural text blocks

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the transparent ghost button (white border, 50% opacity) as the secondary CTA on dark backgrounds
- Let full-viewport video/photography carry emotional weight — UI is infrastructure, not decoration
- Reserve hexagonal geometry for UI icons and the video control button

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
