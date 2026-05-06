# SKILL — Atlassian

> When designing any artifact under the **Atlassian** brand, load this manifest and follow it as binding.

## Palette (5 core tokens)
| Token | Hex | Role |
|-------|-----|------|
| `--paper` | `#deebff` | Canvas / background |
| `--ink` | `#0052cc` | Primary text |
| `--slate` | `#7a869a` | Secondary / muted text |
| `--signal` | `#6554c0` | Accent / brand |
| `--bone` | `#ffffff` | Secondary surface |

## Typography
- **Display**: `system-ui, sans-serif`
- **Body**: `system-ui, sans-serif`
- **Mono**: `"SFMono-Medium", "SF Mono", "Segoe UI Mono", "Roboto Mono", "Ubuntu Mono", Menlo, Consolas, Courier, monospace`

## Always
- Import `colors_and_type.css`. Use CSS custom properties, not hardcoded values.
- Use the five-token palette only: `--paper`, `--ink`, `--slate`, `--signal`, `--bone`.
- Use `#0052cc` (B500) exclusively for interactive elements -- buttons, links, active states, focus rings
- Apply status lozenges for every workflow state: they are the canonical way to show progress
- Use the `rgba(9, 30, 66, ...)` shadow color for all elevation -- never generic black
- Keep body text at 14px and headings at weight 600 -- the system's density depends on this
- Use `#172b4d` (N800) for headings and `#42526e` (N500) for body text -- never pure black

## Never
- Never use colors outside the token palette in chrome.
- Never mix typeface roles.
- Reserve 3px border-radius for nearly everything -- it is the ADS signature radius
- Employ avatar groups with white ring borders and overlap stacking for team contexts
- Support inline editing -- read-mode text that becomes editable on click is an Atlassian pattern

## Audit
1. Colors — only palette tokens in chrome.
2. Typography — correct faces in correct roles.
3. Radii — within the defined scale.
4. Shadows — only per depth system.
