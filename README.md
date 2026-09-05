# pixelpitch

Pixelpitch is a local slide-authoring system built around HTML preview and PPTX export.

A coding agent can author slide HTML, preview it in a sandboxed browser surface, iterate on the deck, and export it through `slidify`, the repository's HTML-to-PPTX converter.

## Quickstart

```bash
./setup.sh
bun run dev
```

`setup.sh` installs the Bun workspace dependencies, builds the package chain, and mirrors the bundled skills. `bun run dev` starts the daemon and web application.

If setup fails:

```bash
bun run doctor
```

See [`QUICKSTART.md`](QUICKSTART.md) for the longer setup path.

## Main pieces

```text
coding agent
    │
    ▼
local daemon
    │ streamed artifacts
    ▼
web app
    │
    ├── sandboxed HTML preview
    ├── deck navigation
    ├── design-system / skill inputs
    └── project state
    │
    ▼
slidify
    │
    └── PPTX
```

The daemon discovers supported local coding-agent CLIs from `PATH` and streams their artifacts into the application. The checked repository currently includes adapters for Claude Code, Codex, Gemini CLI, Cursor Agent, Copilot, Devin, OpenCode, Qwen, Hermes, Kimi, Pi, Kiro, and Mistral.

The repository also contains bundled deck skills, design-system references, and media prompt templates. Those are authoring inputs; `slidify` is the PPTX export implementation.

## slidify

`slidify` converts HTML slides into PowerPoint while keeping elements native when the converter can reproduce them with useful fidelity.

Native output includes text boxes, shapes, lines, tables, pictures, and supported SVG-derived geometry. Effects that PowerPoint cannot reproduce cleanly can remain rasterized.

The converter measures two different concerns:

- editability, including `native_area_ratio`;
- rendered fidelity, including SSIM and OCR-based checks.

A high native-area ratio is not useful if the PowerPoint rendering no longer resembles the source. The optimization therefore treats editability as constrained by the configured fidelity checks.

## Convert a deck

Single HTML file:

```bash
slidify deck.html deck.pptx
```

Directory of slide files:

```bash
slidify slides/ deck.pptx
```

Pipe HTML from stdin:

```bash
cat deck.html | slidify convert - deck.pptx --json
```

Environment checks and command discovery:

```bash
slidify doctor
slidify manifest --brief
slidify manifest convert
slidify guide
slidify guide authoring
```

Current exit-code meanings are:

| Code | Meaning |
| ---: | --- |
| `0` | command completed |
| `1` | doctor found missing dependencies |
| `2` | conversion failed |
| `3` | editability drift was detected |

CLI JSON output includes remediation and next-command data where the command implementation supplies it.

## Python API

```python
import asyncio
from pathlib import Path
from slidify import ConversionConfig, convert

async def main():
    config = ConversionConfig(run_tier3=True, run_oracle=True)
    await convert(Path("deck.html"), "out.pptx", config)

asyncio.run(main())
```

`convert` accepts HTML text, a single HTML path, a directory of slide files, an iterable of HTML strings, or an async iterator.

The converter streams slides through the pipeline. Peak working state is primarily controlled by render concurrency, except when oracle correction retains per-slide plans and rendered references. Use the low-memory option when that retained correction state is not needed.

## Conversion pipeline

```text
HTML
  │
  ▼
split slides
  │
  ▼
Playwright render
  │
  ▼
DOM walk
  │
  ▼
VisualUnit clustering
  │
  ├── tier 1: deterministic rules
  ├── tier 2: heuristic classification
  └── tier 3: optional model adjudication
  │
  ▼
promotion / emit
  │
  ▼
PPTX
  │
  ▼
optional LibreOffice + SSIM + OCR oracle
  │
  └── correction / report
```

Tier 3 is used for units that remain ambiguous after the deterministic and heuristic passes. If no model provider is configured, the converter can fall back to raster decisions rather than requiring a model call for the conversion to finish.

