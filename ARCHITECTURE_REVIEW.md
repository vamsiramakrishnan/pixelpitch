# Architecture Review: Top 10 High-Leverage Modularity Improvements

This document identifies the highest-leverage refactors to make the codebase more modular, reduce "Frankenstein" coupling, and improve form/function alignment.

## 1) Split the conversion orchestrator into explicit pipeline stages
`slidify/api.py` currently owns source normalization, render/classify/promote flow, config, and state bookkeeping in one place. Break this into dedicated modules:
- `pipeline/source.py` (normalize/load)
- `pipeline/planning.py` (units/decisions/ops)
- `pipeline/execution.py` (emit + persistence)
- `pipeline/verification.py` (oracle/editability checks)

**Why high leverage:** isolates responsibilities, easier testing per stage, clearer extension points.

## 2) Introduce a plugin registry for tiered classifiers and pattern engines
The tier stack (`tier0` patterns, tier1/2 heuristics, tier3 LLM) is powerful but tightly wired. Add a registry interface (`ClassifierStage`) with ordered execution and score outputs. Then wire built-ins through registration.

**Why high leverage:** enables swapping/experimenting with classifiers without editing core orchestration.

## 3) Consolidate config into a single typed config system with profiles
`ConversionConfig` already carries many concerns (fidelity, performance, LLM, fonts, memory). Add profile support and validation:
- `fast`, `balanced`, `fidelity-first`, `ci-strict`
- explicit compatibility checks (e.g., low-memory + oracle correction)

**Why high leverage:** reduces accidental invalid combinations and makes behavior predictable.

## 4) Define a formal domain event model for each slide lifecycle step
Emit typed events such as `SlideRendered`, `UnitsClustered`, `TierDecisionMade`, `SlideEmitted`, `OracleFailed`.

**Why high leverage:** makes observability and debugging far more coherent than scattered logging; enables richer reporting and future UIs.

## 5) Extract CLI presentation logic from command behavior
`slidify/cli.py` mixes command execution, formatting, remediation text, and exit semantics. Move to:
- `cli/commands.py` for behavior
- `cli/presenters.py` for human/JSON output
- `cli/errors.py` for remediation policies

**Why high leverage:** keeps CLI feature growth maintainable and testable.

## 6) Create a shared emission abstraction for HTML→PPTX and IR→PPTX paths
`slidify/compile_ir.py` and runtime emitter logic likely duplicate shape/text/fill concerns. Extract a unified shape/text emission layer used by both conversion paths.

**Why high leverage:** one source of truth for PPTX primitive emission, fewer divergence bugs.

## 7) Replace broad try/excepts in emit paths with typed recoverable errors
`compile_ir` often swallows exceptions and logs warnings. Create typed errors (e.g., `PictureFetchError`, `InvalidColorError`) and handle by policy (fail-fast vs degrade).

**Why high leverage:** avoids silent quality regressions and gives stronger CI failure signals.

## 8) Introduce strict module boundaries: core domain vs adapters
Create explicit layers:
- `core/` (IR, units, decisions, policies)
- `adapters/` (Playwright, LibreOffice, LLM providers, filesystem)
- `app/` (pipeline orchestration)

**Why high leverage:** lowers coupling and makes replacement of infrastructure dependencies far easier.

## 9) Standardize decision explainability contracts across tiers
Every decision should include normalized rationale fields (`reason_code`, `features`, `confidence`, `fallback_path`).

**Why high leverage:** improves trust/debugging and enables automated analysis of misclassifications.

## 10) Add architecture tests and mutation-focused regression suites
Beyond output snapshots, enforce architectural constraints:
- dependency direction tests (no adapter→core imports)
- plugin registration completeness
- end-to-end oracle/editability invariants

**Why high leverage:** prevents regression into ad-hoc coupling as the system grows.

---

## Suggested execution order (quick wins first)
1. CLI extraction (5)
2. Typed error policy (7)
3. Config profiles + validation (3)
4. Pipeline stage split (1)
5. Shared emitter abstraction (6)
6. Classifier registry (2)
7. Domain events + explainability (4, 9)
8. Layer boundaries + architecture tests (8, 10)

