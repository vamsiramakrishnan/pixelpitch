# Unified Deck Skill — Design Spec

## Context

Pixelpitch has 22 deck skills that are essentially the same authoring workflow with different visual themes bolted on. The result is a flat prompt-and-pray experience: user writes one sentence, agent produces 12 slides of placeholder content, user spends an hour fixing. No narrative phase, no per-slide editing, no structured evidence, no export feedback loop.

This spec composes all 22 through a single narrative-first deck skill that produces structured output the web app renders as interactive UI — outline editor, slide planner, slide sorter, per-slide editor, and slidify export panel. Existing skills stay callable as standalone skills; the unified deck skill reads them as framework, theme, scenario, format, and craft inputs.

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

The `deck-plan.json` is the central contract. It is versioned and strictly validated at each phase transition.

```typescript
interface DeckPlan {
  version: 1;                       // Incremented on breaking schema changes
  phase: DeckPhase;
  
  // Deck metadata
  title: string;
  audience: string;
  tone: string;
  keyMessage: string;
  
  // Composition: Selected layers for the deck
  composition: {
    frameworkId: string;            // e.g., 'html-ppt', 'replit-deck'
    themeId: string;                // e.g., 'tokyo-night.css'
    format: '16:9' | '3:4' | 'A4';
    runtime: string;                // path to framework.js
    designSystemId: string | null;
  };
  
  // Interview History: Preserves the narrative discovery phase
  interview: {
    history: Array<{
      questionId: string;
      question: string;
      answer: string;
      timestamp: string;
    }>;
    pendingQuestionId?: string;     // If an interview is in-flight
  };
  
  // Narrative beats (phase: narrative → structure)
  narrative: {
    beats: DeckBeat[];
  };
  
  // Slide manifest (phase: structure → ready)
  slides: DeckSlide[];
  
  // Export state
  slidify: {
    lastExport: string | null;      // ISO timestamp
    fidelityIssues: FidelityIssue[];
    exportPath?: string;            // relative path to produced .pptx
  };
}

type DeckPhase = 'narrative' | 'structure' | 'generating' | 'ready' | 'exporting';

interface DeckBeat {
  id: string;
  type: 'context' | 'problem' | 'solution' | 'evidence' | 'how' | 'plan' | 'ask' | 'custom';
  label: string;
  summary: string;
  evidenceType?: 'stat' | 'chart' | 'diagram' | 'quote' | 'screenshot' | 'table' | 'none';
  dataPoints?: string[];
}

interface DeckSlide {
  id: string;
  beatId: string;
  type: string;                     // maps to archetype in slide-types.md
  title: string;
  file: string;                     // slides/01-title.html
  status: 'pending' | 'generating' | 'ready' | 'needs-evidence' | 'needs-data' | 'fixed';
  speakerNotes: string;
  qualityIssues?: string[];
}

interface FidelityIssue {
  slideId: string;
  issue: 'rasterized' | 'overflow' | 'font-missing' | 'layout-drift';
  detail: string;
  severity: 'info' | 'warning' | 'error';
}
```

### Version Migration & Validation

- **Migration**: The daemon's `DeckManager` service handles migrations. `version: 1` introduces the structured `composition` and `interview` blocks. `version: 0` (legacy) assumes a flat `themeId` and no narrative history.
- **Validation Rules**:
  - **Phase: narrative**: `title`, `audience`, and `keyMessage` must be non-empty before transitioning to `structure`.
  - **Phase: structure**: `narrative.beats[]` must contain at least one 'ask' or 'plan' beat.
  - **Phase: generating**: Each slide must map to a valid file on disk.
  - **Phase: ready**: All slides must have `status: 'ready'` or `status: 'fixed'`.

## Hybrid Stitching Model

Each layer activates at the right moment:

| Layer | When | What it does |
|-------|------|-------------|
| **Agent** | Authoring | Writes slide fragments, theme.css, deck-plan.json. Never assembles. Tokens go to design quality. |
| **Web app** | Preview | Reads deck-plan.json, fetches slide files, builds srcdoc dynamically. Instant preview, no file write. |
| **Daemon** | Export | Reads deck-plan.json, inlines all fragments into deck.html, runs slidify. Only materializes deck.html on demand. |
| **Agent** | Post-export repair | Reads slidify fidelity report, fixes individual slide fragments, daemon re-exports. |

### Stitched HTML Structure (srcdoc)

The web app builds the preview `srcdoc` by wrapping fragments in a standard shell:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/api/projects/:id/files/deck/framework.css">
  <link rel="stylesheet" href="/api/projects/:id/files/deck/theme.css">
  <script src="/api/projects/:id/files/deck/framework.js" defer></script>
</head>
<body class="deck-runtime">
  <div class="slides-container">
    <!-- Web app inlines the active slide fragment here -->
    <section class="slide" data-slide-id="01-title">
      <h1>Title Content</h1>
    </section>
  </div>
