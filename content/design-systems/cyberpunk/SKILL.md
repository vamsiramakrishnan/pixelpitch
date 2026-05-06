# SKILL — Cyberpunk

> When designing any artifact under the **Cyberpunk** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#3b82f6` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use neon color exclusively for interactive and signal elements. Let darkness dominate by area.
- Maintain a clear hierarchy: one primary neon (`neon-green`), one secondary (`magenta`), one tertiary (`cyan`). Never introduce a fourth neon.
- Keep the scan-line overlay subtle (2-3% opacity). It should be felt, not stared at.
- Use monospace type for data, status, and headings. Use the grotesque for sustained reading.
- Animate with restraint: one glitch on load, one pulsing indicator per view, one sweep on a progress bar. The rest is still.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Test contrast: `ghost-white` on `abyss` must hit WCAG AA (it does at 11.3:1). Neon green on `abyss` hits 12.5:1. Verify `dim-gray` on `abyss` for metadata -- it is intentionally below AA (decorative only, never for actionable text).
- Apply the `border-radius: 4px` rule universally. The angular, industrial feel depends on consistent tight radii.
- Do not use rounded pill shapes (`border-radius: 999px`). They belong to friendly consumer interfaces, not control rooms.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
