"""Fidelity Oracle.

After PPTX emission, render the file back to PNG via LibreOffice + pdftoppm,
compute SSIM and OCR recall against the browser ground truth, and report
per-slide passes / failures.
"""

from __future__ import annotations

import asyncio
import io
import shutil
import tempfile
from pathlib import Path

import numpy as np
import structlog
from PIL import Image

from slidify.exceptions import OracleError
from slidify.geom import SLIDE_H_PX, SLIDE_W_PX
from slidify.models import BoundingBox, FidelityReport

log = structlog.get_logger(__name__)


SSIM_FLOOR = 0.95
OCR_RECALL_FLOOR = 0.98


def _check_binaries() -> None:
    for binary in ("libreoffice", "pdftoppm", "tesseract"):
        if shutil.which(binary) is None:
            raise OracleError(f"missing system binary: {binary}")


async def render_pptx_to_pngs(pptx_path: Path) -> list[bytes]:
    """Render a PPTX to one PNG per slide at SLIDE_W_PX × SLIDE_H_PX."""
    _check_binaries()
    pptx_path = Path(pptx_path).resolve()
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)

        # Step 1: PPTX → PDF via LibreOffice
        proc = await asyncio.create_subprocess_exec(
            "libreoffice",
            "--headless",
            "--norestore",
            "--nolockcheck",
            "--nodefault",
            "--convert-to",
            "pdf",
            "--outdir",
            str(tmp),
            str(pptx_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise OracleError(
                f"libreoffice failed (rc={proc.returncode}): {stderr.decode(errors='ignore')[:300]}"
            )
        pdf_path = tmp / (pptx_path.stem + ".pdf")
        if not pdf_path.exists():
            # LibreOffice sometimes drops a different name; pick the only PDF.
            pdfs = list(tmp.glob("*.pdf"))
            if not pdfs:
                raise OracleError("libreoffice produced no PDF")
            pdf_path = pdfs[0]

        # Step 2: PDF → PNGs via pdftoppm. Force resolution so slides come out
        # at the target size. PPTX page is 13.33in × 7.5in at 96dpi → 1280×720.
        # We'll render at 96 DPI and resize/pad to target.
        proc = await asyncio.create_subprocess_exec(
            "pdftoppm",
            "-r",
            "96",
            "-png",
            str(pdf_path),
            str(tmp / "slide"),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            raise OracleError(
                f"pdftoppm failed (rc={proc.returncode}): {stderr.decode(errors='ignore')[:300]}"
            )

        png_files = sorted(tmp.glob("slide-*.png"))
        if not png_files:
            raise OracleError("pdftoppm produced no PNGs")

        out: list[bytes] = []
        for p in png_files:
            with Image.open(p) as im:
                im = im.convert("RGB")
                if im.size != (SLIDE_W_PX, SLIDE_H_PX):
                    im = im.resize((SLIDE_W_PX, SLIDE_H_PX), Image.Resampling.LANCZOS)
                buf = io.BytesIO()
                im.save(buf, format="PNG")
                out.append(buf.getvalue())
        return out


def _png_to_array(data: bytes) -> np.ndarray:
    im = Image.open(io.BytesIO(data)).convert("RGB")
    if im.size != (SLIDE_W_PX, SLIDE_H_PX):
        im = im.resize((SLIDE_W_PX, SLIDE_H_PX), Image.Resampling.LANCZOS)
    return np.asarray(im)


def compute_ssim(a: bytes, b: bytes) -> float:
    from skimage.metrics import structural_similarity as ssim

    arr_a = _png_to_array(a)
    arr_b = _png_to_array(b)
    score = ssim(arr_a, arr_b, channel_axis=2, data_range=255)
    return float(score)


def compute_ocr_recall(gt: bytes, candidate: bytes) -> tuple[float, set[str], set[str]]:
    import pytesseract

    a = Image.open(io.BytesIO(gt)).convert("RGB")
    b = Image.open(io.BytesIO(candidate)).convert("RGB")
    text_a = pytesseract.image_to_string(a)
    text_b = pytesseract.image_to_string(b)
    words_a = _normalize_words(text_a)
    words_b = _normalize_words(text_b)
    if not words_a:
        return 1.0, words_a, words_b
    inter = words_a & words_b
    return len(inter) / len(words_a), words_a, words_b


def _normalize_words(text: str) -> set[str]:
    """Tokenize for OCR comparison.

    Lowercase, strip non-alphanumerics, drop tokens shorter than 2 chars and
    pure-digit tokens — Tesseract is unreliable on isolated digits and on
    symbol characters like → / — which the browser and LibreOffice render
    differently.
    """
    out: set[str] = set()
    for tok in text.lower().split():
        tok = "".join(ch for ch in tok if ch.isalnum())
        if len(tok) < 2:
            continue
        if tok.isdigit():
            continue
        out.add(tok)
    return out


def find_failing_regions(gt: bytes, candidate: bytes, threshold: int = 40) -> list[BoundingBox]:
    """Diff the two PNGs and return bounding boxes of dissimilar regions."""
    a = _png_to_array(gt).astype(np.int16)
    b = _png_to_array(candidate).astype(np.int16)
    diff = np.abs(a - b).max(axis=2)  # (H, W)
    mask = (diff > threshold).astype(np.uint8) * 255
    if mask.sum() == 0:
        return []
    # Connected components via scipy
    try:
        from scipy.ndimage import find_objects, label

        labelled, _n = label(mask)
        slices = find_objects(labelled)
    except Exception:
        slices = []

    boxes: list[BoundingBox] = []
    for s in slices:
        if s is None:
            continue
        y0, y1 = s[0].start, s[0].stop
        x0, x1 = s[1].start, s[1].stop
        if (y1 - y0) * (x1 - x0) < 64:  # noise filter
            continue
        boxes.append(BoundingBox(x=float(x0), y=float(y0), w=float(x1 - x0), h=float(y1 - y0)))
    # Cap to avoid runaway noise
    return boxes[:20]


class FidelityOracle:
    def __init__(
        self,
        ssim_floor: float = SSIM_FLOOR,
        ocr_recall_floor: float = OCR_RECALL_FLOOR,
    ) -> None:
        self.ssim_floor = ssim_floor
        self.ocr_recall_floor = ocr_recall_floor

    async def evaluate(
        self, pptx_path: Path, ground_truths: list[bytes]
    ) -> list[FidelityReport]:
        try:
            renders = await render_pptx_to_pngs(pptx_path)
        except OracleError as e:
            log.warning("oracle.render_failed", error=str(e))
            return [
                FidelityReport(
                    slide_index=i,
                    ssim=0.0,
                    ocr_recall=0.0,
                    passed=False,
                    note=f"oracle_render_failed: {e}",
                )
                for i in range(len(ground_truths))
            ]

        reports: list[FidelityReport] = []
        for i, gt in enumerate(ground_truths):
            if i >= len(renders):
                reports.append(
                    FidelityReport(
                        slide_index=i,
                        ssim=0.0,
                        ocr_recall=0.0,
                        passed=False,
                        note="missing_render",
                    )
                )
                continue
            cand = renders[i]
            try:
                ssim_score = compute_ssim(gt, cand)
            except Exception as e:
                log.warning("oracle.ssim_failed", slide=i, error=str(e))
                ssim_score = 0.0
            try:
                recall, _, _ = compute_ocr_recall(gt, cand)
            except Exception as e:
                log.warning("oracle.ocr_failed", slide=i, error=str(e))
                recall = 0.0
            passed = ssim_score >= self.ssim_floor and recall >= self.ocr_recall_floor
            failing = find_failing_regions(gt, cand) if not passed else []
            reports.append(
                FidelityReport(
                    slide_index=i,
                    ssim=ssim_score,
                    ocr_recall=recall,
                    passed=passed,
                    failing_regions=failing,
                )
            )
        return reports
