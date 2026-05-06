# SKILL — MiniMax

> When designing any artifact under the **MiniMax** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#bfdbfe` | Canvas / background |
| `--ink` | `#222222` | Primary text |
| `--slate` | `#45515e` | Secondary / muted text |
| `--signal` | `#ea5ec1` | Accent / brand |
| `--bone` | `#f2f3f5` | Secondary surface |

## Typography
- **Display**: `Outfit`
- **Body**: `Outfit`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use white as the dominant background — let product cards provide the color
- Apply pill radius (9999px) for navigation tabs and toggle buttons
- Use generous border radius (20px–24px) for product showcase cards
- Employ the purple-tinted shadow for featured/hero product cards
- Keep body text at DM Sans weight 400–500 — heavier weights for buttons only

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use Outfit for display headings, DM Sans for everything functional
- Maintain the universal 1.50 line-height across body text
- Let colorful product illustrations/gradients serve as the primary visual interest

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