</body>
</html>
```

### Live Preview Sync

1. Web app watches `deck-plan.json` and `slides/*.html` via existing file watch events.
2. When a slide fragment changes (agent stream or manual edit), the web app re-fetches the specific fragment.
3. The `srcdoc` is updated in the iframe. Because `framework.js` is built to be stateless/re-initializable, the preview remains stable without a full page reload.

## Workflow Phases & UI Components

### Phase 1: Narrative Interview

**Agent behavior**: Emits structured question forms (QuestionForm protocol) one at a time. Each answer updates `deck-plan.json` metadata fields (audience, tone, keyMessage).
- **Daemon Behavior**: The daemon detects the `narrative: true` flag and allows the agent to maintain a long-running interview state. It emits SSE events of type `deck:interview:question` when the agent requests input.

**Web app renders**: Split view.
- Left: Chat pane with visual question forms (direction-cards for tone, pills for audience type, text input for key message).
- Right: **Story Canvas** — a live card stack that fills in as each question is answered. Cards for Audience, Key Message, Tone, Decision Needed. The user sees their story parameters crystallizing in real-time.

**Transition**: Agent writes initial `narrative.beats[]` array and sets `phase: 'structure'`. Daemon emits `deck:phase:changed`.

### Phase 2: Narrative Outline

**Agent behavior**: Proposes beat sequence based on interview answers. Writes `narrative.beats[]` to deck-plan.json.
- **Daemon Behavior**: Validates that beats are logically connected to the key message.

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
- **Daemon Behavior**: Routes chat messages to the agent with a "per-slide" prompt decorator. The daemon automatically injects the active slide's HTML fragment into the prompt's `extraContext`.

**Web app renders**: **Deck Workspace** (the polished UI from the mockup).
- Top bar: phase dots, deck title, Present + Export buttons.
- Left: Chat pane scoped to the active slide (badge shows "Slide N").
- Center: Thumbnail strip (horizontal, scrollable), full-size slide preview in iframe, slide nav (‹ 4/7 ›).
- Bottom: Speaker notes bar with confidence indicator.
- Question forms appear inline in chat when the agent needs user input (evidence data, real numbers, screenshot upload).

### Phase 5: Export

**Agent behavior**: On export request, agent optionally runs a final consistency check. Daemon handles the actual export.
- **Daemon Behavior**: Invokes the `assemble` logic followed by the `slidify` CLI. Writes the fidelity report back to `deck-plan.json`.

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

### `content/craft/deck-authoring.md` outline

Create one deck-specific craft file that composes the reusable craft rules into an agent-readable operating manual. It should not duplicate every rule verbatim; it should name the source rule, state the deck-specific interpretation, and define precedence.

| Section | Contents |
|---------|----------|
| `# Deck Authoring Craft` | Scope: narrative decks, web previews, slidify export, slide fragments. States that this file composes `anti-ai-slop`, `color`, `typography`, and `slidify-compat`. |
| `## Precedence` | Ordered conflict rules: user-approved facts > design system tokens > anti-ai-slop content specificity > typography hierarchy > color contrast/accessibility > slidify annotations. |
| `## Conflict Resolution` | Explicit cases: anti-ai-slop can block vague copy even if layout is ready; slidify-compat can require attributes but cannot force plain visuals; color can reject inaccessible theme combinations; typography can split overloaded slides. |
| `## Narrative Specificity` | Beat quality requirements, concrete headlines, evidence gates, no invented stats, no placeholder labels. Links back to Anti-Strawman Contract. |
| `## Slide Density` | Per-slide text budgets, one job per slide, when to split beats, when to combine small beats, max cards/columns per archetype. |
| `## Theme Rhythm` | Alternation rules from `simple-deck` and `guizang-ppt`: avoid 3+ same-surface slides, use section dividers for breath, reserve hero slides for pivots. |
| `## Typography` | Display/body roles, minimum readable sizes, line-length targets, no all-caps paragraphs, hero stat treatment. |
| `## Color` | Contrast, accent caps, data color semantics, warning/error color preservation, theme/design-system token binding. |
| `## Motion and FX` | At most 1-2 animation families per slide, one canvas FX per slide, reduced-motion must remain respected. |
| `## Slidify Compatibility` | Required `data-pptx-*` / `data-atom` hints, native vs hybrid vs raster policy, export repair loop. |
| `## Quality Gate` | Checklist the agent runs before setting slide `status: ready`. Same gate appears in the Anti-Strawman section. |

#### Precedence examples

| Situation | Rule |
|-----------|------|
| A branded DESIGN.md uses low-contrast pale text on pale cards | `color` wins for accessibility; keep the palette but adjust token pairing. |
| A slide uses gradient text and `mix-blend-mode`, but slidify may rasterize it | `slidify-compat` adds conversion hints; it does not remove the effect unless the user asks for editability. |
| A layout has room for "Improve productivity" as a headline | `anti-ai-slop` blocks it until the beat states who improved, by how much, and over what timeframe. |
| A dense data table is faithful to the source but unreadable at 1920×1080 | `typography` and slide-density rules split it into a table slide plus a takeaway slide. |

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

## Visual Themes (Composed from Existing Skills)

The 22 existing deck skills should be referenced in-place, not copied into a new `content/themes/` tree. The audit found the reusable theme assets already live in the `html-ppt` skill, and the full-deck visual directions already live as scoped templates:

```
content/skills/html-ppt/assets/themes/           ← 36 reusable theme CSS files
content/skills/html-ppt/templates/full-decks/    ← 15 scoped full-deck templates
content/skills/html-ppt-*/SKILL.md               ← theme/scenario/taste descriptors
content/skills/replit-deck/references/themes.md  ← 8 Replit visual systems
content/skills/guizang-ppt/references/themes.md  ← 5 magazine/editorial systems
```

The unified deck skill should treat those paths as catalogs:

| Source | Use |
|--------|-----|
| `html-ppt/assets/themes/*.css` | Token-level visual presets that can bind to any narrative scenario. |
| `html-ppt/templates/full-decks/<id>/index.html` + `style.css` | Full visual systems with scoped `.tpl-<id>` structure, useful when the scenario exactly matches. |
| `html-ppt-*/SKILL.md` | Natural-language theme, scenario, and taste instructions; read for voice, layout intent, and anti-patterns. |
| `replit-deck/references/themes.md` | Board-deck and memo-like visual systems: helix, holm, vance, bevel, world-dark, world-mint, atlas, bluehouse. |
| `guizang-ppt/references/themes.md` | Magazine/storytelling systems: Monocle default, Indigo Porcelain, Forest Ink, Kraft Paper, Dune. |

### Reference, do not copy

- Do not create `content/themes/` as a duplicate source of truth.
- `themeId` in `deck-plan.json` can point to a theme CSS basename (`tokyo-night`) or a full-deck template id (`knowledge-arch-blueprint`).
- Generated `deck/theme.css` is the project-local materialization after binding a design system, selected theme, and narrative need.
- Full-deck template CSS stays scoped under `.tpl-<name>` when borrowed; the deck skill extracts patterns and token intent, not an unscoped CSS dump.

The earlier draft shape below is retained only as an anti-goal; these directories should not be created:

```
content/themes/
  tech-sharing/       ← use content/skills/html-ppt-tech-sharing/SKILL.md + html-ppt templates instead
  product-launch/     ← use content/skills/html-ppt-product-launch/SKILL.md + html-ppt templates instead
  weekly-report/      ← use content/skills/html-ppt-weekly-report/SKILL.md + html-ppt templates instead
  pitch-deck/         ← use content/skills/html-ppt-pitch-deck/SKILL.md + html-ppt templates instead
  editorial/          ← use content/skills/html-ppt-taste-editorial/SKILL.md instead
  brutalist/          ← use content/skills/html-ppt-taste-brutalist/SKILL.md instead
  course-module/      ← use content/skills/html-ppt-course-module/SKILL.md + full-deck template instead
