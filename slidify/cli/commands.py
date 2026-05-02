from __future__ import annotations

import asyncio
from pathlib import Path

from slidify.api import ConversionConfig, convert


def run_convert(source: Path | str, output_pptx: Path, cfg: ConversionConfig):
    return asyncio.run(convert(source, output_pptx, cfg))
