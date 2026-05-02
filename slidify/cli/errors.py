from __future__ import annotations


def remediation_for(exc: BaseException) -> list[str]:
    name = type(exc).__name__
    msg = str(exc)
    out: list[str] = []
    if name == "FileNotFoundError" or "no such file" in msg.lower():
        out.append("Verify the input path: `ls -la <path>`")
        out.append("Or pipe HTML via stdin: `cat slide.html | slidify convert - out.pptx`")
    if "playwright" in msg.lower() or "chromium" in msg.lower():
        out.append("Run `slidify doctor` to verify Chromium is installed.")
        out.append("Install with: `playwright install chromium --with-deps`")
    if "soffice" in msg.lower() or "libreoffice" in msg.lower():
        out.append("Install LibreOffice: `apt-get install -y libreoffice-impress`")
        out.append("Or skip the oracle: `--no-oracle`")
    if "no slides produced" in msg.lower():
        out.append("Add `<!DOCTYPE html>` between slides, or pass a directory of per-slide files.")
        out.append("Read: `slidify guide authoring --section 'Hard contract'`")
    if not out:
        out.append("Run `slidify doctor` to check the environment.")
        out.append("Read `slidify guide troubleshooting`.")
    return out
