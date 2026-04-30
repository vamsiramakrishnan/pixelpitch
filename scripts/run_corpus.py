"""Drive the slidify pipeline across a corpus of HTML slides.

Reads every `slide-*.html` in `examples/corpus/`, converts each to a
single-slide PPTX, renders a preview PNG via LibreOffice, and writes a
machine-readable report with native-area-ratio, decision-by-tier counts,
unmatched-signature counts, and emit timing per slide.

The report drives the iteration loop: which slides under-perform, which
new failure modes need engine fixes, which patterns to harvest.

Usage:
    python scripts/run_corpus.py [--no-render-png]
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

CORPUS_DIR = Path(__file__).resolve().parents[1] / "examples" / "corpus"
OUT_DIR = CORPUS_DIR / "out"
PREVIEW_DIR = CORPUS_DIR / "preview"
REPORT_PATH = CORPUS_DIR / "report.json"


def _render_pptx_to_png(pptx_path: Path, png_target: Path) -> bool:
    """soffice → PDF → png via pdftoppm. Returns True on success."""
    if not shutil.which("soffice") or not shutil.which("pdftoppm"):
        return False
    tmp = pptx_path.parent / "_tmp_render"
    tmp.mkdir(exist_ok=True)
    try:
        subprocess.run(
            [
                "soffice", "--headless",
                "--convert-to", "pdf",
                "--outdir", str(tmp),
                str(pptx_path),
            ],
            capture_output=True, check=True, timeout=60,
        )
        pdf_path = tmp / pptx_path.with_suffix(".pdf").name
        if not pdf_path.exists():
            return False
        subprocess.run(
            [
                "pdftoppm", "-r", "90", "-png",
                "-singlefile",
                str(pdf_path),
                str(png_target.with_suffix("")),
            ],
            capture_output=True, check=True, timeout=30,
        )
        return png_target.exists()
    except subprocess.CalledProcessError:
        return False
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


async def _run_one(html_path: Path, render_png: bool) -> dict:
    """Convert a single corpus slide and capture metrics."""
    pptx_path = OUT_DIR / html_path.with_suffix(".pptx").name
    png_path = PREVIEW_DIR / html_path.with_suffix(".png").name

    t0 = time.perf_counter()
    cfg = ConversionConfig(
        run_oracle=False,
        run_tier3=False,
        keep_plans_for_oracle=False,
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
    return {
        "slide": html_path.name,
        "ok": True,
        "n_slides": result.n_slides,
        "native_area_ratio": result.native_area_ratio,
        "pattern_coverage": result.pattern_coverage,
        "decisions_by_tier": result.decisions_by_tier,
        "unmatched_signatures": len(result.unmatched_signatures),
        "elapsed_s": result.elapsed_seconds,
        "pptx": str(pptx_path.relative_to(CORPUS_DIR.parent.parent)),
        "preview_png": str(png_path.relative_to(CORPUS_DIR.parent.parent)) if rendered_ok else None,
    }


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-render-png", action="store_true")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    htmls = sorted(CORPUS_DIR.glob("slide-*.html"))
    if not htmls:
        print(f"no slide-*.html under {CORPUS_DIR}")
        return

    print(f"Running {len(htmls)} slides through the pipeline...")
    rows: list[dict] = []
    for i, h in enumerate(htmls, 1):
        print(f"  [{i:>2}/{len(htmls)}] {h.name}", end=" ... ", flush=True)
        row = await _run_one(h, render_png=not args.no_render_png)
        rows.append(row)
        if row["ok"]:
            print(
                f"native={row['native_area_ratio']:.2f} "
                f"unmatched={row['unmatched_signatures']:>2} "
                f"{row['elapsed_s']:.1f}s"
            )
        else:
            print(f"FAILED: {row['error']}")

    summary = {
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
    REPORT_PATH.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(
        f"\nDone. {summary['n_ok']}/{summary['n_slides']} ok. "
        f"mean native area {summary['mean_native_area_ratio']:.3f}, "
        f"total unmatched {summary['total_unmatched']}. "
        f"Report: {REPORT_PATH}"
    )


if __name__ == "__main__":
    asyncio.run(main())
