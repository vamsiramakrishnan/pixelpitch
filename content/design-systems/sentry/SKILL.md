# SKILL — Sentry

> When designing any artifact under the **Sentry** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#1f1633` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#e5e7eb` | Secondary / muted text |
| `--signal` | `#c2ef4e` | Accent / brand |
| `--bone` | `#362d59` | Secondary surface |

## Typography
- **Display**: `Dammit Sans`
- **Body**: `Dammit Sans`
- **Mono**: `Monaco`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use deep purple backgrounds (`#1f1633`, `#150f23`) — never pure black (`#000000`)
- Apply inset shadows on primary buttons for the tactile pressed effect
- Use Dammit Sans ONLY for hero/display headings — Rubik for everything else
- Apply `text-transform: uppercase` with `letter-spacing: 0.2px` on buttons and labels
- Use the lime-green accent (`#c2ef4e`) sparingly for maximum impact

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Employ frosted glass effects (`blur(18px) saturate(180%)`) for layered surfaces
- Maintain the warm purple shadow tones — shadows should feel purple-tinted, not neutral gray
- Use Rubik's 4-tier weight system: 400 (body), 500 (nav/emphasis), 600 (titles), 700 (CTAs)

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
