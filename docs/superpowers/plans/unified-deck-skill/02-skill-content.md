# Skill Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Create the unified narrative-first deck skill and its reusable framework/reference assets.
**Architecture:** The skill writes `deck/deck-plan.json`, `deck/theme.css`, and focused `deck/slides/*.html` fragments while the app and daemon handle preview and export assembly. Existing deck skills remain standalone and are referenced as composable frameworks, themes, scenarios, and craft inputs.
**Tech Stack:** Markdown skill frontmatter, CSS custom properties, static HTML slide fragments, html-ppt runtime assets, slidify-compatible `data-pptx-*` hints.
---

## Task 1: Create Skill Directory Skeleton

- [ ] Create only these paths:
  - `content/skills/deck/SKILL.md`
  - `content/skills/deck/assets/framework.js`
  - `content/skills/deck/assets/framework.css`
  - `content/skills/deck/references/slide-types.md`
  - `content/skills/deck/references/narrative-patterns.md`
  - `content/skills/deck/references/token-extraction.md`
  - `content/skills/deck/references/frameworks.md`
  - `content/skills/deck/references/themes.md`
- [ ] Do not edit any existing skill files.
- [ ] Verification command:

```bash
test -d content/skills/deck/assets && test -d content/skills/deck/references
```

## Task 2: Write `content/skills/deck/SKILL.md` Frontmatter

- [ ] Write this exact frontmatter at the top of `content/skills/deck/SKILL.md`:

```markdown
---
name: deck
description: Unified narrative-first deck authoring skill. Use when the user asks for a presentation, PPT, deck, slides, keynote, board memo, pitch deck, product launch deck, technical talk, weekly report, course module, architecture explainer, or social carousel that should be planned through a story-first workflow before slide generation.
triggers:
  - "deck"
  - "slides"
  - "presentation"
  - "ppt"
  - "keynote"
  - "pitch deck"
  - "board deck"
  - "talk slides"
  - "product launch deck"
  - "weekly report"
  - "course module"
  - "architecture explainer"
  - "xhs carousel"
pixelpitch:
  mode: deck
  narrative: true
  featured: 1
  preview:
    type: html
    entry: deck/deck-plan.json
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  craft:
    requires: [anti-ai-slop, color, typography, slidify-compat, deck-authoring]
  example_prompt: "Create a deck with the unified narrative workflow. Interview me first for audience, key message, evidence, tone, and decision, then propose the outline before generating slides."
---
```

- [ ] Confirm `pixelpitch.mode: deck`, `pixelpitch.narrative: true`, and all five craft requirements are present.
- [ ] Verification command:

```bash
rg -n "mode: deck|narrative: true|deck-authoring|anti-ai-slop|slidify-compat" content/skills/deck/SKILL.md
```

## Task 3: Write `SKILL.md` Framework Selection

- [ ] Append this exact framework selection section immediately after the frontmatter in `content/skills/deck/SKILL.md`:

```markdown
## Framework Selection

Before writing `deck/deck-plan.json`, select exactly one base framework and document it in `composition.frameworkId`.

Default to `html-ppt` when the user needs:

- PPTX export through slidify.
- Multiple slide archetypes.
- Animations, canvas FX, presenter notes, keyboard navigation, or overview mode.
- Reusable theme CSS from `content/skills/html-ppt/assets/themes/`.
- Full-deck templates from `content/skills/html-ppt/templates/full-decks/`.

Use `simple-deck` only when the user explicitly wants a tiny single-file deck, fast editing, or a 6-10 slide minimal narrative with no advanced runtime.

Use `replit-deck` when the deck should feel like a polished board memo, gallery catalog, finance update, consumer card deck, or Replit-style theme study.

Use `guizang-ppt` when the user wants a magazine/editorial presentation, Chinese-first story pacing, strong theme rhythm, or image-heavy essay slides.

After selecting the framework, read only the needed references:

- `html-ppt`: `content/skills/html-ppt/references/layouts.md`, `content/skills/html-ppt/references/themes.md`, `content/skills/html-ppt/references/animations.md`, and any selected `content/skills/html-ppt/templates/full-decks/<id>/README.md` if it exists.
- `simple-deck`: `content/skills/simple-deck/references/layouts.md` and `content/skills/simple-deck/references/checklist.md`.
- `replit-deck`: `content/skills/replit-deck/references/layouts.md`, `content/skills/replit-deck/references/themes.md`, and `content/skills/replit-deck/references/components.md`.
- `guizang-ppt`: `content/skills/guizang-ppt/references/layouts.md`, `content/skills/guizang-ppt/references/themes.md`, `content/skills/guizang-ppt/references/components.md`, and `content/skills/guizang-ppt/references/checklist.md`.

Write a compact layer decision before generation:

```markdown
## Layer Decision

