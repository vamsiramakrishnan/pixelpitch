# Unified Deck Skill — Design Spec

## Context

Pixelpitch has 22 deck skills that are essentially the same authoring workflow with different visual themes bolted on. The result is a flat prompt-and-pray experience: user writes one sentence, agent produces 12 slides of placeholder content, user spends an hour fixing. No narrative phase, no per-slide editing, no structured evidence, no export feedback loop.

This spec replaces all 22 with a single narrative-first deck skill that produces structured output the web app renders as interactive UI — outline editor, slide planner, slide sorter, per-slide editor, and slidify export panel.

## Architecture Decision: Option C — Native Web Components + Agent Protocol

The agent writes structured JSON (`deck-plan.json`) and HTML fragments (`slides/*.html`). The web app renders phase-appropriate React components driven by the plan. The daemon assembles a final `deck.html` only at export time for slidify.

## Deck Folder Structure

```
deck/
  deck-plan.json       ← contract between agent and web app
  theme.css            ← design system tokens bound to :root
  framework.js         ← nav, keyboard, scaling, print (never agent-edited)
  slides/
    01-title.html      ← pure content fragment (~100-150 lines each)
    02-problem.html
    03-solution.html
    ...
```

### File Responsibilities

- **deck-plan.json**: Single source of truth for workflow phase, narrative beats, slide manifest, theme metadata, and export state. The web app polls or watches this file to determine which UI to render.
- **theme.css**: Design system tokens bound to `:root`. Generated from the selected design system's DESIGN.md. Shared across all slides — one source of truth for color, typography, spacing.
- **framework.js**: The load-bearing deck framework (1920×1080 scaling, keyboard nav, print layout). Copied from the skill's `assets/` directory. The agent never modifies it.
- **slides/*.html**: Pure `<section class="slide">` content fragments. No `<html>`, no `<head>`, no `<script>`. The web app inlines them into a preview srcdoc. Each is ~100-150 lines — small enough for focused agent context.

## deck-plan.json Schema

```typescript
interface DeckPlan {
  version: 1;
  phase: 'narrative' | 'structure' | 'generating' | 'ready' | 'exporting';
  
  // Deck metadata
  title: string;
  audience: string;
  tone: string;
  keyMessage: string;
  
  // Design system + theme
  designSystemId: string | null;
  themeId: string | null;           // visual theme preset (from content/themes/)
  
  // Narrative beats (phase: narrative → structure)
  narrative: {
    beats: Array<{
      id: string;
      type: 'context' | 'problem' | 'solution' | 'evidence' | 'how' | 'plan' | 'ask' | 'custom';
      label: string;
      summary: string;              // user-authored or user-approved one-liner
      evidenceType?: 'stat' | 'chart' | 'diagram' | 'quote' | 'screenshot' | 'table' | 'none';
      dataPoints?: string[];        // specific numbers/facts the user provided
    }>;
  };
  
  // Slide manifest (phase: structure → ready)
  slides: Array<{
    id: string;
    beatId: string;                 // links back to narrative beat
    type: 'title' | 'section' | 'content' | 'data' | 'diagram' | 'image' | 'quote' | 'cta';
    title: string;
    file: string;                   // relative path: slides/01-title.html
    status: 'pending' | 'generating' | 'ready' | 'needs-evidence' | 'needs-data' | 'fixed';
    speakerNotes: string;
    qualityIssues?: string[];       // populated by agent self-critique
  }>;
  
  // Export state
  slidify: {
    lastExport: string | null;      // ISO timestamp
    fidelityIssues: Array<{
      slideId: string;
      issue: string;                // 'rasterized' | 'overflow' | 'font-missing' | 'layout-drift'
      detail: string;
      severity: 'info' | 'warning' | 'error';
    }>;
  };
}
```

## Hybrid Stitching Model

Each layer activates at the right moment:

| Layer | When | What it does |
|-------|------|-------------|
| **Agent** | Authoring | Writes slide fragments, theme.css, deck-plan.json. Never assembles. Tokens go to design quality. |
| **Web app** | Preview | Reads deck-plan.json, fetches slide files, builds srcdoc dynamically. Instant preview, no file write. |
| **Daemon** | Export | Reads deck-plan.json, inlines all fragments into deck.html, runs slidify. Only materializes deck.html on demand. |
| **Agent** | Post-export repair | Reads slidify fidelity report, fixes individual slide fragments, daemon re-exports. |

## Workflow Phases & UI Components

### Phase 1: Narrative Interview

**Agent behavior**: Emits structured question forms (QuestionForm protocol) one at a time. Each answer updates `deck-plan.json` metadata fields (audience, tone, keyMessage).

**Web app renders**: Split view.
- Left: Chat pane with visual question forms (direction-cards for tone, pills for audience type, text input for key message).
- Right: **Story Canvas** — a live card stack that fills in as each question is answered. Cards for Audience, Key Message, Tone, Decision Needed. The user sees their story parameters crystallizing in real-time.

**Transition**: Agent writes initial `narrative.beats[]` array and sets `phase: 'structure'`.

### Phase 2: Narrative Outline

**Agent behavior**: Proposes beat sequence based on interview answers. Writes `narrative.beats[]` to deck-plan.json.

**Web app renders**: Full-width **Outline Editor**.
- Draggable beat cards with colored type badges (Context=blue, Problem=red, Solution=green, Evidence=purple, How=amber, Plan=gray, Ask=blue-accent).
- Each card shows: type badge, user's one-line summary, slide type hint.
- Controls: drag-reorder, add beat, remove beat, edit summary inline.
- "Proceed to slides" button gates next phase.

**User interaction**: The user reorders, edits, adds, removes beats. Changes write back to deck-plan.json (via web app → daemon API or direct file write).

**Transition**: User clicks "Proceed to slides" → agent maps beats to slide entries, sets `phase: 'generating'`.

### Phase 3: Slide Generation

**Agent behavior**: Generates each slide fragment sequentially. For each slide:
1. Reads `theme.css` (80 lines) + the beat's content intent from `deck-plan.json`.
2. Writes `slides/{nn}-{slug}.html` (~100-150 lines).
3. Updates `deck-plan.json` slide status to `'ready'` or `'needs-evidence'`.
4. Runs self-critique: checks for placeholder text, vague headlines, missing data.

**Web app renders**: **Slide Sorter** with live thumbnails.
- Thumbnail grid (4 per row) with quality badges: green (ready), amber (needs evidence/data), red (placeholder detected).
- Each thumbnail is a mini-preview rendered via the stitched srcdoc.
- Warning bar at bottom lists slides needing attention with "Fix in chat" links.
- Clicking a thumbnail opens the slide editor (Phase 4 view).

**Transition**: All slides reach `'ready'` status → agent sets `phase: 'ready'`.

### Phase 4: Slide Editor (Polish)

**Agent behavior**: Responds to per-slide chat. Reads only theme.css + the target slide fragment (200 lines context). Edits the specific slide file. Never touches other slides.

**Web app renders**: **Deck Workspace** (the polished UI from the mockup).
- Top bar: phase dots, deck title, Present + Export buttons.
- Left: Chat pane scoped to the active slide (badge shows "Slide N").
- Center: Thumbnail strip (horizontal, scrollable), full-size slide preview in iframe, slide nav (‹ 4/7 ›).
- Bottom: Speaker notes bar with confidence indicator.
- Question forms appear inline in chat when the agent needs user input (evidence data, real numbers, screenshot upload).

### Phase 5: Export

**Agent behavior**: On export request, agent optionally runs a final consistency check. Daemon handles the actual export.

**Web app renders**: **Export Panel** overlay.
- Progress bar for slidify conversion.
- Fidelity report: table of slides with native/hybrid/raster indicators.
- Download button for PPTX.
- "Fix & re-export" button for slides with fidelity issues (routes to slide editor with agent scoped to the flagged slide).

## Craft Rules Integration

### How craft rules flow into the skill

The unified deck skill declares craft requirements in its frontmatter:

```yaml
pixelpitch:
  mode: deck
  craft:
    requires: [anti-ai-slop, color, typography, slidify-compat]
```

The daemon's existing `composeSystemPrompt()` (in `prompts/system.ts:136-144`) injects craft bodies **after the design system but before the skill body**. This means:

1. **Design system** sets the token values (palette, fonts, spacing).
2. **Craft rules** set how to use the tokens (contrast ratios, accent caps, type hierarchy, slidify hints).
3. **Skill body** sets the workflow (narrative interview, slide generation, self-critique).

### Per-craft-rule role in deck authoring

| Craft Rule | Role in Deck Skill |
|------------|-------------------|
| `anti-ai-slop` | Enforces specific headlines ("40% latency reduction" not "significant improvement"), prevents placeholder text ("[TBD]"), blocks generic narrative arcs. The agent pushes back on vague beats during the narrative interview. |
| `color` | Enforces contrast ratios on slide content against dark/light backgrounds, limits accent color usage to 2-3 per deck, prevents gradient abuse. |
| `typography` | Enforces type hierarchy across slides — hero stat sizes, body text minimums, heading/subheading relationships. Prevents the "everything is 14px" problem. |
| `slidify-compat` | Teaches the agent to annotate HTML with `data-pptx-*` hints. Agent uses `data-atom` for native patterns, `data-pptx-rasterize` for irreducible effects. Does NOT constrain design — just annotates for conversion. |

### The non-kneecapping principle

From `slidify-compat.md`:
> "Skills don't constrain themselves to slidify's current capabilities. Use backdrop-filter, mix-blend-mode, custom WebGL shaders, bg-clip-text gradient headlines, every modern Tailwind utility — whatever makes the deck designer-grade."

The deck skill follows this. It uses the full design system palette. It pushes visual boundaries. Slidify handles conversion via the three-tier system:
1. **Native atom** — slidify emits native PPTX shapes.
2. **Hybrid recipe** — editable text + rasterized effect layer.
3. **Clean preserved raster** — pixel-perfect fallback for irreducible effects.

The fidelity report tells the user what happened. The agent can fix issues if the user wants higher editability.

## Design System Integration

### How design systems bind to decks

1. User selects a design system during project creation (existing DesignSystemPicker).
2. The daemon resolves the DESIGN.md body and passes it to `composeSystemPrompt()` as `designSystemBody`.
3. The agent reads the design system tokens and generates `theme.css`:
   - Extracts color palette → CSS custom properties on `:root`
   - Extracts font families → `@import` or font-face declarations
   - Extracts spacing scale → spacing tokens
   - Extracts component patterns → slide-specific classes

4. `theme.css` is the materialized bridge between the design system (prose DESIGN.md) and the slide HTML (CSS custom properties).

### Multi-design-system blending

The existing `inspirationDesignSystemIds` mechanism (from NewProjectPanel) carries through. The agent can reference multiple design systems:
- **Primary**: governs color palette and typography.
- **Inspirations**: contribute specific patterns (e.g., Apple's hero stat layout with Stripe's data visualization style).

### No design system = full creative freedom

When no design system is selected, the agent has unconstrained creative freedom, guided only by craft rules. This is the "freeform" path — the agent invents a visual language from the prompt context.

## Visual Themes (Extracted from 22 Skills)

The 22 existing deck skills become theme presets in `content/themes/`:

```
content/themes/
  tech-sharing/       ← from html-ppt-tech-sharing
  product-launch/     ← from html-ppt-product-launch
  weekly-report/      ← from html-ppt-weekly-report
  pitch-deck/         ← from html-ppt-pitch-deck
  editorial/          ← from html-ppt-taste-editorial
  brutalist/          ← from html-ppt-taste-brutalist
  course-module/      ← from html-ppt-course-module
  ...
```

Each theme directory contains:
- `THEME.md`: visual description, sample layouts, recommended slide types.
- `example.html`: reference rendering.

Themes are orthogonal to design systems:
- **Design system** = brand identity (Apple, Stripe, Google Cloud).
- **Theme** = presentation style (tech-sharing, pitch-deck, editorial).
- Any design system × any theme = valid combination.

The agent applies the theme's layout patterns while binding the design system's tokens.

## Anti-Strawman Contract

Rules the skill enforces through its workflow body and craft rule integration:

1. **No placeholder text** — if the agent lacks real content, it emits a question form asking for it. Slides with `[TBD]`, `[X%]`, or `[insert]` get `status: 'needs-data'`.
2. **Every data slide references a user-provided number** — the agent doesn't invent statistics. It asks.
3. **Every diagram is generated, not described** — architecture slides use inline SVG from Mermaid syntax or direct SVG authoring. Never "boxes labeled Service A → Service B."
4. **Headlines are specific** — anti-ai-slop craft rule enforces "40% latency reduction in 6 weeks" not "Significant performance improvement."
5. **Speaker notes are mandatory** — the agent writes them and the user reviews. The notes are the proof the user can present the slide.
6. **The agent pushes back** — during narrative interview, the agent challenges vague beats: "What specifically happened at the reference customer? Give me a number."
7. **Quality badges are visible** — every slide thumbnail shows its quality state. The user can't export without addressing red badges.

## Web App Components to Build

| Component | Location | Purpose |
|-----------|----------|---------|
| `DeckWorkspace` | `apps/web/src/components/deck/DeckWorkspace.tsx` | Top-level orchestrator — reads deck-plan.json, renders phase-appropriate child |
| `StoryCanvas` | `apps/web/src/components/deck/StoryCanvas.tsx` | Live card stack during narrative interview |
| `OutlineEditor` | `apps/web/src/components/deck/OutlineEditor.tsx` | Draggable beat list with type badges |
| `SlidePlanner` | `apps/web/src/components/deck/SlidePlanner.tsx` | Content cards with evidence type selector + live preview |
| `SlideSorter` | `apps/web/src/components/deck/SlideSorter.tsx` | Thumbnail grid with quality badges |
| `SlideEditor` | `apps/web/src/components/deck/SlideEditor.tsx` | Full preview + scoped chat + speaker notes |
| `SlideStrip` | `apps/web/src/components/deck/SlideStrip.tsx` | Horizontal thumbnail strip with nav |
| `ExportPanel` | `apps/web/src/components/deck/ExportPanel.tsx` | Slidify progress, fidelity report, download |
| `DeckPhaseBar` | `apps/web/src/components/deck/DeckPhaseBar.tsx` | Phase progress dots in topbar |

## Daemon Changes

| Change | File | Purpose |
|--------|------|---------|
| Deck assembly endpoint | `apps/daemon/src/server.ts` | `POST /api/projects/:id/deck/assemble` — reads deck-plan.json, inlines slides, writes deck.html |
| Slidify export endpoint | `apps/daemon/src/server.ts` | `POST /api/projects/:id/deck/export` — runs slidify on assembled deck.html, returns fidelity report |
| deck-plan.json watcher | `apps/daemon/src/server.ts` | Optional: notify web app via SSE when deck-plan.json changes |

## Contracts Changes

| Change | File | Purpose |
|--------|------|---------|
| `DeckPlan` type | `packages/contracts/src/api/deck.ts` | TypeScript interface for deck-plan.json schema |
| `DeckPhase` union | `packages/contracts/src/api/deck.ts` | Phase type union |
| `SlideSummary` type | `packages/contracts/src/api/deck.ts` | Per-slide metadata for web app rendering |
| `FidelityIssue` type | `packages/contracts/src/api/deck.ts` | Slidify fidelity report item |

## Skill Content

| File | Purpose |
|------|---------|
| `content/skills/deck/SKILL.md` | Unified deck skill — narrative interview protocol, slide generation workflow, self-critique rules, anti-strawman enforcement |
| `content/skills/deck/assets/framework.js` | Deck framework (nav, scaling, print) — copied into each deck folder |
| `content/skills/deck/assets/framework.css` | Framework base styles (slide sizing, transitions) |
| `content/skills/deck/references/slide-types.md` | Catalog of slide type layouts the agent can use |
| `content/skills/deck/references/narrative-patterns.md` | Common narrative arc patterns (problem-solution, journey, comparison, etc.) |

## Verification

1. **Typecheck**: `bun run --filter @pixelpitch/web typecheck` — all new components type-clean.
2. **Unit tests**: DeckPlan schema validation, srcdoc stitching, outline editor drag-reorder.
3. **Integration**: Create a deck project, go through narrative → structure → generate → polish → export flow end-to-end.
4. **Visual**: Dark mode, responsive behavior, thumbnail rendering, slide navigation.
5. **Slidify**: Export a generated deck and verify the fidelity report is accurate.

## Harness Collaboration Plan

Divide work across three harnesses with disjoint ownership:

| Harness | Owns | Work |
|---------|------|------|
| **Codex** | `content/skills/deck/`, `content/themes/` | Build the unified SKILL.md, extract theme presets from 22 existing skills, write narrative-patterns.md and slide-types.md references |
| **Gemini** | `packages/contracts/src/api/deck.ts`, `apps/daemon/src/` | DeckPlan TypeScript types, deck assembly endpoint, slidify export endpoint |
| **Claude** | `apps/web/src/components/deck/` | All 9 React components: DeckWorkspace, StoryCanvas, OutlineEditor, SlidePlanner, SlideSorter, SlideEditor, SlideStrip, ExportPanel, DeckPhaseBar |
