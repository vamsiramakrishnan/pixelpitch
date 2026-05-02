from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class ExecutionResult:
    slide_index: int
    emitted_ops: list[Any] = field(default_factory=list)
    notes: str = ""

