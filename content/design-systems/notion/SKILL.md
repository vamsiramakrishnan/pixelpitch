# SKILL — Notion

> When designing any artifact under the **Notion** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#ffffff` | Canvas / background |
| `--ink` | `#0075de` | Primary text |
| `--slate` | `#615d59` | Secondary / muted text |
| `--signal` | `#0075de` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Buttons use comfortable padding (8px-16px vertical)
- Navigation links at 15px with adequate spacing
- Pill badges have 8px horizontal padding for tap targets
- Mobile menu toggle uses standard hamburger button
- Hero: 64px display -> scales to 40px -> 26px on mobile, maintains proportional letter-spacing

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Navigation: horizontal links + blue CTA -> hamburger menu
- Feature cards: 3-column -> 2-column -> single column stacked
- Product screenshots: maintain aspect ratio with responsive images

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
