# SKILL — Runway

> When designing any artifact under the **Runway** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#000000` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#767d88` | Secondary / muted text |
| `--signal` | `#828282` | Accent / brand |
| `--bone` | `#e9ecf2` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use full-bleed cinematic photography as the primary visual element
- Use abcNormal for all text — maintain the single-typeface commitment
- Keep display line-heights at 1.0 with negative letter-spacing for film-title density
- Use the cool-gray neutral palette (#767d88, #7d848e) for secondary text
- Maintain zero shadows — depth comes from photography and section backgrounds

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use uppercase with letter-spacing for navigational labels (14px, 0.35px spacing)
- Apply small border-radius (4–8px) — the design is NOT pill-shaped
- Let visual content (photos, videos) dominate — the UI should be invisible

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
