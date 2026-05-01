"""Tests for SVG path curve commands (C/c, S/s, Q/q, T/t) in slidify.svg_shapes."""

from __future__ import annotations

from slidify.svg_path import parse_path


def test_cubic_bezier_absolute():
    """`M 10 10 C 20 20, 40 20, 50 10` → 1 moveTo + 1 cubicBezTo."""
    cmds = parse_path("M 10 10 C 20 20, 40 20, 50 10")
    assert cmds == [
        ("moveTo", 10.0, 10.0),
        ("cubicBezTo", 20.0, 20.0, 40.0, 20.0, 50.0, 10.0),
    ]


def test_smooth_cubic_reflects_previous_control():
    """After `C ... 40 20, 50 10`, an `S 80 0, 90 10` segment must reflect
    the prior cubic's second control about the current point: the reflected
    first control is (50 + (50-40), 10 + (10-20)) = (60, 0)."""
    cmds = parse_path("M 10 10 C 20 20, 40 20, 50 10 S 80 0, 90 10")
    assert cmds == [
        ("moveTo", 10.0, 10.0),
        ("cubicBezTo", 20.0, 20.0, 40.0, 20.0, 50.0, 10.0),
        ("cubicBezTo", 60.0, 0.0, 80.0, 0.0, 90.0, 10.0),
    ]


def test_quadratic_bezier_absolute():
    """`M 10 10 Q 25 25, 40 10` → 1 moveTo + 1 quadBezTo."""
    cmds = parse_path("M 10 10 Q 25 25, 40 10")
    assert cmds == [
        ("moveTo", 10.0, 10.0),
        ("quadBezTo", 25.0, 25.0, 40.0, 10.0),
    ]


def test_relative_cubic_advances_current_point():
    """`M 10 10 c 10 10, 30 10, 40 0` → endpoint (50, 10), control points
    are absolute (20,20) and (40,20)."""
    cmds = parse_path("M 10 10 c 10 10, 30 10, 40 0")
    assert cmds == [
        ("moveTo", 10.0, 10.0),
        ("cubicBezTo", 20.0, 20.0, 40.0, 20.0, 50.0, 10.0),
    ]
