from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class StagePlan:
    slide_index: int
    units: list[Any] = field(default_factory=list)
    decisions: dict[str, Any] = field(default_factory=dict)
    ops: list[Any] = field(default_factory=list)

