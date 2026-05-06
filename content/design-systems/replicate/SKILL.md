# SKILL — Replicate

> When designing any artifact under the **Replicate** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#2b9a66` | Canvas / background |
| `--ink` | `#202020` | Primary text |
| `--slate` | `#646464` | Secondary / muted text |
| `--signal` | `#ea2804` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `rb-freigeist-neue`
- **Body**: `rb-freigeist-neue`
- **Mono**: `jetbrains-mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use pill-shaped (9999px) radius on EVERYTHING — buttons, images, badges, containers
- Use rb-freigeist-neue at weight 700 for display text — go big (72px+) or go home
- Use the orange-red brand gradient for hero sections
- Use Replicate Dark (#202020) as the primary dark — not pure black
- Apply dotted underline decoration on text links (#bbbbbb)

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use Status Green (#2b9a66) for operational/success badges
- Keep body text in basier-square at 400–600 weight
- Use JetBrains Mono for all code content

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