```

Themes are orthogonal to design systems:
- **Design system** = brand identity (Apple, Stripe, Google Cloud).
- **Theme** = presentation style (tech-sharing, pitch-deck, editorial).
- Any design system × any theme = valid combination.

The agent applies the theme's layout patterns while binding the design system's tokens.

### Theme catalogs

#### `html-ppt/assets/themes/` — 36 CSS themes

| Theme CSS | Mood / best use |
|-----------|-----------------|
| `academic-paper.css` | Scholarly, restrained, citation-friendly research decks. |
| `arctic-cool.css` | Cool, airy, pale blue technical explainers. |
| `aurora.css` | Atmospheric, luminous, soft high-tech narratives. |
| `bauhaus.css` | Geometric, primary-color, design-history or product principle decks. |
| `blueprint.css` | Engineering plan, schematic thinking, architecture walkthroughs. |
| `catppuccin-latte.css` | Friendly light developer aesthetic. |
| `catppuccin-mocha.css` | Friendly dark developer aesthetic. |
| `corporate-clean.css` | Conservative business updates, exec reviews, operating plans. |
| `cyberpunk-neon.css` | High-energy security, AI, systems, or launch decks. |
| `dracula.css` | Dark code/editor feel for developer talks. |
| `editorial-serif.css` | Premium essay, thought leadership, taste-forward strategy. |
| `engineering-whiteprint.css` | Crisp whiteboard/diagram decks for technical audiences. |
| `glassmorphism.css` | Layered translucent product or AI interface concepts. |
| `gruvbox-dark.css` | Warm dark terminal/developer vibe. |
| `japanese-minimal.css` | Quiet, spacious, precise, ceremony-like presentations. |
| `magazine-bold.css` | Editorial covers, bold opinion, image-led stories. |
| `memphis-pop.css` | Playful consumer, education, youth/social energy. |
| `midcentury.css` | Warm retro-modern, tasteful product or culture decks. |
| `minimal-white.css` | Clean default, high readability, broad business use. |
| `neo-brutalism.css` | Loud, hard-edged, opinionated, anti-polish decks. |
| `news-broadcast.css` | Urgent briefings, market updates, incident summaries. |
| `nord.css` | Calm dark technical decks with muted blues. |
| `pitch-deck-vc.css` | Fundraising, market, traction, ask, investor rhythm. |
| `rainbow-gradient.css` | High-energy creative/product launch moments. |
| `retro-tv.css` | Nostalgic media, culture, analog-tech references. |
| `rose-pine.css` | Soft dark, elegant, indie/developer storytelling. |
| `sharp-mono.css` | Stark monospace, audit, systems, CLI, infra decks. |
| `soft-pastel.css` | Gentle lifestyle, learning, wellness, accessible explainers. |
| `solarized-light.css` | Code/documentation decks with low-glare light palette. |
| `sunset-warm.css` | Warm persuasive narratives, community, customer stories. |
| `swiss-grid.css` | Structured, typographic, institutional, high-clarity decks. |
| `terminal-green.css` | CLI, cybersecurity, retro terminal, operational logs. |
| `tokyo-night.css` | Sleek dark developer/AI product decks. |
| `vaporwave.css` | Retro-futurist, internet culture, expressive launch decks. |
| `xiaohongshu-white.css` | White editorial social carousel / XHS style. |
| `y2k-chrome.css` | Metallic, glossy, fashion-tech, Y2K campaign decks. |

#### `html-ppt/templates/full-decks/` — 15 scoped visual systems

| Template id | Mood / best use |
|-------------|-----------------|
| `course-module` | Lesson sequence, learning objectives, checkpoints, recap. |
| `dir-key-nav-minimal` | Minimal keynote, one idea per slide, high negative space. |
| `graphify-dark-graph` | Dark knowledge graph, AI-native dev tools, data/network launches. |
| `hermes-cyber-terminal` | Honest CLI review, terminal traces, benchmarks, diffs. |
| `knowledge-arch-blueprint` | Cream blueprint architecture, systems maps, white-paper diagrams. |
| `obsidian-claude-gradient` | GitHub-dark purple gradient, MCP/agent/dev workflow tutorials. |
| `pitch-deck` | Investor sequence, market/problem/solution/traction/ask. |
| `presenter-mode-reveal` | Talk runtime with speaker tools and reveal-oriented pacing. |
| `product-launch` | Feature reveal, positioning, proof, CTA. |
| `tech-sharing` | Engineering education, explainers, demos, architecture. |
| `testing-safety-alert` | Safety, risk, incident, red-team, policy-as-code warning tone. |
| `weekly-report` | Operating cadence, status, metrics, blockers, next steps. |
| `xhs-pastel-card` | Soft macaron social/lifestyle carousel. |
| `xhs-post` | 3:4 portrait XHS carousel format. |
| `xhs-white-editorial` | White editorial Chinese-first social/deck hybrid. |

## Anti-Strawman Contract

Rules the skill enforces through its workflow body and craft rule integration:

1. **No placeholder text** — if the agent lacks real content, it emits a question form asking for it. Slides with `[TBD]`, `[X%]`, or `[insert]` get `status: 'needs-data'`.
2. **Every data slide references a user-provided number** — the agent doesn't invent statistics. It asks.
3. **Every diagram is generated, not described** — architecture slides use inline SVG from Mermaid syntax or direct SVG authoring. Never "boxes labeled Service A → Service B."
4. **Headlines are specific** — anti-ai-slop craft rule enforces "40% latency reduction in 6 weeks" not "Significant performance improvement."
5. **Speaker notes are mandatory** — the agent writes them and the user reviews. The notes are the proof the user can present the slide.
6. **The agent pushes back** — during narrative interview, the agent challenges vague beats: "What specifically happened at the reference customer? Give me a number."
7. **Quality badges are visible** — every slide thumbnail shows its quality state. The user can't export without addressing red badges.

### Beat specificity examples

| Vague beat | Specific beat |
|------------|---------------|
| "Show traction." | "Show 42 paying teams, $18.6K MRR, and 31% month-over-month growth from Feb-Apr 2026." |
| "Explain the architecture." | "Explain how the daemon watches `deck-plan.json`, stitches slide fragments, then runs slidify only during export." |
| "Talk about customers." | "Use the Northwind Studios quote about first-month payback and show the $1,800 to $200 bandwidth drop." |
| "Discuss risks." | "List the three launch blockers: font licensing, PPTX rasterization on blend effects, and missing export retry telemetry." |
| "Make an ask slide." | "Ask for a decision today: approve two engineers for six weeks to build deck assembly and export repair." |

### Agent pushback prompt

When a beat fails specificity, the agent should not silently invent content. It should write a concise form or chat prompt like:

```markdown
I can make this slide strong, but the current beat is too vague to render without filler.

