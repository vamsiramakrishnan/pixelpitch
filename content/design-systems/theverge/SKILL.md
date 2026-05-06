# SKILL — The Verge

> When designing any artifact under the **The Verge** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#3cffd0` | Canvas / background |
| `--ink` | `#3cffd0` | Primary text |
| `--slate` | `#e9e9e9` | Secondary / muted text |
| `--signal` | `#ffffff` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- **Do** use `#131313` as the canvas for every view. There is no light mode.
- **Do** use Jelly Mint (`#3cffd0`) and Verge Ultraviolet (`#5200ff`) as hazard accents — buttons, borders, active states, and saturated color-block tiles.
- **Do** use Manuka exclusively at 60px+ for hero headlines. Treat anything smaller as a bug.
- **Do** round everything: 20px for cards, 24px for feature cards, 30–40px for pill buttons.
- **Do** use PolySans Mono for UPPERCASE labels, timestamps, kickers, and button text. Lowercase mono doesn't exist here.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- **Do** apply 1.5–1.9px letter-spacing to every ALL-CAPS label — this is a Verge signature.
- **Do** use saturated color-block tiles (mint, purple, yellow, pink, orange, white) to elevate a story — never a drop shadow.
- **Do** use `#3860be` (deep link blue) as the hover color on every link, regardless of base color.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
