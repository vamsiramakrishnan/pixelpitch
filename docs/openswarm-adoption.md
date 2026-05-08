# OpenSwarm Adoption Notes

Source: <https://github.com/VRSEN/OpenSwarm>

OpenSwarm is useful as a product-pattern reference, not as a dependency. It is
built on Agency Swarm and runtime patches, while Pixelpitch already owns a
daemon, persisted projects, run-scoped tool tokens, connector routes, and CLI
agent adapters. Borrow the orchestration patterns; do not import the framework.

## What To Borrow

### Native Specialist Routing

OpenSwarm separates routing from execution: the orchestrator chooses a
specialist and does not perform specialist work. Pixelpitch should model this
as daemon-owned specialist profiles layered on top of the existing agent
adapters:

- `artifact-builder`: creates or edits user-facing files.
- `researcher`: gathers source-backed context.
- `data-analyst`: analyzes structured data and creates charts.
- `media-producer`: image/video/audio generation and post-processing.
- `reviewer`: critique and QA.

The first implementation should be an explicit routing pass, not a new UI
surface. The browser can continue to show one run while the daemon tracks
sub-runs.

### Tool-Spawns-Agent

OpenSwarm's slide insertion tool creates an ephemeral planner agent that
returns JSON. Pixelpitch should make this a daemon primitive:

- Spawn a sub-run with a scoped prompt and working directory.
- Use a model/agent override when the subtask benefits from it.
- Require structured output for planner/reviewer subagents.
- Mint a child tool token scoped to the project and only the endpoints needed.
- Stream child status into the parent run as `agent` events.

This is the strongest near-term improvement because it upgrades Critique
Theater and artifact planning without forcing every chat turn through a swarm.

### DAG Fan-Out

OpenSwarm plans slide creation in dependency levels: independent slides run in
parallel, but slides that reuse a newly created template wait for the template
creator. Pixelpitch now has a reusable TypeScript primitive for this in
`apps/daemon/src/task-dag.ts`.

Immediate uses:

- Multi-slide deck generation.
- Multi-screen app/storyboard generation.
- Parallel media asset generation before a merge/refinement pass.
- Real multi-agent critique panels where each panelist is a sub-run.

### Progressive Tool Discovery

OpenSwarm's Composio pattern keeps tool schemas out of the base prompt until
needed. Pixelpitch already has connector list/execute routes, so the local
version should be:

- Compact connector/tool index in the system prompt.
- `connectors:list` for available tools and auth state.
- Add a narrow `connectors:inspect` operation for argument schemas.
- Keep `connectors:execute` validation in the daemon.

This keeps prompts small as connector coverage grows.

## What Not To Borrow

- Agency Swarm as a dependency.
- Runtime monkey patches.
- Stateless agent sessions as the default.
- Full-mesh handoff before sub-runs and specialist routing exist.
- Browser-side privileged connector polling from artifact iframes.

## Build Order

1. DAG planner primitive: landed in `task-dag.ts`.
2. Sub-run service extraction: landed as `agent-runner.ts` and
   `agent-run-service.ts`; the chat path now uses the service for spawn,
   token, event-sink, Critique, close/error, and cancellation lifecycle.
3. Parallel Critique orchestrator: landed in
   `apps/daemon/src/critique/parallel-orchestrator.ts`; it fan-outs reviewer
   work with bounded concurrency, fans results back into existing
   `critique.*` events, writes transcripts, and persists terminal rows.
4. Structured planner sub-run: JSON output with validation and timeout.
5. Critique Theater child-run adapter: landed behind
   `PIXELPITCH_CRITIQUE_PARALLEL_ENABLED=1`; the parallel orchestrator's
   `spawnReviewer` hook now creates real run-scoped reviewer sub-runs through
   `agent-run-service.ts`, collects structured JSON, and fans results into the
   existing `critique.*` stream.
6. Connector inspect route: landed as `/api/tools/connectors/inspect` plus
   `pixelpitch tools connectors inspect`; agent list calls now stay compact
   and full tool schemas are pulled on demand before execution.
7. Specialist router: choose handoff vs parallel delegation from the user
   request and current project shape.
