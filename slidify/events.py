from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(slots=True)
class SlideEvent:
    event: str
    slide_index: int
    detail: dict[str, Any]


def encode_event(evt: SlideEvent) -> str:
    return json.dumps(asdict(evt), sort_keys=True)

