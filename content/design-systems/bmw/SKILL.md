# SKILL — BMW

> When designing any artifact under the **BMW** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#262626` | Primary text |
| `--slate` | `#757575` | Secondary / muted text |
| `--signal` | `#1c69d4` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use BMWTypeNextLatin Light (300) uppercase for all display headings
- Keep ALL corners sharp (0px radius) — angular geometry is non-negotiable
- Use BMW Blue (`#1c69d4`) only for interactive elements — never decoratively
- Apply weight 900 for navigation emphasis — the extreme weight contrast is intentional
- Use full-bleed automotive photography for hero sections

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Keep line-heights tight (1.15–1.30) throughout
- Use `--site-context-*` CSS variables for theming
- Don't round corners — zero radius is the BMW identity

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
