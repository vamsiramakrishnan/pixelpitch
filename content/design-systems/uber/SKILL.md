# SKILL — Uber

> When designing any artifact under the **Uber** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#4b4b4b` | Primary text |
| `--slate` | `#4b4b4b` | Secondary / muted text |
| `--signal` | `#000000` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use true black (`#000000`) and pure white (`#ffffff`) as the primary palette -- the stark contrast IS Uber
- Use 999px border-radius for all buttons, chips, and pill-shaped navigation elements
- Keep all headings in UberMove Bold (700) for billboard-level impact
- Use whisper-soft shadows (0.12-0.16 opacity) for card elevation -- barely visible
- Maintain the compact, information-dense layout style -- Uber prioritizes efficiency over airiness

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use warm, human-centric illustrations to soften the monochrome interface
- Apply 8px radius for content cards and 12px for featured containers
- Use UberMoveText at weight 500 for navigation and prominent UI text

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
