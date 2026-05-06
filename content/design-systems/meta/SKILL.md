# SKILL — Meta (Store)

> When designing any artifact under the **Meta (Store)** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#0064e0` | Canvas / background |
| `--ink` | `#050505` | Primary text |
| `--slate` | `#5d6c7b` | Secondary / muted text |
| `--signal` | `#1877f2` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use pill-shaped (100px radius) buttons for all primary and secondary CTAs
- Let product photography dominate — make images the visual hero of every section
- Alternate between light and dark surface sections to create visual rhythm
- Use Optimistic VF with ss01 and ss02 features for all display text
- Keep body copy brief and scannable — this is retail, not editorial

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the dual-shadow pattern (ambient + direct) when elevation is needed
- Apply Meta Blue (`#0064E0`) exclusively for actionable elements
- Use generous whitespace (64-80px section padding) to convey premium feel

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
