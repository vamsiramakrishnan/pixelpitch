# SKILL — Sanity

> When designing any artifact under the **Sanity** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#55beff` | Canvas / background |
| `--ink` | `#0052ef` | Primary text |
| `--slate` | `#b9b9b9` | Secondary / muted text |
| `--signal` | `#f36458` | Accent / brand |
| `--bone` | `#212121` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use the achromatic gray scale as the foundation -- maintain pure neutral discipline with no warm/cool tinting
- Apply Electric Blue (`#0052ef`) consistently as the universal hover/active state across all interactive elements
- Use extreme negative letter-spacing (-2px to -4.48px) on display headings 48px and above
- Keep primary CTAs as full-pill shapes (99999px radius) with the coral-red (`#f36458`)
- Use IBM Plex Mono uppercase for technical labels, tags, and system metadata

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Communicate depth through surface color (dark-to-light) rather than shadows
- Maintain generous vertical section spacing (64-120px) on the dark canvas
- Use `"cv01", "cv11", "cv12", "cv13", "ss07"` OpenType features for display typography

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
