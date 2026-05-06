# SKILL — Hugging Face

> When designing any artifact under the **Hugging Face** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#374151` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#ffd21e` | Accent / brand |
| `--bone` | `#fafafa` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Accessible HF Gold (#917300) for yellow text on light backgrounds
- Don't use HF Yellow (#ffd21e) as text on white — it fails WCAG AA

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.


## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
