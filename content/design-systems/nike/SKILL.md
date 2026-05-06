# SKILL — Nike

> When designing any artifact under the **Nike** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#111111` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#707072` | Secondary / muted text |
| `--signal` | `#ff5000` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Nike Black (#111111) for all primary text — never pure #000000
- Keep buttons pill-shaped (30px radius) and limited to primary/secondary variants
- Use full-bleed, edge-to-edge photography for hero sections — no border radius on images
- Let product photography provide all color vibrancy; keep UI monochromatic
- Use uppercase Nike Futura ND ONLY for display headlines (96px+)

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain tight product grid gaps (4-12px) for a dense, abundant feel
- Use Grey-100 (#F5F5F5) for all input and placeholder backgrounds
- Reserve color exclusively for semantic meaning (red=error, green=success, blue=link)

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
