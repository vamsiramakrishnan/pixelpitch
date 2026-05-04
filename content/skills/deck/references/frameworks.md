# Frameworks

The unified deck skill selects one base framework, then composes format, theme, layout, scenario, and craft on top.

| Framework | Best use | Assets to read | Assets to copy |
|---|---|---|---|
| `html-ppt` | Default for most decks, slidify export, many layouts, animations, presenter mode. | `content/skills/html-ppt/SKILL.md`, `references/layouts.md`, `references/themes.md`, `references/animations.md`, `references/full-decks.md`. | `assets/runtime.js` to `deck/framework.js`; `assets/base.css` to `deck/framework.css`; selected theme cues into `deck/theme.css`. |
| `simple-deck` | Tiny minimal decks, fast authoring, strict one-idea-per-slide pacing. | `content/skills/simple-deck/SKILL.md`, `references/layouts.md`, `references/checklist.md`. | Use its template only when the project needs a single-file seed; otherwise map layouts into fragments. |
| `replit-deck` | Board memo, finance, campaign, gallery, polished product memo decks. | `content/skills/replit-deck/SKILL.md`, `references/layouts.md`, `references/themes.md`, `references/components.md`. | Use theme and component ideas; keep unified `deck/framework.*` assets. |
| `guizang-ppt` | Magazine/editorial storytelling, Chinese-first decks, image-heavy essays. | `content/skills/guizang-ppt/SKILL.md`, `references/layouts.md`, `references/themes.md`, `references/components.md`, `references/checklist.md`. | Use editorial rhythm, image ratios, and component language; keep unified framework assets unless explicitly using its standalone template. |

## Overlay Modes

- Presenter mode: use when the user needs speaker notes, rehearsal, conference talk, or live delivery. Read `content/skills/html-ppt/references/presenter-mode.md`.
- XHS portrait: use format `3:4` when the user asks for 小红书, XHS, social carousel, mobile portrait cards, or 810x1080 output.
- Taste brutalist/editorial: read the matching `html-ppt-taste-*` skill body for prescriptive taste rules and anti-patterns.

## Selection Examples

| User intent | Framework | Format | Theme | Scenario |
|---|---|---|---|---|
| Series A infrastructure startup deck | `html-ppt` | 16:9 | `pitch-deck-vc.css` | pitch-deck |
| Engineering talk on sync daemon | `html-ppt` | 16:9 | `tokyo-night.css` | tech-sharing |
| Weekly business review | `html-ppt` or `replit-deck` | 16:9 | `corporate-clean.css` or `helix` | weekly-report |
| XHS educational carousel | `html-ppt` | 3:4 | `xiaohongshu-white.css` or `xhs-post` | social explainer |
| Architecture essay in Chinese | `guizang-ppt` or `html-ppt` | 16:9 | `knowledge-arch-blueprint` or Indigo Porcelain | editorial explainer |
