# SKILL — YouTube

> When designing any artifact under the **YouTube** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#0f0f0f` | Primary text |
| `--slate` | `#606060` | Secondary / muted text |
| `--signal` | `#ff0000` | Accent / brand |
| `--bone` | `#f2f2f2` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use YouTube Red (`#ff0000`) exclusively for the logo, subscribe button, progress bar, notification badge, and live indicator — it must feel scarce and meaningful.
- Let thumbnails be the loudest visual element on every page — the UI chrome should be invisible.
- Use Roboto 400 for body and metadata, 500 for titles and emphasis — this two-weight system handles 95% of the interface.
- Apply 12px border-radius to thumbnails, cards, and containers — the signature rounding that arrived with Material You.
- Stack metadata tightly (4-8px gaps) below thumbnails — title, channel, views, and date should read as one scannable block.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the joined like/dislike pill pattern — two actions sharing a single container with a divider.
- Apply the chip-bar pattern for filters: horizontal scrollable row, inactive chips in `#f2f2f2`, active chip inverted to `#0f0f0f`.
- Keep the video player controls on a gradient scrim, never on a solid opaque bar.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
