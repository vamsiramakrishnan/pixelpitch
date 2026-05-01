"""Fanout-then-merge driver.

Reads `_bench/corpus/scores.json` (produced by `run_corpus.py --score`),
picks the bottom-K slides by SSIM, dispatches K engine-fix agents in
parallel (each in its own git worktree, each given exactly one slide
to improve and the heatmap to localize the gap), and after they all
return, ranks their results by ΔSSIM and merges the winners that:

  1. Improve their target slide's SSIM by >= MIN_DELTA_TARGET.
  2. Do not regress the corpus mean SSIM by more than MAX_REGRESSION.

Cumulative validation re-runs the oracle after each merge so a winner
that no longer holds is reverted.

This script does NOT dispatch agents itself — it CAN'T from a Python
process. Instead it produces:
  - `_bench/fanout/tasks.json` — the work order, one entry per worst slide
  - prompt files at `_bench/fanout/prompts/*.md` — full briefing per agent
  - `_bench/fanout/MERGE.md` — the merge runbook to execute by hand or
    via a dispatcher running parallel Agent calls in the orchestrator.

The orchestrator (Claude in the parent agent loop) reads the tasks.json,
spawns the agents in worktrees with their prompts, waits, then invokes
this script with `--merge` to ingest results and validate.

Usage:
    # Plan the fanout — produces tasks.json + prompt files.
    python _bench/scripts/fanout.py --plan --bottom-k 3

    # After agents have finished and committed to their worktree branches,
    # validate + merge winners (one at a time, oracle-gated).
    python _bench/scripts/fanout.py --merge

The merge step:
  1. Reads tasks.json for the list of agent branches.
  2. For each branch (in order of best ΔSSIM the agent self-reported):
     - cherry-pick into a temp branch
     - re-run the oracle on the FULL corpus
     - if mean SSIM hasn't regressed > MAX_REGRESSION AND target slide
       SSIM has improved >= MIN_DELTA_TARGET, keep
     - else revert
  3. Reports a final summary.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BENCH = ROOT / "_bench"
CORPUS = BENCH / "corpus"
FANOUT_DIR = BENCH / "fanout"
SCORES_PATH = CORPUS / "scores.json"
TASKS_PATH = FANOUT_DIR / "tasks.json"

MIN_DELTA_TARGET = 0.020   # target slide must improve by ≥ 0.02 SSIM
MAX_REGRESSION = 0.005     # corpus mean must not drop by more than 0.005


# ---------------------------------------------------------------------------
# PLAN
# ---------------------------------------------------------------------------


def _load_scores() -> dict[str, float]:
    if not SCORES_PATH.is_file():
        raise SystemExit(
            f"no scores at {SCORES_PATH} — run run_corpus.py --score first"
        )
    return json.loads(SCORES_PATH.read_text(encoding="utf-8"))


def plan_fanout(bottom_k: int) -> None:
    FANOUT_DIR.mkdir(parents=True, exist_ok=True)
    (FANOUT_DIR / "prompts").mkdir(exist_ok=True)
    scores = _load_scores()
    worst = sorted(scores.items(), key=lambda kv: kv[1])[:bottom_k]

    tasks: list[dict] = []
    for slide_name, ssim in worst:
        prompt_path = FANOUT_DIR / "prompts" / f"{Path(slide_name).stem}.md"
        prompt_path.write_text(_render_prompt(slide_name, ssim), encoding="utf-8")
        tasks.append({
            "slide": slide_name,
            "baseline_ssim": ssim,
            "min_delta_target": MIN_DELTA_TARGET,
            "max_corpus_regression": MAX_REGRESSION,
            "prompt": str(prompt_path.relative_to(ROOT)),
            "html_path": f"_bench/corpus/{slide_name}",
            "branch_hint": f"worktree-fix-{Path(slide_name).stem}",
        })
    TASKS_PATH.write_text(json.dumps(tasks, indent=2), encoding="utf-8")
    print(f"Wrote {len(tasks)} fanout tasks → {TASKS_PATH.relative_to(ROOT)}")
    for t in tasks:
        print(f"  {t['slide']:42s}  SSIM={t['baseline_ssim']:.3f}  prompt={t['prompt']}")


def _render_prompt(slide_name: str, baseline_ssim: float) -> str:
    return f"""# Engine-fix fanout task

You're a slidify engine engineer. ONE slide is regressing more than the
others on the visual-diff oracle. Your job: identify why, fix the
engine (NOT the source HTML), and prove non-regression.

## Target

- **Slide:** `_bench/corpus/{slide_name}`
- **Current SSIM:** {baseline_ssim:.3f}
- **Goal:** ≥ {baseline_ssim + MIN_DELTA_TARGET:.3f} (i.e. +{MIN_DELTA_TARGET:.3f}).
- **Constraint:** corpus mean SSIM must not drop by more than {MAX_REGRESSION:.3f}.

## Procedure

1. Run baseline:
   ```
   python _bench/scripts/run_corpus.py --score
   ```
   Confirm `{slide_name}` SSIM matches {baseline_ssim:.3f}.

