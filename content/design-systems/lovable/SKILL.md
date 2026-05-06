# SKILL — Lovable

> When designing any artifact under the **Lovable** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f7f4ed` | Canvas / background |
| `--ink` | `#1c1c1c` | Primary text |
| `--slate` | `#5f5f5d` | Secondary / muted text |
| `--signal` | `#5f5f5d` | Accent / brand |
| `--bone` | `#f7f4ed` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use the warm cream background (`#f7f4ed`) as the page foundation — it's the brand's signature warmth
- Use Camera Plain Variable at display sizes with negative letter-spacing (-0.9px to -1.5px)
- Derive all grays from `#1c1c1c` at varying opacity levels for tonal unity
- Use the inset shadow technique on dark buttons for tactile depth
- Use `#eceae4` borders instead of shadows for card containment

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Keep the weight system narrow: 400 for body/UI, 600 for headings
- Use full-pill radius (9999px) only for action pills and icon buttons
- Apply opacity 0.8 on active states for responsive tactile feedback

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
