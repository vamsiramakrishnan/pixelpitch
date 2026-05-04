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

### CRITICAL: deck-plan.json is the source of truth

The web app reads ONLY `deck/deck-plan.json` to decide what to render. If a slide file exists on disk but is not listed in `deck-plan.json.slides[]`, the web app does not know about it. If the phase is wrong, the web app shows the wrong UI.

**Every file you write must be reflected in deck-plan.json immediately.**

### NEVER construct deck-plan.json from scratch after initial creation

After the initial creation of deck-plan.json, ALWAYS follow the read→modify→write pattern:

1. **Read** the current deck-plan.json from disk
2. **Modify** only the specific fields you're changing (add a slide entry, update a status, change the phase)
3. **Write** the modified plan back

NEVER build a new JSON object from memory and write it. This is how slides get dropped — you forget to include the 13 slides that are already there. The plan is append-only for slides.

### Rules

1. **Before writing any slide fragment**, READ the plan, add an entry to `slides[]` with `status: "generating"`, WRITE the plan. Then write the slide.
2. **After writing a slide fragment**, READ the plan, update that slide's `status` to `"ready"`, WRITE the plan.
3. **After finishing all slides**, READ the plan, set `phase` to `"ready"`, WRITE the plan.
4. **Never leave the plan out of sync.** If you write 13 slides but the plan still says `phase: "narrative"` with `slides: []`, the web app shows the interview UI, not the slides.
5. **When transitioning phases**, READ→MODIFY→WRITE. Never construct from scratch.
6. **The daemon rejects destructive updates**: dropping all slides from a plan that has slides, or reverting to `narrative` after slides exist, will be rejected by the API with a 400 error.

### JSON update sequence (mandatory)

When generating slides, follow this exact write order for EACH slide:

```
Step 1: Read deck-plan.json
Step 2: Add slide entry: { id: "s3", beatId: "b3", type: "content", title: "BYO MCP", file: "slides/03-byo-mcp.html", status: "generating", speakerNotes: "" }
Step 3: Write updated deck-plan.json  ← plan now knows about this slide
Step 4: Write deck/slides/03-byo-mcp.html  ← the actual slide content
Step 5: Read deck-plan.json again
Step 6: Update slide status to "ready" and add speakerNotes
Step 7: Write updated deck-plan.json  ← plan reflects completed slide
```

After ALL slides are written:

```
Step N: Read deck-plan.json
Step N+1: Set phase to "ready"
Step N+2: Write updated deck-plan.json  ← web app now shows SlideEditor
```

### Other responsibilities

- `deck/theme.css` binds the selected design system and theme to CSS custom properties on `:root`.
- `deck/framework.js` and `deck/framework.css` are copied from this skill's assets and are not agent-edited after scaffold.
- `deck/slides/*.html` are pure fragments. Each file contains one `<section class="slide" data-slide-id="...">` and no `<html>`, `<head>`, `<body>`, or `<script>`.

Never assemble a monolithic `deck.html` during authoring. The web app stitches fragments for preview. The daemon assembles only during export.

## Narrative Interview Protocol

Run the interview one question at a time using visual question forms. If the user already supplied a rich brief, skip to the first unanswered question or straight to beat proposal.

### CRITICAL: Use question-form tags, not plain text questions

The web app renders `<question-form>` tags as interactive visual cards. Plain text questions are hard to parse and easy to skip. Always use the form tag for structured input.

### Required fields before `phase: "structure"`

- `title`: working deck title
- `audience`: who decides, learns, buys, approves, or acts
- `tone`: visual and verbal tone
- `keyMessage`: the sentence the audience should remember
- `decision`: the action the deck must drive
- `evidence`: real numbers, quotes, diagrams, screenshots, tables, or source material

### Interview forms (emit one per turn)

**Turn 1 — Audience and decision:**

```
<question-form id="deck-audience" title="Who is this deck for?">
{
  "questions": [
    {
      "id": "audience",
      "label": "Primary audience",
      "type": "radio",
      "options": ["C-Suite / VP", "Engineering leads", "Product / Design", "Customer / External", "Board / Investors", "Internal team"],
      "required": true
    },
    {
      "id": "decision",
      "label": "What should they decide or do after this deck?",
      "type": "text",
      "placeholder": "e.g., Approve the POC budget, Adopt the platform, Greenlight the launch",
      "required": true
    }
  ]
}
</question-form>
```

**Turn 2 — Key message and tone:**

```
<question-form id="deck-message" title="What's the core message?">
{
  "questions": [
    {
      "id": "keyMessage",
      "label": "The one sentence they should remember",
      "type": "text",
      "placeholder": "e.g., Enterprise agent deployment requires these 8 primitives that competitors are missing",
      "required": true
    },
    {
      "id": "tone",
      "label": "Tone",
      "type": "radio",
      "options": ["Executive / Strategic", "Technical / Evidence-driven", "Sales / Persuasive", "Editorial / Thought leadership", "Urgent / Action-required", "Educational / Workshop"],
      "required": true
    }
  ]
}
</question-form>
```

