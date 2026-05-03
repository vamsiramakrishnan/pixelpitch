# Bench Harvest Report

This report turns raw harvester clusters into renderer work queues. The goal is native-first editability without compromising visual fidelity: every high-value miss should point to a native pattern, hybrid recipe, brilliant surgical raster effect, or fidelity regression case.

## Run

- Corpus: `/home/user/pixelpitch/_bench/corpus`
- Timestamp: `2026-05-03T08:54:01+00:00`
- Decks processed: `61`
- Total unmatched units: `166`
- Unique signatures: `2`

## Signal Mix

## Run Health

- Average native area ratio: `1.0`
- Average pattern coverage: `0.9161`
- Unmatched per deck: `2.72`
- Quality issues per deck: `1.79`
- Errors: `0`

## Quality Telemetry

- Overflow elements: `109`
- Coverage gaps: `0`
- Exclusivity violations: `0`
- Editability failed decks: `0`

### Render strategies

- `native-pattern`: 4
- `native-atom`: 2

### Editability goals

- `maximize-native-editability`: 6

### Raster fidelity goals

- `avoid-raster`: 4
- `fallback-raster-quality`: 2

### Fidelity risk

- `low`: 4
- `medium`: 2

### Promotion priority

- `high`: 4
- `medium`: 2

### Pipeline actions

- `promote-to-native-pattern`: 6
- `needs-designer-label`: 4

## Top Work Queue

### auto-cluster-001 · text.banner

- Instances: `4`
- Strategy: `native-pattern`
- Editability goal: `maximize-native-editability`
- Raster fidelity goal: `avoid-raster`
- Risk: `low`
- Priority: `high` (14.18)
- Features: `none`
- Actions: `promote-to-native-pattern, needs-designer-label`
- Sources: `.`
- Examples: `slide-37-stacked-bar.html#node-0, slide-39-numbered-insights.html#node-2, slide-40-waterfall.html#node-0`

### auto-cluster-002 · chrome.footer-bordered

- Instances: `2`
- Strategy: `native-atom`
- Editability goal: `maximize-native-editability`
- Raster fidelity goal: `fallback-raster-quality`
- Risk: `medium`
- Priority: `medium` (13.25)
- Features: `border, nested`
- Actions: `promote-to-native-pattern`
- Sources: `.`
- Examples: `slide-37-stacked-bar.html#node-1, slide-40-waterfall.html#node-1`

## Quality Work Queue

### layout.overflow:bottom:bottom-edge-crossed-by-71-px-shrink-the-row-the-type-or-split-the-slide.-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 71 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `7`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-42-ranking.html#slide-0:body > div:nth-child(1) > div:nth-child(3), slide-42-ranking.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(12) > div:nth-child(1), slide-42-ranking.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(12) > div:nth-child(2)`

### layout.overflow:bottom:bottom-edge-crossed-by-74-px-shrink-the-row-the-type-or-split-the-slide.-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 74 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `5`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-42-ranking.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(12) > div:nth-child(3) > span:nth-child(2), slide-42-ranking.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(12) > div:nth-child(3) > span:nth-child(4), slide-42-ranking.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(12) > div:nth-child(3) > span:nth-child(6)`

### layout.overflow:left:left-edge-crossed-by-120-px-usually-a-transform:-translatex--n-with-n-large

- Kind: `layout.overflow`
- Title: `left-edge overflow in left edge crossed by 120 px — usually a `transform: translateX(-N)` with N larger than the parent's left padding.`
- Severity: `high`
- Instances: `3`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-22-hero-gradient.html#slide-0:body > div:nth-child(1) > div:nth-child(1), slide-26-quote-wall.html#slide-0:body > div:nth-child(1) > div:nth-child(1), sophisticated.html#slide-0:body > div:nth-child(1) > div:nth-child(1)`

### layout.overflow:bottom:bottom-edge-crossed-by-200-px-shrink-the-row-the-type-or-split-the-slide.

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 200 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `3`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-23-stats-trio.html#slide-0:body > div:nth-child(1) > div:nth-child(2), slide-27-cta-closing.html#slide-0:body > div:nth-child(1) > div:nth-child(2), slide-28-logo-mosaic.html#slide-0:body > div:nth-child(1) > div:nth-child(2)`

### layout.overflow:bottom:bottom-edge-crossed-by-97-px-shrink-the-row-the-type-or-split-the-slide.-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 97 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `3`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-39-numbered-insights.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(5) > div:nth-child(1), slide-39-numbered-insights.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(5) > div:nth-child(2), slide-39-numbered-insights.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > div:nth-child(5) > div:nth-child(2) > div:nth-child(3)`

### layout.overflow:bottom:bottom-edge-crossed-by-220-px-shrink-the-row-the-type-or-split-the-slide.

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 220 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `2`
- Sources: `., animated`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `animated/anim-02-hero-text-fm.html#slide-0:body > div:nth-child(1) > div:nth-child(2), slide-22-hero-gradient.html#slide-0:body > div:nth-child(1) > div:nth-child(2)`

### layout.overflow:right:right-edge-crossed-by-160-px-trim-the-line-lower-font-size-or-wrap.-viewpo

