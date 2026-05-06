# SKILL — Stripe

> When designing any artifact under the **Stripe** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#533afd` | Primary text |
| `--slate` | `#64748d` | Secondary / muted text |
| `--signal` | `#ea2261` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `SourceCodePro`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use sohne-var with `"ss01"` on every text element -- the stylistic set IS the brand
- Use weight 300 for all headlines and body text -- lightness is the signature
- Apply blue-tinted shadows (`rgba(50,50,93,0.25)`) for all elevated elements
- Use `#061b31` (deep navy) for headings instead of `#000000` -- the warmth matters
- Keep border-radius between 4px-8px -- conservative rounding is intentional

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use `"tnum"` for any tabular/financial number display
- Layer shadows: blue-tinted far + neutral close for depth parallax
- Use `#533afd` purple as the primary interactive/CTA color

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
