# SKILL — Shopify

> When designing any artifact under the **Shopify** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#000000` | Canvas / background |
| `--ink` | `#ffffff` | Primary text |
| `--slate` | `#a1a1aa` | Secondary / muted text |
| `--signal` | `#36f4a4` | Accent / brand |
| `--bone` | `#02090a` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use the dark teal-black surface hierarchy (Void → Deep Teal → Dark Forest → Forest) for depth
- Keep display typography at weight 330-400 — the ethereal lightness is the design's signature
- Use Neon Green (`#36F4A4`) exclusively for focus states and critical accent highlights
- Apply 9999px radius to all primary CTA buttons — the full pill is non-negotiable
- Use the multi-layered shadow system for card elevation — single shadows look flat

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain the `ss03` OpenType feature across all text — it's part of the typographic identity
- Use Inter Variable for body text and NeueHaasGrotesk for headings — never mix their roles
- Create theatrical spacing between sections (80px+) for cinematic pacing

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
