"""Drive the slidify pipeline across a corpus of HTML slides.

Reads every `slide-*.html` in `examples/corpus/`, converts each to a
single-slide PPTX, and (with --score) runs the FidelityOracle to get
per-slide SSIM + OCR-recall scores.

The oracle compares the source HTML's browser screenshot against a
LibreOffice render of the produced PPTX. Scores quantify how close
the slide is to its source.

Usage:
    python scripts/run_corpus.py            # emit + render PNGs
    python scripts/run_corpus.py --score    # also score via oracle (slower)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import shutil
import subprocess
import time
from pathlib import Path

from slidify.api import ConversionConfig, convert

CORPUS_DIR = Path(__file__).resolve().parents[1] / "corpus"
OUT_DIR = CORPUS_DIR / "out"
PREVIEW_DIR = CORPUS_DIR / "preview"
REPORT_PATH = CORPUS_DIR / "report.json"
SCORES_PATH = CORPUS_DIR / "scores.json"


def _render_pptx_to_png(pptx_path: Path, png_target: Path) -> bool:
    if not shutil.which("soffice") or not shutil.which("pdftoppm"):
        return False
    tmp = pptx_path.parent / "_tmp_render"
    tmp.mkdir(exist_ok=True)
    try:
        subprocess.run(
            ["soffice", "--headless", "--convert-to", "pdf",
             "--outdir", str(tmp), str(pptx_path)],
            capture_output=True, check=True, timeout=60,
        )
        pdf_path = tmp / pptx_path.with_suffix(".pdf").name
        if not pdf_path.exists():
            return False
        subprocess.run(
            ["pdftoppm", "-r", "90", "-png", "-singlefile",
             str(pdf_path), str(png_target.with_suffix(""))],
            capture_output=True, check=True, timeout=30,
        )
        return png_target.exists()
    except subprocess.CalledProcessError:
        return False
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


async def _run_one(html_path: Path, render_png: bool, score: bool) -> dict:
    """Convert a single corpus slide and capture metrics + (optional) scores."""
    pptx_path = OUT_DIR / html_path.with_suffix(".pptx").name
    png_path = PREVIEW_DIR / html_path.with_suffix(".png").name

    t0 = time.perf_counter()
    cfg = ConversionConfig(
        run_oracle=score,
        run_tier3=False,
        # max_oracle_iterations=0 → score AS-EMITTED, skip auto-correction.
        # We want the raw fidelity number, not a healed one.
        max_oracle_iterations=0,
        keep_plans_for_oracle=score,
    )
    try:
        result = await convert(html_path, pptx_path, cfg)
    except Exception as e:
        return {
            "slide": html_path.name,
            "ok": False,
            "error": f"{type(e).__name__}: {e}",
            "elapsed_s": time.perf_counter() - t0,
        }

    rendered_ok = render_png and _render_pptx_to_png(pptx_path, png_path)

    row: dict = {
        "slide": html_path.name,
        "ok": True,
        "n_slides": result.n_slides,
        "native_area_ratio": result.native_area_ratio,
        "pattern_coverage": result.pattern_coverage,
        "decisions_by_tier": result.decisions_by_tier,
        "unmatched_signatures": len(result.unmatched_signatures),
        "elapsed_s": result.elapsed_seconds,
        "pptx": str(pptx_path.relative_to(CORPUS_DIR.parent.parent)),
        "preview_png": (
            str(png_path.relative_to(CORPUS_DIR.parent.parent))
            if rendered_ok else None
        ),
    }
    if score and result.fidelity_reports:
        # Single-slide deck → one report.
        r = result.fidelity_reports[0]
        row["ssim"] = r.ssim
        row["ocr_recall"] = r.ocr_recall
        row["passed"] = r.passed
        row["failing_regions"] = len(r.failing_regions)
    return row


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-render-png", action="store_true")
    parser.add_argument(
        "--score", action="store_true",
        help="Run the FidelityOracle on each slide (SSIM + OCR vs source).",
    )
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    htmls = sorted(CORPUS_DIR.glob("slide-*.html"))
    if not htmls:
        print(f"no slide-*.html under {CORPUS_DIR}")
        return

    print(f"Running {len(htmls)} slides through the pipeline"
          + (" (+ scoring)" if args.score else "") + "...")
    rows: list[dict] = []
    for i, h in enumerate(htmls, 1):
        print(f"  [{i:>2}/{len(htmls)}] {h.name}", end=" ... ", flush=True)
        row = await _run_one(
            h, render_png=not args.no_render_png, score=args.score
        )
        rows.append(row)
        if row["ok"]:
            base = (
                f"native={row['native_area_ratio']:.2f} "
                f"unmatched={row['unmatched_signatures']:>2} "
            )
            extras = ""
            if "ssim" in row:
                extras = (
                    f" SSIM={row['ssim']:.3f} OCR={row['ocr_recall']:.2f}"
                    f" {'PASS' if row['passed'] else 'fail'}"
                )
            print(f"{base}{row['elapsed_s']:.1f}s{extras}")
        else:
            print(f"FAILED: {row['error']}")

    summary: dict = {
        "n_slides": len(rows),
        "n_ok": sum(1 for r in rows if r["ok"]),
        "n_failed": sum(1 for r in rows if not r["ok"]),
        "mean_native_area_ratio": (
            sum(r.get("native_area_ratio", 0.0) for r in rows if r["ok"])
            / max(1, sum(1 for r in rows if r["ok"]))
        ),
        "total_unmatched": sum(
            r.get("unmatched_signatures", 0) for r in rows if r["ok"]
        ),
        "rows": rows,
    }
    if args.score:
        scored = [r for r in rows if r.get("ssim") is not None]
        if scored:
            summary["mean_ssim"] = sum(r["ssim"] for r in scored) / len(scored)
            summary["mean_ocr_recall"] = sum(r["ocr_recall"] for r in scored) / len(scored)
            summary["pass_rate"] = sum(1 for r in scored if r["passed"]) / len(scored)

    REPORT_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(
        f"\nDone. {summary['n_ok']}/{summary['n_slides']} ok. "
        f"mean native area {summary['mean_native_area_ratio']:.3f}, "
        f"total unmatched {summary['total_unmatched']}."
    )
    if args.score and scored:
        print(
            f"mean SSIM {summary['mean_ssim']:.3f} | "
            f"mean OCR {summary['mean_ocr_recall']:.3f} | "
            f"pass {summary['pass_rate'] * 100:.0f}%"
        )
        # Sort lowest-scoring first — those are the next iteration targets.
        worst = sorted(scored, key=lambda r: r["ssim"])[:5]
        print("\nLowest 5 SSIM (next-iteration targets):")
        for r in worst:
            print(
                f"  {r['slide']:32s}  SSIM={r['ssim']:.3f}  "
                f"OCR={r['ocr_recall']:.2f}  fail_regions={r['failing_regions']}"
            )
        # Persist scores as a flat dict for deltas across runs.
        SCORES_PATH.write_text(
            json.dumps(
                {r["slide"]: r["ssim"] for r in scored}, indent=2, sort_keys=True
            ),
            encoding="utf-8",
        )
        print(f"\nScores: {SCORES_PATH}")
    print(f"Report: {REPORT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
