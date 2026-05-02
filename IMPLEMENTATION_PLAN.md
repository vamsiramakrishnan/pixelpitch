# Implementation Plan: Modular Refactor + LLM-First CLI + Documentation/Skill Sync

This plan operationalizes `ARCHITECTURE_REVIEW.md` into concrete execution phases, with emphasis on preserving the CLI as an LLM-friendly bash-native interface.

## Objectives
1. Reduce coupling across orchestration, classification, emission, and verification.
2. Keep behavior stable during refactor with measurable guardrails.
3. Improve the CLI contract for LLM agents (deterministic output, next-step affordances, stable error semantics).
4. Keep docs/skills in lockstep with implementation changes.
5. Evaluate and optionally build an auto-generated architecture recommendation pipeline.

---

## Phase 0 — Baseline and safety rails (Week 1)

### Deliverables
- Architecture baseline report (imports, module graph, public APIs).
- Golden conversion corpus snapshots.
- CI checks for smoke-level behavior stability.

### Tasks
- Add `tools/arch/scan_imports.py` to build module dependency graph.
- Add `tools/arch/report.py` to output:
  - top-level module coupling,
  - cyclic dependencies,
  - oversized files by LOC/function count.
- Persist a baseline JSON report in `_bench/architecture/baseline.json`.
- Add a minimal conversion smoke suite using representative decks from `_bench/corpus`.
- Add a CI job that compares current metrics with baseline thresholds (warn/fail policy).

### Acceptance criteria
- CI passes with baseline artifacts checked in.
- Team can view a single report showing current hotspots.

---

## Phase 1 — CLI contract hardening for LLM/bash usage (Week 1–2)

> Constraint: CLI is a machine-facing tool first; human output is secondary.

### Deliverables
- Stable JSON schema for all subcommands that support `--json`.
- Deterministic exit-code matrix.
- Actionable `_next` suggestions on all failure/success paths.

### Tasks
- Create `slidify/cli_schema.py` containing versioned response schemas:
  - `schema_version`, `command`, `status`, `error`, `metrics`, `_next`.
- Refactor `slidify/cli.py` into:
  - `slidify/cli/commands.py` (execution)
  - `slidify/cli/presenters.py` (human vs JSON formatting)
  - `slidify/cli/errors.py` (exception→remediation mapping)
- Standardize exit codes:
  - `0` success,
  - `2` user/data/config/runtime recoverable errors,
  - `3` verification quality gate failure (e.g., editability mismatch),
  - `10+` internal invariant failures.
- Ensure all JSON outputs are deterministic in key ordering and required fields.
- Expand `_next` hints to contain shell-ready commands whenever possible.

### Acceptance criteria
- LLM agent can reliably parse JSON and choose next command without heuristics.
- Exit codes are documented and tested.

---

## Phase 2 — Pipeline extraction and boundary definition (Week 2–4)

### Deliverables
- New stage-oriented pipeline modules.
- Slimmed `api.py` acting as orchestration façade.

### Tasks
- Create:
  - `slidify/pipeline/source.py`
  - `slidify/pipeline/planning.py`
  - `slidify/pipeline/execution.py`
  - `slidify/pipeline/verification.py`
- Migrate logic incrementally from `slidify/api.py`:
  1. Source normalization,
  2. slide planning + decisions,
  3. emit operations,
  4. oracle/editability loops.
- Keep existing public `convert(...)` signature stable.
- Add internal typed dataclasses for stage inputs/outputs.

### Acceptance criteria
- No user-facing API break.
- Equivalent output for baseline corpus within tolerance bounds.

---

## Phase 3 — Classifier and pattern extensibility (Week 3–5)

### Deliverables
- Registry-based classifier stage system.
- Explicit stage interfaces with confidence and rationale.

### Tasks
- Define `ClassifierStage` protocol/interface.
- Implement registration + ordering in `slidify/classifier/registry.py`.
- Wrap existing tier0/1/2/3 as registered stages.
- Add decision envelope contract:
  - `reason_code`, `confidence`, `features`, `fallback_path`.

### Acceptance criteria
- Built-in classifiers run through registry with unchanged default behavior.
- New experimental classifier can be added without editing orchestrator code.

---

## Phase 4 — Shared emission primitives (Week 4–6)

