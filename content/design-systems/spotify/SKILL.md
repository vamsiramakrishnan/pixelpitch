# SKILL — Spotify

> When designing any artifact under the **Spotify** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#121212` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#b3b3b3` | Secondary / muted text |
| `--signal` | `#1ed760` | Accent / brand |
| `--bone` | `#252525` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use near-black backgrounds (`#121212`–`#1f1f1f`) — depth through shade variation
- Apply Spotify Green (`#1ed760`) only for play controls, active states, and primary CTAs
- Use pill shape (500px–9999px) for all buttons — circular (50%) for play controls
- Apply uppercase + wide letter-spacing (1.4px–2px) on button labels
- Keep typography compact (10px–24px range) — this is an app, not a magazine

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use heavy shadows (`0.3–0.5 opacity`) for elevated elements on dark backgrounds
- Let album art provide color — the UI itself is achromatic
- Don't use Spotify Green decoratively or on backgrounds — it's functional only

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
