# SKILL — Resend

> When designing any artifact under the **Resend** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#000000` | Canvas / background |
| `--ink` | `#f0f0f0` | Primary text |
| `--slate` | `#a1a4a5` | Secondary / muted text |
| `--signal` | `#ff801f` | Accent / brand |
| `--bone` | `#ff5900` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `commitMono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use pure black (`#000000`) as the page background — the void is the canvas
- Apply frost borders (`rgba(214, 235, 253, 0.19)`) for all structural lines — they're the blue-tinted signature
- Use Domaine Display ONLY for hero headings (96px), ABC Favorit for section headings, Inter for everything else
- Enable OpenType `"ss01"`, `"ss04"`, `"ss11"` on Domaine and ABC Favorit text
- Apply pill radius (9999px) to primary CTAs and tags

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the multi-color accent scale (orange/green/blue/yellow/red) with opacity variants for context-specific highlighting
- Keep shadows at ring level (`0px 0px 0px 1px`) — on black, traditional shadows don't work
- Use +0.35px letter-spacing on ABC Favorit nav links — the only positive tracking

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