### Deliverables
- Unified PPTX primitive emit layer reused by HTML and IR paths.

### Tasks
- Extract common shape/text/fill/border/shadow application helpers into `slidify/emission/primitives.py`.
- Refactor `compile_ir.py` and runtime emitter to call shared primitives.
- Add targeted tests for primitive-level edge cases (gradients, border alpha, text runs).

### Acceptance criteria
- Reduced duplicate logic.
- Visual parity retained on baseline deck set.

---

## Phase 5 — Error policy and observability (Week 5–7)

### Deliverables
- Typed errors and policy-driven handling.
- Slide lifecycle event model.

### Tasks
- Add typed exceptions grouped by stage (`SourceError`, `PlanningError`, `EmissionError`, `VerificationError`).
- Replace broad `except Exception` where feasible with typed handling.
- Emit structured lifecycle events (JSONL optional sink):
  - `SlideRendered`, `DecisionMade`, `SlideEmitted`, `OracleResult`.
- Add CLI flags for event output destination.

### Acceptance criteria
- Failure modes are classifiable and documented.
- Debugging no longer requires ad hoc log spelunking.

---

## Phase 6 — Docs/skills/README synchronization (parallel throughout; hard gate before release)

### Deliverables
- Updated README and guides reflecting new architecture + CLI contract.
- Updated LLM skills/playbooks aligned with command semantics.

### Tasks
- Update `README.md`:
  - architecture section with stage diagram,
  - LLM-first CLI usage examples,
  - exit code and JSON contract table,
  - troubleshooting mapped to typed errors.
- Update guides in `slidify/guides/`:
  - `agent-quickstart.md` for deterministic automation patterns,
  - `api.md` for stable programmatic usage during refactor,
  - `troubleshooting.md` for new error taxonomy.
- Add/update repo-local skill specs (if used by your agent workflows):
  - include canonical command templates,
  - expected JSON fields,
  - remediation decision trees.
- Add a docs validation CI step (link check + examples parse check).

### Acceptance criteria
- Documentation matches runtime behavior and tests.
- Agent operators can run conversion loops with no undocumented branching logic.

---

## Phase 7 — Architecture fitness tests (Week 6–8)

### Deliverables
- Enforced layering and dependency direction tests.

### Tasks
- Add tests that block forbidden imports (e.g., adapters importing app internals incorrectly).
- Add architectural budget checks (max cycles, max module fan-in/fan-out).
- Add regression test for `--json` schema backwards compatibility by version.

### Acceptance criteria
- CI prevents architecture drift back to "Frankenstein" shape.

---

## Should we auto-generate architecture recommendations from current code state?

## Short answer
Yes—**as a supporting system**, not a replacement for human review.

## Recommended approach
Build a lightweight "architecture copilot" pipeline that continuously inspects the repo and suggests prioritized refactors.

### Proposed pipeline
1. **Static analysis collectors**
   - import graph, cycles, function complexity, file churn, test coverage gaps.
2. **Runtime signals**
   - slowest paths from benchmarks, failure clusters from CI logs.
3. **Heuristic scorer**
   - computes leverage score = impact × frequency × risk-reduction.
4. **LLM summarizer (optional)**
   - turns metrics into readable recommendations.
5. **Artifact generation**
   - writes `reports/architecture/recommendations.md` + machine-readable JSON.
6. **PR bot mode (optional)**
   - opens periodic PR updating recommendations and trend deltas.

### Guardrails
- Always attach evidence (metric references) to each recommendation.
- Never auto-merge architectural recommendations.
- Keep scoring deterministic; use LLM only for narrative formatting.

### Where it fits
- Run nightly + on release branches.
- Use as input for quarterly refactor planning.

---

## Milestones and sequencing overview
1. Baseline and safety rails.
2. LLM-first CLI hardening.
3. Pipeline split + boundaries.
4. Classifier registry.
5. Shared emission primitives.
6. Typed errors + lifecycle events.
7. README/skills/guides lockstep updates.
8. Architecture fitness enforcement.
9. Optional architecture recommendation auto-generation.

## Definition of Done (program-level)
- Public API compatibility preserved.
- CLI machine contract versioned and tested.
- Docs/skills updated and validated in CI.
- Architecture drift checks active.
- Baseline corpus quality metrics maintained or improved.