Supported tier-3 backends in the current code include Gemini through AI Studio or Vertex AI, Anthropic's API, and Claude on Vertex AI. Check the current configuration code for model defaults before depending on a specific model identifier.

## Authoring hints

HTML authors can use `data-pptx-*` attributes to give the converter explicit information when automatic classification is unnecessary or ambiguous.

Examples:

```html
<h1 data-pptx-role="title">Quarterly results</h1>
<canvas data-pptx-rasterize="true">...</canvas>
<div data-pptx-skip="true">debug overlay</div>
<div data-pptx-text="Q1 results">visual replacement</div>
<div data-pptx-allow-overflow="true">intentional bleed</div>
```

`data-atom="<id>"` selects a known atomic recipe where one exists. See [`examples/landing/atoms.html`](examples/landing/atoms.html) and the [`slide-author`](.claude/skills/slide-author/SKILL.md) skill for the current authoring grammar.

These hints bypass parts of classification. They therefore shift responsibility to the producer: an incorrect hint can still create a poor conversion.

## Fidelity bench

The `_bench` corpus is used to find repeated conversion misses and decide whether a miss should become:

- a native atom or pattern;
- a hybrid recipe with an editable structure and raster effect layer;
- a retained raster path with better crop, resolution, or transparency handling.

Useful commands:

```bash
make bench-index-all
make bench-harvest
make bench-render DECK=product-pitch
make bench-app
```

The harvester writes machine-readable and Markdown reports under `_bench/reports/harvest/`.

A corpus result measures the specimens in that corpus. It does not establish that arbitrary HTML will meet the same fidelity or editability thresholds.

## Local dependencies

The Bun application can be checked with:

```bash
bun run doctor
```

The PPTX backend uses additional system tools for full fidelity checks:

```bash
sudo apt-get install -y \
  libreoffice-impress \
  poppler-utils \
  tesseract-ocr \
  fonts-inter

make doctor
```

Install Chromium/Playwright system dependencies when needed:

```bash
make playwright-deps
make doctor
```

`make doctor` launches headless Chromium, so it can catch missing browser libraries before a render run.

## Application architecture

```text
apps/web/             web UI: chat, preview, agent panel, exports
apps/daemon/          localhost daemon and coding-agent adapters
packages/contracts/   web / daemon TypeScript contracts
packages/platform/    cross-platform process handling
packages/sidecar/     preview-side React/Babel runtime
packages/sidecar-proto/ IPC types
packages/hyperframes-types/ frame/runtime contracts
skills/               authoring and operational skills
prompt-templates/     image, video, and audio prompt templates
design-systems/       design-system references
slidify/              HTML-to-PPTX converter
components/           multi-target React components
_bench/               corpus, mixes, reports, and render outputs
```

HTML can also target the HyperFrames runtime where the relevant contracts are used. PPTX and video output are different backends; support for one does not imply visual equivalence on the other.

## Development

```bash
make bun-install
make daemon   # localhost:17456
make web      # localhost:3000
```

General checks:

```bash
make check
make doctor
```

## Third-party work

Pixelpitch incorporates or adapts work from several projects, including:

- [nexu-io/open-design](https://github.com/nexu-io/open-design)
- [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)
- [op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)
- [OpenCoworkAI/open-codesign](https://github.com/OpenCoworkAI/open-codesign)
- [multica-ai/multica](https://github.com/multica-ai/multica)
- [alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design)

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for licenses, attribution details, and recorded upstream revisions.

## Boundaries

- `slidify` preserves editability where its native emitter supports the source visual. It rasterizes unsupported effects rather than claiming every HTML construct is editable in PowerPoint.
- SSIM and OCR thresholds measure the configured render comparison, not subjective slide quality.
- Tier-3 model adjudication is optional and can vary by provider/model revision.
- The coding-agent adapters execute external local CLIs and inherit the permissions and behavior of those tools.
- A successful browser preview does not prove equivalent output in PowerPoint; the export oracle exists to test that separate rendering path.

## License

Apache-2.0. See [`LICENSE`](LICENSE).
