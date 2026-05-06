# SKILL — Cursor

> When designing any artifact under the **Cursor** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f2f1ed` | Canvas / background |
| `--ink` | `#26251e` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#f54e00` | Accent / brand |
| `--bone` | `#e6e5e0` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Buttons: text color shifts to `--color-error` (`#cf2d56`) on hover -- a distinctive warm crimson that signals interactivity
- Links: color shift to accent orange (`#f54e00`) or underline decoration with `rgba(38, 37, 30, 0.4)`
- Cards: shadow intensification on hover (ambient → elevated)
- Shadow-based focus: `rgba(0,0,0,0.1) 0px 4px 12px` for depth-based focus indication
- Border focus: `oklab(0.263 / 0.2)` (20% border) for input/form focus

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Consistent warm tone in all focus states -- no cold blue focus rings
- Color transitions: 150ms ease for text/background color changes
- Shadow transitions: 200ms ease for elevation changes

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
