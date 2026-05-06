# SKILL — OpenCode

> When designing any artifact under the **OpenCode** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#201d1d` | Canvas / background |
| `--ink` | `#fdfcfc` | Primary text |
| `--slate` | `#9a9898` | Secondary / muted text |
| `--signal` | `#007aff` | Accent / brand |
| `--bone` | `#201d1d` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Links: color shift from default to accent blue (`#007aff`) or underline style change
- Buttons: subtle background lightening or border emphasis
- Accent blue provides a three-stage hover sequence: `#007aff` → `#0056b3` → `#004085` (default → hover → active)
- Danger red: `#ff3b30` → `#d70015` → `#a50011`
- Warning orange: `#ff9f0a` → `#cc7f08` → `#995f06`

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Border-based focus: increased border opacity or solid border color
- No shadow-based focus rings -- consistent with the flat, no-shadow aesthetic
- Keyboard focus likely uses outline or border color shift to accent blue

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
