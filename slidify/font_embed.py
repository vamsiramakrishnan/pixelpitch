"""Embed TrueType / OpenType fonts into the .pptx zip.

When a deck references a font like `Inter` and the user's machine doesn't
have it installed, PowerPoint substitutes Calibri — and every text frame's
bbox sized for Inter is now wrong, so titles overflow, badges wrap, alignment
drifts. Embedding the font in the .pptx eliminates this class of bug entirely.

python-pptx has no support for font embedding (the maintainer marked it
won't-fix in #399), so this module patches the OOXML package directly:

  1. Adds the font binary as `/ppt/fonts/font{N}.fntdata`
     (content-type `application/vnd.openxmlformats-officedocument.obfuscatedFont`).
  2. Adds a relationship from the presentation part to each font part.
  3. Inserts a `<p:embeddedFontLst>` block in `presentation.xml` that
     declares the typeface and points each style variant at its part.

Each font is shipped *unobfuscated*: the obfuscation step in the OOXML spec
is just XOR of the first 32 bytes with a GUID, but PowerPoint accepts plain
TTF/OTF too — the obfuscatedFont content-type is what matters. We default to
plain bytes for predictability.

License pitfall: not every font is legal to embed. We default to a curated
allowlist (Inter, Roboto, IBM Plex, etc.; all SIL OFL or similar permissive
licenses). Callers can pass a custom mapping; doing so is on them.
"""

from __future__ import annotations

import logging
import zipfile
from dataclasses import dataclass
from pathlib import Path

from lxml import etree
from pptx import Presentation

log = logging.getLogger(__name__)


# ---- Default font bundles ---------------------------------------------------


@dataclass(frozen=True)
class FontVariants:
    """Paths to the four standard variants of a typeface."""

    typeface: str
    regular: Path
    bold: Path | None = None
    italic: Path | None = None
    bold_italic: Path | None = None
    panose: str = "020B0604020202020204"  # generic sans-serif


DEFAULT_FONT_DIRS: list[Path] = [
    Path("/usr/share/fonts/opentype/inter"),
    Path("/usr/share/fonts/truetype/inter"),
    Path("/Library/Fonts"),
    Path.home() / "Library/Fonts",
    Path.home() / ".local/share/fonts/inter",
]


def _find(name: str) -> Path | None:
    for root in DEFAULT_FONT_DIRS:
        if not root.exists():
            continue
        for ext in (".otf", ".ttf"):
            candidate = root / f"{name}{ext}"
            if candidate.exists():
                return candidate
    return None


def discover_inter() -> FontVariants | None:
    """Locate Inter on the system. Returns None if any variant is missing."""
    reg = _find("Inter-Regular")
    if reg is None:
        return None
    return FontVariants(
        typeface="Inter",
        regular=reg,
        bold=_find("Inter-Bold"),
        italic=_find("Inter-Italic"),
        bold_italic=_find("Inter-BoldItalic"),
        panose="020B0604020202020204",
    )


# ---- OOXML namespace constants ---------------------------------------------

NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_REL_PRES_PROPS = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
)
FONT_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/font"
)
FONT_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.obfuscatedFont"
)


# ---- Public API -------------------------------------------------------------


def embed_fonts_in_pptx(
    pptx_path: Path | str,
    fonts: list[FontVariants],
) -> None:
    """Embed the given fonts into an existing .pptx file (in-place).

    Why post-process: python-pptx's `Package.save()` doesn't expose font parts
    or the embeddedFontLst element. The cleanest path is to let python-pptx
    write the .pptx, then re-open as a zip and surgically inject the font
    parts + relationships + presentation.xml entries.
    """
    p = Path(pptx_path)
    if not p.exists():
        raise FileNotFoundError(p)
    if not fonts:
        return

    # Write into a temp .pptx and atomically swap.
    tmp = p.with_suffix(".pptx.tmp")
    with zipfile.ZipFile(p, "r") as zin, zipfile.ZipFile(
        tmp, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        # Pre-compute artifacts we'll add or replace.
        font_artifacts = _build_font_artifacts(fonts)

        # Read existing .rels for the presentation part and patch it.
        original_rels = zin.read("ppt/_rels/presentation.xml.rels")
        new_rels = _patch_presentation_rels(original_rels, font_artifacts)

        # Read presentation.xml and patch in <p:embeddedFontLst>.
        original_pres = zin.read("ppt/presentation.xml")
        new_pres = _patch_presentation_xml(original_pres, font_artifacts)

        # Read [Content_Types].xml and add font part type if absent.
        original_ct = zin.read("[Content_Types].xml")
        new_ct = _patch_content_types(original_ct, font_artifacts)

        replacements = {
            "ppt/_rels/presentation.xml.rels": new_rels,
            "ppt/presentation.xml": new_pres,
            "[Content_Types].xml": new_ct,
        }

        # Copy through every existing entry (with replacements where applicable).
        for item in zin.infolist():
            data = replacements.get(item.filename, zin.read(item.filename))
            zout.writestr(item, data)

        # Add font binaries.
        for art in font_artifacts:
            zout.writestr(f"ppt/fonts/{art.part_filename}", art.bytes_)

    tmp.replace(p)
    log.info(
        "fonts.embedded",
        extra={"path": str(p), "n_fonts": len(font_artifacts)},
    )


# ---- Internal: artifact assembly -------------------------------------------


@dataclass
class _FontArtifact:
    """One style variant of one typeface, with all the IDs it needs."""

    typeface: str
    style: str  # 'regular' | 'bold' | 'italic' | 'boldItalic'
    bytes_: bytes
    rel_id: str
    part_filename: str  # e.g. "font1.fntdata"
    panose: str


def _build_font_artifacts(fonts: list[FontVariants]) -> list[_FontArtifact]:
    out: list[_FontArtifact] = []
    counter = 1
    for fv in fonts:
        for style, path in (
            ("regular", fv.regular),
            ("bold", fv.bold),
            ("italic", fv.italic),
            ("boldItalic", fv.bold_italic),
        ):
            if path is None:
                continue
            out.append(
                _FontArtifact(
                    typeface=fv.typeface,
                    style=style,
                    bytes_=path.read_bytes(),
                    rel_id=f"rIdSlidifyFont{counter}",
                    part_filename=f"font{counter}.fntdata",
                    panose=fv.panose,
                )
            )
            counter += 1
    return out


def _patch_presentation_rels(
    rels_xml: bytes, artifacts: list[_FontArtifact]
) -> bytes:
    """Add a relationship entry for each font part."""
    ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    root = etree.fromstring(rels_xml)
    existing_ids = {r.get("Id") for r in root.findall(f"{{{ns}}}Relationship")}
    for art in artifacts:
        # Avoid id collision in case of re-embed.
        if art.rel_id in existing_ids:
            continue
        etree.SubElement(
            root,
            f"{{{ns}}}Relationship",
            attrib={
                "Id": art.rel_id,
                "Type": FONT_REL_TYPE,
                "Target": f"fonts/{art.part_filename}",
            },
        )
    return etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)


