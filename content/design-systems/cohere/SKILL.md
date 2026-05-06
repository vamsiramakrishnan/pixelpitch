# SKILL — Cohere

> When designing any artifact under the **Cohere** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#212121` | Primary text |
| `--slate` | `#93939f` | Secondary / muted text |
| `--signal` | `#1863dc` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `CohereText`
- **Body**: `CohereText`
- **Mono**: `CohereMono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use 22px border-radius on all primary cards and containers — it's the visual signature
- Use CohereText for display headings (72px, 60px) with negative letter-spacing
- Use Unica77 for all body and UI text at weight 400
- Keep the palette black-and-white with cool gray borders
- Use Interaction Blue (#1863dc) only for hover/focus interactive states

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use deep purple sections for dramatic visual breaks and product showcases
- Apply uppercase + letter-spacing on CohereMono for section labels
- Maintain enterprise-appropriate photography with diverse subjects

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
