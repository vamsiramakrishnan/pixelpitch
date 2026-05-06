# SKILL — Revolut

> When designing any artifact under the **Revolut** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#191c1f` | Canvas / background |
| `--ink` | `#376cd5` | Primary text |
| `--slate` | `#8d969e` | Secondary / muted text |
| `--signal` | `#4f55f1` | Accent / brand |
| `--bone` | `#f4f4f4` | Secondary surface |

## Typography
- **Display**: `Aeonik Pro`
- **Body**: `Aeonik Pro`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Aeonik Pro weight 500 for all display headings
- Apply 9999px radius to all buttons — pill shape is universal
- Use generous button padding (14px 32px)
- Keep the palette to near-black + white for marketing surfaces
- Apply positive letter-spacing on Inter body text

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Don't use shadows — Revolut is flat by design
- Don't use bold (700) for Aeonik Pro headings — 500 is the weight
- Don't use small buttons — the generous padding is intentional

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
