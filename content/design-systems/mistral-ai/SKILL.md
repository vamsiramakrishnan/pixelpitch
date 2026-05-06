# SKILL — Mistral AI

> When designing any artifact under the **Mistral AI** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#fffaeb` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#ff8a00` | Accent / brand |
| `--bone` | `#fffaeb` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use the warm color spectrum exclusively: ivory, cream, amber, gold, orange
- Keep display typography at 82px+ with -2.05px letter-spacing for hero sections
- Use the Mistral block gradient (yellow → amber → orange) for brand moments
- Apply warm golden shadows (amber-tinted rgba) for elevated elements
- Use Mistral Black (#1f1f1f) for text — never pure #000000

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Keep font weight at 400 throughout — let size and color carry hierarchy
- Use sharp, architectural corners — near-zero border-radius
- Apply uppercase on button labels and section markers for European formality

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
