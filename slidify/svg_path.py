"""Compatibility shim for ``slidify.svg.path_parser``."""

from slidify.svg.path_parser import (
    _arc_to_cubics,
    commands_to_path_xml,
    parse_path,
    path_to_custgeom_xml,
)

__all__ = [
    "_arc_to_cubics",
    "commands_to_path_xml",
    "parse_path",
    "path_to_custgeom_xml",
]

