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
