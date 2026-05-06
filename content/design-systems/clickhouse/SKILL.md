# SKILL — ClickHouse

> When designing any artifact under the **ClickHouse** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#000000` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#a0a0a0` | Secondary / muted text |
| `--signal` | `#faff69` | Accent / brand |
| `--bone` | `#161600` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `Inconsolata`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Neon Volt (#faff69) as the sole chromatic accent — it must pop against pure black
- Use Inter at weight 900 for hero display text — the extreme weight IS the personality
- Keep everything on pure black (#000000) — never use dark gray as the page background
- Use charcoal borders (rgba(65,65,65,0.8)) for all card containment
- Apply Forest Green (#166534) for primary CTA buttons — distinct from neon for action hierarchy

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Show performance stats as oversized display numbers — it's the core visual argument
- Use uppercase with wide letter-spacing (1.4px) for section labels
- Apply Pale Yellow (#f4f692) for active/pressed text states

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