Please provide one of these:
- a number, date, customer name, artifact, or before/after comparison;
- the exact decision this slide should drive;
- permission to mark the slide `needs-evidence` and keep it out of export until filled.

Current beat: "Show traction"
Better shape: "Show [metric] changed from [before] to [after] over [timeframe], because [cause]."
```

### Slide-ready quality gate

Before setting a slide to `status: 'ready'`, the agent checks:

| Gate | Ready condition | Failing status |
|------|-----------------|----------------|
| Beat linkage | Slide maps to one `beatId` and advances that beat. | `needs-evidence` |
| Headline | Headline names a concrete actor, claim, metric, or decision. | `needs-evidence` |
| Evidence | Stats, quotes, charts, screenshots, and tables come from user-provided inputs or clearly labeled source material. | `needs-data` |
| No placeholders | No `[TBD]`, `[X]`, lorem ipsum, generic labels, fake company/customer names, or invented charts. | `needs-data` |
| Layout fit | Content fits 1920×1080 without overflow, clipped text, or illegible type. | `fixed` |
| Visual role | The selected layout matches the beat type: data slide for numbers, diagram slide for systems, CTA for ask. | `fixed` |
| Theme rhythm | Deck does not stack 3+ same-surface slides unless intentionally approved. | `fixed` |
| Speaker notes | Notes explain what the presenter should say and include the evidence source or caveat. | `needs-evidence` |
| Slidify hints | Native/hybrid/rasterizable elements have appropriate `data-pptx-*` / `data-atom` hints. | `fixed` |

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

The daemon provides the orchestration layer between the agent's file outputs and the web app's UI.

### API Contracts

#### `POST /api/projects/:id/deck/assemble`
Assembles the slide fragments into a monolithic `deck.html`.
- **Request**: Empty (uses current project state)
- **Response**: `DeckAssembleResponse`
- **Error Cases**:
  - `404`: `deck-plan.json` missing
  - `422`: Slide fragment missing for an entry in the manifest

#### `POST /api/projects/:id/deck/export`
Invokes `slidify` to produce a `.pptx` and generates a fidelity report.
- **Request**: `DeckExportRequest`
- **Response**: `DeckExportResponse`
- **Process**:
  1. Internal call to `assemble`.
  2. Runs `slidify deck.html --output deck.pptx`.
  3. Parses `slidify` logs to produce `FidelityIssue[]`.
  4. Updates `deck-plan.json` with the report.

#### `GET /api/projects/:id/deck/plan`
Reads the current `deck-plan.json`.
- **Response**: `DeckPlan`

### SSE Events
The daemon emits events over the existing project SSE stream:
- `deck:plan:updated`: Triggered when `deck-plan.json` is modified on disk.
- `deck:phase:changed`: Triggered when the `phase` field changes.
- `deck:interview:question`: Triggered when the agent needs input during Phase 1.
- `deck:export:progress`: Periodic updates during the `slidify` run.

### Per-Slide Chat Routing
When the web app sends a message with `scope: { type: 'slide', id: string }`:
1. The daemon resolves the slide's HTML fragment path from `deck-plan.json`.
2. It reads the fragment and `theme.css`.
3. It constructs a focused prompt where the `extraContext` includes *only* these two files, ensuring the agent remains focused on the active slide.

## Contracts Changes

New types in `packages/contracts/src/api/deck.ts` to support the unified deck workflow.

```typescript
/**
 * Core Deck Plan contract
 */
export interface DeckPlan {
  version: number;
  phase: DeckPhase;
  title: string;
  audience: string;
  tone: string;
  keyMessage: string;
  composition: DeckComposition;
  interview: DeckInterview;
  narrative: {
    beats: DeckBeat[];
  };
  slides: DeckSlide[];
  slidify: DeckExportState;
}

export type DeckPhase = 'narrative' | 'structure' | 'generating' | 'ready' | 'exporting';

export interface DeckComposition {
  frameworkId: string;
  themeId: string;
  format: '16:9' | '3:4' | 'A4';
  runtime: string;
  designSystemId: string | null;
}

export interface DeckInterview {
  history: Array<{
    questionId: string;
    question: string;
    answer: string;
    timestamp: string;
  }>;
  pendingQuestionId?: string;
}

export interface DeckBeat {
  id: string;
  type: DeckBeatType;
  label: string;
  summary: string;
  evidenceType?: DeckEvidenceType;
  dataPoints?: string[];
}

export type DeckBeatType = 'context' | 'problem' | 'solution' | 'evidence' | 'how' | 'plan' | 'ask' | 'custom';
export type DeckEvidenceType = 'stat' | 'chart' | 'diagram' | 'quote' | 'screenshot' | 'table' | 'none';

export interface DeckSlide {
  id: string;
  beatId: string;
  type: string;
  title: string;
  file: string;
  status: DeckSlideStatus;
  speakerNotes: string;
  qualityIssues?: string[];
}

export type DeckSlideStatus = 'pending' | 'generating' | 'ready' | 'needs-evidence' | 'needs-data' | 'fixed';

export interface DeckExportState {
  lastExport: string | null;
  fidelityIssues: FidelityIssue[];
  exportPath?: string;
}

