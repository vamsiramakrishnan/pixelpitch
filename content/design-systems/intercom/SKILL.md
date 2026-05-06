# SKILL — Intercom

> When designing any artifact under the **Intercom** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#111111` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#7b7b78` | Secondary / muted text |
| `--signal` | `#ff5600` | Accent / brand |
| `--bone` | `#faf9f6` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `MediumLL`
- **Mono**: `SaansMono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Saans with 1.00 line-height and negative tracking on all headings
- Apply 4px radius on buttons — sharp geometry is the identity
- Use Fin Orange (#ff5600) for AI/brand accent only
- Apply scale(1.1) hover on buttons
- Use warm neutrals (#faf9f6, #dedbd6)

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Don't round buttons beyond 4px
- Don't use Fin Orange decoratively
- Don't use cool gray borders — always warm oat tones

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
