# SKILL — Expo

> When designing any artifact under the **Expo** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f0f0f3` | Canvas / background |
| `--ink` | `#1c2024` | Primary text |
| `--slate` | `#60646c` | Secondary / muted text |
| `--signal` | `#47c2ff` | Accent / brand |
| `--bone` | `#333333` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `JetBrains Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Cloud Gray (`#f0f0f3`) as the page background and Pure White (`#ffffff`) for elevated cards — the two-tone light system is essential
- Keep display headlines at extreme negative letter-spacing (-1.6px to -3px at 64px) for the signature compressed look
- Use pill-shaped (9999px) radius for primary CTA buttons — the organic shape is core to the identity
- Reserve black (`#000000`) for headlines and primary CTAs — it carries maximum authority on the light canvas
- Use Slate Gray (`#60646c`) for secondary text — it's the precise balance between readable and receded

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain enormous vertical spacing between sections (96px+) — the gallery pacing defines the premium feel
- Use product screenshots as the primary visual content — the interface stays monochrome, the products bring color
- Apply Inter at the full weight range (400–900) — weight contrast IS the hierarchy

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
