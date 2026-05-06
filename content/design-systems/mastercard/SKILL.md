# SKILL — Mastercard

> When designing any artifact under the **Mastercard** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#f3f0ee` | Canvas / background |
| `--ink` | `#141413` | Primary text |
| `--slate` | `#696969` | Secondary / muted text |
| `--signal` | `#555555` | Accent / brand |
| `--bone` | `#f4f4f4` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use Canvas Cream (`#F3F0EE`) as the default body background — never pure white
- Mask service/feature imagery as perfect circles, not rectangles or rounded rectangles
- Attach a white satellite CTA to the bottom-right of each circular portrait
- Set headlines in MarkForMC weight 500 with -2% letter-spacing
- Use weight 450 (not 400) for body paragraphs

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Keep primary CTAs as Ink Black pills (20px radius) with cream text
- Use Signal Orange only on consent, legal, or compliance actions
- Float the nav as a rounded white pill below the viewport top, not flush at y=0

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
