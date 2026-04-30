"""Overlay the FidelityOracle's failing regions on a preview PNG.

Reads `examples/corpus/report.json` (produced by `run_corpus.py --score`)
and produces an annotated PNG per slide at
`examples/corpus/heatmap/slide-NN-*.png`. Failing regions appear as
red rectangles on top of the LibreOffice render.

The annotated image makes the SSIM number actionable: instead of
"slide-07 scored 0.589 — bad somewhere", you see "the title text and
the bottom-right card both diverge from the source HTML".

Usage:
    python scripts/render_heatmap.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

from slidify.api import ConversionConfig, convert
from slidify.oracle import find_failing_regions

CORPUS_DIR = Path(__file__).resolve().parents[1] / "examples" / "corpus"
PREVIEW_DIR = CORPUS_DIR / "preview"
HEATMAP_DIR = CORPUS_DIR / "heatmap"
OUT_DIR = CORPUS_DIR / "out"


async def _render_failing_regions(html_path: Path) -> tuple[bytes, list]:
    """Re-run the slide through the pipeline to produce the source PNG and
    the candidate PNG, then diff them for failing regions. Returns
    (source_png, list[BoundingBox])."""
    pptx_path = OUT_DIR / html_path.with_suffix(".pptx").name
    cfg = ConversionConfig(
        run_oracle=True,
        run_tier3=False,
        max_oracle_iterations=0,
        keep_plans_for_oracle=True,
    )
    result = await convert(html_path, pptx_path, cfg)
    if not result.fidelity_reports:
        return b"", []
    return b"", result.fidelity_reports[0].failing_regions


def _annotate_png(
    base_png: Path,
    regions: list,
    out_path: Path,
    src_w: int = 1280,
    src_h: int = 720,
) -> None:
    img = Image.open(base_png).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    sx = img.width / src_w
    sy = img.height / src_h
    for r in regions:
        x = r.x * sx
        y = r.y * sy
        w = r.w * sx
        h = r.h * sy
        # Red translucent fill + opaque red border.
        draw.rectangle(
            [x, y, x + w, y + h],
            outline=(255, 60, 60, 220),
            width=2,
            fill=(255, 60, 60, 60),
        )
    Image.alpha_composite(img, overlay).convert("RGB").save(out_path, "PNG")


async def main() -> None:
    HEATMAP_DIR.mkdir(parents=True, exist_ok=True)
    htmls = sorted(CORPUS_DIR.glob("slide-*.html"))
    if not htmls:
        print(f"no slide-*.html under {CORPUS_DIR}")
        sys.exit(1)
    print(f"Rendering heatmaps for {len(htmls)} slides...")
    for i, h in enumerate(htmls, 1):
        png = PREVIEW_DIR / h.with_suffix(".png").name
        if not png.exists():
            print(f"  [{i:>2}/{len(htmls)}] {h.name}: no preview, skipping")
            continue
        print(f"  [{i:>2}/{len(htmls)}] {h.name}", end=" ... ", flush=True)
        try:
            _, regions = await _render_failing_regions(h)
        except Exception as e:
            print(f"FAILED: {type(e).__name__}: {e}")
            continue
        out_path = HEATMAP_DIR / h.with_suffix(".png").name
        try:
            # Source is 1280x720; the preview is the LibreOffice render at
            # 1201x675 (90 dpi). We rescale region coords accordingly.
            with Image.open(png) as preview:
                pw, ph = preview.size
            _annotate_png(png, regions, out_path, src_w=1280, src_h=720)
            print(f"{len(regions)} regions -> {out_path.name}")
        except Exception as e:
            print(f"annotation failed: {type(e).__name__}: {e}")
    print(f"\nHeatmaps: {HEATMAP_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
