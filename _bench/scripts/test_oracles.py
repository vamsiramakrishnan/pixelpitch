"""Side-by-side test of FidelityOracle (SSIM/OCR) vs SubjectiveOracle (LLM).

Convert a small set of corpus slides, score each with both oracles, and
show where the two disagree. This is the practical proof of value:
SSIM measures pixel similarity to source render; the LLM judge measures
whether the slide LOOKS professionally designed and intent-faithful.

Run:
    python _bench/scripts/test_oracles.py
"""

from __future__ import annotations

import asyncio
import shutil
import subprocess
import tempfile
from pathlib import Path

from slidify.api import ConversionConfig, convert
from slidify.classifier.llm import auto_select_backend, build_provider
from slidify.oracle import FidelityOracle, render_pptx_to_pngs
from slidify.subjective_oracle import SubjectiveOracle

ROOT = Path(__file__).resolve().parents[2]
CORPUS = ROOT / "_bench" / "corpus"

# Pick slides that cover the divergence space:
TARGETS = [
    "slide-66-duotone-hero.html",      # heavy raster - SSIM low, subjective should be high
    "slide-26-manifesto.html",          # brutalist mono - tests font embedding
    "slide-32-stats-trio.html",         # SaaS - decorations tend to lower SSIM, raise subjective
    "slide-13-spec-sheet.html",         # keynote spec sheet - native text-heavy, both should agree
]


async def _render_pptx_to_png(pptx: Path) -> bytes:
    """Render PPTX → PNG via soffice + pdftoppm."""
    pngs = await render_pptx_to_pngs(pptx)
    return pngs[0] if pngs else b""


async def main() -> None:
    backend = auto_select_backend()
    if backend is None:
        print("No LLM provider available — set GEMINI_API_KEY or ANTHROPIC_API_KEY.")
        return
    provider = build_provider(backend)
    if provider is None:
        print(f"Backend '{backend}' returned no provider.")
        return
    print(f"Using LLM backend: {backend}\n")

    fidelity = FidelityOracle()
    subjective = SubjectiveOracle(provider=provider)

    print(f"{'slide':<38}  {'SSIM':>5}  {'OCR':>5}  {'subj':>5}  {'intent':>5}  {'type':>5}  {'layout':>5}  Δ(subj-ssim)")
    print("-" * 110)

    rows: list[dict] = []
    for slide_name in TARGETS:
        html = CORPUS / slide_name
        if not html.is_file():
            print(f"missing: {slide_name}")
            continue
        with tempfile.TemporaryDirectory() as tmp:
            pptx = Path(tmp) / "out.pptx"
            cfg = ConversionConfig(
                run_oracle=False, run_tier3=False, keep_plans_for_oracle=False
            )
            result = await convert(html, pptx, cfg)
            # Capture the source render bytes (ground truth) — the convert
            # pipeline drops them when run_oracle=False, so we re-render via
            # a single Renderer call. Easier: run with run_oracle=True so
            # FidelityOracle has both renders, then read both.
        # Re-do with oracle for both renders:
        with tempfile.TemporaryDirectory() as tmp:
            pptx = Path(tmp) / "out.pptx"
            cfg = ConversionConfig(
                run_oracle=True,
                run_tier3=False,
                keep_plans_for_oracle=True,
                max_oracle_iterations=0,
            )
            result = await convert(html, pptx, cfg)
            if not result.fidelity_reports:
                print(f"no fidelity report for {slide_name}")
                continue
            fr = result.fidelity_reports[0]

            # Render PPTX → PNG for the subjective oracle.
            cand_png = await _render_pptx_to_png(pptx)
            # Source render: re-emit just to capture the ground-truth PNG.
            from slidify.api import _normalize_source
            from slidify.renderer import Renderer
            src_png = b""
            async for chunk in _normalize_source(html):
                async with Renderer() as r:
                    rendered = await r.render(chunk)
                src_png = rendered.ground_truth_png
                break

            score = await subjective.score_slide(src_png, cand_png)

        delta = score.composite - fr.ssim
        print(
            f"{slide_name:<38}  {fr.ssim:5.3f}  {fr.ocr_recall:5.2f}  "
            f"{score.composite:5.3f}  {score.intent_fidelity:5.2f}  "
            f"{score.type_quality:5.2f}  {score.layout_quality:5.2f}  {delta:+5.3f}"
        )
        rows.append({
            "slide": slide_name,
            "ssim": fr.ssim, "ocr": fr.ocr_recall,
            "subj": score.composite,
            "intent": score.intent_fidelity,
            "type": score.type_quality,
            "layout": score.layout_quality,
            "visual": score.visual_quality,
            "notes": score.notes,
            "failing_regions": len(fr.failing_regions),
            "failing_units": [
                {
                    "region": [u.region.x, u.region.y, u.region.w, u.region.h],
                    "unit_id": u.unit_id,
                    "kind": u.decision_kind,
                    "tier": u.source_tier,
                    "suspected": u.suspected_failure,
                }
                for u in fr.failing_units
            ],
        })

    print("\n--- Critique notes ---")
    for r in rows:
        print(f"\n{r['slide']}")
        print(f"  notes: {r['notes']}")
        if r['failing_units']:
            print(f"  attribution ({len(r['failing_units'])} regions):")
            for u in r['failing_units'][:5]:
                print(
                    f"    region={u['region']}  unit={u['unit_id']}  "
                    f"kind={u['kind']}  tier={u['tier']}  suspected={u['suspected']}"
                )


if __name__ == "__main__":
    asyncio.run(main())
