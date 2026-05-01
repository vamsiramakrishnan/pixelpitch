# Packaging slidify

Four deployment targets, ranked by user-facing simplicity:

| Mode                | User experience            | Self-contains              |
|---------------------|----------------------------|----------------------------|
| Rust bootstrap      | `curl … \| sh`             | Launcher only; auto-bootstraps Python + Playwright |
| Docker image        | `docker run slidify`       | Everything (incl. LibreOffice) |
| PyInstaller bundle  | Single ELF + apt deps      | Python + deps + Playwright |
| `pip install`       | dev workflow               | Python deps only           |

See `bootstrap-rust/` for the launcher. Brief comparison: the Rust bootstrap
gives the smoothest install UX (one curl, < 5 MB) but cannot bundle
LibreOffice / Tesseract / Chromium statically — those are still apt/brew
installs (or skipped via `--no-oracle`). The Docker image is the only mode
that's truly self-contained, at the cost of a ~1.6 GB image.

## 1. Rust bootstrap — best UX

```bash
curl -fsSL https://slidify.sh/install | sh
slidify doctor
```

A < 5 MB static Rust binary lands in `~/.local/bin/slidify`. First run
materializes a private Python 3.11 + slidify + Playwright Chromium under
`~/.local/share/slidify/`. From then on, invocations exec the real CLI
immediately — argv, exit codes, JSON output are identical to a
`pip install slidify`. See `bootstrap-rust/`.

## 2. Docker image — most self-contained

```bash
docker build -f packaging/Dockerfile -t slidify:latest .
docker run --rm -v "$PWD":/work slidify:latest \
       convert /work/deck.html /work/deck.pptx --json
```

Verify:

```bash
docker run --rm slidify:latest doctor
```

The image is ~1.6 GB (LibreOffice dominates). If you need to push to a
registry behind a slow link, the multi-stage build keeps the runtime layer
free of the wheel-build toolchain.

## 3. PyInstaller binary

For Linux fleets where `pip install` is blocked but apt is available:

```bash
./packaging/build-binary.sh                  # → dist/slidify  (~80 MB)
./packaging/build-binary.sh --with-chromium  # + dist/slidify-chromium.tar.gz
./packaging/build-binary.sh --with-deps      # + dist/slidify-bundle.tar.gz
```

`dist/slidify` is a single ELF that bundles:

* CPython 3.11 and every Python dependency
* Playwright driver (downloads Chromium on first run unless bundled)
* slidify package data (patterns YAML, guides, tailwind catalog)

It does NOT bundle LibreOffice / Tesseract / poppler — those must exist
on the host. Run `./dist/slidify doctor` to verify.

`--with-deps` produces `dist/slidify-bundle.tar.gz` containing the ELF plus
`.deb` files and a one-liner installer; ship it to nodes that can't reach
package repositories.

## 4. `pip install`

```bash
pip install slidify
playwright install chromium --with-deps
sudo apt-get install -y libreoffice-impress tesseract-ocr poppler-utils fonts-inter
slidify doctor
```

For development:

```bash
uv sync --extra dev
uv run playwright install chromium --with-deps
uv run slidify doctor
```

## Verifying any deployment

`slidify doctor` is the canonical health check. It exits non-zero when a
required dependency is missing, and `--json` makes it machine-friendly:

```bash
slidify doctor --json | slidify field /dev/stdin checks.0.ok
```

## Why no PyOxidizer / Nuitka onefile?

Both work in principle. We chose PyInstaller because:

1. The `playwright._impl._driver` extension is reliably picked up.
2. `slidify.patterns.data/*.yaml` is trivial to bundle as data.
3. The runtime extracts to a tmpfs, which is fine in containers and CI.

If you have a strict reason to use Nuitka or PyOxidizer (smaller binary,
true static linking), the `slidify.spec` file is a clean reference for
what needs to be bundled. Both targets are PRs we'd happily review.
