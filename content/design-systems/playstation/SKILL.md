# SKILL — PlayStation

> When designing any artifact under the **PlayStation** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#1eaedb` | Canvas / background |
| `--ink` | `#0070cc` | Primary text |
| `--slate` | `#6b6b6b` | Secondary / muted text |
| `--signal` | `#d53b00` | Accent / brand |
| `--bone` | `#f5f7fa` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- **Do** use PlayStation Blue (`#0070cc`) as the primary CTA fill and the footer anchor. It is the brand's anchor color.
- **Do** use SST weight 300 for every display headline 22px and above. The quiet-weight headline is the voice.
- **Do** apply the full hover signature to every primary button: cyan fill + 2px white border + 2px blue outer ring + `scale(1.2)`.
- **Do** use full-pill radius (`999px`) on primary and commerce buttons.
- **Do** reserve PlayStation Cyan (`#1eaedb`) exclusively for hover, focus, and active states — never as a resting background.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- **Do** use Commerce Orange (`#d53b00`) only on PlayStation Store / purchase CTAs and price callouts.
- **Do** alternate dark hero panels with white content panels and anchor with a deep blue footer — the three-surface channel layout is the page rhythm.
- **Do** use dramatic `rgba(0, 0, 0, 0.8)` hero drop shadows when a card overlaps product photography.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
