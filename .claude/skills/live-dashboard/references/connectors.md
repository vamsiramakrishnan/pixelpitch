# Connectors

`live-dashboard` is a **Live Artifact**. The values it shows are not
hard-coded — they are polled from a connector at runtime. The Pixelpitch daemon
(0.4.0+) ships a Composio connector catalog and a `connectors.json`
contract that artifacts emit alongside `index.html`.

When `inputs.connector === mock` (or the daemon cannot resolve the
configured connector), the artifact falls back to seeded sample data.
This keeps screenshots, the picker preview, and offline use working.

> **Status — relationship to `skills/live-artifact/`.**
>
> The canonical, currently-shipping live-artifact contract lives in
> [`skills/live-artifact/SKILL.md`](../../live-artifact/SKILL.md): it is
> *file-shaped* (`artifact.json` + `template.html` + `data.json` +
> `provenance.json`) and *CLI-shaped* on the agent side (the agent calls
> `"$PIXELPITCH_NODE_BIN" "$PIXELPITCH_BIN" tools live-artifacts {create,update}` and
> `tools connectors {list,execute}` rather than HTTP). The renderer is
> scalar-only `html_template_v1` (`apps/daemon/src/live-artifacts/render.ts`).
>
> `live-dashboard` is a **complementary** browser-runtime variant: the
> artifact is rendered as a single self-contained HTML page, and the
> live behaviors (refresh-on-open, manual Refresh, auto-refresh, stale
> pill) run in-page rather than at template-render time. Polling
> therefore needs an HTTP shape, which is what the rest of this file
> describes (`POST /api/tools/connectors/execute`).
>
> Treat the in-page HTTP shape below as a **forward-looking proposal**
> that sits alongside the file/CLI contract: Pixelpitch exposes
> authenticated connector execution for agent/runtime tools, but it does
> not expose connector bearer tokens to arbitrary artifact iframes. Out
> of the box, this template renders against seeded sample data and the
> Refresh button tweens the fixture. When a scoped browser poll route
> lands, only `seedNextChange()` in the template needs to be replaced
> with the `poll()` helper documented here. Until then, use
> `skills/live-artifact/` plus the wrapper commands for real registered,
> refreshable artifacts.

---

## `connectors.json` schema

Emit one `connectors.json` at the project root next to `index.html`:

```json
{
  "schema": "pixelpitch.connector/1",
  "primary": "notion",
  "freshness": {
    "auto_refresh_seconds": 30,
    "warn_after_seconds": 90,
    "fail_after_seconds": 600
  },
  "bindings": {
    "notion": {
      "provider": "composio.notion",
      "auth_ref": "media-config.json#notion.token",
      "reads": [
        {
          "id": "tasks_active",
          "endpoint": "databases.{id}.query",
          "params": { "id": "${notion.tasks_db_id}",
                      "filter": { "property": "Status", "status": { "does_not_equal": "Done" } },
                      "sorts":  [{ "property": "Updated", "direction": "descending" }] },
          "shape": "task[]"
        },
        {
          "id": "kpi_total",
          "endpoint": "databases.{id}.query",
          "params": { "id": "${notion.tasks_db_id}", "page_size": 1 },
          "extract": "$.metadata.total_count",
          "shape": "integer"
        },
        {
          "id": "activity_recent",
          "endpoint": "search",
          "params": { "filter": { "property": "object", "value": "page" },
                      "sort":   { "direction": "descending", "timestamp": "last_edited_time" },
                      "page_size": 8 },
          "shape": "activity[]"
        }
      ],
      "events": [
        { "id": "task_changed", "type": "page.updated", "selector": "$.tasks_db_id" }
      ]
    }
  }
}
```

The shape is intentionally close to Notion's REST API — the daemon's
connector adapter rewrites `endpoint` and `params` into the live
provider call. Other connectors (Linear, Stripe, Posthog) follow the
same shape with provider-specific `endpoint` strings.

