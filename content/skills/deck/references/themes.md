# Themes

Themes are visual style inputs. They are not copied into a separate `content/themes/` tree. Read them in place and materialize project-local choices into `deck/theme.css`.

## html-ppt CSS Themes

| Theme | Mood / best use | Caution |
|---|---|---|
| `academic-paper.css` | Scholarly research and citation-friendly decks. | Avoid tiny paper-like text. |
| `arctic-cool.css` | Airy pale blue technical explainers. | Maintain contrast on pale surfaces. |
| `aurora.css` | Luminous high-tech narratives. | Mark intentional bleed on glows. |
| `bauhaus.css` | Geometric product principles or design history. | Keep primary colors disciplined. |
| `blueprint.css` | Engineering plans and architecture walkthroughs. | Do not let grid texture reduce readability. |
| `catppuccin-latte.css` | Friendly light developer decks. | Avoid soft contrast on charts. |
| `catppuccin-mocha.css` | Friendly dark developer decks. | Watch small muted text. |
| `corporate-clean.css` | Exec reviews and operating plans. | Prevent generic office-template tone. |
| `cyberpunk-neon.css` | Security, AI systems, high-energy launches. | Cap neon accent usage. |
| `dracula.css` | Dark code/editor talks. | Use accessible syntax colors. |
| `editorial-serif.css` | Premium essays and thought leadership. | Do not overuse long paragraphs. |
| `engineering-whiteprint.css` | Crisp white technical diagrams. | Keep diagram labels readable. |
| `glassmorphism.css` | AI/product interface concepts. | Rasterize or hybrid-hint blur zones. |
| `gruvbox-dark.css` | Warm terminal/developer vibe. | Avoid muddy chart colors. |
| `japanese-minimal.css` | Quiet precise presentation. | Needs strong content specificity. |
| `magazine-bold.css` | Image-led stories and bold opinion. | Use real visuals, not stock-like filler. |
| `memphis-pop.css` | Playful consumer or education decks. | Keep shapes subordinate to message. |
| `midcentury.css` | Warm retro-modern product/culture decks. | Avoid brown/orange domination. |
| `minimal-white.css` | Clean broad business default. | Needs strong hierarchy to avoid blandness. |
| `neo-brutalism.css` | Loud opinionated technical decks. | Must still meet contrast and fit. |
| `news-broadcast.css` | Urgent briefings and incidents. | Preserve severity semantics. |
| `nord.css` | Calm dark technical decks. | Avoid one-note blue-gray monotony. |
| `pitch-deck-vc.css` | Fundraising, market, traction, ask. | No invented traction or TAM. |
| `rainbow-gradient.css` | Creative launch moments. | Gradients need functional purpose. |
| `retro-tv.css` | Nostalgic media/culture decks. | Mark raster zones for effects. |
| `rose-pine.css` | Soft dark indie/developer storytelling. | Check muted contrast. |
| `sharp-mono.css` | Audits, systems, CLI, infrastructure. | Avoid all-mono fatigue. |
| `soft-pastel.css` | Lifestyle, learning, wellness. | Contrast is the main risk. |
| `solarized-light.css` | Code/documentation decks. | Keep low-glare, not washed out. |
| `sunset-warm.css` | Warm persuasive narratives. | Avoid beige/tan dominance. |
| `swiss-grid.css` | Typographic institutional clarity. | Requires disciplined alignment. |
| `terminal-green.css` | CLI, security, operational logs. | Do not make every slide terminal chrome. |
| `tokyo-night.css` | Sleek dark developer/AI decks. | Watch purple-blue overuse. |
| `vaporwave.css` | Retro-futurist expressive launches. | Keep effect count low. |
| `xiaohongshu-white.css` | White editorial social carousel. | Portrait text must be large. |
| `y2k-chrome.css` | Metallic fashion-tech campaigns. | Mark complex effects for raster. |

## Full-Deck Templates

Use these as scoped visual systems when the scenario matches: `course-module`, `dir-key-nav-minimal`, `graphify-dark-graph`, `hermes-cyber-terminal`, `knowledge-arch-blueprint`, `obsidian-claude-gradient`, `pitch-deck`, `presenter-mode-reveal`, `product-launch`, `tech-sharing`, `testing-safety-alert`, `weekly-report`, `xhs-pastel-card`, `xhs-post`, `xhs-white-editorial`.

Read their `content/skills/html-ppt-*/SKILL.md` wrappers for natural-language taste, scenario, and anti-patterns. Keep full-deck CSS scoped if borrowing directly; otherwise extract layout intent and token rhythm into `deck/theme.css`.

## Replit Themes

Use `helix`, `holm`, `vance`, `bevel`, `world-dark`, `world-mint`, `atlas`, and `bluehouse` from `content/skills/replit-deck/references/themes.md` for board memo, finance, gallery, consumer card, and polished memo decks.

## Guizang Themes

Use Monocle default, Indigo Porcelain, Forest Ink, Kraft Paper, and Dune from `content/skills/guizang-ppt/references/themes.md` for magazine/editorial decks, Chinese-first essays, and strong section rhythm.

## Composition Rules

- Design system equals brand identity.
- Theme equals presentation style.
- Scenario equals narrative structure.
- Format equals output geometry.
- Any design system can compose with any theme if contrast, typography, evidence, and rhythm gates pass.
