# SKILL — Dropbox

> When designing any artifact under the **Dropbox** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#0061ff` | Primary text |
| `--slate` | `#8c8c8c` | Secondary / muted text |
| `--signal` | `#ff7e6b` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `Sharp Grotesk`
- **Body**: `Sharp Grotesk`
- **Mono**: `SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#0061ff` (Dropbox Blue) as the single brand accent -- all interactive elements derive from this one color
- Pair Sharp Grotesk headlines with Inter body text -- the two-font system is the typographic identity
- Allocate generous whitespace around all elements -- space communicates trust and clarity
- Use `#f7f5f2` warm off-white for secondary surfaces instead of pure gray
- Keep border-radius at 8px for standard elements -- consistent, rounded but not playful

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Show file-type icons at appropriate sizes (32px in lists, 48px+ in grids, 64px+ in detail views)
- Use illustrations for empty states, onboarding, and feature marketing -- they are a core brand element
- Apply the warm near-black (`#1e1919`) for headings instead of pure `#000000`

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
