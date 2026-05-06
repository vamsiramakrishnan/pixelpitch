# SKILL — Together AI

> When designing any artifact under the **Together AI** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#000000` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#ef2cc1` | Accent / brand |
| `--bone` | `#bdbbff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use pastel gradients (pink/blue/lavender) for hero illustrations and decorative backgrounds
- Use Dark Blue (#010120) for dark sections — never generic gray-black
- Apply negative letter-spacing on all "The Future" text (scaled by size)
- Use PP Neue Montreal Mono in uppercase for section labels and technical markers
- Keep border-radius sharp (4px) for badges and interactive elements

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the dark-blue-tinted shadow for elevation
- Maintain the light/dark section duality — business (light) vs research (dark)
- Show enterprise stats prominently with large display numbers

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
