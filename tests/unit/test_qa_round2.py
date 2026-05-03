"""Regression tests anchored to the round-2 visual-QA findings.

Each finding ships with an HTML fixture under
`tests/fixtures/qa/<finding>.html`.  These tests pin the contracted
fix at the call site or at the OOXML level — so a future refactor
that reverts the contract fails loudly here, not in a downstream
visual diff.
"""
from __future__ import annotations

from pathlib import Path

from slidify.fonts import resolve

FIXTURES = Path(__file__).parent.parent / "fixtures" / "qa"


# ---------------------------------------------------------------------------
# Finding 1 — font-unknown-family-fallback
# ---------------------------------------------------------------------------


def test_font_unknown_display_families_substitute_to_core_fonts():
    """Round-2 audit traced 4 bench-slide regressions to web-font
    families landing as `<a:latin typeface="Helvetica Neue"/>` in slide
    XML and depending on host substitution.  Every modern display
    family used in the bench MUST resolve to a core/Office font."""

    # Sans display
    assert resolve("'Helvetica Neue', Helvetica, Arial, sans-serif") == "Arial"
    assert resolve("'Inter Tight', sans-serif") == "Calibri"

    # Condensed display
    assert resolve("'Bebas Neue', Anton, Impact, sans-serif") == "Impact"

    # Serif display
    assert resolve("'Playfair Display', 'Spectral', Georgia, serif") == "Cambria"
    assert resolve("'Spectral', Georgia, serif") == "Cambria"
    assert resolve("'Tiempos', Georgia, serif") == "Cambria"

    # Mono
    assert resolve("'JetBrains Mono', 'IBM Plex Mono', monospace") == "Consolas"
    assert resolve("'IBM Plex Mono', 'SF Mono', Menlo, monospace") == "Consolas"


def test_font_unknown_with_known_later_in_stack_walks_past():
    """An unknown lead must not short-circuit the resolver — a later
    known token still wins so authors can layer safety nets."""
    assert resolve("'NobodysFont', Arial") == "Arial"
    assert resolve("'NobodysFont', 'Helvetica Neue', Arial") == "Arial"


def test_font_unknown_alone_falls_back_to_default():
    """No known names anywhere in the stack and no generic-family token
    means every renderer would substitute.  Pre-empt with DEFAULT_FONT."""
    assert resolve("'NobodysFont'") == "Calibri"


def test_font_fixture_html_exists():
    """The QA finding ships with its own self-contained HTML fixture.
    A future refactor that loses the fixture should fail this test."""
    assert (FIXTURES / "font-unknown-display-fallback.html").exists()
