# PyInstaller spec for slidify.
#
# Produces a single ELF (`dist/slidify`) that bundles Python 3.11, every
# Python dependency, the slidify package data (patterns YAML, guides,
# tailwind catalog), and the Playwright driver. Chromium is *downloaded*
# on first run if PLAYWRIGHT_BROWSERS_PATH is unset.
#
# Build (preferred path — invokes the wrapper that also resolves Playwright):
#     ./packaging/build-binary.sh
#
# Build directly (skips Chromium-bundle option):
#     pyinstaller packaging/slidify.spec --clean
#
# This binary does NOT include LibreOffice / tesseract / poppler — those
# remain host responsibilities. `slidify doctor` flags them when missing.

# ruff: noqa: F821 — PyInstaller injects `Analysis`, `EXE`, etc. at exec time.

import sys
from pathlib import Path

block_cipher = None

ROOT = Path.cwd()

# Bundle slidify's package data so the running binary can read it
# without falling back to the source tree.
datas = [
    (str(ROOT / "slidify" / "patterns" / "data"), "slidify/patterns/data"),
    (str(ROOT / "slidify" / "guides"),            "slidify/guides"),
]

# Optionally bundle Playwright driver so the binary works without
# `pip install playwright`. We pull the driver path lazily so this
# spec stays importable on machines that don't have playwright.
try:
    from playwright._impl._driver import compute_driver_executable

    drv = Path(compute_driver_executable()[0]).parent
    datas.append((str(drv), "playwright/driver"))
except Exception:
    pass

# Hidden imports — modules pulled in via importlib that PyInstaller's
# static analyzer misses.
hiddenimports = [
    "slidify.classifier.tier1",
    "slidify.classifier.tier2",
    "slidify.classifier.tier3",
    "slidify.classifier.llm",
    "slidify.patterns",
    "slidify.patterns.matcher",
    "slidify.patterns.recipes",
    "slidify.patterns.signatures",
    "slidify.patterns.tailwind",
    "anthropic",
    "google.genai",
    "google.cloud.aiplatform",
    "structlog",
    "diskcache",
    "pytesseract",
    "skimage.metrics",
]

a = Analysis(
    [str(ROOT / "slidify" / "cli.py")],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[
        # Heavy ML / scientific extras pulled in by deps but unused by slidify.
        "matplotlib", "tkinter", "IPython", "jupyter",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="slidify",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
