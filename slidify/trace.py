"""Unit-level trace rows for training and debugging the cost model.

The compiler already knows the useful facts: structural signatures, extracted
cost-model features, decisions, and oracle attribution. This module joins those
facts into JSONL rows so offline evals can fit a real model instead of tuning
constants by hand.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from slidify.classifier.cost_model import MODEL_VERSION, extract_features, predict_costs
from slidify.models import Decision, FidelityReport, VisualUnit
from slidify.patterns.signatures import signature, signature_hash

SCHEMA_VERSION = 1


def _bbox_list(unit: VisualUnit) -> list[float]:
    b = unit.bbox
    return [b.x, b.y, b.w, b.h]


def _decision_dict(decision: Decision | None) -> dict[str, Any]:
    if decision is None:
        return {
            "kind": None,
            "source_tier": None,
            "confidence": 0.0,
            "reason": "",
            "metadata": {},
        }
    return {
        "kind": decision.kind.value,
        "source_tier": decision.source_tier,
        "confidence": decision.confidence,
        "reason": decision.reason,
        "metadata": decision.metadata,
    }


def _sample_text(unit: VisualUnit) -> str:
    parts: list[str] = []
    for el in unit.all_elements():
        if el.text and el.text.strip():
            parts.append(el.text.strip())
        if el.runs:
            for run in el.runs:
                if not run.is_break and run.text.strip():
                    parts.append(run.text.strip())
        if len(" ".join(parts)) > 240:
            break
    return " ".join(parts)[:240]


def _attribution_by_unit(report: FidelityReport | None) -> dict[str, list[dict[str, Any]]]:
    if report is None:
        return {}
    out: dict[str, list[dict[str, Any]]] = {}
    for attr in report.failing_units:
        out.setdefault(attr.unit_id, []).append(
            {
                "region": [
                    attr.region.x,
                    attr.region.y,
                    attr.region.w,
                    attr.region.h,
                ],
                "decision_kind": attr.decision_kind,
                "source_tier": attr.source_tier,
                "reason": attr.reason,
                "suspected_failure": attr.suspected_failure,
            }
        )
    return out


def build_trace_rows(
    *,
    slide_index: int,
    units: list[VisualUnit],
    decisions: dict[str, Decision],
    report: FidelityReport | None = None,
    include_text: bool = False,
) -> list[dict[str, Any]]:
    """Build JSON-serializable trace rows for one slide.

    Text is excluded by default so corpus/eval traces can be shared without
    leaking slide copy. Set ``include_text=True`` only for local debugging.
    """
    by_unit = _attribution_by_unit(report)
    rows: list[dict[str, Any]] = []
    for unit in units:
        decision = decisions.get(unit.id)
        cost_features = extract_features(unit, decisions)
        cost_prediction = predict_costs(unit, decisions)
        failures = by_unit.get(unit.id, [])
        row: dict[str, Any] = {
            "schema_version": SCHEMA_VERSION,
            "slide_index": slide_index,
            "unit_id": unit.id,
            "signature_hash": signature_hash(unit),
            "signature": signature(unit),
            "bbox": _bbox_list(unit),
            "features": asdict(cost_features),
            "cost_model": {
                "model_version": MODEL_VERSION,
                "predicted_kind": cost_prediction.decision.value,
                "confidence": cost_prediction.confidence,
                "margin": cost_prediction.margin,
                "expected_value": {
                    "native": cost_prediction.native_ev,
                    "hybrid": cost_prediction.hybrid_ev,
                    "raster": cost_prediction.raster_ev,
                },
            },
            "decision": _decision_dict(decision),
            "oracle": {
                "available": report is not None,
                "slide_passed": report.passed if report is not None else None,
                "ssim": report.ssim if report is not None else None,
                "ocr_recall": report.ocr_recall if report is not None else None,
                "attributed_failure": bool(failures),
                "failures": failures,
            },
        }
        if include_text:
            row["sample_text"] = _sample_text(unit)
        rows.append(row)
    return rows


def write_trace_jsonl(path: str | Path, rows: list[dict[str, Any]]) -> None:
    """Write trace rows as newline-delimited JSON.

    Classifier metadata is supposed to be primitive JSON, but using default=str
    makes the trace writer resilient to future metadata that carries enums,
    paths, or tiny helper dataclasses.
    """
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(
                json.dumps(row, ensure_ascii=False, sort_keys=True, default=str) + "\n"
            )
