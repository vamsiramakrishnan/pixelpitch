from __future__ import annotations

from typing import Any

from slidify.classifier.interfaces import ClassifierStage


class ClassifierRegistry:
    def __init__(self) -> None:
        self._stages: list[ClassifierStage] = []

    def register(self, stage: ClassifierStage) -> None:
        self._stages.append(stage)
        self._stages.sort(key=lambda s: s.order)

    def run(self, unit: Any, context: Any) -> dict[str, Any]:
        for stage in self._stages:
            out = stage.run(unit, context)
            if out.get("matched"):
                return out
        return {
            "matched": False,
            "reason_code": "no_stage_matched",
            "confidence": 0.0,
            "features": {},
            "fallback_path": "hybrid",
        }
