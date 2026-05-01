"""Tests for slidify.fonts (CSS font-family stack resolution)."""

from __future__ import annotations

from slidify.fonts import DEFAULT_FONT, is_bold, parse_weight, resolve


def test_resolve_empty_returns_default():
    assert resolve("") == DEFAULT_FONT
    assert resolve(None) == DEFAULT_FONT  # type: ignore[arg-type]


def test_resolve_known_font_first():
    assert resolve("Inter, sans-serif") == "Inter"
    assert resolve("Calibri") == "Calibri"


def test_resolve_unknown_then_known():
    # Unknown title-cased proper noun wins over a later known name —
    # PowerPoint may have it locally and we don't want to silently downgrade.
    assert resolve("CustomSans, Arial") == "Customsans"
    # ...but a fully-unknown mono lead defers to the generic fallback.
    assert resolve("'JetBrains Mono', monospace") == "Consolas"


def test_resolve_unknown_only_titlecased():
    # Plausibly-installed unknown fonts pass through Title-cased so PowerPoint
    # can substitute if it has them locally.
    assert resolve("'Helvetica Neue'") == "Helvetica Neue"


def test_resolve_mono_stack_with_unknown_lead():
    """The dominant brutalist/status-board pattern: a stack of unknown mono
    fonts ending in `monospace`. Naively returning the first unknown name
    causes LibreOffice to substitute Liberation Sans (proportional) and
    break tabular alignment. The resolver must recognize the generic-family
    fallback and emit a known mono face instead."""
    assert resolve("'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', Menlo, monospace") == "Consolas"
    assert resolve("'Fira Code', monospace") == "Consolas"
    assert resolve("'Cascadia Mono', monospace") == "Consolas"


def test_resolve_mono_stack_without_generic_keyword():
    """Even without the explicit `monospace` token, a stack composed of
    obvious mono names (containing `mono` / `code` / `console`) should
    resolve to a known mono face."""
    assert resolve("'Source Code Pro', 'Menlo'") == "Consolas"
    assert resolve("'JetBrains Mono', 'Fira Code'") == "Consolas"


def test_resolve_sans_serif_stack_with_unknown_lead():
    # Generic-family fallback for sans-serif stacks too.
    assert resolve("'Custom Sans', sans-serif") == "Custom Sans"
    # ...but if the lead is unknown AND looks like a system-ish hint, return
    # the title-cased name so the renderer can substitute. We don't aggressively
    # rewrite sans-serif stacks the way we do mono stacks.


def test_resolve_serif_generic_fallback():
    assert resolve("'Souvenir', serif") == "Souvenir"  # title-cased proper noun


def test_resolve_already_known_mono_passes_through():
    assert resolve("Consolas, monospace") == "Consolas"
    assert resolve("Menlo, monospace") == "Consolas"
    assert resolve("'Courier New', monospace") == "Courier New"


def test_resolve_mono_stack_with_proportional_first():
    """If author writes `Inter, monospace` (a contradiction — Inter is
    proportional, the generic says mono), trust the *generic* — mono columns
    rely on equal advances."""
    assert resolve("Inter, monospace") == "Consolas"


def test_parse_weight():
    assert parse_weight("") == 400
    assert parse_weight("normal") == 400
    assert parse_weight("bold") == 700
    assert parse_weight("400") == 400
    assert parse_weight("700") == 700
    assert parse_weight("950") == 900  # clamped


def test_is_bold():
    assert not is_bold("400")
    assert not is_bold("500")
    assert is_bold("600")
    assert is_bold("700")
    assert is_bold("bold")
