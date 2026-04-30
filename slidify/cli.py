"""slidify CLI entrypoints.

Two subcommands:

  slidify convert <input> <output.pptx>    one-shot conversion
  slidify harvest <dir>                     run a corpus, emit pattern suggestions

For backward compatibility, calling `slidify <input> <output.pptx>` (without a
subcommand) defaults to `convert`.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

import click

from slidify.api import ConversionConfig, convert
from slidify.models import UnmatchedSignature

# ---------------------------------------------------------------------------
# convert
# ---------------------------------------------------------------------------


def _convert_options(fn):
    """Shared options between the explicit convert subcommand and the default."""
    fn = click.option("--report-json", type=click.Path(dir_okay=False, path_type=Path), default=None)(fn)
    fn = click.option(
        "--differential-render",
        is_flag=True,
        help="Take a second screenshot per slide with all text blanked. "
        "Surgical-hybrid emission then crops from the decoration-only image "
        "for pixel-exact backgrounds. ~150ms / slide overhead.",
    )(fn)
    fn = click.option(
        "--no-embed-fonts",
        is_flag=True,
        help="Skip embedding source fonts (Inter, etc.) in the .pptx. "
        "On by default; only disable if you trust the destination machine "
        "to have the right fonts installed (it usually doesn't).",
    )(fn)
    fn = click.option(
        "--low-memory",
        is_flag=True,
        help="Drop per-slide state right after emit. Disables oracle auto-correction"
        " but keeps peak memory bounded for huge decks.",
    )(fn)
    fn = click.option("--render-concurrency", type=int, default=4, show_default=True)(fn)
    fn = click.option("--google-location", default=None, help="GCP location/region (for Vertex backends).")(fn)
    fn = click.option("--google-project", default=None, help="GCP project (for Vertex backends).")(fn)
    fn = click.option("--llm-model", default=None, help="Override default model for chosen backend.")(fn)
    fn = click.option(
        "--llm-backend",
        type=click.Choice(
            ["gemini-aistudio", "gemini-vertex", "anthropic", "claude-vertex"],
            case_sensitive=False,
        ),
        default=None,
        help="LLM backend for tier 3. Auto-detected from environment if omitted.",
    )(fn)
    fn = click.option("--no-oracle", is_flag=True, help="Skip the fidelity oracle.")(fn)
    fn = click.option("--no-tier3", is_flag=True, help="Skip the LLM adjudicator.")(fn)
    return fn


def _run_convert(
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
    differential_render: bool,
    no_embed_fonts: bool,
    report_json: Path | None,
) -> None:
    cfg = ConversionConfig(
        run_tier3=not no_tier3,
        run_oracle=not no_oracle,
        llm_backend=llm_backend,
        llm_model=llm_model,
        google_project=google_project,
        google_location=google_location,
        render_concurrency=render_concurrency,
        keep_plans_for_oracle=not low_memory,
        differential_render=differential_render,
        embed_fonts=not no_embed_fonts,
    )
    result = asyncio.run(convert(input_path, output_pptx, cfg))

    click.echo(f"Wrote: {result.pptx_path}")
    click.echo(f"Slides: {result.n_slides}")
    click.echo(f"Native area ratio: {result.native_area_ratio:.3f}")
    click.echo(f"Pattern coverage: {result.pattern_coverage:.3f}")
    if result.pattern_hits:
        top = sorted(result.pattern_hits.items(), key=lambda kv: -kv[1])[:6]
        click.echo("Top patterns: " + ", ".join(f"{k}×{v}" for k, v in top))
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
    if result.unmatched_signatures:
        click.echo(
            f"Unmatched signatures: {len(result.unmatched_signatures)}"
            " (run `slidify harvest` for suggestions)"
        )

    if report_json:
        report_json.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        click.echo(f"Report: {report_json}")


# ---------------------------------------------------------------------------
# harvest
# ---------------------------------------------------------------------------


def _harvest_inputs(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]
    return sorted(p for p in input_path.glob("**/*.html") if p.is_file())


async def _harvest_one(html_path: Path) -> list[UnmatchedSignature]:
    from tempfile import NamedTemporaryFile

    cfg = ConversionConfig(run_oracle=False, run_tier3=False, keep_plans_for_oracle=False)
    with NamedTemporaryFile(suffix=".pptx", delete=False) as tf:
        out = Path(tf.name)
    try:
        result = await convert(html_path, out, cfg)
        return list(result.unmatched_signatures)
    finally:
        try:
            out.unlink()
        except FileNotFoundError:
            pass


@click.command(name="harvest")
@click.argument(
    "input_path",
    type=click.Path(exists=True, dir_okay=True, file_okay=True, path_type=Path),
)
@click.option(
    "--top",
    type=int,
    default=20,
    show_default=True,
    help="Number of most-common unmatched signatures to report.",
)
@click.option(
    "--out-json",
    type=click.Path(dir_okay=False, path_type=Path),
    default=None,
    help="Write the full ranked report as JSON to this path.",
)
def harvest(input_path: Path, top: int, out_json: Path | None) -> None:
    """Run slidify across a corpus and report the most-common unmatched signatures.

    Use the output to author new entries in `slidify/patterns/data/patterns.yaml`.
    Each unmatched signature represents a structural shape the heuristic
    pipeline currently has to guess at — adding a Tier-0 recipe for it makes
    the engine cheaper and more accurate for everyone.
    """
    html_paths = _harvest_inputs(input_path)
    if not html_paths:
        click.echo(f"No HTML files found under {input_path}", err=True)
        sys.exit(1)

    click.echo(f"Harvesting {len(html_paths)} file(s)…")

    aggregate: dict[str, UnmatchedSignature] = {}
    for path in html_paths:
        try:
            sigs = asyncio.run(_harvest_one(path))
        except Exception as e:
            click.echo(f"  {path}: ERROR — {e}", err=True)
            continue
        for s in sigs:
            existing = aggregate.get(s.sig_hash)
            if existing is None:
                aggregate[s.sig_hash] = s.model_copy()
            else:
                existing.n_occurrences += s.n_occurrences

    ranked = sorted(aggregate.values(), key=lambda u: -u.n_occurrences)
    click.echo(f"\nUnique unmatched signatures: {len(ranked)}")
    click.echo(f"Total occurrences: {sum(u.n_occurrences for u in ranked)}\n")

    click.echo(f"Top {min(top, len(ranked))} by occurrence:")
    click.echo("─" * 80)
    for i, sig in enumerate(ranked[:top], 1):
        cls_short = (sig.sample_classes or "—")[:64]
        text_short = (sig.sample_text or "—")[:40]
        click.echo(
            f"{i:3d}. ×{sig.n_occurrences:<4d} {sig.bbox_w:>4d}×{sig.bbox_h:<3d}  "
            f"hash={sig.sig_hash}"
        )
        click.echo(f"      classes : {cls_short}")
        click.echo(f"      sample  : {text_short}")
        click.echo(f"      sig     : {sig.sig[:120]}")

    if out_json:
        payload = [s.model_dump() for s in ranked]
        out_json.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        click.echo(f"\nWrote full report: {out_json}")


# ---------------------------------------------------------------------------
# Top-level command. We make convert the default action when no subcommand
# is given, so existing usage `slidify deck.html out.pptx` keeps working.
# ---------------------------------------------------------------------------


@click.group(invoke_without_command=True)
@click.pass_context
def cli(ctx: click.Context) -> None:
    """slidify — render-and-classify HTML to PPTX."""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


@cli.command(name="convert")
@click.argument(
    "input_path",
    type=click.Path(exists=True, dir_okay=True, file_okay=True, path_type=Path),
)
@click.argument("output_pptx", type=click.Path(dir_okay=False, path_type=Path))
@_convert_options
def convert_cmd(
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
    differential_render: bool,
    no_embed_fonts: bool,
    report_json: Path | None,
) -> None:
    """Convert INPUT_PATH (file or directory) to OUTPUT_PPTX."""
    _run_convert(
        input_path, output_pptx, no_tier3, no_oracle, llm_backend, llm_model,
        google_project, google_location, render_concurrency, low_memory,
        differential_render, no_embed_fonts, report_json,
    )


cli.add_command(harvest)


def main() -> None:
    """Entry point shim: when called with positional args that look like
    (input, output), dispatch to convert directly so the legacy
    `slidify foo.html bar.pptx` invocation keeps working."""
    args = sys.argv[1:]
    known_subs = {"convert", "harvest", "--help", "-h"}
    if args and not args[0].startswith("-") and args[0] not in known_subs:
        # Implicit convert: rewrite to `slidify convert ...`
        sys.argv = [sys.argv[0], "convert", *args]
    cli()


if __name__ == "__main__":  # pragma: no cover
    main()
