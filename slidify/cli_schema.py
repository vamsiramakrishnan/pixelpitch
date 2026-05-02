from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

SCHEMA_VERSION = "1.0"


@dataclass(slots=True)
class CLIError:
    type: str
    message: str
    stage: str


@dataclass(slots=True)
class CLIEnvelope:
    schema_version: str
    command: str
    status: str
    error: CLIError | None
    metrics: dict[str, Any]
    _next: list[str]


def ok(command: str, metrics: dict[str, Any], next_steps: list[str]) -> dict[str, Any]:
    return asdict(
        CLIEnvelope(
            schema_version=SCHEMA_VERSION,
            command=command,
            status="ok",
            error=None,
            metrics=metrics,
            _next=next_steps,
        )
    )


def fail(
    command: str,
    err_type: str,
    message: str,
    stage: str,
    next_steps: list[str],
    metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return asdict(
        CLIEnvelope(
            schema_version=SCHEMA_VERSION,
            command=command,
            status="error",
            error=CLIError(type=err_type, message=message, stage=stage),
            metrics=metrics or {},
            _next=next_steps,
        )
    )
