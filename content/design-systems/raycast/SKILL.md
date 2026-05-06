# SKILL — Raycast

> When designing any artifact under the **Raycast** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#07080a` | Canvas / background |
| `--ink` | `#18191a` | Primary text |
| `--slate` | `#cecece` | Secondary / muted text |
| `--signal` | `#ff6363` | Accent / brand |
| `--bone` | `#1b1c1e` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `GeistMono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#07080a` (not pure black) as the background — the blue-cold tint is essential to the Raycast feel
- Apply positive letter-spacing (+0.2px) on body text — this is deliberately different from most dark UIs
- Use multi-layer shadows with inset highlights for interactive elements — the macOS-native depth is signature
- Keep Raycast Red (`#FF6363`) as punctuation, not pervasive — reserve it for hero moments and error states
- Use `rgba(255, 255, 255, 0.06)` borders for card containment — barely visible, structurally essential

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Apply weight 500 as the body text baseline — medium weight improves dark-mode legibility
- Use pill shapes (86px+ radius) for primary CTAs, rectangular shapes (6px–8px) for secondary actions
- Enable OpenType features `calt`, `kern`, `liga`, `ss03` on all Inter text

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
