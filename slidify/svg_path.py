"""SVG path → PPTX `<a:custGeom>` translation.

Parses an SVG path `d` attribute and emits a normalized absolute command
list plus the corresponding OOXML path-XML fragment.

Supported commands:
    M / m   moveTo
    L / l   lineTo
    H / h   horizontal lineTo
    V / v   vertical lineTo
    C / c   cubic Bezier
    S / s   smooth cubic Bezier (reflected first control)
    Q / q   quadratic Bezier
    T / t   smooth quadratic Bezier (reflected control)
    Z / z   close

Arc commands (A / a) are not supported; we fall back to a straight line
to the arc endpoint. Implementing the SVG arc → cubic conversion is out
of scope for this module.
"""

from __future__ import annotations

import re

# Public command tuple shapes:
#   ("moveTo",     x, y)
#   ("lineTo",     x, y)
#   ("cubicBezTo", c1x, c1y, c2x, c2y, x, y)
#   ("quadBezTo",  cx, cy, x, y)
#   ("close",)

PathCommand = tuple

_TOKEN_RE = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?")


def _tokenize(d: str) -> list[str]:
    return _TOKEN_RE.findall(d or "")


def _take_floats(tokens: list[str], i: int, n: int) -> tuple[list[float], int]:
    vals = [float(tokens[i + k]) for k in range(n)]
    return vals, i + n


def parse_path(d: str) -> list[PathCommand]:
    """Parse an SVG path `d` string into normalized absolute commands."""
    tokens = _tokenize(d)
    commands: list[PathCommand] = []

    i = 0
    cur_x = 0.0
    cur_y = 0.0
    start_x = 0.0
    start_y = 0.0
    last_cmd: str | None = None
    # Last cubic control2 (absolute) — for S/s reflection.
    last_cubic_ctrl: tuple[float, float] | None = None
    # Last quadratic control (absolute) — for T/t reflection.
    last_quad_ctrl: tuple[float, float] | None = None

    while i < len(tokens):
        tok = tokens[i]
        if tok.isalpha():
            cmd = tok
            i += 1
        else:
            # Implicit repeat of the previous command. After M/m, repeats are L/l.
            if last_cmd is None:
                raise ValueError(f"path data starts with a number: {d!r}")
            if last_cmd == "M":
                cmd = "L"
            elif last_cmd == "m":
                cmd = "l"
            else:
                cmd = last_cmd

        if cmd in ("M", "m"):
            (x, y), i = _take_floats(tokens, i, 2)
            if cmd == "m" and commands:
                x += cur_x
                y += cur_y
            cur_x, cur_y = x, y
            start_x, start_y = x, y
            commands.append(("moveTo", x, y))
            last_cubic_ctrl = None
            last_quad_ctrl = None

        elif cmd in ("L", "l"):
            (x, y), i = _take_floats(tokens, i, 2)
            if cmd == "l":
                x += cur_x
                y += cur_y
            cur_x, cur_y = x, y
            commands.append(("lineTo", x, y))
            last_cubic_ctrl = None
            last_quad_ctrl = None

        elif cmd in ("H", "h"):
            (x,), i = _take_floats(tokens, i, 1)
            if cmd == "h":
                x += cur_x
            cur_x = x
            commands.append(("lineTo", cur_x, cur_y))
            last_cubic_ctrl = None
            last_quad_ctrl = None

        elif cmd in ("V", "v"):
            (y,), i = _take_floats(tokens, i, 1)
            if cmd == "v":
                y += cur_y
            cur_y = y
            commands.append(("lineTo", cur_x, cur_y))
            last_cubic_ctrl = None
            last_quad_ctrl = None

        elif cmd in ("C", "c"):
            (c1x, c1y, c2x, c2y, x, y), i = _take_floats(tokens, i, 6)
            if cmd == "c":
                c1x += cur_x
                c1y += cur_y
                c2x += cur_x
                c2y += cur_y
                x += cur_x
                y += cur_y
            commands.append(("cubicBezTo", c1x, c1y, c2x, c2y, x, y))
            cur_x, cur_y = x, y
            last_cubic_ctrl = (c2x, c2y)
            last_quad_ctrl = None

        elif cmd in ("S", "s"):
            (c2x, c2y, x, y), i = _take_floats(tokens, i, 4)
            if cmd == "s":
                c2x += cur_x
                c2y += cur_y
                x += cur_x
                y += cur_y
            # Reflect previous cubic control2 about the current point; if the
            # previous command wasn't C/c/S/s, the first control coincides with
            # the current point (per SVG spec).
            if last_cubic_ctrl is not None:
                c1x = 2 * cur_x - last_cubic_ctrl[0]
                c1y = 2 * cur_y - last_cubic_ctrl[1]
            else:
                c1x, c1y = cur_x, cur_y
            commands.append(("cubicBezTo", c1x, c1y, c2x, c2y, x, y))
            cur_x, cur_y = x, y
            last_cubic_ctrl = (c2x, c2y)
            last_quad_ctrl = None

        elif cmd in ("Q", "q"):
            (cx, cy, x, y), i = _take_floats(tokens, i, 4)
            if cmd == "q":
                cx += cur_x
                cy += cur_y
                x += cur_x
                y += cur_y
            commands.append(("quadBezTo", cx, cy, x, y))
            cur_x, cur_y = x, y
            last_quad_ctrl = (cx, cy)
            last_cubic_ctrl = None

        elif cmd in ("T", "t"):
            (x, y), i = _take_floats(tokens, i, 2)
            if cmd == "t":
                x += cur_x
                y += cur_y
            # Reflect previous quad control about current point; otherwise the
            # control coincides with the current point.
            if last_quad_ctrl is not None:
                cx = 2 * cur_x - last_quad_ctrl[0]
                cy = 2 * cur_y - last_quad_ctrl[1]
            else:
                cx, cy = cur_x, cur_y
            commands.append(("quadBezTo", cx, cy, x, y))
            cur_x, cur_y = x, y
            last_quad_ctrl = (cx, cy)
            last_cubic_ctrl = None

        elif cmd in ("A", "a"):
            # Arcs unsupported — fall back to a straight line to the endpoint.
            # Arc payload is: rx ry x-axis-rotation large-arc sweep x y.
            (_rx, _ry, _rot, _laf, _sf, x, y), i = _take_floats(tokens, i, 7)
            if cmd == "a":
                x += cur_x
                y += cur_y
            cur_x, cur_y = x, y
            commands.append(("lineTo", x, y))
            last_cubic_ctrl = None
            last_quad_ctrl = None

        elif cmd in ("Z", "z"):
            commands.append(("close",))
            cur_x, cur_y = start_x, start_y
            last_cubic_ctrl = None
            last_quad_ctrl = None

        else:
            raise ValueError(f"unsupported path command: {cmd!r}")

        last_cmd = cmd

    return commands


