# SKILL — Pinterest

> When designing any artifact under the **Pinterest** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#0866ff` | Canvas / background |
| `--ink` | `#211922` | Primary text |
| `--slate` | `#62625b` | Secondary / muted text |
| `--signal` | `#e60023` | Accent / brand |
| `--bone` | `#e5e5e0` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use warm neutrals (`#e5e5e0`, `#e0e0d9`, `#91918c`) — the warm olive/sand tone is the identity
- Apply Pinterest Red (`#e60023`) only for primary CTAs — it's bold and singular
- Use Pin Sans exclusively — one font for everything
- Apply generous border-radius: 16px for buttons/inputs, 20px+ for cards
- Keep the masonry grid dense — content density is the value

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use warm badge backgrounds (`hsla(60,20%,98%,.5)`) for subtle warm washes
- Use `#211922` (plum black) for primary text — it's warmer than pure black
- Don't use cool gray neutrals — always warm/olive-toned

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
