# SKILL — Zapier

> When designing any artifact under the **Zapier** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#fffefb` | Canvas / background |
| `--ink` | `#201515` | Primary text |
| `--slate` | `#36342e` | Secondary / muted text |
| `--signal` | `#ff4f00` | Accent / brand |
| `--bone` | `#fffefb` | Secondary surface |

## Typography
- **Display**: `Degular Display`
- **Body**: `Degular Display`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Degular Display exclusively for hero-scale headlines (40px+) with 0.90 line-height for compressed impact
- Use Inter for all functional UI -- navigation, body text, buttons, labels
- Apply warm cream (`#fffefb`) as the background, never pure white
- Use `#201515` for text, never pure black -- the reddish warmth matters
- Keep Zapier Orange (`#ff4f00`) reserved for primary CTAs and active state indicators

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use sand (`#c5c0b1`) borders as the primary structural element instead of shadows
- Apply generous button padding (20px 24px) for large CTAs to match Zapier's spacious button style
- Use inset box-shadow underlines for tab navigation rather than border-bottom

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