def _pt(x: float, y: float) -> str:
    return f'<a:pt x="{int(round(x))}" y="{int(round(y))}"/>'


def commands_to_path_xml(commands: list[PathCommand], width: int, height: int) -> str:
    """Render a parsed command list as an OOXML `<a:path>` element body.

    Coordinates are emitted as integers in the path coordinate space defined
    by `width`/`height`; the caller is responsible for scaling user units.
    """
    parts: list[str] = [f'<a:path w="{width}" h="{height}">']
    for cmd in commands:
        op = cmd[0]
        if op == "moveTo":
            _, x, y = cmd
            parts.append(f"<a:moveTo>{_pt(x, y)}</a:moveTo>")
        elif op == "lineTo":
            _, x, y = cmd
            parts.append(f"<a:lnTo>{_pt(x, y)}</a:lnTo>")
        elif op == "cubicBezTo":
            _, c1x, c1y, c2x, c2y, x, y = cmd
            parts.append(
                "<a:cubicBezTo>"
                + _pt(c1x, c1y)
                + _pt(c2x, c2y)
                + _pt(x, y)
                + "</a:cubicBezTo>"
            )
        elif op == "quadBezTo":
            _, cx, cy, x, y = cmd
            parts.append("<a:quadBezTo>" + _pt(cx, cy) + _pt(x, y) + "</a:quadBezTo>")
        elif op == "close":
            parts.append("<a:close/>")
    parts.append("</a:path>")
    return "".join(parts)


def path_to_custgeom_xml(d: str, width: int = 100, height: int = 100) -> str:
    """Convert an SVG path `d` string to a complete `<a:custGeom>` element."""
    commands = parse_path(d)
    body = commands_to_path_xml(commands, width, height)
    return (
        "<a:custGeom>"
        "<a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>"
        f'<a:rect l="0" t="0" r="{width}" b="{height}"/>'
        f"<a:pathLst>{body}</a:pathLst>"
        "</a:custGeom>"
    )
