# SKILL — Vaporwave

> When designing any artifact under the **Vaporwave** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#3b82f6` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- **Do** layer effects: grid background + gradient wash + scan lines + glass
- **Do** use the sunset gradient generously but vary its angle and opacity.
- **Do** keep body text high-contrast and legible. The dreamy aesthetic applies
- **Do** use retro window chrome for embedded content -- code blocks, image
- **Do** let decorative elements (busts, palms, glyphs) overlap content edges

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- **Do** use animation sparingly: slow floating (8-12s loops), gentle pulsing
- **Don't** use bright white (`#ffffff`) for large backgrounds. The deepest
- **Don't** apply glow effects to body text. Glow is for headlines, icons, and

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
