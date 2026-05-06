# SKILL — Vodafone

> When designing any artifact under the **Vodafone** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#3860be` | Primary text |
| `--slate` | `#7e7e7e` | Secondary / muted text |
| `--signal` | `#3860be` | Accent / brand |
| `--bone` | `#bebebe` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Vodafone Red (`#e60000`) as the single loudest element on any screen — one primary CTA per fold, one red band per editorial break
- Set display headlines in uppercase 800-weight with tight negative tracking; let them run to 90-144px on desktop
- Pair monumental display type with calm 16-18px body copy — the scale jump is the system
- Switch the button radius based on context: 2px rectangles for form and utility actions, 60px pills for editorial content CTAs
- Let documentary photography breathe at 16:9 or 1:1 on a 6px radius — no decorative borders, no heavy overlays

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the red band as a full-width chapter divider between every hero and the content below it
- Anchor every page with a charcoal institutional surface (`#25282b`) — the footer always, and on investor/sustainability pages extend the same color up to include the share ticker or the global-impact map
- Respect the universal page rhythm: dark hero → red band → white editorial → charcoal institutional → charcoal footer

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