export interface FidelityIssue {
  slideId: string;
  issue: 'rasterized' | 'overflow' | 'font-missing' | 'layout-drift';
  detail: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * API Request/Response Shapes
 */
export interface DeckAssembleResponse {
  success: boolean;
  outputPath: string; // deck.html
  slideCount: number;
}

export interface DeckExportRequest {
  target: 'pptx' | 'pdf';
  includeFidelityReport: boolean;
}

export interface DeckExportResponse {
  success: boolean;
  pptxPath: string;
  fidelityReport: FidelityIssue[];
}
```

## Skill Reorganization: Compose, Not Replace

The 22 existing deck skills are NOT deleted. They reorganize into composable layers:

### Infrastructure Skills (have real assets)

These skills ship `assets/` and `references/` directories with templates, layout libraries,
CSS, JS, and authoring guides. They remain as selectable **frameworks**:

| Skill | Assets | References | Role |
|-------|--------|------------|------|
| `html-ppt` | base.css, fonts.css, runtime.js, themes/, animations/ | layouts.md, themes.md, animations.md, authoring-guide.md, presenter-mode.md, full-decks.md | Primary composable engine — richest layout library |
| `simple-deck` | template.html | layouts.md, checklist.md | Lightweight single-file seed |
| `replit-deck` | template.html | layouts.md, themes.md, components.md, checklist.md | 8 built-in visual themes |
| `guizang-ppt` | template.html, example-slides.html | layouts.md, themes.md, components.md, styles.md, checklist.md | Magazine/editorial style |

### Theme-Only Skills (SKILL.md body only, no assets)

These 17 skills have no `assets/` or `references/` directories. Their entire value is the
visual description, color palette, layout instructions, and example HTML in the SKILL.md body.
They become **theme descriptors** that compose with any framework:

`html-ppt-course-module`, `html-ppt-dir-key-nav-minimal`, `html-ppt-graphify-dark-graph`,
`html-ppt-hermes-cyber-terminal`, `html-ppt-knowledge-arch-blueprint`,
`html-ppt-obsidian-claude-gradient`, `html-ppt-pitch-deck`, `html-ppt-presenter-mode-reveal`,
`html-ppt-product-launch`, `html-ppt-taste-brutalist`, `html-ppt-taste-editorial`,
`html-ppt-tech-sharing`, `html-ppt-testing-safety-alert`, `html-ppt-weekly-report`,
`html-ppt-xhs-pastel-card`, `html-ppt-xhs-post`, `html-ppt-xhs-white-editorial`

### Special Skills

| Skill | Role |
|-------|------|
| `pptx-html-fidelity-audit` | Post-export audit — compares PPTX against source HTML. Remains standalone. |
| `slide-author` | Teaches the atomic-seed grammar for slidify-native HTML. Remains as craft guidance. |

### 6-Layer Composition Model (from Codex Audit)

The unified deck skill composes by selecting one option from each layer:

| Layer | What it governs | Sources |
|-------|----------------|---------|
| **Runtime** | Navigation, progress, overview, theme cycling, notes drawer, presenter popup, export hooks | `html-ppt/assets/runtime.js` (richest), `simple-deck/assets/template.html` (iframe nav), `replit-deck/assets/template.html` (proven iframe bridge) |
| **Format** | Slide dimensions and output target | 16:9 horizontal (default), 3:4 XHS portrait (`xhs-post`), presenter-mode (`presenter-mode-reveal`), PPTX export target |
| **Theme** | Token sets, color palettes, typography, mood | `html-ppt/assets/themes/` (36 CSS files), `guizang-ppt` (5 magazine themes), `replit-deck` (8 complete themes), taste rules (brutalist, editorial), 17 SKILL.md-only theme descriptors |
| **Layout** | Reusable slide archetypes | `html-ppt` (31 layouts), `guizang-ppt` (10 magazine layouts), `simple-deck` (8 minimal layouts), `replit-deck` (10 theme-paired layouts), taste archetype lists |
| **Scenario** | Narrative structure and content scaffolding | pitch-deck, product-launch, tech-sharing, weekly-report, course-module, safety-alert, xhs-post, architecture, dev-tool tutorial |
| **Craft/QA** | Quality rules, validation, export compatibility | slidify-compat, anti-ai-slop, class inventory validation, theme rhythm, font discipline, footer rail |

### How composition works

The unified deck skill's workflow selects layers through the narrative interview:

1. **Audience + purpose** → determines **scenario** (pitch-deck for VCs, tech-sharing for engineers)
2. **Tone + mood** → determines **theme** (editorial for warm/premium, brutalist for dense/technical)
3. **Design system** → overrides theme tokens with brand palette (or no DS = theme defaults)
4. **Format** → usually 16:9, but XHS/portrait for social, presenter-mode for conference
5. **Runtime + layout** → auto-selected based on theme + format, or user picks explicitly

Composition is not just metadata. The unified `SKILL.md` must make the agent read the smallest useful body of source material, then make an explicit layer selection before generating slides.

### Skill-body framework selection instructions

The unified skill body should contain instructions like this:

```markdown
## Framework Selection

Before writing `deck-plan.json`, select exactly one base framework and document it in
`deck-plan.json.themeId` or a future `frameworkId`.

Default to `html-ppt` when the user needs:
- slidify export,
- multiple slide archetypes,
- animations or canvas FX,
- theme CSS from `assets/themes/`,
- full-deck templates from `templates/full-decks/`.

Use `simple-deck` only when the user explicitly wants a tiny single-file deck,
fast editing, or a 6-10 slide minimal narrative with no advanced runtime.

Use `replit-deck` when the deck should feel like a polished board memo,
gallery catalog, finance update, consumer card deck, or Replit-style theme study.

Use `guizang-ppt` when the user wants a magazine/editorial presentation,
Chinese-first story pacing, strong theme rhythm, or image-heavy essay slides.

After selecting the framework, read only the needed references:
- `html-ppt`: `references/layouts.md`, `references/themes.md`, `references/animations.md`, and any selected `templates/full-decks/<id>/README.md`.
- `simple-deck`: `references/layouts.md` and `references/checklist.md`.
- `replit-deck`: `references/layouts.md`, `references/themes.md`, and `references/components.md`.
- `guizang-ppt`: `references/layouts.md`, `references/themes.md`, `references/components.md`, and `references/checklist.md`.
```

### Skill-body layer-selection example

The agent should also write its layer decision as a compact planning block:

```markdown
## Layer Decision

- Runtime: `html-ppt/assets/runtime.js`, because this deck needs thumbnails, keyboard navigation, overview, notes, and slidify export.
- Format: 16:9 horizontal, because the user asked for a board presentation.
- Theme: `pitch-deck-vc.css`, with the user's selected design system overriding palette and typography tokens.
- Layouts: `cover`, `stat-highlight`, `kpi-grid`, `comparison`, `roadmap`, `cta`.
- Scenario: pitch-deck arc, because the audience is investors and the key action is funding approval.
- Craft/QA: apply `deck-authoring.md`; every traction slide must contain user-provided metrics or stay `needs-data`.
```

### Concrete composition examples

| User intent | Runtime | Format | Theme | Layout set | Scenario | Craft emphasis |
|-------------|---------|--------|-------|------------|----------|----------------|
| "Series A deck for infrastructure startup" | `html-ppt` | 16:9 | `pitch-deck-vc.css` or `pitch-deck` template | cover, stat, KPI, comparison, roadmap, CTA | pitch-deck | anti-ai-slop data gates, investor ask clarity |
| "Engineering talk on our new sync daemon" | `html-ppt` | 16:9 | `tokyo-night.css` + `tech-sharing` template cues | code, terminal, arch-diagram, flow-diagram, timeline | tech-sharing | diagram specificity, slidify atom hints |
| "Weekly business review" | `html-ppt` or `replit-deck` | 16:9 | `corporate-clean.css` or `helix` | KPI row, table, chart-line, todo-checklist | weekly-report | no invented metrics, table readability |
| "XHS educational carousel" | `html-ppt` | 3:4 portrait | `xiaohongshu-white.css` or `xhs-post` | cover, big quote, cards, CTA | XHS social explainer | portrait fit, one claim per slide |
| "Architecture essay in Chinese" | `guizang-ppt` or `html-ppt` | 16:9 | `knowledge-arch-blueprint` / Indigo Porcelain | hero cover, act divider, diagram, quote+image | architecture / essay | theme rhythm, image ratio rules |

Existing skills stay in `content/skills/` untouched. The unified deck skill references them
as composable pieces — it reads their SKILL.md bodies for theme descriptions and their
`assets/` + `references/` directories for framework infrastructure.

### Reference catalogs from `html-ppt`

#### 31 single-page layouts

| Group | Layout files |
|-------|--------------|
| Openers / transitions | `cover.html`, `toc.html`, `section-divider.html` |
| Text-centric | `bullets.html`, `two-column.html`, `three-column.html`, `big-quote.html` |
| Numbers / data | `stat-highlight.html`, `kpi-grid.html`, `table.html`, `chart-bar.html`, `chart-line.html`, `chart-pie.html`, `chart-radar.html` |
| Code / terminal | `code.html`, `diff.html`, `terminal.html` |
| Diagrams / flows | `flow-diagram.html`, `arch-diagram.html`, `process-steps.html`, `mindmap.html` |
| Plans / comparisons | `timeline.html`, `roadmap.html`, `gantt.html`, `comparison.html`, `pros-cons.html`, `todo-checklist.html` |
| Visuals | `image-hero.html`, `image-grid.html` |
| Closers | `cta.html`, `thanks.html` |

#### 20 canvas FX modules

| FX module | Best use |
|-----------|----------|
| `particle-burst` | Reveal moments, stat pages. |
| `confetti-cannon` | Thank-you, success, launch wins. |
| `firework` | Celebration and product launch slides. |
| `starfield` | Sci-fi/deep-space covers. |
| `matrix-rain` | Security, terminal, data stream contexts. |
| `knowledge-graph` | RAG, graph, knowledge-base slides. |
| `neural-net` | ML architecture and model explanation. |
| `constellation` | Ambient hero backgrounds. |
| `orbit-ring` | Layered systems and platform orbit metaphors. |
| `galaxy-swirl` | Intro/cover atmosphere. |
| `word-cascade` | Vocabulary or concept cloud slides. |
| `letter-explode` | Big title reveal. |
| `chain-react` | Pipeline, sequence, dependency slides. |
| `magnetic-field` | Abstract flow and energy. |
| `data-stream` | API, data, security slides. |
| `gradient-blob` | Soft atmospheric backgrounds. |
| `sparkle-trail` | Interactive reveal canvases. |
| `shockwave` | Impact, alert, launch. |
| `typewriter-multi` | Terminal boot logs and agent traces. |
| `counter-explosion` | KPI reveal and record highs. |

### Truly distinct skills that stay standalone

These skills have unique capabilities beyond theming that justify standalone access:

| Skill | Why standalone | Also composable? |
|-------|---------------|-----------------|
| `html-ppt-presenter-mode-reveal` | Unique runtime: BroadcastChannel sync, draggable timer, speaker popup | Yes — presenter runtime can overlay any theme |
| `html-ppt-xhs-post` | Unique format: 3:4 portrait, 810×1080, 9-slide social carousel | Yes — portrait format works with any theme |
| `html-ppt-taste-brutalist` | Unique taste rules: banned patterns, archetype checklists, not just tokens | Yes — taste rules compose on top of themes |
| `html-ppt-taste-editorial` | Same: archetype-driven, prescriptive substrate rules | Yes — taste rules compose on top of themes |
| `pptx-html-fidelity-audit` | Not authoring — post-export repair utility | No — operates on completed decks |

## Daemon Gaps (from Gemini Audit)

The daemon audit identified these specific gaps:

### 1. Discovery Protocol is Hardcoded for 2 Steps

The current `discovery.ts` forces a 3-turn cycle: Turn 1 (briefing form) → Turn 2 (direction picker or spec extraction) → Turn 3 (TodoWrite plan + implement). The narrative interview needs a flexible multi-turn mode where the agent keeps asking until `deck-plan.json` is committed.

**Fix**: Add a `narrative: true` flag to skill frontmatter. 
- When `narrative: true` is detected in `composeSystemPrompt()`, the daemon injects a "Narrative Interview" layer that overrides the hardcoded cycle.
- The daemon allows the agent to skip the `TodoWrite` phase as long as it is emitting `QuestionForm` artifacts or updating the `interview` block in `deck-plan.json`.
- The cycle only resumes standard behavior once the agent writes `phase: 'structure'` to `deck-plan.json`.

### 2. Unified Deck Skill Detection

The daemon needs to know when to activate the deck-specific UI and API logic.

**Detection Logic**:
1. **Frontmatter Check**: The daemon reads the active skill's `SKILL.md`. If `pixelpitch.mode: deck` is present, it flags the project as a deck project.
2. **File Check**: If `deck/deck-plan.json` exists in the project root, the daemon assumes the unified workflow is active.
3. **Skill Routing**: When a project is flagged as a deck project, the daemon's file watcher prioritizes `deck-plan.json` changes and routes them to the `deck:plan:updated` SSE event.

### 3. Per-Slide Chat Context Routing

Standalone skills often suffer from "context bloat" where the agent reads the entire 2000-line `deck.html` to fix one typo.

**Fix**: The daemon implements a "Context Slicer" for deck projects:
- When a chat message has a slide scope (e.g., `slideId: "02-problem"`), the daemon looks up the slide's file path in `deck-plan.json`.
- It constructs an `extraContext` array containing *only* the specific slide fragment and `theme.css`.
- It appends a system instruction: "You are editing ONLY Slide [N]. Do not suggest changes to other slides. Your output must be the complete HTML fragment for this slide."

### 4. No DESIGN.md → theme.css Extraction

The agent currently "eyeballs" DESIGN.md prose and manually writes CSS. There's no shared
logic or token standard.

**Fix**: The unified deck skill's workflow explicitly instructs the agent to extract tokens
in a defined order: (1) read DESIGN.md, (2) extract palette section → `--bg`, `--fg`,
`--accent`, `--shell`, (3) extract typography → `--font-display`, `--font-body`, (4) write
`theme.css`. The extraction pattern is documented in `references/token-extraction.md`.

### 5. No Deck Assembly Endpoint

The agent currently writes the entire deck manually. There's no daemon endpoint to assemble
slide fragments into a complete `deck.html`.

**Fix**: Implement `POST /api/projects/:id/deck/assemble` and
`POST /api/projects/:id/deck/export` (see Daemon Changes section).

### 6. Craft Rules Need Unified Deck Section

`slidify-compat.md` and `anti-ai-slop.md` are concatenated without collision checking.

**Fix**: Create `content/craft/deck-authoring.md` that composes the deck-relevant rules from
all four craft files into one coherent reference, with explicit precedence when rules
conflict (e.g., "anti-ai-slop governs content; slidify-compat governs HTML attributes;
neither constrains visual design").

## Skill Content

| File | Purpose |
|------|---------|
| `content/skills/deck/SKILL.md` | Unified deck skill — narrative interview protocol, slide generation workflow, self-critique rules, anti-strawman enforcement, framework/theme selection |
| `content/skills/deck/assets/framework.js` | Deck framework (nav, scaling, print) — sourced from html-ppt's runtime.js |
| `content/skills/deck/assets/framework.css` | Framework base styles — sourced from html-ppt's base.css |
| `content/skills/deck/references/slide-types.md` | Catalog of slide type layouts — composed from html-ppt, simple-deck, replit-deck layout libraries |
| `content/skills/deck/references/narrative-patterns.md` | Narrative arc patterns (problem-solution, journey, comparison, etc.) |
| `content/skills/deck/references/token-extraction.md` | How to extract DESIGN.md prose into theme.css variables |
| `content/skills/deck/references/frameworks.md` | Catalog of available frameworks and when to use each |
| `content/skills/deck/references/themes.md` | Catalog of available themes with visual descriptions |
| `content/craft/deck-authoring.md` | Unified craft reference for deck projects |

### Reference file contents

| File | Must contain |
|------|--------------|
| `SKILL.md` | Frontmatter with `pixelpitch.mode: deck`, `craft.requires`, narrative interview rules, phase transitions, deck-plan write protocol, framework selection markdown, slide generation loop, per-slide editing rules, export repair loop, anti-strawman pushback language. |
| `assets/framework.js` | Stable runtime copied or adapted from `html-ppt/assets/runtime.js`: keyboard navigation, active slide state, overview, notes hooks, print/export affordances, no agent-edited business logic. |
| `assets/framework.css` | Stable base layout from `html-ppt/assets/base.css`: 1920×1080 slide shell, scaling primitives, typography slots, grid/card primitives, print styles, no theme-specific colors except fallback tokens. |
| `references/slide-types.md` | A normalized slide archetype catalog that maps beat types to layouts across frameworks. It should list html-ppt's 31 layouts, simple-deck's 8 layouts, replit-deck's 10 layouts, and guizang-ppt's 10 layouts, with "when to use", evidence requirements, and slidify notes. |
| `references/narrative-patterns.md` | Scenario-to-arc guide: pitch, product launch, weekly report, tech talk, course module, safety alert, architecture explainer, XHS carousel, editorial essay. Each arc includes beat sequence, evidence needs, slide-count guidance, and common failure modes. |
| `references/token-extraction.md` | Deterministic DESIGN.md-to-CSS procedure: palette extraction, typography extraction, spacing scale, semantic token names, theme override order, multi-design-system blending, fallback tokens. |
| `references/frameworks.md` | Framework selection matrix: `html-ppt`, `simple-deck`, `replit-deck`, `guizang-ppt`, plus standalone overlays such as presenter mode and XHS portrait. Include assets to read and assets to copy. |
| `references/themes.md` | In-place theme catalog: 36 `html-ppt` CSS themes, 15 full-deck templates, 17 SKILL.md-only theme descriptors, 8 Replit themes, 5 Guizang themes. Include mood, best scenario, compatible formats, and caution flags. |
| `content/craft/deck-authoring.md` | Deck-specific craft synthesis with precedence, conflict resolution, quality gate checklist, and references back to anti-ai-slop/color/typography/slidify-compat. |

### `slide-types.md` source mapping

| Source | Layouts to include | Best role |
|--------|--------------------|-----------|
| `html-ppt/references/layouts.md` | `cover`, `toc`, `section-divider`, `bullets`, `two-column`, `three-column`, `big-quote`, `stat-highlight`, `kpi-grid`, `table`, `chart-bar`, `chart-line`, `chart-pie`, `chart-radar`, `code`, `diff`, `terminal`, `flow-diagram`, `arch-diagram`, `process-steps`, `mindmap`, `timeline`, `roadmap`, `gantt`, `comparison`, `pros-cons`, `todo-checklist`, `image-hero`, `image-grid`, `cta`, `thanks` | Default broad layout library for generated decks. |
| `simple-deck/references/layouts.md` | Cover, body slide, big stat, three-point row, pipeline, big quote, before/after, closing/CTA | Minimal fast decks and strict theme rhythm. |
| `replit-deck/references/layouts.md` | `cover-hero`, `kpi-row-6`, `split-hero-metric`, `memo-hero-statement`, `two-column-ask`, `gallery-plate`, `campaign-cover`, `finance-hero-grid`, `chapter-plate`, `pill-headline-cards-row` | Board memo, finance, gallery, consumer card, campaign decks. |
| `guizang-ppt/references/layouts.md` | Hero cover, act divider, big numbers grid, quote+image, image grid, pipeline, hero question, big quote, A/B comparison, lead image + side text | Magazine/editorial storytelling, Chinese-first decks, image-heavy essays. |

### `themes.md` source mapping

| Source | Themes | Notes |
|--------|--------|-------|
| `html-ppt/assets/themes/*.css` | 36 CSS themes listed in Visual Themes | Treat as token presets. They are reusable across scenarios. |
| `html-ppt/templates/full-decks/*` | 15 scoped full-deck templates listed in Visual Themes | Treat as pattern systems. Borrow structure, rhythm, and scoped classes. |
| `html-ppt-*` SKILL bodies | 17 descriptors | Read for scenario voice and taste constraints; do not move or duplicate. |
| `replit-deck/references/themes.md` | `helix`, `holm`, `vance`, `bevel`, `world-dark`, `world-mint`, `atlas`, `bluehouse` | Strongly tied to the Replit layout set; keep theme-layout pairings. |
| `guizang-ppt/references/themes.md` | Monocle default, Indigo Porcelain, Forest Ink, Kraft Paper, Dune | Editorial palettes with strict rhythm and image rules. |

### `narrative-patterns.md` starter arcs

| Scenario | Beat sequence | Works when | Avoid |
|----------|---------------|------------|-------|
| Pitch deck | context → problem → solution → proof → market → traction → plan → ask | Audience must decide funding/resources. | Generic market slides without real wedge or ask. |
| Product launch | audience pain → insight → product reveal → how it works → proof → rollout → CTA | Audience needs adoption or launch confidence. | Feature lists without a positioning claim. |
| Weekly report | headline status → KPI deltas → shipped work → risks/blockers → decisions needed → next week | Operating cadence and accountable follow-up. | Status theater with no owners, dates, or deltas. |
| Tech sharing | problem context → mental model → architecture → implementation → demo path → tradeoffs → next steps | Engineering audience needs understanding and reuse. | "Architecture" slides that are only boxes with labels. |
| Course module | learning goal → concept → worked example → practice/checkpoint → recap → next module | Teaching a procedure or concept. | Too many concepts on one slide. |
| Safety alert | incident/risk → impact → root cause → controls → owner plan → escalation ask | Urgency, compliance, red-team, launch readiness. | Softeners that hide severity or accountability. |
| Architecture explainer | system goal → constraints → components → data/control flow → failure modes → roadmap | Technical decision review. | Diagrams without boundaries, protocols, or ownership. |
| XHS carousel | hook → contradiction → 3-5 teachable points → personal/brand proof → save/share CTA | Social education or compact editorial. | Horizontal deck density squeezed into portrait. |
| Editorial essay | thesis → scene/context → evidence sequence → counterpoint → synthesis → memorable close | Thought leadership and taste-forward arguments. | Business-template pacing with no narrative tension. |

## Verification

1. **Typecheck**: `bun run --filter @pixelpitch/web typecheck` — all new components type-clean.
2. **Unit tests**: DeckPlan schema validation, srcdoc stitching, outline editor drag-reorder.
3. **Integration**: Create a deck project, go through narrative → structure → generate → polish → export flow end-to-end.
4. **Visual**: Dark mode, responsive behavior, thumbnail rendering, slide navigation.
5. **Slidify**: Export a generated deck and verify the fidelity report is accurate.

## Harness Collaboration Plan

Divide work across three harnesses with disjoint ownership.
Existing skills are NOT deleted — they are referenced as composable pieces.

| Harness | Owns | Work |
|---------|------|------|
| **Codex** | `content/skills/deck/`, `content/craft/deck-authoring.md` | Build the unified SKILL.md that references existing skills as frameworks/themes. Compose references (slide-types.md, narrative-patterns.md, token-extraction.md, frameworks.md, themes.md) by reading existing skill assets. Write deck-authoring.md craft rule. |
| **Gemini** | `packages/contracts/src/api/deck.ts`, `apps/daemon/src/server.ts` (deck endpoints only) | DeckPlan TypeScript types, deck assembly endpoint, slidify export endpoint, deck-plan.json SSE notification. |
| **Claude** | `apps/web/src/components/deck/` | All 9 React components: DeckWorkspace, StoryCanvas, OutlineEditor, SlidePlanner, SlideSorter, SlideEditor, SlideStrip, ExportPanel, DeckPhaseBar. |

### What Codex does NOT do

Codex does not delete, rename, or move any existing skill directory. The unified
`content/skills/deck/SKILL.md` references existing skills by path:
- "For the html-ppt framework, read `content/skills/html-ppt/assets/` and `content/skills/html-ppt/references/`"
- "For the tech-sharing theme, read `content/skills/html-ppt-tech-sharing/SKILL.md` body"

This means existing skills continue to work standalone for users who invoke them directly,
while the unified deck skill composes them into a narrative-first workflow.
