# SKILL — Starbucks

> When designing any artifact under the **Starbucks** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#1e3932` | Canvas / background |
| `--ink` | `#000000` | Primary text |
| `--slate` | `#8da098` | Secondary / muted text |
| `--signal` | `#006241` | Accent / brand |
| `--bone` | `#f9f9f9` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Neutral Warm (`#f2f0eb`) or Ceramic (`#edebe9`) as page canvas instead of pure white — the warm cream is the signature
- Map the green tiers to their intended surface role — Starbucks Green for headings, Green Accent for CTAs, House Green for deep bands, Uplift for decorative
- Keep tracking tight at `-0.01em` / `-0.16px` on SoDoSans across the whole system
- Use 50px full-pill radius on every button without exception
- Apply `transform: scale(0.95)` as the universal button active state

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Reserve Gold for Rewards-status ceremony moments only
- Use SoDoSans for nearly everything; switch to Lander Tall serif only for Rewards editorial headlines; reserve Kalam script for Careers "cup name" moments
- Layer 2–3 low-alpha shadows instead of one heavier drop shadow for elevation

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
