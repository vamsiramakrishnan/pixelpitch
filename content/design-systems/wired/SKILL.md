# SKILL — WIRED

> When designing any artifact under the **WIRED** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#057dbc` | Canvas / background |
| `--ink` | `#000000` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#057dbc` | Accent / brand |
| `--bone` | `#e2e8f0` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- **Do** use 2px hard black borders on every primary button — no 1px softness, no rounded edges.
- **Do** put a WiredMono ALL-CAPS kicker above every story headline (4–8px above, 0.9–1.2px tracking).
- **Do** use BreveText for any paragraph longer than two lines — Apercu is for UI, not reading.
- **Do** keep images square-cornered, edge-to-edge, with the caption hugging the bottom edge.
- **Do** separate story tiles with hairline rules or whitespace, never with cards or shadows.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- **Do** invert (black background, white type) only for footers, ribbons, and the utility nav strip.
- **Do** use `#057dbc` link blue exclusively for hover states — never as a background or button fill.
- **Do** scale headlines aggressively: 64px on hero, 26px on grid blocks, never 32px "safe middle ground".

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
