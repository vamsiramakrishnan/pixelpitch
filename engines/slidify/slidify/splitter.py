"""Split a multi-slide HTML blob into N single-slide HTML strings."""

from __future__ import annotations

import re

_DOCTYPE_HTML = re.compile(
    r"<!DOCTYPE\s+html[^>]*>\s*<html[^>]*>",
    re.IGNORECASE,
)


def split_slides(html: str) -> list[str]:
    """Split on `<!DOCTYPE html><html ...>` markers; tolerate single-slide input.

    Each output is a complete, valid HTML document.
    """
    if not html or not html.strip():
        return []

    matches = list(_DOCTYPE_HTML.finditer(html))
    if len(matches) <= 1:
        # Either no marker at all or exactly one — treat as a single slide.
        return [html]

    slides: list[str] = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(html)
        chunk = html[start:end].rstrip()
        slides.append(chunk)
    return slides