---

## Resolution order (what the daemon does)

1. Read `connectors.json` from the artifact dir.
2. Look up `bindings[primary].provider` in the Composio catalog.
3. Resolve `auth_ref` against the daemon's `media-config.json`. The
   actual lookup is environment-aware (see
   [`apps/daemon/src/media-config.ts`](../../../apps/daemon/src/media-config.ts),
   `configFile()` — precedence high → low):
   - `<PIXELPITCH_MEDIA_CONFIG_DIR>/media-config.json` when that env var is set;
   - else `<PIXELPITCH_DATA_DIR>/media-config.json` when `PIXELPITCH_DATA_DIR` is set
     (relative paths are anchored to the active project root, `$HOME`
     and `~` shorthands are expanded);
   - else `<projectRoot>/.pixelpitch/media-config.json` for the active project.

   The artifact never opens any of these paths itself — it always goes
   through the daemon poll endpoint, and the daemon enforces the
   correct lookup order. **Never** read tokens from the artifact.
4. For each `reads[].endpoint`, the daemon constructs the live HTTP
   request with the resolved auth and substitutes `${...}` placeholders
   from the resolved `media-config.json#<provider>.*` values.
5. Cache responses for `freshness.auto_refresh_seconds`. The
   `Refresh` button issues an explicit poll that bypasses the cache.

---

## Wiring inside `index.html`

The artifact does **not** call Composio directly. Today, connector reads
belong in the agent/runtime path through the injected wrapper command:

```bash
"$PIXELPITCH_NODE_BIN" "$PIXELPITCH_BIN" tools connectors execute \
  --connector "$CONNECTOR_ID" \
  --tool "$TOOL_NAME" \
  --input input.json
```

Persist the normalized result into the Live Artifact `data.json`, then
register or update through `tools live-artifacts`. Do not place
`PIXELPITCH_TOOL_TOKEN` inside browser code.

Future scoped browser polling may use a daemon-local proxy shape like:

```js
async function poll(readId) {
  const res = await fetch(`/api/live-artifacts/connectors/poll`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ project: "<project_id>", read: readId })
  });
  if (!res.ok) throw new Error(`poll ${readId} failed: ${res.status}`);
  return res.json();
}
```

`<project_id>` is injected by the daemon at render time via a
`<meta name="pixelpitch:project" content="...">` tag. The artifact reads it
once on mount. Until that route exists, keep the in-page refresh path on
seeded data and use the wrapper commands for real connected refreshes.

---

## Fallback behavior

- On `fetch` error: keep the previously-rendered values, swap the
  live-pill to amber `Stale · <ago>`, write a small grey hint into the
  footer (`Source: Notion · last good poll 4 min ago`).
- On `inputs.connector === mock`: skip `poll()` entirely, use the
  `seedMock()` function in `index.html`. The live-pill displays
  `Sample data` in grey with no dot animation.
- On 401/403: surface a one-time toast `Reconnect Notion in Settings →
  Connectors` and stop further polls until the next manual Refresh.

---

## Provider-specific cheat sheet

| Connector | `provider`         | Shape of one row             | Typical KPI                        |
|---        |---                 |---                           |---                                 |
| Notion    | `composio.notion`  | `task = {title, status, assignee, due, prio, updated}` | total tasks · done this week · members · review |
| Linear    | `composio.linear`  | `issue = {title, state, assignee, priority, updated}`  | backlog · in progress · blocked · cycle progress |
| Stripe    | `composio.stripe`  | `event = {type, amount, customer, created}`            | MRR · churn · new subs · refunds   |
| Posthog   | `composio.posthog` | `event = {name, distinct_id, $current_url, ts}`        | DAU · signups · feature adoption · errors |

Do not invent per-provider shapes. If the user wants something not in
this table, fall back to `mock` and surface a footer hint asking the
user to extend the connector catalog.
