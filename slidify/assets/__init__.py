"""Asset helpers for fonts and future media fetching."""

from slidify.assets.font_embed import FontVariants, discover_inter, embed_fonts_in_pptx
from slidify.assets.font_resolver import (
    RequestedFont,
    ResolvedFont,
    collect_requested_families,
    resolve_and_subset_for_deck,
    resolve_to_files,
    subset_fonts,
)

__all__ = [
    "FontVariants",
    "RequestedFont",
    "ResolvedFont",
    "collect_requested_families",
    "discover_inter",
    "embed_fonts_in_pptx",
    "resolve_and_subset_for_deck",
    "resolve_to_files",
    "subset_fonts",
]

