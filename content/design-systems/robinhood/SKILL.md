# SKILL — Robinhood

> When designing any artifact under the **Robinhood** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#1e2124` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#00bfa5` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `SF Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#00c805` green and `#ff5000` red exclusively as semantic gain/loss indicators -- never as decoration
- Keep weight at 400-500 maximum; use 600 only for ticker symbols (AAPL, TSLA)
- Design each screen around a single primary action and a single primary number
- Use full-width line charts with no gridlines, no Y-axis, no bounding box
- Pin the primary action button to the bottom of mobile viewports

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use 1px `#e8e8ea` dividers instead of shadows to separate list items
- Apply `font-variant-numeric: tabular-nums` to all price and percentage displays
- Keep the chart line at 2px stroke -- thin enough to feel precise, thick enough to read

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
