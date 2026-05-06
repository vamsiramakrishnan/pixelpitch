# SKILL — Twitch

> When designing any artifact under the **Twitch** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#0e0e10` | Canvas / background |
| `--ink` | `#dedee3` | Primary text |
| `--slate` | `#666666` | Secondary / muted text |
| `--signal` | `#e005b9` | Accent / brand |
| `--bone` | `#efeff1` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `ui-monospace, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- **Do** use the three-step dark surface system (`#0e0e10` / `#18181b` / `#1f1f23`) to establish depth through color, not shadow.
- **Do** reserve Twitch Purple `#9146ff` for interactive elements and brand moments -- buttons, links, badges, event indicators.
- **Do** keep the stream player at 0px border-radius -- it fills its container edge-to-edge to maximize viewing area.
- **Do** use Inter for all product UI and chat. Roobert is reserved for display headlines and marketing.
- **Do** support real-time state indicators -- live dots, viewer counts, hype trains, predictions. The platform is defined by liveness.

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- **Do** design chat as a first-class layout element with its own scroll, input, and emote system -- never an afterthought sidebar.
- **Do** use the username color system in chat -- the 15 default colors plus custom subscriber colors are part of the identity.
- **Do** keep component density high in stream view but generous in browse/directory view. Two modes, two spatial contracts.

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
