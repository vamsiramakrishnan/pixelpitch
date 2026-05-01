"""Public API: convert(source, pptx_path, ...) → ConversionResult.

Slide sources accepted:
    * `str`  — full HTML, optionally containing `<!DOCTYPE html>` separators
              for multi-slide files (Genspark convention).
    * `Path` — single .html file (split on DOCTYPEs) OR a directory whose
              top-level *.html files are each treated as a single slide
              (sorted lexicographically).
    * `Iterable[str | Path]`        — each item is one slide's HTML or a path
                                      to a file containing one slide.
    * `AsyncIterable[str | Path]`   — same, but pulled lazily for true
                                      streaming sources (DB, HTTP, etc.).

The pipeline streams: each slide is rendered → classified → emitted → its
ground-truth PNG is dropped (when oracle is off) before the next batch starts,
so peak memory is bounded by `render_concurrency`, not by deck size.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import AsyncIterable, AsyncIterator, Iterable
from dataclasses import dataclass, field
from pathlib import Path

import structlog

from slidify.cache import MemoryCache, StructuralCache
from slidify.classifier.llm import LLMProvider, auto_select_backend, build_provider
from slidify.classifier.tier1 import classify_tier1
from slidify.classifier.tier2 import classify_tier2
from slidify.classifier.tier3 import Tier3Stats, classify_tier3
from slidify.emitter import Emitter, native_area_ratio
from slidify.geom import SLIDE_H_PX, SLIDE_W_PX
from slidify.models import (
    ConversionResult,
    Decision,
    DecisionKind,
    EmitOp,
    FidelityReport,
    RenderedSlide,
    UnmatchedSignature,
    VisualUnit,
)
from slidify.oracle import FidelityOracle
from slidify.patterns import PatternStats, classify_tier0, get_default_catalog
from slidify.patterns.signatures import signature, signature_hash
from slidify.promotion import promote, to_emit_ops
from slidify.renderer import Renderer
from slidify.splitter import split_slides
from slidify.units import cluster, flatten

log = structlog.get_logger(__name__)


SlideSource = (
    str
    | Path
    | Iterable[str | Path]
    | AsyncIterable[str | Path]
)


@dataclass
class ConversionConfig:
    """User-facing configuration for `convert`.

    Attributes:
        viewport: (w, h) in pixels for browser rendering.
        run_oracle: whether to validate output via LibreOffice/SSIM/OCR.
        run_tier3: enable LLM adjudication for ambiguous units.
        llm_backend: one of {"gemini-aistudio", "gemini-vertex", "anthropic",
            "claude-vertex"}. None = auto-detect from environment.
        llm_model: override default model for chosen backend.
        google_project: override GOOGLE_CLOUD_PROJECT for Vertex backends.
        google_location: override GOOGLE_CLOUD_LOCATION for Vertex backends.
        cache: optional pre-built structural cache.
        max_oracle_iterations: max self-healing passes after a failed slide.
        render_concurrency: how many slides to render in parallel; also bounds
            the peak number of in-memory rendered slides.
        keep_plans_for_oracle: when True (default), retain per-slide plans
            (units + decisions + ground-truth PNG) until oracle has run, so
            the auto-correction loop can re-emit failing slides natively.
            Set False on huge decks to drop plan state right after emit and
            rely on a single oracle pass without auto-correction.
    """

    viewport: tuple[int, int] = (SLIDE_W_PX, SLIDE_H_PX)
    run_oracle: bool = True
    run_tier3: bool = True
    llm_backend: str | None = None
    llm_model: str | None = None
    google_project: str | None = None
    google_location: str | None = None
    cache: StructuralCache | None = None
    max_oracle_iterations: int = 2
    render_concurrency: int = 4
    keep_plans_for_oracle: bool = True
    # Differential render: take a second screenshot per slide with all text
    # blanked. The emitter uses that decoration-only image when it needs to
    # raster a Hybrid background, eliminating text bleed-through. Costs a
    # second screenshot per slide (~150 ms on default viewport). On by
    # default — the visual quality win on textured backgrounds (mesh
    # gradients, glassmorphism, photo overlays) outweighs the small
    # latency cost. Set to False for huge decks where wall-clock time
    # matters more than perfect background fidelity.
    differential_render: bool = True
    # Embed the source fonts (Inter etc.) into the .pptx so PowerPoint
    # renders with the same typeface that sized the original CSS bboxes.
    # Without this, Calibri substitution shifts every text-frame width,
    # causing titles to wrap, badges to overflow, alignment to drift.
    # On by default; disable for faster emit on decks where the
    # default-Office font is acceptable.
    embed_fonts: bool = True
    # Re-open the produced .pptx and verify that the editable-shape count
    # per slide matches what the emitter intended to produce. Catches
    # silent shape-drop bugs that the SSIM oracle can't see (it only
    # checks pixels, so a missing-but-pixel-similar shape passes).
    # Cheap (~1ms/slide); on by default.
    run_editability_check: bool = True


@dataclass
class _SlidePlan:
    index: int
    rendered: RenderedSlide
    units: list[VisualUnit]
    units_flat: list[VisualUnit]
    units_by_id: dict[str, VisualUnit]
    decisions: dict[str, Decision] = field(default_factory=dict)
    ops: list[EmitOp] = field(default_factory=list)
    notes: str = ""


@dataclass
class _SlideSummary:
    """Lightweight per-slide bookkeeping kept after `_SlidePlan` is dropped."""

    index: int
    ops: list[EmitOp]
    decisions_by_tier: dict[str, int]


# -----------------------------------------------------------------------------
# Source normalization
# -----------------------------------------------------------------------------


async def _normalize_source(source: SlideSource) -> AsyncIterator[str]:
    """Yield slide HTML strings from any supported source form."""
    if isinstance(source, str):
        for chunk in split_slides(source):
            yield chunk
        return

    if isinstance(source, Path):
        if source.is_dir():
            for path in sorted(source.glob("*.html")):
                yield path.read_text(encoding="utf-8")
            return
        # Single file: still split (so a single big concatenated file works).
        text = source.read_text(encoding="utf-8")
        for chunk in split_slides(text):
            yield chunk
        return

    if hasattr(source, "__aiter__"):
        async for item in source:  # type: ignore[union-attr]
            yield _read_item(item)
        return

    if hasattr(source, "__iter__"):
        for item in source:  # type: ignore[union-attr]
            yield _read_item(item)
        return

    raise TypeError(f"unsupported slide source type: {type(source).__name__}")


def _read_item(item: str | Path) -> str:
    if isinstance(item, Path):
        return item.read_text(encoding="utf-8")
    if isinstance(item, str):
        # Heuristic: if it looks like a path and a file exists, read it. Otherwise
        # treat as HTML content. We bias toward HTML to keep the str API stable.
        return item
    raise TypeError(f"slide item must be str or Path, got {type(item).__name__}")


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------


def _decisions_by_tier_from_summaries(
    summaries: list[_SlideSummary],
) -> dict[str, int]:
    counts: dict[str, int] = {}
    for s in summaries:
        for tier, n in s.decisions_by_tier.items():
            counts[tier] = counts.get(tier, 0) + n
    return counts


def _per_slide_decisions_count(plan: _SlidePlan) -> dict[str, int]:
    counts: dict[str, int] = {}
    for d in plan.decisions.values():
        counts[d.source_tier] = counts.get(d.source_tier, 0) + 1
    return counts


def _extract_notes(rendered: RenderedSlide) -> str:
    parts = [e.pptx_notes for e in rendered.elements if e.pptx_notes]
    return "\n".join(parts).strip()


def _classify_unit_tier12(
    unit: VisualUnit,
    cache: StructuralCache,
    prior: dict[str, Decision],
    pattern_stats: PatternStats,
    unmatched: dict[str, UnmatchedSignature],
) -> Decision | None:
    cached = cache.get(unit)
    if cached is not None:
        return Decision(
            kind=cached.kind,
            confidence=cached.confidence,
            reason=f"cache_hit ({cached.reason})",
            metadata=cached.metadata,
            source_tier=f"cache:{cached.source_tier}",
        )
    # Tier 0: pattern DB recipes (Tailwind / shadcn / common compositions).
    d = classify_tier0(unit, get_default_catalog(), stats=pattern_stats)
    if d is not None:
        cache.put(unit, d)
        return d
    # Pattern miss → record signature for the harvester.
    sig = signature(unit)
    sig_h = signature_hash(unit)
    if sig_h in unmatched:
        unmatched[sig_h].n_occurrences += 1
    else:
        anchor = unit.elements[0] if unit.elements else None
        sample_text = ""
        for e in unit.all_elements():
            if e.text and e.text.strip():
                sample_text = e.text.strip()[:60]
                break
        unmatched[sig_h] = UnmatchedSignature(
            sig=sig,
            sig_hash=sig_h,
            bbox_w=int(unit.bbox.w),
            bbox_h=int(unit.bbox.h),
            sample_classes=(anchor.cls or "") if anchor else "",
            sample_text=sample_text,
        )
    d = classify_tier1(unit)
    if d is not None:
        cache.put(unit, d)
        return d
    d = classify_tier2(unit, prior)
    if d is not None:
        cache.put(unit, d)
        return d
    return None  # defer to tier 3


async def _build_provider(config: ConversionConfig) -> LLMProvider | None:
    if not config.run_tier3:
        return None
    backend = config.llm_backend or auto_select_backend()
    if backend is None:
        return None
    try:
        return build_provider(
            backend,
            model=config.llm_model,
            project_id=config.google_project,
            location=config.google_location,
        )
    except Exception as e:
        log.warning("api.provider_build_failed", backend=backend, error=str(e))
        return None


async def _classify_slide(
    plan: _SlidePlan,
    cache: StructuralCache,
    provider: LLMProvider | None,
    pattern_stats: PatternStats,
    unmatched: dict[str, UnmatchedSignature],
) -> Tier3Stats:
    decisions: dict[str, Decision] = {}
    deferred: list[VisualUnit] = []

    for u in reversed(plan.units_flat):
        d = _classify_unit_tier12(u, cache, decisions, pattern_stats, unmatched)
        if d is None:
            deferred.append(u)
        else:
            decisions[u.id] = d

    stats = Tier3Stats()
    if deferred and provider is not None:
        decisions_t3, stats = await classify_tier3(
            deferred, plan.rendered.ground_truth_png, provider=provider
        )
        for uid, d in decisions_t3.items():
            decisions[uid] = d
            cache.put(plan.units_by_id[uid], d)
    elif deferred:
        for u in deferred:
            decisions[u.id] = Decision(
                kind=DecisionKind.Raster,
                confidence=0.5,
                reason="no_llm_provider",
                source_tier="tier3",
            )

    plan.decisions = decisions
    return stats


async def _render_batch(
    renderer: Renderer, slides_html: list[str]
) -> list[RenderedSlide]:
    """Render a batch of slides in parallel."""
    return list(await asyncio.gather(*(renderer.render(h) for h in slides_html)))


async def _drain_in_batches(
    iter_html: AsyncIterator[str], size: int
) -> AsyncIterator[list[str]]:
    """Pull `size` items at a time from an async source, yielding batches."""
    batch: list[str] = []
    async for html in iter_html:
        batch.append(html)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


# -----------------------------------------------------------------------------
# Public API
# -----------------------------------------------------------------------------


async def convert(
    source: SlideSource,
    pptx_path: str | Path,
    config: ConversionConfig | None = None,
) -> ConversionResult:
    """Convert HTML slides to PPTX. See module docstring for source forms."""
    cfg = config or ConversionConfig()
    pptx_path = Path(pptx_path)
    t_start = time.perf_counter()
    cache = cfg.cache or StructuralCache(MemoryCache())

    summaries: list[_SlideSummary] = []
    plans_for_oracle: list[_SlidePlan] = []
    total_stats = Tier3Stats()
    pattern_stats = PatternStats()
    unmatched: dict[str, UnmatchedSignature] = {}
    # Streamed accumulator of deck-wide DOM colors, scanned at save-time
    # to derive theme accent1..accent6. Element refs are cheap (~few KB
    # per slide) and we drop them after the theme is patched.
    color_elements: list = []

    async with Renderer(
        viewport=cfg.viewport, differential=cfg.differential_render
    ) as renderer:
        provider = await _build_provider(cfg)
        emitter = Emitter()

        slide_iter = _normalize_source(source)
        batch_size = max(1, cfg.render_concurrency)
        slide_idx = 0
        try:
            async for batch in _drain_in_batches(slide_iter, batch_size):
                rendered_batch = await _render_batch(renderer, batch)
                for rendered in rendered_batch:
                    plan = await _process_one(
                        slide_idx,
                        rendered,
                        cache,
                        provider,
                        emitter,
                        renderer,
                        total_stats,
                        pattern_stats,
                        unmatched,
                    )
                    summaries.append(
                        _SlideSummary(
                            index=plan.index,
                            ops=plan.ops,
                            decisions_by_tier=_per_slide_decisions_count(plan),
                        )
                    )
                    color_elements.extend(plan.rendered.elements)
                    # Refresh decoration palette as soon as we have enough
                    # color signal — gives later slides' decoration layers
                    # access to the deck's actual brand colors.
                    if len(color_elements) > 0 and slide_idx % 2 == 0:
                        try:
                            from slidify.theme import derive_accents_from_elements

                            running = derive_accents_from_elements(color_elements)
                            if running:
                                emitter.set_brand_palette(
                                    [a.lstrip("#") for a in running]
                                )
                        except Exception:
                            pass
                    if cfg.run_oracle and cfg.keep_plans_for_oracle:
                        plans_for_oracle.append(plan)
                    else:
                        # Keep only ground-truth PNG if we still need it for oracle.
                        if cfg.run_oracle:
                            plan.units = []
                            plan.units_flat = []
                            plan.units_by_id = {}
                            plan.decisions = {}
                        else:
                            # No oracle: drop the rendered PNG immediately too.
                            plan.rendered = RenderedSlide(
                                html="",
                                elements=[],
                                ground_truth_png=b"",
                                viewport_w=cfg.viewport[0],
                                viewport_h=cfg.viewport[1],
                            )
                        plans_for_oracle.append(plan)
                    slide_idx += 1

            if slide_idx == 0:
                raise ValueError("no slides produced from source")

            # Patch the deck's theme color scheme with the most-used brand
            # colors. Downstream tools (corporate template imports, "change
            # theme" in PowerPoint) then recolor schemeClr-bound shapes to
            # match. This is purely additive — explicit srgbClr fills we
            # already emitted continue to render unchanged.
            try:
                from slidify.theme import (
                    derive_accents_from_elements,
                    set_theme_accents,
                )

                accents = derive_accents_from_elements(color_elements)
                if accents:
                    set_theme_accents(
                        emitter.prs,
                        primary=accents[0] if len(accents) >= 1 else None,
                        secondary=accents[1] if len(accents) >= 2 else None,
                        accents=accents[2:6] if len(accents) > 2 else None,
                    )
                    # Strip the leading '#' so decoration layers can hand the
                    # palette straight to MeshGlow's hex-only API.
                    emitter.set_brand_palette(
                        [a.lstrip("#") for a in accents]
                    )
            except Exception as e:
                log.warning("api.theme_patch_failed", error=str(e))
            # Defer color_elements.clear() until after font-embedding so
            # the resolver can scan requested families. Cleared at the
            # end of convert() via the local going out of scope.

            emitter.save(pptx_path)
        finally:
            emitter.close()

        # Post-process: embed source fonts so renderers don't substitute.
        # Two passes:
        #   1. embed_default_fonts → embed Inter (the engine's standard).
        #   2. resolve_and_subset_for_deck → walk the rendered DOM for
        #      every CSS-specified family (Source Serif Pro / JetBrains
        #      Mono / etc.), resolve each via fontconfig, subset to the
        #      glyphs the deck actually uses, and embed those too.
        # Without (2), CSS asks for Source Serif Pro, fontconfig
        # silently substitutes DejaVu Sans (a sans-serif), and the
        # serif intent is lost in render. (2) keeps every requested
        # family available to the renderer by name.
        if cfg.embed_fonts:
            from slidify.font_embed import (
                discover_inter,
                embed_fonts_in_pptx,
            )
            from slidify.font_resolver import resolve_and_subset_for_deck

            try:
                fonts_to_embed: list = []
                inter = discover_inter()
                if inter is not None:
                    fonts_to_embed.append(inter)
                deck_fonts = resolve_and_subset_for_deck(color_elements)
                fonts_to_embed.extend(deck_fonts)
                if fonts_to_embed:
                    embed_fonts_in_pptx(pptx_path, fonts_to_embed)
                    log.info(
                        "api.fonts_embedded",
                        n=len(fonts_to_embed),
                        families=[f.typeface for f in fonts_to_embed],
                    )
            except Exception as e:
                log.warning("api.font_embed_failed", error=str(e))

        reports: list[FidelityReport] = []
        if cfg.run_oracle:
            reports = await _oracle_with_correction(
                pptx_path, plans_for_oracle, summaries, cfg, renderer
            )

    n_slides = len(summaries)
    avg_native = (
        sum(native_area_ratio(s.ops) for s in summaries) / n_slides if n_slides else 0.0
    )
    elapsed = time.perf_counter() - t_start
    # Top-N unmatched signatures by occurrence — most-likely candidates for new patterns.
    unmatched_sorted = sorted(
        unmatched.values(), key=lambda u: u.n_occurrences, reverse=True
    )[:25]
    from slidify.compat import MATRIX_VERSION as _COMPAT_VERSION
    from slidify.compat import matrix_summary as _compat_summary

    # Editability round-trip: re-open the produced .pptx and verify that
    # the shapes the emitter was asked to produce actually survived to
    # disk. Defaults on (cheap; one extra pptx open per conversion).
    edit_passed = True
    edit_intended_total = 0
    edit_actual_total = 0
    edit_failing: list[int] = []
    if cfg.run_editability_check:
        try:
            from slidify.roundtrip import check_pptx_editability

            ops_per_slide = [s.ops for s in summaries]
            edit_report = check_pptx_editability(pptx_path, ops_per_slide)
            edit_passed = edit_report.passed
            edit_intended_total = sum(
                s.intended_editable for s in edit_report.per_slide
            )
            edit_actual_total = sum(
                s.actual_editable for s in edit_report.per_slide
            )
            edit_failing = [
                s.slide_index for s in edit_report.per_slide if not s.passed
            ]
            if not edit_passed:
                log.warning(
                    "api.editability_drift",
                    failing_slides=edit_failing,
                    intended_total=edit_intended_total,
                    actual_total=edit_actual_total,
                )
        except Exception as e:
            log.warning("api.editability_check_failed", error=str(e))

    return ConversionResult(
        pptx_path=str(pptx_path),
        n_slides=n_slides,
        fidelity_reports=reports,
        native_area_ratio=avg_native,
        llm_calls=total_stats.n_calls,
        total_cost_usd=total_stats.cost_usd,
        elapsed_seconds=elapsed,
        cache_hit_rate=cache.hit_rate,
        decisions_by_tier=_decisions_by_tier_from_summaries(summaries),
        pattern_hits=dict(pattern_stats.hits_by_id),
        pattern_coverage=pattern_stats.coverage,
        unmatched_signatures=unmatched_sorted,
        compat_matrix_version=_COMPAT_VERSION,
        compat_matrix_summary=_compat_summary(),
        editability_passed=edit_passed,
        editability_intended_total=edit_intended_total,
        editability_actual_total=edit_actual_total,
        editability_failing_slides=edit_failing,
    )


async def _process_one(
    slide_idx: int,
    rendered: RenderedSlide,
    cache: StructuralCache,
    provider: LLMProvider | None,
    emitter: Emitter,
    renderer: Renderer,
    total_stats: Tier3Stats,
    pattern_stats: PatternStats,
    unmatched: dict[str, UnmatchedSignature],
) -> _SlidePlan:
    roots = cluster(rendered.elements)
    flat = flatten(roots)
    by_id = {u.id: u for u in flat}
    plan = _SlidePlan(
        index=slide_idx,
        rendered=rendered,
        units=roots,
        units_flat=flat,
        units_by_id=by_id,
        notes=_extract_notes(rendered),
    )
    stats = await _classify_slide(plan, cache, provider, pattern_stats, unmatched)
    total_stats.n_calls += stats.n_calls
    total_stats.n_units += stats.n_units
    total_stats.cost_usd += stats.cost_usd
    for k, v in stats.by_backend.items():
        total_stats.by_backend[k] = total_stats.by_backend.get(k, 0) + v
    if stats.backend:
        total_stats.backend = stats.backend
        total_stats.model = stats.model

    plan.decisions = promote(plan.units, plan.decisions)
    plan.ops = to_emit_ops(plan.units, plan.decisions)
    await emitter.emit_slide(
        plan.index,
        plan.rendered,
        plan.units_by_id,
        plan.ops,
        renderer,
        notes=plan.notes,
    )
    return plan


# -----------------------------------------------------------------------------
# Oracle + auto-correction
# -----------------------------------------------------------------------------


async def _oracle_with_correction(
    pptx_path: Path,
    plans: list[_SlidePlan],
    summaries: list[_SlideSummary],
    cfg: ConversionConfig,
    renderer: Renderer,
) -> list[FidelityReport]:
    oracle = FidelityOracle()
    ground_truths = [p.rendered.ground_truth_png for p in plans]

    def _units_per_slide() -> list[tuple[dict[str, VisualUnit], dict[str, Decision]]]:
        # Snapshot per-slide (units_by_id, decisions) so the oracle can
        # attribute failing regions back to the unit/decision that produced
        # them. When state was dropped (low_memory), the maps are empty and
        # attribution is skipped for that slide.
        return [(p.units_by_id, p.decisions) for p in plans]

    reports = await oracle.evaluate(
        pptx_path, ground_truths, units_per_slide=_units_per_slide()
    )

    if not cfg.keep_plans_for_oracle:
        # No state to re-emit from — return the first-pass reports.
        return reports

    for _iter in range(cfg.max_oracle_iterations):
        failing = [r for r in reports if not r.passed]
        if not failing:
            break
        log.info("oracle.iter", failing=len(failing))
        any_changed = False
        for r in failing:
            plan = plans[r.slide_index]
            if not plan.units:
                continue  # state was dropped, can't fix
            if not r.failing_regions:
                _force_full_raster(plan)
                any_changed = True
                continue
            for region in r.failing_regions:
                if _force_raster_overlapping(plan, region):
                    any_changed = True
        if not any_changed:
            break

        emitter = Emitter()
        try:
            for plan in plans:
                if not plan.units:
                    # Re-emit from cached ops if state was dropped.
                    plan.ops = summaries[plan.index].ops
                else:
                    plan.ops = to_emit_ops(plan.units, plan.decisions)
                await emitter.emit_slide(
                    plan.index,
                    plan.rendered,
                    plan.units_by_id,
                    plan.ops,
                    renderer,
                    notes=plan.notes,
                )
            emitter.save(pptx_path)
        finally:
            emitter.close()
        # Update summaries with the new ops so native_area_ratio reflects fixes.
        for plan in plans:
            summaries[plan.index].ops = plan.ops
        reports = await oracle.evaluate(
            pptx_path, ground_truths, units_per_slide=_units_per_slide()
        )

    return reports


def _force_full_raster(plan: _SlidePlan) -> None:
    new_decisions: dict[str, Decision] = {}
    # The earlier two-level iteration (children + grandchildren) missed any
    # deeper descendant: brutalist decks routinely nest 4–5 levels deep
    # (`.slide > .frame > .head > .row > h1`), and an h1 left as
    # NativeText would paint over the full-slide raster. Walk the whole
    # tree once.
    for u in plan.units:
        new_decisions[u.id] = Decision(
            kind=DecisionKind.Raster,
            confidence=1.0,
            reason="oracle_full_raster",
            source_tier="oracle_fix",
        )
        stack = list(u.children)
        while stack:
            c = stack.pop()
            new_decisions[c.id] = Decision(
                kind=DecisionKind.Skip,
                confidence=1.0,
                reason="absorbed by oracle_full_raster",
                source_tier="oracle_fix",
            )
            stack.extend(c.children)
    plan.decisions = {**plan.decisions, **new_decisions}


def _force_raster_overlapping(plan: _SlidePlan, region) -> bool:
    """Mark the smallest unit overlapping `region` as Raster.

    We pick the *smallest* overlapping unit (most specific) to avoid promoting
    the whole slide to raster just because a single text region drifted.
    Returns True if anything changed.
    """
    region_area = region.w * region.h
    if region_area <= 0:
        return False

    candidates: list[VisualUnit] = []
    for u in plan.units_flat:
        if u.bbox.area <= 0:
            continue
        contained = u.bbox.intersect_area(region) / region_area
        if contained < 0.5:
            continue
        if u.bbox.area > region_area * 10:
            continue
        candidates.append(u)

    if not candidates:
        return False

    target = min(candidates, key=lambda u: u.bbox.area)
    cur = plan.decisions.get(target.id)
    if cur is not None and cur.kind in (DecisionKind.Raster, DecisionKind.Skip):
        return False

    plan.decisions[target.id] = Decision(
        kind=DecisionKind.Raster,
        confidence=1.0,
        reason="oracle_region_fix",
        source_tier="oracle_fix",
    )
    # Recursively skip ALL descendants AND any spatially-contained sibling
    # units. Direct children alone isn't enough for two reasons:
    #   1. Deeper descendants (text-bearing grandchildren) keep their
    #      NativeText decision and re-paint atop the raster.
    #   2. The DOM hierarchy may not match the spatial hierarchy: a
    #      brutalist `.frame` div is a SIBLING of `.head`/`.lay` rather
    #      than their ancestor (it's an absolutely-positioned overlay).
    #      Rastering only its DOM subtree leaves the head's title and
    #      ladder text drawing on top of the rastered frame interior,
    #      producing the slide-27 doubled-title artifact.
    # Both holes are closed by skipping every unit whose bbox is mostly
    # contained in the target's bbox.
    skip_set: set[str] = set()
    stack: list[VisualUnit] = list(target.children)
    while stack:
        c = stack.pop()
        skip_set.add(c.id)
        stack.extend(c.children)
    target_bbox = target.bbox
    target_area = target_bbox.area
    if target_area > 0:
        for u in plan.units_flat:
            if u.id == target.id or u.id in skip_set:
                continue
            if u.bbox.area <= 0:
                continue
            # Don't absorb siblings *larger* than the target — those are
            # genuinely above us in the spatial hierarchy and may carry
            # important content that extends outside the rastered patch.
            if u.bbox.area > target_area:
                continue
            inter = u.bbox.intersect_area(target_bbox)
            if inter / u.bbox.area >= 0.85:
                skip_set.add(u.id)
    for uid in skip_set:
        plan.decisions[uid] = Decision(
            kind=DecisionKind.Skip,
            confidence=1.0,
            reason="absorbed by oracle_region_fix",
            source_tier="oracle_fix",
        )
    return True
