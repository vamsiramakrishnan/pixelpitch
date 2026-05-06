# SKILL — Apple

> When designing any artifact under the **Apple** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#1d1d1f` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#0071e3` | Accent / brand |
| `--bone` | `#d2d2d7` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use the neutral triad (`#000000`, `#f5f5f7`, `#ffffff`) as the structural foundation.
- Reserve blue accents for genuine action and navigation semantics.
- Keep typography tight and deliberate, especially at display scales.
- Maintain the capsule/circle geometry language for controls and key actions.
- Let product imagery carry visual drama; keep chrome understated.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use border-led containment in dense retail contexts instead of heavy card ornamentation.
- Preserve clear separation between showcase modules and transactional modules while keeping core tokens shared.
- Don’t introduce broad secondary accent palettes that compete with Apple blue.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
