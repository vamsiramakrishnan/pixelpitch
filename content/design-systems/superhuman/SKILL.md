# SKILL — Superhuman

> When designing any artifact under the **Superhuman** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#292827` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#cbb7fb` | Accent / brand |
| `--bone` | `#e9e5dd` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Super Sans VF at weight 460 as the default — it's slightly heavier than regular, which is the brand's typographic signature
- Keep display headlines at 0.96 line-height — the compression is intentional and powerful
- Use Warm Cream (`#e9e5dd`) for primary buttons — not white, not gray, specifically warm cream
- Limit border-radius to 8px (small) and 16px (large) — the binary radius system is deliberate
- Apply negative letter-spacing on headlines only (-0.63px to -1.32px) — body text stays at 0px

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use Lavender Glow (`#cbb7fb`) as the only accent color — it's the sole color departure from the neutral palette
- Let product screenshots be the primary visual content — the UI sells itself
- Maintain the dramatic hero gradient as a singular gesture — the rest of the page is white

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
