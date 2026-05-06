# SKILL — Wise

> When designing any artifact under the **Wise** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#0e0f0c` | Canvas / background |
| `--ink` | `#0e0f0c` | Primary text |
| `--slate` | `#868685` | Secondary / muted text |
| `--signal` | `#9fe870` | Accent / brand |
| `--bone` | `#e8ebe6` | Secondary surface |

## Typography
- **Display**: `Wise Sans`
- **Body**: `Wise Sans`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Wise Sans weight 900 for display — the extreme boldness IS the brand
- Apply line-height 0.85 on Wise Sans display — ultra-tight is intentional
- Use Lime Green (#9fe870) for primary CTAs with Dark Green (#163300) text
- Apply scale(1.05) hover and scale(0.95) active on buttons
- Enable "calt" on all text

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use Inter weight 600 as the body default
- Don't use light font weights for Wise Sans — only 900
- Don't relax the 0.85 line-height on display — the density is the identity

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