- Kind: `layout.overflow`
- Title: `right-edge overflow in right edge crossed by 160 px — trim the line, lower font-size, or wrap. Viewport width is 1280 px.`
- Severity: `high`
- Instances: `2`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-25-feature-bento.html#slide-0:body > div:nth-child(1) > div:nth-child(1), slide-28-logo-mosaic.html#slide-0:body > div:nth-child(1) > div:nth-child(1)`

### layout.overflow:bottom:under-type.dropcap-:-lower-the-::first-letter-font-size-or-widen-the-body

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in under `type.dropcap`: lower the ::first-letter font-size or widen the body's container.`
- Severity: `high`
- Instances: `2`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `landing-atoms.html#slide-3:body > div:nth-child(1) > div:nth-child(2) > div:nth-child(10) > span:nth-child(1), landing-atoms.html#slide-3:body > div:nth-child(1) > div:nth-child(2) > div:nth-child(10) > p:nth-child(2)`

### layout.overflow:bottom:bottom-edge-crossed-by-270-px-shrink-the-row-the-type-or-split-the-slide.

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 270 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `2`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-04-the-quiet-collapse.html#slide-0:body > div:nth-child(1) > div:nth-child(1), slide-04-the-quiet-collapse.html#slide-0:body > div:nth-child(1) > div:nth-child(1) > div:nth-child(12)`

### layout.overflow:left:left-edge-crossed-by-180-px-usually-a-transform:-translatex--n-with-n-large

- Kind: `layout.overflow`
- Title: `left-edge overflow in left edge crossed by 180 px — usually a `transform: translateX(-N)` with N larger than the parent's left padding.`
- Severity: `high`
- Instances: `1`
- Sources: `animated`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `animated/anim-02-hero-text-fm.html#slide-0:body > div:nth-child(1) > div:nth-child(1)`

### layout.overflow:bottom:bottom-edge-crossed-by-135-px-shrink-the-row-the-type-or-split-the-slide.

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 135 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `landing-atoms.html#slide-3:body > div:nth-child(1) > div:nth-child(2)`

### layout.overflow:bottom:atom-type.dropcap-:-lower-the-::first-letter-font-size-or-widen-the-body-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in atom `type.dropcap`: lower the ::first-letter font-size or widen the body's container.`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `landing-atoms.html#slide-3:body > div:nth-child(1) > div:nth-child(2) > div:nth-child(10)`

### layout.overflow:bottom:bottom-edge-crossed-by-147-px-shrink-the-row-the-type-or-split-the-slide.

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 147 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-04-the-quiet-collapse.html#slide-0:body > div:nth-child(1) > div:nth-child(1) > p:nth-child(10)`

### layout.overflow:bottom:bottom-edge-crossed-by-233-px-shrink-the-row-the-type-or-split-the-slide.

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 233 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-04-the-quiet-collapse.html#slide-0:body > div:nth-child(1) > div:nth-child(1) > p:nth-child(11)`

### layout.overflow:right:right-edge-crossed-by-120-px-trim-the-line-lower-font-size-or-wrap.-viewpo

- Kind: `layout.overflow`
- Title: `right-edge overflow in right edge crossed by 120 px — trim the line, lower font-size, or wrap. Viewport width is 1280 px.`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-23-stats-trio.html#slide-0:body > div:nth-child(1) > div:nth-child(1)`

### layout.overflow:top:top-edge-crossed-by-220-px-usually-a-negative-top-or-translatey--n-larger-th

- Kind: `layout.overflow`
- Title: `top-edge overflow in top edge crossed by 220 px — usually a negative `top` or `translateY(-N)` larger than the parent's top padding.`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-27-cta-closing.html#slide-0:body > div:nth-child(1) > div:nth-child(1)`

### layout.overflow:left:left-edge-crossed-by-78-px-usually-a-transform:-translatex--n-with-n-larger

- Kind: `layout.overflow`
- Title: `left-edge overflow in left edge crossed by 78 px — usually a `transform: translateX(-N)` with N larger than the parent's left padding.`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-30-story-pullquote.html#slide-0:body > div:nth-child(1) > svg:nth-child(1) > path:nth-child(1)`

### layout.overflow:left:left-edge-crossed-by-88-px-usually-a-transform:-translatex--n-with-n-larger

- Kind: `layout.overflow`
- Title: `left-edge overflow in left edge crossed by 88 px — usually a `transform: translateX(-N)` with N larger than the parent's left padding.`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-32-feature-breathing.html#slide-0:body > div:nth-child(1) > svg:nth-child(1) > path:nth-child(1)`

### layout.overflow:left:left-edge-crossed-by-118-px-usually-a-transform:-translatex--n-with-n-large

- Kind: `layout.overflow`
- Title: `left-edge overflow in left edge crossed by 118 px — usually a `transform: translateX(-N)` with N larger than the parent's left padding.`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-35-manifesto-values.html#slide-0:body > div:nth-child(1) > svg:nth-child(1) > path:nth-child(1)`

### layout.overflow:bottom:bottom-edge-crossed-by-114-px-shrink-the-row-the-type-or-split-the-slide.

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 114 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `1`
- Sources: `.`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `slide-39-numbered-insights.html#slide-0:body > div:nth-child(1) > div:nth-child(3)`

