# SKILL — Binance.US

> When designing any artifact under the **Binance.US** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f0b90b` | Canvas / background |
| `--ink` | `#f0b90b` | Primary text |
| `--slate` | `#848e9c` | Secondary / muted text |
| `--signal` | `#f0b90b` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Binance Yellow (`#F0B90B`) exclusively for primary CTAs and brand accents — it's the single point of color
- Keep light and dark sections strictly alternating for visual rhythm
- Use BinancePlex at weight 500+ for all interactive elements — this is a confidence-forward design
- Apply 50px radius to all primary CTA pill buttons — the signature interactive shape
- Maintain 12px radius on content cards for a polished but not overly rounded feel

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Show real-time data prominently (prices, percentages, stats) — numbers build trust
- Use Slate (`#848E9C`) for all secondary/metadata text — the universal quiet voice
- Use Accessible Binance Gold (#9a7000) for yellow/gold text on light backgrounds

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
