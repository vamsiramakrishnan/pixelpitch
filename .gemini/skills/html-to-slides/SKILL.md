---
name: html-to-slides
description: Convert HTML decks into editable PPTX with the `slidify` CLI. Trigger when the user asks to make a deck/presentation/slides from HTML, asks to convert HTML to PowerPoint, or has a directory of slide HTML files they want to ship as a .pptx. Use the bundled CLI (`slidify`) — it self-describes via `slidify manifest`, ships in-tree guides via `slidify guide`, and emits structured JSON via `--json`.
---

# html-to-slides

Convert HTML slide decks into PPTX where the maximum possible fraction of the
slide area is **editable PPTX primitives** (text frames, shapes, lines, native
pictures), and only the irreducibly visual residue (gradients, complex SVGs,
canvases) is rasterized.

The work happens through the `slidify` CLI. This skill exists so a harness
agent picks the right entry points and reads the right output fields, instead
of reinventing them from scratch.

## When to use this skill

* User says "convert these HTML files to slides", "build a deck", "make a
  PowerPoint from this HTML", "ship as PPTX", or similar.
* User has a directory of `*.html` files or a single multi-slide HTML file.
* User wants to author HTML decks for an LLM-generation pipeline that ends
  in a `.pptx`.

## When NOT to use this skill

* User wants slides authored from scratch with no specific HTML in mind →
  use the `slide-generator` agent first to produce HTML, then circle back
  to this skill to convert.
* User wants PDF, Google Slides, or Keynote output — slidify ships PPTX
  only.

## The CLI is self-describing

Before doing anything, ask the CLI what it can do:

```bash
slidify manifest --brief        # one-line index of every command
slidify manifest convert        # full spec for one command
slidify guide                   # list of long-form guides
slidify guide agent-quickstart  # the 60-second agent tour
slidify doctor --json           # confirm the runtime environment
```

`slidify manifest` returns a stable JSON document that includes exit codes,
env vars, examples, and the schema of `--json` payloads. **Read it once at
session start** rather than guessing.

## The standard recipe

```bash
# 1. Verify environment (one-shot at session start).
slidify doctor --json

# 2. Convert. Always pass --json for programmatic output.
slidify convert deck.html deck.pptx --json --report-json /tmp/report.json

# 3. Inspect outcome WITHOUT shelling out to jq.
slidify field /tmp/report.json native_area_ratio
slidify field /tmp/report.json editability_passed
slidify field /tmp/report.json fidelity_reports.0.ssim
```

A successful `convert --json` returns a `ConversionResult` object plus a
`_next` array of suggested follow-up commands tailored to that run. Read
`_next` first — the CLI is telling you what to do.

## Source forms

`slidify convert <input> <output.pptx>` accepts:

| `<input>`              | Behavior |
|------------------------|----------|
| `deck.html`            | Single file. Split on `<!DOCTYPE html>` for multi-slide. |
| `slides/`              | Directory of `*.html` files, one slide each, sorted lexicographically. Name them `slide-01.html`, `slide-02.html`. |
| `-`                    | Read HTML from stdin. Useful for one-off generation pipelines. |

Examples:

```bash
slidify convert deck.html out.pptx --json
slidify convert slides/   out.pptx --json
echo "$HTML" | slidify convert - out.pptx --json
```

## Profiles

```bash
# Fast preview while iterating on HTML (no oracle, no LLM):
slidify convert deck.html out.pptx --no-oracle --no-tier3 --json

# Production emit (default — oracle on, LLM on if available):
slidify convert deck.html out.pptx --json
```

## Authoring HTML well

If the user is generating the HTML, ALWAYS read the authoring guide first:

```bash
slidify guide authoring                            # full text
slidify guide authoring --toc                      # just headings
slidify guide authoring --section "Hard contract"  # one section
slidify guide authoring --grep "raster"            # search inside
```

The TL;DR:

1. Single self-contained HTML file. Inline CSS only. No external stylesheets, no JS.
2. Viewport is **exactly 1280×720 px**.
3. One element per slide carries `data-pptx-role="title"`.
4. Use the **Inter** font; slidify embeds it.
5. Prefer native primitives: gradients, `box-shadow`, `border-radius`, inline SVG with `<rect>/<circle>/<path>`.
6. Add `data-slidify-decorate="hero|spotlight|aurora|orbit|glass|tactile|recessed"` to ~3–6 elements per slide for layered native effects.
7. Avoid `background-image: url(...)`, `filter: blur(...)`, `<canvas>`, `@font-face`, arbitrary `transform: rotate()`, and `<table>` (use CSS grid).

