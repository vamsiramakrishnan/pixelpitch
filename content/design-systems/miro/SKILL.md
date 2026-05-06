# SKILL — Miro

> When designing any artifact under the **Miro** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#1c1c1e` | Primary text |
| `--slate` | `#555a6a` | Secondary / muted text |
| `--signal` | `#00b473` | Accent / brand |
| `--bone` | `#fde0f0` | Secondary surface |

## Typography
- **Display**: `Roobert PRO Medium`
- **Body**: `Noto Sans`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use pastel light/dark pairs for feature sections
- Apply Roobert PRO with OpenType character variants
- Use Blue 450 (#5b76fe) for interactive elements
- Don't use heavy shadows
- Don't mix more than 2 pastel accents per section

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.


## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
