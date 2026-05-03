from __future__ import annotations

import pytest
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

from slidify.api import ConversionConfig, convert

LINE_FIXTURE = """<!doctype html>
<html>
<head>
<style>
html, body { margin:0; width:1280px; height:720px; background:#fff; }
.slide { position:relative; width:1280px; height:720px; }
hr {
  position:absolute;
  left:120px;
  top:140px;
  width:520px;
  height:0;
  margin:0;
  border:0;
  border-top:2px solid #111827;
}
.vertical {
  position:absolute;
  left:760px;
  top:180px;
  width:0;
  height:260px;
  border-left:3px solid #2563eb;
}
</style>
</head>
<body>
<div class="slide">
  <hr>
  <div class="vertical"></div>
</div>
</body>
</html>
"""


@pytest.mark.asyncio
async def test_zero_thickness_html_rules_emit_as_native_lines(tmp_path):
    pptx = tmp_path / "lines.pptx"
    cfg = ConversionConfig(run_oracle=False, run_tier3=False)
    await convert(LINE_FIXTURE, pptx, cfg)

    prs = Presentation(str(pptx))
    lines = [
        shape
        for shape in prs.slides[0].shapes
        if shape.shape_type == MSO_SHAPE_TYPE.LINE
    ]
    assert len(lines) >= 2
