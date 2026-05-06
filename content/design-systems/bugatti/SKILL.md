# SKILL — Bugatti

> When designing any artifact under the **Bugatti** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#000000` | Canvas / background |
| `--ink` | `#111111` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#ffffff` | Accent / brand |
| `--bone` | `#f5f5f5` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- **Do** keep the entire canvas `#000000`. No off-black, no near-black, no warm black. Bugatti is pure black.
- **Do** use Bugatti Display at architectural scale — minimum 36px, ideally 60px+, and once per page land a monumental 200px+ headline.
- **Do** use Bugatti Monospace UPPERCASE with 1.2–1.4px tracking for every button, link, nav item, and caption.
- **Do** use only white text at rest. `#999999` is only for disabled, tertiary, and thin borders.
- **Do** use 9999px border radius for primary buttons — full pill, thin 1px white outline, transparent fill.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- **Do** use full-bleed video and photography for every hero section. The product is the UI.
- **Do** maintain line-height 1.00–1.11 on display headlines. Tight leading is the architecture.
- **Do** treat whitespace like cinematic negative space — give every block its own silent room.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
