# SKILL — xAI

> When designing any artifact under the **xAI** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#3b82f6` | Accent / brand |
| `--bone` | `#1f2228` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#1f2228` as the universal background -- never pure black `#000000`
- Use GeistMono for all display headlines and button text -- monospace IS the brand
- Apply uppercase + 1.4px letter-spacing to all button labels
- Use weight 300 for the massive display headline (320px)
- Keep borders at `rgba(255, 255, 255, 0.1)` -- barely visible, not absent

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Dim interactive elements on hover to `rgba(255, 255, 255, 0.5)` -- the reverse of convention
- Maintain sharp corners (0px radius) as the default -- brutalist precision
- Use universalSans for all body and reading text at 16px/1.5

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
