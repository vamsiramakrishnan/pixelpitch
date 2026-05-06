# SKILL — Ferrari

> When designing any artifact under the **Ferrari** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#181818` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#da291c` | Accent / brand |
| `--bone` | `#d2d2d2` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Ferrari Red (`#DA291C`) sparingly — only for primary CTAs and brand-critical moments. Its power comes from restraint
- Alternate between black cinematic sections and white editorial sections to create the signature chiaroscuro rhythm
- Use FerrariSans at weight 500 as the default heading voice — it's the typographic equivalent of the engine note
- Apply Body-Font in uppercase with 1px letter-spacing for all labels, category tags, and structural annotations
- Keep border-radius at 2px for all interactive elements — razor precision, not rounded friendliness

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Let photography carry the emotional weight — every image should be art-directed studio quality
- Use the Prancing Horse emblem as a standalone hero element on black — never crowd it with adjacent content
- Maintain the 12px/10px button padding ratio — compact, purposeful, no excess

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