For deeper authoring guidance, the `slide-generator` agent in this repo is
tuned for slidify and will produce dense, native-emit-friendly HTML.

## Reading the result

```jsonc
{
  "pptx_path":            "deck.pptx",
  "n_slides":             12,
  "native_area_ratio":    0.873,    // ≥0.85 excellent, 0.6–0.85 ok, <0.6 audit
  "pattern_coverage":     0.41,
  "editability_passed":   true,     // false → shapes silently dropped
  "editability_failing_slides": [],
  "fidelity_reports":     [{"slide_index":0,"ssim":0.961,"ocr_recall":1.0,"passed":true}, ...],
  "unmatched_signatures": [...],    // Tier-0 candidates for the harvester
  "_next":                [...]     // concrete follow-up commands
}
```

Decision rules for the agent:

1. `editability_passed == false` → re-emit the failing slides individually,
   or read `slidify guide troubleshooting --section "editability_passed"`.
2. `native_area_ratio < 0.6` → the deck is mostly raster. Use
   `slidify guide authoring --section "What forces a raster"` to find
   common offenders, fix HTML, retry.
3. `unmatched_signatures` non-empty AND user owns the corpus → suggest
   running `slidify harvest <corpus_dir>` to surface new Tier-0 patterns.

## Errors come with remediation

Failed runs in `--json` mode return:

```jsonc
{
  "error": "Executable doesn't exist at /opt/pw-browsers/...",
  "type":  "PlaywrightError",
  "stage": "convert",
  "_remediation": [
    "Run `slidify doctor` to verify Chromium is installed.",
    "Install with: `playwright install chromium --with-deps`"
  ]
}
```

Read `_remediation`, perform the fix, retry. Do not paper over the error
with extra `try/except` — surface it back to the user when remediation
needs human input (credentials, package install, etc.).

## Exit codes

| Code | Meaning                                                         |
|------|-----------------------------------------------------------------|
| 0    | success                                                         |
| 1    | doctor: required system dependency missing                      |
| 2    | conversion error (input not found, render/LLM failure)          |
| 3    | editability drift — shapes silently dropped from output         |

## Environment

The CLI works without API keys (tier-3 falls back to Raster). For best
fidelity provide one of:

* `ANTHROPIC_API_KEY` — `anthropic` backend
* `GEMINI_API_KEY`    — `gemini-aistudio` backend
* `GOOGLE_CLOUD_PROJECT` (+ `GOOGLE_CLOUD_LOCATION`) — Vertex backends

Or steer with `SLIDIFY_LLM_BACKEND` / `SLIDIFY_LLM_MODEL` /
`SLIDIFY_RENDER_CONCURRENCY` / `SLIDIFY_NO_ORACLE` / `SLIDIFY_NO_TIER3`.

## Packaging / deployment

If the host doesn't have LibreOffice / Tesseract / Chromium, run inside the
slidify Docker image instead:

```bash
docker run --rm -v "$PWD":/work slidify:latest \
       convert /work/deck.html /work/out.pptx --json
```

`slidify guide binary` describes the three packaging modes (Docker,
PyInstaller onefile, hybrid bundle).

## End-to-end agent loop

```bash
# 1. Verify environment.
slidify doctor --json | slidify field /dev/stdin checks.0.ok    # required deps?

# 2. Read the schema you'll be working with.
slidify manifest convert > /tmp/spec.json

# 3. Generate or receive HTML.
# ... write deck.html ...

# 4. Convert.
slidify convert deck.html out.pptx --json --report-json /tmp/r.json

# 5. Branch on outcome.
EDIT_OK=$(slidify field /tmp/r.json editability_passed)
NAR=$(slidify field /tmp/r.json native_area_ratio)
# Decide: ship, re-emit, or refactor HTML.
```

That loop is the entire skill. Everything else is detail surfaced through
`slidify guide`, `slidify manifest`, and the `_next` / `_remediation`
fields in JSON output.
