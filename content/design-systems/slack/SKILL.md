# SKILL — Slack

> When designing any artifact under the **Slack** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#4a154b` | Canvas / background |
| `--ink` | `#1d1c1d` | Primary text |
| `--slate` | `#868686` | Secondary / muted text |
| `--signal` | `#611f69` | Accent / brand |
| `--bone` | `#f8f8f8` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use the aubergine sidebar as the primary brand moment -- it defines the workspace personality
- Keep the message pane white and unadorned -- messages are the content, not the chrome
- Use the four brand colors (blue, green, yellow, red) as small accents: dots, badges, pills -- never as backgrounds
- Set message text at 15px Lato weight 400 -- this is non-negotiable for the chat reading experience
- Use green (`#007a5a`) for primary affirmative actions and red (`#e01e5a`) for destructive ones

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Show hover-to-reveal interactions: message actions, timestamps, thread counts
- Maintain the three-column layout: rail + sidebar + content (+ optional thread panel)
- Use `#1264a3` for in-message links -- it is a distinct, accessible blue separate from brand blue

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
