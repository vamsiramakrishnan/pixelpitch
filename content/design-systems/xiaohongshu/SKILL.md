# SKILL — Xiaohongshu

> When designing any artifact under the **Xiaohongshu** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f5f5f5` | Canvas / background |
| `--ink` | `#133667` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#ff2e4d` | Accent / brand |
| `--bone` | `#fafafa` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- ✅ Treat brand red as singular. One CTA accent per screen, no second saturated color competing.
- ✅ Use translucent fill overlays (`rgba(48,48,52,0.05/.10/.20)`) for hover / disabled / pressed — not separate grey shades.
- ✅ Round generously: 12–16px on cards, full pill on buttons.
- ✅ Set body text at `rgba(0,0,0,0.80)` for titles and `rgba(0,0,0,0.62)` for paragraphs — soft black always.
- ✅ Use `RED Number` (or any tabular-numerals stack) for stats and counts.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- ✅ Let user-uploaded images carry the color story. The UI is the picture frame.
- ✅ Default to bottom-sheet for secondary actions on mobile; reserve centered modal for PC and confirmations only.
- ✅ Tabs are text + 2px underline. Always.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
