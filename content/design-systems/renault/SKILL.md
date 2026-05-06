# SKILL — Renault

> When designing any artifact under the **Renault** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#efdf00` | Canvas / background |
| `--ink` | `#efdf00` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#1883fd` | Accent / brand |
| `--bone` | `#777774` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Renault Yellow (`#EFDF00`) exclusively for super-primary CTAs — it carries the full weight of the diamond logo's identity
- Maintain zero border-radius on all buttons — sharp edges are non-negotiable in the Renault system
- Use NouvelR Bold (700) as the default heading weight — the assertive weight is central to the brand's energetic personality
- Apply the dark gradient overlay (`rgba(0,0,0,0.6) → transparent`) on PromoCards to ensure text legibility over photography
- Keep hero line-heights ultra-tight (0.95) for display text — the compressed texture feels urgent and modern

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Alternate between black and white sections to create the signature chessboard rhythm
- Use `#1883FD` (Renault Blue) consistently for all link hover states — one interactive color signal
- Set minimum interactive size at 46×46px for all buttons — accessibility built into the component spec

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
