# SKILL — Linear

> When designing any artifact under the **Linear** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#010102` | Canvas / background |
| `--ink` | `#f7f8f8` | Primary text |
| `--slate` | `#d0d6e0` | Secondary / muted text |
| `--signal` | `#7170ff` | Accent / brand |
| `--bone` | `#28282c` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `Berkeley Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Inter Variable with `"cv01", "ss03"` on ALL text — these features are fundamental to Linear's typeface identity
- Use weight 510 as your default emphasis weight — it's Linear's signature between-weight
- Apply aggressive negative letter-spacing at display sizes (-1.584px at 72px, -1.056px at 48px)
- Build on near-black backgrounds: `#08090a` for marketing, `#0f1011` for panels, `#191a1b` for elevated surfaces
- Use semi-transparent white borders (`rgba(255,255,255,0.05)` to `rgba(255,255,255,0.08)`) instead of solid dark borders

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Keep button backgrounds nearly transparent: `rgba(255,255,255,0.02)` to `rgba(255,255,255,0.05)`
- Reserve brand indigo (`#5e6ad2` / `#7170ff`) for primary CTAs and interactive accents only
- Use `#f7f8f8` for primary text — not pure `#ffffff`, which would be too harsh

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
