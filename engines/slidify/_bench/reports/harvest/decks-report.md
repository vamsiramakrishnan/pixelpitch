# Bench Harvest Report

This report turns raw harvester clusters into renderer work queues. The goal is native-first editability without compromising visual fidelity: every high-value miss should point to a native pattern, hybrid recipe, brilliant surgical raster effect, or fidelity regression case.

## Run

- Corpus: `/home/user/pixelpitch/_bench/decks`
- Timestamp: `2026-05-03T08:58:11+00:00`
- Decks processed: `125`
- Total unmatched units: `25`
- Unique signatures: `0`

## Signal Mix

## Run Health

- Average native area ratio: `0.9748`
- Average pattern coverage: `0.9865`
- Unmatched per deck: `0.2`
- Quality issues per deck: `0.09`
- Errors: `0`

## Quality Telemetry

- Overflow elements: `11`
- Coverage gaps: `0`
- Exclusivity violations: `0`
- Editability failed decks: `0`

### Render strategies

- No signals emitted.

### Editability goals

- No signals emitted.

### Raster fidelity goals

- No signals emitted.

### Fidelity risk

- No signals emitted.

### Promotion priority

- No signals emitted.

### Pipeline actions

- No signals emitted.

## Top Work Queue

## Quality Work Queue

### layout.overflow:bottom:bottom-edge-crossed-by-71-px-shrink-the-row-the-type-or-split-the-slide.-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 71 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `2`
- Sources: `llm-corpus`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `llm-corpus/19-bru-stat-wall.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > span:nth-child(1), llm-corpus/19-bru-stat-wall.html#slide-0:body > div:nth-child(1) > div:nth-child(3) > span:nth-child(2)`

### layout.overflow:bottom:bottom-edge-crossed-by-85-px-shrink-the-row-the-type-or-split-the-slide.-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 85 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `high`
- Instances: `1`
- Sources: `llm-corpus`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `llm-corpus/19-bru-stat-wall.html#slide-0:body > div:nth-child(1) > div:nth-child(3)`

### layout.overflow:left:left-edge-crossed-by-45-px-usually-a-transform:-translatex--n-with-n-larger

- Kind: `layout.overflow`
- Title: `left-edge overflow in left edge crossed by 45 px — usually a `transform: translateX(-N)` with N larger than the parent's left padding.`
- Severity: `medium`
- Instances: `2`
- Sources: `atlas-vol-iii`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `atlas-vol-iii/08-cinemagraph.html#slide-0:body > div:nth-child(1) > svg:nth-child(1) > g:nth-child(5), atlas-vol-iii/08-cinemagraph.html#slide-0:body > div:nth-child(1) > svg:nth-child(1) > g:nth-child(5) > rect:nth-child(1)`

### layout.overflow:right:right-edge-crossed-by-40-px-trim-the-line-lower-font-size-or-wrap.-viewpor

- Kind: `layout.overflow`
- Title: `right-edge overflow in right edge crossed by 40 px — trim the line, lower font-size, or wrap. Viewport width is 1280 px.`
- Severity: `medium`
- Instances: `1`
- Sources: `atlas-vol-iii`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `atlas-vol-iii/01-cover.html#slide-0:body > div:nth-child(1) > div:nth-child(2)`

### layout.overflow:top:top-edge-crossed-by-40-px-usually-a-negative-top-or-translatey--n-larger-tha

- Kind: `layout.overflow`
- Title: `top-edge overflow in top edge crossed by 40 px — usually a negative `top` or `translateY(-N)` larger than the parent's top padding.`
- Severity: `medium`
- Instances: `1`
- Sources: `atlas-vol-iii`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `atlas-vol-iii/04-duotone-plate.html#slide-0:body > div:nth-child(1) > svg:nth-child(1) > rect:nth-child(34)`

### layout.overflow:right:right-edge-crossed-by-20-px-trim-the-line-lower-font-size-or-wrap.-viewpor

- Kind: `layout.overflow`
- Title: `right-edge overflow in right edge crossed by 20 px — trim the line, lower font-size, or wrap. Viewport width is 1280 px.`
- Severity: `medium`
- Instances: `1`
- Sources: `atlas-vol-iii`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `atlas-vol-iii/04-duotone-plate.html#slide-0:body > div:nth-child(1) > svg:nth-child(1) > path:nth-child(39)`

### layout.overflow:bottom:bottom-edge-crossed-by-57-px-shrink-the-row-the-type-or-split-the-slide.-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 57 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `medium`
- Instances: `1`
- Sources: `llm-corpus`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `llm-corpus/16-mag-cover.html#slide-0:body > div:nth-child(1) > div:nth-child(2) > div:nth-child(2) > svg:nth-child(2) > path:nth-child(3)`

### layout.overflow:bottom:bottom-edge-crossed-by-44-px-shrink-the-row-the-type-or-split-the-slide.-

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 44 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `medium`
- Instances: `1`
- Sources: `llm-corpus`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `llm-corpus/19-bru-stat-wall.html#slide-0:body > div:nth-child(1) > div:nth-child(2)`

### layout.overflow:bottom:bottom-edge-crossed-by-8-px-shrink-the-row-the-type-or-split-the-slide.-v

- Kind: `layout.overflow`
- Title: `bottom-edge overflow in bottom edge crossed by 8 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).`
- Severity: `medium`
- Instances: `1`
- Sources: `llm-corpus`
- Actions: `add-layout-overflow-regression, improve-autofit-or-bleed-policy, promote-authoring-hint`
- Examples: `llm-corpus/19-bru-stat-wall.html#slide-0:body > div:nth-child(1) > div:nth-child(2) > div:nth-child(4) > p:nth-child(2)`

## Recommendations

- `high` `layout-engine`: Turn overflow telemetry into autofit and intentional-bleed policy (11 overflow elements were detected after browser layout; actions: improve-autofit-or-bleed-policy, add-layout-overflow-regression)

