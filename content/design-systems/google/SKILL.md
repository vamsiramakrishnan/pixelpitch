# SKILL — Google (Material You)

> When designing any artifact under the **Google (Material You)** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#fef7ff` | Canvas / background |
| `--ink` | `#1c1b1f` | Primary text |
| `--slate` | `#49454f` | Secondary / muted text |
| `--signal` | `#ea4335` | Accent / brand |
| `--bone` | `#cac4d0` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Seed the entire palette from a single source color and let tonal mapping generate harmonized variants.
- Use tonal surface fills (`Surface Container` variants) to group content instead of adding borders everywhere.
- Apply full-radius pill shapes to buttons, chips, search bars, and navigation indicators for the signature M3 feel.
- Keep display and headline typography at regular weight (400); let size and color carry hierarchy.
- Use the 3-tier navigation model: bar (compact), rail (medium), drawer (expanded) adapting to window size.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Pair primary with primary-container, secondary with secondary-container for layered emphasis without clashing.
- Apply state layers (hover, press, focus) as semi-transparent overlays of the content color, not separate hardcoded colors.
- Reserve the tertiary palette for high-attention moments like badges, callouts, and expressive accents.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
