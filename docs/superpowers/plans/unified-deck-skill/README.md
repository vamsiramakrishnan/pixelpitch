# Unified Deck Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a narrative-first deck authoring system that composes 22 existing skills into a structured workflow with interactive UI, per-slide editing, and slidify export.

**Architecture:** Agent writes `deck-plan.json` + slide fragments. Web app stitches for preview. Daemon assembles for export. All existing skills remain callable standalone.

**Tech Stack:** TypeScript, React 18, Next.js 16, Bun, CSS custom properties, slidify (Python)

**Spec:** [docs/superpowers/specs/2026-05-04-unified-deck-skill-design.md](../specs/2026-05-04-unified-deck-skill-design.md)

---

## Plan Structure

This plan is split into 6 workstream files. Each can be executed independently — workstreams 1-2 have no cross-dependencies. Workstream 3 depends on 1 and 2. Workstreams 4-6 can run in parallel after 3.

| # | Workstream | File | Harness | Dependencies |
|---|-----------|------|---------|-------------|
| 1 | **Contracts Layer** | [01-contracts.md](01-contracts.md) | Gemini | None |
| 2 | **Skill Content** | [02-skill-content.md](02-skill-content.md) | Codex | None |
| 3 | **Daemon Endpoints** | [03-daemon.md](03-daemon.md) | Gemini | 1 |
| 4 | **Web Components** | [04-web-components.md](04-web-components.md) | Claude | 1, 3 |
| 5 | **Craft Rules** | [05-craft-rules.md](05-craft-rules.md) | Codex | 2 |
| 6 | **Integration & Testing** | [06-integration.md](06-integration.md) | All three | 1-5 |

## Execution Order

```
Phase 1 (parallel):  01-contracts (Gemini)  +  02-skill-content (Codex)
Phase 2 (parallel):  03-daemon (Gemini)     +  05-craft-rules (Codex)
Phase 3:             04-web-components (Claude)
Phase 4:             06-integration (all three, cross-review)
```

## File Ownership Map

| Path | Owner | Created/Modified |
|------|-------|-----------------|
| `packages/contracts/src/api/deck.ts` | Gemini | Created |
| `apps/daemon/src/deck.ts` | Gemini | Created |
| `apps/daemon/src/server.ts` | Gemini | Modified (add deck routes) |
| `apps/daemon/src/prompts/system.ts` | Gemini | Modified (narrative flag) |
| `content/skills/deck/SKILL.md` | Codex | Created |
| `content/skills/deck/assets/framework.js` | Codex | Created (sourced from html-ppt) |
| `content/skills/deck/assets/framework.css` | Codex | Created (sourced from html-ppt) |
| `content/skills/deck/references/*.md` | Codex | Created (5 reference files) |
| `content/craft/deck-authoring.md` | Codex | Created |
| `apps/web/src/components/deck/*.tsx` | Claude | Created (9 components) |
| `apps/web/src/components/ProjectView.tsx` | Claude | Modified (deck detection) |
| `e2e/tests/deck-workflow.spec.ts` | Claude | Created |

## Verification Commands

```bash
# Typecheck
bun run --filter @pixelpitch/web typecheck
bun run --filter @pixelpitch/contracts typecheck
bun run --filter @pixelpitch/daemon typecheck

# Tests
bun run --filter @pixelpitch/web test
bun run --filter @pixelpitch/daemon test
bun run test:e2e:live

# Visual check
bun run dev  # then create a deck project and walk through all 5 phases
```
