---
name: html-ppt-hermes-cyber-terminal
description: 暗终端 honest-review deck — #0a0c10 黑底 + 56px 赛博网格 + CRT 暗角 + 扫描线、窗口红绿灯 chrome、`$ prompt` 命令行标题、薄荷绿 #7ed3a4 大字、JetBrains Mono、stroke-only 柱状图、blinking 光标、琥珀/绿/红三档 tag、暗色代码块。适合 CLI / agent / dev tool 测评（含 trace、diff、benchmark）。
triggers:
  - "terminal review"
  - "cli review"
  - "agent review"
  - "honest review"
  - "dev tool review"
  - "测评"
pixelpitch:
  mode: deck
  scenario: engineering
  featured: 30
  upstream: "https://github.com/lewislulu/html-ppt-skill"
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  example_prompt: "用 html-ppt-hermes-cyber-terminal 模板做一份 CLI / agent 测评 PPT。深色终端风 + scanlines + 命令行标题 + benchmark 柱状图。先确认：被测评对象、3-5 个对比维度、benchmark 数据。"
---
# HTML PPT · 暗终端测评

A focused entry point into the [`html-ppt`](../html-ppt/SKILL.md) master skill that lands the user directly on the **`hermes-cyber-terminal`** full-deck template.

## When this card is picked

The Examples gallery wires "Use this prompt" to the example_prompt above. When you accept that prompt, this card is the right pick if the user wants exactly the visual identity of `hermes-cyber-terminal` (see the upstream [full-decks catalog](../html-ppt/references/full-decks.md) for screenshots and rationale).

## How to author the deck

1. **Read the master skill first.** All authoring rules live in
   [`skills/html-ppt/SKILL.md`](../html-ppt/SKILL.md) — content/audience checklist,
   token rules, layout reuse, presenter mode, the keyboard runtime, and the
   "never put presenter-only text on the slide" rule.
2. **Start from the matching template folder:**
   `skills/html-ppt/templates/full-decks/hermes-cyber-terminal/` — copy `index.html` and
   `style.css` into the project, keep the `.tpl-hermes-cyber-terminal` body class.
3. **Bring the shared runtime with the template.** The upstream
   `index.html` links the shared CSS/JS via `../../../assets/...` because it
   sits three folders deep inside `skills/html-ppt/templates/full-decks/`.
   Once you copy `index.html` into the project, those parent-relative URLs
   no longer resolve and `base.css`, `animations.css`, and `runtime.js`
   will 404 — meaning the deck never activates and slide navigation is
   dead. Pick one of these two recipes per project:
   - **Recipe A — copy + rewrite (preferred):** copy
     `skills/html-ppt/assets/fonts.css`, `skills/html-ppt/assets/base.css`,
     `skills/html-ppt/assets/animations/animations.css`, and
     `skills/html-ppt/assets/runtime.js` into a project-local
     `assets/` (with `assets/animations/animations.css`), then rewrite the
     four `<link>`/`<script>` tags in `index.html` from
     `../../../assets/...` to the matching project-local paths
     (`assets/fonts.css`, `assets/base.css`,
     `assets/animations/animations.css`, `assets/runtime.js`).
   - **Recipe B — inline:** read the same four files and replace each
     `<link rel="stylesheet" href="../../../assets/...">` with a
     `<style>...</style>` containing the file's contents, and the
     `<script src="../../../assets/runtime.js">` with a
     `<script>...</script>` containing `runtime.js`. Yields a single
     self-contained `index.html`.
   Either way, do not ship the upstream `../../../assets/...` URLs
   verbatim into a project artifact — they only work in-tree.
4. **Pick a theme.** Default tokens look fine; if the user wants a different
   feel, swap in any of the 36 themes from `skills/html-ppt/assets/themes/*.css`
   via `<link id="theme-link">` and let `T` cycle.
5. **Replace demo content, not classes.** The `.tpl-hermes-cyber-terminal` scoped CSS only
   recognises the structural classes shipped in the template — keep them.
6. **Speaker notes go inside `<aside class="notes">` or `<div class="notes">`** — never as visible text on the slide.

## Attribution

Visual system, layouts, themes and the runtime keyboard model come from
the upstream MIT-licensed [`lewislulu/html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill). The
LICENSE file ships at `skills/html-ppt/LICENSE`; please keep it in place when
redistributing.

<!-- pixelpitch:slidify-aware -->
## Slidify-aware authoring (PPTX export)

This deck skill is part of pixelpitch's slide-designing system. The
HTML you author here is rendered live in the sandboxed iframe preview
and, when the user exports to PPTX, fed through `slidify` for a
maximally-editable PowerPoint file.

You don't need to change any of the design above to make slidify happy.
You can use `backdrop-filter`, `mix-blend-mode`, `<canvas>` heroes,
gradient text-clipping, and the full Tailwind / shadcn / Lucide stack.

There are **three free hints** that help slidify produce more editable
PPTX without changing a single pixel:

1. **Tag the slide title.** Add `data-pptx-role="title"` to the `<h1>`
   (or `<h2>`) you treat as the slide title. Slidify routes it to the
   master title placeholder and keeps it editable.
2. **Use atomic-seed atoms when one matches.** When your CSS happens to
   match a named recipe (`bg.mesh`, `type.gfill-4`, `data.ring`,
   etc.), tag the cluster anchor with `data-atom="<id>"`. Your CSS
   still runs in the browser unchanged; the hint just helps slidify
   pick the curated native recipe instead of guessing.
3. **Mark intentional bleed.** When a decorative element intentionally
   extends past the slide boundary (aurora glow, longshadow, marquee),
   tag the parent with `data-pptx-allow-overflow="true"`.

For irreducible effects (custom WebGL, complex masks), `data-pptx-rasterize="true"`
on the wrapper tells slidify to use a clean raster tile straight away
rather than discovering it.

Full guide: [`craft/slidify-compat.md`](../../craft/slidify-compat.md).
Atomic-seed grammar: [`slide-author`](../../.claude/skills/slide-author/SKILL.md)
sibling skill. Evolution loop (how slidify catches up to whatever this
skill emits): [`docs/slidify-evolution.md`](../../docs/slidify-evolution.md).

### Export

```bash
slidify convert deck.html out.pptx --json --report-json /tmp/r.json
slidify field /tmp/r.json native_area_ratio        # how editable the result is
slidify check deck.html                             # exit 0 ok / 3 = drift
```

Inside the pixelpitch web app, the daemon shells out to this same
`slidify` binary when the user clicks Export → PPTX.