- Runtime: `html-ppt/assets/runtime.js`, because this deck needs keyboard navigation, overview, notes, and slidify export.
- Format: 16:9 horizontal, because the user asked for a board presentation.
- Theme: `pitch-deck-vc.css`, with the selected design system overriding palette and typography tokens.
- Layouts: `cover`, `stat-highlight`, `kpi-grid`, `comparison`, `roadmap`, `cta`.
- Scenario: pitch-deck arc, because the audience is investors and the key action is funding approval.
- Craft/QA: apply `deck-authoring`; every traction slide must contain user-provided metrics or stay `needs-data`.
```
```

- [ ] Verification command:

```bash
rg -n "Framework Selection|Default to `html-ppt`|Layer Decision|composition.frameworkId" content/skills/deck/SKILL.md
```

## Task 4: Write `SKILL.md` Opening Contract

- [ ] Append this content after the framework selection in `content/skills/deck/SKILL.md`:

```markdown
# Unified Deck Skill

You author decks through a narrative-first workflow. Do not start by generating slides from a one-line prompt. First discover the story, audience, evidence, decision, and visual system. Then write structured deck files that the Pixelpitch web app can render phase by phase.

## Output Contract

Create and maintain this project-local folder:

```text
deck/
  deck-plan.json
  theme.css
  framework.js
  framework.css
  slides/
    01-title.html
    02-problem.html
