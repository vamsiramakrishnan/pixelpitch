# SKILL — D&A Force Multipliers

> When designing any artifact under the **D&A Force Multipliers** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f4efe6` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#6b6862` | Secondary / muted text |
| `--signal` | `#d94f1b` | Accent / brand |
| `--bone` | `#f4efe6` | Secondary surface |

## Typography
- **Display**: `Fraunces`
- **Body**: `Source Serif 4`
- **Mono**: `JetBrains Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Paper (`#F4EFE6`) as the default canvas on every slide and card
- Put a mono ALL-CAPS kicker above every headline (JetBrains Mono 14px, 0.14em tracking)
- Use Source Serif 4 for any paragraph longer than two lines — Geist is for UI chrome, not reading
- Keep images square-cornered, edge-to-edge, grayscale, with italic captions hugging the bottom edge
- Separate content with hairline rules or whitespace, never with cards or shadows

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Scale headlines aggressively: 96–110px on hero, 44–56px on body slides — no "safe middle" at 32px
- Underline one italic word per headline in Signal (`#D94F1B`) — and only one
- Source every datum in mono caps: source, date, n

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
