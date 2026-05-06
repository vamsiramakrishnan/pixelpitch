# SKILL — Coinbase

> When designing any artifact under the **Coinbase** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#0a0b0d` | Canvas / background |
| `--ink` | `#0a0b0d` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#0052ff` | Accent / brand |
| `--bone` | `#eef0f3` | Secondary surface |

## Typography
- **Display**: `CoinbaseDisplay`
- **Body**: `CoinbaseText`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Coinbase Blue (#0052ff) for primary interactive elements
- Apply 56px radius for all CTA buttons
- Use CoinbaseDisplay for hero headings only
- Alternate dark (#0a0b0d) and white sections
- Don't use the blue decoratively — it's functional only

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Don't use sharp corners on CTAs — 56px minimum

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
