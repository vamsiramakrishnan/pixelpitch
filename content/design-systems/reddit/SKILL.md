# SKILL — Reddit

> When designing any artifact under the **Reddit** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#dae0e6` | Canvas / background |
| `--ink` | `#7193ff` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#7193ff` | Accent / brand |
| `--bone` | `#1a1a1b` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use OrangeRed (`#FF4500`) for upvotes and primary CTAs — it is the singular brand moment
- Use Periwinkle (`#7193FF`) only for downvote active states — the orange/blue polarity is sacred
- Apply full-pill radius (9999px) to all buttons, chips, flairs, and search inputs
- Keep post cards on white with 1px `#EDEFF1` borders — clean, discrete units
- Use the `#DAE0E6` canvas behind cards for natural depth separation

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Show comment threading depth via left-edge vertical lines with 16px indent per level
- Abbreviate large numbers (1.2k, 45.3k) for karma and vote counts
- Allow community-level color customization for flairs and banners

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
