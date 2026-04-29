"""Public API: convert(html, pptx_path, ...) → ConversionResult."""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable
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
    VisualUnit,
)
from slidify.oracle import FidelityOracle
from slidify.promotion import promote, to_emit_ops
from slidify.renderer import Renderer
from slidify.splitter import split_slides
from slidify.units import cluster, flatten

log = structlog.get_logger(__name__)


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
        render_concurrency: how many slides to render in parallel.
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


def _decisions_by_tier(planned: list[_SlidePlan]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for plan in planned:
        for d in plan.decisions.values():
            counts[d.source_tier] = counts.get(d.source_tier, 0) + 1
    return counts


async def _render_all(
    renderer: Renderer, slides_html: list[str], concurrency: int
) -> list[RenderedSlide]:
    sem = asyncio.Semaphore(max(1, concurrency))

    async def one(html: str) -> RenderedSlide:
        async with sem:
            return await renderer.render(html)

    tasks: list[Awaitable[RenderedSlide]] = [one(h) for h in slides_html]
    return list(await asyncio.gather(*tasks))


def _extract_notes(rendered: RenderedSlide) -> str:
    """Pull notes from any element with data-pptx-notes."""
    parts = [
        e.pptx_notes for e in rendered.elements if e.pptx_notes
    ]
    return "\n".join(parts).strip()


def _classify_unit_tier12(
    unit: VisualUnit, cache: StructuralCache, prior: dict[str, Decision]
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
) -> Tier3Stats:
    """Run tiers 1+2 in pre-order, then a single tier-3 batched call."""
    decisions: dict[str, Decision] = {}
    deferred: list[VisualUnit] = []

    # Pre-order so children are classified before parents (tier 2 needs child decisions).
    for u in reversed(plan.units_flat):
        d = _classify_unit_tier12(u, cache, decisions)
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
        # No provider — safe Raster fallback.
        for u in deferred:
            decisions[u.id] = Decision(
                kind=DecisionKind.Raster,
                confidence=0.5,
                reason="no_llm_provider",
                source_tier="tier3",
            )

    plan.decisions = decisions
    return stats


async def convert(
    html: str,
    pptx_path: str | Path,
    config: ConversionConfig | None = None,
) -> ConversionResult:
    """Convert a multi-slide HTML blob to a PPTX file.

    Args:
        html: Full HTML (potentially multi-slide via `<!DOCTYPE html><html ...>` markers).
        pptx_path: Output path.
        config: Optional config; defaults are sensible.

    Returns:
        ConversionResult with stats and per-slide fidelity reports.
    """
    cfg = config or ConversionConfig()
    pptx_path = Path(pptx_path)
    t_start = time.perf_counter()
    cache = cfg.cache or StructuralCache(MemoryCache())

    slides_html = split_slides(html)
    if not slides_html:
        raise ValueError("input HTML produced zero slides")
    log.info("api.split", n_slides=len(slides_html))

    # Stage 1: render
    async with Renderer(viewport=cfg.viewport) as renderer:
        rendered = await _render_all(renderer, slides_html, cfg.render_concurrency)

        # Stage 2: cluster + classify
        provider = await _build_provider(cfg)

        plans: list[_SlidePlan] = []
        total_stats = Tier3Stats()
        for i, r in enumerate(rendered):
            roots = cluster(r.elements)
            flat = flatten(roots)
            by_id = {u.id: u for u in flat}
            plan = _SlidePlan(
                index=i,
                rendered=r,
                units=roots,
                units_flat=flat,
                units_by_id=by_id,
                notes=_extract_notes(r),
            )
            stats = await _classify_slide(plan, cache, provider)
            total_stats.n_calls += stats.n_calls
            total_stats.n_units += stats.n_units
            total_stats.cost_usd += stats.cost_usd
            for k, v in stats.by_backend.items():
                total_stats.by_backend[k] = total_stats.by_backend.get(k, 0) + v
            if stats.backend:
                total_stats.backend = stats.backend
                total_stats.model = stats.model
            plans.append(plan)

        # Stage 3: promotion + emission
        emitter = Emitter()
        try:
            for plan in plans:
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
            emitter.save(pptx_path)
        finally:
            emitter.close()

        # Stage 4: oracle (with auto-correction loop)
        reports: list[FidelityReport] = []
        if cfg.run_oracle:
            reports = await _oracle_with_correction(
                pptx_path, plans, cfg, renderer
            )

    avg_native = (
        sum(native_area_ratio(p.ops) for p in plans) / len(plans) if plans else 0.0
    )

    elapsed = time.perf_counter() - t_start
    return ConversionResult(
        pptx_path=str(pptx_path),
        n_slides=len(plans),
        fidelity_reports=reports,
        native_area_ratio=avg_native,
        llm_calls=total_stats.n_calls,
        total_cost_usd=total_stats.cost_usd,
        elapsed_seconds=elapsed,
        cache_hit_rate=cache.hit_rate,
        decisions_by_tier=_decisions_by_tier(plans),
    )


async def _oracle_with_correction(
    pptx_path: Path,
    plans: list[_SlidePlan],
    cfg: ConversionConfig,
    renderer: Renderer,
) -> list[FidelityReport]:
    oracle = FidelityOracle()
    ground_truths = [p.rendered.ground_truth_png for p in plans]
    reports = await oracle.evaluate(pptx_path, ground_truths)

    for _iter in range(cfg.max_oracle_iterations):
        failing = [r for r in reports if not r.passed]
        if not failing:
            break
        log.info("oracle.iter", failing=len(failing))
        # For each failing slide: re-classify failing regions as raster.
        any_changed = False
        for r in failing:
            plan = plans[r.slide_index]
            if not r.failing_regions:
                # Whole slide failed — last resort, full raster.
                _force_full_raster(plan)
                any_changed = True
                continue
            for region in r.failing_regions:
                if _force_raster_overlapping(plan, region):
                    any_changed = True
        if not any_changed:
            break
        # Re-emit only the affected slides into a fresh PPTX.
        emitter = Emitter()
        try:
            for plan in plans:
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
        reports = await oracle.evaluate(pptx_path, ground_truths)

    return reports


def _force_full_raster(plan: _SlidePlan) -> None:
    """Mark every top-level unit as Raster and absorb children."""
    new_decisions: dict[str, Decision] = {}
    for u in plan.units:
        new_decisions[u.id] = Decision(
            kind=DecisionKind.Raster,
            confidence=1.0,
            reason="oracle_full_raster",
            source_tier="oracle_fix",
        )
        for child in u.children:
            new_decisions[child.id] = Decision(
                kind=DecisionKind.Skip,
                confidence=1.0,
                reason="absorbed by oracle_full_raster",
                source_tier="oracle_fix",
            )
            for grand in child.children:
                new_decisions[grand.id] = Decision(
                    kind=DecisionKind.Skip,
                    confidence=1.0,
                    reason="absorbed by oracle_full_raster",
                    source_tier="oracle_fix",
                )
    # Apply only over-rides; preserve any decisions for units we didn't touch.
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

    # Candidate units: those whose bbox contains a meaningful fraction of the
    # failing region AND aren't drastically larger than it.
    candidates: list[VisualUnit] = []
    for u in plan.units_flat:
        if u.bbox.area <= 0:
            continue
        # The unit's bbox should contain >=50% of the failing region.
        contained = u.bbox.intersect_area(region) / region_area
        if contained < 0.5:
            continue
        # And not be more than ~10x the region area (else it's a structural wrapper).
        if u.bbox.area > region_area * 10:
            continue
        candidates.append(u)

    if not candidates:
        return False

    # Pick the smallest candidate (most specific).
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
    for c in target.children:
        plan.decisions[c.id] = Decision(
            kind=DecisionKind.Skip,
            confidence=1.0,
            reason="absorbed by oracle_region_fix",
            source_tier="oracle_fix",
        )
    return True
