"""Font resolution from CSS font-family stacks to PPTX-safe names."""

from __future__ import annotations

# Map common web font families → safe PPTX/Office equivalents.
_FONT_MAP: dict[str, str] = {
    "inter": "Inter",
    "roboto": "Roboto",
    "open sans": "Open Sans",
    "lato": "Lato",
    "montserrat": "Montserrat",
    "poppins": "Poppins",
    "nunito": "Nunito",
    "source sans pro": "Source Sans Pro",
    "system-ui": "Calibri",
    "ui-sans-serif": "Calibri",
    "sans-serif": "Calibri",
    "serif": "Cambria",
    "ui-serif": "Cambria",
    "monospace": "Consolas",
    "ui-monospace": "Consolas",
    "helvetica": "Helvetica",
    "arial": "Arial",
    "georgia": "Georgia",
    "times": "Times New Roman",
    "times new roman": "Times New Roman",
    "courier": "Courier New",
    "courier new": "Courier New",
    "verdana": "Verdana",
    "tahoma": "Tahoma",
    "consolas": "Consolas",
    "cambria": "Cambria",
    "calibri": "Calibri",
    "segoe ui": "Segoe UI",
    "menlo": "Consolas",
    "monaco": "Consolas",
}

DEFAULT_FONT = "Calibri"


def resolve(css_font_family: str) -> str:
    """Resolve a CSS font-family stack to a single PPTX font name.

    Walks the stack left-to-right, returns the first known mapping.
    Falls back to DEFAULT_FONT.
    """
    if not css_font_family:
        return DEFAULT_FONT
    for raw in css_font_family.split(","):
        name = raw.strip().strip('"').strip("'").lower()
        if not name:
            continue
        if name in _FONT_MAP:
            return _FONT_MAP[name]
        # Title-case unknown but plausibly real fonts (e.g. "Helvetica Neue")
        if all(part.isalpha() or part.isspace() or part in "-_" for part in name):
            return " ".join(p.capitalize() for p in name.split())
    return DEFAULT_FONT


def parse_weight(css_weight: str) -> int:
    """Parse CSS font-weight ('400', 'bold', '600') → integer in [100..900]."""
    if not css_weight:
        return 400
    css_weight = css_weight.strip().lower()
    if css_weight == "bold":
        return 700
    if css_weight in ("normal", "regular"):
        return 400
    try:
        v = int(css_weight)
        return max(100, min(900, v))
    except ValueError:
        return 400


def is_bold(css_weight: str) -> bool:
    return parse_weight(css_weight) >= 600
