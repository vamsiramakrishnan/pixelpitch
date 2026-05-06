# SKILL — Ollama

> When designing any artifact under the **Ollama** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#262626` | Primary text |
| `--slate` | `#737373` | Secondary / muted text |
| `--signal` | `#737373` | Accent / brand |
| `--bone` | `#fafafa` | Secondary surface |

## Typography
- **Display**: `SF Pro Rounded`
- **Body**: `SF Pro Rounded`
- **Mono**: `ui-monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use pure white (`#ffffff`) as the page background — never off-white or cream
- Use pill-shaped (9999px) radius on all interactive elements — buttons, tabs, inputs, tags
- Use 12px radius on all non-interactive containers — code blocks, cards, panels
- Keep the palette strictly grayscale — no chromatic colors except the blue focus ring
- Use SF Pro Rounded at weight 500 for display headings — the rounded terminals are the brand expression

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain zero shadows — depth comes from borders and background shifts only
- Keep content density low — each section should present one clear idea
- Use monospace for terminal commands and code — it's primary content, not decoration

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
