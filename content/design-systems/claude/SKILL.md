# SKILL — Claude (Anthropic)

> When designing any artifact under the **Claude (Anthropic)** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f5f4ed` | Canvas / background |
| `--ink` | `#141413` | Primary text |
| `--slate` | `#5e5d59` | Secondary / muted text |
| `--signal` | `#c96442` | Accent / brand |
| `--bone` | `#faf9f5` | Secondary surface |

## Typography
- **Display**: `Anthropic Serif`
- **Body**: `Anthropic Serif`
- **Mono**: `Anthropic Mono`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Parchment (`#f5f4ed`) as the primary light background — the warm cream tone IS the Claude personality
- Use Anthropic Serif at weight 500 for all headlines — the single-weight consistency is intentional
- Use Terracotta Brand (`#c96442`) only for primary CTAs and the highest-signal brand moments
- Keep all neutrals warm-toned — every gray should have a yellow-brown undertone
- Use ring shadows (`0px 0px 0px 1px`) for interactive element states instead of drop shadows

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Maintain the editorial serif/sans hierarchy — serif for content headlines, sans for UI
- Use generous body line-height (1.60) for a literary reading experience
- Alternate between light and dark sections to create chapter-like page rhythm

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
