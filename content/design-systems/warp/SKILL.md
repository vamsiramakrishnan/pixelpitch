# SKILL — Warp

> When designing any artifact under the **Warp** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#353534` | Canvas / background |
| `--ink` | `#faf9f6` | Primary text |
| `--slate` | `#868584` | Secondary / muted text |
| `--signal` | `#868584` | Accent / brand |
| `--bone` | `#666469` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use warm off-white (`#faf9f6`) for text instead of pure white — the cream undertone is essential
- Keep buttons restrained and muted — dark fill (#353534) with muted text (#afaeac), no bright CTAs
- Apply Matter Regular (weight 400) for nearly everything — even headlines. Reserve Medium (500) for emphasis only
- Use uppercase labels with wide letter-spacing (1.4px–2.4px) for categorization
- Interleave nature photography with product screenshots — this is core to the brand identity

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain the almost monochromatic warm gray palette — no bold accent colors
- Use semi-transparent borders (`rgba(226, 226, 226, 0.35)`) for card containment instead of shadows
- Keep negative letter-spacing on headlines (-0.4px to -2.4px) for Matter's compressed display treatment

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
