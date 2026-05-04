# Craft Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Create the deck-specific craft synthesis that composes existing craft rules into a coherent authoring contract for narrative decks.
**Architecture:** `content/craft/deck-authoring.md` does not replace `anti-ai-slop`, `color`, `typography`, or `slidify-compat`; it interprets them for slide fragments, deck rhythm, evidence gates, and export repair. The unified deck skill opts into all five craft bodies so general rules remain available and deck-specific precedence resolves collisions.
**Tech Stack:** Markdown craft reference, Pixelpitch craft frontmatter consumption, CSS token guidance, slidify HTML annotation guidance.
---

## Task 1: Create `content/craft/deck-authoring.md`

- [ ] Create only `content/craft/deck-authoring.md`.
- [ ] Do not edit `content/craft/README.md`, `content/craft/anti-ai-slop.md`, `content/craft/color.md`, `content/craft/typography.md`, or `content/craft/slidify-compat.md`.
- [ ] Verification command:

```bash
test -f content/craft/deck-authoring.md
```

## Task 2: Write Header and Scope

- [ ] Write this opening content to `content/craft/deck-authoring.md`:

```markdown
# Deck Authoring Craft

This file applies to narrative decks, web previews, slide fragments, theme CSS, and slidify export repair. It composes the reusable craft rules in:

- `content/craft/anti-ai-slop.md`
- `content/craft/color.md`
- `content/craft/typography.md`
- `content/craft/slidify-compat.md`

It does not duplicate those references. It defines how they apply when the artifact is a deck with `deck/deck-plan.json`, `deck/theme.css`, stable framework assets, and focused `deck/slides/*.html` fragments.

Deck craft has one operating rule: a slide is not ready because it looks full; it is ready when the claim, evidence, visual hierarchy, and export hints all support the same narrative beat.
```

- [ ] Verification command:

```bash
rg -n "# Deck Authoring Craft|anti-ai-slop|slide is not ready" content/craft/deck-authoring.md
```

## Task 3: Write Precedence Rules

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Precedence

Apply rules in this order when they conflict:

1. User-approved facts and source material.
2. Accessibility: readable contrast, legible type, and no clipped content.
3. Design system tokens from the selected DESIGN.md.
4. Anti-ai-slop specificity: concrete claims, no filler, no invented metrics.
5. Typography hierarchy and slide density.
6. Color discipline and semantic color meaning.
7. Theme rhythm and selected framework conventions.
8. Slidify annotations and export editability hints.

Interpretation:

- User-approved facts win over visual neatness. If the table is too dense, split the slide; do not summarize away material facts without permission.
- Accessibility can adjust token pairings from a design system. Keep the brand palette, but choose readable foreground/background combinations.
- Anti-ai-slop can block a slide that is visually complete but factually vague.
- Typography can split a slide even when the narrative beat is correct.
- Slidify compatibility adds hints and repair structure; it does not force plain visuals or ban modern CSS.
```

- [ ] Verification command:

```bash
rg -n "## Precedence|User-approved facts|Slidify compatibility adds hints" content/craft/deck-authoring.md
```

## Task 4: Write Conflict Resolution Examples

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Conflict Resolution

| Situation | Resolution |
|---|---|
| A branded DESIGN.md uses pale text on pale cards. | `color` and accessibility win. Keep the palette, but pair darker foreground tokens with pale surfaces or move pale colors to decorative fills. |
| A slide has room for "Improve productivity" as a headline. | `anti-ai-slop` blocks it. Ask who improved, by how much, over what timeframe, and according to what evidence. |
| A slide uses gradient text and `mix-blend-mode`, but slidify may rasterize it. | `slidify-compat` adds `data-pptx-role`, `data-atom`, or `data-pptx-rasterize` hints. Do not remove the effect unless the user prioritizes editability. |
| A source table is accurate but unreadable at 1920x1080. | `typography` and slide density split it into a takeaway slide plus a table slide, or summarize only with user approval. |
| A pitch deck theme wants big optimistic metrics, but no real traction numbers were provided. | `anti-ai-slop` wins. Mark the slide `needs-data` and ask for numbers, or change the slide to qualitative proof with clear caveats. |
| A warning slide's brand palette makes danger states look decorative. | Semantic color wins. Preserve warning/error meaning even if the accent palette is restrained elsewhere. |
| Three consecutive slides use the same dark card grid because the framework template does. | Theme rhythm wins. Insert a divider, hero metric, image proof, or white/quiet slide unless monotone pacing is intentional. |
```

- [ ] Verification command:

```bash
rg -n "## Conflict Resolution|Improve productivity|needs-data|Theme rhythm wins" content/craft/deck-authoring.md
```

## Task 5: Write Narrative Specificity Section

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Narrative Specificity

Every slide must advance one narrative beat from `deck/deck-plan.json`.

Ready beats have:

- A concrete actor: person, team, customer, market, system, or decision-maker.
- A concrete claim: what changed, what is blocked, what is proposed, or what must be decided.
- A concrete evidence plan: stat, chart, diagram, quote, screenshot, table, artifact, or explicitly marked `none`.
- A presenter purpose: what the speaker should say and why this slide exists.

Reject these patterns:

- "Show traction" without metrics.
- "Explain architecture" without named systems and relationships.
- "Talk about customers" without a customer name, quote, segment, or behavior.
- "Discuss risks" without severity, owner, or mitigation.
- "Make an ask slide" without a decision, owner, date, and consequence.

Accept these patterns:

- "Show 42 paying teams, $18.6K MRR, and 31% month-over-month growth from February-April 2026."
- "Explain how the daemon watches `deck-plan.json`, stitches slide fragments, then runs slidify only during export."
- "Use the Northwind Studios quote about first-month payback and show the $1,800 to $200 bandwidth drop."
- "List launch blockers: font licensing, PPTX rasterization on blend effects, and missing export retry telemetry."
- "Ask today for two engineers for six weeks to build deck assembly and export repair."

If the user cannot provide evidence, keep the slide honest: change the status to `needs-data` or `needs-evidence`, or reframe the slide as a hypothesis with an explicit caveat.
```

- [ ] Verification command:

```bash
rg -n "## Narrative Specificity|Ready beats|Reject these patterns|needs-evidence" content/craft/deck-authoring.md
```

## Task 6: Write Slide Density Section

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Slide Density

One slide gets one job. If a slide tries to introduce the problem, prove the metric, explain the architecture, and ask for approval, split it.

Budgets:

- Hero/cover: 1 headline, 1 support line, optional metadata.
- Problem/solution: 1 headline, 2-4 support points, 1 visual or evidence cluster.
- Data slide: 1 takeaway headline, 1 chart/table/stat system, 1 caveat/source line.
- Diagram slide: 1 claim, 4-8 labeled nodes, clear directionality, no decorative unlabeled boxes.
- Quote slide: 1 exact quote, 1 attribution, optional image or context note.
- Roadmap/timeline: 3-5 phases or milestones; split above 5.
- KPI grid: 3-6 metrics; split above 6.
- Table: 3-6 rows and 3-5 columns for presentation view; move dense tables to appendix or split.
- CTA/ask: 1 requested decision, 1 owner, 1 deadline, 1 consequence or next step.

Text fit:

- Body text should usually stay at 24px or larger in a 1920x1080 deck.
- Captions and source lines can be smaller, but must remain readable in preview and export.
- Avoid paragraphs longer than 2 lines on slides; put presenter elaboration in speaker notes.
```

- [ ] Verification command:

```bash
rg -n "## Slide Density|Budgets|KPI grid|Text fit" content/craft/deck-authoring.md
```

## Task 7: Write Theme Rhythm Section

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Theme Rhythm

Decks need pacing, not a repeated card template.

Rules:

- Avoid 3 or more consecutive slides with the same surface, density, and layout family unless the user explicitly wants monotone repetition.
- Alternate dense evidence slides with breath slides: section divider, hero metric, quote, image proof, or simple claim.
- Reserve hero slides for openings, act pivots, major results, and final asks.
- Keep recurring chrome consistent: slide numbers, footers, notes, and source lines should not jump around.
- Use images only when they reveal the product, artifact, place, person, state, or evidence. Atmospheric filler weakens the story.
- For editorial or Guizang-style decks, use act dividers and image rhythm deliberately; do not turn every slide into a magazine cover.
- For minimal/simple decks, rhythm comes from sequencing and typography, not from adding decoration.

Reference patterns:

- `content/skills/simple-deck/references/checklist.md` for minimal one-idea pacing.
- `content/skills/guizang-ppt/references/checklist.md` for editorial rhythm and image-heavy proof.
- `content/skills/html-ppt/references/full-decks.md` for scenario template pacing.
```

- [ ] Verification command:

```bash
rg -n "## Theme Rhythm|Avoid 3 or more|Reference patterns" content/craft/deck-authoring.md
```

## Task 8: Write Typography Section

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Typography

Use `content/craft/typography.md` as the base rulebook. Deck-specific interpretation:

- Display headline: 72-160px when it is the main object of the slide.
- Slide title: 44-72px for standard 16:9 slides.
- Section label/eyebrow: 14-18px with all-caps tracking from `0.06em` to `0.1em`.
- Body/support: usually 24-34px for presentation readability.
- Caption/source: 14-18px only when visually secondary and still readable.
- Hero metric: 96-220px depending on layout; include unit, timeframe, and source nearby.
- Code/terminal: use `--deck-font-mono`, preserve indentation, and avoid screenshots when editable text is sufficient.

Rules:

- Use `--deck-font-display` for display and title roles.
- Use `--deck-font-body` for body, captions, notes-adjacent visible text, and labels.
- Use no more than 3 weights on a slide.
- Avoid all-caps paragraphs.
- Avoid justified text.
- Keep body line length around 35-60 characters on slides, shorter than long-form web pages.
```

- [ ] Verification command:

```bash
rg -n "## Typography|Display headline|Hero metric|--deck-font-display" content/craft/deck-authoring.md
```

## Task 9: Write Color Section

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Color

Use `content/craft/color.md` as the base rulebook. Deck-specific interpretation:

- Bind theme colors through `deck/theme.css` tokens, not hardcoded slide-local hex values.
- Neutrals should carry most of the deck; accent color should identify hierarchy, not decorate every element.
- Preserve semantic colors for status, risk, warning, success, and negative/positive deltas.
- Data series colors must be distinguishable and explained by labels, not color alone.
- Dark decks need semi-transparent light borders or separators; pure black and pure white should be rare.
- Light decks need enough surface contrast that cards, tables, and diagrams remain visible after PPTX export.

Hard gates:

- Body text contrast must meet 4.5:1.
- Large text and UI components must meet 3:1.
- Do not hardcode Tailwind default indigo as an accent.
- Do not use two-stop purple-blue "trust" gradients as generic hero decoration.
- Cap visible accent use to the smallest number that still clarifies hierarchy.
```

- [ ] Verification command:

```bash
rg -n "## Color|Hard gates|4.5:1|Tailwind default indigo" content/craft/deck-authoring.md
```

## Task 10: Write Motion and FX Section

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Motion and FX

Motion is allowed when it clarifies sequence, emphasis, or atmosphere. It is not a substitute for evidence.

Rules:

- Use at most 1-2 animation families per slide.
- Use at most one canvas/WebGL FX region per slide.
- Avoid simultaneous motion in multiple unrelated regions.
- Respect reduced-motion behavior when framework support exists.
- Keep final static state strong; PPTX export and screenshots may capture the slide without animation.
- Add `data-pptx-rasterize="true"` to known irreducible canvas/WebGL/complex mask zones.
- Add `data-pptx-allow-overflow="true"` only when glow, trail, marquee, or other bleed is intentional.

Best uses:

- Counter or metric reveal on a hero stat.
- Flow progression on a process or architecture slide.
- Ambient but low-contrast background on a cover.
- Presenter-controlled reveal during a talk, when speaker notes require pacing.
```

- [ ] Verification command:

```bash
rg -n "## Motion and FX|one canvas|data-pptx-rasterize|Best uses" content/craft/deck-authoring.md
```

## Task 11: Write Slidify Compatibility Section

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Slidify Compatibility

Use `content/craft/slidify-compat.md` as the conversion contract. Deck-specific interpretation:

- Every title-like `<h1>` or `<h2>` should use `data-pptx-role="title"`.
- Subtitle and footer roles can use `data-pptx-role="subtitle"` and `data-pptx-role="footer"` when obvious.
- Use `data-atom="<id>"` for matching native atoms such as mesh backgrounds, gradient text, rings, bars, icons, and common shapes.
- Use `data-pptx-allow-overflow="true"` for intentional bleed.
- Use `data-pptx-rasterize="true"` for irreducible canvas, WebGL, complex masks, heavy blends, or regions the user wants preserved pixel-perfect.
- Use `data-pptx-skip="true"` for browser-only chrome that should not appear in exported slides.

Native/hybrid/raster policy:

- Native atom is preferred for text, basic shapes, simple charts, SVG geometry, and common backgrounds.
- Hybrid recipe is preferred when editable text/layout can remain native while an effect layer rasterizes.
- Clean preserved raster is acceptable for irreducible effects when visual fidelity matters more than editability.

Do not reduce design ambition just because an effect may rasterize. Annotate, export, read the fidelity report, and repair only what matters to the user's goal.
```

- [ ] Verification command:

```bash
rg -n "## Slidify Compatibility|Native/hybrid/raster policy|data-pptx-role" content/craft/deck-authoring.md
```

## Task 12: Write Quality Gate Checklist

- [ ] Append this section to `content/craft/deck-authoring.md`:

```markdown
## Quality Gate

Before a slide can be marked `ready`, check:

- [ ] Beat linkage: slide maps to one `beatId` and advances that beat.
- [ ] Specific headline: headline names a concrete actor, claim, metric, artifact, or decision.
- [ ] Evidence integrity: every stat, chart, quote, screenshot, table, or code/log excerpt comes from user input or labeled source material.
- [ ] No filler: no `[TBD]`, `[X%]`, lorem ipsum, sample content, fake companies, fake customers, or invented metrics.
- [ ] Layout fit: content fits 1920x1080 or the selected format without clipping, overflow, illegible type, or broken alignment.
- [ ] Density: one job per slide; split overloaded slides.
- [ ] Typography: type roles, sizes, tracking, and line lengths follow deck rules.
- [ ] Color: contrast, accent discipline, and semantic colors pass.
- [ ] Theme rhythm: the slide contributes to deck pacing and does not repeat the same surface/layout pattern by default.
- [ ] Notes: speaker notes explain the talking point and evidence caveat.
- [ ] Slidify hints: title roles, atoms, overflow, skip, and raster hints are present where useful.

Failing statuses:

- `needs-data`: missing real values, source tables, screenshots, quotes, customer names, dates, or artifacts.
- `needs-evidence`: vague claim, unsupported conclusion, weak beat linkage, or missing caveat.
- `fixed`: repaired layout, typography, color, rhythm, or slidify hint issue.
```

- [ ] Verification command:

```bash
rg -n "## Quality Gate|Beat linkage|Failing statuses|needs-data" content/craft/deck-authoring.md
```

## Task 13: Write References Section

- [ ] Append this final section to `content/craft/deck-authoring.md`:

```markdown
## References

Read these files when the deck needs deeper guidance:

- `content/craft/anti-ai-slop.md` for invented metrics, filler copy, default indigo, generic gradients, and other AI-template tells.
- `content/craft/color.md` for palette structure, contrast, accent discipline, semantic colors, and dark/light surface rules.
- `content/craft/typography.md` for type scale, line height, letter-spacing, font pairing, and line length.
- `content/craft/slidify-compat.md` for `data-pptx-*`, `data-atom`, native/hybrid/raster policy, and export repair posture.
- `content/skills/deck/references/slide-types.md` for mapping beats to slide archetypes.
- `content/skills/deck/references/narrative-patterns.md` for scenario arcs and common failure modes.
- `content/skills/deck/references/token-extraction.md` for DESIGN.md to `theme.css` token binding.
- `content/skills/html-ppt/references/layouts.md` and `content/skills/html-ppt/references/themes.md` for the default broad deck framework.
- `content/skills/simple-deck/references/checklist.md` for minimal one-idea decks.
- `content/skills/replit-deck/references/themes.md` for board memo and polished card systems.
- `content/skills/guizang-ppt/references/checklist.md` for editorial and image-led story rhythm.
```

- [ ] Verification command:

```bash
rg -n "## References|content/craft/anti-ai-slop.md|token-extraction.md|guizang-ppt" content/craft/deck-authoring.md
```

## Task 14: Final Craft Verification

- [ ] Run these checks:

```bash
test -f content/craft/deck-authoring.md
rg -n "^## Precedence|^## Conflict Resolution|^## Narrative Specificity|^## Slide Density|^## Theme Rhythm|^## Typography|^## Color|^## Motion and FX|^## Slidify Compatibility|^## Quality Gate|^## References" content/craft/deck-authoring.md
rg -n "anti-ai-slop|color.md|typography.md|slidify-compat.md" content/craft/deck-authoring.md
rg -n "needs-data|needs-evidence|data-pptx-role|data-atom" content/craft/deck-authoring.md
```

---
Status: done
Sender: codex
Receiver: claude
Summary: Wrote the deck authoring craft implementation plan with exact section content, precedence rules, conflict examples, quality gate, and references to existing craft files.
Files changed:
- docs/superpowers/plans/unified-deck-skill/02-skill-content.md
- docs/superpowers/plans/unified-deck-skill/05-craft-rules.md
Verification: plans are complete, all steps have content
Next handoff: claude reviews and integrates
---
