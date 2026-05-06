# SKILL — IBM

> When designing any artifact under the **IBM** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#161616` | Primary text |
| `--slate` | `#525252` | Secondary / muted text |
| `--signal` | `#0f62fe` | Accent / brand |
| `--bone` | `#f4f4f4` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `IBM Plex Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use IBM Plex Sans at weight 300 for display sizes (42px+) — the lightness is intentional
- Apply 0.16px letter-spacing on 14px body text and 0.32px on 12px captions
- Use 0px border-radius on buttons, inputs, cards, and tiles — rectangles are the system
- Reference `--cds-*` token names when implementing (e.g., `--cds-button-primary`, `--cds-text-primary`)
- Use background-color layering (white → gray 10 → gray 20) for depth instead of shadows

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use bottom-border (not box) for input field indicators
- Maintain the 48px default button height and asymmetric padding for icon accommodation
- Apply Blue 60 (`#0f62fe`) as the sole accent — one blue to rule them all

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
