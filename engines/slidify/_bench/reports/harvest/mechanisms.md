# Bench Mechanisms Plan

This plan ranks the mechanisms that should improve slide-deck visual fidelity, native editability, and repeatable pipeline signal quality.

## Top 10

### 1. Autofit and intentional-bleed policy

- Priority: `high`
- Area: `layout-engine`
- Score: `384.0`
- Why: Browser layout overflows need a deterministic choice: shrink, wrap, split, clip, or mark as intentional bleed.
- Evidence: corpus: 109 overflow elements; corpus: 7x bottom-edge overflow in bottom edge crossed by 71 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).; corpus: 5x bottom-edge overflow in bottom edge crossed by 74 px — shrink the row, the type, or split the slide. Viewport budget is 720 px (head ~80, footer ~50).; corpus: 3x left-edge overflow in left edge crossed by 120 px — usually a `transform: translateX(-N)` with N larger than the parent's left padding.
- Actions: `improve-autofit-or-bleed-policy, add-layout-overflow-regression, promote-authoring-hint`
- Gate: `warn on medium overflow, fail on high overflow unless allow-bleed is set`

### 2. Banner and footer chrome atoms

- Priority: `high`
- Area: `pattern-library`
- Score: `27.43`
- Why: Repeated low-risk chrome should become native atoms to reduce unmatched noise.
- Evidence: corpus: 4x text.banner; corpus: 2x chrome.footer-bordered
- Actions: `promote-to-native-pattern, add-pattern-regression-case`
- Gate: `no recurring text.banner or chrome.footer-bordered clusters`

### 3. Pattern promotion queue with thresholds

- Priority: `high`
- Area: `harvester`
- Score: `19.2`
- Why: High-frequency misses should automatically become reviewable native-pattern work.
- Evidence: corpus: 4x text.banner; corpus: 2x chrome.footer-bordered
- Actions: `promote-to-native-pattern, expand-pattern-regression-corpus, needs-designer-label`
- Gate: `critical clusters block release until promoted or waived`

### 4. Structured font fallback telemetry

- Priority: `high`
- Area: `font-system`
- Score: `18.0`
- Why: The run logs show many font substitutions, but the harvest JSON does not yet expose fallback families as ranked data.
- Evidence: baseline mechanism
- Actions: `surface-font-fallback-events-in-conversion-result, add-font-pack-bootstrap-report, gate-brand-font-substitution`
- Gate: `report fallback family, resolved file, and source deck`

### 5. Harvest only presentation fixtures

- Priority: `high`
- Area: `bench`
- Score: `12.0`
- Why: Generated catalogue pages and long-form indexes should not dilute slide conversion signals.
- Evidence: baseline mechanism
- Actions: `skip-generated-index-html, separate-fixtures-from-generated-artifacts, keep-harvest-manifest-explicit`
- Gate: `exclude root index.html when index.json marks a generated catalogue`

### 6. Deterministic animation state harvesting

- Priority: `medium`
- Area: `renderer`
- Score: `10.0`
- Why: Animated fixtures need stable snapshot moments plus editable static overlays.
- Evidence: baseline mechanism
- Actions: `capture-keyframe-state-fixtures, separate-editable-overlay-from-motion-raster, add-animation-frame-regression`
- Gate: `animated deck reports include captured frame metadata`

### 7. Surgical raster plus editable wrappers

- Priority: `medium`
- Area: `renderer`
- Score: `10.0`
- Why: Image-led, filtered, and masked visuals need brilliant raster fidelity while preserving editable text and geometry.
- Evidence: baseline mechanism
- Actions: `preserve-raster-layer, optimize-raster-crop-and-resolution, compare-source-vs-pptx-pixels`
- Gate: `raster layers must be cropped, high-DPI, and behind editable text`

### 8. DOM-to-unit text coverage gate

- Priority: `medium`
- Area: `clusterer`
- Score: `0.0`
- Why: Text-bearing DOM that is visible in the browser must map to a visual unit before export.
- Evidence: baseline mechanism
- Actions: `fix-dom-to-unit-coverage, add-content-coverage-regression, compare-source-vs-pptx-text-map`
- Gate: `fail on coverage_gaps > 0 for deck suites`

### 9. Native rotated glyph primitive

- Priority: `medium`
- Area: `pattern-library`
- Score: `0.0`
- Why: Small transformed decorative glyphs should stay editable instead of becoming raster residue.
- Evidence: baseline mechanism
- Actions: `promote-to-native-pattern, preserve-rotation-transform, add-rotated-glyph-regression`
- Gate: `no repeated dec.glyph-rotated cluster above min occurrence threshold`

### 10. Round-trip editability drift gate

- Priority: `medium`
- Area: `roundtrip`
- Score: `0.0`
- Why: Designer-grade decks need PowerPoint-native edit operations to survive round trip accounting.
- Evidence: baseline mechanism
- Actions: `inspect-pptx-roundtrip-diff, add-editability-regression-case, tighten-native-emit-accounting`
- Gate: `fail on editability_failed_decks > 0`

