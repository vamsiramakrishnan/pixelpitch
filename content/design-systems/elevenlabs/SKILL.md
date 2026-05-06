# SKILL — ElevenLabs

> When designing any artifact under the **ElevenLabs** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#000000` | Primary text |
| `--slate` | `#4e4e4e` | Secondary / muted text |
| `--signal` | `#4e4e4e` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `Waldenburg`
- **Body**: `Waldenburg`
- **Mono**: `Geist Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Waldenburg weight 300 for all display headings — the lightness IS the brand
- Apply multi-layer shadows (inset + outline + elevation) at sub-0.1 opacity
- Use warm stone tints (`#f5f2ef`, `rgba(245,242,239,0.8)`) for featured elements
- Apply positive letter-spacing (+0.14px to +0.18px) on Inter body text
- Use 9999px radius for primary buttons — pill shape is standard

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use warm-tinted shadows (`rgba(78,50,23,0.04)`) on featured CTAs
- Keep the page predominantly white with subtle gray section differentiation
- Use WaldenburgFH bold uppercase ONLY for specific CTA button labels

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
