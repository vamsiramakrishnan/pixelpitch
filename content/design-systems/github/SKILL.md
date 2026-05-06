# SKILL — GitHub

> When designing any artifact under the **GitHub** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#1f2328` | Primary text |
| `--slate` | `#656d76` | Secondary / muted text |
| `--signal` | `#0969da` | Accent / brand |
| `--bone` | `#f6f8fa` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.


## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.


## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
