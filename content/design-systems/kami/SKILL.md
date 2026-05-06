# SKILL — kami (紙 / 纸)

> When designing any artifact under the **kami (紙 / 纸)** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f5f4ed` | Canvas / background |
| `--ink` | `#1b365d` | Primary text |
| `--slate` | `#30302e` | Secondary / muted text |
| `--signal` | `#1b365d` | Accent / brand |
| `--bone` | `#faf9f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use parchment (`#f5f4ed`) as the page background — the warm cream tone *is* the kami personality.
- Use a single serif weight (500) for every heading; let size carry hierarchy.
- Use ink-blue (`#1B365D`) only for primary CTAs, section numbers, links, the left rule of a quote, and the W500 in metrics.
- Keep every gray warm (yellow-brown undertone). When in doubt, sample with `R ≈ G > B`.
- Use ring shadows or whisper shadows for elevation; never hard drops.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Set tag backgrounds as solid hex pre-blended over parchment, never `rgba()`.
- Set numbers in `font-variant-numeric: tabular-nums`.
- Pair the section number with the section title in the same serif — no eyebrow needed.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
