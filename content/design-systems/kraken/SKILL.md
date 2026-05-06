# SKILL — Kraken

> When designing any artifact under the **Kraken** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#101114` | Primary text |
| `--slate` | `#9497a9` | Secondary / muted text |
| `--signal` | `#7132f5` | Accent / brand |
| `--bone` | `#dedee5` | Secondary surface |

## Typography
- **Display**: `Kraken-Brand`
- **Body**: `Kraken-Brand`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Kraken Purple (#7132f5) for CTAs and links
- Apply 12px radius on all buttons
- Use Kraken-Brand for headings, Kraken-Product for body
- Don't use pill buttons — 12px is the max radius for buttons
- Don't use other purples outside the defined scale

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.


## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
