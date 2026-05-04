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
