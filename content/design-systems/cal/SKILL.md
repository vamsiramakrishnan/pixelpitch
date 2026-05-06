# SKILL — Cal.com

> When designing any artifact under the **Cal.com** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#0099ff` | Primary text |
| `--slate` | `#898989` | Secondary / muted text |
| `--signal` | `#0000ee` | Accent / brand |
| `--bone` | `#111111` | Secondary surface |

## Typography
- **Display**: `Cal Sans`
- **Body**: `Inter`
- **Mono**: `Roboto Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Cal Sans exclusively for headings (24px+) and never for body text — it's a display font with tight default spacing
- Apply positive letter-spacing (+0.2px) when using Cal Sans below 24px — the font cramps at small sizes without it
- Maintain the grayscale palette — boldness comes from contrast, not color
- Use the multi-layered shadow system for card elevation — ring shadow + diffused shadow + contact shadow
- Keep backgrounds pure white — the monochrome philosophy requires a clean canvas

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use Inter for all body text at weight 300–600 — it's the reliable counterpart to Cal Sans's display personality
- Let product screenshots be the visual content — no illustrations, no decorative graphics
- Apply generous section spacing (80px–96px) — the breathing room is essential to the premium feel

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
