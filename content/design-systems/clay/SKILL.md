# SKILL — Clay

> When designing any artifact under the **Clay** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#faf9f7` | Canvas / background |
| `--ink` | `#fc7981` | Primary text |
| `--slate` | `#77736b` | Secondary / muted text |
| `--signal` | `#84e7a5` | Accent / brand |
| `--bone` | `#eff1f3` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `Space Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use warm cream (`#faf9f7`) as the page background — the warmth is the identity
- Apply all 5 OpenType stylistic sets on Roobert headings: `"ss01", "ss03", "ss10", "ss11", "ss12"`
- Use the named swatch palette (Matcha, Slushie, Lemon, Ube, Pomegranate, Blueberry) for section backgrounds
- Apply the playful hover animation: `rotateZ(-8deg)`, `translateY(-80%)`, hard shadow `-7px 7px`
- Use warm oat borders (`#dad4c8`) — not neutral gray

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Mix solid and dashed borders for visual variety
- Use generous radius: 24px for cards, 40px for sections
- Use weight 600 exclusively for headings, 500 for UI, 400 for body

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
