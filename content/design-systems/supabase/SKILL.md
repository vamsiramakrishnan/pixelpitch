# SKILL — Supabase

> When designing any artifact under the **Supabase** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#171717` | Canvas / background |
| `--ink` | `#fafafa` | Primary text |
| `--slate` | `#898989` | Secondary / muted text |
| `--signal` | `#3ecf8e` | Accent / brand |
| `--bone` | `#efefef` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `Source Code Pro`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use near-black backgrounds (`#0f0f0f`, `#171717`) — depth comes from the gray border hierarchy
- Apply Supabase green (`#3ecf8e`, `#00c573`) sparingly — it's an identity marker, not a decoration
- Use Circular at weight 400 for nearly everything — 500 only for buttons and nav
- Set hero text to 1.00 line-height — the zero-leading is the typographic signature
- Create depth through border color differences (`#242424` → `#2e2e2e` → `#363636`)

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use pill shape (9999px) exclusively for primary CTAs and tabs
- Employ HSL-based colors with alpha for translucent layering effects
- Use Source Code Pro uppercase labels for developer-context markers

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
