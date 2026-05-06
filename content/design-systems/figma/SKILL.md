# SKILL — Figma

> When designing any artifact under the **Figma** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#3b82f6` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use figmaSans with precise variable weights (320–540) — the granular weight control IS the design
- Keep the interface strictly black-and-white — color comes from product content only
- Use pill (50px) and circular (50%) geometry for all interactive elements
- Apply dashed 2px focus outlines — the signature accessibility pattern
- Enable `"kern"` feature on all text

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use figmaMono in uppercase with positive letter-spacing for labels
- Apply negative letter-spacing throughout (-0.1px to -1.72px)
- Don't add interface colors — the monochrome palette is absolute

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