**Turn 3 — Format and evidence:**

```
<question-form id="deck-format" title="Format and evidence">
{
  "questions": [
    {
      "id": "format",
      "label": "Delivery format",
      "type": "radio",
      "options": ["16:9 presentation", "3:4 social carousel", "Speaker-mode with notes", "A4 handout"],
      "required": true
    },
    {
      "id": "evidence",
      "label": "What real evidence can support the key claims? (numbers, customer names, screenshots, data)",
      "type": "textarea",
      "placeholder": "e.g., 40% latency reduction at Customer X, $18.6K MRR, deployment screenshot from Grafana",
      "required": false,
      "help": "The more specific, the stronger the deck. Slides without evidence get marked needs-data."
    }
  ]
}
</question-form>
```

### When user provides a rich brief

If the first message contains audience, key points, and a decision/ask, skip the interview forms entirely:

1. Extract `title`, `audience`, `tone`, `keyMessage` from the brief
2. Create `deck-plan.json` with populated fields
3. Propose beats based on the brief content
4. Set `phase: "generating"` and begin slides

Do NOT force a multi-turn interview when the user already told you everything.

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

**CRITICAL: Every phase transition MUST be written to `deck-plan.json` immediately.** The web app renders a different UI for each phase. If you don't update the phase field, the user sees the wrong screen.

| Phase | Agent action | Gate | When to write phase change |
|---|---|---|---|
| `narrative` | Ask one interview question at a time and update metadata. | `title`, `audience`, and `keyMessage` are non-empty. | Write `phase: "structure"` to deck-plan.json BEFORE proposing beats. |
| `structure` | Propose and revise `narrative.beats[]`. | Beats include at least one `ask` or `plan` and each beat has a specific summary. | Write `phase: "generating"` to deck-plan.json BEFORE writing any slide files. |
| `generating` | Create `theme.css`, copy framework assets, and write slide fragments sequentially. | Every slide entry maps to an existing file. | Write `phase: "ready"` to deck-plan.json AFTER all slides have status `ready` or `fixed`. |
| `ready` | Handle per-slide edits, quality fixes, notes, and export preparation. | Every slide status is `ready` or `fixed`. | Write `phase: "exporting"` when user requests export. |
| `exporting` | Let the daemon assemble and run slidify; then repair fidelity issues. | `slidify.fidelityIssues[]` is reviewed and accepted or fixed. | Write `phase: "ready"` after repairs. |

### What happens if you skip phase updates

- If you write slides but leave `phase: "narrative"` → user sees the interview screen, not their slides
- If you write slides but don't add them to `slides[]` → user sees blank preview, no thumbnails
- If you set `phase: "ready"` but `slides[]` is empty → user sees an empty editor with 0/0 counter
- If the user gave a rich brief and you skip the interview → still create `deck-plan.json` with populated `title`, `audience`, `tone`, `keyMessage`, `narrative.beats[]` and set `phase: "structure"` or `"generating"` immediately

### When user provides a rich brief upfront

If the user's first message contains enough detail to skip the interview (audience, key points, decision/ask), do NOT force a multi-turn interview. Instead:

1. Create `deck-plan.json` immediately with populated metadata fields
2. Populate `narrative.beats[]` from their key points
3. Set `phase: "generating"` (skip `narrative` and `structure`)
4. Begin generating slides with proper plan synchronization

The interview is for users who need help building the story. Users who arrive with a clear brief should get slides fast.

## Slide Generation Loop

Generate slides sequentially. For EACH slide, follow this exact sequence:

### Before writing any slides

1. Read `deck/deck-plan.json`.
2. Verify `phase` is `"generating"`. If not, set it and write the plan.
3. Read `deck/theme.css` and the selected reference from `references/slide-types.md`.

### For each slide (repeat for every beat → slide mapping)

1. **Add slide entry to plan**: Read `deck-plan.json`, add a new entry to `slides[]` with `status: "generating"`, `file: "slides/{nn}-{slug}.html"`, and the beat mapping. **Write the updated plan to disk.**
2. **Write the slide fragment** at `deck/slides/{nn}-{slug}.html`.
3. Include one `<section class="slide" data-slide-id="{id}" data-slide-type="{type}">`.
4. Add `data-pptx-role="title"` to the slide title element.
5. Add `data-atom` when a native slidify atom fits.
6. Add `data-pptx-rasterize="true"` only for irreducible effects.
7. Run the quality gate checklist (see below).
8. **Update slide entry in plan**: Read `deck-plan.json`, set this slide's `status` to `"ready"` (or `"needs-data"` / `"needs-evidence"`), add `speakerNotes`. **Write the updated plan to disk.**

### After all slides are written

1. Read `deck-plan.json`.
2. Verify every slide has `status: "ready"` or `"fixed"` (or `"needs-data"`/`"needs-evidence"` for incomplete ones).
3. Set `phase: "ready"`.
4. **Write the updated plan to disk.** ← This makes the web app show the Slide Editor.

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
