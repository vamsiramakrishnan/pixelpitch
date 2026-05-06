# SKILL — Airbnb

> When designing any artifact under the **Airbnb** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#ff385c` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#ff385c` | Accent / brand |
| `--bone` | `#f7f7f7` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Reserve Rausch `#ff385c` for primary actions and the active-tab indicator — never dilute it with decorative uses.
- Let photography breathe — 4:3 crops with 14–20px rounded corners, no overlaid text, no gradient scrims.
- Use Ink Black `#222222` for every text layer below Rausch — this is the system's near-black, never true `#000000`.
- Pair the tri-tab category picker's 3D illustrated icons with flat typography — don't mix illustration styles within a single surface.
- Stack three low-opacity shadows (~2%, 4%, 10%) to create the signature booking-panel elevation.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use Hairline Gray `#dddddd` 1px borders for every card-to-card and row-to-row divider.
- Treat the booking panel as sticky on desktop, collapsing to a bottom-anchored reserve bar on mobile.
- Use 4–8px spacing within metadata groups and 24px between cards — information density is intentional.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
