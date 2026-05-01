from __future__ import annotations

import json

from slidify.models import (
    BoundingBox,
    Decision,
    DecisionKind,
    DomElement,
    FailingUnitAttribution,
    FidelityReport,
    VisualUnit,
)
from slidify.trace import build_trace_rows, write_trace_jsonl


def _el(id_: int, text: str = "Hello") -> DomElement:
    return DomElement(
        id=id_,
        parent_id=None,
        depth=0,
        tag="DIV",
        bbox=BoundingBox(x=10, y=20, w=200, h=50),
        text=text,
        font_family="Inter",
        font_size="24px",
        font_weight="700",
        color="rgb(255, 255, 255)",
    )


def _unit() -> VisualUnit:
    return VisualUnit(
        id="u_1",
        bbox=BoundingBox(x=10, y=20, w=200, h=50),
        elements=[_el(1)],
    )


def test_build_trace_rows_omits_text_by_default() -> None:
    unit = _unit()
    decision = Decision(
        kind=DecisionKind.NativeText,
        confidence=0.93,
        reason="test_native",
        source_tier="tier2:model",
    )
    rows = build_trace_rows(
        slide_index=0,
        units=[unit],
        decisions={unit.id: decision},
    )

    assert len(rows) == 1
    row = rows[0]
    assert row["schema_version"] == 1
    assert row["slide_index"] == 0
    assert row["unit_id"] == "u_1"
    assert "sample_text" not in row
    assert row["decision"]["kind"] == "native_text"
    assert row["decision"]["source_tier"] == "tier2:model"
    assert row["features"]["has_own_text"] is True
    assert row["cost_model"]["expected_value"]["native"] is not None
    assert row["oracle"]["available"] is False


def test_build_trace_rows_can_include_text_when_explicitly_enabled() -> None:
    unit = _unit()
    rows = build_trace_rows(
        slide_index=0,
        units=[unit],
        decisions={},
        include_text=True,
    )

    assert rows[0]["sample_text"] == "Hello"


def test_build_trace_rows_attaches_oracle_attribution() -> None:
    unit = _unit()
    report = FidelityReport(
        slide_index=0,
        ssim=0.72,
        ocr_recall=0.81,
        passed=False,
        failing_units=[
            FailingUnitAttribution(
                region=BoundingBox(x=12, y=22, w=40, h=10),
                unit_id="u_1",
                decision_kind="NativeText",
                source_tier="tier2:model",
                reason="test_native",
                suspected_failure="font_metrics",
            )
        ],
    )

    rows = build_trace_rows(
        slide_index=0,
        units=[unit],
        decisions={},
        report=report,
    )

    oracle = rows[0]["oracle"]
    assert oracle["available"] is True
    assert oracle["slide_passed"] is False
    assert oracle["ssim"] == 0.72
    assert oracle["attributed_failure"] is True
    assert oracle["failures"][0]["suspected_failure"] == "font_metrics"


def test_write_trace_jsonl_round_trips(tmp_path) -> None:
    out = tmp_path / "trace.jsonl"
    write_trace_jsonl(out, [{"b": 2, "a": 1}, {"c": 3}])

    rows = [json.loads(line) for line in out.read_text(encoding="utf-8").splitlines()]
    assert rows == [{"a": 1, "b": 2}, {"c": 3}]
