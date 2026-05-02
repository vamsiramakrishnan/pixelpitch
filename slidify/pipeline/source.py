from __future__ import annotations

from collections.abc import AsyncIterator


async def normalize_source(source: str) -> AsyncIterator[str]:
    """Minimal pipeline adapter for source normalization."""
    yield source

