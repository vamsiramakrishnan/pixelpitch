# SKILL — Webflow

> When designing any artifact under the **Webflow** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#080808` | Primary text |
| `--slate` | `#ababab` | Secondary / muted text |
| `--signal` | `#146ef5` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Do: Use WF Visual Sans Variable at 500–600. Blue (#146ef5) for CTAs. 4px radius. translate(6px) hover.
- Don't: Round beyond 8px for functional elements. Use secondary colors on primary CTAs.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.


## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