```

Responsibilities:

- `deck/deck-plan.json` is the single source of truth for phase, metadata, composition, interview history, narrative beats, slide manifest, and export state.
- `deck/theme.css` binds the selected design system and theme to CSS custom properties on `:root`.
- `deck/framework.js` and `deck/framework.css` are copied from this skill's assets and are not agent-edited after scaffold.
- `deck/slides/*.html` are pure fragments. Each file contains one `<section class="slide" data-slide-id="...">` and no `<html>`, `<head>`, `<body>`, or `<script>`.

Never assemble a monolithic `deck.html` during authoring. The web app stitches fragments for preview. The daemon assembles only during export.
```

- [ ] Verification command:

```bash
rg -n "Output Contract|Never assemble a monolithic|deck-plan.json|slides/.*html" content/skills/deck/SKILL.md
```

## Task 5: Write `SKILL.md` Narrative Interview Protocol

- [ ] Append this section to `content/skills/deck/SKILL.md`:

```markdown
## Narrative Interview Protocol

Run the interview one question at a time. If the user already supplied a rich brief, summarize what is known and ask only for the highest-risk missing item. Do not ask a long questionnaire in one message.

Required fields before `phase: "structure"`:

- `title`: working deck title.
- `audience`: who decides, learns, buys, approves, or acts.
- `tone`: visual and verbal tone.
- `keyMessage`: the sentence the audience should remember.
- `decision`: the action the deck must drive, stored as an `ask` or `plan` beat.
- `evidence`: real numbers, quotes, diagrams, screenshots, tables, or source material.

Interview sequence:

1. Ask for audience and decision: "Who is this for, and what should they decide or do after the deck?"
2. Ask for key message: "What one sentence should the audience remember?"
3. Ask for evidence: "What real numbers, artifacts, customer names, dates, screenshots, or source documents can support that claim?"
4. Ask for tone and constraints: "Should this feel executive, technical, editorial, sales-led, urgent, calm, or something else? Any brand/design system?"
5. Ask for format and delivery: "Is this 16:9 presentation, 3:4 social carousel, A4 handout, or speaker-mode talk with notes?"

After each answer, update `deck-plan.json.interview.history[]` with `questionId`, `question`, `answer`, and an ISO timestamp. Keep `interview.pendingQuestionId` set while waiting for the next answer; remove it when the answer is recorded.

Use this initial `deck-plan.json` shape:

```json
{
  "version": 1,
  "phase": "narrative",
  "title": "",
  "audience": "",
  "tone": "",
  "keyMessage": "",
  "composition": {
    "frameworkId": "html-ppt",
    "themeId": "minimal-white",
    "format": "16:9",
    "runtime": "deck/framework.js",
    "designSystemId": null
  },
  "interview": {
    "history": [],
    "pendingQuestionId": "audience-decision"
  },
  "narrative": {
    "beats": []
  },
  "slides": [],
  "slidify": {
    "lastExport": null,
    "fidelityIssues": []
  }
}
```

Transition to `phase: "structure"` only after `title`, `audience`, `keyMessage`, and at least one decision-driving `ask` or `plan` beat are known.
```

- [ ] Verification command:

```bash
rg -n "Narrative Interview Protocol|pendingQuestionId|phase.: .structure|audience-decision" content/skills/deck/SKILL.md
```

## Task 6: Write `SKILL.md` Phase Transitions

- [ ] Append this section to `content/skills/deck/SKILL.md`:

```markdown
## Phase Transitions

The deck has five phases. Move forward only when the gate is satisfied.

| Phase | Agent action | Gate |
|---|---|---|
| `narrative` | Ask one interview question at a time and update metadata. | `title`, `audience`, and `keyMessage` are non-empty. |
| `structure` | Propose and revise `narrative.beats[]`. | Beats include at least one `ask` or `plan` and each beat has a specific summary. |
| `generating` | Create `theme.css`, copy framework assets, and write slide fragments sequentially. | Every slide entry maps to an existing file. |
| `ready` | Handle per-slide edits, quality fixes, notes, and export preparation. | Every slide status is `ready` or `fixed`. |
| `exporting` | Let the daemon assemble and run slidify; then repair fidelity issues. | `slidify.fidelityIssues[]` is reviewed and accepted or fixed. |

Set phase changes by editing `deck/deck-plan.json`. Keep all edits schema-valid. Do not set `ready` while any slide is `pending`, `generating`, `needs-data`, or `needs-evidence`.
```

- [ ] Verification command:

```bash
rg -n "Phase Transitions|needs-data|needs-evidence|Do not set `ready`" content/skills/deck/SKILL.md
```

## Task 7: Write `SKILL.md` Slide Generation Loop

- [ ] Append this section to `content/skills/deck/SKILL.md`:

```markdown
## Slide Generation Loop

Generate slides sequentially. For each slide:

1. Read `deck/theme.css`, the target beat from `deck/deck-plan.json`, and the selected reference entry from `references/slide-types.md`.
2. Set that slide's status to `generating`.
3. Write one fragment at `deck/slides/{nn}-{slug}.html`.
4. Include one `<section class="slide" data-slide-id="{id}" data-slide-type="{type}">`.
5. Add `data-pptx-role="title"` to the slide title.
6. Add `data-atom` when a native slidify atom fits a chart, mesh, ring, gradient text, icon, or shape pattern.
7. Add `data-pptx-allow-overflow="true"` only for intentional bleed.
8. Add `data-pptx-rasterize="true"` only for irreducible canvas, WebGL, blend, or complex mask zones.
9. Write speaker notes in the `speakerNotes` field of `deck-plan.json`; do not put presenter-only prose on the visible slide.
10. Run the quality gate. Set status to `ready`, `fixed`, `needs-data`, or `needs-evidence`.

Fragment template:

```html
<section class="slide" data-slide-id="02-problem" data-slide-type="problem-statement">
  <div class="slide-shell">
    <p class="eyebrow">Problem</p>
    <h1 data-pptx-role="title">A concrete actor is blocked by a concrete constraint</h1>
    <div class="evidence-grid">
      <article class="evidence-card">
        <strong>Known fact</strong>
        <span>Use only user-provided evidence or labelled source material.</span>
      </article>
    </div>
  </div>
</section>
```

Slide fragments must not include placeholder strings such as `[TBD]`, `[X%]`, `lorem ipsum`, `feature one`, `sample content`, fake customers, or invented metrics. If evidence is missing, ask the user and mark the slide `needs-data` or `needs-evidence`.
```

- [ ] Verification command:

```bash
rg -n "Slide Generation Loop|data-pptx-role|data-atom|speakerNotes|needs-data" content/skills/deck/SKILL.md
```

## Task 8: Write `SKILL.md` Anti-Strawman Pushback

- [ ] Append this section to `content/skills/deck/SKILL.md`:

```markdown
## Anti-Strawman Pushback

Push back when a beat is too vague to render without filler. Do not silently invent content. Use this language:

```markdown
I can make this slide strong, but the current beat is too vague to render without filler.

Please provide one of these:
- a number, date, customer name, artifact, or before/after comparison;
- the exact decision this slide should drive;
- permission to mark the slide `needs-evidence` and keep it out of export until filled.

Current beat: "{beat summary}"
Better shape: "Show [metric] changed from [before] to [after] over [timeframe], because [cause]."
```

Specificity examples:

| Vague beat | Acceptable beat |
|---|---|
| "Show traction." | "Show 42 paying teams, $18.6K MRR, and 31% month-over-month growth from February-April 2026." |
| "Explain the architecture." | "Explain how the daemon watches `deck-plan.json`, stitches slide fragments, then runs slidify only during export." |
| "Talk about customers." | "Use the Northwind Studios quote about first-month payback and show the $1,800 to $200 bandwidth drop." |
| "Discuss risks." | "List the three launch blockers: font licensing, PPTX rasterization on blend effects, and missing export retry telemetry." |
| "Make an ask slide." | "Ask for a decision today: approve two engineers for six weeks to build deck assembly and export repair." |
```

- [ ] Verification command:

```bash
rg -n "Anti-Strawman Pushback|Current beat|Better shape|Show traction" content/skills/deck/SKILL.md
```

## Task 9: Write `SKILL.md` Quality Gate Checklist

- [ ] Append this section to `content/skills/deck/SKILL.md`:

```markdown
## Quality Gate Checklist

Before setting a slide to `ready`, verify every item:

- [ ] Beat linkage: the slide maps to one `beatId` and advances that beat.
- [ ] Headline: the headline names a concrete actor, claim, metric, artifact, or decision.
- [ ] Evidence: stats, charts, screenshots, quotes, and tables come from user-provided inputs or clearly labeled source material.
- [ ] No placeholders: no `[TBD]`, `[X]`, lorem ipsum, generic labels, fake companies, fake customers, or invented charts.
- [ ] Layout fit: content fits 1920x1080 without overflow, clipping, or illegible type.
- [ ] Visual role: layout matches beat type; data beats use charts/tables/stats, system beats use diagrams, asks use CTA/decision layouts.
- [ ] Theme rhythm: the deck avoids 3+ same-surface slides in a row unless the user approved monotone pacing.
- [ ] Speaker notes: notes explain what the presenter should say and include evidence source or caveat.
- [ ] Slidify hints: titles, atoms, intentional bleed, and raster zones are annotated where useful.

Failing statuses:

- Use `needs-data` for missing numbers, screenshots, quotes, tables, or source material.
- Use `needs-evidence` for vague claims, weak headlines, missing caveats, or unsupported narrative jumps.
- Use `fixed` after repairing layout, rhythm, typography, color, or slidify hint issues.
```

- [ ] Verification command:

```bash
rg -n "Quality Gate Checklist|Beat linkage|Failing statuses|needs-evidence" content/skills/deck/SKILL.md
```

## Task 10: Write `SKILL.md` Per-Slide Editing and Export Repair Rules

- [ ] Append this final section to `content/skills/deck/SKILL.md`:

```markdown
## Per-Slide Editing

When the user asks to edit a specific slide, read only:

- `deck/theme.css`
- the targeted `deck/slides/*.html` fragment
- that slide's entry in `deck/deck-plan.json`

Edit only that slide fragment and the matching slide metadata. Do not rewrite unrelated slides, framework assets, or the whole deck.

## Export Repair Loop

On export, the daemon assembles `deck.html`, runs slidify, and writes fidelity issues to `deck-plan.json.slidify.fidelityIssues[]`. Repair only flagged slides unless the user asks for a broader pass.

Issue handling:

- `rasterized`: keep design quality unless the user prioritizes editability; add native atoms or hybrid structure where possible.
- `overflow`: fix dimensions, line breaks, or intentional `data-pptx-allow-overflow`.
- `font-missing`: adjust `theme.css` fallback stack or use available webfont imports.
- `layout-drift`: simplify the affected layout or add slidify hints without flattening the whole slide.

The principle is slidify-aware, not slidify-limited: use modern CSS and strong visual design, then annotate for conversion.
```

- [ ] Verification command:

```bash
rg -n "Per-Slide Editing|Export Repair Loop|slidify-aware, not slidify-limited" content/skills/deck/SKILL.md
```

## Task 11: Add `content/skills/deck/assets/framework.js`

- [ ] Copy the stable runtime byte-for-byte from `content/skills/html-ppt/assets/runtime.js` to `content/skills/deck/assets/framework.js`.
- [ ] Do not add deck-specific business logic to this asset. The daemon and web app own assembly, API calls, and export orchestration.
- [ ] Add no comments unless they already exist in the source runtime.
- [ ] Verification command:

```bash
cmp -s content/skills/html-ppt/assets/runtime.js content/skills/deck/assets/framework.js
```

## Task 12: Add `content/skills/deck/assets/framework.css`

- [ ] Copy the stable base styles byte-for-byte from `content/skills/html-ppt/assets/base.css` to `content/skills/deck/assets/framework.css`.
- [ ] Keep theme-specific colors out of this file except source fallback tokens already present in html-ppt base styles.
- [ ] Put project-specific token values only in generated `deck/theme.css`, not this asset.
- [ ] Verification command:

```bash
cmp -s content/skills/html-ppt/assets/base.css content/skills/deck/assets/framework.css
```

## Task 13: Write `references/slide-types.md` Header and Mapping Rules

- [ ] Write this opening content to `content/skills/deck/references/slide-types.md`:

```markdown
# Slide Types

Use this catalog to map narrative beats to slide fragments. Prefer the selected framework's native layout names, but normalize every slide entry through these authoring requirements.

## Mapping Rules

- Context beats usually map to `cover`, `toc`, `section-divider`, `memo-hero-statement`, or `hero cover`.
- Problem beats usually map to `bullets`, `two-column`, `comparison`, `before/after`, `hero question`, or `lead image + side text`.
- Solution beats usually map to `three-column`, `process-steps`, `flow-diagram`, `arch-diagram`, `pipeline`, or `pill-headline-cards-row`.
- Evidence beats usually map to `stat-highlight`, `kpi-grid`, `table`, `chart-bar`, `chart-line`, `chart-pie`, `big numbers grid`, or `quote+image`.
- How beats usually map to `timeline`, `roadmap`, `gantt`, `code`, `diff`, `terminal`, `process-steps`, or `chapter-plate`.
- Plan beats usually map to `roadmap`, `todo-checklist`, `timeline`, `two-column-ask`, or `finance-hero-grid`.
- Ask beats usually map to `cta`, `thanks`, `two-column-ask`, or `closing/CTA`.

Every slide type must define a visible audience-facing claim, a layout role, required evidence, and slidify hints.
```

- [ ] Verification command:

```bash
rg -n "Mapping Rules|Context beats|Every slide type" content/skills/deck/references/slide-types.md
```

## Task 14: Add html-ppt Layouts to `slide-types.md`

- [ ] Append this table to `content/skills/deck/references/slide-types.md`:

```markdown
## html-ppt Layouts

Source: `content/skills/html-ppt/references/layouts.md` and `content/skills/html-ppt/templates/single-page/*.html`.

| Layout | Use when | Evidence requirement | Slidify notes |
|---|---|---|---|
| `cover` | Opening title, thesis, date, presenter, or event context. | Title, audience, and key message. | Tag title with `data-pptx-role="title"`. |
| `toc` | Previewing sections or agenda. | Final beat labels. | Keep list editable text. |
| `section-divider` | Creating rhythm between acts. | Act name and why the pivot matters. | Intentional large type is safe as native text. |
| `bullets` | Explaining 3-5 concise claims. | Each bullet must be specific and sourced if factual. | Avoid nested lists; keep bullets as text. |
| `two-column` | Comparing two forces, audiences, states, or arguments. | Named sides and concrete deltas. | Use native borders and text where possible. |
| `three-column` | Showing 3-part framework or option set. | Each column has one claim and proof point. | Cards should use tokenized borders and fills. |
| `big-quote` | Highlighting a real customer, stakeholder, or source quote. | Exact quote and attribution. | Quote text stays editable; decorative marks can rasterize. |
| `stat-highlight` | One hero metric or before/after result. | User-provided number, unit, timeframe, and source. | Use `data-atom="type.gfill-4"` only if gradient text is used. |
| `kpi-grid` | Showing 3-6 metrics at equal weight. | Real metric names, values, and time windows. | Native text and simple shapes preferred. |
| `table` | Showing structured comparisons or operating data. | Real rows and column labels. | Keep font readable; split if dense. |
| `chart-bar` | Comparing categories or periods. | Source values for each bar. | Use `data-atom="data.bar.linear"` when matching simple bars. |
| `chart-line` | Showing trend over time. | Ordered data points and date range. | Prefer SVG polylines for native conversion. |
| `chart-pie` | Showing simple part-to-whole distribution. | Values must sum clearly. | Use sparingly; ring or bar often reads better. |
| `chart-radar` | Comparing capability dimensions. | Defined scale and values for each axis. | Label axes outside the shape. |
| `code` | Explaining implementation detail. | Real code or pseudo-code labeled as such. | Use monospace text, not screenshots, unless source is visual. |
| `diff` | Showing before/after code or policy changes. | Real changed lines or a labeled example. | Preserve `+` and `-` text as editable runs. |
| `terminal` | Showing CLI flow, logs, or agent traces. | Real command/log snippets or labeled mock. | Keep terminal chrome decorative and text editable. |
| `flow-diagram` | Showing process movement. | Named steps and directional relationship. | Use SVG lines/shapes; add `data-atom` if matching a flow atom. |
| `arch-diagram` | Showing system boundaries and data flow. | Real service names, ownership, and interfaces. | Use SVG/HTML shapes, never prose descriptions of boxes. |
| `process-steps` | Teaching a sequence. | Ordered steps with inputs and outputs. | Native numbered shapes are preferred. |
| `mindmap` | Showing concept relationships. | Named nodes and relationship labels. | Use SVG paths for connectors. |
| `timeline` | Showing dated history or rollout. | Dates, milestones, and owners. | Keep axis and labels native. |
| `roadmap` | Showing future phases. | Phase names, dates, dependencies, and owners. | Avoid fake quarters. |
| `gantt` | Showing parallel workstreams. | Start/end dates and owners. | Split if more than 5 lanes. |
| `comparison` | Making a decision between options. | Criteria and evidence for each option. | Use table-like native structure. |
| `pros-cons` | Balanced tradeoff discussion. | Specific pros, cons, and decision criteria. | Preserve semantic colors for good/bad. |
| `todo-checklist` | Execution plan or readiness checklist. | Real tasks, owners, or decision gates. | Use native check icons or Lucide SVG. |
| `image-hero` | Showing product, place, artifact, or people as the main proof. | Real or generated relevant image with clear purpose. | Raster image is expected; text remains native. |
| `image-grid` | Showing gallery, evidence set, or examples. | Real image set and captions. | Keep captions editable. |
| `cta` | Asking for approval, action, or next step. | Specific decision, owner, and deadline. | Make ask text editable and prominent. |
| `thanks` | Closing with contact or final message. | Final message and contact/next action. | Avoid empty gratitude slides without an ask. |
```

- [ ] Verification command:

```bash
rg -n "`arch-diagram`|`stat-highlight`|`thanks`" content/skills/deck/references/slide-types.md
```

## Task 15: Add simple-deck, replit-deck, and guizang-ppt Layouts to `slide-types.md`

- [ ] Append this content to `content/skills/deck/references/slide-types.md`:

```markdown
## simple-deck Layouts

Source: `content/skills/simple-deck/references/layouts.md`.

| Layout | Use when | Evidence requirement | Slidify notes |
|---|---|---|---|
| Cover | Minimal opening with one thesis. | Title and key message. | Native text only. |
| Body slide | One idea with short supporting bullets. | Concrete claim and 2-4 supports. | Keep body at readable size. |
| Big stat | One metric as the slide. | Real number, unit, source, timeframe. | Use editable text for number. |
| Three-point row | Three reasons, pillars, or options. | Each point has a specific proof. | Native cards. |
| Pipeline | Linear process or workflow. | Step names and order. | SVG or native line connectors. |
| Big quote | Testimonial or thesis quote. | Exact quote and attribution. | Quote text editable. |
| Before/after | Change from old state to new state. | Before, after, and cause. | Avoid invented deltas. |
| Closing/CTA | Final ask or next step. | Decision, owner, date. | Title and ask tagged. |

## replit-deck Layouts

Source: `content/skills/replit-deck/references/layouts.md`.

| Layout | Use when | Evidence requirement | Slidify notes |
|---|---|---|---|
| `cover-hero` | Polished memo or board opening. | Deck title and thesis. | Keep hero text native. |
| `kpi-row-6` | Six operating metrics. | Six real values with labels. | Split if labels become tiny. |
| `split-hero-metric` | One narrative claim plus one metric. | Claim plus sourced metric. | Number stays editable. |
| `memo-hero-statement` | Board memo thesis. | One decision-driving statement. | Avoid decoration that competes with text. |
| `two-column-ask` | Decision request with rationale. | Ask, rationale, and tradeoff. | CTA text as native shape. |
| `gallery-plate` | Catalog or artifact set. | Real artifacts/images and captions. | Images raster, captions native. |
| `campaign-cover` | Launch/campaign opening. | Campaign name and promise. | Tag headline. |
| `finance-hero-grid` | Finance update with supporting KPIs. | Real financial values. | Semantic color must remain accessible. |
| `chapter-plate` | Section divider with memo feel. | Act name and transition reason. | Native large type. |
| `pill-headline-cards-row` | Compact card row under a statement. | Each card has specific claim. | Cards should not overflow. |

## guizang-ppt Layouts

Source: `content/skills/guizang-ppt/references/layouts.md`.

| Layout | Use when | Evidence requirement | Slidify notes |
|---|---|---|---|
| Hero cover | Magazine-style opening. | Title, subtitle, issue/date context. | Image may rasterize; title native. |
| Act divider | Editorial pacing break. | Act title and narrative pivot. | Strong type hierarchy. |
| Big numbers grid | Several hero stats. | Real values and sources. | Native numbers; captions readable. |
| Quote+image | Human proof or editorial voice. | Exact quote, attribution, image. | Quote native, image raster. |
| Image grid | Visual essay evidence. | Real images and captions. | Keep captions short. |
| Pipeline | Story process or production flow. | Ordered stages. | Native/SVG connectors. |
| Hero question | Reframing question. | Question tied to audience decision. | Avoid rhetorical filler. |
| Big quote | Single thesis quote. | Exact source or user-approved line. | Editable quote text. |
| A/B comparison | Taste, strategy, or tradeoff contrast. | Clear dimensions and examples. | Preserve contrast and labels. |
| Lead image + side text | Feature story or case study. | Image plus sourced narrative. | Ensure side text line length is readable. |
```

- [ ] Verification command:

```bash
rg -n "simple-deck Layouts|replit-deck Layouts|guizang-ppt Layouts|two-column-ask" content/skills/deck/references/slide-types.md
```

## Task 16: Write `references/narrative-patterns.md`

- [ ] Write this content to `content/skills/deck/references/narrative-patterns.md`:

```markdown
# Narrative Patterns

Use these arcs after the interview. Every arc can be shortened or expanded, but every deck must have a concrete audience, key message, evidence plan, and ask or plan beat.

## Pitch Deck

- Beat sequence: context, problem, solution, evidence, evidence, how, plan, ask.
- Slide count: 8-12.
- Evidence needs: market wedge, traction, customer proof, business model, ask amount, use of funds.
- Common failure modes: invented TAM, vague traction, unclear ask, generic team slide.

## Product Launch

- Beat sequence: context, problem, solution, evidence, how, plan, ask.
- Slide count: 7-10.
- Evidence needs: customer pain, product screenshots, before/after workflow, launch date, CTA.
- Common failure modes: feature list without positioning, atmospheric screenshots, no proof that the feature matters.

## Weekly Report

- Beat sequence: context, evidence, evidence, problem, plan, ask.
- Slide count: 5-8.
- Evidence needs: KPI deltas, blockers, owners, dates, risks, next actions.
- Common failure modes: status theater, too many metrics, no decisions.

## Technical Talk

- Beat sequence: context, problem, how, how, evidence, plan, ask.
- Slide count: 8-14.
- Evidence needs: architecture diagram, real code/logs, benchmarks, rollout risks, demo plan.
- Common failure modes: diagrams described in prose, terminal screenshots instead of editable text, no throughline.

## Course Module

- Beat sequence: context, how, how, evidence, how, plan, ask.
- Slide count: 8-16.
- Evidence needs: learning objectives, worked examples, practice checkpoints, recap.
- Common failure modes: too much text, no learner action, examples not tied to objectives.

## Safety Alert

- Beat sequence: context, problem, evidence, how, plan, ask.
- Slide count: 5-9.
- Evidence needs: incident facts, risk severity, affected systems, mitigations, owners.
- Common failure modes: alarm without priority, vague mitigations, missing owner/date.

## Architecture Explainer

- Beat sequence: context, problem, how, how, evidence, plan.
- Slide count: 7-12.
- Evidence needs: system boundaries, data flow, failure modes, tradeoffs, migration steps.
- Common failure modes: "boxology" without relationships, invented service names, no operational constraints.

## XHS Carousel

- Beat sequence: context, problem, solution, how, evidence, ask.
- Slide count: 6-9.
- Evidence needs: one claim per portrait slide, concise captions, share/save CTA.
- Common failure modes: 16:9 density in 3:4 format, tiny text, too many claims per card.

## Editorial Essay

- Beat sequence: context, problem, evidence, solution, how, ask.
- Slide count: 8-14.
- Evidence needs: images, quotes, concrete cultural/product examples, strong section rhythm.
- Common failure modes: mood without argument, decorative imagery, repeated same-surface slides.
```

- [ ] Verification command:

```bash
rg -n "Pitch Deck|Technical Talk|XHS Carousel|Common failure modes" content/skills/deck/references/narrative-patterns.md
```

## Task 17: Write `references/token-extraction.md`

- [ ] Write this content to `content/skills/deck/references/token-extraction.md`:

```markdown
# Token Extraction

Use this procedure to convert DESIGN.md prose and selected theme guidance into `deck/theme.css`.

## Extraction Order

1. Read the primary DESIGN.md if present.
2. Extract palette intent into semantic tokens.
3. Extract typography into display/body/mono families.
4. Extract spacing, radius, border, shadow, and chart style.
5. Apply selected theme mood as layout and surface rhythm.
6. Apply inspiration design systems only as secondary pattern cues.
7. Fill missing tokens with accessible defaults.

## Required Tokens

```css
:root {
  --deck-bg: #fafafa;
  --deck-surface: #ffffff;
  --deck-surface-2: #f2f2f0;
  --deck-fg: #111111;
  --deck-muted: #5f6368;
  --deck-border: rgba(17, 17, 17, 0.14);
  --deck-accent: #2f6feb;
  --deck-success: #17a34a;
  --deck-warn: #b7791f;
  --deck-danger: #c2410c;
  --deck-font-display: Inter, ui-sans-serif, system-ui, sans-serif;
  --deck-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --deck-font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --deck-radius: 12px;
  --deck-shadow: 0 18px 60px rgba(0, 0, 0, 0.12);
  --deck-gap: 32px;
}
```

## Palette Rules

- Name tokens by purpose, not hue.
- Keep neutrals at 70-90% of pixels.
- Use one dominant accent and cap visible accent usage per slide.
- Preserve semantic colors for success, warning, and danger.
- If brand colors are inaccessible, keep the palette but adjust pairings for contrast.

## Typography Rules

- Bind display text to `--deck-font-display`.
- Bind body text to `--deck-font-body`.
- Bind code and terminal content to `--deck-font-mono`.
- Use 6-8 type sizes maximum across the deck.
- Track all-caps labels at `0.06em` to `0.1em`.

## Multi-Design-System Blending

- Primary design system controls color and type.
- Inspiration systems contribute layout gestures, component proportions, chart style, or motion rhythm.
- Never average palettes from multiple systems.
- If inspirations conflict with the primary design system, document the choice in `deck-plan.json.composition.themeId` or speaker notes.

## Fallback Defaults

Use the required tokens above when no design system is selected. Then let the selected theme modify mood, not accessibility.
```

- [ ] Verification command:

```bash
rg -n "Extraction Order|Required Tokens|--deck-accent|Multi-Design-System" content/skills/deck/references/token-extraction.md
```

## Task 18: Write `references/frameworks.md`

- [ ] Write this content to `content/skills/deck/references/frameworks.md`:

```markdown
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
```

- [ ] Verification command:

```bash
rg -n "Frameworks|Overlay Modes|Selection Examples|html-ppt" content/skills/deck/references/frameworks.md
```

## Task 19: Write `references/themes.md`

- [ ] Write this content to `content/skills/deck/references/themes.md`:

```markdown
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
```

- [ ] Verification command:

```bash
rg -n "html-ppt CSS Themes|Full-Deck Templates|Replit Themes|Guizang Themes|Composition Rules" content/skills/deck/references/themes.md
```

## Task 20: Final Plan Verification

- [ ] Run all content checks:

```bash
test -f content/skills/deck/SKILL.md
test -f content/skills/deck/assets/framework.js
test -f content/skills/deck/assets/framework.css
test -f content/skills/deck/references/slide-types.md
test -f content/skills/deck/references/narrative-patterns.md
test -f content/skills/deck/references/token-extraction.md
test -f content/skills/deck/references/frameworks.md
test -f content/skills/deck/references/themes.md
rg -n "Narrative Interview Protocol|Phase Transitions|Slide Generation Loop|Anti-Strawman Pushback|Quality Gate Checklist" content/skills/deck/SKILL.md
cmp -s content/skills/html-ppt/assets/runtime.js content/skills/deck/assets/framework.js
cmp -s content/skills/html-ppt/assets/base.css content/skills/deck/assets/framework.css
```

---
Status: done
Sender: codex
Receiver: claude
Summary: Wrote the unified deck skill content implementation plan with concrete SKILL.md sections, asset-copy instructions, reference file contents, and verification commands.
Files changed:
- docs/superpowers/plans/unified-deck-skill/02-skill-content.md
- docs/superpowers/plans/unified-deck-skill/05-craft-rules.md
Verification: plans are complete, all steps have content
Next handoff: claude reviews and integrates
---
