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

# Generic CSS family tokens that act as the *fallback* in a stack. When we
# encounter a stack whose head names aren't in our `_FONT_MAP`, we still want
# to honor the generic family the author asked for — emitting a known-installed
# font of the right *kind* (mono/serif/sans) keeps mono columns lined up,
# stops Inter-sized bboxes from overflowing into a wider serif, etc. The
# alternative (returning the unknown name verbatim and letting PowerPoint /
# LibreOffice substitute) is what causes the dominant class of failure on
# brutalist / status-board / spec-sheet layouts: substitution picks Liberation
# Sans (proportional) for `'JetBrains Mono', monospace`, and tabular alignment
# explodes.
_GENERIC_FAMILY_FALLBACK: dict[str, str] = {
    "monospace": "Consolas",
    "ui-monospace": "Consolas",
    "sans-serif": "Calibri",
    "ui-sans-serif": "Calibri",
    "system-ui": "Calibri",
    "serif": "Cambria",
    "ui-serif": "Cambria",
}

# Hints in a CSS family token that the author wanted a monospace face. We
# don't have a runtime font-availability probe in this engine, so we rely on
# the substring + neighbour-token signal: if the stack ends in `monospace`
# or any leading name contains `mono`/`code`/`mosaic`, treat the whole stack
# as a mono request and resolve to a known mono fallback.
_MONO_HINTS = ("mono", " code", "code ", "console", "courier", "consolas")


def _looks_mono(name: str) -> bool:
    n = name.lower()
    if n in _FONT_MAP:
        # Already-mapped families are mono iff they map to one of the mono
        # canonical fonts.
        return _FONT_MAP[n] in ("Consolas", "Courier New")
    return any(h in n for h in _MONO_HINTS)


def resolve(css_font_family: str) -> str:
    """Resolve a CSS font-family stack to a single PPTX font name.

    Strategy: walk the stack once. The *first known* mapping wins UNLESS the
    stack as a whole signals a generic family (`monospace`, `serif`, etc.)
    that disagrees with the unknown lead. In that case we substitute the
    generic family's safe equivalent — preserving the visual class the
    author asked for (mono → mono, sans → sans) even when the named font
    isn't installed on the target renderer.
    """
    if not css_font_family:
        return DEFAULT_FONT

    tokens: list[str] = []
    for raw in css_font_family.split(","):
        name = raw.strip().strip('"').strip("'").lower()
        if name:
            tokens.append(name)
    if not tokens:
        return DEFAULT_FONT

    # Detect the stack's intended generic family (last generic token wins;
    # CSS spec puts generic families at the end of the cascade).
    generic_fallback: str | None = None
    for tok in tokens:
        if tok in _GENERIC_FAMILY_FALLBACK:
            generic_fallback = _GENERIC_FAMILY_FALLBACK[tok]
            # Don't break — keep walking to preserve last-generic-wins.

    stack_is_mono = (
        generic_fallback in ("Consolas", "Courier New")
        or any(_looks_mono(t) for t in tokens)
    )

    for tok in tokens:
        if tok in _FONT_MAP:
            mapped = _FONT_MAP[tok]
            # If the stack is mono but the first hit is proportional (e.g.,
            # `Inter, monospace` — rare but possible), prefer the mono
            # generic. Mono columns rely on equal advances; a proportional
            # font will visibly break them.
            if stack_is_mono and mapped not in ("Consolas", "Courier New"):
                continue
            return mapped
        # Unknown token. If it looks mono and the whole stack is mono, fall
        # through to the generic fallback (Consolas) — emitting "Jetbrains
        # Mono" verbatim is worse than emitting Consolas when the renderer
        # likely lacks JetBrains Mono and would substitute a proportional
        # font instead.
        if stack_is_mono and _looks_mono(tok):
            continue
        # Non-mono unknown name — title-case and return; this preserves the
        # existing path for fonts like "Helvetica Neue" that the renderer
        # MAY have installed.
        if all(part.isalpha() or part.isspace() or part in "-_" for part in tok):
            return " ".join(p.capitalize() for p in tok.split())

    if generic_fallback is not None:
        return generic_fallback
    # Stack-wide mono signal but no explicit generic family → still fall back
    # to a known mono face. The author wrote `'JetBrains Mono', 'Fira Code'`
    # without `monospace`; honoring the mono *intent* is more important than
    # honoring DEFAULT_FONT (which is a sans).
    if stack_is_mono:
        return "Consolas"
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
