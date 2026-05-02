from __future__ import annotations

from typing import Any, Protocol


class ClassifierStage(Protocol):
    name: str
    order: int

    def run(self, unit: Any, context: Any) -> dict[str, Any]: ...
