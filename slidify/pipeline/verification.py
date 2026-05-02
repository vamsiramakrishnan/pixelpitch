from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class VerificationResult:
    slide_index: int
    passed: bool
    reason: str = ""

