"""Tests for slidify.splitter."""

from __future__ import annotations

from slidify.splitter import split_slides


def test_empty_returns_empty():
    assert split_slides("") == []
    assert split_slides("   ") == []


def test_single_slide_no_doctype():
    html = "<html><body>hi</body></html>"
    out = split_slides(html)
    assert out == [html]


def test_single_slide_with_doctype():
    html = "<!DOCTYPE html><html><body>hi</body></html>"
    out = split_slides(html)
    assert out == [html]


def test_multi_slide_split():
    html = (
        '<!DOCTYPE html><html><body>one</body></html>'
        '<!DOCTYPE html><html><body>two</body></html>'
        '<!DOCTYPE html><html><body>three</body></html>'
    )
    out = split_slides(html)
    assert len(out) == 3
    assert "one" in out[0]
    assert "two" in out[1]
    assert "three" in out[2]
    for chunk in out:
        assert chunk.startswith("<!DOCTYPE html>") or chunk.startswith("<!doctype html>")


def test_doctype_case_insensitive():
    html = (
        "<!doctype HTML><HTML><body>one</body></HTML>"
        "<!DOCTYPE html><html lang=\"en\"><body>two</body></html>"
    )
    out = split_slides(html)
    assert len(out) == 2
