# SKILL — HashiCorp

> When designing any artifact under the **HashiCorp** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#15181e` | Canvas / background |
| `--ink` | `#efeff1` | Primary text |
| `--slate` | `#3b3d45` | Secondary / muted text |
| `--signal` | `#b2b6bd` | Accent / brand |
| `--bone` | `#f1f2f3` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use HashiCorp Sans for headings and brand text, system-ui for body and UI text
- Enable `"kern"` on all HashiCorp Sans text
- Use product brand colors ONLY for their respective products (Terraform = purple, Vault = yellow, etc.)
- Apply uppercase labels at 13px weight 600 with 1.3px letter-spacing for section markers
- Keep shadows at the "whisper" level (0.05 opacity dual-layer)

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use the `--mds-color-*` token system for consistent color application
- Maintain the tight-heading / relaxed-body rhythm (1.17–1.21 vs 1.50–1.69 line-heights)
- Use `3px solid` focus outlines for accessibility

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
