# SKILL — PostHog

> When designing any artifact under the **PostHog** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#fdfdf8` | Canvas / background |
| `--ink` | `#4d4f46` | Primary text |
| `--slate` | `#65675e` | Secondary / muted text |
| `--signal` | `#f54e00` | Accent / brand |
| `--bone` | `#eeefe9` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use the olive/sage color family (#4d4f46, #23251d, #bfc1b7) for text and borders — the warm green undertone is essential to the brand
- Flash PostHog Orange (#F54E00) on hover states — it's the hidden brand signature
- Use IBM Plex Sans at bold weights (700/800) for headings — the font carries technical credibility
- Keep body text at generous line-heights (1.50–1.71) — the content-heavy site demands readability
- Maintain the warm parchment background (#fdfdf8) — not pure white, never cold

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Use 4px border-radius for most UI elements — keep corners subtle and functional
- Include playful, hand-drawn illustration elements — the personality is the differentiator
- Apply opacity-based hover states (0.7 opacity) on dark buttons rather than color shifts

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
