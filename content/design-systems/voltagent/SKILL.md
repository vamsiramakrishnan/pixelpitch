# SKILL — VoltAgent

> When designing any artifact under the **VoltAgent** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#10b981` | Canvas / background |
| `--ink` | `#f2f2f2` | Primary text |
| `--slate` | `#b8b3b0` | Secondary / muted text |
| `--signal` | `#00d992` | Accent / brand |
| `--bone` | `#10b981` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Abyss Black (`#050507`) as the landing page background and Carbon Surface (`#101010`) for all contained elements — the two-shade dark system is essential
- Reserve Emerald Signal Green (`#00d992`) exclusively for high-signal moments: active borders, glow effects, and the most important interactive accents
- Use VoltAgent Mint (`#2fd6a1`) for button text on dark surfaces — it's more readable than pure Signal Green
- Keep heading line-heights compressed (1.0–1.11) with negative letter-spacing for dense, authoritative text blocks
- Use the warm gray palette (`#3d3a39`, `#8b949e`, `#b8b3b0`) for borders and secondary text — warmth prevents the dark theme from feeling sterile

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Present code snippets as primary content — they're hero elements, not supporting illustrations
- Use border weight (1px → 2px → 3px) and color shifts (`#3d3a39` → `#00d992`) to communicate depth and importance, rather than relying on shadows
- Pair system-ui for headings with Inter for body text — the speed/authority of native fonts combined with the precision of a geometric sans

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
