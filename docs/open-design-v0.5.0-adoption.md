# Open Design v0.5.0 Adoption

Source release: <https://github.com/nexu-io/open-design/releases/tag/open-design-v0.5.0>

This tracks what Pixelpitch borrowed from the upstream `open-design-v0.5.0`
release and how it maps onto this repository's current boundaries.

## Implemented

- Live Artifact skill and clinic-console template:
  `content/skills/live-artifact/`.
- Live dashboard skills:
  `content/skills/live-dashboard/` and
  `content/skills/flowai-live-dashboard-template/`.
- New prototype skills:
  `content/skills/waitlist-page/` and
  `content/skills/social-media-dashboard/`.
- Totality Festival design system:
  `content/design-systems/totality-festival/`.
- Notion-style live-dashboard image prompt template:
  `content/prompt-templates/image/notion-team-dashboard-live-artifact.*`.
- Form validation craft module:
  `content/craft/form-validation.md`, indexed from
  `content/craft/README.md`.
- Live Artifact daemon CLI wrapper:
  `pixelpitch tools live-artifacts create|list|update|refresh`, backed by
  existing `/api/tools/live-artifacts/*` endpoints and
  `PIXELPITCH_DAEMON_URL` / `PIXELPITCH_TOOL_TOKEN`.
- Portless loopback GET Origin compatibility:
  same-host GET requests with `Origin: http://127.0.0.1` are accepted while
  mutating methods still require an exact port match.
- OpenAI image request timeout hardening:
  image generation uses an Undici dispatcher with 10 minute header/body
  timeouts.
- Nano Banana image provider:
  `gemini-3.1-flash-image-preview` is available in the image model picker,
  supports stored model overrides, uses `x-goog-api-key` for the public Gemini
  API, and supports Vertex AI `aiplatform.googleapis.com` publisher endpoints
  with bearer credentials.
- Orbit briefing skills:
  `orbit-general`, `orbit-github`, `orbit-gmail`, `orbit-linear`, and
  `orbit-notion`.
- HyperFrames video prompt template refresh:
  upstream v0.5.0 `hyperframes-*.json` templates are mirrored under
  `content/prompt-templates/video/`.

## Already Present Locally

- Comment/inspect bridge primitives in `apps/web/src/runtime/srcdoc.ts`.
- Live Artifact daemon endpoints and token-scoped tool authorization.
- Connector wrapper command surface for listing/executing read-only connector
  tools.
- Media model catalog entries beyond the older upstream baseline.

## Not Adopted In This Pass

- Accent-color launcher theming and Indonesian locale:
  the current Pixelpitch UI has diverged enough that this needs a dedicated
  UI pass rather than direct vendoring.
- Qoder agent adapter:
  not enough local product surface alignment yet.
- Linux headless packaging changes:
  Pixelpitch's `tools/dev` and `tools/pack` boundaries differ from upstream
  release packaging.
- Project transcript export:
  Pixelpitch has critique transcript persistence already; general chat/run
  transcript export should be designed against the local DB schema.
- Full inspect-mode style tuning panel:
  Pixelpitch has the bridge primitives, but the upstream panel needs a careful
  merge into the dirty/local `FileViewer` surface.
- Execution-settings connection tests:
  upstream has a substantial daemon route plus agent-spawn smoke tests; still
  needs a Pixelpitch-specific route/UI pass.
- SketchEditor prompt modal, settings overflow/subtitle tweaks, tabs scrollbar
  fix, chat pane overflow fix, and Critique Theater Phase 5 composer wiring:
  still queued for a focused UI pass.
- HyperFrames template browser preview/provider badge/source filters:
  prompt template data landed; web filtering/presentation updates have not.
- Browser-side live-dashboard connector polling:
  Pixelpitch intentionally keeps `PIXELPITCH_TOOL_TOKEN` out of artifact
  iframes. The vendored skill documents seeded in-page refresh plus the
  registered Live Artifact wrapper path for real connected data.
