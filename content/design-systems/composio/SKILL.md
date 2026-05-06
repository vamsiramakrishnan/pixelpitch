# SKILL — Composio

> When designing any artifact under the **Composio** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#0f0f0f` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#00ffff` | Accent / brand |
| `--bone` | `#000000` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `JetBrains Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Void Black (`#0f0f0f`) as the primary page background — never pure white for main surfaces
- Keep heading line-heights ultra-tight (0.87-1.0) for compressed, authoritative text blocks
- Use white-opacity borders (4-12%) for containment — they're more important than shadows here
- Reserve Electric Cyan (`#00ffff`) for high-signal moments only — CTAs, glows, interactive accents
- Pair abcDiatype with JetBrains Mono to reinforce the developer-tool identity

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the hard-offset shadow (`4px 4px`) intentionally on select elements for brutalist personality
- Keep button text dark (`oklch(0.145 0 0)`) even on the darkest backgrounds — buttons carry their own surface
- Layer opacity-based borders to create subtle depth without shadows

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