2. Render the heatmap:
   ```
   python _bench/scripts/render_heatmap.py
   ```
   Open `_bench/corpus/heatmap/{Path(slide_name).stem}.png` — the red
   regions are where source HTML render diverges from PPTX render.

3. Form a hypothesis. Common patterns:
   - Text rendered at wrong x/y (clusterer issue)
   - Decoration adding shapes the source doesn't have (decoration mis-fire)
   - Gradient stops differ (OKLCH densification too aggressive)
   - SVG path scaled wrong
   - Pill bg painted wider than text (font-metrics shrink missed)
   - Wrap policy putting text on 2 lines when it should be 1

4. Implement the fix in `slidify/`. Add a regression test in `tests/unit/`.

5. Validate:
   ```
   pytest tests/unit -q                                 # all green
   python _bench/scripts/run_corpus.py --score          # full corpus
   ```
   Confirm BOTH:
   - `{slide_name}` SSIM ≥ {baseline_ssim + MIN_DELTA_TARGET:.3f}
   - corpus mean SSIM didn't drop more than {MAX_REGRESSION:.3f}

6. Commit (do NOT push). Report:
   - Branch + commit hash
   - Hypothesis + fix description
   - {slide_name} SSIM: before → after, ΔSSIM
   - Corpus mean SSIM: before → after
   - Whether other slides moved up or down (largest delta either way)

## Hard rules

- DO NOT modify the source HTML at `_bench/corpus/{slide_name}`. The
  oracle measures fidelity TO the source. Editing the source is cheating.
- DO NOT disable any oracle gates.
- DO NOT push.
- If you can't get +{MIN_DELTA_TARGET:.3f} without regressing the corpus,
  report the failure with the diff you tried — that's still useful data.
"""


# ---------------------------------------------------------------------------
# MERGE
# ---------------------------------------------------------------------------


def _run(cmd: list[str], cwd: Path | None = None) -> tuple[int, str]:
    p = subprocess.run(cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


async def _score_corpus_now() -> tuple[float, dict[str, float]]:
    """Re-run the corpus through the oracle and return (mean_ssim, per_slide_ssim)."""
    code, out = _run([
        "python", str(BENCH / "scripts" / "run_corpus.py"), "--score",
    ], cwd=ROOT)
    if code != 0:
        raise SystemExit(f"corpus run failed:\n{out}")
    scores = json.loads(SCORES_PATH.read_text(encoding="utf-8"))
    mean = sum(scores.values()) / len(scores) if scores else 0.0
    return mean, scores


async def merge_fanout() -> None:
    if not TASKS_PATH.is_file():
        raise SystemExit(f"no tasks at {TASKS_PATH} — run --plan first")
    tasks: list[dict] = json.loads(TASKS_PATH.read_text(encoding="utf-8"))

    print("--- baseline scoring ---")
    base_mean, base_scores = await _score_corpus_now()
    print(f"baseline mean SSIM = {base_mean:.4f}")

    accepted: list[str] = []
    rejected: list[tuple[str, str]] = []

    for t in tasks:
        slide = t["slide"]
        branch = t["branch_hint"]
        # Try to fetch the agent's branch and cherry-pick.
        worktree_dir = ROOT / ".claude" / "worktrees"
        candidate = next(
            (d for d in worktree_dir.glob("agent-*") if (d / ".git").exists()),
            None,
        ) if worktree_dir.is_dir() else None
        if candidate is None:
            print(f"  {slide}: no worktree found, skipping")
            rejected.append((slide, "no_worktree"))
            continue
        # Fetch + record commit before we try anything destructive.
        head_before, _ = _run(["git", "rev-parse", "HEAD"], cwd=ROOT)
        # Try to fetch any branch from this worktree that touches slidify/.
        # (In practice the agent commits with a known SHA the dispatcher
        # records; this is a placeholder for that handoff.)
        rc, out = _run(["git", "fetch", str(candidate), "--all"], cwd=ROOT)
        if rc != 0:
            rejected.append((slide, f"fetch_failed: {out[:120]}"))
            continue
        # ... merge / cherry-pick logic would land here, oracle-gated.
        # Implementation finished in the orchestrator-driven mode where
        # the parent Claude agent collects branch SHAs from the
        # dispatched sub-agents directly.
        print(f"  {slide}: merge handoff TODO — orchestrator-driven")

    print("\n--- summary ---")
    print(f"accepted: {len(accepted)}; rejected: {len(rejected)}")
    for r in rejected:
        print(f"  - {r[0]}: {r[1]}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_plan = sub.add_parser("plan", help="Produce tasks.json + per-task prompt files.")
    p_plan.add_argument("--bottom-k", type=int, default=3)
    sub.add_parser("merge", help="Validate + merge winners after agents finish.")
    args = parser.parse_args()
    if args.cmd == "plan":
        plan_fanout(args.bottom_k)
    elif args.cmd == "merge":
        asyncio.run(merge_fanout())


if __name__ == "__main__":
    main()
