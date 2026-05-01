"""Run the corpus eval and emit stable regression artifacts.

This is intentionally lightweight: one command converts a corpus directory,
runs the existing FidelityOracle, writes a summary JSON, and writes the new
unit-level trace JSONL used to train the cost model.

Example:
    python _bench/scripts/eval_corpus.py \
        --corpus _bench/corpus \
        --out _bench/eval_runs/latest
"""

from __future__ import annotations

import argparse
import asyncio
import json
import statistics
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from slidify.api import ConversionConfig, convert  # noqa: E402

DEFAULT_THRESHOLDS = {
    "mean_ssim_drop_max": 0.01,
    "native_area_ratio_drop_max": 0.02,
    "elapsed_growth_max": 0.20,
}


def _mean(vals: list[float]) -> float:
    return statistics.fmean(vals) if vals else 0.0


def _load_baseline(path: Path | None) -> dict[str, Any]:
    if path is None or not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _baseline_mean_ssim(raw: dict[str, Any]) -> float | None:
    if not raw:
        return None
    if "mean_ssim" in raw:
        return float(raw["mean_ssim"])
    # Existing _bench/corpus/scores.json is a slide_name -> ssim map.
    numeric = [float(v) for v in raw.values() if isinstance(v, int | float)]
    return _mean(numeric) if numeric else None


def _evaluate_thresholds(summary: dict[str, Any], baseline: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    baseline_ssim = _baseline_mean_ssim(baseline)
    if baseline_ssim is not None:
        drop = baseline_ssim - summary["metrics"]["mean_ssim"]
        if drop > DEFAULT_THRESHOLDS["mean_ssim_drop_max"]:
            warnings.append(
                f"mean_ssim dropped {drop:.4f} from baseline {baseline_ssim:.4f}"
            )
    baseline_native = baseline.get("native_area_ratio") if baseline else None
    if baseline_native is not None:
        drop = float(baseline_native) - summary["metrics"]["native_area_ratio"]
        if drop > DEFAULT_THRESHOLDS["native_area_ratio_drop_max"]:
            warnings.append(
                f"native_area_ratio dropped {drop:.4f} from baseline {float(baseline_native):.4f}"
            )
    baseline_elapsed = baseline.get("elapsed_seconds") if baseline else None
    if baseline_elapsed:
        growth = summary["metrics"]["elapsed_seconds"] / float(baseline_elapsed) - 1.0
        if growth > DEFAULT_THRESHOLDS["elapsed_growth_max"]:
            warnings.append(
                f"elapsed_seconds grew {growth:.1%} from baseline {float(baseline_elapsed):.2f}s"
            )
    return warnings


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, default=ROOT / "_bench" / "corpus")
    parser.add_argument("--out", type=Path, default=ROOT / "_bench" / "eval_runs" / "latest")
    parser.add_argument("--baseline", type=Path, default=ROOT / "_bench" / "corpus" / "scores.json")
    parser.add_argument("--no-oracle", action="store_true", help="Skip LibreOffice/SSIM/OCR validation")
    parser.add_argument("--tier3", action="store_true", help="Enable API-backed Tier-3 adjudication")
    parser.add_argument("--include-text", action="store_true", help="Include text samples in trace rows")
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    pptx_path = args.out / "deck.pptx"
    trace_path = args.out / "trace.jsonl"
    summary_path = args.out / "summary.json"

    cfg = ConversionConfig(
        run_oracle=not args.no_oracle,
        run_tier3=args.tier3,
        keep_plans_for_oracle=True,
        trace_jsonl_path=trace_path,
        trace_include_text=args.include_text,
    )
    result = await convert(args.corpus, pptx_path, cfg)

    reports = result.fidelity_reports
    ssim = [r.ssim for r in reports]
    ocr = [r.ocr_recall for r in reports]
    failing_units = sum(len(r.failing_units) for r in reports)
    failing_regions = sum(len(r.failing_regions) for r in reports)

    summary: dict[str, Any] = {
        "corpus": str(args.corpus),
        "pptx_path": str(pptx_path),
        "trace_jsonl_path": str(trace_path),
        "metrics": {
            "n_slides": result.n_slides,
            "native_area_ratio": result.native_area_ratio,
            "mean_ssim": _mean(ssim),
            "mean_ocr_recall": _mean(ocr),
            "pass_rate": _mean([1.0 if r.passed else 0.0 for r in reports]),
            "failing_regions": failing_regions,
            "failing_units": failing_units,
            "elapsed_seconds": result.elapsed_seconds,
            "llm_calls": result.llm_calls,
            "total_cost_usd": result.total_cost_usd,
            "cache_hit_rate": result.cache_hit_rate,
            "pattern_coverage": result.pattern_coverage,
        },
        "decisions_by_tier": result.decisions_by_tier,
        "pattern_hits": result.pattern_hits,
        "unmatched_signatures": [u.model_dump() for u in result.unmatched_signatures[:25]],
        "slides": [r.model_dump(mode="json") for r in reports],
    }

    baseline = _load_baseline(args.baseline)
    summary["warnings"] = _evaluate_thresholds(summary, baseline)
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True), encoding="utf-8")

    print(json.dumps(summary["metrics"], indent=2, sort_keys=True))
    if summary["warnings"]:
        print("\nWARNINGS:")
        for warning in summary["warnings"]:
            print(f"- {warning}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