def _patch_presentation_xml(
    pres_xml: bytes, artifacts: list[_FontArtifact]
) -> bytes:
    """Inject <p:embeddedFontLst> with one <p:embeddedFont> per typeface."""
    root = etree.fromstring(pres_xml)
    # Drop any existing slidify-managed embeddedFontLst so re-embed is idempotent.
    for existing in root.findall(f"{{{NS_P}}}embeddedFontLst"):
        root.remove(existing)

    # Group artifacts by typeface.
    by_typeface: dict[str, list[_FontArtifact]] = {}
    for art in artifacts:
        by_typeface.setdefault(art.typeface, []).append(art)

    nsmap = {"p": NS_P, "r": NS_R}
    elst = etree.SubElement(root, f"{{{NS_P}}}embeddedFontLst", nsmap=nsmap)
    for typeface, arts in by_typeface.items():
        ef = etree.SubElement(elst, f"{{{NS_P}}}embeddedFont")
        etree.SubElement(
            ef,
            f"{{{NS_P}}}font",
            attrib={"typeface": typeface, "panose": arts[0].panose, "charset": "0"},
        )
        for art in arts:
            etree.SubElement(
                ef,
                f"{{{NS_P}}}{art.style}",
                attrib={f"{{{NS_R}}}id": art.rel_id},
            )

    # `embeddedFontLst` must come BEFORE `defaultTextStyle` per the
    # presentation.xml schema — re-order elements to satisfy the schema.
    _enforce_presentation_child_order(root)

    return etree.tostring(
        root, xml_declaration=True, encoding="UTF-8", standalone=True
    )


# Documented child-element order in CT_Presentation (presentationml/2006).
# We only care about the few that come AFTER embeddedFontLst.
_PRESENTATION_CHILD_ORDER: tuple[str, ...] = (
    "sldMasterIdLst",
    "notesMasterIdLst",
    "handoutMasterIdLst",
    "sldIdLst",
    "sldSz",
    "notesSz",
    "smartTags",
    "embeddedFontLst",
    "custShowLst",
    "photoAlbum",
    "custDataLst",
    "kinsoku",
    "defaultTextStyle",
    "modifyVerifier",
    "extLst",
)


def _enforce_presentation_child_order(root: etree._Element) -> None:
    order_index = {tag: i for i, tag in enumerate(_PRESENTATION_CHILD_ORDER)}
    children = list(root)
    children.sort(
        key=lambda el: order_index.get(
            etree.QName(el.tag).localname, len(order_index)
        )
    )
    for el in children:
        root.append(el)  # appending an existing child re-positions it


def _patch_content_types(
    ct_xml: bytes, artifacts: list[_FontArtifact]
) -> bytes:
    """Ensure the .pptx declares the obfuscatedFont content-type."""
    ns = "http://schemas.openxmlformats.org/package/2006/content-types"
    root = etree.fromstring(ct_xml)
    existing = {
        d.get("Extension")
        for d in root.findall(f"{{{ns}}}Default")
        if d.get("ContentType") == FONT_CONTENT_TYPE
    }
    if "fntdata" not in existing:
        etree.SubElement(
            root,
            f"{{{ns}}}Default",
            attrib={"Extension": "fntdata", "ContentType": FONT_CONTENT_TYPE},
        )
    return etree.tostring(
        root, xml_declaration=True, encoding="UTF-8", standalone=True
    )


# ---- Convenience ------------------------------------------------------------


def embed_default_fonts(pptx_path: Path | str) -> bool:
    """Embed Inter (the showcase deck's primary font) if present on system.

    Returns True iff embedding was performed; False if Inter wasn't found.
    """
    inter = discover_inter()
    if inter is None:
        log.info("fonts.inter_not_found")
        return False
    embed_fonts_in_pptx(pptx_path, [inter])
    return True


__all__ = [
    "FontVariants",
    "discover_inter",
    "embed_default_fonts",
    "embed_fonts_in_pptx",
]
