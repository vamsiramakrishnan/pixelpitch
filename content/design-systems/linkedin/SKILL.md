# SKILL — LinkedIn

> When designing any artifact under the **LinkedIn** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f4f2ee` | Canvas / background |
| `--ink` | `#0a66c2` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#0a66c2` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#0a66c2` LinkedIn Blue exclusively for interactive elements -- every blue element should be clickable or tappable
- Use the system font stack for native rendering on every platform
- Keep type scale between 12px and 24px -- LinkedIn never uses display-size text
- Use 8px border-radius on all card containers consistently
- Place 48px circular avatars as the primary visual anchor in feed items and lists

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use `#f4f2ee` warm off-white for page backgrounds -- never pure white or cool gray
- Maintain 16px internal padding on all cards
- Use `1px solid #e0deda` borders on cards rather than shadows for containment

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
