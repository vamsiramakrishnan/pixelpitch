---
name: html-ppt-xhs-post
description: 小红书 / Instagram 风 9 页 3:4 竖版图文（810×1080）— 暖色 pastel、虚线 sticker 卡片、底部页码点点。用于发小红书图文、Instagram carousel、品牌种草内容。
triggers:
  - "小红书"
  - "xhs"
  - "xhs post"
  - "xiaohongshu"
  - "图文"
  - "instagram carousel"
  - "种草"
pixelpitch:
  mode: deck
  scenario: marketing
  featured: 24
  upstream: "https://github.com/lewislulu/html-ppt-skill"
  preview:
    type: html
    entry: index.html
  design_system:
    requires: false
  speaker_notes: true
  animations: true
  example_prompt: "帮我用 html-ppt-xhs-post 模板做一组 9 张小红书图文（3:4 竖版，810×1080）。先告诉我主题，然后帮我把封面 + 7 页内容 + 结尾 CTA 排好，每页一句标题 + 一段正文 + 关键词 sticker。"
---
# HTML PPT · 小红书 图文

A focused entry point into the [`html-ppt`](../html-ppt/SKILL.md) master skill that lands the user directly on the **`xhs-post`** full-deck template.

## When this card is picked

The Examples gallery wires "Use this prompt" to the example_prompt above. When you accept that prompt, this card is the right pick if the user wants exactly the visual identity of `xhs-post` (see the upstream [full-decks catalog](../html-ppt/references/full-decks.md) for screenshots and rationale).

## How to author the deck

1. **Read the master skill first.** All authoring rules live in
   [`skills/html-ppt/SKILL.md`](../html-ppt/SKILL.md) — content/audience checklist,
   token rules, layout reuse, presenter mode, the keyboard runtime, and the
   "never put presenter-only text on the slide" rule.
2. **Start from the matching template folder:**
   `skills/html-ppt/templates/full-decks/xhs-post/` — copy `index.html` and
   `style.css` into the project, keep the `.tpl-xhs-post` body class.
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
5. **Replace demo content, not classes.** The `.tpl-xhs-post` scoped CSS only
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
