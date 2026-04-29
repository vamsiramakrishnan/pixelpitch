"""slidify CLI entrypoint."""

from __future__ import annotations

import asyncio
from pathlib import Path

import click

from slidify.api import ConversionConfig, convert


@click.command(name="slidify")
@click.argument(
    "input_path",
    type=click.Path(exists=True, dir_okay=True, file_okay=True, path_type=Path),
)
@click.argument("output_pptx", type=click.Path(dir_okay=False, path_type=Path))
@click.option(
    "--no-tier3",
    is_flag=True,
    help="Skip the LLM adjudicator (tier 3). Faster, free, but lower native_area_ratio.",
)
@click.option(
    "--no-oracle",
    is_flag=True,
    help="Skip the fidelity oracle (LibreOffice + SSIM + OCR).",
)
@click.option(
    "--llm-backend",
    type=click.Choice(
        ["gemini-aistudio", "gemini-vertex", "anthropic", "claude-vertex"],
        case_sensitive=False,
    ),
    default=None,
    help="LLM backend for tier 3. Auto-detected from environment if omitted.",
)
@click.option("--llm-model", default=None, help="Override default model for chosen backend.")
@click.option("--google-project", default=None, help="GCP project (for Vertex backends).")
@click.option("--google-location", default=None, help="GCP location/region (for Vertex backends).")
@click.option("--render-concurrency", type=int, default=4, show_default=True)
@click.option(
    "--low-memory",
    is_flag=True,
    help="Drop per-slide state right after emit. Disables oracle auto-correction"
    " but keeps peak memory bounded for huge decks.",
)
@click.option("--report-json", type=click.Path(dir_okay=False, path_type=Path), default=None)
def main(
    input_path: Path,
    output_pptx: Path,
    no_tier3: bool,
    no_oracle: bool,
    llm_backend: str | None,
    llm_model: str | None,
    google_project: str | None,
    google_location: str | None,
    render_concurrency: int,
    low_memory: bool,
    report_json: Path | None,
) -> None:
    """Convert INPUT_PATH to OUTPUT_PPTX with maximum native editability.

    INPUT_PATH may be:

    \b
    * a single HTML file (with optional <!DOCTYPE> separators for multi-slide)
    * a directory whose top-level *.html files are each treated as one slide
      (sorted lexicographically — name them 01.html, 02.html, ...)
    """
    cfg = ConversionConfig(
        run_tier3=not no_tier3,
        run_oracle=not no_oracle,
        llm_backend=llm_backend,
        llm_model=llm_model,
        google_project=google_project,
        google_location=google_location,
        render_concurrency=render_concurrency,
        keep_plans_for_oracle=not low_memory,
    )
    # Pass Path directly; api._normalize_source handles file vs directory.
    result = asyncio.run(convert(input_path, output_pptx, cfg))

    click.echo(f"Wrote: {result.pptx_path}")
    click.echo(f"Slides: {result.n_slides}")
    click.echo(f"Native area ratio: {result.native_area_ratio:.3f}")
    click.echo(f"Cache hit rate: {result.cache_hit_rate:.3f}")
    click.echo(f"LLM calls: {result.llm_calls} (cost ≈ ${result.total_cost_usd:.4f})")
    click.echo(f"Decisions by tier: {result.decisions_by_tier}")
    click.echo(f"Elapsed: {result.elapsed_seconds:.2f}s")
    if result.fidelity_reports:
        passed = sum(1 for r in result.fidelity_reports if r.passed)
        click.echo(
            f"Oracle: {passed}/{len(result.fidelity_reports)} slides passed "
            f"(mean SSIM={sum(r.ssim for r in result.fidelity_reports) / len(result.fidelity_reports):.3f})"
        )

    if report_json:
        report_json.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        click.echo(f"Report: {report_json}")


if __name__ == "__main__":  # pragma: no cover
    main()
